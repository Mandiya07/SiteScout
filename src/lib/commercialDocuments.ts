import {
  Business,
  CommercialDocument,
  CommercialDocumentItem,
  CommercialDocumentStatus,
  CommercialDocumentType,
  CommercialDocumentVersion,
  DocumentAcceptanceEvidence,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { toCents, fromCents, recordFinancialLedgerEntry } from "./prospectFinancials";
import { generateSecurePreviewToken } from "./security";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 14A: PROPOSAL, CONTRACT, AND COMMERCIAL DOCUMENT INTEGRITY
 * 
 * Provides robust document lifecycle management (DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT -> ACCEPTED/REJECTED/CANCELLED/EXPIRED),
 * immutable document versioning, canonical integer-cents pricing, verified acceptance evidence capture,
 * and secure revocable token-based recipient access.
 */

/**
 * Generates a human-readable, unique commercial document number.
 */
export function generateDocumentNumber(type: CommercialDocumentType): string {
  const prefix = type === "PROPOSAL" ? "PROP" : type === "CONTRACT" ? "AGR" : type === "STATEMENT_OF_WORK" ? "SOW" : "QUO";
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomSuffix}`;
}

/**
 * Creates a new commercial document with initial version 1 in DRAFT state.
 */
export async function createCommercialDocument(
  business: Business,
  data: {
    title: string;
    type: CommercialDocumentType;
    summary?: string;
    currency?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
    termsAndConditions: string;
    timeline?: string;
    deliverables?: string[];
    expiresAt?: string;
    notes?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  // 1. Role Authorization Check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot create commercial documents.`
    };
  }

  if (!data.title || data.title.trim().length === 0) {
    return { success: false, business, error: "Document title is required." };
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, business, error: "At least one commercial line item is required." };
  }

  const currency = data.currency || business.currency || "USD";
  const now = new Date().toISOString();

  // 2. Canonical integer-cents pricing calculation
  let totalCents = 0;
  const processedItems: CommercialDocumentItem[] = data.items.map((item, idx) => {
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice = Math.max(0, item.unitPrice || 0);
    const unitPriceCents = toCents(unitPrice);
    const itemTotalCents = Math.round(unitPriceCents * qty);
    totalCents += itemTotalCents;

    return {
      id: `item_${idx + 1}_${Date.now()}`,
      description: item.description || "Website & Digital Services",
      quantity: qty,
      unitPrice: fromCents(unitPriceCents),
      unitPriceCents,
      totalPrice: fromCents(itemTotalCents),
      totalPriceCents: itemTotalCents
    };
  });

  const totalValue = fromCents(totalCents);
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const documentNumber = generateDocumentNumber(data.type);
  const accessToken = generateSecurePreviewToken(24);

  const initialVersion: CommercialDocumentVersion = {
    version: 1,
    title: data.title.trim(),
    summary: data.summary,
    type: data.type,
    status: "DRAFT",
    currency,
    proposedValue: totalValue,
    proposedValueCents: totalCents,
    items: processedItems,
    termsAndConditions: data.termsAndConditions || "Standard commercial terms apply.",
    timeline: data.timeline || "7-14 Business Days",
    deliverables: data.deliverables || ["Responsive Website Prototype", "Production Deployment", "SSL & Domain Setup"],
    expiresAt: data.expiresAt,
    createdAt: now,
    createdBy: actor,
    notes: data.notes
  };

  const document: CommercialDocument = {
    id: docId,
    businessId: business.id,
    dealId: business.dealDetails?.id || `deal_${business.id}`,
    documentNumber,
    type: data.type,
    status: "DRAFT",
    currentVersion: 1,
    currency,
    totalValue,
    totalValueCents: totalCents,
    accessToken,
    accessTokenRevoked: false,
    expiresAt: data.expiresAt,
    currentVersionSnapshot: initialVersion,
    versionHistory: [initialVersion],
    createdAt: now,
    updatedAt: now
  };

  const existingDocs = business.commercialDocuments || [];
  const updatedDocs = [...existingDocs, document];

  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs,
    activeCommercialDocumentId: docId,
    currency,
    proposedDealValue: totalValue,
    dealDetails: business.dealDetails
      ? { ...business.dealDetails, proposedValue: totalValue, currency }
      : undefined
  };

  // Persist
  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "proposal_sent",
      title: `Commercial Document Created: ${documentNumber}`,
      description: `${data.title} (${data.type}) in DRAFT. Value: ${currency} ${totalValue}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document
  };
}

/**
 * Updates a commercial document.
 * If the document is DRAFT, updates the current draft.
 * If the document was already SENT or APPROVED, creates a new version and resets state to DRAFT/PENDING_APPROVAL.
 * If the document was ACCEPTED, strictly blocks changes to protect agreement integrity.
 */
export async function updateCommercialDocument(
  business: Business,
  documentId: string,
  updates: {
    title?: string;
    summary?: string;
    currency?: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number }>;
    termsAndConditions?: string;
    timeline?: string;
    deliverables?: string[];
    expiresAt?: string;
    notes?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot modify commercial documents.`
    };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];

  // Integrity Guard: Once an agreement is formally accepted, it cannot be silently modified
  if (currentDoc.status === "ACCEPTED") {
    return {
      success: false,
      business,
      error: "Cannot alter an already ACCEPTED commercial document. To change terms, create a formal amendment or new document."
    };
  }

  if (currentDoc.status === "CANCELLED" || currentDoc.status === "EXPIRED") {
    return {
      success: false,
      business,
      error: `Cannot modify a ${currentDoc.status} document. Please create a new commercial document.`
    };
  }

  const now = new Date().toISOString();
  const currency = updates.currency || currentDoc.currency;

  // Process items if provided, otherwise preserve existing
  let processedItems = currentDoc.currentVersionSnapshot.items;
  let totalCents = currentDoc.totalValueCents;

  if (updates.items && updates.items.length > 0) {
    totalCents = 0;
    processedItems = updates.items.map((item, idx) => {
      const qty = Math.max(1, item.quantity || 1);
      const unitPrice = Math.max(0, item.unitPrice || 0);
      const unitPriceCents = toCents(unitPrice);
      const itemTotalCents = Math.round(unitPriceCents * qty);
      totalCents += itemTotalCents;

      return {
        id: `item_${idx + 1}_${Date.now()}`,
        description: item.description || "Website & Digital Services",
        quantity: qty,
        unitPrice: fromCents(unitPriceCents),
        unitPriceCents,
        totalPrice: fromCents(itemTotalCents),
        totalPriceCents: itemTotalCents
      };
    });
  }

  const totalValue = fromCents(totalCents);

  // Determine whether to increment version
  // If already SENT or APPROVED, any modification MUST spawn a new version
  const requiresNewVersion = currentDoc.status === "SENT" || currentDoc.status === "APPROVED";
  const nextVersionNumber = requiresNewVersion ? currentDoc.currentVersion + 1 : currentDoc.currentVersion;

  const newVersionSnapshot: CommercialDocumentVersion = {
    version: nextVersionNumber,
    title: (updates.title ?? currentDoc.currentVersionSnapshot.title).trim(),
    summary: updates.summary ?? currentDoc.currentVersionSnapshot.summary,
    type: currentDoc.type,
    status: "DRAFT", // Edits reset to DRAFT
    currency,
    proposedValue: totalValue,
    proposedValueCents: totalCents,
    items: processedItems,
    termsAndConditions: updates.termsAndConditions ?? currentDoc.currentVersionSnapshot.termsAndConditions,
    timeline: updates.timeline ?? currentDoc.currentVersionSnapshot.timeline,
    deliverables: updates.deliverables ?? currentDoc.currentVersionSnapshot.deliverables,
    expiresAt: updates.expiresAt ?? currentDoc.expiresAt,
    createdAt: requiresNewVersion ? now : currentDoc.currentVersionSnapshot.createdAt,
    createdBy: requiresNewVersion ? actor : currentDoc.currentVersionSnapshot.createdBy,
    notes: updates.notes ?? currentDoc.currentVersionSnapshot.notes
  };

  const updatedVersionHistory = requiresNewVersion
    ? [...currentDoc.versionHistory, newVersionSnapshot]
    : currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? newVersionSnapshot : v);

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "DRAFT",
    currentVersion: nextVersionNumber,
    currency,
    totalValue,
    totalValueCents: totalCents,
    expiresAt: updates.expiresAt ?? currentDoc.expiresAt,
    currentVersionSnapshot: newVersionSnapshot,
    versionHistory: updatedVersionHistory,
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs,
    currency,
    proposedDealValue: totalValue
  };

  // Persist
  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Internally approves a commercial document for delivery to client.
 */
export async function approveCommercialDocument(
  business: Business,
  documentId: string,
  actor: TaskAssignee,
  notes?: string
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot approve commercial documents.`
    };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];
  if (currentDoc.status === "ACCEPTED") {
    return { success: false, business, error: "Document is already accepted." };
  }

  const now = new Date().toISOString();

  const approvedVersion: CommercialDocumentVersion = {
    ...currentDoc.currentVersionSnapshot,
    status: "APPROVED",
    approvedAt: now,
    approvedBy: actor,
    notes: notes || currentDoc.currentVersionSnapshot.notes
  };

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "APPROVED",
    currentVersionSnapshot: approvedVersion,
    versionHistory: currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? approvedVersion : v),
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Marks a commercial document as SENT (dispatched to recipient).
 * Note: SENT does NOT constitute acceptance.
 */
export async function sendCommercialDocument(
  business: Business,
  documentId: string,
  recipientEmail: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot send commercial documents.`
    };
  }

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { success: false, business, error: "Valid recipient email is required to send document." };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];
  if (currentDoc.status === "ACCEPTED") {
    return { success: false, business, error: "Document has already been accepted." };
  }

  const now = new Date().toISOString();

  const sentVersion: CommercialDocumentVersion = {
    ...currentDoc.currentVersionSnapshot,
    status: "SENT",
    sentAt: now,
    sentBy: actor,
    recipientEmail
  };

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "SENT",
    currentVersionSnapshot: sentVersion,
    versionHistory: currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? sentVersion : v),
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  // Sync business legacy contractStatus to SENT if applicable
  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs,
    contractStatus: currentDoc.type === "CONTRACT" ? "SENT" : (business.contractStatus || "SENT")
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "proposal_sent",
      title: `Document Dispatched: ${currentDoc.documentNumber}`,
      description: `Version ${currentDoc.currentVersion} sent to ${recipientEmail}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Formally accepts a commercial document with verified evidence.
 * Locks the document version and synchronizes agreed commercial value.
 */
export async function acceptCommercialDocument(
  business: Business,
  documentId: string,
  acceptance: Omit<DocumentAcceptanceEvidence, "acceptedAt"> & { acceptedAt?: string },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record commercial document acceptance.`
    };
  }

  if (!acceptance.acceptedBy || acceptance.acceptedBy.trim().length === 0) {
    return { success: false, business, error: "Acceptance requires a verified signer/acceptor name." };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];

  // Guard: Cannot accept draft, cancelled, or expired document
  if (currentDoc.status === "DRAFT") {
    return {
      success: false,
      business,
      error: "Draft documents cannot be accepted. Document must be approved and sent to recipient before formal acceptance."
    };
  }

  if (currentDoc.status === "CANCELLED" || currentDoc.status === "EXPIRED" || currentDoc.status === "REJECTED") {
    return {
      success: false,
      business,
      error: `Cannot accept document in ${currentDoc.status} state.`
    };
  }

  if (currentDoc.status === "ACCEPTED") {
    return {
      success: true,
      business,
      document: currentDoc
    };
  }

  const now = acceptance.acceptedAt || new Date().toISOString();

  const evidence: DocumentAcceptanceEvidence = {
    acceptedBy: acceptance.acceptedBy.trim(),
    acceptedByEmail: acceptance.acceptedByEmail,
    acceptedAt: now,
    signatureText: acceptance.signatureText,
    ipAddress: acceptance.ipAddress,
    userAgent: acceptance.userAgent,
    method: acceptance.method || "ELECTRONIC_SIGNATURE",
    evidenceReference: acceptance.evidenceReference
  };

  const acceptedVersion: CommercialDocumentVersion = {
    ...currentDoc.currentVersionSnapshot,
    status: "ACCEPTED",
    acceptance: evidence
  };

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "ACCEPTED",
    acceptedAt: now,
    currentVersionSnapshot: acceptedVersion,
    versionHistory: currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? acceptedVersion : v),
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  // Synchronize agreed deal terms and contract status
  let updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs,
    contractStatus: "SIGNED",
    contractSignedAt: now,
    contractSignedBy: evidence.acceptedBy,
    agreedDealValue: currentDoc.totalValue,
    totalContractValue: currentDoc.totalValue,
    currency: currentDoc.currency
  };

  // Record COMMERCIAL_AGREED in financial ledger
  const ledgerRes = await recordFinancialLedgerEntry(updatedBusiness, {
    businessId: business.id,
    type: "COMMERCIAL_AGREED",
    amount: currentDoc.totalValue,
    currency: currentDoc.currency,
    reference: currentDoc.documentNumber,
    notes: `Formally accepted by ${evidence.acceptedBy} (v${currentDoc.currentVersion}) via ${evidence.method}`,
    actor
  });

  if (ledgerRes.success) {
    updatedBusiness = ledgerRes.business;
  }

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "proposal_accepted",
      title: `Commercial Agreement Executed: ${currentDoc.documentNumber}`,
      description: `Accepted by ${evidence.acceptedBy}. Agreed value: ${currentDoc.currency} ${currentDoc.totalValue}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Rejects a commercial document.
 */
export async function rejectCommercialDocument(
  business: Business,
  documentId: string,
  reason: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot reject commercial documents.`
    };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];
  if (currentDoc.status === "ACCEPTED") {
    return { success: false, business, error: "Cannot reject an already accepted document." };
  }

  const now = new Date().toISOString();

  const rejectedVersion: CommercialDocumentVersion = {
    ...currentDoc.currentVersionSnapshot,
    status: "REJECTED",
    notes: `Declined: ${reason || "Client declined"}`
  };

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "REJECTED",
    currentVersionSnapshot: rejectedVersion,
    versionHistory: currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? rejectedVersion : v),
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs,
    contractStatus: "DECLINED"
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Cancels / withdraws a commercial document.
 */
export async function cancelCommercialDocument(
  business: Business,
  documentId: string,
  reason: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  document?: CommercialDocument;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot cancel commercial documents.`
    };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) {
    return { success: false, business, error: `Document with ID "${documentId}" not found.` };
  }

  const currentDoc = docs[docIdx];
  if (currentDoc.status === "ACCEPTED") {
    return { success: false, business, error: "Cannot cancel an already accepted document without a formal termination agreement." };
  }

  const now = new Date().toISOString();

  const cancelledVersion: CommercialDocumentVersion = {
    ...currentDoc.currentVersionSnapshot,
    status: "CANCELLED",
    cancelledAt: now,
    cancelledBy: actor,
    cancellationReason: reason
  };

  const updatedDoc: CommercialDocument = {
    ...currentDoc,
    status: "CANCELLED",
    currentVersionSnapshot: cancelledVersion,
    versionHistory: currentDoc.versionHistory.map(v => v.version === currentDoc.currentVersion ? cancelledVersion : v),
    updatedAt: now
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  const updatedBusiness: Business = {
    ...business,
    commercialDocuments: updatedDocs
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    document: updatedDoc
  };
}

/**
 * Validates and retrieves a commercial document via its secure recipient access token.
 */
export function getCommercialDocumentByAccessToken(
  business: Business,
  documentId: string,
  token: string
): {
  valid: boolean;
  document?: CommercialDocument;
  error?: string;
} {
  const doc = (business.commercialDocuments || []).find(d => d.id === documentId);
  if (!doc) {
    return { valid: false, error: "Commercial document not found." };
  }

  if (doc.accessTokenRevoked) {
    return { valid: false, error: "Access to this commercial document has been revoked by the issuer." };
  }

  if (doc.accessToken !== token) {
    return { valid: false, error: "Invalid access credentials for this document." };
  }

  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: "This commercial document link has expired." };
  }

  return { valid: true, document: doc };
}

/**
 * Revokes a document's external access token.
 */
export async function revokeDocumentAccessToken(
  business: Business,
  documentId: string,
  actor: TaskAssignee
): Promise<{ success: boolean; business: Business; error?: string }> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, business, error: "Unauthorized to revoke document access." };
  }

  const docs = business.commercialDocuments || [];
  const docIdx = docs.findIndex(d => d.id === documentId);
  if (docIdx < 0) return { success: false, business, error: "Document not found." };

  const updatedDoc = {
    ...docs[docIdx],
    accessTokenRevoked: true,
    updatedAt: new Date().toISOString()
  };

  const updatedDocs = [...docs];
  updatedDocs[docIdx] = updatedDoc;

  const updatedBusiness = { ...business, commercialDocuments: updatedDocs };
  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return { success: true, business: updatedBusiness };
}

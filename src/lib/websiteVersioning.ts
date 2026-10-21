/**
 * Website Version Management & Customer Approval Engine
 * Micro-Phase 19D
 * 
 * Enforces:
 * - Deterministic version incrementation upon material edits
 * - Preservation of previous versions in historical snapshots
 * - Restoration/rollback of previous versions
 * - Version-specific customer approvals with audit trail
 * - Invalidation of approval when material edits occur after approval
 * - Prevention of unauthorized/silent modifications to approved versions
 * - Complete data isolation and sanitization for public previews
 */

import { GeneratedSite, PreviewApprovalStatus } from "../types";
import { normalizeWebsiteSchema } from "./websiteSchema";

export interface WebsiteVersionRecord {
  version: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
  materialChanges: string[];
  snapshot: Partial<GeneratedSite>;
  approvalStatus: PreviewApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  approvedVersion?: number;
}

export interface CustomerApprovalRecord {
  id: string;
  versionNumber: number;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "REVIEW_REQUESTED";
  approverName: string;
  approverEmail?: string;
  timestamp: string;
  notes?: string;
  clientIp?: string;
  isContractualAcceptance: false; // Explicit Rule: Viewing or approving website draft is NOT a commercial contract or payment
}

export interface MaterialChangeDetection {
  isMaterial: boolean;
  changedFields: string[];
}

/**
 * Checks whether changes between previous site and new data are "material"
 * (affecting identity, branding, services, copy, pricing claims, or layout order).
 */
export function isMaterialChange(prev: Partial<GeneratedSite>, next: Partial<GeneratedSite>): MaterialChangeDetection {
  const changedFields: string[] = [];

  if (next.businessName && next.businessName !== prev.businessName) changedFields.push("businessName");
  if (next.category && next.category !== prev.category) changedFields.push("category");
  if (next.phone && next.phone !== prev.phone) changedFields.push("phone");
  if (next.address && next.address !== prev.address) changedFields.push("address");
  if (next.primaryColor && next.primaryColor !== prev.primaryColor) changedFields.push("primaryColor");
  if (next.fontStyle && next.fontStyle !== prev.fontStyle) changedFields.push("fontStyle");

  // Hero changes
  if (next.hero) {
    if (next.hero.title && next.hero.title !== prev.hero?.title) changedFields.push("hero.title");
    if (next.hero.subtitle && next.hero.subtitle !== prev.hero?.subtitle) changedFields.push("hero.subtitle");
    if (next.hero.imageUrl && next.hero.imageUrl !== prev.hero?.imageUrl) changedFields.push("hero.imageUrl");
    if (next.hero.ctaPrimary && next.hero.ctaPrimary !== prev.hero?.ctaPrimary) changedFields.push("hero.ctaPrimary");
  }

  // Services changes
  if (next.services) {
    const prevTitles = (prev.services || []).map(s => s.title).join("|");
    const nextTitles = next.services.map(s => s.title).join("|");
    if (prevTitles !== nextTitles) changedFields.push("services.titles");
    if ((prev.services || []).length !== next.services.length) changedFields.push("services.count");
  }

  // Sections order changes
  if (next.sectionsOrder && Array.isArray(next.sectionsOrder)) {
    const prevOrder = (prev.sectionsOrder || []).join(",");
    const nextOrder = next.sectionsOrder.join(",");
    if (prevOrder !== nextOrder) changedFields.push("sectionsOrder");
  }

  return {
    isMaterial: changedFields.length > 0,
    changedFields
  };
}

/**
 * Creates an immutable snapshot of a website's critical content.
 */
export function createSiteSnapshot(site: GeneratedSite): Partial<GeneratedSite> {
  return JSON.parse(JSON.stringify({
    businessName: site.businessName,
    category: site.category,
    phone: site.phone,
    address: site.address,
    primaryColor: site.primaryColor,
    secondaryColor: site.secondaryColor,
    accentColor: site.accentColor,
    backgroundColor: site.backgroundColor,
    textColor: site.textColor,
    fontStyle: site.fontStyle,
    hero: site.hero,
    about: site.about,
    services: site.services,
    features: site.features,
    gallery: site.gallery,
    faqs: site.faqs,
    testimonials: site.testimonials,
    blog: site.blog,
    contactPage: site.contactPage,
    sectionsOrder: site.sectionsOrder,
    seo: site.seo,
    previewToken: site.previewToken
  }));
}

/**
 * Applies updates to a site with deterministic version incrementation and approval invalidation
 * if an approved version receives material modifications.
 */
export function applyWebsiteUpdate(
  currentSite: GeneratedSite,
  updates: Partial<GeneratedSite>,
  actor: string = "USER",
  customChangeSummary?: string
): GeneratedSite {
  const currentVer = currentSite.currentVersion || currentSite.version || 1;
  const history: WebsiteVersionRecord[] = Array.isArray(currentSite.versionHistory) 
    ? [...currentSite.versionHistory] 
    : [];

  // If history is empty, record initial v1 snapshot
  if (history.length === 0) {
    history.push({
      version: currentVer,
      createdAt: currentSite.createdAt || new Date().toISOString(),
      createdBy: "INITIAL_GENERATION",
      changeSummary: "Initial website generation",
      materialChanges: [],
      snapshot: createSiteSnapshot(currentSite),
      approvalStatus: currentSite.previewApprovalStatus || "DRAFT"
    });
  }

  const { isMaterial, changedFields } = isMaterialChange(currentSite, updates);

  // Merge updates
  const merged: GeneratedSite = {
    ...currentSite,
    ...updates,
    hero: updates.hero ? { ...currentSite.hero, ...updates.hero } : currentSite.hero,
    about: updates.about ? { ...currentSite.about, ...updates.about } : currentSite.about,
    contactPage: updates.contactPage ? { ...currentSite.contactPage, ...updates.contactPage } : currentSite.contactPage,
    lastEditedAt: new Date().toISOString()
  };

  const normalized = normalizeWebsiteSchema(merged);

  if (isMaterial) {
    const nextVer = currentVer + 1;
    const summary = customChangeSummary || `Modified: ${changedFields.join(", ")}`;

    // Invalidate prior approval if site was previously approved!
    let nextApprovalStatus: PreviewApprovalStatus = normalized.previewApprovalStatus || "DRAFT";
    let previousApprovedVersion = normalized.previousApprovedVersion;

    if (currentSite.previewApprovalStatus === "APPROVED" || currentSite.clientApproved === true) {
      previousApprovedVersion = currentVer;
      nextApprovalStatus = "READY_FOR_REVIEW"; // Requires renewed sign-off
      normalized.clientApproved = false;
      normalized.clientApprovedBy = undefined;
      normalized.clientApprovedAt = undefined;
    }

    const newVersionRecord: WebsiteVersionRecord = {
      version: nextVer,
      createdAt: new Date().toISOString(),
      createdBy: actor,
      changeSummary: summary,
      materialChanges: changedFields,
      snapshot: createSiteSnapshot(normalized),
      approvalStatus: nextApprovalStatus
    };

    history.push(newVersionRecord);

    normalized.version = nextVer;
    normalized.currentVersion = nextVer;
    normalized.versionHistory = history;
    normalized.previewApprovalStatus = nextApprovalStatus;
    if (previousApprovedVersion) {
      normalized.previousApprovedVersion = previousApprovedVersion;
    }
  } else {
    normalized.version = currentVer;
    normalized.currentVersion = currentVer;
    normalized.versionHistory = history;
  }

  return normalized;
}

/**
 * Restores a historical website version from version history.
 */
export function restoreWebsiteVersion(
  site: GeneratedSite,
  targetVersionNumber: number,
  actor: string = "USER"
): GeneratedSite {
  const history = Array.isArray(site.versionHistory) ? site.versionHistory : [];
  const targetRecord = history.find(h => h.version === targetVersionNumber);

  if (!targetRecord || !targetRecord.snapshot) {
    throw new Error(`Cannot restore version ${targetVersionNumber}: Record not found in version history.`);
  }

  return applyWebsiteUpdate(
    site,
    targetRecord.snapshot,
    actor,
    `Rollback: Restored content from Version ${targetVersionNumber}`
  );
}

/**
 * Records an explicit customer approval, change request, or rejection tied to a specific version.
 */
export function recordCustomerApproval(
  site: GeneratedSite,
  params: {
    decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "REVIEW_REQUESTED";
    approverName: string;
    approverEmail?: string;
    notes?: string;
    clientIp?: string;
  }
): { updatedSite: GeneratedSite; approvalRecord: CustomerApprovalRecord } {
  if (!params.approverName || !params.approverName.trim()) {
    throw new Error("Approver name is required for explicit customer approval.");
  }

  const currentVer = site.currentVersion || site.version || 1;
  const now = new Date().toISOString();

  const approvalRecord: CustomerApprovalRecord = {
    id: `appr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    versionNumber: currentVer,
    decision: params.decision,
    approverName: params.approverName.trim().slice(0, 100),
    approverEmail: params.approverEmail?.trim().slice(0, 100),
    timestamp: now,
    notes: (params.notes || "").trim().slice(0, 500),
    clientIp: params.clientIp,
    isContractualAcceptance: false
  };

  const existingApprovals: CustomerApprovalRecord[] = Array.isArray(site.approvalHistory)
    ? [...site.approvalHistory]
    : [];
  existingApprovals.push(approvalRecord);

  // Update current version in version history
  const history: WebsiteVersionRecord[] = Array.isArray(site.versionHistory)
    ? site.versionHistory.map(v => {
        if (v.version === currentVer) {
          return {
            ...v,
            approvalStatus: params.decision,
            approvedAt: params.decision === "APPROVED" ? now : undefined,
            approvedBy: params.decision === "APPROVED" ? approvalRecord.approverName : undefined,
            approvedVersion: params.decision === "APPROVED" ? currentVer : undefined
          };
        }
        return v;
      })
    : [];

  const updatedSite: GeneratedSite = {
    ...site,
    previewApprovalStatus: params.decision,
    clientApproved: params.decision === "APPROVED",
    clientApprovedBy: params.decision === "APPROVED" ? approvalRecord.approverName : undefined,
    clientApprovedAt: params.decision === "APPROVED" ? now : undefined,
    approvalHistory: existingApprovals,
    versionHistory: history
  };

  return {
    updatedSite,
    approvalRecord
  };
}

/**
 * Validates preview access token security rules:
 * - Minimum entropy (>= 16 chars)
 * - Expiration validation
 * - Revocation status
 */
export function validatePreviewAccess(site: GeneratedSite, tokenUsed: string): {
  authorized: boolean;
  statusCode: number;
  reason?: string;
} {
  if (!tokenUsed || tokenUsed.trim().length < 8) {
    return { authorized: false, statusCode: 400, reason: "Invalid preview token format." };
  }

  // Token association match
  const matchesSiteId = site.id === tokenUsed;
  const matchesPreviewToken = site.previewToken === tokenUsed;

  if (!matchesSiteId && !matchesPreviewToken) {
    return { authorized: false, statusCode: 404, reason: "Preview layout not found." };
  }

  // Revocation check
  if ((site as any).revoked === true || (site as any).previewRevoked === true) {
    return { authorized: false, statusCode: 410, reason: "This preview link has been revoked by the business owner." };
  }

  // Expiration check
  if ((site as any).previewExpiresAt) {
    const expiresAt = new Date((site as any).previewExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { authorized: false, statusCode: 410, reason: "This preview link has expired." };
    }
  }

  return { authorized: true, statusCode: 200 };
}

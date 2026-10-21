import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Business } from "../types";
import { resolveDeterministicBusinessId, mergeBusinessRecords, deduplicateAndIngestBusinesses } from "./businessIdentity";

/**
 * MICRO-PHASE 9B: CANONICAL BUSINESS PERSISTENCE SERVICE
 * 
 * Provides a single authoritative persistence layer for all Business and Prospect
 * operations across SiteScout AI. Eliminates fragmented, inconsistent write paths,
 * protects against accidental data loss, enforces deterministic identity, and provides
 * safe concurrency handling.
 */

export const BUSINESS_CACHE_KEY = "sitescout_user_businesses";

// In-memory runtime persistence registry for testing, node execution, and fast cache
const memoryBusinessStore = new Map<string, Business>();

/**
 * Clears the in-memory and local storage store (for QA testing and cache resets).
 */
export function clearBusinessPersistenceStore(): void {
  memoryBusinessStore.clear();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(BUSINESS_CACHE_KEY);
    }
  } catch (err) {
    // Non-fatal
  }
}

/**
 * Retrieves the local storage business cache safely in browser environments.
 */
export function getLocalBusinessCache(): Business[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(BUSINESS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Keep memory store in sync with local storage
          parsed.forEach(b => {
            if (b.id && !memoryBusinessStore.has(b.id)) {
              memoryBusinessStore.set(b.id, b);
            }
          });
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("[BusinessPersistence] Failed to read local storage cache:", err);
  }
  return Array.from(memoryBusinessStore.values());
}

/**
 * Updates the local storage business cache safely.
 */
export function setLocalBusinessCache(businesses: Business[]): void {
  try {
    businesses.forEach(b => {
      if (b.id) memoryBusinessStore.set(b.id, b);
    });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BUSINESS_CACHE_KEY, JSON.stringify(businesses));
    }
  } catch (err) {
    console.warn("[BusinessPersistence] Failed to write local storage cache:", err);
  }
}

export interface SaveBusinessOptions {
  allowPartialUpdate?: boolean;
  expectedUpdatedAt?: string;
  expectedVersion?: number;
  enforceConcurrencyLock?: boolean;
  throwOnFirestoreError?: boolean;
  rejectInvalidData?: boolean;
}

export interface SaveBusinessResult {
  success: boolean;
  business: Business;
  isNew: boolean;
  persistedToFirestore: boolean;
  concurrencyConflict?: boolean;
  error?: string;
}

/**
  * Validates business record integrity before saving.
  */
export function validateBusinessRecord(
  input: Partial<Business>,
  isNew: boolean = false,
  existingRecord?: Business | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Invalid business record: Payload must be a valid non-null object"] };
  }

  // 1. Name requirement
  const rawName = input.name || (input as any).businessName;
  if (isNew && (!rawName || typeof rawName !== "string" || rawName.trim().length === 0)) {
    errors.push("Invalid business record: Business name is required for creation");
  } else if (rawName !== undefined && (typeof rawName !== "string" || rawName.trim().length === 0)) {
    errors.push("Invalid business record: Business name cannot be empty");
  }

  // 2. Numeric Range & Bounds Validation
  if (input.rating !== undefined && input.rating !== null) {
    if (typeof input.rating !== "number" || isNaN(input.rating) || input.rating < 0 || input.rating > 5) {
      errors.push("Invalid business record: Rating must be a number between 0 and 5");
    }
  }

  if (input.reviewsCount !== undefined && input.reviewsCount !== null) {
    if (typeof input.reviewsCount !== "number" || isNaN(input.reviewsCount) || input.reviewsCount < 0 || !Number.isInteger(input.reviewsCount)) {
      errors.push("Invalid business record: Reviews count must be a non-negative integer");
    }
  }

  if (input.presenceScore !== undefined && input.presenceScore !== null) {
    if (typeof input.presenceScore !== "number" || isNaN(input.presenceScore) || input.presenceScore < 0 || input.presenceScore > 100) {
      errors.push("Invalid business record: Presence score must be a number between 0 and 100");
    }
  }

  if (input.opportunityScore !== undefined && input.opportunityScore !== null) {
    if (typeof input.opportunityScore !== "number" || isNaN(input.opportunityScore) || input.opportunityScore < 0 || input.opportunityScore > 100) {
      errors.push("Invalid business record: Opportunity score must be a number between 0 and 100");
    }
  }

  if (input.paidAmount !== undefined && input.paidAmount !== null) {
    if (typeof input.paidAmount !== "number" || isNaN(input.paidAmount) || input.paidAmount < 0) {
      errors.push("Invalid business record: Paid amount cannot be negative");
    }
  }

  if (input.totalContractValue !== undefined && input.totalContractValue !== null) {
    if (typeof input.totalContractValue !== "number" || isNaN(input.totalContractValue) || input.totalContractValue < 0) {
      errors.push("Invalid business record: Total contract value cannot be negative");
    }
  }

  // 3. Enum Values Validation
  const validVerificationStates = ["DEMO", "UNVERIFIED", "CANDIDATE", "VERIFIED", "CONTACT_READY"];
  if (input.verificationState && !validVerificationStates.includes(input.verificationState)) {
    errors.push(`Invalid business record: Verification state '${input.verificationState}' is unrecognized`);
  }

  const validApprovalStatuses = ["PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"];
  if (input.previewApprovalStatus && !validApprovalStatuses.includes(input.previewApprovalStatus)) {
    errors.push(`Invalid business record: Preview approval status '${input.previewApprovalStatus}' is unrecognized`);
  }

  const validContractStatuses = ["NOT_SENT", "SENT", "SIGNED", "DECLINED", "EXPIRED"];
  if (input.contractStatus && !validContractStatuses.includes(input.contractStatus)) {
    errors.push(`Invalid business record: Contract status '${input.contractStatus}' is unrecognized`);
  }

  const validPaymentStatuses = ["UNPAID", "PENDING", "PARTIALLY_PAID", "PAID", "FAILED", "REFUNDED"];
  if (input.paymentStatus && !validPaymentStatuses.includes(input.paymentStatus)) {
    errors.push(`Invalid business record: Payment status '${input.paymentStatus}' is unrecognized`);
  }

  const validDealOutcomes = ["OPEN", "WON", "LOST"];
  if (input.dealOutcome && !validDealOutcomes.includes(input.dealOutcome)) {
    errors.push(`Invalid business record: Deal outcome '${input.dealOutcome}' is unrecognized`);
  }

  // 4. Immutability & Identity Validation
  if (existingRecord && input.id && existingRecord.id && input.id !== existingRecord.id) {
    errors.push(`Invalid business record: Cannot mutate existing canonical record ID '${existingRecord.id}' to '${input.id}'`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 1. Authoritative Create / Update Operation
 * - Guarantees deterministic identity.
 * - Merges with existing record if already present to preserve evidence, ownership, and activity history.
 * - Enforces concurrency protection: Prevents stale updates from silently overwriting newer data.
 * - Persists to Firestore `/businesses/{business.id}`.
 * - Synchronizes memory and local storage caches.
 */
export async function saveBusinessRecord(
  businessInput: Partial<Business> & { id?: string },
  userId?: string,
  options?: SaveBusinessOptions
): Promise<SaveBusinessResult> {
  if (!businessInput || typeof businessInput !== "object") {
    throw new Error("Invalid business record: Payload must be a valid object");
  }

  const rawName = businessInput.name || (businessInput as any).businessName;
  if (!rawName && !businessInput.id) {
    throw new Error("Invalid business record: Business name is required for creation");
  }

  // 1. Resolve deterministic identity
  const identity = resolveDeterministicBusinessId(businessInput);
  const targetId = identity.businessId;

  // 2. Lookup existing record across caches and Firestore to preserve integrity
  let existingRecord: Business | null = memoryBusinessStore.get(targetId) || null;
  if (!existingRecord && businessInput.id) {
    existingRecord = memoryBusinessStore.get(businessInput.id) || null;
  }
  
  if (!existingRecord) {
    const cachedList = getLocalBusinessCache();
    existingRecord = cachedList.find(b => b.id === targetId || b.id === businessInput.id) || null;
  }

  // If not found in cache and Firestore is online, check remote
  const isDemo = businessInput.isDemo === true || (typeof targetId === "string" && targetId.startsWith("demo-"));
  if (!existingRecord && db && !isDemo && auth.currentUser && !userId?.startsWith("preview_")) {
    try {
      const snap = await getDoc(doc(db, "businesses", targetId));
      if (snap.exists()) {
        existingRecord = snap.data() as Business;
        memoryBusinessStore.set(targetId, existingRecord);
      }
    } catch (e) {
      // Non-fatal if offline
    }
  }

  const isNew = !existingRecord;

  // 3. Enforce Record Validation
  const validation = validateBusinessRecord(businessInput, isNew, existingRecord);
  if (!validation.valid) {
    const errorMsg = validation.errors.join("; ");
    if (options?.rejectInvalidData !== false) {
      throw new Error(errorMsg);
    }
  }

  // 4. Concurrency Check: If enforceConcurrencyLock is set, check expected timestamp or version
  if (existingRecord && options?.enforceConcurrencyLock) {
    let conflict = false;

    if (options.expectedUpdatedAt) {
      const existingTime = new Date(existingRecord.updatedAt || 0).getTime();
      const expectedTime = new Date(options.expectedUpdatedAt).getTime();
      if (existingTime > expectedTime) conflict = true;
    }

    if (options.expectedVersion !== undefined) {
      const currentVersion = existingRecord.version || 1;
      if (currentVersion > options.expectedVersion) conflict = true;
    }

    if (conflict) {
      return {
        success: false,
        business: existingRecord,
        isNew: false,
        persistedToFirestore: false,
        concurrencyConflict: true,
        error: `Concurrency conflict: Record was updated at ${existingRecord.updatedAt} (v${existingRecord.version || 1}) after client read state`
      };
    }
  }

  // 5. Construct canonical business object
  const now = new Date().toISOString();
  const baseObject: Business = existingRecord || {
    id: targetId,
    name: rawName || "Local Establishment",
    category: businessInput.category || "General Trade",
    address: businessInput.address || "Unspecified Location",
    phone: businessInput.phone || "Unlisted",
    reviewsCount: businessInput.reviewsCount || 0,
    rating: businessInput.rating || 0,
    presence: businessInput.presence || {
      hasWebsite: false,
      hasEmail: false,
      facebookStatus: "none",
      instagramStatus: "none",
      googleProfileQuality: "fair",
      reviewCountStatus: "few",
      photosStatus: "missing",
      descriptionQuality: "fair",
      openingHoursStatus: "missing",
      contactCompleteness: "missing"
    },
    description: businessInput.description || "",
    verificationState: businessInput.verificationState || "CANDIDATE",
    salesStage: businessInput.salesStage || "DISCOVERED",
    previewApprovalStatus: businessInput.previewApprovalStatus || "PENDING",
    contractStatus: businessInput.contractStatus || "NOT_SENT",
    paymentStatus: businessInput.paymentStatus || "UNPAID",
    dealOutcome: businessInput.dealOutcome || "OPEN",
    isDemo: businessInput.isDemo ?? false,
    dataType: businessInput.dataType ?? "real",
    evidence: businessInput.evidence,
    directorySource: businessInput.directorySource,
    userId: userId || businessInput.userId,
    ownerId: userId || businessInput.ownerId,
    createdAt: businessInput.createdAt || now,
    updatedAt: now,
    version: 1
  };

  // Merge incoming data over base object safely (preserves evidence, ownership, lifecycle milestones)
  const mergedBusiness: Business = mergeBusinessRecords(baseObject, {
    ...businessInput,
    id: targetId,
    updatedAt: now
  });

  if (userId) {
    if (!mergedBusiness.userId) mergedBusiness.userId = userId;
    if (!mergedBusiness.ownerId) mergedBusiness.ownerId = userId;
  }

  // 6. Persist to Firestore first if active
  let persistedToFirestore = false;
  let firestoreError: string | undefined;

  if (db && !isDemo && auth.currentUser && !userId?.startsWith("preview_")) {
    try {
      const docPayload: Record<string, any> = { ...mergedBusiness };
      // Strip undefined values to prevent Firestore serialization errors
      Object.keys(docPayload).forEach(key => {
        if (docPayload[key] === undefined) delete docPayload[key];
      });

      await setDoc(doc(db, "businesses", targetId), docPayload, { merge: true });
      persistedToFirestore = true;
    } catch (err: any) {
      firestoreError = err.message || String(err);
      console.warn(`[BusinessPersistence] Firestore write error for ${targetId}:`, firestoreError);
      if (options?.throwOnFirestoreError) {
        throw new Error(`Firestore persistence failed: ${firestoreError}`);
      }
    }
  }

  // 7. Update In-Memory & Local Storage Cache after validation & persistence checks
  memoryBusinessStore.set(targetId, mergedBusiness);
  const currentCache = getLocalBusinessCache().filter(b => b.id !== targetId && b.id !== businessInput.id);
  currentCache.unshift(mergedBusiness);
  setLocalBusinessCache(currentCache);

  return {
    success: true,
    business: mergedBusiness,
    isNew,
    persistedToFirestore,
    error: firestoreError
  };
}

/**
 * 2. Authoritative Single Record Retrieval
 */
export async function getBusinessRecord(
  businessId: string,
  userId?: string
): Promise<Business | null> {
  if (!businessId) return null;

  // 1. Check memory store
  if (memoryBusinessStore.has(businessId)) {
    return memoryBusinessStore.get(businessId)!;
  }

  // 2. Check local storage cache
  const cachedList = getLocalBusinessCache();
  const cached = cachedList.find(b => b.id === businessId);
  if (cached) {
    memoryBusinessStore.set(businessId, cached);
    return cached;
  }

  // 3. Query Firestore if active
  if (db && !businessId.startsWith("demo-") && auth.currentUser && !userId?.startsWith("preview_")) {
    try {
      const snap = await getDoc(doc(db, "businesses", businessId));
      if (snap.exists()) {
        const data = snap.data() as Business;
        memoryBusinessStore.set(businessId, data);
        const updatedCache = cachedList.filter(b => b.id !== businessId);
        updatedCache.unshift(data);
        setLocalBusinessCache(updatedCache);
        return data;
      }
    } catch (err) {
      console.warn(`[BusinessPersistence] Firestore fetch failed for ${businessId}:`, err);
    }
  }

  return null;
}

/**
 * 3. Authoritative User Businesses Fetch
 */
export async function fetchUserBusinesses(userId?: string): Promise<Business[]> {
  const cachedList = getLocalBusinessCache();

  if (!userId || !db || !auth.currentUser || userId.startsWith("preview_") || userId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const q = query(collection(db, "businesses"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const remoteList: Business[] = [];
    snap.forEach(d => remoteList.push(d.data() as Business));

    if (remoteList.length > 0) {
      // Reconcile remote records with local cache
      const map = new Map<string, Business>();
      remoteList.forEach(b => map.set(b.id, b));
      cachedList.forEach(b => {
        if (!map.has(b.id)) map.set(b.id, b);
      });
      const reconciled = Array.from(map.values());
      setLocalBusinessCache(reconciled);
      return reconciled;
    }
  } catch (err) {
    console.warn("[BusinessPersistence] Failed to fetch remote businesses, using cache:", err);
  }

  return cachedList;
}

/**
 * 4. Authoritative Business Deletion
 */
export async function deleteBusinessRecord(
  businessId: string,
  userId?: string,
  options?: { throwOnFirestoreError?: boolean }
): Promise<{ success: boolean; error?: string }> {
  if (!businessId) return { success: false, error: "Missing businessId" };

  // 1. Remove from memory store & local cache
  memoryBusinessStore.delete(businessId);
  const updatedCache = getLocalBusinessCache().filter(b => b.id !== businessId);
  setLocalBusinessCache(updatedCache);

  // 2. Remove from Firestore
  let firestoreError: string | undefined;
  if (db && !businessId.startsWith("demo-") && auth.currentUser && !userId?.startsWith("preview_")) {
    try {
      await deleteDoc(doc(db, "businesses", businessId));
    } catch (err: any) {
      firestoreError = err.message || "Firestore deletion failed";
      console.warn(`[BusinessPersistence] Firestore delete failed for ${businessId}:`, firestoreError);
      if (options?.throwOnFirestoreError) {
        return { success: false, error: firestoreError };
      }
    }
  }

  return { success: true, error: firestoreError };
}

/**
 * 5. Ingest & Persist Batch
 * Authoritative single entry point for search results, CSV imports, and CRM sync records.
 */
export async function ingestAndPersistBusinesses(
  incomingCandidates: Partial<Business>[],
  userId?: string
): Promise<{
  consolidated: Business[];
  added: Business[];
  updated: Business[];
  unchanged: Business[];
  persistedCount: number;
  failedCount: number;
}> {
  const currentList = getLocalBusinessCache();
  const ingestion = deduplicateAndIngestBusinesses(currentList, incomingCandidates, { defaultUserId: userId });

  // Update memory and local cache immediately
  setLocalBusinessCache(ingestion.consolidated);

  let persistedCount = 0;
  let failedCount = 0;

  // Persist new and updated businesses through the canonical persistence layer
  for (const biz of [...ingestion.added, ...ingestion.updated]) {
    try {
      const res = await saveBusinessRecord(biz, userId);
      if (res.success) persistedCount++;
      else failedCount++;
    } catch (err) {
      failedCount++;
    }
  }

  return {
    consolidated: ingestion.consolidated,
    added: ingestion.added,
    updated: ingestion.updated,
    unchanged: ingestion.unchanged,
    persistedCount,
    failedCount
  };
}

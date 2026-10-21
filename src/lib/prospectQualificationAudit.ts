import { 
  Business, 
  QualificationStatus, 
  ProspectQualificationResult, 
  QualificationDecisionType, 
  QualificationAuditActor, 
  QualificationCriteriaSnapshot, 
  QualificationAuditEvent,
  EvidenceItem 
} from "../types";
import { db, auth } from "./firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

/**
 * MICRO-PHASE 11D: PROSPECT QUALIFICATION AUDIT TRAIL AND DECISION HISTORY ENGINE
 * 
 * Provides an immutable, traceable, and reviewable audit trail for every qualification decision.
 * Distinguishes automated decisions from human review and manual overrides, preserves historical
 * criteria and evidence snapshots, enforces RBAC permissions, and protects audit integrity against
 * tampering, unauthorized edits, or misleading duplicates.
 */

// In-memory audit cache map for instant access & sandbox/demo environments
const memoryQualificationAuditMap: Record<string, QualificationAuditEvent[]> = {};

/**
 * Strips secrets, bearer tokens, or sensitive API keys from audit rationales.
 */
export function sanitizeAuditReason(reason?: string): string {
  if (!reason || typeof reason !== "string") {
    return "Documented qualification event";
  }
  let sanitized = reason
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, "Bearer [REDACTED]")
    // Redact potential API keys (AIza, sk-, ghp_, etc.)
    .replace(/(AIza[0-9A-Za-z-_]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})/gi, "[REDACTED_API_KEY]")
    // Redact password or secret query parameters
    .replace(/(password|secret|token)=([^&\s]+)/gi, "$1=[REDACTED]")
    .trim();

  if (sanitized.length === 0) {
    return "Documented qualification event";
  }
  return sanitized.length > 1000 ? sanitized.substring(0, 997) + "..." : sanitized;
}

/**
 * Verifies whether a user has permissions to access or inspect the qualification audit history.
 * Ordinary viewers, guests, or unauthorized roles are denied access.
 */
export function isUserAuthorizedForAuditAccess(
  user: { uid?: string; role?: string } | null | undefined
): boolean {
  if (!user || !user.uid || user.uid.trim() === "") {
    return false;
  }
  const role = (user.role || "").toLowerCase().trim();
  if (role === "viewer" || role === "read_only" || role === "guest" || role === "anonymous") {
    return false;
  }
  // Authorized: Admin, Lead Reviewer, Manager, Sales Agent, System, or standard User
  return true;
}

/**
 * Determines whether a candidate audit event is an exact duplicate of the most recent event.
 * Avoids recording redundant, noisy events when repeated background runs or idempotent saves occur.
 */
export function isDuplicateQualificationEvent(
  lastEvent: QualificationAuditEvent | undefined,
  candidate: {
    decisionType: QualificationDecisionType;
    newStatus: QualificationStatus;
    newScore: number;
    newPrioritizationRank: number;
    reason: string;
    actor: QualificationAuditActor;
  }
): boolean {
  if (!lastEvent) return false;

  const sameType = lastEvent.decisionType === candidate.decisionType;
  const sameStatus = lastEvent.newStatus === candidate.newStatus;
  const sameScore = lastEvent.newScore === candidate.newScore;
  const sameRank = lastEvent.newPrioritizationRank === candidate.newPrioritizationRank;
  const sameActor = lastEvent.actor.uid === candidate.actor.uid;
  const sameReason = sanitizeAuditReason(lastEvent.reason) === sanitizeAuditReason(candidate.reason);

  return sameType && sameStatus && sameScore && sameRank && sameActor && sameReason;
}

/**
 * Extracts a serializable snapshot of the 5 qualification criteria at the time of the decision.
 */
export function extractCriteriaSnapshot(
  criteria?: ProspectQualificationResult["criteria"]
): QualificationCriteriaSnapshot {
  if (!criteria) return {};

  return {
    identityRelevance: criteria.identityRelevance ? {
      passed: criteria.identityRelevance.passed,
      scoreContribution: criteria.identityRelevance.scoreContribution,
      explanation: criteria.identityRelevance.explanation
    } : undefined,
    opportunityEvidence: criteria.opportunityEvidence ? {
      passed: criteria.opportunityEvidence.passed,
      scoreContribution: criteria.opportunityEvidence.scoreContribution,
      explanation: criteria.opportunityEvidence.explanation
    } : undefined,
    evidenceConfidence: criteria.evidenceConfidence ? {
      passed: criteria.evidenceConfidence.passed,
      scoreContribution: criteria.evidenceConfidence.scoreContribution,
      explanation: criteria.evidenceConfidence.explanation
    } : undefined,
    contactability: criteria.contactability ? {
      passed: criteria.contactability.passed,
      scoreContribution: criteria.contactability.scoreContribution,
      explanation: criteria.contactability.explanation
    } : undefined,
    serviceFit: criteria.serviceFit ? {
      passed: criteria.serviceFit.passed,
      scoreContribution: criteria.serviceFit.scoreContribution,
      explanation: criteria.serviceFit.explanation
    } : undefined
  };
}

/**
 * Creates a standardized QualificationAuditActor object.
 */
export function createAuditActor(
  user?: { uid: string; displayName?: string; email?: string; role?: string } | null,
  isAutomated: boolean = false
): QualificationAuditActor {
  if (isAutomated || !user) {
    return {
      uid: "system_evaluator",
      displayName: "SiteScout Automated Qualification Engine",
      role: "SYSTEM",
      isAutomated: true
    };
  }

  return {
    uid: user.uid,
    displayName: user.displayName || user.email || "Authorized Reviewer",
    email: user.email,
    role: user.role || "Lead Reviewer",
    isAutomated: false
  };
}

export interface RecordQualificationAuditInput {
  decisionType: QualificationDecisionType;
  actor: QualificationAuditActor;
  previousStatus: QualificationStatus;
  newStatus: QualificationStatus;
  previousScore: number;
  newScore: number;
  previousPrioritizationRank: number;
  newPrioritizationRank: number;
  reason: string;
  criteriaSnapshot?: QualificationCriteriaSnapshot;
  evidenceReferences?: string[];
  isAutomated?: boolean;
  metadata?: Record<string, any>;
}

export interface RecordQualificationAuditResult {
  success: boolean;
  event?: QualificationAuditEvent;
  error?: string;
  isDuplicateSkipped?: boolean;
}

/**
 * Records an immutable qualification audit event into persistent storage and in-memory caches.
 */
export async function recordQualificationAuditEvent(
  businessId: string,
  input: RecordQualificationAuditInput,
  business?: Business
): Promise<RecordQualificationAuditResult> {
  // 1. Authorization Guardrail (for human actors)
  if (!input.actor.isAutomated && !isUserAuthorizedForAuditAccess(input.actor)) {
    return {
      success: false,
      error: `Unauthorized actor (${input.actor.displayName || input.actor.uid}): Insufficient permissions to record qualification audit event.`
    };
  }

  // 2. Reason Validation Guardrail
  const sanitizedReason = sanitizeAuditReason(input.reason);
  if (!sanitizedReason || sanitizedReason.length < 5) {
    return {
      success: false,
      error: "A valid, documented rationale (minimum 5 characters) is required for qualification audit events."
    };
  }

  // 3. Duplicate Suppression Check
  const latestEvent = business?.qualificationAuditTrail?.[0] || memoryQualificationAuditMap[businessId]?.[0];

  if (isDuplicateQualificationEvent(latestEvent, {
    decisionType: input.decisionType,
    newStatus: input.newStatus,
    newScore: input.newScore,
    newPrioritizationRank: input.newPrioritizationRank,
    reason: sanitizedReason,
    actor: input.actor
  })) {
    return {
      success: true,
      event: latestEvent,
      isDuplicateSkipped: true
    };
  }

  // 4. Construct Immutable Event Record
  const eventId = `qaud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const isAutomated = input.isAutomated ?? input.actor.isAutomated;

  // Extract evidence references if not passed
  let evidenceReferences = input.evidenceReferences;
  if (!evidenceReferences && business?.evidenceList && business.evidenceList.length > 0) {
    evidenceReferences = business.evidenceList
      .slice(0, 5)
      .map(e => e.evidenceText || e.title || e.url)
      .filter(Boolean) as string[];
  }

  const payload: QualificationAuditEvent = {
    id: eventId,
    businessId,
    decisionType: input.decisionType,
    actor: {
      ...input.actor,
      isAutomated
    },
    timestamp,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    previousScore: input.previousScore,
    newScore: input.newScore,
    previousPrioritizationRank: input.previousPrioritizationRank,
    newPrioritizationRank: input.newPrioritizationRank,
    reason: sanitizedReason,
    criteriaSnapshot: input.criteriaSnapshot || extractCriteriaSnapshot(business?.qualificationResult?.criteria),
    evidenceReferences,
    isAutomated,
    metadata: input.metadata
  };

  // 5. In-Memory Cache
  if (!memoryQualificationAuditMap[businessId]) {
    memoryQualificationAuditMap[businessId] = [];
  }
  memoryQualificationAuditMap[businessId].unshift(payload);

  // 6. Update business entity if provided
  if (business) {
    business.qualificationAuditTrail = [payload, ...(business.qualificationAuditTrail || []).filter(e => e.id !== payload.id)];
    business.updatedAt = timestamp;
  }

  // 7. Browser Local Storage Cache
  try {
    if (typeof localStorage !== "undefined") {
      const key = `sitescout_qual_audit_${businessId}`;
      const cached = localStorage.getItem(key);
      const list: QualificationAuditEvent[] = cached ? JSON.parse(cached) : [];
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    // Non-fatal cache failure
  }

  // 8. Firestore Persistent Subcollection (/businesses/{businessId}/qualification_audits/{eventId})
  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      const firestorePayload = JSON.parse(JSON.stringify(payload));
      await setDoc(doc(db, "businesses", businessId, "qualification_audits", eventId), firestorePayload);
    } catch (err) {
      console.warn(`[Qualification Audit] Failed to persist audit to Firestore for ${businessId}:`, err);
    }
  }

  return {
    success: true,
    event: payload
  };
}

/**
 * Retrieves the complete qualification audit trail and decision history for a prospect.
 * Strictly verifies user authorization before returning data.
 */
export async function getProspectQualificationAuditTrail(
  businessId: string,
  user: { uid?: string; role?: string } | null | undefined
): Promise<{ success: boolean; auditTrail: QualificationAuditEvent[]; error?: string }> {
  // 1. Authorization Guardrail
  if (!isUserAuthorizedForAuditAccess(user)) {
    return {
      success: false,
      auditTrail: [],
      error: "Unauthorized user: Insufficient permissions to view qualification audit trail."
    };
  }

  const cacheKey = `sitescout_qual_audit_${businessId}`;
  let results: QualificationAuditEvent[] = memoryQualificationAuditMap[businessId]
    ? [...memoryQualificationAuditMap[businessId]]
    : [];

  // Try local browser cache
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed: QualificationAuditEvent[] = JSON.parse(raw);
        // Merge without duplicates
        const existingIds = new Set(results.map(r => r.id));
        parsed.forEach(p => {
          if (!existingIds.has(p.id)) {
            results.push(p);
            existingIds.add(p.id);
          }
        });
      }
    }
  } catch (e) {
    // Non-fatal
  }

  // Firestore Subcollection
  if (db && !businessId.startsWith("demo-")) {
    try {
      const colRef = collection(db, "businesses", businessId, "qualification_audits");
      const snap = await getDocs(colRef);
      const remoteResults: QualificationAuditEvent[] = [];
      snap.forEach(d => remoteResults.push(d.data() as QualificationAuditEvent));

      if (remoteResults.length > 0) {
        const idSet = new Set(results.map(r => r.id));
        remoteResults.forEach(r => {
          if (!idSet.has(r.id)) {
            results.push(r);
            idSet.add(r.id);
          }
        });
      }
    } catch (err) {
      console.warn(`[Qualification Audit] Failed to read audits from Firestore for ${businessId}:`, err);
    }
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Update memory cache
  memoryQualificationAuditMap[businessId] = results;

  return {
    success: true,
    auditTrail: results
  };
}

/**
 * Protects audit integrity by blocking unauthorized edits or deletions.
 * Qualification audit history is strictly immutable and append-only.
 */
export function attemptEditOrDeleteAuditEvent(
  businessId: string,
  auditId: string,
  user: { uid?: string; role?: string }
): { success: boolean; error: string } {
  const role = (user.role || "").toLowerCase();
  return {
    success: false,
    error: `Audit integrity violation: Qualification audit records are append-only and cannot be modified or deleted by user ${user.uid} (${role || "standard user"}).`
  };
}

/**
 * Clears the in-memory qualification audit cache map (for isolated testing).
 */
export function clearQualificationAuditMemoryCacheForTest(): void {
  for (const k in memoryQualificationAuditMap) {
    delete memoryQualificationAuditMap[k];
  }
}

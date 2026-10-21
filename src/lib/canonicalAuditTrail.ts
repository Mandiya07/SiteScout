import { 
  CanonicalAuditEvent, 
  AuditEventFilter, 
  AuditEventCategory, 
  AuditOutcome, 
  AuditActorType,
  PrivilegedAdminAuditEvent
} from "../types";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { recordLifecycleAuditEvent } from "./prospectCrm";

/**
 * MICRO-PHASE 17B: CANONICAL AUDIT TRAIL, SECURITY EVENTS & ADMINISTRATIVE ACCOUNTABILITY
 * 
 * Provides one trustworthy, immutable, and comprehensive audit trail for:
 * - Security-sensitive operations & authorization boundaries
 * - Administrative and privileged operations (staff/manager/admin)
 * - Customer account lifecycle & data access
 * - Financial transactions (subscriptions, payments, refunds, invoices)
 * - System runtime operations & automated workflows
 * 
 * Core Invariants:
 * 1. Immutability: Audit records cannot be altered, updated, or deleted by normal users or staff.
 * 2. Accuracy: Failed operations are NEVER logged as successful. Operations that didn't occur are not logged.
 * 3. Server Timestamps: All timestamps are strictly generated server-side in ISO-8601 format.
 * 4. Sensitive Data Protection: Automatic redaction of passwords, tokens, API keys, CVVs, and credentials.
 * 5. Traceability: Correlation IDs link related events across distributed workflows.
 * 6. Idempotency: Duplicate logs within deduplication windows are prevented.
 * 7. Operator Accountability: Distinguishes HUMAN vs AUTOMATED actions and precise actor roles.
 */

// In-memory canonical audit event store (append-only)
let canonicalAuditLogs: CanonicalAuditEvent[] = [];

// Recent event cache for deduplication & idempotency checks
const recentEventHashCache = new Map<string, { timestamp: number; event: CanonicalAuditEvent }>();
const DEDUP_WINDOW_MS = 5000; // 5-second window for identical idempotent operations

/**
 * Deeply sanitizes objects, strings, and keys to prevent sensitive data/PII leakage in audit logs.
 */
export function sanitizeAuditPayload<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return (input
      // Redact Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9\-_.]{10,}/gi, "Bearer [REDACTED_TOKEN]")
      // Redact Google / Gemini API keys
      .replace(/AIza[0-9A-Za-z\-_]{35}/g, "[REDACTED_API_KEY]")
      // Redact OpenAI / generic secret keys
      .replace(/(?:sk|ghp|pk|live)_[A-Za-z0-9]{20,}/g, "[REDACTED_SECRET]")
      // Redact passwords in URL query or inline strings
      .replace(/(password|passwd|pwd|secret|apiKey)=([^&\s]+)/gi, "$1=[REDACTED]")
      // Redact 16-digit credit card patterns
      .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, "[REDACTED_CARD_NUMBER]")
      // Redact CVV patterns
      .replace(/(?:cvv|cvc)\s*[:=]\s*\d{3,4}/gi, "cvv=[REDACTED]")) as any;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeAuditPayload(item)) as any;
  }

  if (typeof input === "object") {
    const sanitizedObj: Record<string, any> = {};
    const sensitiveKeyPattern = /^(password|passwd|pwd|secret|token|apiKey|api_key|cvv|cvc|cardNumber|card_number|auth_secret|privateKey|private_key)$/i;

    for (const [key, value] of Object.entries(input)) {
      if (sensitiveKeyPattern.test(key)) {
        sanitizedObj[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitizedObj[key] = sanitizeAuditPayload(value);
      } else if (typeof value === "string") {
        sanitizedObj[key] = sanitizeAuditPayload(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj as any;
  }

  return input;
}

/**
 * Generates an idempotency/dedup hash for an audit event.
 */
function computeEventDedupKey(event: {
  idempotencyKey?: string;
  eventType: string;
  correlationId?: string;
  actorId: string;
  entityId: string;
  outcome: AuditOutcome;
}): string {
  if (event.idempotencyKey) {
    return `key_${event.idempotencyKey}`;
  }
  return `${event.correlationId || "no_corr"}_${event.eventType}_${event.actorId}_${event.entityId}_${event.outcome}`;
}

export interface RecordCanonicalAuditEventParams {
  eventType: string;
  category: AuditEventCategory;
  outcome: AuditOutcome;
  actor: {
    actorId: string;
    actorType?: AuditActorType;
    email?: string;
    role?: string;
    name?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  targetEntity: {
    entityType: string;
    entityId: string;
    businessId?: string;
  };
  action: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  correlationId?: string;
  source?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * Canonical entry point to record a verified audit event across SiteScout AI.
 */
export async function recordCanonicalAuditEvent(
  params: RecordCanonicalAuditEventParams
): Promise<{ event: CanonicalAuditEvent; isDuplicate?: boolean }> {
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const actorType: AuditActorType = params.actor.actorType || 
    (params.actor.role === "SYSTEM" ? "SYSTEM" : params.actor.role ? "HUMAN" : "EXTERNAL");
  const source = params.source || "SiteScout-Core";
  const correlationId = params.correlationId || `corr_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Idempotency & Deduplication Check
  const dedupKey = computeEventDedupKey({
    idempotencyKey: params.idempotencyKey,
    eventType: params.eventType,
    correlationId: params.correlationId,
    actorId: params.actor.actorId,
    entityId: params.targetEntity.entityId,
    outcome: params.outcome
  });

  const cached = recentEventHashCache.get(dedupKey);
  if (cached && now - cached.timestamp < DEDUP_WINDOW_MS) {
    return { event: cached.event, isDuplicate: true };
  }

  // 2. Deep Sanitization of Sensitive Fields & PII
  const sanitizedReason = params.reason ? sanitizeAuditPayload(params.reason) : undefined;
  const sanitizedPreviousState = params.previousState ? sanitizeAuditPayload(params.previousState) : undefined;
  const sanitizedNewState = params.newState ? sanitizeAuditPayload(params.newState) : undefined;
  const sanitizedMetadata = params.metadata ? sanitizeAuditPayload(params.metadata) : undefined;

  // 3. Construct Canonical Audit Event
  const fullEvent: CanonicalAuditEvent = {
    eventId: `aud_can_${now}_${Math.random().toString(36).substring(2, 7)}`,
    eventType: params.eventType,
    category: params.category,
    outcome: params.outcome,
    actor: {
      actorId: params.actor.actorId,
      actorType,
      email: params.actor.email,
      role: params.actor.role,
      name: params.actor.name,
      ipAddress: params.actor.ipAddress,
      userAgent: params.actor.userAgent
    },
    targetEntity: {
      entityType: params.targetEntity.entityType,
      entityId: params.targetEntity.entityId,
      businessId: params.targetEntity.businessId
    },
    action: params.action,
    previousState: sanitizedPreviousState,
    newState: sanitizedNewState,
    reason: sanitizedReason,
    correlationId,
    timestamp,
    source,
    metadata: sanitizedMetadata,
    idempotencyKey: params.idempotencyKey
  };

  // 4. Append to In-Memory Canonical Store (Append-Only)
  canonicalAuditLogs.unshift(fullEvent);
  recentEventHashCache.set(dedupKey, { timestamp: now, event: fullEvent });

  // 5. Backwards Compatibility: Sync with CRM lifecycle audit when businessId is present
  if (fullEvent.targetEntity.businessId) {
    try {
      await recordLifecycleAuditEvent(
        fullEvent.targetEntity.businessId,
        {
          businessId: fullEvent.targetEntity.businessId,
          dimension: "crmSync",
          eventType: "crm_sync",
          actor: fullEvent.actor.name || fullEvent.actor.email || fullEvent.actor.actorId,
          actorId: fullEvent.actor.actorId,
          previousState: fullEvent.previousState ? JSON.stringify(fullEvent.previousState) : "none",
          newState: fullEvent.newState ? JSON.stringify(fullEvent.newState) : fullEvent.outcome,
          recordRef: `${fullEvent.targetEntity.entityType}:${fullEvent.targetEntity.entityId}`,
          metadata: {
            canonicalEventId: fullEvent.eventId,
            eventType: fullEvent.eventType,
            category: fullEvent.category,
            outcome: fullEvent.outcome,
            reason: fullEvent.reason || "",
            correlationId: fullEvent.correlationId
          }
        },
        fullEvent.actor.actorId
      );
    } catch (e) {
      // Non-fatal fallback
    }
  }

  // 6. Firestore Cloud Storage (if available and not in unit testing)
  if (db && !fullEvent.targetEntity.businessId?.startsWith("demo-") && process.env.NODE_ENV !== "test") {
    try {
      await setDoc(doc(db, "audit_logs", fullEvent.eventId), fullEvent);
    } catch (e) {
      // Non-fatal logging fallback
    }
  }

  return { event: fullEvent, isDuplicate: false };
}

/**
 * Queries the canonical audit log repository with rich domain filters.
 */
export function getCanonicalAuditLogs(filter?: AuditEventFilter): CanonicalAuditEvent[] {
  let logs = [...canonicalAuditLogs];

  if (filter?.category) {
    logs = logs.filter(l => l.category === filter.category);
  }
  if (filter?.outcome) {
    logs = logs.filter(l => l.outcome === filter.outcome);
  }
  if (filter?.eventType) {
    logs = logs.filter(l => l.eventType === filter.eventType);
  }
  if (filter?.actorId) {
    logs = logs.filter(l => l.actor.actorId === filter.actorId || l.actor.email === filter.actorId);
  }
  if (filter?.targetEntityType) {
    logs = logs.filter(l => l.targetEntity.entityType === filter.targetEntityType);
  }
  if (filter?.targetEntityId) {
    logs = logs.filter(l => l.targetEntity.entityId === filter.targetEntityId);
  }
  if (filter?.businessId) {
    logs = logs.filter(l => l.targetEntity.businessId === filter.businessId);
  }
  if (filter?.correlationId) {
    logs = logs.filter(l => l.correlationId === filter.correlationId);
  }
  if (filter?.startDate) {
    const startMs = Date.parse(filter.startDate);
    logs = logs.filter(l => Date.parse(l.timestamp) >= startMs);
  }
  if (filter?.endDate) {
    const endMs = Date.parse(filter.endDate);
    logs = logs.filter(l => Date.parse(l.timestamp) <= endMs);
  }
  if (filter?.limit && filter.limit > 0) {
    logs = logs.slice(0, filter.limit);
  }

  return logs;
}

/**
 * Strictly prevents audit log tampering, truncation, deletion, or modification.
 * Any attempt by a normal user or unauthorized operator generates an immediate SECURITY_EVENT.
 */
export async function preventAuditTampering(params: {
  actor: { actorId: string; email?: string; role?: string };
  action: "delete" | "modify" | "truncate" | "overwrite";
  targetAuditId?: string;
}): Promise<{ success: boolean; error: string; status: number }> {
  // Audit history is strictly immutable by security invariant
  await recordCanonicalAuditEvent({
    eventType: "AUDIT_TAMPERING_BLOCKED",
    category: "SECURITY_EVENT",
    outcome: "DENIED",
    actor: {
      actorId: params.actor.actorId,
      email: params.actor.email,
      role: params.actor.role || "CUSTOMER"
    },
    targetEntity: {
      entityType: "audit_repository",
      entityId: params.targetAuditId || "global_audit_trail"
    },
    action: params.action,
    reason: `Illegal attempt to ${params.action} immutable audit record. Security violation recorded.`,
    source: "SiteScout-SecurityGuard"
  });

  return {
    success: false,
    error: "Forbidden: Audit records are immutable and legally protected. Alteration or deletion is strictly forbidden.",
    status: 403
  };
}

/**
 * Resets the in-memory audit logs and deduplication cache for isolated test runs.
 */
export function resetCanonicalAuditLogsForTesting(): void {
  canonicalAuditLogs = [];
  recentEventHashCache.clear();
}

// =========================================================================
// CONVENIENCE CANONICAL AUDIT HELPERS FOR DOMAIN WORKFLOWS
// =========================================================================

/**
 * Record an Authentication or Session Lifecycle Event
 */
export async function recordAuthAuditEvent(params: {
  eventType: "AUTH_LOGIN_SUCCESS" | "AUTH_LOGOUT" | "AUTH_FAILED" | "SESSION_EXPIRED";
  actorId: string;
  email?: string;
  role?: string;
  outcome: AuditOutcome;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}): Promise<CanonicalAuditEvent> {
  const category: AuditEventCategory = params.outcome === "SUCCESS" ? "USER_ACTION" : "SECURITY_EVENT";
  const { event } = await recordCanonicalAuditEvent({
    eventType: params.eventType,
    category,
    outcome: params.outcome,
    actor: {
      actorId: params.actorId,
      email: params.email,
      role: params.role,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    },
    targetEntity: {
      entityType: "session",
      entityId: params.actorId
    },
    action: params.eventType.toLowerCase(),
    reason: params.reason,
    correlationId: params.correlationId,
    source: "SiteScout-Auth"
  });
  return event;
}

/**
 * Record a Customer Account or Profile Lifecycle Event
 */
export async function recordCustomerLifecycleAuditEvent(params: {
  eventType: "CUSTOMER_CREATED" | "CUSTOMER_UPDATED" | "CUSTOMER_DEACTIVATED" | "SENSITIVE_DATA_ACCESSED";
  customerId: string;
  businessId?: string;
  actor: { actorId: string; email?: string; role?: string };
  outcome: AuditOutcome;
  action: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  correlationId?: string;
}): Promise<CanonicalAuditEvent> {
  const category: AuditEventCategory = params.actor.role === "ADMIN" || params.actor.role === "SUPER_ADMIN"
    ? "ADMIN_ACTION"
    : "USER_ACTION";

  const { event } = await recordCanonicalAuditEvent({
    eventType: params.eventType,
    category,
    outcome: params.outcome,
    actor: params.actor,
    targetEntity: {
      entityType: "customer_account",
      entityId: params.customerId,
      businessId: params.businessId
    },
    action: params.action,
    previousState: params.previousState,
    newState: params.newState,
    reason: params.reason,
    correlationId: params.correlationId,
    source: "SiteScout-CustomerPortal"
  });
  return event;
}

/**
 * Record a Financial, Billing, or Subscription Event
 */
export async function recordFinancialAuditEvent(params: {
  eventType: "SUBSCRIPTION_STATUS_CHANGED" | "PAYMENT_RECEIVED" | "PAYMENT_FAILED" | "REFUND_ISSUED" | "INVOICE_ADJUSTED";
  targetId: string;
  entityType: "subscription" | "payment" | "invoice";
  businessId?: string;
  actor: { actorId: string; email?: string; role?: string; actorType?: AuditActorType };
  outcome: AuditOutcome;
  action: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  correlationId?: string;
}): Promise<CanonicalAuditEvent> {
  const isSecurity = params.outcome === "DENIED" || params.outcome === "FAILED";
  const category: AuditEventCategory = isSecurity ? "SECURITY_EVENT" : "ADMIN_ACTION";

  const { event } = await recordCanonicalAuditEvent({
    eventType: params.eventType,
    category,
    outcome: params.outcome,
    actor: params.actor,
    targetEntity: {
      entityType: params.entityType,
      entityId: params.targetId,
      businessId: params.businessId
    },
    action: params.action,
    previousState: params.previousState,
    newState: params.newState,
    reason: params.reason,
    correlationId: params.correlationId,
    source: "SiteScout-Financials"
  });
  return event;
}

/**
 * Record a Website, Project, or Launch Handover Event
 */
export async function recordWebsiteLifecycleAuditEvent(params: {
  eventType: "WEBSITE_CREATED" | "WEBSITE_UPDATED" | "WEBSITE_PUBLISHED" | "WEBSITE_LAUNCHED" | "CLIENT_APPROVED";
  siteId: string;
  businessId?: string;
  actor: { actorId: string; email?: string; role?: string };
  outcome: AuditOutcome;
  action: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  correlationId?: string;
}): Promise<CanonicalAuditEvent> {
  const { event } = await recordCanonicalAuditEvent({
    eventType: params.eventType,
    category: params.actor.role?.includes("ADMIN") ? "ADMIN_ACTION" : "USER_ACTION",
    outcome: params.outcome,
    actor: params.actor,
    targetEntity: {
      entityType: "website_project",
      entityId: params.siteId,
      businessId: params.businessId
    },
    action: params.action,
    previousState: params.previousState,
    newState: params.newState,
    reason: params.reason,
    correlationId: params.correlationId,
    source: "SiteScout-Websites"
  });
  return event;
}

/**
 * Bridges between PrivilegedAdminAuditEvent and CanonicalAuditEvent
 * to ensure that all internalAdminSecurity actions are seamlessly synchronized into the canonical audit trail.
 */
export async function bridgePrivilegedToCanonical(
  event: PrivilegedAdminAuditEvent
): Promise<CanonicalAuditEvent> {
  const outcome: AuditOutcome = event.status === "AUTHORIZED" ? "SUCCESS" : event.status === "DENIED" ? "DENIED" : "FAILED";
  const category: AuditEventCategory = outcome === "DENIED" ? "SECURITY_EVENT" : "ADMIN_ACTION";

  const { event: canonical } = await recordCanonicalAuditEvent({
    eventType: event.operation,
    category,
    outcome,
    actor: {
      actorId: event.actor.uid,
      email: event.actor.email,
      name: event.actor.name,
      role: event.actor.role,
      actorType: "HUMAN"
    },
    targetEntity: event.targetEntity,
    action: event.action,
    previousState: event.previousState,
    newState: event.newState,
    reason: event.denialReason || event.metadata?.justification,
    source: "SiteScout-InternalAdmin",
    metadata: event.metadata
  });

  return canonical;
}

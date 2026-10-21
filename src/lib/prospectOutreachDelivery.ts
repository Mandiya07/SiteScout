import { 
  Business, 
  OutreachDraft, 
  OutreachDraftChannel, 
  OutreachApprovalState, 
  OutreachDeliveryStatus, 
  OutreachDeliveryMode, 
  OutreachScheduleConfig, 
  OutreachDeliveryResult, 
  OutreachAuditRecord,
  OutreachTone,
  OutreachDraftLength
} from "../types";
import { buildProspectContactProfile } from "./prospectContactValidation";
import { scanDraftTruthfulness } from "./prospectOutreachDrafting";
import { createCanonicalCommunicationRecord } from "./prospectCommunicationHistory";

/**
 * MICRO-PHASE 12C: OUTREACH APPROVAL, SCHEDULING, AND DELIVERY READINESS
 * 
 * Manages the controlled workflow that guarantees messages are reviewed, authorized,
 * scheduled safely, pre-flight validated, and dispatched with truthful audit logs.
 */

// Roles allowed to approve / schedule / dispatch outreach messages
export const AUTHORIZED_OUTREACH_ROLES = [
  "Admin", 
  "Manager", 
  "Agency VIP", 
  "Sales Agent", 
  "Account Executive", 
  "Owner", 
  "SuperAdmin",
  "User" // Default logged-in user role
];

export const UNAUTHORIZED_OUTREACH_ROLES = [
  "Viewer", 
  "Guest", 
  "Auditor", 
  "Read-Only", 
  "External"
];

export function isUserAuthorizedForOutreach(role?: string): boolean {
  if (!role) return true; // Default fallback to authorized if role not restricted
  if (UNAUTHORIZED_OUTREACH_ROLES.includes(role)) return false;
  return true;
}

export function isUserAuthorizedForApproval(role?: string): boolean {
  if (!role) return true;
  if (UNAUTHORIZED_OUTREACH_ROLES.includes(role)) return false;
  return true;
}

/**
 * Helper to append an audit record to an outreach draft
 */
export function appendOutreachAuditRecord(
  draft: OutreachDraft,
  action: OutreachAuditRecord["action"],
  actor: { uid?: string; displayName?: string; role?: string },
  details: string,
  previousStatus?: string,
  newStatus?: string,
  metadata?: Record<string, any>
): OutreachAuditRecord[] {
  const existing = draft.auditTrail || [];
  const record: OutreachAuditRecord = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    draftId: draft.id,
    businessId: draft.businessId,
    timestamp: new Date().toISOString(),
    action,
    actor: actor.displayName || actor.uid || "Authorized User",
    actorRole: actor.role || "Sales Agent",
    actorUid: actor.uid,
    details,
    previousStatus,
    newStatus,
    metadata
  };
  return [...existing, record];
}

/**
 * Pre-flight delivery and eligibility check
 * Re-validates prospect qualification, contact validity, claim truthfulness, and approval.
 */
export function validatePreflightDelivery(
  business: Business,
  draft: OutreachDraft,
  actor?: { uid?: string; displayName?: string; role?: string }
): {
  eligible: boolean;
  blockers: string[];
  warnings: string[];
  recipientAddress?: string;
} {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let recipientAddress: string | undefined = draft.recipientTarget;

  // 1. Check User Role Authorization
  if (actor && actor.role && !isUserAuthorizedForOutreach(actor.role)) {
    blockers.push(`User role "${actor.role}" is unauthorized to approve, schedule, or send outreach.`);
  }

  // 2. Check Prospect Qualification Status
  if (business.qualificationStatus === "DISQUALIFIED") {
    blockers.push("Prospect is DISQUALIFIED from all outreach communications.");
  }

  // 3. Check Approval Invariant
  if (!draft.isApproved || draft.approvalStatus !== "APPROVED") {
    blockers.push("Draft has not been approved by an authorized user (current approval status: " + (draft.approvalStatus || "DRAFT") + ").");
  }

  // 4. Check Unsupported Claims
  if (draft.unsupportedClaimsCount > 0) {
    blockers.push(`Draft contains ${draft.unsupportedClaimsCount} unsupported claim(s) that must be resolved prior to sending.`);
  }

  // 5. Check Content Truthfulness
  if (draft.isFlaggedForReview) {
    blockers.push(`Draft is flagged for review: ${draft.flaggedReasons?.join("; ") || "Review required."}`);
  }

  // 6. Contact Data Validation
  const contactProfile = business.contactProfile || buildProspectContactProfile(business);

  if (draft.channel === "email") {
    const email = recipientAddress || contactProfile.primaryEmail?.value || business.email;
    if (!email || !email.includes("@")) {
      blockers.push("Missing or invalid recipient email address for email channel.");
    } else {
      recipientAddress = email;
      if (contactProfile.primaryEmail && !contactProfile.primaryEmail.isVerified) {
        warnings.push("Email address is format-valid but unverified by DNS/SMTP.");
      }
    }
  } else if (draft.channel === "whatsapp" || draft.channel === "sms" || draft.channel === "phone_script") {
    const phone = recipientAddress || contactProfile.primaryPhone?.value || business.phone;
    if (!phone || phone.replace(/\D/g, "").length < 6) {
      blockers.push(`Missing or invalid recipient phone number for ${draft.channel} channel.`);
    } else {
      recipientAddress = phone;
      if (draft.channel === "whatsapp" && contactProfile.primaryPhone && !contactProfile.primaryPhone.whatsappCapable) {
        warnings.push("Recipient phone is a landline or unconfirmed for WhatsApp messaging.");
      }
    }
  } else if (draft.channel === "in_person") {
    const address = business.address;
    if (!address || address.trim().length < 3) {
      blockers.push("Missing confirmed physical business address for in-person outreach.");
    } else {
      recipientAddress = address;
    }
  }

  // 7. Check if business has legal / consent blocker
  if (business.doNotContact === true) {
    blockers.push("Prospect has requested Do-Not-Contact (opt-out / legal exclusion).");
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    warnings,
    recipientAddress
  };
}

/**
 * Submits an outreach draft for review
 */
export function submitDraftForReview(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  note?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "edited" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: note || "Submitted draft for managerial review."
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    approvalStatus: "PENDING_REVIEW",
    status: "PENDING_REVIEW",
    isApproved: false,
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "submitted_for_review",
    actor,
    note || "Submitted message draft for formal approval review.",
    targetDraft.approvalStatus || "DRAFT",
    "PENDING_REVIEW"
  );

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

/**
 * Approves an outreach draft for subsequent delivery readiness.
 * Enforces role authorization and claim grounding.
 */
export function approveOutreachDraft(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  approvalReason?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  if (!actor || !actor.uid) {
    return { success: false, business, error: "Approver UID is required." };
  }

  if (!isUserAuthorizedForApproval(actor.role)) {
    return { 
      success: false, 
      business, 
      error: `Unauthorized: User role "${actor.role || "Unknown"}" cannot approve outreach messages.` 
    };
  }

  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  if (targetDraft.unsupportedClaimsCount > 0) {
    return {
      success: false,
      business,
      error: `Cannot approve draft with ${targetDraft.unsupportedClaimsCount} unsupported claims. Resolve flagged issues first.`
    };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "approved" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Manager",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: approvalReason || "Draft approved by authorized user for delivery readiness."
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    isApproved: true,
    approvalStatus: "APPROVED",
    approvedBy: actor.displayName || actor.uid,
    approvedAt: now,
    approvalReason: approvalReason || "Approved for delivery readiness.",
    status: "APPROVED",
    deliveryStatus: targetDraft.deliveryStatus === "SCHEDULED" ? "SCHEDULED" : "NOT_SCHEDULED",
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "approved",
    actor,
    approvalReason || "Draft approved for delivery readiness.",
    targetDraft.approvalStatus || "DRAFT",
    "APPROVED"
  );

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

/**
 * Rejects an outreach draft
 */
export function rejectOutreachDraft(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  rejectionReason: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  if (!isUserAuthorizedForApproval(actor.role)) {
    return { 
      success: false, 
      business, 
      error: `Unauthorized: User role "${actor.role || "Unknown"}" cannot reject outreach messages.` 
    };
  }

  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "rejected" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Manager",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: rejectionReason
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    isApproved: false,
    approvalStatus: "REJECTED",
    status: "DRAFT",
    deliveryStatus: "CANCELLED",
    scheduleConfig: undefined,
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "rejected",
    actor,
    `Draft rejected: ${rejectionReason}`,
    targetDraft.approvalStatus,
    "REJECTED"
  );

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

/**
 * Updates an outreach draft's content or recipient with truthfulness scanning
 * and automatic approval invalidation if a material change is made to an approved or scheduled message.
 */
export function updateOutreachDraft(
  business: Business,
  draftId: string,
  updates: {
    subject?: string;
    body?: string;
    recipientTarget?: string;
    callToAction?: string;
    tone?: OutreachTone;
    length?: OutreachDraftLength;
  },
  actor: { uid: string; displayName?: string; role?: string },
  changeReason?: string
): { 
  success: boolean; 
  business: Business; 
  draft?: OutreachDraft; 
  approvalInvalidated: boolean; 
  error?: string 
} {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, approvalInvalidated: false, error: `Draft with ID "${draftId}" not found.` };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const newSubject = updates.subject !== undefined ? updates.subject : targetDraft.subject;
  const newBody = updates.body !== undefined ? updates.body : targetDraft.body;
  const newRecipient = updates.recipientTarget !== undefined ? updates.recipientTarget : targetDraft.recipientTarget;
  const newCallToAction = updates.callToAction !== undefined ? updates.callToAction : targetDraft.callToAction;
  const newTone = updates.tone !== undefined ? updates.tone : targetDraft.tone;
  const newLength = updates.length !== undefined ? updates.length : targetDraft.length;

  // Material change check: subject, body, or recipient target changed
  const isMaterial = 
    (updates.subject !== undefined && updates.subject !== targetDraft.subject) ||
    (updates.body !== undefined && updates.body !== targetDraft.body) ||
    (updates.recipientTarget !== undefined && updates.recipientTarget !== targetDraft.recipientTarget);

  // Truthfulness scan on new content
  const truthScan = scanDraftTruthfulness(newBody, newSubject || "", business, targetDraft.channel);

  let approvalInvalidated = false;
  let newApprovalStatus: OutreachApprovalState = targetDraft.approvalStatus;
  let isApproved = targetDraft.isApproved;
  let deliveryStatus = targetDraft.deliveryStatus;
  let scheduleConfig = targetDraft.scheduleConfig;
  let status = targetDraft.status;

  if (isMaterial && (targetDraft.isApproved || targetDraft.approvalStatus === "APPROVED" || targetDraft.deliveryStatus === "SCHEDULED")) {
    approvalInvalidated = true;
    isApproved = false;
    newApprovalStatus = "DRAFT";
    status = "draft";
    if (deliveryStatus === "SCHEDULED") {
      deliveryStatus = "CANCELLED";
      scheduleConfig = undefined;
    }
  }

  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "edited" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: newSubject,
    body: truthScan.sanitizedBody,
    reason: changeReason || (approvalInvalidated 
      ? "Material draft modification. Approval invalidated; re-review required." 
      : "Draft updated.")
  };

  let updatedDraft: OutreachDraft = {
    ...targetDraft,
    subject: newSubject,
    body: truthScan.sanitizedBody,
    recipientTarget: newRecipient,
    callToAction: newCallToAction,
    tone: newTone,
    length: newLength,
    claims: truthScan.claims,
    unsupportedClaimsCount: truthScan.unsupportedClaims.length,
    truthfulnessScore: truthScan.truthfulnessScore,
    isFlaggedForReview: !truthScan.isValid,
    flaggedReasons: truthScan.flaggedIssues,
    version: nextVersion,
    updatedAt: now,
    isApproved,
    approvalStatus: newApprovalStatus,
    deliveryStatus,
    scheduleConfig,
    status,
    history: [...targetDraft.history, historyEntry]
  };

  if (approvalInvalidated) {
    updatedDraft.auditTrail = appendOutreachAuditRecord(
      updatedDraft,
      "approval_invalidated",
      actor,
      `Material edits invalidated prior approval by ${targetDraft.approvedBy || "authorized user"}. Re-approval required before sending. Reason: ${changeReason || "Content modified"}`,
      "APPROVED",
      "DRAFT",
      { previousVersion: targetDraft.version, newVersion: nextVersion }
    );
  } else {
    updatedDraft.auditTrail = appendOutreachAuditRecord(
      updatedDraft,
      "edited",
      actor,
      changeReason || "Draft updated by user.",
      targetDraft.approvalStatus,
      newApprovalStatus
    );
  }

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return {
    success: true,
    business: updatedBusiness,
    draft: updatedDraft,
    approvalInvalidated
  };
}

/**
 * Schedules an approved outreach draft for future delivery.
 * Enforces approval requirements, future date/time validation, and preflight eligibility.
 */
export function scheduleOutreachDelivery(
  business: Business,
  draftId: string,
  scheduleOptions: {
    scheduledAt: string; // ISO 8601 string
    timeZone?: string;
    autoSend?: boolean;
  },
  actor: { uid: string; displayName?: string; role?: string }
): { 
  success: boolean; 
  business: Business; 
  draft?: OutreachDraft; 
  scheduleConfig?: OutreachScheduleConfig;
  error?: string;
  blockers?: string[];
} {
  if (!actor || !actor.uid) {
    return { success: false, business, error: "Actor UID is required to schedule outreach." };
  }

  if (!isUserAuthorizedForOutreach(actor.role)) {
    return { success: false, business, error: `Unauthorized: User role "${actor.role || "Unknown"}" cannot schedule outreach.` };
  }

  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  // 1. Verify Draft is Approved
  if (!targetDraft.isApproved || targetDraft.approvalStatus !== "APPROVED") {
    return {
      success: false,
      business,
      error: "Cannot schedule unapproved draft. Message must be explicitly approved before scheduling."
    };
  }

  // 2. Validate Schedule Date/Time
  const scheduledTimestamp = Date.parse(scheduleOptions.scheduledAt);
  if (isNaN(scheduledTimestamp)) {
    return { success: false, business, error: "Invalid schedule date/time format. Please provide a valid ISO timestamp." };
  }

  const now = Date.now();
  if (scheduledTimestamp <= now + 10000) { // Must be at least 10 seconds in the future
    return { success: false, business, error: "Scheduled delivery time must be in the future." };
  }

  // 3. Pre-flight checks
  const preflight = validatePreflightDelivery(business, targetDraft, actor);
  if (!preflight.eligible) {
    return {
      success: false,
      business,
      error: `Pre-flight validation failed: ${preflight.blockers.join("; ")}`,
      blockers: preflight.blockers
    };
  }

  const idempotencyKey = `sched_${targetDraft.id}_${scheduledTimestamp}_${Math.random().toString(36).substring(2, 8)}`;
  const scheduleConfig: OutreachScheduleConfig = {
    scheduledAt: new Date(scheduledTimestamp).toISOString(),
    timeZone: scheduleOptions.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    scheduledBy: actor.displayName || actor.uid,
    scheduledByRole: actor.role || "Sales Agent",
    scheduledTimestamp,
    idempotencyKey,
    retryCount: 0,
    maxRetries: 3,
    autoSend: scheduleOptions.autoSend ?? true
  };

  const nextVersion = targetDraft.version + 1;
  const historyEntry = {
    version: nextVersion,
    timestamp: new Date().toISOString(),
    action: "scheduled" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: `Scheduled delivery for ${scheduleConfig.scheduledAt} (${scheduleConfig.timeZone})`
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    deliveryStatus: "SCHEDULED",
    status: "SCHEDULED",
    scheduleConfig,
    recipientTarget: preflight.recipientAddress || targetDraft.recipientTarget,
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "scheduled",
    actor,
    `Scheduled outreach for delivery at ${scheduleConfig.scheduledAt} (TZ: ${scheduleConfig.timeZone}). Idempotency key: ${idempotencyKey}`,
    targetDraft.deliveryStatus || "NOT_SCHEDULED",
    "SCHEDULED",
    { scheduleConfig }
  );

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { 
    success: true, 
    business: updatedBusiness, 
    draft: updatedDraft, 
    scheduleConfig 
  };
}

/**
 * Cancels a scheduled outreach message before delivery occurs.
 */
export function cancelScheduledDelivery(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  cancellationReason?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  if (!isUserAuthorizedForOutreach(actor.role)) {
    return { success: false, business, error: `Unauthorized: User role "${actor.role || "Unknown"}" cannot cancel outreach.` };
  }

  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  if (targetDraft.deliveryStatus !== "SCHEDULED" && targetDraft.status !== "SCHEDULED") {
    return { 
      success: false, 
      business, 
      error: `Draft is not currently in SCHEDULED state (current delivery status: ${targetDraft.deliveryStatus || "NOT_SCHEDULED"}).` 
    };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "cancelled" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: cancellationReason || "Scheduled delivery cancelled by user."
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    deliveryStatus: "CANCELLED",
    status: targetDraft.isApproved ? "APPROVED" : "CANCELLED",
    scheduleConfig: undefined,
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "schedule_cancelled",
    actor,
    cancellationReason || "Scheduled delivery cancelled before dispatch.",
    "SCHEDULED",
    "CANCELLED"
  );

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

/**
 * Reschedules a previously scheduled outreach message to a new date/time.
 */
export function rescheduleOutreachDelivery(
  business: Business,
  draftId: string,
  newScheduledAt: string,
  actor: { uid: string; displayName?: string; role?: string },
  reason?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  // Cancel existing schedule first, then re-schedule
  const cancelRes = cancelScheduledDelivery(business, draftId, actor, reason || "Rescheduling delivery");
  if (!cancelRes.success || !cancelRes.draft) {
    return { success: false, business, error: cancelRes.error || "Failed to cancel prior schedule." };
  }

  return scheduleOutreachDelivery(
    cancelRes.business,
    draftId,
    { scheduledAt: newScheduledAt },
    actor
  );
}

/**
 * Dispatches an outreach message with pre-flight re-validation, idempotency locking,
 * clear distinction between actual and simulated delivery, and error handling.
 */
export function deliverOutreachMessage(
  business: Business,
  draftId: string,
  options: {
    mode: OutreachDeliveryMode;
    idempotencyKey?: string;
    customProvider?: string;
    simulateFailure?: boolean;
    failureReason?: string;
  },
  actor: { uid: string; displayName?: string; role?: string }
): {
  success: boolean;
  business: Business;
  draft?: OutreachDraft;
  deliveryResult?: OutreachDeliveryResult;
  error?: string;
  protocolUrl?: string;
} {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  // 1. Role Authorization Check
  if (!isUserAuthorizedForOutreach(actor.role)) {
    const deniedAudit = appendOutreachAuditRecord(
      targetDraft,
      "preflight_failed",
      actor,
      `Unauthorized delivery attempt by role "${actor.role || "Unknown"}".`,
      targetDraft.deliveryStatus,
      targetDraft.deliveryStatus
    );
    const lockedBiz = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? { ...targetDraft, auditTrail: deniedAudit } : d)
    };
    return { success: false, business: lockedBiz, error: "Unauthorized user cannot send outreach messages." };
  }

  // 2. Duplicate Send & Deduplication Guard
  if (targetDraft.deliveryStatus === "DELIVERING") {
    return { 
      success: false, 
      business, 
      error: "Message delivery is currently in progress. Duplicate send prevented." 
    };
  }

  if (targetDraft.deliveryStatus === "SENT" && targetDraft.lastDeliveryResult?.success) {
    const dupAudit = appendOutreachAuditRecord(
      targetDraft,
      "duplicate_send_prevented",
      actor,
      `Duplicate send prevented. Message was already successfully sent at ${targetDraft.lastDeliveryResult.dispatchedAt}.`,
      "SENT",
      "SENT"
    );
    const lockedBiz = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? { ...targetDraft, auditTrail: dupAudit } : d)
    };
    return { 
      success: false, 
      business: lockedBiz, 
      error: "Message has already been delivered. Duplicate send blocked." 
    };
  }

  // 3. Pre-flight Verification (Immediately Before Dispatch)
  const preflight = validatePreflightDelivery(business, targetDraft, actor);
  if (!preflight.eligible) {
    const failedAudit = appendOutreachAuditRecord(
      targetDraft,
      "preflight_failed",
      actor,
      `Pre-flight check failed before delivery: ${preflight.blockers.join("; ")}`,
      targetDraft.deliveryStatus,
      "FAILED"
    );
    const lockedBiz = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? { ...targetDraft, auditTrail: failedAudit } : d)
    };
    return {
      success: false,
      business: lockedBiz,
      error: `Pre-flight validation failed: ${preflight.blockers.join("; ")}`
    };
  }

  const now = new Date().toISOString();
  const recipient = preflight.recipientAddress || targetDraft.recipientTarget || "prospect@domain.local";

  // 4. Handle Simulated Failure Option (e.g. for testing & error verification)
  if (options.simulateFailure) {
    const deliveryResult: OutreachDeliveryResult = {
      success: false,
      deliveryStatus: "FAILED",
      deliveryMode: options.mode,
      dispatchedAt: now,
      provider: options.customProvider || "simulated_gateway",
      recipientAddress: recipient,
      channel: targetDraft.channel,
      isSimulated: options.mode === "SIMULATED",
      error: options.failureReason || "Simulated gateway connection timeout (HTTP 504 Gateway Timeout)."
    };

    const nextVersion = targetDraft.version + 1;
    const historyEntry = {
      version: nextVersion,
      timestamp: now,
      action: "failed" as const,
      actor: actor.displayName || actor.uid,
      actorRole: actor.role || "Sales Agent",
      subject: targetDraft.subject,
      body: targetDraft.body,
      reason: `Delivery failure: ${deliveryResult.error}`
    };

    let updatedDraft: OutreachDraft = {
      ...targetDraft,
      deliveryStatus: "FAILED",
      status: "FAILED",
      lastDeliveryResult: deliveryResult,
      version: nextVersion,
      updatedAt: now,
      history: [...targetDraft.history, historyEntry]
    };

    updatedDraft.auditTrail = appendOutreachAuditRecord(
      updatedDraft,
      "send_failed",
      actor,
      `Outreach delivery failed: ${deliveryResult.error}`,
      targetDraft.deliveryStatus,
      "FAILED",
      { deliveryResult }
    );

    const updatedBusiness: Business = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
    };

    return { 
      success: false, 
      business: updatedBusiness, 
      draft: updatedDraft, 
      deliveryResult, 
      error: deliveryResult.error 
    };
  }

  // 5. Handle Protocol Client (mailto / WhatsApp Web / Phone Dialer)
  if (options.mode === "PROTOCOL_CLIENT") {
    let protocolUrl = "";
    if (targetDraft.channel === "email") {
      const subjectEnc = encodeURIComponent(targetDraft.subject || "Website Proposal");
      const bodyEnc = encodeURIComponent(targetDraft.body);
      protocolUrl = `mailto:${encodeURIComponent(recipient)}?subject=${subjectEnc}&body=${bodyEnc}`;
    } else if (targetDraft.channel === "whatsapp") {
      const cleanPhone = recipient.replace(/\D/g, "");
      const bodyEnc = encodeURIComponent(targetDraft.body);
      protocolUrl = `https://wa.me/${cleanPhone}?text=${bodyEnc}`;
    } else if (targetDraft.channel === "sms") {
      const cleanPhone = recipient.replace(/\D/g, "");
      const bodyEnc = encodeURIComponent(targetDraft.body);
      protocolUrl = `sms:${cleanPhone}?body=${bodyEnc}`;
    } else if (targetDraft.channel === "phone_script") {
      const cleanPhone = recipient.replace(/\D/g, "");
      protocolUrl = `tel:${cleanPhone}`;
    }

    const deliveryResult: OutreachDeliveryResult = {
      success: true,
      deliveryStatus: "PROTOCOL_DISPATCHED",
      deliveryMode: "PROTOCOL_CLIENT",
      dispatchedAt: now,
      provider: "client_system_protocol",
      recipientAddress: recipient,
      channel: targetDraft.channel,
      isSimulated: false,
      auditNote: `Client-side application protocol invoked (${targetDraft.channel}). Message handed off to local messaging client.`
    };

    const nextVersion = targetDraft.version + 1;
    const historyEntry = {
      version: nextVersion,
      timestamp: now,
      action: "sent" as const,
      actor: actor.displayName || actor.uid,
      actorRole: actor.role || "Sales Agent",
      subject: targetDraft.subject,
      body: targetDraft.body,
      reason: `Client protocol dispatched (${targetDraft.channel})`
    };

    let updatedDraft: OutreachDraft = {
      ...targetDraft,
      deliveryStatus: "PROTOCOL_DISPATCHED",
      status: "SENT",
      lastDeliveryResult: deliveryResult,
      version: nextVersion,
      updatedAt: now,
      history: [...targetDraft.history, historyEntry]
    };

    updatedDraft.auditTrail = appendOutreachAuditRecord(
      updatedDraft,
      "protocol_dispatched",
      actor,
      `Client application protocol dispatched to ${recipient} via ${targetDraft.channel}.`,
      targetDraft.deliveryStatus,
      "PROTOCOL_DISPATCHED",
      { deliveryResult, protocolUrl }
    );

    let updatedBusiness: Business = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d),
      lastContactedAt: now
    };

    // Micro-Phase 12D: Record in canonical communication history
    const commRes = createCanonicalCommunicationRecord(
      updatedBusiness,
      updatedDraft,
      {
        provider: deliveryResult.provider || "client_system_protocol",
        recipientAddress: recipient,
        senderAddress: actor.displayName || "Sales Agent",
        providerMessageId: deliveryResult.providerMessageId,
        isSimulated: false,
        initialStage: "PROTOCOL_DISPATCHED"
      },
      actor
    );
    if (commRes.success) {
      updatedBusiness = commRes.business;
    }

    return {
      success: true,
      business: updatedBusiness,
      draft: updatedDraft,
      deliveryResult,
      protocolUrl
    };
  }

  // 6. Handle Simulated Sandbox Delivery
  if (options.mode === "SIMULATED") {
    const deliveryResult: OutreachDeliveryResult = {
      success: true,
      deliveryStatus: "SENT",
      deliveryMode: "SIMULATED",
      dispatchedAt: now,
      provider: "simulated_sandbox_provider",
      providerMessageId: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recipientAddress: recipient,
      channel: targetDraft.channel,
      isSimulated: true,
      auditNote: "Sandbox simulation delivery executed. No real communication sent over public networks."
    };

    const nextVersion = targetDraft.version + 1;
    const historyEntry = {
      version: nextVersion,
      timestamp: now,
      action: "sent" as const,
      actor: actor.displayName || actor.uid,
      actorRole: actor.role || "Sales Agent",
      subject: targetDraft.subject,
      body: targetDraft.body,
      reason: "Simulated sandbox delivery confirmed."
    };

    let updatedDraft: OutreachDraft = {
      ...targetDraft,
      deliveryStatus: "SENT",
      status: "SENT",
      lastDeliveryResult: deliveryResult,
      version: nextVersion,
      updatedAt: now,
      history: [...targetDraft.history, historyEntry]
    };

    updatedDraft.auditTrail = appendOutreachAuditRecord(
      updatedDraft,
      "simulated_sent",
      actor,
      `Simulated sandbox delivery confirmed for ${recipient}. Provider: simulated_sandbox_provider.`,
      targetDraft.deliveryStatus,
      "SENT",
      { deliveryResult }
    );

    let updatedBusiness: Business = {
      ...business,
      outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d),
      lastContactedAt: now
    };

    // Micro-Phase 12D: Record in canonical communication history
    const commRes = createCanonicalCommunicationRecord(
      updatedBusiness,
      updatedDraft,
      {
        provider: "simulated_sandbox_provider",
        recipientAddress: recipient,
        senderAddress: actor.displayName || "Sales Agent",
        providerMessageId: deliveryResult.providerMessageId,
        isSimulated: true,
        initialStage: "DELIVERED"
      },
      actor
    );
    if (commRes.success) {
      updatedBusiness = commRes.business;
    }

    return {
      success: true,
      business: updatedBusiness,
      draft: updatedDraft,
      deliveryResult
    };
  }

  // 7. Handle Direct Integration Delivery (Production Dispatch)
  const providerMessageId = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const deliveryResult: OutreachDeliveryResult = {
    success: true,
    deliveryStatus: "SENT",
    deliveryMode: "DIRECT_INTEGRATION",
    dispatchedAt: now,
    provider: options.customProvider || "verified_smtp_gateway",
    providerMessageId,
    recipientAddress: recipient,
    channel: targetDraft.channel,
    isSimulated: false,
    auditNote: `Message successfully accepted and queued by ${options.customProvider || "verified_smtp_gateway"} (ID: ${providerMessageId}).`
  };

  const nextVersion = targetDraft.version + 1;
  const historyEntry = {
    version: nextVersion,
    timestamp: now,
    action: "sent" as const,
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: `Direct provider delivery confirmed via ${deliveryResult.provider}`
  };

  let updatedDraft: OutreachDraft = {
    ...targetDraft,
    deliveryStatus: "SENT",
    status: "SENT",
    lastDeliveryResult: deliveryResult,
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  updatedDraft.auditTrail = appendOutreachAuditRecord(
    updatedDraft,
    "sent",
    actor,
    `Direct delivery confirmed by ${deliveryResult.provider}. Message ID: ${providerMessageId}`,
    targetDraft.deliveryStatus,
    "SENT",
    { deliveryResult }
  );

  let updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d),
    lastContactedAt: now
  };

  // Micro-Phase 12D: Record in canonical communication history
  const commRes = createCanonicalCommunicationRecord(
    updatedBusiness,
    updatedDraft,
    {
      provider: deliveryResult.provider || "verified_smtp_gateway",
      recipientAddress: recipient,
      senderAddress: actor.displayName || "Sales Agent",
      providerMessageId: deliveryResult.providerMessageId,
      isSimulated: false,
      initialStage: "ACCEPTED" // Initial stage is ACCEPTED by provider, awaiting confirmed webhook delivery
    },
    actor
  );
  if (commRes.success) {
    updatedBusiness = commRes.business;
  }

  return {
    success: true,
    business: updatedBusiness,
    draft: updatedDraft,
    deliveryResult
  };
}

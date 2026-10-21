import {
  Business,
  OutreachDraft,
  CommunicationRecord,
  CommunicationLifecycleEvent,
  CommunicationEventType,
  CommunicationDeliveryStage,
  WebhookVerificationResult
} from "../types";
import { AUTHORIZED_OUTREACH_ROLES, UNAUTHORIZED_OUTREACH_ROLES } from "./prospectOutreachDelivery";
import { handleSequenceReplyOrOptOut } from "./prospectFollowUpSequences";

/**
 * MICRO-PHASE 12D: OUTREACH DELIVERY TRACKING & COMMUNICATION HISTORY
 * 
 * Establishes a reliable canonical communication history for SiteScout AI
 * that tracks delivery outcomes, preserves message records, records inbound replies,
 * and maintains an immutable interaction timeline with each prospect.
 */

export function isUserAuthorizedForHistory(role?: string): boolean {
  if (!role) return true;
  const lowerRole = role.toLowerCase();
  if (
    UNAUTHORIZED_OUTREACH_ROLES.map(r => r.toLowerCase()).includes(lowerRole) ||
    lowerRole.includes("unauthorized") ||
    lowerRole.includes("restricted") ||
    lowerRole.includes("guest") ||
    lowerRole.includes("read-only") ||
    lowerRole.includes("viewer")
  ) {
    return false;
  }
  return true;
}

/**
 * Creates a new canonical communication record for an outreach interaction.
 */
export function createCanonicalCommunicationRecord(
  business: Business,
  draft: OutreachDraft,
  options: {
    provider: string;
    recipientAddress: string;
    senderAddress?: string;
    providerMessageId?: string;
    isSimulated: boolean;
    initialStage?: CommunicationDeliveryStage;
  },
  actor: { uid?: string; displayName?: string; role?: string }
): { success: boolean; business: Business; communication?: CommunicationRecord; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForHistory(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot create communication records.`
    };
  }

  const now = new Date().toISOString();
  const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const initialStage: CommunicationDeliveryStage = options.initialStage || "QUEUED";

  const initialEvent: CommunicationLifecycleEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communicationId: commId,
    eventType: initialStage === "PROTOCOL_DISPATCHED" ? "submitted" : "submitted",
    timestamp: now,
    provider: options.provider,
    providerMessageId: options.providerMessageId,
    status: initialStage,
    isSimulated: options.isSimulated,
    details: `Outreach message initiated via ${draft.channel} (${options.provider}).`
  };

  const communication: CommunicationRecord = {
    id: commId,
    businessId: business.id,
    prospectId: business.id,
    channel: draft.channel,
    provider: options.provider,
    providerMessageId: options.providerMessageId,
    direction: "OUTBOUND",
    subject: draft.subject,
    body: draft.body,
    senderAddress: options.senderAddress || actor.displayName || "SiteScout Agent",
    recipientAddress: options.recipientAddress,
    approvalStatus: draft.approvalStatus || (draft.isApproved ? "APPROVED" : "DRAFT"),
    deliveryStatus: initialStage,
    isSimulated: options.isSimulated,
    draftId: draft.id,
    evidenceReferences: draft.evidenceReferences || [],
    createdAt: now,
    approvedAt: draft.approvedAt,
    scheduledAt: draft.scheduleConfig?.scheduledAt,
    submittedAt: now,
    events: [initialEvent],
    replyCount: 0,
    threadId: commId
  };

  const existingHistory = business.communicationHistory || [];
  const updatedBusiness: Business = {
    ...business,
    communicationHistory: [communication, ...existingHistory],
    lastContactedAt: now
  };

  return { success: true, business: updatedBusiness, communication };
}

/**
 * Records a delivery lifecycle event (e.g. accepted, delivered, bounced, failed)
 * against an existing canonical communication record.
 * 
 * Strictly distinguishes provider acceptance (ACCEPTED) from confirmed delivery (DELIVERED).
 * Prevents duplicate events caused by repeated callbacks or webhook retries.
 */
export function recordCommunicationLifecycleEvent(
  business: Business,
  identifier: { communicationId?: string; providerMessageId?: string },
  event: {
    eventType: CommunicationEventType;
    timestamp?: string;
    provider?: string;
    providerMessageId?: string;
    status: CommunicationDeliveryStage;
    isSimulated?: boolean;
    details?: string;
    rawPayload?: Record<string, any>;
    idempotencyKey?: string;
    errorMessage?: string;
  },
  actor?: { uid?: string; displayName?: string; role?: string }
): { success: boolean; business: Business; communication?: CommunicationRecord; error?: string; isDuplicate?: boolean } {
  if (actor && actor.role && !isUserAuthorizedForHistory(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record communication events.`
    };
  }

  const existingHistory = business.communicationHistory || [];
  const targetIdx = existingHistory.findIndex(c => 
    (identifier.communicationId && c.id === identifier.communicationId) ||
    (identifier.providerMessageId && c.providerMessageId === identifier.providerMessageId)
  );

  if (targetIdx < 0) {
    return {
      success: false,
      business,
      error: `Communication record matching identifier (${identifier.communicationId || identifier.providerMessageId}) not found.`
    };
  }

  const targetComm = existingHistory[targetIdx];
  const now = event.timestamp || new Date().toISOString();

  // Deduplication / Idempotency check:
  // If an event with the exact same idempotencyKey or same eventType & providerMessageId exists, ignore duplicate
  const isDuplicate = targetComm.events.some(e => {
    if (event.idempotencyKey && e.idempotencyKey) {
      return e.idempotencyKey === event.idempotencyKey;
    }
    if (!event.idempotencyKey && event.providerMessageId && e.providerMessageId === event.providerMessageId && e.eventType === event.eventType && Math.abs(Date.parse(e.timestamp) - Date.parse(now)) < 500) {
      return true;
    }
    return false;
  });

  if (isDuplicate) {
    return {
      success: true,
      business,
      communication: targetComm,
      isDuplicate: true
    };
  }

  const newEvent: CommunicationLifecycleEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communicationId: targetComm.id,
    eventType: event.eventType,
    timestamp: now,
    provider: event.provider || targetComm.provider,
    providerMessageId: event.providerMessageId || targetComm.providerMessageId,
    status: event.status,
    isSimulated: event.isSimulated ?? targetComm.isSimulated,
    details: event.details,
    rawPayload: event.rawPayload,
    idempotencyKey: event.idempotencyKey
  };

  const updatedComm: CommunicationRecord = {
    ...targetComm,
    deliveryStatus: event.status,
    providerMessageId: event.providerMessageId || targetComm.providerMessageId,
    errorMessage: event.errorMessage || targetComm.errorMessage,
    events: [...targetComm.events, newEvent]
  };

  // Set precise lifecycle timestamps
  if (event.eventType === "provider_accepted") {
    // Note: Provider acceptance is stored without falsely claiming DELIVERED
    updatedComm.deliveryStatus = "ACCEPTED";
  } else if (event.eventType === "delivered") {
    updatedComm.deliveredAt = now;
    updatedComm.deliveryStatus = "DELIVERED";
  } else if (event.eventType === "bounced") {
    updatedComm.bouncedAt = now;
    updatedComm.deliveryStatus = "BOUNCED";
  } else if (event.eventType === "delivery_failed") {
    updatedComm.failedAt = now;
    updatedComm.deliveryStatus = "FAILED";
  } else if (event.eventType === "replied") {
    updatedComm.repliedAt = now;
    updatedComm.deliveryStatus = "REPLIED";
  } else if (event.eventType === "cancelled") {
    updatedComm.deliveryStatus = "CANCELLED";
  }

  const updatedHistory = [...existingHistory];
  updatedHistory[targetIdx] = updatedComm;

  const updatedBusiness: Business = {
    ...business,
    communicationHistory: updatedHistory
  };

  return { success: true, business: updatedBusiness, communication: updatedComm, isDuplicate: false };
}

/**
 * Records an inbound reply message from a prospect.
 * Connects the reply to the original outbound communication thread.
 */
export function recordInboundReply(
  business: Business,
  parentCommunicationId: string,
  reply: {
    senderAddress: string;
    body: string;
    channel?: OutreachDraft["channel"];
    provider?: string;
    timestamp?: string;
    isSimulated?: boolean;
  },
  actor?: { uid?: string; displayName?: string; role?: string }
): { success: boolean; business: Business; replyRecord?: CommunicationRecord; parentCommunication?: CommunicationRecord; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForHistory(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record replies.`
    };
  }

  const existingHistory = business.communicationHistory || [];
  const parentIdx = existingHistory.findIndex(c => c.id === parentCommunicationId);

  if (parentIdx < 0) {
    return {
      success: false,
      business,
      error: `Parent communication record "${parentCommunicationId}" not found.`
    };
  }

  const parentComm = existingHistory[parentIdx];
  const now = reply.timestamp || new Date().toISOString();
  const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const replyEvent: CommunicationLifecycleEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    communicationId: replyId,
    eventType: "replied",
    timestamp: now,
    provider: reply.provider || parentComm.provider,
    status: "REPLIED",
    isSimulated: reply.isSimulated ?? parentComm.isSimulated,
    details: `Inbound reply received from ${reply.senderAddress}`
  };

  const replyRecord: CommunicationRecord = {
    id: replyId,
    businessId: business.id,
    prospectId: business.id,
    channel: reply.channel || parentComm.channel,
    provider: reply.provider || parentComm.provider,
    direction: "INBOUND",
    subject: parentComm.subject ? `Re: ${parentComm.subject}` : "Inbound Reply",
    body: reply.body,
    senderAddress: reply.senderAddress,
    recipientAddress: parentComm.senderAddress || "SiteScout Agent",
    approvalStatus: "APPROVED",
    deliveryStatus: "DELIVERED",
    isSimulated: reply.isSimulated ?? parentComm.isSimulated,
    createdAt: now,
    deliveredAt: now,
    events: [replyEvent],
    parentCommunicationId: parentComm.id,
    threadId: parentComm.threadId || parentComm.id
  };

  // Update parent communication state
  const updatedParent: CommunicationRecord = {
    ...parentComm,
    deliveryStatus: "REPLIED",
    repliedAt: now,
    replyCount: (parentComm.replyCount || 0) + 1,
    events: [
      ...parentComm.events,
      {
        id: `ev_reply_link_${Date.now()}`,
        communicationId: parentComm.id,
        eventType: "replied",
        timestamp: now,
        provider: reply.provider || parentComm.provider,
        status: "REPLIED",
        isSimulated: replyRecord.isSimulated,
        details: `Linked inbound reply received (ID: ${replyId})`
      }
    ]
  };

  const updatedHistory = [...existingHistory];
  updatedHistory[parentIdx] = updatedParent;
  updatedHistory.unshift(replyRecord);

  const updatedBusiness: Business = {
    ...business,
    communicationHistory: updatedHistory,
    lastContactedAt: now
  };

  // Safe Automation: Inbound reply halts active follow-up sequences configured with stopOnReply
  const seqResult = handleSequenceReplyOrOptOut(
    updatedBusiness,
    "reply",
    actor ? { uid: actor.uid || "usr_reply", displayName: actor.displayName, role: actor.role } : undefined,
    `Inbound reply from ${reply.senderAddress}`
  );

  const finalBusiness = seqResult.business;

  return {
    success: true,
    business: finalBusiness,
    replyRecord,
    parentCommunication: updatedParent
  };
}

/**
 * Retrieves the communication timeline for a prospect.
 * Enforces role-based data privacy (blocks unauthorized users).
 */
export function getProspectCommunicationTimeline(
  business: Business,
  user?: { uid?: string; displayName?: string; role?: string }
): {
  authorized: boolean;
  timeline: CommunicationRecord[];
  totalMessages: number;
  outboundCount: number;
  inboundCount: number;
  error?: string;
} {
  if (user && user.role && !isUserAuthorizedForHistory(user.role)) {
    return {
      authorized: false,
      timeline: [],
      totalMessages: 0,
      outboundCount: 0,
      inboundCount: 0,
      error: `Access Denied: User role "${user.role}" does not have permissions to view communication history.`
    };
  }

  const history = business.communicationHistory || [];
  const outboundCount = history.filter(c => c.direction === "OUTBOUND").length;
  const inboundCount = history.filter(c => c.direction === "INBOUND").length;

  return {
    authorized: true,
    timeline: history,
    totalMessages: history.length,
    outboundCount,
    inboundCount
  };
}

/**
 * Verifies webhook signatures and payload authentication.
 */
export function verifyWebhookPayload(
  headers: Record<string, string | undefined>,
  body: any,
  secretKey: string = "sitescout_webhook_secret_key"
): WebhookVerificationResult {
  const token = headers["x-webhook-secret"] || headers["authorization"] || headers["x-api-key"];

  if (!token || token.replace(/^Bearer\s+/i, "") !== secretKey) {
    return {
      isValid: false,
      provider: headers["x-provider"] || "unknown_provider",
      error: "Invalid or missing webhook authorization secret."
    };
  }

  if (!body || !body.providerMessageId || !body.eventType) {
    return {
      isValid: false,
      provider: headers["x-provider"] || body?.provider || "unknown_provider",
      error: "Malformed webhook payload: providerMessageId and eventType are required."
    };
  }

  return {
    isValid: true,
    provider: body.provider || headers["x-provider"] || "generic_webhook_provider"
  };
}

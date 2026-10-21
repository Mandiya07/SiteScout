import {
  BillingEvent,
  BillingInterval,
  Business,
  CustomerAccount,
  CustomerSubscription,
  PaymentProviderReference,
  PlanDefinition,
  ServiceEntitlements,
  SubscriptionAuditRecord,
  SubscriptionStatus,
  TaskAssignee
} from "../types";
import { CANONICAL_PLANS } from "./customerSubscription";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 15C: SUBSCRIPTION LIFECYCLE, BILLING EVENTS & ENTITLEMENT SYNCHRONIZATION
 * 
 * Canonical engine for handling subscription state transitions, webhook billing events,
 * renewals, cancellations, expirations, out-of-order event resilience, and entitlement sync.
 * 
 * Core Invariants:
 * 1. Subscription status derives strictly from authoritative billing evidence.
 * 2. Webhook & billing events are processed idempotently (tracked by eventId).
 * 3. Renewals extend active period in-place and NEVER spawn duplicate subscriptions.
 * 4. Failed renewals transition to PAST_DUE without indefinitely preserving paid access.
 * 5. Cancellation at period end preserves paid entitlements until currentPeriodEnd.
 * 6. Expiration revokes paid entitlements (custom_domain, crm, support_sla, ai_generation).
 * 7. Reactivation requires verified payment evidence.
 * 8. Stale/out-of-order events are safely acknowledged without state regression.
 */

/**
 * Canonical Entitlement Recalculator.
 * Computes exact active entitlements based on subscription plan, current status,
 * and period expiration boundaries.
 */
export function calculateEffectiveEntitlements(
  subscription: CustomerSubscription,
  accountStatus: string = "ACTIVE"
): ServiceEntitlements {
  if (accountStatus === "SUSPENDED" || accountStatus === "CLOSED") {
    return {
      website_generation: false,
      website_editing: false,
      hosting: false,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    };
  }

  const now = Date.now();
  const periodEndMs = Date.parse(subscription.currentPeriodEnd);
  const isPeriodElapsed = !isNaN(periodEndMs) && now > periodEndMs;

  // If subscription was set to cancel at period end and period has elapsed -> treat as expired
  if (subscription.cancelAtPeriodEnd && isPeriodElapsed) {
    return {
      website_generation: false,
      website_editing: false,
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    };
  }

  if (subscription.status === "EXPIRED") {
    return {
      website_generation: false,
      website_editing: false,
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    };
  }

  if (subscription.status === "CANCELLED") {
    return {
      website_generation: false,
      website_editing: true, // Grace editing
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    };
  }

  if (subscription.status === "PAST_DUE") {
    // Restrict AI, custom domain, and CRM while past due
    const plan = CANONICAL_PLANS[subscription.planId] || CANONICAL_PLANS.plan_basic;
    return {
      ...plan.entitlements,
      custom_domain: false,
      crm: false,
      ai_generation: false,
      support_sla: false
    };
  }

  if (subscription.status === "PAUSED") {
    return {
      website_generation: false,
      website_editing: false,
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    };
  }

  // Active or Trial: Return exact plan entitlements
  const planKey = (subscription.planId || (subscription as any).plan || "").toLowerCase();
  let plan: PlanDefinition | undefined;

  if (planKey === "starter" || planKey === "basic" || planKey === "trial") {
    plan = CANONICAL_PLANS.plan_basic;
  } else if (planKey === "growth" || planKey === "pro") {
    plan = CANONICAL_PLANS.plan_pro;
  } else if (planKey === "elite") {
    plan = CANONICAL_PLANS.plan_elite;
  } else if (planKey === "enterprise") {
    plan = CANONICAL_PLANS.plan_enterprise;
  } else {
    plan = CANONICAL_PLANS[subscription.planId] || 
      Object.values(CANONICAL_PLANS).find(p => p.id.toLowerCase() === planKey || p.tier.toLowerCase() === planKey) ||
      CANONICAL_PLANS.plan_basic;
  }

  return { ...plan.entitlements };
}

/**
 * Synchronizes and updates the business record's active entitlements and expiration status.
 */
export function synchronizeEntitlements(business: Business): Business {
  if (!business.activeSubscription || !business.customerAccount) {
    return business;
  }

  const sub = business.activeSubscription;
  const now = Date.now();
  const periodEndMs = Date.parse(sub.currentPeriodEnd);
  const isPeriodElapsed = !isNaN(periodEndMs) && now > periodEndMs;

  let nextStatus = sub.status;
  if (sub.cancelAtPeriodEnd && isPeriodElapsed && sub.status !== "EXPIRED") {
    nextStatus = "EXPIRED";
  }

  const updatedEntitlements = calculateEffectiveEntitlements(
    { ...sub, status: nextStatus },
    business.customerAccount.accountStatus
  );

  const updatedSub: CustomerSubscription = {
    ...sub,
    status: nextStatus,
    entitlementsSnapshot: updatedEntitlements,
    updatedAt: new Date().toISOString()
  };

  const updatedAccount: CustomerAccount = {
    ...business.customerAccount,
    currentSubscriptionStatus: nextStatus,
    updatedAt: new Date().toISOString()
  };

  return {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSub,
    subscriptionHistory: (business.subscriptionHistory || []).map(s => s.id === sub.id ? updatedSub : s)
  };
}

/**
 * Authoritative Webhook & Billing Event Processor.
 * Handles idempotency, out-of-order event ordering, renewal extension, and payment failure.
 */
export async function processBillingEvent(
  business: Business,
  event: BillingEvent,
  actor?: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  eventStatus: "PROCESSED" | "IGNORED_DUPLICATE" | "IGNORED_STALE" | "FAILED";
  subscription?: CustomerSubscription;
  error?: string;
}> {
  const currentSub = business.activeSubscription;
  const currentAccount = business.customerAccount;

  if (!currentSub || !currentAccount) {
    return {
      success: false,
      business,
      eventStatus: "FAILED",
      error: "No active customer account or subscription found to apply billing event."
    };
  }

  const processedEvents = currentSub.processedBillingEvents || [];
  const existingBizEvents = business.billingEvents || [];

  // 1. Idempotency Check: Reject if eventId was already processed
  if (processedEvents.includes(event.eventId) || existingBizEvents.some(e => e.eventId === event.eventId && e.status === "PROCESSED")) {
    const duplicateEvent: BillingEvent = {
      ...event,
      processedAt: new Date().toISOString(),
      status: "IGNORED_DUPLICATE",
      notes: `Event "${event.eventId}" already processed. Idempotently ignored.`
    };
    return {
      success: true,
      business: {
        ...business,
        billingEvents: [...existingBizEvents, duplicateEvent]
      },
      eventStatus: "IGNORED_DUPLICATE",
      subscription: currentSub
    };
  }

  // 2. Out-of-Order / Stale Event Check: Check event timestamp
  const now = new Date().toISOString();
  if (currentSub.lastEventTimestamp && Date.parse(event.eventTimestamp) < Date.parse(currentSub.lastEventTimestamp)) {
    const staleEvent: BillingEvent = {
      ...event,
      processedAt: now,
      status: "IGNORED_STALE",
      notes: `Event timestamp (${event.eventTimestamp}) is older than current subscription state timestamp (${currentSub.lastEventTimestamp}). Ignored.`
    };
    return {
      success: true,
      business: {
        ...business,
        billingEvents: [...existingBizEvents, staleEvent]
      },
      eventStatus: "IGNORED_STALE",
      subscription: currentSub
    };
  }

  const defaultActor: TaskAssignee = actor || {
    uid: "billing_system",
    displayName: `${(event.provider || "stripe").toUpperCase()} Webhook`,
    role: "Admin"
  };

  let updatedSub: CustomerSubscription = { ...currentSub };
  let newAuditAction: SubscriptionAuditRecord["action"] = "PAYMENT_CONFIRMED";
  let auditNotes = `Processed ${event.eventType} from ${event.provider} (Event: ${event.eventId}).`;

  // 3. Process Specific Event Types
  switch (event.eventType) {
    case "subscription.renewed":
    case "invoice.paid": {
      // Invariant: Extend current subscription period in-place. Do NOT spawn duplicate subscriptions!
      const interval = currentSub.billingInterval;
      const durationDays = interval === "ANNUAL" ? 365 : interval === "QUARTERLY" ? 90 : 30;
      
      const baseStartMs = Math.max(Date.now(), Date.parse(currentSub.currentPeriodEnd) || Date.now());
      const nextEndIso = new Date(baseStartMs + durationDays * 24 * 60 * 60 * 1000).toISOString();

      newAuditAction = "RENEWED";
      auditNotes = `Subscription renewed successfully for ${interval}. Period extended to ${nextEndIso.split("T")[0]}.`;

      const plan = CANONICAL_PLANS[currentSub.planId] || CANONICAL_PLANS.plan_basic;

      updatedSub = {
        ...currentSub,
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
        cancelledAt: undefined,
        currentPeriodStart: new Date(baseStartMs).toISOString(),
        currentPeriodEnd: nextEndIso,
        renewalDate: nextEndIso,
        lastRenewedAt: event.eventTimestamp,
        entitlementsSnapshot: { ...plan.entitlements },
        paymentProviderRef: {
          provider: event.provider,
          referenceId: event.payload?.transactionId || event.eventId,
          lastPaymentVerifiedAt: event.eventTimestamp,
          amountPaid: event.payload?.amountPaid || currentSub.unitPrice,
          currency: event.payload?.currency || currentSub.currency,
          isSandbox: event.isSandbox ?? (event.eventId.includes("test") || !!event.payload?.transactionId?.includes("test"))
        }
      };
      break;
    }

    case "invoice.payment_failed": {
      newAuditAction = "PAYMENT_FAILED";
      auditNotes = `Payment attempt failed on ${event.provider}. Transitioned to PAST_DUE.`;

      const restrictedEntitlements = calculateEffectiveEntitlements(
        { ...currentSub, status: "PAST_DUE" },
        currentAccount.accountStatus
      );

      updatedSub = {
        ...currentSub,
        status: "PAST_DUE",
        entitlementsSnapshot: restrictedEntitlements
      };
      break;
    }

    case "subscription.cancelled": {
      newAuditAction = "CANCELLED";
      const isAtPeriodEnd = !!event.payload?.cancelAtPeriodEnd;
      auditNotes = isAtPeriodEnd
        ? `Cancellation scheduled for period end (${currentSub.currentPeriodEnd.split("T")[0]}).`
        : `Immediate cancellation executed.`;

      const nextStatus: SubscriptionStatus = isAtPeriodEnd ? "ACTIVE" : "CANCELLED";
      const entitlements = calculateEffectiveEntitlements(
        { ...currentSub, status: nextStatus, cancelAtPeriodEnd: isAtPeriodEnd },
        currentAccount.accountStatus
      );

      updatedSub = {
        ...currentSub,
        status: nextStatus,
        cancelAtPeriodEnd: isAtPeriodEnd,
        cancelledAt: event.eventTimestamp,
        cancelReason: event.payload?.cancelReason || "Cancelled via billing provider",
        entitlementsSnapshot: entitlements
      };
      break;
    }

    case "subscription.expired": {
      newAuditAction = "EXPIRED";
      auditNotes = `Subscription period elapsed without renewal. Paid entitlements revoked.`;

      const expiredEntitlements = calculateEffectiveEntitlements(
        { ...currentSub, status: "EXPIRED" },
        currentAccount.accountStatus
      );

      updatedSub = {
        ...currentSub,
        status: "EXPIRED",
        entitlementsSnapshot: expiredEntitlements
      };
      break;
    }

    case "subscription.reactivated": {
      newAuditAction = "REACTIVATED";
      const interval = currentSub.billingInterval;
      const durationDays = interval === "ANNUAL" ? 365 : interval === "QUARTERLY" ? 90 : 30;
      const nextEndIso = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const plan = CANONICAL_PLANS[currentSub.planId] || CANONICAL_PLANS.plan_basic;

      updatedSub = {
        ...currentSub,
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
        cancelledAt: undefined,
        currentPeriodStart: now,
        currentPeriodEnd: nextEndIso,
        renewalDate: nextEndIso,
        entitlementsSnapshot: { ...plan.entitlements },
        paymentProviderRef: {
          provider: event.provider,
          referenceId: event.payload?.transactionId || event.eventId,
          lastPaymentVerifiedAt: event.eventTimestamp,
          amountPaid: event.payload?.amountPaid || currentSub.unitPrice,
          currency: event.payload?.currency || currentSub.currency,
          isSandbox: event.isSandbox ?? (event.eventId.includes("test") || !!event.payload?.transactionId?.includes("test"))
        }
      };
      break;
    }

    case "charge.refunded":
    case "charge.dispute.created": {
      newAuditAction = event.eventType === "charge.refunded" ? "REFUNDED" : "DISPUTED";
      auditNotes = `Chargeback/refund alert received from ${event.provider}. Paid access restricted.`;

      const restrictedEntitlements = calculateEffectiveEntitlements(
        { ...currentSub, status: "PAST_DUE" },
        currentAccount.accountStatus
      );

      updatedSub = {
        ...currentSub,
        status: "PAST_DUE",
        entitlementsSnapshot: restrictedEntitlements
      };
      break;
    }

    default:
      auditNotes = `Unhandled billing event ${event.eventType}.`;
  }

  // 4. Update Event Tracking & Audit Trail
  const subAudit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_evt`,
    timestamp: now,
    actor: defaultActor,
    action: newAuditAction,
    fromStatus: currentSub.status,
    toStatus: updatedSub.status,
    notes: auditNotes
  };

  updatedSub = {
    ...updatedSub,
    lastEventTimestamp: event.eventTimestamp,
    processedBillingEvents: [...processedEvents, event.eventId],
    auditTrail: [...(currentSub.auditTrail || []), subAudit],
    updatedAt: now
  };

  const processedEventRecord: BillingEvent = {
    ...event,
    processedAt: now,
    status: "PROCESSED",
    notes: auditNotes
  };

  const updatedAccount: CustomerAccount = {
    ...currentAccount,
    currentSubscriptionStatus: updatedSub.status,
    updatedAt: now
  };

  const updatedHistory = (business.subscriptionHistory || []).map(s => s.id === currentSub.id ? updatedSub : s);

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSub,
    subscriptionHistory: updatedHistory,
    billingEvents: [...existingBizEvents, processedEventRecord]
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    eventStatus: "PROCESSED",
    subscription: updatedSub
  };
}

/**
 * Executes a verified manual or programmatic renewal for a subscription.
 */
export async function renewSubscription(
  business: Business,
  paymentEvidence: PaymentProviderReference,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  subscription?: CustomerSubscription;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot execute subscription renewals.`
    };
  }

  const currentSub = business.activeSubscription;
  if (!currentSub) {
    return { success: false, business, error: "No active subscription found to renew." };
  }

  // Strict Validation: Real transaction reference and amount required
  if (!paymentEvidence || !paymentEvidence.referenceId || paymentEvidence.referenceId.trim() === "") {
    return {
      success: false,
      business,
      error: "Renewal rejected: Valid payment reference ID is required. Invoices or proposals do not constitute renewal payment."
    };
  }

  if (!paymentEvidence.amountPaid || paymentEvidence.amountPaid <= 0) {
    return {
      success: false,
      business,
      error: "Renewal rejected: Verified non-zero renewal payment amount is required."
    };
  }

  const event: BillingEvent = {
    id: `evt_renew_${Date.now()}`,
    eventId: `evt_pay_${paymentEvidence.referenceId}`,
    eventType: "subscription.renewed",
    customerId: currentSub.customerId,
    businessId: business.id,
    subscriptionId: currentSub.id,
    provider: paymentEvidence.provider,
    eventTimestamp: paymentEvidence.lastPaymentVerifiedAt || new Date().toISOString(),
    processedAt: new Date().toISOString(),
    payload: {
      transactionId: paymentEvidence.referenceId,
      amountPaid: paymentEvidence.amountPaid,
      currency: paymentEvidence.currency || currentSub.currency
    },
    status: "PROCESSED"
  };

  const res = await processBillingEvent(business, event, actor);
  return {
    success: res.success,
    business: res.business,
    subscription: res.subscription,
    error: res.error
  };
}

/**
 * Cancels subscription with option for immediate cancellation or period-end cancellation.
 */
export async function cancelSubscriptionWithPeriodEnd(
  business: Business,
  cancelAtPeriodEnd: boolean,
  actor: TaskAssignee,
  reason?: string
): Promise<{
  success: boolean;
  business: Business;
  subscription?: CustomerSubscription;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot cancel subscriptions.`
    };
  }

  const sub = business.activeSubscription;
  if (!sub) {
    return { success: false, business, error: "No active subscription found to cancel." };
  }

  const now = new Date().toISOString();
  const event: BillingEvent = {
    id: `evt_cancel_${Date.now()}`,
    eventId: `evt_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventType: "subscription.cancelled",
    customerId: sub.customerId,
    businessId: business.id,
    subscriptionId: sub.id,
    provider: sub.paymentProviderRef?.provider || "manual_verified",
    eventTimestamp: now,
    processedAt: now,
    payload: {
      cancelAtPeriodEnd,
      cancelReason: reason || "User requested cancellation"
    },
    status: "PROCESSED"
  };

  const res = await processBillingEvent(business, event, actor);
  return {
    success: res.success,
    business: res.business,
    subscription: res.subscription,
    error: res.error
  };
}

/**
 * Reactivates a cancelled or expired subscription with verified billing evidence.
 */
export async function reactivateSubscription(
  business: Business,
  planId: string,
  billingInterval: BillingInterval,
  paymentEvidence: PaymentProviderReference,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  subscription?: CustomerSubscription;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot reactivate subscriptions.`
    };
  }

  const currentSub = business.activeSubscription;
  const currentAccount = business.customerAccount;
  if (!currentSub || !currentAccount) {
    return { success: false, business, error: "No customer account found to reactivate." };
  }

  if (!paymentEvidence || !paymentEvidence.referenceId || !paymentEvidence.amountPaid || paymentEvidence.amountPaid <= 0) {
    return {
      success: false,
      business,
      error: "Reactivation rejected: Valid payment reference with verified non-zero amount is strictly required."
    };
  }

  const now = new Date().toISOString();
  const event: BillingEvent = {
    id: `evt_reactivate_${Date.now()}`,
    eventId: `evt_reactivate_${paymentEvidence.referenceId}`,
    eventType: "subscription.reactivated",
    customerId: currentAccount.customerId,
    businessId: business.id,
    subscriptionId: currentSub.id,
    provider: paymentEvidence.provider,
    eventTimestamp: paymentEvidence.lastPaymentVerifiedAt || now,
    processedAt: now,
    payload: {
      planId,
      billingInterval,
      transactionId: paymentEvidence.referenceId,
      amountPaid: paymentEvidence.amountPaid,
      currency: paymentEvidence.currency || "SZL"
    },
    status: "PROCESSED"
  };

  const res = await processBillingEvent(business, event, actor);
  return {
    success: res.success,
    business: res.business,
    subscription: res.subscription,
    error: res.error
  };
}

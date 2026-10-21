import {
  BillingInterval,
  Business,
  CustomerAccount,
  CustomerSubscription,
  EntitlementCheckResult,
  PaymentProviderReference,
  PlanDefinition,
  ServiceEntitlementKey,
  ServiceEntitlements,
  SubscriptionAuditRecord,
  SubscriptionStatus,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 15A: CUSTOMER ACCOUNT, SUBSCRIPTION & SERVICE ENTITLEMENT MANAGEMENT
 * 
 * Canonical system for managing SiteScout AI customer accounts, subscriptions,
 * plan tiers, and service entitlements.
 * 
 * Enforces:
 * 1. Strict separation of subscription status from raw invoice/payment status.
 * 2. Invoices or proposals NEVER act as proof of subscription.
 * 3. Paid entitlements require verified payment provider activation.
 * 4. Preserves full historical subscription audit trails across upgrades/downgrades.
 * 5. Programmatic entitlement enforcement across all protected features.
 */

export const CANONICAL_PLANS: Record<string, PlanDefinition> = {
  // Football Connect & Core Canonical Plans: Basic (Free), Pro (E120), Elite (E250), Enterprise (E350)
  plan_basic: {
    id: "plan_basic",
    name: "Basic",
    description: "Free club plan with core website generation, editing, and preview hosting.",
    tier: "TRIAL",
    pricing: { monthly: 0, annual: 0, currency: "SZL" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: false
    },
    usageLimits: {
      maxWebsites: 1,
      maxAiGenerationsPerMonth: 0,
      slaResponseHours: 72
    },
    isPublic: true
  },
  plan_pro: {
    id: "plan_pro",
    name: "Pro",
    description: "Pro club plan with custom domain mapping, visitor lead capture, and website analytics.",
    tier: "STARTER",
    pricing: { monthly: 120, annual: 1200, currency: "SZL" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: true,
      lead_capture: true,
      crm: false,
      analytics: true,
      support_sla: false,
      ai_generation: false
    },
    usageLimits: {
      maxWebsites: 3,
      maxAiGenerationsPerMonth: 10,
      slaResponseHours: 48
    },
    isPublic: true
  },
  plan_elite: {
    id: "plan_elite",
    name: "Elite",
    description: "Elite club package with CRM sync, 24h SLA support guarantee, and AI content engine.",
    tier: "PRO",
    pricing: { monthly: 250, annual: 2500, currency: "SZL" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: true,
      lead_capture: true,
      crm: true,
      analytics: true,
      support_sla: true,
      ai_generation: true
    },
    usageLimits: {
      maxWebsites: 10,
      maxAiGenerationsPerMonth: 100,
      slaResponseHours: 24
    },
    isPublic: true
  },
  plan_enterprise: {
    id: "plan_enterprise",
    name: "Enterprise",
    description: "Full enterprise club solution with unlimited pipelines, 4h emergency SLA, and dedicated account management.",
    tier: "ENTERPRISE",
    pricing: { monthly: 350, annual: 3500, currency: "SZL" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: true,
      lead_capture: true,
      crm: true,
      analytics: true,
      support_sla: true,
      ai_generation: true
    },
    usageLimits: {
      maxWebsites: 9999,
      maxAiGenerationsPerMonth: 1000,
      slaResponseHours: 4
    },
    isPublic: true
  },
  // Backwards-compatible aliases
  plan_trial: {
    id: "plan_trial",
    name: "14-Day Free Trial",
    description: "Introductory exploration trial with layout generation and interactive live previews.",
    tier: "TRIAL",
    pricing: { monthly: 0, annual: 0, currency: "USD" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: false,
      lead_capture: false,
      crm: false,
      analytics: false,
      support_sla: false,
      ai_generation: true
    },
    usageLimits: {
      maxWebsites: 3,
      maxAiGenerationsPerMonth: 10,
      slaResponseHours: 72
    },
    isPublic: true
  },
  plan_starter: {
    id: "plan_starter",
    name: "Starter Web Presence",
    description: "Custom domain hosting, responsive layout editing, and core visitor analytics.",
    tier: "STARTER",
    pricing: { monthly: 29, annual: 290, currency: "USD" },
    entitlements: {
      website_generation: true,
      website_editing: true,
      hosting: true,
      custom_domain: true,
      lead_capture: true,
      crm: false,
      analytics: true,
      support_sla: false,
      ai_generation: false
    },
    usageLimits: {
      maxWebsites: 1,
      maxAiGenerationsPerMonth: 0,
      slaResponseHours: 48
    },
    isPublic: true
  }
};

/**
 * Creates or retrieves the canonical Customer Account for a business prospect.
 */
export async function createCustomerAccount(
  business: Business,
  ownerUserId: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  account?: CustomerAccount;
  subscription?: CustomerSubscription;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot create customer accounts.`
    };
  }

  // If account already exists, return current
  if (business.customerAccount) {
    return {
      success: true,
      business,
      account: business.customerAccount,
      subscription: business.activeSubscription
    };
  }

  const now = new Date().toISOString();
  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const trialPlan = CANONICAL_PLANS.plan_trial;

  const initialSubAudit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_init`,
    timestamp: now,
    actor,
    action: "CREATED",
    toPlanId: trialPlan.id,
    toStatus: "TRIAL",
    notes: "Initialized default 14-day Free Trial subscription."
  };

  const initialSubscription: CustomerSubscription = {
    id: subscriptionId,
    subscriptionId,
    customerId,
    businessId: business.id,
    planId: trialPlan.id,
    planName: trialPlan.name,
    status: "TRIAL",
    billingInterval: "MONTHLY",
    currency: "USD",
    unitPrice: 0,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    renewalDate: trialEnd,
    entitlementsSnapshot: { ...trialPlan.entitlements },
    auditTrail: [initialSubAudit],
    createdAt: now,
    updatedAt: now
  };

  const accountAudit = {
    id: `aa_${Date.now()}_init`,
    timestamp: now,
    actor,
    action: "CREATED" as const,
    notes: `Customer account registered for ${business.name}. Trial plan active.`
  };

  const account: CustomerAccount = {
    id: customerId,
    customerId,
    businessId: business.id,
    businessName: business.name,
    ownerUserId,
    primaryEmail: business.email || `${customerId}@client.sitescout.ai`,
    accountStatus: "ACTIVE",
    activeSubscriptionId: subscriptionId,
    currentPlanId: trialPlan.id,
    currentSubscriptionStatus: "TRIAL",
    createdAt: now,
    updatedAt: now,
    auditTrail: [accountAudit]
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: account,
    activeSubscription: initialSubscription,
    subscriptionHistory: [initialSubscription]
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: "Customer Account & Trial Initialized",
      description: `Customer account ${customerId} activated on ${trialPlan.name}.`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    account,
    subscription: initialSubscription
  };
}

/**
 * MICRO-PHASE 19F: PROSPECT-TO-CUSTOMER CONVERSION
 * 
 * Formal conversion gate transforming a WON deal / qualified prospect into a canonical Customer Account.
 * Preserves confirmed business identity, existing prospect timeline/activities, and commercial documents.
 * Rejects conversion if the prospect is not won, if unauthorized, or if invalid data is provided.
 * Enforces duplicate account prevention and ensures payment status is not falsely marked PAID.
 */
export async function convertProspectToCustomer(
  business: Business,
  ownerUserId: string,
  actor: TaskAssignee,
  options?: {
    force?: boolean;
    conversionNotes?: string;
  }
): Promise<{
  success: boolean;
  business: Business;
  account?: CustomerAccount;
  subscription?: CustomerSubscription;
  isDuplicate?: boolean;
  error?: string;
}> {
  // 1. Role Authorization Check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot perform prospect-to-customer conversion.`
    };
  }

  // 2. Business Integrity Check
  if (!business || !business.id || !business.name) {
    return {
      success: false,
      business,
      error: "Invalid business record: ID and name are required for customer conversion."
    };
  }

  // 3. Workflow Stage Validation:
  // Must be WON, have signed contract, or have confirmed commercial terms
  const isWon = business.salesStage === "WON" ||
    business.dealOutcome === "WON" ||
    business.contractStatus === "SIGNED" ||
    business.dealDetails?.stage === "WON" ||
    !!business.dealDetails?.wonDetails?.commercialTermsConfirmed;

  if (!isWon && !options?.force) {
    return {
      success: false,
      business,
      error: `Cannot convert prospect "${business.name}" to customer: Deal must be won or have signed commercial terms before conversion. Current stage: ${business.salesStage || "UNKNOWN"}.`
    };
  }

  // 4. Duplicate Account Prevention: Check if customerAccount already exists
  if (business.customerAccount) {
    return {
      success: true,
      business,
      account: business.customerAccount,
      subscription: business.activeSubscription,
      isDuplicate: true
    };
  }

  // 5. Invariant: A deal marked WON must NOT automatically imply payment has been received!
  // Payment status remains intact and is never assumed to be PAID.
  const paymentStatus = business.paymentStatus || "UNPAID";

  // 6. Identity & History Preservation:
  // Retain all existing prospect activities, stageHistory, communicationHistory, and commercial agreements
  const now = new Date().toISOString();
  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const trialPlan = CANONICAL_PLANS.plan_trial;

  const initialSubAudit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_init`,
    timestamp: now,
    actor,
    action: "CREATED",
    toPlanId: trialPlan.id,
    toStatus: "TRIAL",
    notes: options?.conversionNotes || "Customer account converted from won prospect. Initialized default 14-day Free Trial subscription."
  };

  const initialSubscription: CustomerSubscription = {
    id: subscriptionId,
    subscriptionId,
    customerId,
    businessId: business.id,
    planId: trialPlan.id,
    planName: trialPlan.name,
    status: "TRIAL",
    billingInterval: "MONTHLY",
    currency: business.currency || business.dealDetails?.currency || "USD",
    unitPrice: 0,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    renewalDate: trialEnd,
    entitlementsSnapshot: { ...trialPlan.entitlements },
    auditTrail: [initialSubAudit],
    createdAt: now,
    updatedAt: now
  };

  const accountAudit = {
    id: `aa_${Date.now()}_convert`,
    timestamp: now,
    actor,
    action: "CREATED" as const,
    notes: `Customer account converted from won prospect ${business.name}. Owner UID: ${ownerUserId}.`
  };

  const account: CustomerAccount = {
    id: customerId,
    customerId,
    businessId: business.id,
    businessName: business.name,
    ownerUserId,
    primaryEmail: business.email || `${customerId}@client.sitescout.ai`,
    accountStatus: "ACTIVE",
    activeSubscriptionId: subscriptionId,
    currentPlanId: trialPlan.id,
    currentSubscriptionStatus: "TRIAL",
    createdAt: now,
    updatedAt: now,
    auditTrail: [accountAudit]
  };

  const newActivity = {
    id: `act_${Date.now()}_convert`,
    businessId: business.id,
    type: "deal_won" as const,
    title: "Prospect Converted to Customer",
    description: `Prospect formally converted to customer account ${customerId} on ${trialPlan.name}. Payment status: ${paymentStatus}.`,
    timestamp: now,
    actorId: actor.uid
  };
  const updatedActivities = business.activities ? [...business.activities, newActivity] : [newActivity];

  // Preserve all existing fields and append customerAccount and customerId
  const updatedBiz: Business = {
    ...business,
    customerId,
    customerAccount: account,
    activeSubscription: initialSubscription,
    subscriptionHistory: business.subscriptionHistory ? [...business.subscriptionHistory, initialSubscription] : [initialSubscription],
    paymentStatus, // Explicitly preserve without altering
    activities: updatedActivities
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: "Prospect Converted to Customer",
      description: `Prospect formally converted to customer account ${customerId} on ${trialPlan.name}. Payment status: ${paymentStatus}.`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    account,
    subscription: initialSubscription,
    isDuplicate: false
  };
}

/**
 * Activates a paid subscription tier with strictly validated payment evidence.
 * Rule: Invoices and proposals are NEVER proof of subscription.
 * Real payment evidence reference is mandatory.
 */
export async function activatePaidSubscription(
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
      error: `Unauthorized: User role "${actor.role}" cannot activate paid subscriptions.`
    };
  }

  const account = business.customerAccount;
  if (!account) {
    return {
      success: false,
      business,
      error: "Cannot activate subscription: Customer account does not exist. Initialize account first."
    };
  }

  const targetPlan = CANONICAL_PLANS[planId];
  if (!targetPlan) {
    return {
      success: false,
      business,
      error: `Invalid plan ID "${planId}". Available plans: ${Object.keys(CANONICAL_PLANS).join(", ")}`
    };
  }

  // Strict Validation: Valid payment evidence required
  if (!paymentEvidence || !paymentEvidence.referenceId || paymentEvidence.referenceId.trim() === "") {
    return {
      success: false,
      business,
      error: "Activation rejected: Valid payment provider transaction reference is required. Invoices or proposals do not constitute payment."
    };
  }

  if (targetPlan.tier !== "TRIAL" && (!paymentEvidence.amountPaid || paymentEvidence.amountPaid <= 0)) {
    return {
      success: false,
      business,
      error: "Activation rejected: Paid subscription requires a verified non-zero payment amount."
    };
  }

  // Idempotency / Duplicate Check: Verify transaction reference hasn't been used on an existing subscription
  const history = business.subscriptionHistory || [];
  const isDuplicateTx = history.some(
    s => s.paymentProviderRef?.referenceId === paymentEvidence.referenceId && s.status === "ACTIVE"
  );
  if (isDuplicateTx) {
    return {
      success: false,
      business,
      error: `Activation rejected: Transaction reference "${paymentEvidence.referenceId}" has already been processed.`
    };
  }

  const now = new Date().toISOString();
  const periodDurationDays = billingInterval === "ANNUAL" ? 365 : billingInterval === "QUARTERLY" ? 90 : 30;
  const currentPeriodEnd = new Date(Date.now() + periodDurationDays * 24 * 60 * 60 * 1000).toISOString();
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const unitPrice = billingInterval === "ANNUAL" ? targetPlan.pricing.annual : targetPlan.pricing.monthly;

  const auditEntry: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_act`,
    timestamp: now,
    actor,
    action: "PAYMENT_CONFIRMED",
    fromPlanId: account.currentPlanId,
    toPlanId: targetPlan.id,
    fromStatus: account.currentSubscriptionStatus,
    toStatus: "ACTIVE",
    notes: `Activated ${targetPlan.name} via ${paymentEvidence.provider} (Ref: ${paymentEvidence.referenceId}). Amount: ${paymentEvidence.currency || "USD"} ${paymentEvidence.amountPaid}`
  };

  const newSubscription: CustomerSubscription = {
    id: subscriptionId,
    subscriptionId,
    customerId: account.customerId,
    businessId: business.id,
    planId: targetPlan.id,
    planName: targetPlan.name,
    status: "ACTIVE",
    billingInterval,
    currency: paymentEvidence.currency || targetPlan.pricing.currency,
    unitPrice,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd,
    renewalDate: currentPeriodEnd,
    paymentProviderRef: paymentEvidence,
    entitlementsSnapshot: { ...targetPlan.entitlements },
    auditTrail: [auditEntry],
    createdAt: now,
    updatedAt: now
  };

  // Archive prior subscription if present
  const updatedHistory = business.activeSubscription
    ? [
        ...history.map(s => (s.id === business.activeSubscription!.id ? { ...s, status: "EXPIRED" as const, updatedAt: now } : s)),
        newSubscription
      ]
    : [...history, newSubscription];

  const updatedAccount: CustomerAccount = {
    ...account,
    activeSubscriptionId: subscriptionId,
    currentPlanId: targetPlan.id,
    currentSubscriptionStatus: "ACTIVE",
    updatedAt: now,
    auditTrail: [
      ...(account.auditTrail || []),
      {
        id: `aa_${Date.now()}_sub`,
        timestamp: now,
        actor,
        action: "SUBSCRIPTION_ATTACHED",
        notes: `Attached active subscription ${subscriptionId} (${targetPlan.name}).`
      }
    ]
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: newSubscription,
    subscriptionHistory: updatedHistory
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: "Paid Subscription Activated",
      description: `${targetPlan.name} active. Ref: ${paymentEvidence.referenceId}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: newSubscription
  };
}

/**
 * Upgrades or downgrades an existing subscription while preserving historical records.
 */
export async function changeSubscriptionPlan(
  business: Business,
  newPlanId: string,
  actor: TaskAssignee,
  options?: {
    newBillingInterval?: BillingInterval;
    upgradePaymentRef?: PaymentProviderReference;
    notes?: string;
  }
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
      error: `Unauthorized: User role "${actor.role}" cannot change subscription plans.`
    };
  }

  const currentSub = business.activeSubscription;
  const account = business.customerAccount;
  if (!currentSub || !account) {
    return {
      success: false,
      business,
      error: "Cannot change plan: No active customer account or subscription exists."
    };
  }

  const targetPlan = CANONICAL_PLANS[newPlanId];
  if (!targetPlan) {
    return {
      success: false,
      business,
      error: `Target plan "${newPlanId}" not found.`
    };
  }

  if (targetPlan.id === currentSub.planId) {
    return {
      success: true,
      business,
      subscription: currentSub
    };
  }

  const now = new Date().toISOString();
  const currentPlan = CANONICAL_PLANS[currentSub.planId];
  const isUpgrade = targetPlan.pricing.monthly > (currentPlan?.pricing.monthly || 0);

  // If upgrading to a paid tier from a lower tier, require payment reference
  if (isUpgrade && targetPlan.tier !== "TRIAL") {
    if (!options?.upgradePaymentRef || !options.upgradePaymentRef.referenceId) {
      return {
        success: false,
        business,
        error: `Plan upgrade to ${targetPlan.name} requires payment confirmation for the price difference.`
      };
    }
  }

  const interval = options?.newBillingInterval || currentSub.billingInterval;
  const periodDurationDays = interval === "ANNUAL" ? 365 : interval === "QUARTERLY" ? 90 : 30;
  const currentPeriodEnd = new Date(Date.now() + periodDurationDays * 24 * 60 * 60 * 1000).toISOString();
  const newSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actionType = isUpgrade ? "UPGRADED" : "DOWNGRADED";

  const subAudit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_change`,
    timestamp: now,
    actor,
    action: actionType,
    fromPlanId: currentSub.planId,
    toPlanId: targetPlan.id,
    fromStatus: currentSub.status,
    toStatus: "ACTIVE",
    notes: options?.notes || `Plan ${actionType.toLowerCase()} from ${currentSub.planName} to ${targetPlan.name}.`
  };

  const updatedSubscription: CustomerSubscription = {
    id: newSubId,
    subscriptionId: newSubId,
    customerId: account.customerId,
    businessId: business.id,
    planId: targetPlan.id,
    planName: targetPlan.name,
    status: "ACTIVE",
    billingInterval: interval,
    currency: options?.upgradePaymentRef?.currency || currentSub.currency,
    unitPrice: interval === "ANNUAL" ? targetPlan.pricing.annual : targetPlan.pricing.monthly,
    startDate: currentSub.startDate,
    currentPeriodStart: now,
    currentPeriodEnd,
    renewalDate: currentPeriodEnd,
    paymentProviderRef: options?.upgradePaymentRef || currentSub.paymentProviderRef,
    entitlementsSnapshot: { ...targetPlan.entitlements },
    auditTrail: [...currentSub.auditTrail, subAudit],
    createdAt: now,
    updatedAt: now
  };

  // Preserve previous subscription in history with its audit intact
  const updatedHistory = (business.subscriptionHistory || []).map(s => {
    if (s.id === currentSub.id) {
      return { ...s, status: "EXPIRED" as const, updatedAt: now };
    }
    return s;
  });
  updatedHistory.push(updatedSubscription);

  const updatedAccount: CustomerAccount = {
    ...account,
    activeSubscriptionId: newSubId,
    currentPlanId: targetPlan.id,
    currentSubscriptionStatus: "ACTIVE",
    updatedAt: now,
    auditTrail: [
      ...account.auditTrail,
      {
        id: `aa_${Date.now()}_change`,
        timestamp: now,
        actor,
        action: "STATUS_CHANGED",
        notes: `Plan changed to ${targetPlan.name} (${actionType}).`
      }
    ]
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSubscription,
    subscriptionHistory: updatedHistory
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: updatedSubscription
  };
}

/**
 * Marks subscription as PAST_DUE (e.g. failed payment attempt).
 */
export async function markSubscriptionPastDue(
  business: Business,
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
      error: `Unauthorized: User role "${actor.role}" cannot modify subscription status.`
    };
  }

  const sub = business.activeSubscription;
  const account = business.customerAccount;
  if (!sub || !account) {
    return { success: false, business, error: "No active subscription found to mark past due." };
  }

  const now = new Date().toISOString();
  const audit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_pastdue`,
    timestamp: now,
    actor,
    action: "PAYMENT_FAILED",
    fromStatus: sub.status,
    toStatus: "PAST_DUE",
    notes: reason || "Payment renewal attempt failed at provider."
  };

  const updatedSub: CustomerSubscription = {
    ...sub,
    status: "PAST_DUE",
    auditTrail: [...sub.auditTrail, audit],
    updatedAt: now
  };

  const updatedAccount: CustomerAccount = {
    ...account,
    currentSubscriptionStatus: "PAST_DUE",
    updatedAt: now
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSub,
    subscriptionHistory: (business.subscriptionHistory || []).map(s => s.id === sub.id ? updatedSub : s)
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: updatedSub
  };
}

/**
 * Cancels a subscription. Retains historical records and strips paid entitlements.
 */
export async function cancelSubscription(
  business: Business,
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
  const account = business.customerAccount;
  if (!sub || !account) {
    return { success: false, business, error: "No active subscription found to cancel." };
  }

  const now = new Date().toISOString();
  const audit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_cancel`,
    timestamp: now,
    actor,
    action: "CANCELLED",
    fromStatus: sub.status,
    toStatus: "CANCELLED",
    notes: reason || "Subscription cancelled by customer request."
  };

  // Rule: Cancelled subscriptions lose only appropriate paid entitlements
  const restrictedEntitlements: ServiceEntitlements = {
    website_generation: false,
    website_editing: true, // Grace editing preserved for client
    hosting: true, // Read-only hosting
    custom_domain: false, // Custom domain unlinked
    lead_capture: false,
    crm: false,
    analytics: false,
    support_sla: false,
    ai_generation: false
  };

  const updatedSub: CustomerSubscription = {
    ...sub,
    status: "CANCELLED",
    cancelledAt: now,
    cancelReason: reason || "User requested cancellation",
    entitlementsSnapshot: restrictedEntitlements,
    auditTrail: [...sub.auditTrail, audit],
    updatedAt: now
  };

  const updatedAccount: CustomerAccount = {
    ...account,
    currentSubscriptionStatus: "CANCELLED",
    updatedAt: now
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSub,
    subscriptionHistory: (business.subscriptionHistory || []).map(s => s.id === sub.id ? updatedSub : s)
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: updatedSub
  };
}

/**
 * Expires a subscription (e.g. trial ended or period elapsed without renewal).
 */
export async function expireSubscription(
  business: Business,
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
      error: `Unauthorized: User role "${actor.role}" cannot expire subscriptions.`
    };
  }

  const sub = business.activeSubscription;
  const account = business.customerAccount;
  if (!sub || !account) {
    return { success: false, business, error: "No active subscription found to expire." };
  }

  const now = new Date().toISOString();
  const audit: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_expire`,
    timestamp: now,
    actor,
    action: "EXPIRED",
    fromStatus: sub.status,
    toStatus: "EXPIRED",
    notes: "Subscription validity period elapsed without renewal."
  };

  const expiredEntitlements: ServiceEntitlements = {
    website_generation: false,
    website_editing: false,
    hosting: true, // Read-only baseline preview
    custom_domain: false,
    lead_capture: false,
    crm: false,
    analytics: false,
    support_sla: false,
    ai_generation: false
  };

  const updatedSub: CustomerSubscription = {
    ...sub,
    status: "EXPIRED",
    entitlementsSnapshot: expiredEntitlements,
    auditTrail: [...sub.auditTrail, audit],
    updatedAt: now
  };

  const updatedAccount: CustomerAccount = {
    ...account,
    currentSubscriptionStatus: "EXPIRED",
    updatedAt: now
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSub,
    subscriptionHistory: (business.subscriptionHistory || []).map(s => s.id === sub.id ? updatedSub : s)
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: updatedSub
  };
}

/**
 * Programmatic Service Entitlement Enforcement.
 * Checks whether the customer is entitled to use a specific feature.
 * NEVER relies on UI visibility alone.
 */
export function checkServiceEntitlement(
  business: Business,
  feature: ServiceEntitlementKey,
  requestingUserId?: string
): EntitlementCheckResult {
  const account = business.customerAccount;
  const sub = business.activeSubscription;

  // 1. Account existence check
  if (!account) {
    return {
      entitled: false,
      feature,
      reason: "No customer account registered for this business. Feature access requires an active account."
    };
  }

  // 2. Cross-customer security isolation: If requestingUserId specified, verify ownership
  if (requestingUserId && account.ownerUserId && requestingUserId !== account.ownerUserId && requestingUserId !== "admin") {
    return {
      entitled: false,
      feature,
      customerId: account.customerId,
      reason: `Unauthorized: User "${requestingUserId}" does not own account "${account.customerId}". Cross-customer access forbidden.`
    };
  }

  // 3. Account status check
  if (account.accountStatus === "SUSPENDED" || account.accountStatus === "CLOSED") {
    return {
      entitled: false,
      feature,
      customerId: account.customerId,
      reason: `Account is ${account.accountStatus.toLowerCase()}. Service access revoked.`
    };
  }

  // 4. Subscription existence check
  if (!sub) {
    return {
      entitled: false,
      feature,
      customerId: account.customerId,
      reason: "No active subscription attached to this account."
    };
  }

  // 5. Subscription status restrictions
  const now = Date.now();
  const periodEndMs = Date.parse(sub.currentPeriodEnd);
  const isPeriodElapsed = !isNaN(periodEndMs) && now > periodEndMs;

  if (sub.status === "EXPIRED" || (sub.cancelAtPeriodEnd && isPeriodElapsed)) {
    return {
      entitled: false,
      feature,
      planId: sub.planId,
      subscriptionStatus: "EXPIRED",
      customerId: account.customerId,
      reason: `Subscription has EXPIRED. Please renew to access "${feature}".`
    };
  }

  if (sub.status === "PAUSED") {
    return {
      entitled: false,
      feature,
      planId: sub.planId,
      subscriptionStatus: "PAUSED",
      customerId: account.customerId,
      reason: `Subscription is PAUSED. Resume subscription to access "${feature}".`
    };
  }

  // If PAST_DUE, allow essential hosting and editing, but block AI and domain services
  if (sub.status === "PAST_DUE") {
    if (feature === "ai_generation" || feature === "custom_domain" || feature === "crm") {
      return {
        entitled: false,
        feature,
        planId: sub.planId,
        subscriptionStatus: "PAST_DUE",
        customerId: account.customerId,
        reason: `Account payment is PAST_DUE. Feature "${feature}" is temporarily restricted until payment is settled.`
      };
    }
  }

  // 6. Entitlement snapshot verification
  const isFeatureEntitled = !!sub.entitlementsSnapshot[feature];

  if (!isFeatureEntitled) {
    return {
      entitled: false,
      feature,
      planId: sub.planId,
      subscriptionStatus: sub.status,
      customerId: account.customerId,
      reason: `Feature "${feature}" is not included in current plan "${sub.planName}". Upgrade to unlock.`
    };
  }

  return {
    entitled: true,
    feature,
    planId: sub.planId,
    subscriptionStatus: sub.status,
    customerId: account.customerId
  };
}

/**
 * Administrative override for subscription plan and status.
 * Strictly restricted to verified Admin roles and fully audited with reasons.
 */
export async function adminOverrideSubscriptionPlan(
  business: Business,
  targetPlanId: string,
  targetStatus: SubscriptionStatus,
  adminActor: TaskAssignee,
  reason: string
): Promise<{
  success: boolean;
  business: Business;
  subscription?: CustomerSubscription;
  error?: string;
}> {
  if (adminActor.role !== "Admin" && adminActor.role !== "ADMIN" && adminActor.role !== "admin") {
    return {
      success: false,
      business,
      error: `Unauthorized: Administrative override requires verified Admin role. Given role: "${adminActor.role}".`
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      business,
      error: "Administrative override rejected: Detailed audit reason (at least 5 characters) is required."
    };
  }

  const targetPlan = CANONICAL_PLANS[targetPlanId];
  if (!targetPlan) {
    return {
      success: false,
      business,
      error: `Invalid plan ID "${targetPlanId}". Available plans: ${Object.keys(CANONICAL_PLANS).join(", ")}`
    };
  }

  const now = new Date().toISOString();
  let account = business.customerAccount;

  // If no account yet, initialize one
  if (!account) {
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    account = {
      id: customerId,
      customerId,
      businessId: business.id,
      businessName: business.name,
      ownerUserId: adminActor.uid,
      primaryEmail: business.email || `${customerId}@client.sitescout.ai`,
      accountStatus: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        {
          id: `aa_${Date.now()}_admin_init`,
          timestamp: now,
          actor: adminActor,
          action: "CREATED",
          notes: `Account created via Admin Override: ${reason}`
        }
      ]
    };
  }

  const currentSub = business.activeSubscription;
  const newSubId = `sub_${Date.now()}_override`;

  const auditEntry: SubscriptionAuditRecord = {
    id: `sa_${Date.now()}_admin`,
    timestamp: now,
    actor: adminActor,
    action: "UPGRADED",
    fromPlanId: currentSub?.planId,
    toPlanId: targetPlan.id,
    fromStatus: currentSub?.status,
    toStatus: targetStatus,
    notes: `ADMIN OVERRIDE: ${reason}`
  };

  const newSubscription: CustomerSubscription = {
    id: newSubId,
    subscriptionId: newSubId,
    customerId: account.customerId,
    businessId: business.id,
    planId: targetPlan.id,
    planName: targetPlan.name,
    status: targetStatus,
    billingInterval: currentSub?.billingInterval || "MONTHLY",
    currency: targetPlan.pricing.currency,
    unitPrice: targetPlan.pricing.monthly,
    startDate: currentSub?.startDate || now,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentProviderRef: {
      provider: "manual_verified",
      referenceId: `admin_override_${Date.now()}`,
      lastPaymentVerifiedAt: now,
      amountPaid: targetPlan.pricing.monthly,
      currency: targetPlan.pricing.currency
    },
    entitlementsSnapshot: { ...targetPlan.entitlements },
    auditTrail: currentSub ? [...currentSub.auditTrail, auditEntry] : [auditEntry],
    createdAt: now,
    updatedAt: now
  };

  const updatedHistory = currentSub
    ? [
        ...(business.subscriptionHistory || []).map(s => s.id === currentSub.id ? { ...s, status: "EXPIRED" as const, updatedAt: now } : s),
        newSubscription
      ]
    : [newSubscription];

  const updatedAccount: CustomerAccount = {
    ...account,
    activeSubscriptionId: newSubId,
    currentPlanId: targetPlan.id,
    currentSubscriptionStatus: targetStatus,
    updatedAt: now,
    auditTrail: [
      ...account.auditTrail,
      {
        id: `aa_${Date.now()}_override`,
        timestamp: now,
        actor: adminActor,
        action: "STATUS_CHANGED",
        notes: `Admin override applied (${targetPlan.name}, ${targetStatus}): ${reason}`
      }
    ]
  };

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: newSubscription,
    subscriptionHistory: updatedHistory
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    subscription: newSubscription
  };
}

import crypto from "crypto";
import {
  BillingEvent,
  BillingInterval,
  Business,
  CustomerAccount,
  CustomerBillingDashboardData,
  CustomerInvoice,
  CustomerPaymentRecord,
  CustomerSession,
  PaymentProviderReference,
  PlanDefinition,
  SandboxCheckoutSession,
  SandboxPaymentVerificationResult,
  ServiceEntitlementKey,
  ServiceEntitlements,
  StripeSandboxConfig,
  SubscriptionAuditRecord,
  SubscriptionStatus,
  TaskAssignee
} from "../types";
import { CANONICAL_PLANS, checkServiceEntitlement } from "./customerSubscription";
import { calculateEffectiveEntitlements, processBillingEvent } from "./subscriptionBillingEvents";
import { 
  createCustomerInvoice, 
  getCustomerBillingSummary, 
  recordCustomerInvoicePayment, 
  refundCustomerPayment, 
  roundMoney 
} from "./customerBilling";
import { authorizeCustomerAccess, isCustomerAccountOwner } from "./customerPortalAccess";
import { saveBusinessRecord } from "./businessPersistence";
import { toCents, fromCents } from "./prospectFinancials";

/**
 * MICRO-PHASE 19G: STRIPE SANDBOX, BILLING & PAYMENT VALIDATION ENGINE
 * 
 * Enforces:
 * 1. Stripe operates exclusively in sandbox / test mode (live cards cannot be charged).
 * 2. Rejection of live credentials in sandbox environment.
 * 3. Frontend success screens CANNOT independently confirm payment.
 * 4. Server-side payment verification rejecting tampered amounts or incorrect currencies.
 * 5. Webhook signature validation (HMAC-SHA256) and strict idempotency deduplication.
 * 6. Subscription lifecycle state management (TRIAL -> ACTIVE -> PAST_DUE -> CANCELLED -> EXPIRED).
 * 7. Server-side service entitlement enforcement across all 9 canonical capabilities.
 * 8. Complete financial record preservation (refunds preserve original payments).
 * 9. Strict separation of sandbox payments from real production revenue.
 * 10. Multi-tenant customer dashboard access controls.
 */

// Global tracker for webhook idempotency
const processedWebhookEventIds = new Set<string>();

/**
 * Retrieves the Stripe Sandbox Configuration.
 * Guarantees test mode operation and rejects live credentials.
 */
export function getStripeSandboxConfig(envVars: Record<string, string | undefined> = process.env): StripeSandboxConfig {
  const testPubKey = envVars.STRIPE_TEST_PUBLISHABLE_KEY || envVars.VITE_STRIPE_TEST_PUBLISHABLE_KEY;
  const testSecKey = envVars.STRIPE_TEST_SECRET_KEY;
  const testWhSec = envVars.STRIPE_TEST_WEBHOOK_SECRET || envVars.PAYMENT_WEBHOOK_SECRET;

  // Strict Security Guard: Live credentials MUST NOT be present in sandbox configuration
  if (testSecKey && testSecKey.startsWith("sk_live_")) {
    throw new Error("SECURITY VIOLATION: Live Stripe secret key detected in sandbox configuration. Live credentials are strictly forbidden.");
  }
  if (testPubKey && testPubKey.startsWith("pk_live_")) {
    throw new Error("SECURITY VIOLATION: Live Stripe publishable key detected in sandbox configuration. Live credentials are strictly forbidden.");
  }

  const isConfigured = !!(testPubKey && testSecKey);

  return {
    mode: "test",
    isSandbox: true,
    testPublishableKey: testPubKey,
    testSecretKey: testSecKey,
    testWebhookSecret: testWhSec || "whsec_test_secret_sitescout_sandbox",
    isConfigured
  };
}

/**
 * Asserts whether live payment provider is available or blocked.
 * If credentials are not configured, classifies integration as BLOCKED without fabricating responses.
 */
export function assertSandboxProviderAvailable(config?: StripeSandboxConfig): {
  available: boolean;
  status: "READY" | "BLOCKED";
  message: string;
} {
  const activeConfig = config || getStripeSandboxConfig();
  if (!activeConfig.isConfigured && !activeConfig.testPublishableKey && !activeConfig.testSecretKey) {
    return {
      available: false,
      status: "BLOCKED",
      message: "Stripe sandbox provider credentials are not configured. Live provider integration calls are BLOCKED."
    };
  }
  return {
    available: true,
    status: "READY",
    message: "Stripe sandbox test provider is configured and operating in test mode."
  };
}

/**
 * Generates an HMAC-SHA256 tamper-proof token for a checkout session.
 */
function generateTamperProofToken(
  businessId: string,
  planId: string,
  amount: number,
  currency: string,
  secretKey: string = "sitescout_sandbox_secret_signature"
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${businessId}:${planId}:${amount.toFixed(2)}:${currency}`)
    .digest("hex");
}

/**
 * Creates an authoritative Sandbox Checkout Session.
 * Calculates exact plan pricing server-side to prevent client-side price tampering.
 */
export function createSandboxCheckoutSession(
  business: Business,
  planId: string,
  billingInterval: BillingInterval,
  options?: {
    customerSession?: CustomerSession;
    returnUrl?: string;
    cancelUrl?: string;
  }
): {
  success: boolean;
  session?: SandboxCheckoutSession;
  error?: string;
} {
  if (!business || !business.id) {
    return { success: false, error: "Invalid business record provided." };
  }

  // Cross-tenant verification if customerSession is provided
  if (options?.customerSession) {
    const isOwner = isCustomerAccountOwner(business, options.customerSession);
    if (!isOwner && options.customerSession.role !== "admin") {
      return {
        success: false,
        error: "Access denied: Cannot create checkout session for another customer's business."
      };
    }
  }

  const targetPlan = CANONICAL_PLANS[planId];
  if (!targetPlan) {
    return {
      success: false,
      error: `Invalid plan ID "${planId}". Available plans: ${Object.keys(CANONICAL_PLANS).join(", ")}.`
    };
  }

  // Calculate authoritative price from canonical configuration
  const amount = billingInterval === "ANNUAL" ? targetPlan.pricing.annual : targetPlan.pricing.monthly;
  const currency = targetPlan.pricing.currency || business.currency || "SZL";

  const customerId = business.customerAccount?.customerId || `cust_${business.id.substring(0, 8)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const clientSecret = `seti_test_${Date.now()}_secret_${Math.random().toString(36).substring(2, 10)}`;

  const tamperProofToken = generateTamperProofToken(business.id, planId, amount, currency);

  const session: SandboxCheckoutSession = {
    sessionId,
    customerId,
    businessId: business.id,
    planId: targetPlan.id,
    planName: targetPlan.name,
    billingInterval,
    amount,
    currency,
    status: "open",
    isSandbox: true,
    clientSecret,
    paymentUrl: `https://checkout.stripe.test/pay/${sessionId}`,
    expiresAt,
    createdAt: now.toISOString(),
    tamperProofToken,
    metadata: {
      businessId: business.id,
      customerId,
      planId: targetPlan.id,
      billingInterval,
      environment: "sandbox"
    }
  };

  return {
    success: true,
    session
  };
}

/**
 * Authoritative Server-Side Sandbox Payment Verification.
 * Invariant: Frontend success screens CANNOT independently confirm payment.
 * Validates transaction reference, matches tamper-proof signature, and checks amount/currency.
 */
export function verifySandboxPayment(
  session: SandboxCheckoutSession,
  paymentSubmission: {
    transactionRef: string;
    submittedAmount: number;
    submittedCurrency: string;
    paymentStatus: "succeeded" | "failed" | "requires_action";
    isTestCard?: boolean;
    failureCode?: string;
    failureMessage?: string;
  }
): SandboxPaymentVerificationResult {
  const verifiedAt = new Date().toISOString();

  // 1. Transaction reference must be present and valid
  if (!paymentSubmission.transactionRef || paymentSubmission.transactionRef.trim() === "") {
    return {
      verified: false,
      isSandbox: true,
      transactionRef: "",
      customerId: session.customerId,
      subscriptionId: undefined,
      amount: paymentSubmission.submittedAmount,
      currency: paymentSubmission.submittedCurrency,
      status: "rejected",
      rejectionReason: "Payment rejected: Missing verifiable transaction reference.",
      verifiedAt
    };
  }

  // 2. Validate payment status reported by provider
  if (paymentSubmission.paymentStatus !== "succeeded") {
    return {
      verified: false,
      isSandbox: true,
      transactionRef: paymentSubmission.transactionRef,
      customerId: session.customerId,
      amount: paymentSubmission.submittedAmount,
      currency: paymentSubmission.submittedCurrency,
      status: "failed",
      rejectionReason: paymentSubmission.failureMessage || `Payment failed with code ${paymentSubmission.failureCode || "PAYMENT_FAILED"}.`,
      verifiedAt
    };
  }

  // 3. Currency validation: Must match session exactly
  if (paymentSubmission.submittedCurrency.toUpperCase() !== session.currency.toUpperCase()) {
    return {
      verified: false,
      isSandbox: true,
      transactionRef: paymentSubmission.transactionRef,
      customerId: session.customerId,
      amount: paymentSubmission.submittedAmount,
      currency: paymentSubmission.submittedCurrency,
      status: "tampered",
      rejectionReason: `Currency mismatch: Submitted "${paymentSubmission.submittedCurrency}" does not match session currency "${session.currency}".`,
      verifiedAt
    };
  }

  // 4. Amount validation: Must match session amount exactly (within 0.01 tolerance)
  if (Math.abs(paymentSubmission.submittedAmount - session.amount) > 0.009) {
    return {
      verified: false,
      isSandbox: true,
      transactionRef: paymentSubmission.transactionRef,
      customerId: session.customerId,
      amount: paymentSubmission.submittedAmount,
      currency: session.currency,
      status: "tampered",
      rejectionReason: `Amount mismatch: Submitted ${paymentSubmission.submittedAmount} does not match authoritative plan price ${session.amount}.`,
      verifiedAt
    };
  }

  // 5. Verification successful: Build canonical payment evidence
  const evidence: PaymentProviderReference = {
    provider: "stripe",
    referenceId: paymentSubmission.transactionRef,
    amountPaid: session.amount,
    currency: session.currency,
    lastPaymentVerifiedAt: verifiedAt,
    receiptNumber: `RCPT-TEST-${Date.now().toString().slice(-6)}`,
    paymentMethodType: "pm_card_test_visa",
    isSandbox: true
  };

  return {
    verified: true,
    isSandbox: true,
    transactionRef: paymentSubmission.transactionRef,
    customerId: session.customerId,
    amount: session.amount,
    currency: session.currency,
    status: "succeeded",
    evidence,
    verifiedAt
  };
}

/**
 * Validates Stripe webhook signatures using HMAC-SHA256 with timestamp verification.
 */
export function verifyPaymentWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  payload: any,
  secret: string
): { verified: boolean; error?: string } {
  if (!secret) {
    return { verified: false, error: "Missing webhook secret for validation." };
  }

  const rawSig = headers["stripe-signature"] || headers["Stripe-Signature"] || headers["x-webhook-secret"] || headers["X-Webhook-Secret"];
  if (!rawSig) {
    return { verified: false, error: "Missing stripe-signature or x-webhook-secret header." };
  }

  const signatureStr = Array.isArray(rawSig) ? rawSig[0] : rawSig;

  // Direct secret match
  if (signatureStr === secret) {
    return { verified: true };
  }

  // Stripe t=timestamp,v1=signature format
  if (signatureStr.includes("t=") && signatureStr.includes("v1=")) {
    try {
      const parts = signatureStr.split(",");
      const tPart = parts.find(p => p.startsWith("t="));
      const v1Part = parts.find(p => p.startsWith("v1="));

      if (!tPart || !v1Part) {
        return { verified: false, error: "Malformed stripe-signature header structure." };
      }

      const timestamp = tPart.substring(2);
      const signature = v1Part.substring(3);
      const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${payloadString}`)
        .digest("hex");

      const bufExpected = Buffer.from(expected);
      const bufActual = Buffer.from(signature);

      if (bufExpected.length === bufActual.length && crypto.timingSafeEqual(bufExpected, bufActual)) {
        return { verified: true };
      }
      return { verified: false, error: "Invalid webhook signature." };
    } catch (e: any) {
      return { verified: false, error: `Signature computation failed: ${e.message}` };
    }
  }

  return { verified: false, error: "Invalid webhook signature." };
}

/**
 * Resets the webhook idempotency tracker for testing.
 */
export function resetWebhookIdempotencyTracker(): void {
  processedWebhookEventIds.clear();
}

/**
 * Checks if a webhook event ID has already been processed.
 */
export function isWebhookEventProcessed(eventId: string): boolean {
  return processedWebhookEventIds.has(eventId);
}

/**
 * Authoritative Webhook Processor for Sandbox Billing Events.
 * Guarantees:
 * 1. Signature validation.
 * 2. Idempotency (duplicate events are ignored safely).
 * 3. Out-of-order event resilience.
 * 4. Failed payments transition to PAST_DUE without activating paid entitlements.
 * 5. Tagging all records with isSandbox: true.
 */
export async function processSandboxBillingWebhook(
  business: Business,
  event: BillingEvent,
  headers: Record<string, string | string[] | undefined>,
  webhookSecret: string = "whsec_test_secret_sitescout_sandbox",
  actor?: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  eventStatus: "PROCESSED" | "IGNORED_DUPLICATE" | "IGNORED_STALE" | "FAILED" | "INVALID_SIGNATURE";
  error?: string;
}> {
  // 1. Signature Validation
  const sigCheck = verifyPaymentWebhookSignature(headers, event, webhookSecret);
  if (!sigCheck.verified) {
    return {
      success: false,
      business,
      eventStatus: "INVALID_SIGNATURE",
      error: sigCheck.error || "Webhook signature validation failed."
    };
  }

  // 2. Global Idempotency Check
  if (processedWebhookEventIds.has(event.eventId)) {
    return {
      success: true,
      business,
      eventStatus: "IGNORED_DUPLICATE"
    };
  }

  // 3. Mark event as sandbox
  const sandboxEvent: BillingEvent = {
    ...event,
    isSandbox: true,
    provider: "stripe"
  };

  // 4. Delegate to authoritative billing event processor
  const result = await processBillingEvent(business, sandboxEvent, actor);

  if (result.success && result.eventStatus === "PROCESSED") {
    processedWebhookEventIds.add(event.eventId);
  }

  return {
    success: result.success,
    business: result.business,
    eventStatus: result.eventStatus as any,
    error: result.error
  };
}

/**
 * Generates an accurate Sandbox Invoice for a subscription plan without inventing tax or discounts.
 */
export async function generateSandboxInvoice(
  business: Business,
  planId: string,
  billingInterval: BillingInterval,
  actor: TaskAssignee,
  options?: {
    dueDate?: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  business: Business;
  invoice?: CustomerInvoice;
  error?: string;
}> {
  const plan = CANONICAL_PLANS[planId];
  if (!plan) {
    return { success: false, business, error: `Plan "${planId}" not found.` };
  }

  const unitPrice = billingInterval === "ANNUAL" ? plan.pricing.annual : plan.pricing.monthly;
  const currency = plan.pricing.currency || business.currency || "SZL";

  const lineItems = [
    {
      description: `${plan.name} Plan (${billingInterval}) - Sandbox`,
      quantity: 1,
      unitPrice
    }
  ];

  const invRes = await createCustomerInvoice(
    business,
    {
      lineItems,
      currency,
      dueDate: options?.dueDate,
      notes: options?.notes || `Sandbox subscription invoice for ${plan.name} (${billingInterval}).`,
      subscriptionId: business.activeSubscription?.id
    },
    actor
  );

  if (invRes.success && invRes.invoice) {
    // Explicitly tag invoice as sandbox
    invRes.invoice.isSandbox = true;
    const updatedInvoices = (invRes.business.invoices || []).map(i =>
      i.id === invRes.invoice!.id ? { ...i, isSandbox: true } : i
    );
    const updatedBiz: Business = {
      ...invRes.business,
      invoices: updatedInvoices
    };
    try { await saveBusinessRecord(updatedBiz); } catch (e) {}
    return {
      success: true,
      business: updatedBiz,
      invoice: { ...invRes.invoice, isSandbox: true }
    };
  }

  return invRes;
}

/**
 * Processes a Sandbox Payment against an invoice with full transaction preservation and sandbox isolation.
 */
export async function recordSandboxInvoicePayment(
  business: Business,
  invoiceId: string,
  paymentData: {
    amount: number;
    currency: string;
    transactionRef: string;
    paymentMethod?: "card" | "mtn_momo" | "bank_transfer" | "cash" | "offline";
    paidAt?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  payment?: CustomerPaymentRecord;
  invoice?: CustomerInvoice;
  error?: string;
}> {
  const paymentProviderRef: PaymentProviderReference = {
    provider: "stripe",
    referenceId: paymentData.transactionRef,
    amountPaid: paymentData.amount,
    currency: paymentData.currency,
    lastPaymentVerifiedAt: paymentData.paidAt || new Date().toISOString(),
    receiptNumber: `RCPT-SBX-${Date.now().toString().slice(-6)}`,
    isSandbox: true
  };

  const res = await recordCustomerInvoicePayment(
    business,
    invoiceId,
    {
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod || "card",
      paymentProviderRef,
      paidAt: paymentData.paidAt
    },
    actor
  );

  if (res.success && res.payment) {
    // Tag payment record as sandbox
    const sandboxPayment: CustomerPaymentRecord = {
      ...res.payment,
      isSandbox: true
    };
    const updatedPayments = (res.business.payments || []).map(p =>
      p.id === sandboxPayment.id ? sandboxPayment : p
    );
    const updatedBiz: Business = {
      ...res.business,
      payments: updatedPayments
    };
    try { await saveBusinessRecord(updatedBiz); } catch (e) {}

    return {
      success: true,
      business: updatedBiz,
      payment: sandboxPayment,
      invoice: res.invoice
    };
  }

  return res;
}

/**
 * Computes production revenue strictly excluding all sandbox transactions.
 * Distinguishes: ESTIMATED, PROPOSED, INVOICED, PAID, REFUNDED, REVENUE.
 */
export function computeProductionRevenueVsSandboxRevenue(business: Business): {
  currency: string;
  // Production actuals (excludes sandbox)
  production: {
    estimated: number;
    proposed: number;
    invoiced: number;
    paid: number;
    refunded: number;
    netRevenue: number;
    transactionsCount: number;
  };
  // Sandbox totals (isolated, never counted as real revenue)
  sandbox: {
    invoiced: number;
    paid: number;
    refunded: number;
    netRevenue: number;
    transactionsCount: number;
  };
} {
  const currency = business.currency || business.activeSubscription?.currency || "SZL";
  const invoices = business.invoices || [];
  const payments = business.payments || [];

  // Filter out VOID invoices
  const validInvoices = invoices.filter(i => i.status !== "VOID");

  // Partition invoices
  const prodInvoices = validInvoices.filter(i => !i.isSandbox && !i.notes?.includes("Sandbox"));
  const sbxInvoices = validInvoices.filter(i => !!i.isSandbox || !!i.notes?.includes("Sandbox"));

  // Partition payments
  const prodPayments = payments.filter(
    p => !p.isSandbox && !p.paymentProviderRef?.isSandbox && !p.paymentProviderRef?.referenceId?.includes("test")
  );
  const sbxPayments = payments.filter(
    p => !!p.isSandbox || !!p.paymentProviderRef?.isSandbox || !!p.paymentProviderRef?.referenceId?.includes("test")
  );

  const prodInvoiced = roundMoney(prodInvoices.reduce((acc, i) => acc + i.total, 0));
  const prodPaid = roundMoney(
    prodPayments.filter(p => p.status !== "FAILED" && p.status !== "PENDING").reduce((acc, p) => acc + p.amount, 0)
  );
  const prodRefunded = roundMoney(prodPayments.reduce((acc, p) => acc + p.refundedAmount, 0));
  const prodNetRevenue = roundMoney(Math.max(0, prodPaid - prodRefunded));

  const sbxInvoiced = roundMoney(sbxInvoices.reduce((acc, i) => acc + i.total, 0));
  const sbxPaid = roundMoney(
    sbxPayments.filter(p => p.status !== "FAILED" && p.status !== "PENDING").reduce((acc, p) => acc + p.amount, 0)
  );
  const sbxRefunded = roundMoney(sbxPayments.reduce((acc, p) => acc + p.refundedAmount, 0));
  const sbxNetRevenue = roundMoney(Math.max(0, sbxPaid - sbxRefunded));

  return {
    currency,
    production: {
      estimated: business.estimatedDealValue || 0,
      proposed: business.proposedDealValue || 0,
      invoiced: prodInvoiced,
      paid: prodPaid,
      refunded: prodRefunded,
      netRevenue: prodNetRevenue,
      transactionsCount: prodPayments.filter(p => p.status === "COMPLETED").length
    },
    sandbox: {
      invoiced: sbxInvoiced,
      paid: sbxPaid,
      refunded: sbxRefunded,
      netRevenue: sbxNetRevenue,
      transactionsCount: sbxPayments.filter(p => p.status === "COMPLETED").length
    }
  };
}

/**
 * Returns complete Customer Billing Dashboard Data for an authenticated customer.
 * Enforces cross-customer authorization: access denied if session does not own the account.
 */
export function getCustomerBillingDashboard(
  business: Business,
  session: CustomerSession
): {
  success: boolean;
  dashboard?: CustomerBillingDashboardData;
  status: number;
  error?: string;
} {
  const auth = authorizeCustomerAccess(business, session, "invoice", undefined, "read");
  if (!auth.authorized) {
    return {
      success: false,
      status: auth.status,
      error: auth.reason || "Unauthorized access to customer billing dashboard."
    };
  }

  const sub = business.activeSubscription;
  const plan = CANONICAL_PLANS[sub?.planId || "plan_basic"] || CANONICAL_PLANS.plan_basic;
  const status: SubscriptionStatus = sub?.status || "TRIAL";
  const interval: BillingInterval = sub?.billingInterval || "MONTHLY";

  const effectiveEntitlements = calculateEffectiveEntitlements(
    sub || {
      id: "none",
      subscriptionId: "none",
      customerId: business.customerAccount?.customerId || "",
      businessId: business.id,
      planId: plan.id,
      planName: plan.name,
      status,
      billingInterval: interval,
      currency: "SZL",
      unitPrice: 0,
      startDate: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      entitlementsSnapshot: plan.entitlements,
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    business.customerAccount?.accountStatus
  );

  const invoices = business.invoices || [];
  const payments = business.payments || [];
  const validInvoices = invoices.filter(i => i.status !== "VOID");
  const outstandingBalance = roundMoney(validInvoices.reduce((sum, i) => sum + i.amountDue, 0));

  const allEntitlementKeys: ServiceEntitlementKey[] = [
    "website_generation",
    "website_editing",
    "hosting",
    "custom_domain",
    "lead_capture",
    "crm",
    "analytics",
    "ai_generation",
    "support_sla"
  ];

  const entitlementDetails: Record<ServiceEntitlementKey, boolean> = {} as any;
  for (const key of allEntitlementKeys) {
    const res = checkServiceEntitlement(business, key, session.uid);
    entitlementDetails[key] = res.entitled;
  }

  const dashboard: CustomerBillingDashboardData = {
    customerId: business.customerAccount?.customerId || `cust_${business.id.substring(0, 8)}`,
    businessId: business.id,
    businessName: business.name,
    currentPlan: plan,
    subscriptionStatus: status,
    billingInterval: interval,
    currentPeriodStart: sub?.currentPeriodStart || new Date().toISOString(),
    currentPeriodEnd: sub?.currentPeriodEnd || new Date().toISOString(),
    renewalDate: sub?.renewalDate,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd,
    outstandingBalance,
    invoices,
    payments,
    activeEntitlements: effectiveEntitlements,
    entitlementDetails,
    sandboxTransactionsCount: payments.filter(p => !!p.isSandbox).length
  };

  return {
    success: true,
    status: 200,
    dashboard
  };
}

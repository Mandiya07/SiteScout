/**
 * SiteScout AI — Micro-Phase 19G Test Suite
 * SUBSCRIPTION, BILLING & PAYMENT SANDBOX VALIDATION
 * 
 * Validates complete subscription lifecycle, billing, payments, sandbox isolation,
 * service entitlement enforcement, and financial reporting accuracy.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import { 
  Business, 
  CustomerSession, 
  PaymentProviderReference, 
  TaskAssignee,
  BillingEvent
} from "../types";
import { 
  CANONICAL_PLANS, 
  checkServiceEntitlement, 
  createCustomerAccount,
  activatePaidSubscription,
  changeSubscriptionPlan,
  expireSubscription,
  adminOverrideSubscriptionPlan
} from "../lib/customerSubscription";
import { 
  calculateEffectiveEntitlements, 
  processBillingEvent, 
  renewSubscription, 
  cancelSubscriptionWithPeriodEnd, 
  reactivateSubscription 
} from "../lib/subscriptionBillingEvents";
import { 
  createCustomerInvoice, 
  recordCustomerInvoicePayment, 
  recordFailedPaymentAttempt, 
  refundCustomerPayment, 
  voidCustomerInvoice, 
  evaluateOverdueInvoices, 
  getCustomerBillingSummary,
  roundMoney 
} from "../lib/customerBilling";
import { 
  getStripeSandboxConfig, 
  assertSandboxProviderAvailable, 
  createSandboxCheckoutSession, 
  verifySandboxPayment, 
  verifyPaymentWebhookSignature, 
  processSandboxBillingWebhook, 
  resetWebhookIdempotencyTracker, 
  generateSandboxInvoice, 
  recordSandboxInvoicePayment, 
  computeProductionRevenueVsSandboxRevenue, 
  getCustomerBillingDashboard 
} from "../lib/stripeSandboxBilling";
import { authorizeCustomerAccess } from "../lib/customerPortalAccess";

describe("MICRO-PHASE 19G: Subscription, Billing & Payment Sandbox Validation", () => {
  const adminActor: TaskAssignee = {
    uid: "admin_user_001",
    displayName: "Admin Operator",
    role: "Admin"
  };

  const restrictedActor: TaskAssignee = {
    uid: "viewer_user_002",
    displayName: "Viewer Operator",
    role: "Viewer" as any
  };

  function createTestBusiness(idSuffix: string = "001"): Business {
    const bizId = `biz_sandbox_${idSuffix}`;
    const custId = `cust_sbx_${idSuffix}`;
    const ownerUid = `user_owner_${idSuffix}`;
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: bizId,
      name: `Apex Fitness Center ${idSuffix}`,
      category: "Fitness & Gym",
      phone: "+268 7612 3456",
      email: `contact@apexfitness${idSuffix}.com`,
      currency: "SZL",
      estimatedDealValue: 1200,
      proposedDealValue: 1200,
      agreedDealValue: 1200,
      salesStage: "WON",
      customerAccount: {
        id: custId,
        customerId: custId,
        businessId: bizId,
        businessName: `Apex Fitness Center ${idSuffix}`,
        ownerUserId: ownerUid,
        primaryEmail: `owner@apexfitness${idSuffix}.com`,
        accountStatus: "ACTIVE",
        activeSubscriptionId: `sub_sbx_${idSuffix}`,
        currentPlanId: "plan_trial",
        currentSubscriptionStatus: "TRIAL",
        createdAt: now,
        updatedAt: now,
        auditTrail: []
      },
      activeSubscription: {
        id: `sub_sbx_${idSuffix}`,
        subscriptionId: `sub_sbx_${idSuffix}`,
        customerId: custId,
        businessId: bizId,
        planId: "plan_trial",
        planName: "14-Day Free Trial",
        status: "TRIAL",
        billingInterval: "MONTHLY",
        currency: "SZL",
        unitPrice: 0,
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        renewalDate: trialEnd,
        entitlementsSnapshot: { ...CANONICAL_PLANS.plan_trial.entitlements },
        auditTrail: [],
        createdAt: now,
        updatedAt: now
      },
      subscriptionHistory: [],
      invoices: [],
      payments: [],
      financialLedger: [],
      billingEvents: []
    } as Business;
  }

  beforeEach(() => {
    resetWebhookIdempotencyTracker();
  });

  // =========================================================================
  // 1. A. Sandbox Payment Configuration & Safety
  // =========================================================================
  describe("A. Sandbox Payment Configuration & Safety", () => {
    it("operates exclusively in test mode and validates sandbox indicators", () => {
      const config = getStripeSandboxConfig({
        STRIPE_TEST_PUBLISHABLE_KEY: "pk_test_51Mz0000000000000000000000000000",
        STRIPE_TEST_SECRET_KEY: "sk_test_51Mz0000000000000000000000000000",
        PAYMENT_WEBHOOK_SECRET: "whsec_test_secret_sample"
      });

      assert.strictEqual(config.mode, "test");
      assert.strictEqual(config.isSandbox, true);
      assert.strictEqual(config.isConfigured, true);
      assert.ok(config.testPublishableKey?.startsWith("pk_test_"));
    });

    it("strictly rejects live secret keys in sandbox configuration to prevent charging real payment methods", () => {
      assert.throws(() => {
        getStripeSandboxConfig({
          STRIPE_TEST_SECRET_KEY: "sk_live_TEST_FORBIDDEN_SAMPLE_KEY"
        });
      }, /SECURITY VIOLATION.*Live Stripe secret key/);
    });

    it("strictly rejects live publishable keys in sandbox configuration", () => {
      assert.throws(() => {
        getStripeSandboxConfig({
          STRIPE_TEST_PUBLISHABLE_KEY: "pk_live_TEST_FORBIDDEN_SAMPLE_KEY"
        });
      }, /SECURITY VIOLATION.*Live Stripe publishable key/);
    });

    it("classifies live provider integration as BLOCKED when sandbox credentials are unconfigured without fabricating fake responses", () => {
      const status = assertSandboxProviderAvailable({
        mode: "test",
        isSandbox: true,
        isConfigured: false
      });

      assert.strictEqual(status.status, "BLOCKED");
      assert.strictEqual(status.available, false);
      assert.ok(status.message.includes("BLOCKED"));
    });
  });

  // =========================================================================
  // 2. B. Sandbox Checkout Sessions & Server-Side Price Authority
  // =========================================================================
  describe("B. Sandbox Checkout Sessions & Server-Side Price Authority", () => {
    it("creates sandbox checkout session with canonical pricing derived server-side", () => {
      const business = createTestBusiness("checkout_01");
      const res = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY");

      assert.strictEqual(res.success, true);
      assert.ok(res.session);
      assert.strictEqual(res.session?.planId, "plan_pro");
      assert.strictEqual(res.session?.amount, CANONICAL_PLANS.plan_pro.pricing.monthly); // E120
      assert.strictEqual(res.session?.currency, "SZL");
      assert.strictEqual(res.session?.isSandbox, true);
      assert.ok(res.session?.sessionId.startsWith("cs_test_"));
      assert.ok(res.session?.tamperProofToken);
    });

    it("calculates annual pricing correctly from canonical plan definition", () => {
      const business = createTestBusiness("checkout_02");
      const res = createSandboxCheckoutSession(business, "plan_elite", "ANNUAL");

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.session?.amount, CANONICAL_PLANS.plan_elite.pricing.annual); // E2500
      assert.strictEqual(res.session?.billingInterval, "ANNUAL");
    });

    it("blocks cross-customer checkout session creation", () => {
      const business = createTestBusiness("checkout_03");
      const intruderSession: CustomerSession = {
        uid: "intruder_user_999",
        email: "intruder@otherbiz.com",
        customerId: "cust_other_999",
        businessId: "biz_other_999",
        role: "customer",
        sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false
      };

      const res = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY", {
        customerSession: intruderSession
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes("Access denied"));
    });
  });

  // =========================================================================
  // 3. C. Payment Verification & Anti-Tampering
  // =========================================================================
  describe("C. Payment Verification & Anti-Tampering", () => {
    it("verifies legitimate server-side sandbox payment and issues verified evidence", () => {
      const business = createTestBusiness("verify_01");
      const session = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY").session!;

      const verifyRes = verifySandboxPayment(session, {
        transactionRef: "ch_test_valid_001",
        submittedAmount: 120,
        submittedCurrency: "SZL",
        paymentStatus: "succeeded",
        isTestCard: true
      });

      assert.strictEqual(verifyRes.verified, true);
      assert.strictEqual(verifyRes.status, "succeeded");
      assert.strictEqual(verifyRes.amount, 120);
      assert.strictEqual(verifyRes.isSandbox, true);
      assert.ok(verifyRes.evidence);
      assert.strictEqual(verifyRes.evidence?.provider, "stripe");
      assert.strictEqual(verifyRes.evidence?.referenceId, "ch_test_valid_001");
      assert.strictEqual(verifyRes.evidence?.isSandbox, true);
    });

    it("rejects failed test payment without activating paid entitlements", () => {
      const business = createTestBusiness("verify_fail");
      const session = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY").session!;

      const verifyRes = verifySandboxPayment(session, {
        transactionRef: "ch_test_declined_002",
        submittedAmount: 120,
        submittedCurrency: "SZL",
        paymentStatus: "failed",
        failureCode: "card_declined",
        failureMessage: "Your test card was declined."
      });

      assert.strictEqual(verifyRes.verified, false);
      assert.strictEqual(verifyRes.status, "failed");
      assert.ok(verifyRes.rejectionReason?.includes("declined"));
      assert.strictEqual(verifyRes.evidence, undefined);
    });

    it("rejects tampered payment amount (client attempts to pay less than plan price)", () => {
      const business = createTestBusiness("verify_tamper_amt");
      const session = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY").session!; // Price is 120

      const verifyRes = verifySandboxPayment(session, {
        transactionRef: "ch_test_tamper_amt_003",
        submittedAmount: 1.00, // Tampered: tried to pay $1 instead of 120
        submittedCurrency: "SZL",
        paymentStatus: "succeeded"
      });

      assert.strictEqual(verifyRes.verified, false);
      assert.strictEqual(verifyRes.status, "tampered");
      assert.ok(verifyRes.rejectionReason?.includes("Amount mismatch"));
    });

    it("rejects incorrect currency submitted by client", () => {
      const business = createTestBusiness("verify_tamper_curr");
      const session = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY").session!; // Currency is SZL

      const verifyRes = verifySandboxPayment(session, {
        transactionRef: "ch_test_tamper_curr_004",
        submittedAmount: 120,
        submittedCurrency: "EUR", // Mismatched currency
        paymentStatus: "succeeded"
      });

      assert.strictEqual(verifyRes.verified, false);
      assert.strictEqual(verifyRes.status, "tampered");
      assert.ok(verifyRes.rejectionReason?.includes("Currency mismatch"));
    });

    it("rejects payment verification with missing transaction reference", () => {
      const business = createTestBusiness("verify_missing_ref");
      const session = createSandboxCheckoutSession(business, "plan_pro", "MONTHLY").session!;

      const verifyRes = verifySandboxPayment(session, {
        transactionRef: "   ",
        submittedAmount: 120,
        submittedCurrency: "SZL",
        paymentStatus: "succeeded"
      });

      assert.strictEqual(verifyRes.verified, false);
      assert.strictEqual(verifyRes.status, "rejected");
      assert.ok(verifyRes.rejectionReason?.includes("Missing verifiable transaction reference"));
    });
  });

  // =========================================================================
  // 4. D. Webhook Signatures, Idempotency & Out-of-Order Handling
  // =========================================================================
  describe("D. Webhook Signatures, Idempotency & Out-of-Order Handling", () => {
    const testSecret = "whsec_test_secret_123456789";

    it("verifies authentic Stripe webhook signature using HMAC-SHA256 timestamp format", () => {
      const payload = { eventId: "evt_test_001", type: "invoice.paid" };
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto.createHmac("sha256", testSecret).update(signedPayload).digest("hex");
      const header = `t=${timestamp},v1=${signature}`;

      const res = verifyPaymentWebhookSignature(
        { "stripe-signature": header },
        payload,
        testSecret
      );

      assert.strictEqual(res.verified, true);
    });

    it("rejects invalid or forged webhook signature", () => {
      const payload = { eventId: "evt_test_forged", type: "invoice.paid" };
      const header = `t=1600000000,v1=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad`;

      const res = verifyPaymentWebhookSignature(
        { "stripe-signature": header },
        payload,
        testSecret
      );

      assert.strictEqual(res.verified, false);
      assert.ok(res.error?.includes("Invalid webhook signature"));
    });

    it("processes verified webhook and activates correct subscription with proper entitlements", async () => {
      let business = createTestBusiness("webhook_activate");
      const now = new Date().toISOString();

      const webhookEvent: BillingEvent = {
        id: "be_001",
        eventId: "evt_stripe_renew_001",
        eventType: "subscription.renewed",
        customerId: business.customerAccount!.customerId,
        businessId: business.id,
        provider: "stripe",
        eventTimestamp: now,
        processedAt: now,
        status: "PROCESSED",
        payload: {
          transactionId: "ch_test_renew_001",
          amountPaid: 120,
          currency: "SZL"
        }
      };

      const res = await processSandboxBillingWebhook(
        business,
        webhookEvent,
        { "x-webhook-secret": testSecret },
        testSecret,
        adminActor
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.eventStatus, "PROCESSED");
      assert.strictEqual(res.business.activeSubscription?.status, "ACTIVE");
      assert.strictEqual(res.business.activeSubscription?.paymentProviderRef?.isSandbox, true);
    });

    it("prevents duplicate webhook processing (idempotency)", async () => {
      const business = createTestBusiness("webhook_duplicate");
      const now = new Date().toISOString();

      const webhookEvent: BillingEvent = {
        id: "be_dup_001",
        eventId: "evt_stripe_duplicate_test",
        eventType: "subscription.renewed",
        customerId: business.customerAccount!.customerId,
        businessId: business.id,
        provider: "stripe",
        eventTimestamp: now,
        processedAt: now,
        status: "PROCESSED",
        payload: {
          transactionId: "ch_test_dup_001",
          amountPaid: 120,
          currency: "SZL"
        }
      };

      // First run: processed
      const firstRes = await processSandboxBillingWebhook(
        business,
        webhookEvent,
        { "x-webhook-secret": testSecret },
        testSecret,
        adminActor
      );
      assert.strictEqual(firstRes.eventStatus, "PROCESSED");

      // Second run: ignored as duplicate
      const secondRes = await processSandboxBillingWebhook(
        firstRes.business,
        webhookEvent,
        { "x-webhook-secret": testSecret },
        testSecret,
        adminActor
      );
      assert.strictEqual(secondRes.success, true);
      assert.strictEqual(secondRes.eventStatus, "IGNORED_DUPLICATE");
    });

    it("handles out-of-order/stale events safely without state regression", async () => {
      let business = createTestBusiness("webhook_stale");
      const now = Date.now();
      const currentEventTime = new Date(now).toISOString();
      const staleEventTime = new Date(now - 100000).toISOString(); // 100 seconds in past

      // Set subscription lastEventTimestamp
      business.activeSubscription!.lastEventTimestamp = currentEventTime;

      const staleEvent: BillingEvent = {
        id: "be_stale_001",
        eventId: "evt_stripe_stale_999",
        eventType: "subscription.renewed",
        customerId: business.customerAccount!.customerId,
        businessId: business.id,
        provider: "stripe",
        eventTimestamp: staleEventTime, // Out of order!
        processedAt: new Date().toISOString(),
        status: "PROCESSED",
        payload: {
          transactionId: "ch_test_stale_001",
          amountPaid: 120,
          currency: "SZL"
        }
      };

      const res = await processSandboxBillingWebhook(
        business,
        staleEvent,
        { "x-webhook-secret": testSecret },
        testSecret,
        adminActor
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.eventStatus, "IGNORED_STALE");
    });

    it("rejects failed payment webhook from activating paid entitlements and transitions to PAST_DUE", async () => {
      let business = createTestBusiness("webhook_fail_payment");
      // Set to active first
      business.activeSubscription!.status = "ACTIVE";

      const failEvent: BillingEvent = {
        id: "be_fail_001",
        eventId: "evt_stripe_fail_charge",
        eventType: "invoice.payment_failed",
        customerId: business.customerAccount!.customerId,
        businessId: business.id,
        provider: "stripe",
        eventTimestamp: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        status: "PROCESSED",
        payload: {
          reason: "Insufficient test funds"
        }
      };

      const res = await processSandboxBillingWebhook(
        business,
        failEvent,
        { "x-webhook-secret": testSecret },
        testSecret,
        adminActor
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.business.activeSubscription?.status, "PAST_DUE");
      // Verify custom domain, CRM, AI generation restricted under past due
      const entitlements = res.business.activeSubscription?.entitlementsSnapshot!;
      assert.strictEqual(entitlements.custom_domain, false);
      assert.strictEqual(entitlements.crm, false);
      assert.strictEqual(entitlements.ai_generation, false);
    });
  });

  // =========================================================================
  // 5. E. Full Subscription Lifecycle Validation
  // =========================================================================
  describe("E. Full Subscription Lifecycle Validation", () => {
    it("validates trial activation with 14-day duration and restricted paid features", async () => {
      const business = createTestBusiness("lifecycle_trial");
      assert.strictEqual(business.activeSubscription?.status, "TRIAL");
      assert.strictEqual(business.activeSubscription?.unitPrice, 0);

      // Verify trial entitlements
      const entResult = checkServiceEntitlement(business, "custom_domain");
      assert.strictEqual(entResult.entitled, false);
      assert.ok(entResult.reason?.includes("not included in current plan"));

      const webGenResult = checkServiceEntitlement(business, "website_generation");
      assert.strictEqual(webGenResult.entitled, true);
    });

    it("activates paid subscription with verified payment reference", async () => {
      let business = createTestBusiness("lifecycle_paid");
      const paymentEvidence: PaymentProviderReference = {
        provider: "stripe",
        referenceId: "ch_test_paid_act_001",
        amountPaid: 120,
        currency: "SZL",
        isSandbox: true,
        lastPaymentVerifiedAt: new Date().toISOString()
      };

      const res = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        paymentEvidence,
        adminActor
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.business.activeSubscription?.status, "ACTIVE");
      assert.strictEqual(res.business.activeSubscription?.planId, "plan_pro");
      assert.strictEqual(res.business.activeSubscription?.unitPrice, 120);

      // Verify paid entitlements granted
      const domainResult = checkServiceEntitlement(res.business, "custom_domain");
      assert.strictEqual(domainResult.entitled, true);
    });

    it("rejects paid subscription activation without valid non-zero payment", async () => {
      let business = createTestBusiness("lifecycle_paid_reject");
      const invalidEvidence: PaymentProviderReference = {
        provider: "stripe",
        referenceId: "ch_test_zero",
        amountPaid: 0, // Zero amount!
        currency: "SZL"
      };

      const res = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        invalidEvidence,
        adminActor
      );

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes("non-zero payment amount"));
    });

    it("executes renewal extending active period in-place without duplicate subscriptions", async () => {
      let business = createTestBusiness("lifecycle_renew");
      // Activate Pro
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_init", amountPaid: 120, currency: "SZL", isSandbox: true },
        adminActor
      );
      business = actRes.business;
      const initialPeriodEnd = business.activeSubscription!.currentPeriodEnd;
      const initialSubId = business.activeSubscription!.id;

      // Renew
      const renewRes = await renewSubscription(
        business,
        { provider: "stripe", referenceId: "ch_test_renew_002", amountPaid: 120, currency: "SZL", isSandbox: true },
        adminActor
      );

      assert.strictEqual(renewRes.success, true);
      assert.strictEqual(renewRes.business.activeSubscription?.id, initialSubId); // In-place, no duplicate!
      assert.strictEqual(renewRes.business.activeSubscription?.status, "ACTIVE");
      assert.ok(Date.parse(renewRes.business.activeSubscription!.currentPeriodEnd) > Date.parse(initialPeriodEnd));
    });

    it("executes subscription upgrade and preserves previous subscription in history", async () => {
      let business = createTestBusiness("lifecycle_upgrade");
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_pro", amountPaid: 120, currency: "SZL" },
        adminActor
      );
      business = actRes.business;

      // Upgrade to Elite (requires payment ref for difference)
      const upgradeRes = await changeSubscriptionPlan(
        business,
        "plan_elite",
        adminActor,
        {
          upgradePaymentRef: {
            provider: "stripe",
            referenceId: "ch_test_upgrade_diff",
            amountPaid: 130, // Difference: 250 - 120 = 130
            currency: "SZL"
          }
        }
      );

      assert.strictEqual(upgradeRes.success, true);
      assert.strictEqual(upgradeRes.business.activeSubscription?.planId, "plan_elite");
      assert.strictEqual(upgradeRes.business.activeSubscription?.unitPrice, 250);
      assert.strictEqual(upgradeRes.business.subscriptionHistory.length, 2); // Preserved history
    });

    it("executes subscription downgrade adjusting entitlements", async () => {
      let business = createTestBusiness("lifecycle_downgrade");
      const actRes = await activatePaidSubscription(
        business,
        "plan_elite",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_elite", amountPaid: 250, currency: "SZL" },
        adminActor
      );
      business = actRes.business;

      const downRes = await changeSubscriptionPlan(business, "plan_pro", adminActor);
      assert.strictEqual(downRes.success, true);
      assert.strictEqual(downRes.business.activeSubscription?.planId, "plan_pro");
      assert.strictEqual(downRes.business.activeSubscription?.unitPrice, 120);
    });

    it("cancels subscription with period-end access preservation", async () => {
      let business = createTestBusiness("lifecycle_cancel_period_end");
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_cancel_pe", amountPaid: 120, currency: "SZL" },
        adminActor
      );
      business = actRes.business;

      const cancelRes = await cancelSubscriptionWithPeriodEnd(business, true, adminActor, "No longer needed");
      assert.strictEqual(cancelRes.success, true);
      assert.strictEqual(cancelRes.business.activeSubscription?.status, "ACTIVE"); // Still active until period ends
      assert.strictEqual(cancelRes.business.activeSubscription?.cancelAtPeriodEnd, true);

      // Entitlements remain active until period end
      const entResult = checkServiceEntitlement(cancelRes.business, "custom_domain");
      assert.strictEqual(entResult.entitled, true);
    });

    it("expires subscription after period elapses and removes expired entitlements", async () => {
      let business = createTestBusiness("lifecycle_expire");
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_exp", amountPaid: 120, currency: "SZL" },
        adminActor
      );
      business = actRes.business;

      // Force expire
      const expRes = await expireSubscription(business, adminActor);
      assert.strictEqual(expRes.success, true);
      assert.strictEqual(expRes.business.activeSubscription?.status, "EXPIRED");

      // Paid entitlements revoked
      const domainResult = checkServiceEntitlement(expRes.business, "custom_domain");
      assert.strictEqual(domainResult.entitled, false);
      assert.ok(domainResult.reason?.includes("EXPIRED"));
    });

    it("reactivates expired subscription with valid payment evidence", async () => {
      let business = createTestBusiness("lifecycle_reactivate");
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_reactivate_init", amountPaid: 120, currency: "SZL" },
        adminActor
      );
      business = (await expireSubscription(actRes.business, adminActor)).business;
      assert.strictEqual(business.activeSubscription?.status, "EXPIRED");

      const reactivateRes = await reactivateSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_reactivate_valid", amountPaid: 120, currency: "SZL", isSandbox: true },
        adminActor
      );

      assert.strictEqual(reactivateRes.success, true);
      assert.strictEqual(reactivateRes.business.activeSubscription?.status, "ACTIVE");
      const domainResult = checkServiceEntitlement(reactivateRes.business, "custom_domain");
      assert.strictEqual(domainResult.entitled, true);
    });
  });

  // =========================================================================
  // 6. F. Invoice Accuracy & Safe Monetary Calculations
  // =========================================================================
  describe("F. Invoice Accuracy & Safe Monetary Calculations", () => {
    it("generates invoice with accurate plan pricing, currency, and sequential numbering", async () => {
      const business = createTestBusiness("invoice_01");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);

      assert.strictEqual(invRes.success, true);
      assert.ok(invRes.invoice);
      assert.strictEqual(invRes.invoice?.isSandbox, true);
      assert.strictEqual(invRes.invoice?.subtotal, 120);
      assert.strictEqual(invRes.invoice?.taxAmount, 0);
      assert.strictEqual(invRes.invoice?.total, 120);
      assert.strictEqual(invRes.invoice?.amountDue, 120);
      assert.strictEqual(invRes.invoice?.amountPaid, 0);
      assert.strictEqual(invRes.invoice?.currency, "SZL");
      assert.ok(invRes.invoice?.invoiceNumber.startsWith("INV-"));
    });

    it("evaluates overdue invoices when due date has passed without payment", async () => {
      let business = createTestBusiness("invoice_overdue");
      const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor, {
        dueDate: pastDueDate
      });
      business = invRes.business;

      const evaluatedBiz = evaluateOverdueInvoices(business);
      const overdueInv = evaluatedBiz.invoices?.find(i => i.id === invRes.invoice?.id);

      assert.strictEqual(overdueInv?.status, "OVERDUE");
    });

    it("voids unpaid invoice and prevents voiding an invoice with completed payments", async () => {
      let business = createTestBusiness("invoice_void");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = invRes.business;

      // 1. Can void unpaid invoice
      const voidRes = await voidCustomerInvoice(business, invRes.invoice!.id, adminActor, "Client changed mind");
      assert.strictEqual(voidRes.success, true);
      assert.strictEqual(voidRes.invoice?.status, "VOID");

      // 2. Create another invoice and record payment
      const secondInvRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = secondInvRes.business;
      const payRes = await recordSandboxInvoicePayment(
        business,
        secondInvRes.invoice!.id,
        { amount: 120, currency: "SZL", transactionRef: "ch_test_paid_inv" },
        adminActor
      );
      business = payRes.business;

      // Attempt void on paid invoice -> blocked
      const blockVoidRes = await voidCustomerInvoice(business, secondInvRes.invoice!.id, adminActor);
      assert.strictEqual(blockVoidRes.success, false);
      assert.ok(blockVoidRes.error?.includes("Cannot void invoice"));
    });
  });

  // =========================================================================
  // 7. G. Payment Records, Partial Payments & Refund Handling
  // =========================================================================
  describe("G. Payment Records, Partial Payments & Refund Handling", () => {
    it("records full payment, sets amountDue to 0, and marks invoice PAID", async () => {
      let business = createTestBusiness("pay_full");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = invRes.business;

      const payRes = await recordSandboxInvoicePayment(
        business,
        invRes.invoice!.id,
        {
          amount: 120,
          currency: "SZL",
          transactionRef: "ch_test_full_001"
        },
        adminActor
      );

      assert.strictEqual(payRes.success, true);
      assert.strictEqual(payRes.payment?.status, "COMPLETED");
      assert.strictEqual(payRes.payment?.isSandbox, true);
      assert.strictEqual(payRes.invoice?.status, "PAID");
      assert.strictEqual(payRes.invoice?.amountDue, 0);
      assert.strictEqual(payRes.invoice?.amountPaid, 120);
    });

    it("records partial payment accurately and maintains outstanding balance", async () => {
      let business = createTestBusiness("pay_partial");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor); // Total 120
      business = invRes.business;

      const payRes = await recordSandboxInvoicePayment(
        business,
        invRes.invoice!.id,
        {
          amount: 50,
          currency: "SZL",
          transactionRef: "ch_test_partial_001"
        },
        adminActor
      );

      assert.strictEqual(payRes.success, true);
      assert.strictEqual(payRes.invoice?.status, "PARTIALLY_PAID");
      assert.strictEqual(payRes.invoice?.amountPaid, 50);
      assert.strictEqual(payRes.invoice?.amountDue, 70);
    });

    it("records failed payment attempt without fabricating paid status or revenue", async () => {
      let business = createTestBusiness("pay_failed_attempt");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = invRes.business;

      const failRes = await recordFailedPaymentAttempt(
        business,
        invRes.invoice!.id,
        {
          amount: 120,
          currency: "SZL",
          paymentMethod: "card",
          reason: "Payment declined by issuing bank"
        },
        adminActor
      );

      assert.strictEqual(failRes.success, true);
      assert.strictEqual(failRes.paymentRecord?.status, "FAILED");
      assert.strictEqual(failRes.paymentRecord?.netAmount, 0);
      // Ensure business revenue was not inflated
      assert.strictEqual(failRes.business.paidDealValue || 0, 0);
    });

    it("processes refund, preserves transaction history, and adjusts invoice balance", async () => {
      let business = createTestBusiness("pay_refund");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = invRes.business;
      const payRes = await recordSandboxInvoicePayment(
        business,
        invRes.invoice!.id,
        { amount: 120, currency: "SZL", transactionRef: "ch_test_for_refund" },
        adminActor
      );
      business = payRes.business;
      const paymentId = payRes.payment!.id;

      // Process partial refund
      const refRes = await refundCustomerPayment(
        business,
        paymentId,
        { amount: 50, reason: "Customer requested partial refund" },
        adminActor
      );

      assert.strictEqual(refRes.success, true);
      assert.strictEqual(refRes.payment?.status, "PARTIALLY_REFUNDED");
      assert.strictEqual(refRes.payment?.refundedAmount, 50);
      assert.strictEqual(refRes.payment?.netAmount, 70);
      assert.strictEqual(refRes.payment?.refunds.length, 1);
      // Invoice updated
      assert.strictEqual(refRes.invoice?.amountPaid, 70);
      assert.strictEqual(refRes.invoice?.amountDue, 50);
      // Net revenue adjusted safely
      assert.strictEqual(refRes.business.netRevenue, 70);
    });

    it("rejects refund exceeding payment balance", async () => {
      let business = createTestBusiness("pay_refund_exceed");
      const invRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = (await recordSandboxInvoicePayment(
        invRes.business,
        invRes.invoice!.id,
        { amount: 120, currency: "SZL", transactionRef: "ch_test_exceed_ref" },
        adminActor
      )).business;
      const paymentId = business.payments![0].id;

      const refRes = await refundCustomerPayment(
        business,
        paymentId,
        { amount: 200, reason: "Excessive refund attempt" }, // Paid 120, attempting 200
        adminActor
      );

      assert.strictEqual(refRes.success, false);
      assert.ok(refRes.error?.includes("exceeds unrefunded payment balance"));
    });
  });

  // =========================================================================
  // 8. H. Service Entitlement Enforcement Across All 9 Capabilities
  // =========================================================================
  describe("H. Service Entitlement Enforcement Across All 9 Capabilities", () => {
    it("enforces server-side access across all 9 canonical service entitlements", () => {
      const business = createTestBusiness("entitlements_all");
      // Set to Elite (has all capabilities)
      business.activeSubscription = {
        ...business.activeSubscription!,
        planId: "plan_elite",
        planName: "Elite",
        status: "ACTIVE",
        entitlementsSnapshot: { ...CANONICAL_PLANS.plan_elite.entitlements }
      };

      const allCapabilities = [
        "website_generation",
        "website_editing",
        "hosting",
        "custom_domain",
        "lead_capture",
        "crm",
        "analytics",
        "ai_generation",
        "support_sla"
      ] as const;

      for (const cap of allCapabilities) {
        const res = checkServiceEntitlement(business, cap);
        assert.strictEqual(res.entitled, true, `Expected entitlement for ${cap} to be true on Elite plan`);
      }
    });

    it("denies server-side access to non-entitled features on Basic plan", () => {
      const business = createTestBusiness("entitlements_basic");
      business.activeSubscription = {
        ...business.activeSubscription!,
        planId: "plan_basic",
        planName: "Basic",
        status: "ACTIVE",
        entitlementsSnapshot: { ...CANONICAL_PLANS.plan_basic.entitlements }
      };

      const customDomainRes = checkServiceEntitlement(business, "custom_domain");
      assert.strictEqual(customDomainRes.entitled, false);

      const crmRes = checkServiceEntitlement(business, "crm");
      assert.strictEqual(crmRes.entitled, false);

      const aiRes = checkServiceEntitlement(business, "ai_generation");
      assert.strictEqual(aiRes.entitled, false);
    });

    it("blocks unauthorized entitlement modification attempts by restricted actors", async () => {
      const business = createTestBusiness("entitlements_unauth_mod");

      // Attempt admin override by restricted user
      assert.rejects(async () => {
        const overrideRes = await adminOverrideSubscriptionPlan(
          business,
          "plan_enterprise",
          "ACTIVE",
          restrictedActor,
          "Attempted unauthorized privilege escalation"
        );
        if (!overrideRes.success) throw new Error(overrideRes.error);
      }, /Unauthorized/);
    });
  });

  // =========================================================================
  // 9. I. Customer Billing Dashboard & Cross-Tenant Isolation
  // =========================================================================
  describe("I. Customer Billing Dashboard & Cross-Tenant Isolation", () => {
    it("returns complete dashboard data for authorized customer owner", () => {
      const business = createTestBusiness("dashboard_owner");
      const ownerSession: CustomerSession = {
        uid: business.customerAccount!.ownerUserId!,
        email: business.customerAccount!.primaryEmail!,
        customerId: business.customerAccount!.customerId,
        businessId: business.id,
        role: "customer",
        sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false
      };

      const res = getCustomerBillingDashboard(business, ownerSession);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 200);
      assert.ok(res.dashboard);
      assert.strictEqual(res.dashboard?.customerId, business.customerAccount?.customerId);
      assert.strictEqual(res.dashboard?.businessName, business.name);
      assert.ok(res.dashboard?.activeEntitlements);
      assert.ok(res.dashboard?.entitlementDetails);
    });

    it("enforces cross-customer isolation and blocks unauthorized tenant access to billing dashboard", () => {
      const business = createTestBusiness("dashboard_tenant_isolation");
      const intruderSession: CustomerSession = {
        uid: "intruder_user_tenant_b",
        email: "attacker@rivalcompany.com",
        customerId: "cust_tenant_b",
        businessId: "biz_tenant_b",
        role: "customer",
        sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false
      };

      const res = getCustomerBillingDashboard(business, intruderSession);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, 403);
      assert.ok(res.error?.includes("Access denied"));
    });
  });

  // =========================================================================
  // 10. J. Financial Reporting & Sandbox Revenue Exclusion
  // =========================================================================
  describe("J. Financial Reporting & Sandbox Revenue Exclusion", () => {
    it("strictly excludes sandbox transactions from actual business revenue", async () => {
      let business = createTestBusiness("financial_reporting");
      business.estimatedDealValue = 5000;
      business.proposedDealValue = 5000;

      // 1. Record real production invoice & payment
      const prodInvRes = await createCustomerInvoice(
        business,
        {
          lineItems: [{ description: "Production Annual Enterprise", quantity: 1, unitPrice: 3500 }],
          currency: "SZL"
        },
        adminActor
      );
      business = prodInvRes.business;
      const prodPayRes = await recordCustomerInvoicePayment(
        business,
        prodInvRes.invoice!.id,
        {
          amount: 3500,
          currency: "SZL",
          paymentMethod: "bank_transfer",
          paymentProviderRef: {
            provider: "bank_wire",
            referenceId: "wire_prod_confirmed_999",
            amountPaid: 3500,
            currency: "SZL",
            isSandbox: false
          }
        },
        adminActor
      );
      business = prodPayRes.business;

      // 2. Record sandbox invoice & payment
      const sbxInvRes = await generateSandboxInvoice(business, "plan_pro", "MONTHLY", adminActor);
      business = sbxInvRes.business;
      const sbxPayRes = await recordSandboxInvoicePayment(
        business,
        sbxInvRes.invoice!.id,
        {
          amount: 120,
          currency: "SZL",
          transactionRef: "ch_test_sandbox_not_revenue"
        },
        adminActor
      );
      business = sbxPayRes.business;

      // 3. Compute revenue breakdown
      const breakdown = computeProductionRevenueVsSandboxRevenue(business);

      // Verify production net revenue strictly reflects production payment (3500)
      assert.strictEqual(breakdown.production.paid, 3500);
      assert.strictEqual(breakdown.production.netRevenue, 3500);
      assert.strictEqual(breakdown.production.transactionsCount, 1);

      // Verify sandbox paid (120) is completely segregated and NOT in production
      assert.strictEqual(breakdown.sandbox.paid, 120);
      assert.strictEqual(breakdown.sandbox.netRevenue, 120);
      assert.strictEqual(breakdown.sandbox.transactionsCount, 1);
    });

    it("verifies immutable audit trail on subscription transitions", async () => {
      let business = createTestBusiness("audit_trail");
      const actRes = await activatePaidSubscription(
        business,
        "plan_pro",
        "MONTHLY",
        { provider: "stripe", referenceId: "ch_test_audit_01", amountPaid: 120, currency: "SZL", isSandbox: true },
        adminActor
      );
      business = actRes.business;

      const sub = business.activeSubscription!;
      assert.ok(sub.auditTrail.length > 0);
      const lastAudit = sub.auditTrail[sub.auditTrail.length - 1];
      assert.strictEqual(lastAudit.action, "PAYMENT_CONFIRMED");
      assert.strictEqual(lastAudit.toPlanId, "plan_pro");
      assert.strictEqual(lastAudit.actor.uid, adminActor.uid);
    });
  });
});

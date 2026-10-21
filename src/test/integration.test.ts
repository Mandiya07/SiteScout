import assert from "assert";
import { generateSecurePreviewToken, sanitizePublicPreview, isValidPreviewToken } from "../lib/security";
import { toCanonicalStage, isValidTransition, updateProspectStage } from "../lib/prospectCrm";
import { createCommercialDocument, approveCommercialDocument, acceptCommercialDocument } from "../lib/commercialDocuments";
import { initiateCustomerOnboarding, advanceOnboardingStatus, updateOnboardingRequirement } from "../lib/customerOnboarding";
import { initializeCustomerProject, advanceProjectStatus, evaluateLaunchReadiness, recordProjectDeployment } from "../lib/customerProjectDelivery";
import { verifyDeployedWebsite, confirmCustomerHandover } from "../lib/websiteLaunchHandover";
import { activatePaidSubscription, checkServiceEntitlement } from "../lib/customerSubscription";
import { processBillingEvent } from "../lib/subscriptionBillingEvents";
import { createCustomerSession, authorizeCustomerAccess, sanitizeCustomerPortalData } from "../lib/customerPortalAccess";
import { hasPermission, authorizePrivilegedOperation, verifyOperatorIdentity } from "../lib/internalAdminSecurity";
import { Business } from "../types";

export async function runIntegrationTests(): Promise<{ passed: number; failed: number; total: number }> {
  console.log("=== RUNNING INTEGRATION TEST SUITE ===");
  let passed = 0;
  let failed = 0;
  let total = 0;

  async function test(description: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ [INTEGRATION PASS] ${description}`);
    } catch (err: any) {
      failed++;
      console.error(`  ✗ [INTEGRATION FAIL] ${description}: ${err.message || err}`);
    }
  }

  // 1. Preview Generation & Cryptographic Integrity
  await test("Website preview generation creates valid crypto token and sanitizes private keys", () => {
    const rawSite: any = {
      id: "site_test_01",
      businessName: "Elite Salon",
      businessId: "biz_test_01",
      previewToken: generateSecurePreviewToken(),
      internalCostNotes: "Cost to build: $40",
      adminNotes: "Customer requested WhatsApp integration",
      hero: { headline: "Top Salon in Mbabane" }
    };

    assert.ok(isValidPreviewToken(rawSite.previewToken), "Generated token must satisfy cryptographic format");
    const sanitized = sanitizePublicPreview(rawSite);
    assert.strictEqual(sanitized.previewToken, rawSite.previewToken);
    assert.strictEqual(sanitized.businessName, "Elite Salon");
    assert.strictEqual((sanitized as any).internalCostNotes, undefined, "Internal financial notes must be stripped");
    assert.strictEqual((sanitized as any).adminNotes, undefined, "Admin internal notes must be stripped");
  });

  // 2. Sales Pipeline State Machine
  await test("Sales pipeline enforces valid canonical stage progression", () => {
    assert.strictEqual(isValidTransition("OPPORTUNITY_IDENTIFIED", "CONTACTED"), true);
    assert.strictEqual(isValidTransition("CONTACTED", "ENGAGED"), true);
    assert.strictEqual(isValidTransition("PROPOSAL_SENT", "WON"), true);
    // Invalid jump from early stage directly to WON without proposal
    assert.strictEqual(isValidTransition("OPPORTUNITY_IDENTIFIED", "WON"), false);
  });

  // 3. Commercial Documents & Customer Proposal
  await test("Commercial document lifecycle supports creation, approval, and acceptance", async () => {
    const testBiz: Business = {
      id: "biz_corp_01",
      name: "Corp Client",
      currency: "SZL"
    } as any;
    const salesRep = { uid: "sales_rep_01", displayName: "Sales Rep", role: "Sales" as any };

    const docRes = await createCommercialDocument(
      testBiz,
      {
        title: "Commercial Website Proposal",
        type: "PROPOSAL",
        currency: "SZL",
        items: [{ description: "Custom Website Layout & Hosting", quantity: 1, unitPrice: 3500 }],
        termsAndConditions: "Standard 30-day payment terms",
        deliverables: ["Website Generation", "Hosting"]
      },
      salesRep
    );
    assert.strictEqual(docRes.success, true);
    assert.strictEqual(docRes.document?.status, "DRAFT");

    const approvedRes = await approveCommercialDocument(
      docRes.business,
      docRes.document!.id,
      { uid: "manager_01", displayName: "Manager", role: "Manager" as any }
    );
    assert.strictEqual(approvedRes.success, true);
    assert.strictEqual(approvedRes.document?.status, "APPROVED");

    const acceptedRes = await acceptCommercialDocument(
      approvedRes.business,
      approvedRes.document!.id,
      { acceptedBy: "Client Signer", method: "ELECTRONIC_SIGNATURE" },
      salesRep
    );
    assert.strictEqual(acceptedRes.success, true);
    assert.strictEqual(acceptedRes.document?.status, "ACCEPTED");
    assert.ok(acceptedRes.document?.acceptedAt !== undefined);
  });

  // 4. Customer Onboarding & Project Initialization
  await test("Deal win seamlessly triggers onboarding handoff and project initialization", async () => {
    const testBiz: Business = {
      id: "biz_corp_01",
      name: "Corp Client",
      phone: "+268 7600 1234",
      email: "contact@corp.sz",
      dealOutcome: "WON",
      contractStatus: "SIGNED",
      paymentStatus: "PAID",
      commercialDocuments: [{ id: "doc_1", status: "ACCEPTED", totalValue: 3500 } as any]
    } as any;
    const salesRep = { uid: "sales_rep_01", displayName: "Sales Rep", role: "Sales" as any };

    const onbRes = await initiateCustomerOnboarding(testBiz, salesRep, {
      projectNotes: "Kickoff corporate website delivery"
    });
    assert.strictEqual(onbRes.success, true);
    assert.strictEqual(onbRes.onboardingRecord?.status, "PENDING");
    assert.ok(onbRes.onboardingRecord?.requirementsChecklist.length > 0);

    const inProgRes = await advanceOnboardingStatus(onbRes.business, "IN_PROGRESS", salesRep, "Discovery in progress");
    assert.strictEqual(inProgRes.success, true);
    assert.strictEqual(inProgRes.onboardingRecord?.status, "IN_PROGRESS");

    const projRes = await initializeCustomerProject(inProgRes.business, salesRep, {
      projectType: "WEBSITE_NEW",
      customDomain: "corp.sz"
    });
    assert.strictEqual(projRes.success, true);
    assert.strictEqual(projRes.project?.status, "NOT_STARTED");
    assert.ok(projRes.project?.tasks.length > 0);

    const startedProj = await advanceProjectStatus(projRes.business, "IN_PROGRESS", salesRep, "Delivery kickoff");
    assert.strictEqual(startedProj.success, true);
    assert.strictEqual(startedProj.project?.status, "IN_PROGRESS");
  });

  // 5. Website Launch Readiness & Deployment
  await test("Launch readiness verifies mandatory prerequisites before deployment", () => {
    const unreadyBiz: Business = {
      id: "biz_launch_01",
      name: "Launch Corp",
      phone: "+268 7600 1234",
      contractStatus: "SIGNED",
      customerProject: {
        id: "proj_1",
        status: "IN_PROGRESS",
        currentWebsiteVersion: 1,
        tasks: [{ id: "t1", title: "Setup Domain", isRequired: true, isCompleted: false }],
        customerApprovals: []
      } as any
    } as any;

    const unreadyEvaluation = evaluateLaunchReadiness(unreadyBiz);
    assert.strictEqual(unreadyEvaluation.isReady, false, "Incomplete tasks and missing approvals must block launch readiness");
    assert.ok(unreadyEvaluation.blockers.length > 0);

    const readyBiz: Business = {
      id: "biz_launch_01",
      name: "Launch Corp",
      phone: "+268 7600 1234",
      email: "launch@corp.sz",
      contractStatus: "SIGNED",
      paymentStatus: "PAID",
      presence: { websiteUrl: "https://launch.corp.sz" } as any,
      customerProject: {
        id: "proj_1",
        status: "IN_PROGRESS",
        currentWebsiteVersion: 1,
        customDomain: "launch.corp.sz",
        previewUrl: "https://preview.sitescout.ai/site_1",
        tasks: [{ id: "t1", title: "Setup Domain", isRequired: true, isCompleted: true }],
        customerApprovals: [{ id: "app_1", versionNumber: 1, status: "APPROVED" }]
      } as any
    } as any;

    const readyEvaluation = evaluateLaunchReadiness(readyBiz);
    assert.strictEqual(readyEvaluation.isReady, true, "All prerequisites met should permit launch");
  });

  // 6. Subscriptions, Billing Events & Entitlements
  await test("Billing event activates subscription and grants live entitlements", async () => {
    const testBusiness: Business = {
      id: "biz_billing_test",
      name: "Premier Logistics",
      customerAccount: { customerId: "cust_prem_01", email: "info@prem.sz", ownerUserId: "cust_prem_01", accountStatus: "ACTIVE" },
      activeSubscription: { 
        id: "sub_prem_01",
        customerId: "cust_prem_01",
        businessId: "biz_billing_test",
        planId: "plan_basic",
        plan: "STARTER", 
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        unitPrice: 0,
        currency: "SZL",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        auditTrail: []
      } as any
    } as any;

    const paymentRef = {
      provider: "stripe" as const,
      referenceId: "pi_stripe_12345",
      amountPaid: 120,
      currency: "SZL",
      verifiedAt: new Date().toISOString()
    };
    const actor = { uid: "sales_rep_01", displayName: "Sales Rep", role: "Sales" as any };

    const actRes = await activatePaidSubscription(testBusiness, "plan_pro", "MONTHLY", paymentRef, actor);
    assert.strictEqual(actRes.success, true);
    assert.strictEqual(actRes.subscription?.planId, "plan_pro");
    assert.strictEqual(actRes.subscription?.status, "ACTIVE");

    // Verify entitlement updated
    const entitlement = checkServiceEntitlement(actRes.business, "custom_domain", "cust_prem_01");
    assert.strictEqual(entitlement.entitled, true, "Pro plan must be entitled to custom domain");

    // Process billing renewal event
    const billingEvent = {
      id: "evt_sub_renew_999",
      eventId: "evt_sub_renew_999",
      eventType: "invoice.paid" as const,
      customerId: "cust_prem_01",
      businessId: "biz_billing_test",
      provider: "stripe" as const,
      eventTimestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      status: "PROCESSED" as const,
      payload: { transactionId: "ch_999", amountPaid: 120 }
    };

    const processRes = await processBillingEvent(actRes.business, billingEvent);
    assert.strictEqual(processRes.success, true);
    assert.strictEqual(processRes.business.activeSubscription?.status, "ACTIVE");
  });

  // 7. Customer Portal Access Isolation
  await test("Customer session enforces multi-tenant boundary and data isolation", () => {
    const sessionUserA = createCustomerSession({ uid: "user_a", customerId: "user_a", email: "usera@site.sz", role: "customer" });
    const businessA: Business = { 
      id: "biz_a", 
      name: "Alpha", 
      customerAccount: { customerId: "user_a", ownerUserId: "user_a", primaryEmail: "usera@site.sz" } as any 
    } as any;
    const businessB: Business = { 
      id: "biz_b", 
      name: "Beta", 
      customerAccount: { customerId: "user_b", ownerUserId: "user_b", primaryEmail: "userb@site.sz" } as any 
    } as any;

    const accessOwn = authorizeCustomerAccess(businessA, sessionUserA, "account");
    assert.strictEqual(accessOwn.authorized, true, "Customer A accessing own business allowed");

    const accessOther = authorizeCustomerAccess(businessB, sessionUserA, "account");
    assert.strictEqual(accessOther.authorized, false, "Customer A accessing Customer B business blocked");
    assert.strictEqual(accessOther.status, 403, "Forbidden HTTP 403 status returned");
  });

  // 8. Administrative Permissions & Privileged Operations
  await test("Internal admin permissions strictly govern privileged operations", async () => {
    assert.strictEqual(hasPermission("MANAGER", "MANAGE_CUSTOMERS"), true);
    assert.strictEqual(hasPermission("MANAGER", "SYSTEM_ADMIN"), false);
    assert.strictEqual(hasPermission("SUPER_ADMIN", "SYSTEM_ADMIN"), true);

    const privilegedCheck = await authorizePrivilegedOperation({
      actor: { uid: "admin_super_404", email: "siphom.yati@gmail.com", role: "SUPER_ADMIN" },
      operation: "GRANT_REVOKE_ENTITLEMENTS",
      requiredPermission: "GRANT_REVOKE_ENTITLEMENTS"
    });
    assert.strictEqual(privilegedCheck.authorized, true);

    const unauthorizedCheck = await authorizePrivilegedOperation({
      actor: { uid: "support_agent_555", email: "support@agency.sz", role: "SUPPORT" },
      operation: "GRANT_REVOKE_ENTITLEMENTS",
      requiredPermission: "GRANT_REVOKE_ENTITLEMENTS"
    });
    assert.strictEqual(unauthorizedCheck.authorized, false);
    assert.strictEqual(unauthorizedCheck.status, 403);
  });

  console.log(`=== INTEGRATION TESTS SUMMARY: ${passed}/${total} PASSED (${failed} FAILED) ===\n`);
  return { passed, failed, total };
}

if (process.argv[1]?.includes("integration.test.ts")) {
  runIntegrationTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

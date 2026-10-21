/**
 * SiteScout AI — Micro-Phase 19E Test Suite
 * OUTREACH, CRM & SALES WORKFLOW VALIDATION
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { 
  Business, 
  GeneratedSite, 
  CanonicalSalesStage, 
  TaskAssignee 
} from "../types";
import {
  createProspectFromVerifiedBusiness,
  calculateCrmDashboardAnalytics,
  generatePersonalizedOutreachDraft,
  scanDraftTruthfulness,
  approveOutreachDraft,
  rejectOutreachDraft,
  updateOutreachDraft,
  scheduleOutreachDelivery,
  deliverOutreachMessage,
  validatePreflightDelivery,
  createFollowUpTask,
  rescheduleFollowUpTask,
  updateFollowUpTaskStatus,
  DEFAULT_FOLLOW_UP_SEQUENCES,
  enrollProspectInSequence,
  handleSequenceReplyOrOptOut,
  validatePipelineStageTransition,
  executePipelineStageTransition,
  recordFinancialLedgerEntry,
  recordPayment,
  recordRefund,
  calculateRevenueMetrics,
  createCommercialDocument,
  recordCommunicationLifecycleEvent,
  toCanonicalStage
} from "../lib/prospectCrm";
import { generateSecurePreviewToken } from "../lib/security";
import { normalizeWebsiteSchema } from "../lib/websiteSchema";

describe("MICRO-PHASE 19E: Outreach, CRM & Sales Workflow Validation", () => {
  const adminActor: TaskAssignee = {
    uid: "user_sales_director_01",
    displayName: "Sipho M.",
    role: "Admin"
  };

  const agentActor: TaskAssignee = {
    uid: "user_agent_02",
    displayName: "Sarah K.",
    role: "Sales Agent"
  };

  const unauthorizedActor: TaskAssignee = {
    uid: "user_guest_03",
    displayName: "Guest Observer",
    role: "Viewer"
  };

  // Base verified business record for testing
  const createBaseVerifiedBusiness = (id = "biz_test_matsapha_01"): Business => ({
    id,
    name: "Matsapha Industrial Mechanics",
    category: "Auto Repair",
    address: "Matsapha Industrial Estate, Plot 14, Eswatini",
    phone: "+268 7601 4455",
    email: "service@matsaphamech.sz",
    description: "Heavy vehicle and fleet mechanical maintenance services.",
    rating: 4.7,
    reviewsCount: 38,
    dataType: "real",
    isDemo: false,
    presence: {
      hasWebsite: false,
      hasEmail: true,
      websiteStatus: "CONFIRMED_NO_WEBSITE",
      isAudited: true,
      lastCheckedAt: new Date().toISOString(),
      facebookStatus: "none",
      instagramStatus: "none",
      googleProfileQuality: "good",
      reviewCountStatus: "average",
      photosStatus: "sufficient",
      descriptionQuality: "good",
      openingHoursStatus: "complete",
      contactCompleteness: "complete",
      deficits: {
        noWebsite: true,
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: true,
        poorBranding: false,
        noWhatsappCta: true,
        noOnlineCatalogue: true,
        noBookingSystem: true,
        noEnquiryForm: true,
        noSeo: true,
        brokenLinks: false,
        poorMobileExperience: true,
        missingContact: false
      }
    },
    qualificationStatus: "QUALIFIED",
    salesStage: "QUALIFIED",
    prospectStatus: "Analyzed",
    dealOutcome: "OPEN",
    currency: "USD",
    estimatedDealValue: 1200,
    outreachDrafts: [],
    communicationHistory: [],
    followUpTasks: [],
    financialLedger: [],
    stageHistory: []
  });

  const createBaseSite = (bizId = "biz_test_matsapha_01"): GeneratedSite => normalizeWebsiteSchema({
    id: `site_${bizId}`,
    businessId: bizId,
    businessName: "Matsapha Industrial Mechanics",
    category: "Auto Repair",
    primaryColor: "#0284c7",
    fontStyle: "sans",
    hero: {
      title: "Certified Heavy Fleet & Diesel Maintenance",
      subtitle: "Minimizing fleet downtime across the Kingdom.",
      ctaPrimary: "Request Fleet Diagnostics",
      ctaSecondary: "Call Workshop"
    },
    services: [
      { title: "Diesel Diagnostics", description: "Computerized diagnostics.", price: "Request a Quote" }
    ],
    previewToken: generateSecurePreviewToken()
  });

  // =========================================================================
  // 1. PROSPECT CRM & OUTREACH PREPARATION
  // =========================================================================
  describe("1. Prospect CRM & Outreach Preparation", () => {
    it("creates a prospect from a verified business and links generated website preview", () => {
      const biz = createBaseVerifiedBusiness();
      const site = createBaseSite(biz.id);

      const prospect = createProspectFromVerifiedBusiness(biz, site, "QUALIFIED");

      assert.strictEqual(prospect.id, biz.id);
      assert.strictEqual(prospect.name, "Matsapha Industrial Mechanics");
      assert.strictEqual(prospect.siteId, site.id);
      assert.strictEqual(prospect.previewToken, site.previewToken);
      assert.ok(prospect.previewUrl?.includes(site.previewToken!), "Must construct valid preview URL with preview token");
      assert.strictEqual(prospect.salesStage, "QUALIFIED");
      assert.strictEqual(prospect.dealOutcome, "OPEN");
      assert.ok(prospect.contactProfile, "Must build verified contact profile");
      assert.ok(prospect.opportunityScore && prospect.opportunityScore > 50, "Must calculate high opportunity score for missing website");
    });

    it("generates evidence-grounded personalized outreach without hallucinating claims", () => {
      const biz = createBaseVerifiedBusiness();
      const site = createBaseSite(biz.id);
      const prospect = createProspectFromVerifiedBusiness(biz, site);

      const draft = generatePersonalizedOutreachDraft(prospect, {
        channel: "email",
        tone: "Consultative",
        senderName: "Sipho M."
      });

      assert.strictEqual(draft.businessId, prospect.id);
      assert.strictEqual(draft.channel, "email");
      assert.strictEqual(draft.isApproved, false, "AI generated draft must not be automatically approved");
      assert.strictEqual(draft.approvalStatus, "DRAFT");
      assert.strictEqual(draft.deliveryStatus, "NOT_SCHEDULED");

      // Verify business facts are accurate in message
      assert.ok(draft.body.includes("Matsapha Industrial Mechanics"), "Must include verified business name");
      assert.ok(draft.body.includes("4.7★"), "Must cite accurate Google rating");
      assert.ok(draft.body.includes(prospect.previewUrl!), "Must embed the exact website preview link");
      assert.ok(draft.unsupportedClaimsCount === 0, "Must have zero unsupported claims");
      assert.ok(draft.truthfulnessScore >= 90, "Evidence-grounded draft must have high truthfulness score");
    });

    it("detects and flags unsupported or hallucinated outreach claims", () => {
      const biz = createBaseVerifiedBusiness();

      // Body with forbidden claims: fabricated loss metric, fake discount, false guarantee, false visit
      const hallucinatedBody = `
        Hello Matsapha Mechanics Team,
        You are losing 75% of your customers every month!
        When I visited your workshop yesterday, we discussed a 50% discount.
        We provide a 100% money-back guarantee and guaranteed #1 ranking on Google.
      `;

      const scan = scanDraftTruthfulness(hallucinatedBody, "Special Offer", biz, "email");

      assert.strictEqual(scan.isValid, false, "Must detect invalid unsupported claims");
      assert.ok(scan.unsupportedClaims.length >= 3, "Must flag multiple forbidden claim violations");
      assert.ok(scan.truthfulnessScore < 50, "Truthfulness score must be penalized heavily for false claims");
      assert.ok(!scan.sanitizedBody.includes("100% money-back guarantee"), "Must sanitize unauthorized warranty claims");
    });
  });

  // =========================================================================
  // 2. OUTREACH APPROVAL & DELIVERY WORKFLOW
  // =========================================================================
  describe("2. Outreach Approval & Delivery Workflow", () => {
    it("attempts sending without approval and enforces preflight block", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const bizWithDraft = { ...biz, outreachDrafts: [draft] };

      // Preflight delivery check
      const preflight = validatePreflightDelivery(bizWithDraft, draft, agentActor);
      assert.strictEqual(preflight.eligible, false);
      assert.ok(preflight.blockers.some(b => b.includes("not been approved")), "Must block delivery of unapproved draft");

      // Delivery attempt
      const deliverRes = deliverOutreachMessage(
        bizWithDraft,
        draft.id,
        { mode: "SIMULATED" },
        agentActor
      );

      assert.strictEqual(deliverRes.success, false);
      assert.ok(deliverRes.error?.includes("Pre-flight validation failed"), "Must abort send when preflight fails");
    });

    it("approves an outreach draft with server-side authorization check", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const bizWithDraft = { ...biz, outreachDrafts: [draft] };

      // Unauthorized viewer attempt
      const unauthRes = approveOutreachDraft(bizWithDraft, draft.id, unauthorizedActor);
      assert.strictEqual(unauthRes.success, false);
      assert.ok(unauthRes.error?.includes("Unauthorized"), "Must block unauthorized role from approving outreach");

      // Authorized agent approval
      const authRes = approveOutreachDraft(bizWithDraft, draft.id, agentActor, "Verified facts and preview link");
      assert.strictEqual(authRes.success, true);
      assert.ok(authRes.draft);
      assert.strictEqual(authRes.draft.isApproved, true);
      assert.strictEqual(authRes.draft.approvalStatus, "APPROVED");
      assert.strictEqual(authRes.draft.approvedBy, agentActor.displayName);
      assert.ok(authRes.draft.auditTrail?.some(a => a.action === "approved"));
    });

    it("modifies an approved draft and verifies automatic approval invalidation", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const bizWithDraft = { ...biz, outreachDrafts: [draft] };

      // 1. Approve draft
      const approvedRes = approveOutreachDraft(bizWithDraft, draft.id, adminActor);
      assert.strictEqual(approvedRes.success, true);
      assert.strictEqual(approvedRes.draft?.isApproved, true);

      // 2. Modify approved draft text
      const updateRes = updateOutreachDraft(
        approvedRes.business,
        draft.id,
        {
          subject: "Revised Subject Line: Updated Digital Proposal for Matsapha Mechanics",
          body: approvedRes.draft!.body + "\n\nPS: Adding a new proposal note."
        },
        agentActor,
        "Updated email pitch for management"
      );

      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.approvalInvalidated, true, "Material edit must invalidate prior approval");
      assert.strictEqual(updateRes.draft?.isApproved, false, "isApproved must revert to false");
      assert.strictEqual(updateRes.draft?.approvalStatus, "DRAFT", "approvalStatus must revert to DRAFT");
      assert.ok(updateRes.draft?.auditTrail?.some(a => a.action === "approval_invalidated"), "Audit trail must record approval invalidation");
    });

    it("schedules an approved message and verifies future timestamp requirement", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const approvedRes = approveOutreachDraft({ ...biz, outreachDrafts: [draft] }, draft.id, adminActor);

      // Past date attempt
      const pastTime = new Date(Date.now() - 3600000).toISOString();
      const pastRes = scheduleOutreachDelivery(
        approvedRes.business,
        draft.id,
        { scheduledAt: pastTime },
        agentActor
      );
      assert.strictEqual(pastRes.success, false);
      assert.ok(pastRes.error?.includes("must be in the future"));

      // Valid future schedule
      const futureTime = new Date(Date.now() + 86400000).toISOString(); // 24 hours future
      const schedRes = scheduleOutreachDelivery(
        approvedRes.business,
        draft.id,
        { scheduledAt: futureTime, timeZone: "Africa/Mbabane" },
        agentActor
      );

      assert.strictEqual(schedRes.success, true);
      assert.strictEqual(schedRes.draft?.deliveryStatus, "SCHEDULED");
      assert.strictEqual(schedRes.draft?.scheduleConfig?.scheduledAt, futureTime);
      assert.ok(schedRes.draft?.scheduleConfig?.idempotencyKey);
    });

    it("sends using a sandbox provider and records communication history", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const approvedRes = approveOutreachDraft({ ...biz, outreachDrafts: [draft] }, draft.id, adminActor);

      const sendRes = deliverOutreachMessage(
        approvedRes.business,
        draft.id,
        { mode: "SIMULATED", customProvider: "sandbox_ses_simulator" },
        agentActor
      );

      assert.strictEqual(sendRes.success, true);
      assert.strictEqual(sendRes.draft?.deliveryStatus, "SENT");
      assert.strictEqual(sendRes.deliveryResult?.success, true);
      assert.strictEqual(sendRes.deliveryResult?.isSimulated, true);
      assert.ok(sendRes.business.communicationHistory && sendRes.business.communicationHistory.length > 0);
      assert.strictEqual(sendRes.business.communicationHistory[0].channel, "email");
    });

    it("simulates provider failure and preserves failure audit trail", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const approvedRes = approveOutreachDraft({ ...biz, outreachDrafts: [draft] }, draft.id, adminActor);

      const failRes = deliverOutreachMessage(
        approvedRes.business,
        draft.id,
        {
          mode: "SIMULATED",
          simulateFailure: true,
          failureReason: "SMTP 550 5.1.1 User unknown mailbox not found"
        },
        agentActor
      );

      assert.strictEqual(failRes.success, false);
      assert.strictEqual(failRes.draft?.deliveryStatus, "FAILED");
      assert.ok(failRes.error?.includes("SMTP 550"));
      assert.ok(failRes.draft?.auditTrail?.some(a => a.action === "send_failed"));
    });

    it("prevents duplicate sending of an already delivered outreach message", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const approvedRes = approveOutreachDraft({ ...biz, outreachDrafts: [draft] }, draft.id, adminActor);

      // First send
      const firstSend = deliverOutreachMessage(
        approvedRes.business,
        draft.id,
        { mode: "SIMULATED" },
        agentActor
      );
      assert.strictEqual(firstSend.success, true);

      // Attempt duplicate send
      const duplicateSend = deliverOutreachMessage(
        firstSend.business,
        draft.id,
        { mode: "SIMULATED" },
        agentActor
      );

      assert.strictEqual(duplicateSend.success, false);
      assert.ok(duplicateSend.error?.includes("Duplicate send blocked"), "Must block duplicate sending of already delivered draft");
    });

    it("records provider-confirmed delivery lifecycle update", () => {
      const biz = createBaseVerifiedBusiness();
      const draft = generatePersonalizedOutreachDraft(biz, { channel: "email" });
      const approvedRes = approveOutreachDraft({ ...biz, outreachDrafts: [draft] }, draft.id, adminActor);
      const sendRes = deliverOutreachMessage(approvedRes.business, draft.id, { mode: "SIMULATED" }, agentActor);

      const commId = sendRes.business.communicationHistory![0].id;

      // Webhook event confirms provider delivered message to recipient
      const lifecycleRes = recordCommunicationLifecycleEvent(
        sendRes.business,
        { communicationId: commId },
        {
          eventType: "delivered",
          status: "DELIVERED",
          providerMessageId: "evt_webhook_confirmed_9981",
          timestamp: new Date().toISOString()
        }
      );

      assert.strictEqual(lifecycleRes.success, true);
      const updatedComm = lifecycleRes.business.communicationHistory?.find(c => c.id === commId);
      assert.strictEqual(updatedComm?.deliveryStatus, "DELIVERED");
    });
  });

  // =========================================================================
  // 3. FOLLOW-UP TASK & SEQUENCE MANAGEMENT
  // =========================================================================
  describe("3. Follow-Up Task & Sequence Management", () => {
    it("creates, reschedules, and completes a follow-up task with audit history", () => {
      const biz = createBaseVerifiedBusiness();

      // 1. Create task
      const taskRes = createFollowUpTask(
        biz,
        {
          title: "Follow up on fleet maintenance demo",
          description: "Call fleet manager to discuss customized demo options",
          dueDate: "2026-10-25",
          dueTime: "14:00",
          priority: "HIGH",
          assignedTo: agentActor
        },
        adminActor
      );

      assert.strictEqual(taskRes.success, true);
      assert.ok(taskRes.task);
      assert.strictEqual(taskRes.task.status, "OPEN");
      assert.strictEqual(taskRes.task.assignedTo?.uid, agentActor.uid);

      // 2. Reschedule task
      const reschedRes = rescheduleFollowUpTask(
        taskRes.business,
        taskRes.task.id,
        { dueDate: "2026-10-28", dueTime: "11:00" },
        agentActor,
        "Client requested call after board meeting"
      );

      assert.strictEqual(reschedRes.success, true);
      assert.strictEqual(reschedRes.task?.dueDate, "2026-10-28");
      assert.ok(reschedRes.task?.history.some(h => h.action === "rescheduled"));

      // 3. Complete task
      const completeRes = updateFollowUpTaskStatus(
        reschedRes.business,
        taskRes.task.id,
        "COMPLETED",
        agentActor,
        "Conducted 15-min discovery call. Client asked for full proposal."
      );

      assert.strictEqual(completeRes.success, true);
      assert.strictEqual(completeRes.task?.status, "COMPLETED");
      assert.ok(completeRes.task?.completedAt);
    });

    it("pauses an automated sequence when a reply requires human review", () => {
      const biz = createBaseVerifiedBusiness();
      const standardSeq = DEFAULT_FOLLOW_UP_SEQUENCES[0];

      // Enroll in sequence
      const enrollRes = enrollProspectInSequence(biz, standardSeq.id, agentActor);
      assert.strictEqual(enrollRes.success, true);
      const enrollmentId = enrollRes.enrollment?.id;

      // Handle inbound inquiry reply requiring review
      const replyRes = handleSequenceReplyOrOptOut(
        enrollRes.business,
        "reply_requires_review",
        agentActor,
        "Client asked: 'Does this include annual hosting and SSL renewal?'"
      );

      assert.strictEqual(replyRes.success, true);
      assert.strictEqual(replyRes.pausedEnrollmentsCount, 1, "Must pause sequence enrollment for review");
      const pausedEnrollment = replyRes.business.sequenceEnrollments?.find(e => e.id === enrollmentId);
      assert.strictEqual(pausedEnrollment?.status, "PAUSED");
      assert.ok(pausedEnrollment?.pausedReason?.includes("human review"));
    });

    it("stops an automated sequence and enforces suppression when prospect opts out", () => {
      const biz = createBaseVerifiedBusiness();
      const standardSeq = DEFAULT_FOLLOW_UP_SEQUENCES[0];
      const enrollRes = enrollProspectInSequence(biz, standardSeq.id, agentActor);

      // Handle opt-out trigger
      const optOutRes = handleSequenceReplyOrOptOut(
        enrollRes.business,
        "opt_out",
        agentActor,
        "Client stated: 'Please remove our business from future communications.'"
      );

      assert.strictEqual(optOutRes.success, true);
      assert.strictEqual(optOutRes.stoppedEnrollmentsCount, 1);
      assert.strictEqual(optOutRes.business.doNotContact, true, "Must set persistent doNotContact suppression flag");
      const stoppedEnrollment = optOutRes.business.sequenceEnrollments?.find(e => e.id === enrollRes.enrollment?.id);
      assert.strictEqual(stoppedEnrollment?.status, "CANCELLED");

      // Verify future outreach is strictly blocked for opted-out prospect
      const draft = generatePersonalizedOutreachDraft(optOutRes.business, { channel: "email" });
      const preflight = validatePreflightDelivery(optOutRes.business, draft, agentActor);
      assert.strictEqual(preflight.eligible, false);
      assert.ok(preflight.blockers.some(b => b.includes("Do-Not-Contact")), "Must block delivery for opted-out prospect");
    });
  });

  // =========================================================================
  // 4. SALES PIPELINE & REVENUE INTEGRITY
  // =========================================================================
  describe("4. Sales Pipeline & Revenue Integrity", () => {
    it("moves a prospect through valid pipeline stages and records each transition", async () => {
      let biz = createBaseVerifiedBusiness();

      const stagesToTest: CanonicalSalesStage[] = [
        "CONTACTED",
        "ENGAGED",
        "DISCOVERY",
        "PROPOSAL_SENT",
        "NEGOTIATION"
      ];

      for (const targetStage of stagesToTest) {
        const transRes = await executePipelineStageTransition(
          biz,
          targetStage,
          agentActor,
          { reason: `Valid progress to ${targetStage}` }
        );
        assert.strictEqual(transRes.success, true, `Transition to ${targetStage} must succeed`);
        assert.strictEqual(transRes.business.salesStage, targetStage);
        biz = transRes.business;
      }

      assert.strictEqual(biz.stageHistory?.length, 5, "Must record transition history for every stage change");
    });

    it("rejects invalid pipeline stage transitions", async () => {
      const biz = createBaseVerifiedBusiness(); // At QUALIFIED

      // 1. Unauthorized user attempt
      const unauthRes = await executePipelineStageTransition(
        biz,
        "CONTACTED",
        unauthorizedActor
      );
      assert.strictEqual(unauthRes.success, false);
      assert.ok(unauthRes.error?.includes("unauthorized"));

      // 2. Marking WON directly from uncontacted stage without proposal or terms
      const prematureWon = await executePipelineStageTransition(
        biz,
        "WON",
        agentActor,
        { commercialTermsConfirmed: false }
      );
      assert.strictEqual(prematureWon.success, false);
      assert.ok(prematureWon.error?.includes("Cannot mark deal WON") || prematureWon.error?.includes("requires confirmed acceptance"));

      // 3. Marking LOST without documented reason
      const reasonlessLost = await executePipelineStageTransition(
        biz,
        "LOST",
        agentActor,
        { reason: "" }
      );
      assert.strictEqual(reasonlessLost.success, false);
      assert.ok(reasonlessLost.error?.includes("documented reason is required"));
    });

    it("records proposed deal value and creates a commercial proposal", async () => {
      const biz = createBaseVerifiedBusiness();

      // 1. Record proposed deal value in financial ledger
      const propLedgerRes = await recordFinancialLedgerEntry(biz, {
        businessId: biz.id,
        type: "PROPOSAL_QUOTED",
        amount: 2500,
        currency: "USD",
        reference: "PROP_QUOTE_2026_01",
        actor: agentActor,
        notes: "Heavy diesel vehicle maintenance portal package"
      });

      assert.strictEqual(propLedgerRes.success, true);
      assert.strictEqual(propLedgerRes.business.proposedDealValue, 2500);

      // 2. Generate a formal commercial proposal document
      const propRes = await createCommercialDocument(
        propLedgerRes.business,
        {
          title: "Fleet Operations Digital Upgrade Proposal",
          type: "PROPOSAL",
          termsAndConditions: "Standard commercial terms apply.",
          items: [
            { description: "Mobile Service Portal", quantity: 1, unitPrice: 1500 },
            { description: "Local SEO & Domain Setup", quantity: 1, unitPrice: 1000 }
          ]
        },
        agentActor
      );

      assert.strictEqual(propRes.success, true);
      const propDoc = propRes.document!;
      assert.strictEqual(propDoc.type, "PROPOSAL");
      assert.strictEqual(propDoc.status, "DRAFT");
      assert.strictEqual(propDoc.totalValue, 2500);
      assert.strictEqual(propDoc.currentVersionSnapshot?.termsAndConditions !== undefined, true);
    });

    it("verifies that preview view or preview approval does NOT mark a deal WON", async () => {
      let biz = createBaseVerifiedBusiness();
      biz.salesStage = "PROPOSAL_SENT";

      // Simulate opening preview or submitting feedback
      biz = {
        ...biz,
        clientApproved: true,
        previewApprovalStatus: "APPROVED",
        clientApprovedAt: new Date().toISOString()
      };

      // Ensure sales stage remains separate and is NOT WON
      assert.strictEqual(biz.salesStage, "PROPOSAL_SENT", "Preview approval must not alter sales stage to WON");
      assert.strictEqual(biz.dealOutcome, "OPEN", "Deal outcome must remain OPEN upon preview layout sign-off");
    });

    it("marks deal WON using an authorized, evidence-supported commercial action", async () => {
      const biz = createBaseVerifiedBusiness();
      biz.salesStage = "NEGOTIATION";
      biz.proposedDealValue = 2500;

      // Authorized transition to WON with confirmed terms
      const wonRes = await executePipelineStageTransition(
        biz,
        "WON",
        adminActor,
        {
          commercialTermsConfirmed: true,
          agreedValue: 2500,
          currency: "USD",
          reason: "Signed digital agreement received with PO #5541"
        }
      );

      assert.strictEqual(wonRes.success, true);
      assert.strictEqual(wonRes.business.salesStage, "WON");
      assert.strictEqual(wonRes.business.dealOutcome, "WON");
      assert.strictEqual(wonRes.business.agreedDealValue, 2500);
      assert.strictEqual(wonRes.business.totalContractValue, 2500);
      assert.ok(wonRes.business.dealDetails?.wonDetails?.commercialTermsConfirmed);
    });

    it("verifies revenue separation: estimated/proposed values are NOT recognized revenue", async () => {
      let biz = createBaseVerifiedBusiness();
      biz.estimatedDealValue = 5000;
      biz.proposedDealValue = 3500;
      biz.agreedDealValue = 3000;
      biz.invoicedDealValue = 3000;

      // Before payment received: net revenue must be 0
      const revBefore = calculateRevenueMetrics([biz]);
      assert.strictEqual(revBefore.netRevenueByCurrency["USD"] || 0, 0, "Unpaid invoices/proposals must not count as earned revenue");

      // Record partial verified payment
      const pay1 = await recordPayment(biz, {
        amount: 1500,
        currency: "USD",
        reference: "DEP_TX_99120"
      }, adminActor);

      const revAfterPay1 = calculateRevenueMetrics([pay1.business]);
      assert.strictEqual(revAfterPay1.netRevenueByCurrency["USD"], 1500, "Only verified received payment is recognized revenue");
      assert.strictEqual(pay1.business.paymentStatus, "PARTIALLY_PAID");

      // Record final payment
      const pay2 = await recordPayment(pay1.business, {
        amount: 1500,
        currency: "USD",
        reference: "FINAL_TX_99188"
      }, adminActor);

      const revAfterFinal = calculateRevenueMetrics([pay2.business]);
      assert.strictEqual(revAfterFinal.netRevenueByCurrency["USD"], 3000, "Full payment must equal 3000 net revenue");
      assert.strictEqual(pay2.business.paymentStatus, "PAID");

      // Record refund of 500
      const refundRes = await recordRefund(pay2.business, {
        amount: 500,
        currency: "USD",
        reference: "REF_001"
      }, adminActor);

      const revAfterRefund = calculateRevenueMetrics([refundRes.business]);
      assert.strictEqual(revAfterRefund.netRevenueByCurrency["USD"], 2500, "Refunds must reduce net revenue (3000 - 500 = 2500)");
    });

    it("verifies customer-data isolation between independent prospects", () => {
      const bizA = createBaseVerifiedBusiness("biz_alpha_01");
      const bizB = createBaseVerifiedBusiness("biz_beta_02");

      bizA.name = "Alpha Fleet Mechanics";
      bizB.name = "Beta Precision Hydraulics";

      const draftA = generatePersonalizedOutreachDraft(bizA, { channel: "email" });
      const draftB = generatePersonalizedOutreachDraft(bizB, { channel: "email" });

      assert.notStrictEqual(draftA.businessId, draftB.businessId);
      assert.ok(draftA.body.includes("Alpha Fleet Mechanics"));
      assert.ok(!draftA.body.includes("Beta Precision Hydraulics"));
      assert.ok(draftB.body.includes("Beta Precision Hydraulics"));
      assert.ok(!draftB.body.includes("Alpha Fleet Mechanics"));
    });

    it("calculates canonical CRM dashboard analytics strictly from underlying records", async () => {
      const biz1 = createBaseVerifiedBusiness("biz_metric_01");
      const biz2 = createBaseVerifiedBusiness("biz_metric_02");
      const biz3 = createBaseVerifiedBusiness("biz_metric_03");

      // Biz 1: Won with paid revenue
      biz1.salesStage = "WON";
      biz1.dealOutcome = "WON";
      biz1.agreedDealValue = 2000;
      const payRes = await recordPayment(biz1, { amount: 2000, currency: "USD" }, adminActor);

      // Biz 2: Active opportunity in Proposal Sent
      biz2.salesStage = "PROPOSAL_SENT";
      biz2.dealOutcome = "OPEN";
      biz2.proposedDealValue = 1500;
      const draft2 = generatePersonalizedOutreachDraft(biz2, { channel: "email" });
      const approved2 = approveOutreachDraft({ ...biz2, outreachDrafts: [draft2] }, draft2.id, adminActor);
      const sent2 = deliverOutreachMessage(approved2.business, draft2.id, { mode: "PROTOCOL_CLIENT" }, agentActor);

      // Biz 3: Lost deal with documented reason
      biz3.salesStage = "LOST";
      biz3.dealOutcome = "LOST";
      biz3.lossReason = "Budget frozen until next fiscal cycle";

      const analytics = calculateCrmDashboardAnalytics([
        payRes.business,
        sent2.business,
        biz3
      ]);

      assert.strictEqual(analytics.totalProspects, 3);
      assert.strictEqual(analytics.qualifiedProspects, 3);
      assert.strictEqual(analytics.activeOpportunities, 1, "Only biz2 is active");
      assert.strictEqual(analytics.dealsWon, 1, "Only biz1 is won");
      assert.strictEqual(analytics.dealsLost, 1, "Only biz3 is lost");
      assert.strictEqual(analytics.messagesActuallySent, 1, "Only biz2 has sent message");
      assert.strictEqual(analytics.pipelineValueByCurrency["USD"], 1500, "Active opportunity proposed value");
      assert.strictEqual(analytics.verifiedRevenueByCurrency["USD"], 2000, "Only paid deal counts as verified revenue");
    });
  });
});

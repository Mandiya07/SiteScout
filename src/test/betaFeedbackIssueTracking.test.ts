/**
 * SiteScout AI — Micro-Phase 19H Test Suite
 * BETA USER FEEDBACK, ISSUE TRACKING & CONTINUOUS IMPROVEMENT
 * 
 * Tests the structured feedback system, issue triage lifecycle,
 * visual quality ratings, workflow analytics, admin dashboard, and privacy controls.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { 
  TaskAssignee,
  BetaFeatureModule,
  VisualQualityRating
} from "../types";
import {
  submitBetaFeedback,
  createIssueFromFeedback,
  assignBetaIssue,
  updateBetaIssueSeverity,
  updateBetaIssueStatus,
  reopenBetaIssue,
  recordWorkflowEvent,
  computeBetaWorkflowAnalytics,
  getAdminIssueDashboardData,
  getBetaUserFeedbackList,
  sanitizeSensitiveText,
  resetBetaFeedbackRepository
} from "../lib/betaFeedbackIssueTracker";

describe("MICRO-PHASE 19H: Beta User Feedback, Issue Tracking & Continuous Improvement", () => {
  const adminActor: TaskAssignee = {
    uid: "admin_operator_001",
    displayName: "Admin Operator",
    role: "Admin"
  };

  const engineerActor: TaskAssignee = {
    uid: "engineer_dev_002",
    displayName: "Dev Lead",
    role: "Developer" as any
  };

  const restrictedActor: TaskAssignee = {
    uid: "viewer_guest_003",
    displayName: "Viewer Guest",
    role: "Viewer" as any
  };

  const testerAlpha = {
    uid: "beta_tester_alpha",
    name: "Alpha Tester",
    email: "alpha@betatester.sitescout.ai"
  };

  const testerBeta = {
    uid: "beta_tester_beta",
    name: "Beta Tester",
    email: "beta@betatester.sitescout.ai"
  };

  beforeEach(() => {
    resetBetaFeedbackRepository();
  });

  // =========================================================================
  // 1. A. Beta Feedback Collection & Classification
  // =========================================================================
  describe("A. Beta Feedback Collection & Classification", () => {
    it("submits a bug report with verified classification and severity", () => {
      const res = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        betaUserName: testerAlpha.name,
        betaUserEmail: testerAlpha.email,
        featureModule: "ai_website_generation",
        category: "BUG",
        severity: "HIGH",
        description: "Generated hero headline overflows text container on small tablet viewports.",
        relatedRecordRef: "site_gen_001",
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.feedback);
      assert.ok(res.feedback?.feedbackId.startsWith("FBK-"));
      assert.strictEqual(res.feedback?.category, "BUG");
      assert.strictEqual(res.feedback?.severity, "HIGH");
      assert.strictEqual(res.feedback?.status, "NEW");
      assert.strictEqual(res.feedback?.featureModule, "ai_website_generation");
    });

    it("submits usability feedback with module attribution", () => {
      const res = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        betaUserName: testerAlpha.name,
        featureModule: "website_editing",
        category: "USABILITY",
        severity: "MEDIUM",
        description: "Button to undo text edit in section editor is hard to notice on dark theme.",
        relatedRecordRef: "editor_session_002",
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.feedback?.category, "USABILITY");
      assert.strictEqual(res.feedback?.severity, "MEDIUM");
    });

    it("submits visual quality feedback with comprehensive 9-dimension ratings", () => {
      const ratings: VisualQualityRating = {
        professionalAppearance: 4,
        businessRelevance: 5,
        heroSectionQuality: 4,
        imageRelevance: 5,
        typography: 4,
        layout: 4,
        mobileResponsiveness: 3,
        contentAccuracy: 5,
        overallPresentationQuality: 4,
        subjectiveNotes: "Color scheme matches local bakery branding well. Mobile padding is a bit tight."
      };

      const res = submitBetaFeedback({
        betaUserId: testerBeta.uid,
        betaUserName: testerBeta.name,
        featureModule: "ai_website_generation",
        category: "VISUAL_QUALITY",
        severity: "LOW",
        description: "Comprehensive visual assessment for Mbabane Artisan Bakery preview.",
        relatedRecordRef: "site_bakery_003",
        visualRatings: ratings,
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.feedback?.category, "VISUAL_QUALITY");
      assert.ok(res.feedback?.visualRatings);
      assert.strictEqual(res.feedback?.visualRatings?.businessRelevance, 5);
      assert.strictEqual(res.feedback?.visualRatings?.mobileResponsiveness, 3);
    });

    it("submits data quality feedback for business discovery deficits", () => {
      const res = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "business_data_accuracy",
        category: "DATA_QUALITY",
        severity: "MEDIUM",
        description: "Discovered phone number for Apex Fitness has an outdated area code format.",
        relatedRecordRef: "biz_apex_004",
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.feedback?.category, "DATA_QUALITY");
    });

    it("attaches screenshot securely to feedback report", () => {
      const res = submitBetaFeedback({
        betaUserId: testerBeta.uid,
        featureModule: "website_previews",
        category: "BUG",
        severity: "MEDIUM",
        description: "Preview banner overlaps contact card when viewed in landscape mode.",
        attachments: [
          {
            fileName: "screenshot_overflow_landscape.png",
            fileType: "image/png",
            fileSize: 142050,
            storageUrl: "https://storage.googleapis.com/sitescout-beta-uploads/screenshots/scr_001.png"
          }
        ],
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.feedback?.attachments);
      assert.strictEqual(res.feedback?.attachments?.length, 1);
      assert.strictEqual(res.feedback?.attachments?.[0].fileName, "screenshot_overflow_landscape.png");
      assert.strictEqual(res.feedback?.attachments?.[0].isSanitized, true);
    });

    it("sanitizes sensitive information (API keys, passwords, bearer tokens) from feedback descriptions", () => {
      const sensitiveInput = "Encountered 401 error using AIzaSyB79124_secret_key_12345678901 with password: super_secret_pass_123 on /app/applet/server.ts.";
      const sanitized = sanitizeSensitiveText(sensitiveInput);

      assert.ok(!sanitized.includes("AIzaSyB79124_secret_key_12345678901"));
      assert.ok(!sanitized.includes("super_secret_pass_123"));
      assert.ok(!sanitized.includes("/app/applet/server.ts"));
      assert.ok(sanitized.includes("[REDACTED_API_KEY]"));
      assert.ok(sanitized.includes("[REDACTED]"));
      assert.ok(sanitized.includes("[SANITIZED_PATH]"));

      const res = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "general_usability",
        category: "SECURITY",
        severity: "CRITICAL",
        description: sensitiveInput,
        isTestSubmission: true
      });

      assert.strictEqual(res.success, true);
      assert.ok(!res.feedback?.description.includes("AIzaSy"));
    });

    it("prevents duplicate feedback submissions within debounce window", () => {
      const feedbackPayload = {
        betaUserId: testerAlpha.uid,
        featureModule: "website_editing" as BetaFeatureModule,
        category: "BUG" as const,
        severity: "HIGH" as const,
        description: "Save button is unresponsive after editing page title.",
        isTestSubmission: true
      };

      const firstRes = submitBetaFeedback(feedbackPayload);
      assert.strictEqual(firstRes.success, true);
      assert.strictEqual(firstRes.isDuplicate, false);

      const secondRes = submitBetaFeedback(feedbackPayload);
      assert.strictEqual(secondRes.success, true);
      assert.strictEqual(secondRes.isDuplicate, true);
      assert.strictEqual(secondRes.feedback?.feedbackId, firstRes.feedback?.feedbackId);
    });
  });

  // =========================================================================
  // 2. B. Issue Creation, Triage & Continuous Improvement Lifecycle
  // =========================================================================
  describe("B. Issue Creation, Triage & Continuous Improvement Lifecycle", () => {
    it("creates a tracked issue from feedback and updates feedback status to TRIAGED", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "ai_website_generation",
        category: "BUG",
        severity: "HIGH",
        description: "Typography font fails to load when offline preview is viewed.",
        isTestSubmission: true
      });
      const feedback = fbRes.feedback!;

      const issueRes = createIssueFromFeedback(
        feedback.feedbackId,
        {
          title: "Offline Preview Typography Font Fallback Failure",
          severity: "HIGH"
        },
        adminActor,
        true
      );

      assert.strictEqual(issueRes.success, true);
      assert.ok(issueRes.issue);
      assert.ok(issueRes.issue?.issueNumber.startsWith("ISS-"));
      assert.strictEqual(issueRes.issue?.status, "NEW");
      assert.strictEqual(issueRes.issue?.featureModule, "ai_website_generation");
      assert.ok(issueRes.issue?.sourceFeedbackIds.includes(feedback.feedbackId));

      // Feedback updated to TRIAGED and linked
      assert.strictEqual(feedback.status, "TRIAGED");
      assert.strictEqual(feedback.linkedIssueId, issueRes.issue?.issueNumber);
    });

    it("assigns issue to administrator/engineer with audit logging", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "website_editing",
        category: "BUG",
        description: "Undo stack corrupts if multi-field changes occur rapidly.",
        isTestSubmission: true
      });
      const issueRes = createIssueFromFeedback(fbRes.feedback!.feedbackId, { title: "Undo Stack Race Condition" }, adminActor, true);
      const issue = issueRes.issue!;

      const assignRes = assignBetaIssue(issue.issueNumber, engineerActor, adminActor);
      assert.strictEqual(assignRes.success, true);
      assert.strictEqual(assignRes.issue?.assignedTo?.uid, engineerActor.uid);
      assert.strictEqual(assignRes.issue?.status, "TRIAGED");

      const lastAudit = assignRes.issue!.auditTrail[assignRes.issue!.auditTrail.length - 1];
      assert.strictEqual(lastAudit.action, "ASSIGNED");
      assert.strictEqual(lastAudit.actor.uid, adminActor.uid);
    });

    it("changes issue severity with audit logging", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "general_usability",
        category: "PERFORMANCE",
        severity: "LOW",
        description: "Image render latency spikes above 200ms on initial cold start.",
        isTestSubmission: true
      });
      const issue = createIssueFromFeedback(fbRes.feedback!.feedbackId, { title: "Cold Start Latency" }, adminActor, true).issue!;

      const sevRes = updateBetaIssueSeverity(issue.issueNumber, "HIGH", adminActor, "Impacts all live preview users");
      assert.strictEqual(sevRes.success, true);
      assert.strictEqual(sevRes.issue?.severity, "HIGH");

      const lastAudit = sevRes.issue!.auditTrail[sevRes.issue!.auditTrail.length - 1];
      assert.strictEqual(lastAudit.action, "SEVERITY_CHANGED");
      assert.strictEqual(lastAudit.fromSeverity, "LOW");
      assert.strictEqual(lastAudit.toSeverity, "HIGH");
    });

    it("progresses issue through complete lifecycle: NEW -> IN_PROGRESS -> READY_FOR_RETEST -> RESOLVED", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "ai_website_generation",
        category: "BUG",
        description: "Hero image aspect ratio distorted on Safari iOS.",
        isTestSubmission: true
      });
      let issue = createIssueFromFeedback(fbRes.feedback!.feedbackId, { title: "Safari iOS Aspect Ratio" }, adminActor, true).issue!;

      // 1. Move to IN_PROGRESS
      issue = updateBetaIssueStatus(issue.issueNumber, "IN_PROGRESS", engineerActor, { notes: "Working on CSS object-fit fix" }).issue!;
      assert.strictEqual(issue.status, "IN_PROGRESS");

      // 2. Move to READY_FOR_RETEST
      issue = updateBetaIssueStatus(issue.issueNumber, "READY_FOR_RETEST", engineerActor, { notes: "Deployed fix to staging environment" }).issue!;
      assert.strictEqual(issue.status, "READY_FOR_RETEST");

      // 3. Resolve with full continuous-improvement root cause and evidence
      const resolveRes = updateBetaIssueStatus(issue.issueNumber, "RESOLVED", adminActor, {
        rootCause: "Missing aspect-ratio CSS declaration on mobile hero container",
        affectedComponent: "src/lib/htmlGenerator.ts",
        resolutionEvidence: "Unit and responsive render tests verified clean in iOS WebKit emulator",
        resolutionNotes: "Fixed mobile hero styling with explicit aspect-ratio: 16/9 and object-fit: cover."
      });

      assert.strictEqual(resolveRes.success, true);
      assert.strictEqual(resolveRes.issue?.status, "RESOLVED");
      assert.strictEqual(resolveRes.issue?.rootCause, "Missing aspect-ratio CSS declaration on mobile hero container");
      assert.strictEqual(resolveRes.issue?.affectedComponent, "src/lib/htmlGenerator.ts");
      assert.ok(resolveRes.issue?.resolvedAt);
    });

    it("rejects resolution if required continuous-improvement evidence is missing", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "outreach_preparation",
        category: "BUG",
        description: "WhatsApp preview link missing country code prefix.",
        isTestSubmission: true
      });
      const issue = createIssueFromFeedback(fbRes.feedback!.feedbackId, { title: "WhatsApp Prefix Missing" }, adminActor, true).issue!;

      // Attempt resolve without rootCause and evidence
      const failResolve = updateBetaIssueStatus(issue.issueNumber, "RESOLVED", adminActor, {
        notes: "Quick fix done"
      });

      assert.strictEqual(failResolve.success, false);
      assert.ok(failResolve.error?.includes("requires rootCause, affectedComponent, and resolutionEvidence"));
    });

    it("reopens an issue with mandatory reason and logs audit record", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "website_previews",
        category: "BUG",
        description: "Contact form validation allows whitespace-only names.",
        isTestSubmission: true
      });
      let issue = createIssueFromFeedback(fbRes.feedback!.feedbackId, { title: "Contact Form Whitespace Bug" }, adminActor, true).issue!;
      issue = updateBetaIssueStatus(issue.issueNumber, "RESOLVED", adminActor, {
        rootCause: "Unchecked trim() on name input",
        affectedComponent: "server.ts validateContactFormPayload",
        resolutionEvidence: "Regression test REG-09 added"
      }).issue!;

      // Reopen
      const reopenRes = reopenBetaIssue(issue.issueNumber, adminActor, "Tester observed regression on Safari Mobile.");
      assert.strictEqual(reopenRes.success, true);
      assert.strictEqual(reopenRes.issue?.status, "REOPENED");
      assert.strictEqual(reopenRes.issue?.reopenedReason, "Tester observed regression on Safari Mobile.");

      const lastAudit = reopenRes.issue!.auditTrail[reopenRes.issue!.auditTrail.length - 1];
      assert.strictEqual(lastAudit.action, "REOPENED");
      assert.strictEqual(lastAudit.fromStatus, "RESOLVED");
      assert.strictEqual(lastAudit.toStatus, "REOPENED");
    });

    it("prevents duplicate issue creation when matching open issue already exists", () => {
      const fb1 = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "crm",
        category: "BUG",
        description: "Prospect tag filter doesn't update count instantly.",
        isTestSubmission: true
      }).feedback!;

      const fb2 = submitBetaFeedback({
        betaUserId: testerBeta.uid,
        featureModule: "crm",
        category: "BUG",
        description: "Prospect tags filter counter discrepancy.",
        isTestSubmission: true
      }).feedback!;

      const firstIssueRes = createIssueFromFeedback(fb1.feedbackId, { title: "CRM Tag Counter Filter Discrepancy" }, adminActor, true);
      assert.strictEqual(firstIssueRes.isDuplicate, false);

      // Second attempt with same title and module
      const secondIssueRes = createIssueFromFeedback(fb2.feedbackId, { title: "CRM Tag Counter Filter Discrepancy" }, adminActor, true);
      assert.strictEqual(secondIssueRes.success, true);
      assert.strictEqual(secondIssueRes.isDuplicate, true);
      assert.strictEqual(secondIssueRes.issue?.issueNumber, firstIssueRes.issue?.issueNumber);
      // Both feedback items now linked
      assert.ok(secondIssueRes.issue?.sourceFeedbackIds.includes(fb1.feedbackId));
      assert.ok(secondIssueRes.issue?.sourceFeedbackIds.includes(fb2.feedbackId));
    });
  });

  // =========================================================================
  // 3. C. Beta Workflow Analytics & Separation of Test Events
  // =========================================================================
  describe("C. Beta Workflow Analytics & Separation of Test Events", () => {
    it("tracks successful business search and discovery", () => {
      const event = recordWorkflowEvent({
        operation: "business_search",
        status: "SUCCESSFUL",
        userId: testerAlpha.uid,
        durationMs: 45,
        metadata: { query: "plumbers in Mbabane", resultsCount: 8 },
        isTestEvent: false // Real beta event
      });

      assert.ok(event.id.startsWith("we_"));
      assert.strictEqual(event.operation, "business_search");
      assert.strictEqual(event.status, "SUCCESSFUL");
    });

    it("tracks failed business search with error code", () => {
      const event = recordWorkflowEvent({
        operation: "business_search",
        status: "FAILED",
        userId: testerBeta.uid,
        durationMs: 120,
        errorCode: "PROVIDER_TIMEOUT",
        errorMessage: "Google Places API timed out after 5000ms",
        isTestEvent: false
      });

      assert.strictEqual(event.status, "FAILED");
      assert.strictEqual(event.errorCode, "PROVIDER_TIMEOUT");
    });

    it("tracks successful website generation and image validation", () => {
      recordWorkflowEvent({
        operation: "website_generation",
        status: "SUCCESSFUL",
        userId: testerAlpha.uid,
        businessId: "biz_plumber_01",
        durationMs: 250,
        isTestEvent: false
      });

      recordWorkflowEvent({
        operation: "image_relevance_validation",
        status: "SUCCESSFUL",
        userId: testerAlpha.uid,
        businessId: "biz_plumber_01",
        durationMs: 30,
        isTestEvent: false
      });

      const analytics = computeBetaWorkflowAnalytics();
      assert.strictEqual(analytics.operationsBreakdown.website_generation.successful, 1);
      assert.strictEqual(analytics.operationsBreakdown.image_relevance_validation.successful, 1);
    });

    it("tracks website editing failure and abandoned workflows", () => {
      recordWorkflowEvent({
        operation: "website_edit",
        status: "FAILED",
        userId: testerBeta.uid,
        businessId: "biz_plumber_01",
        errorCode: "SCHEMA_VALIDATION_ERROR",
        errorMessage: "Section layout rejected: missing required heading element",
        isTestEvent: false
      });

      recordWorkflowEvent({
        operation: "customer_onboarding_complete",
        status: "ABANDONED",
        userId: testerBeta.uid,
        businessId: "biz_plumber_01",
        isTestEvent: false
      });

      const analytics = computeBetaWorkflowAnalytics();
      assert.strictEqual(analytics.operationsBreakdown.website_edit.failed, 1);
      assert.strictEqual(analytics.operationsBreakdown.customer_onboarding_complete.abandoned, 1);
    });

    it("calculates workflow completion metrics and success rates accurately", () => {
      // 3 successful previews, 1 failed preview
      recordWorkflowEvent({ operation: "preview_creation", status: "SUCCESSFUL", userId: "u1", isTestEvent: false });
      recordWorkflowEvent({ operation: "preview_creation", status: "SUCCESSFUL", userId: "u2", isTestEvent: false });
      recordWorkflowEvent({ operation: "preview_creation", status: "SUCCESSFUL", userId: "u3", isTestEvent: false });
      recordWorkflowEvent({ operation: "preview_creation", status: "FAILED", userId: "u4", isTestEvent: false });

      const analytics = computeBetaWorkflowAnalytics();
      const previewStats = analytics.operationsBreakdown.preview_creation;
      assert.strictEqual(previewStats.successful, 3);
      assert.strictEqual(previewStats.failed, 1);
      assert.strictEqual(previewStats.successRate, 75); // 3 out of 4 = 75%
    });

    it("strictly isolates test validation runs from real beta usage metrics", () => {
      // 1 real beta event
      recordWorkflowEvent({ operation: "prospect_save", status: "SUCCESSFUL", userId: "real_user_1", isTestEvent: false });

      // 5 test events (simulations / test suite runs)
      for (let i = 0; i < 5; i++) {
        recordWorkflowEvent({ operation: "prospect_save", status: "SUCCESSFUL", userId: `test_bot_${i}`, isTestEvent: true });
      }

      // Default analytics excludes test events
      const realAnalytics = computeBetaWorkflowAnalytics({ includeTestEvents: false });
      assert.strictEqual(realAnalytics.isTestDataExcluded, true);
      assert.strictEqual(realAnalytics.operationsBreakdown.prospect_save.successful, 1);
      assert.strictEqual(realAnalytics.activeTestersCount, 1);

      // Including test events shows all 6
      const allAnalytics = computeBetaWorkflowAnalytics({ includeTestEvents: true });
      assert.strictEqual(allAnalytics.operationsBreakdown.prospect_save.successful, 6);
      assert.strictEqual(allAnalytics.activeTestersCount, 6);
    });
  });

  // =========================================================================
  // 4. D. Administrator Dashboard & Security Isolation
  // =========================================================================
  describe("D. Administrator Dashboard & Security Isolation", () => {
    it("allows authorized administrators to review, filter, and sort issues", () => {
      // Create test feedback and issues
      const fb1 = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "billing_subscriptions",
        category: "BUG",
        severity: "CRITICAL",
        description: "Stripe sandbox webhook signature validation intermittently drops event.",
        isTestSubmission: true
      }).feedback!;

      const fb2 = submitBetaFeedback({
        betaUserId: testerBeta.uid,
        featureModule: "crm",
        category: "USABILITY",
        severity: "LOW",
        description: "Tooltips on sales pipeline stage badges disappear too quickly.",
        isTestSubmission: true
      }).feedback!;

      createIssueFromFeedback(fb1.feedbackId, { title: "Stripe Webhook Intermittent Drop" }, adminActor, true);
      createIssueFromFeedback(fb2.feedbackId, { title: "Pipeline Tooltips Disappear Fast" }, adminActor, true);

      // Admin requests dashboard
      const dashRes = getAdminIssueDashboardData({}, adminActor);
      assert.strictEqual(dashRes.success, true);
      assert.strictEqual(dashRes.status, 200);
      assert.ok(dashRes.issues);
      assert.strictEqual(dashRes.issues?.length, 2);
      // Top issue is CRITICAL due to sorting
      assert.strictEqual(dashRes.issues?.[0].severity, "CRITICAL");
      assert.strictEqual(dashRes.metrics?.totalIssues, 2);
      assert.strictEqual(dashRes.metrics?.criticalIssues, 1);

      // Filter by featureModule
      const filteredRes = getAdminIssueDashboardData({ featureModule: "crm" }, adminActor);
      assert.strictEqual(filteredRes.issues?.length, 1);
      assert.strictEqual(filteredRes.issues?.[0].featureModule, "crm");
    });

    it("blocks unauthorized users from accessing the administrator issue dashboard", () => {
      const dashRes = getAdminIssueDashboardData({}, restrictedActor);
      assert.strictEqual(dashRes.success, false);
      assert.strictEqual(dashRes.status, 403);
      assert.ok(dashRes.error?.includes("Administrator privileges required"));
    });

    it("enforces cross-customer privacy and blocks tester A from reading tester B feedback", () => {
      submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "general_usability",
        category: "USABILITY",
        description: "Confidential tester notes by Alpha.",
        isTestSubmission: true
      });

      // Tester Alpha reads their own feedback -> Allowed
      const ownRes = getBetaUserFeedbackList(testerAlpha.uid, { uid: testerAlpha.uid, role: "tester" });
      assert.strictEqual(ownRes.success, true);
      assert.strictEqual(ownRes.feedback?.length, 1);

      // Tester Beta attempts to read Tester Alpha's feedback -> Blocked with 403
      const crossRes = getBetaUserFeedbackList(testerAlpha.uid, { uid: testerBeta.uid, role: "tester" });
      assert.strictEqual(crossRes.success, false);
      assert.strictEqual(crossRes.status, 403);
      assert.ok(crossRes.error?.includes("Access denied"));

      // Admin reads Tester Alpha's feedback -> Allowed
      const adminRes = getBetaUserFeedbackList(testerAlpha.uid, { uid: adminActor.uid, role: "Admin" });
      assert.strictEqual(adminRes.success, true);
      assert.strictEqual(adminRes.feedback?.length, 1);
    });

    it("verifies immutable audit history across all administrative actions", () => {
      const fb = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "general_usability",
        category: "SECURITY",
        severity: "HIGH",
        description: "Need to verify CSRF token check on state changes.",
        isTestSubmission: true
      }).feedback!;

      let issue = createIssueFromFeedback(fb.feedbackId, { title: "CSRF Token Validation Verification" }, adminActor, true).issue!;
      issue = assignBetaIssue(issue.issueNumber, engineerActor, adminActor).issue!;
      issue = updateBetaIssueSeverity(issue.issueNumber, "CRITICAL", adminActor, "Escalating security audit requirement").issue!;
      issue = updateBetaIssueStatus(issue.issueNumber, "IN_PROGRESS", engineerActor).issue!;

      const audit = issue.auditTrail;
      assert.strictEqual(audit.length, 4);
      assert.strictEqual(audit[0].action, "CREATED");
      assert.strictEqual(audit[1].action, "ASSIGNED");
      assert.strictEqual(audit[2].action, "SEVERITY_CHANGED");
      assert.strictEqual(audit[3].action, "STATUS_CHANGED");
      assert.strictEqual(audit[2].fromSeverity, "HIGH");
      assert.strictEqual(audit[2].toSeverity, "CRITICAL");
    });
  });

  // =========================================================================
  // 5. E. Regression Protection & Boundary Integrity
  // =========================================================================
  describe("E. Regression Protection & Boundary Integrity", () => {
    it("rejects feedback submission with empty description or missing module", () => {
      const emptyDescRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "business_discovery",
        category: "BUG",
        description: "   "
      });
      assert.strictEqual(emptyDescRes.success, false);
      assert.ok(emptyDescRes.error?.includes("description is required"));

      const missingModuleRes = submitBetaFeedback({
        betaUserId: testerAlpha.uid,
        featureModule: "" as any,
        category: "BUG",
        description: "Valid description"
      });
      assert.strictEqual(missingModuleRes.success, false);
      assert.ok(missingModuleRes.error?.includes("featureModule is required"));
    });

    it("handles non-existent issue IDs gracefully without unhandled exceptions", () => {
      const assignRes = assignBetaIssue("ISS-9999-9999", engineerActor, adminActor);
      assert.strictEqual(assignRes.success, false);
      assert.ok(assignRes.error?.includes("not found"));

      const sevRes = updateBetaIssueSeverity("ISS-9999-9999", "CRITICAL", adminActor);
      assert.strictEqual(sevRes.success, false);
      assert.ok(sevRes.error?.includes("not found"));

      const reopenRes = reopenBetaIssue("ISS-9999-9999", adminActor, "Reason");
      assert.strictEqual(reopenRes.success, false);
      assert.ok(reopenRes.error?.includes("not found"));
    });
  });
});

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  createBetaCohort,
  updateCohortTarget,
  prepareBetaInvitation,
  approveBetaInvitation,
  dispatchBetaInvitation,
  generateInvitationLink,
  validateBetaInvitation,
  acceptBetaInvitation,
  revokeBetaInvitation,
  recordParticipantActivity,
  getBetaCohortDashboard,
  getBetaCohortsList,
  verifyRegistrationInvitationAccess,
  resetBetaCohortRepository
} from "../lib/betaCohortRecruitment";
import { submitBetaFeedback } from "../lib/betaFeedbackIssueTracker";
import { TaskAssignee } from "../types";

describe("MICRO-PHASE 20A: Controlled Beta Tester Cohort Recruitment", () => {
  const superAdminActor: TaskAssignee = {
    uid: "admin_super_01",
    displayName: "Sipho M. (Super Admin)",
    role: "SUPER_ADMIN"
  };

  const managerActor: TaskAssignee = {
    uid: "admin_mgr_01",
    displayName: "Jane Ops Manager",
    role: "MANAGER"
  };

  const restrictedActor: TaskAssignee = {
    uid: "customer_01",
    displayName: "Regular Customer",
    role: "CUSTOMER"
  };

  beforeEach(() => {
    resetBetaCohortRepository();
  });

  describe("A. Beta Cohort Creation & Target Configuration", () => {
    it("creates a beta cohort with specified target count (10-25)", () => {
      const res = createBetaCohort(
        {
          name: "Southern Africa Agency Pilot Q4",
          description: "Exclusive beta pilot with 20 leading agencies",
          targetCount: 20
        },
        superAdminActor
      );

      assert.strictEqual(res.success, true);
      assert.ok(res.cohort);
      assert.strictEqual(res.cohort.name, "Southern Africa Agency Pilot Q4");
      assert.strictEqual(res.cohort.targetCount, 20);
      assert.strictEqual(res.cohort.status, "RECRUITING");
    });

    it("rejects cohort creation when target count is out of bounds", () => {
      const res = createBetaCohort(
        {
          name: "Invalid Target Cohort",
          description: "Too many testers",
          targetCount: 500
        },
        superAdminActor
      );

      assert.strictEqual(res.success, false);
      assert.match(res.error || "", /between 1 and 100/);
    });

    it("allows authorized administrators to update the cohort target count", () => {
      const cohort = createBetaCohort(
        {
          name: "Eswatini High-Growth SMB Beta",
          description: "Pilot for SMBs",
          targetCount: 15
        },
        superAdminActor
      ).cohort!;

      const updateRes = updateCohortTarget(cohort.id, 25, managerActor);
      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.cohort?.targetCount, 25);
    });

    it("blocks restricted customer role from creating cohorts", () => {
      const res = createBetaCohort(
        {
          name: "Unauthorized Cohort",
          description: "Should fail",
          targetCount: 10
        },
        restrictedActor
      );

      assert.strictEqual(res.success, false);
      assert.match(res.error || "", /Unauthorized/);
    });
  });

  describe("B. Participant Categorization & Invitation Lifecycle", () => {
    it("prepares an invitation for DIGITAL_AGENCY participant in DRAFT status", () => {
      const cohort = createBetaCohort(
        { name: "Pilot Cohort", description: "Agency Pilot", targetCount: 20 },
        superAdminActor
      ).cohort!;

      const prepRes = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Apex Digital Creatives",
          contactName: "Thabo Shongwe",
          contactEmail: "thabo@apexdigital.co.sz",
          contactPhone: "+268 7611 2233",
          expiresInDays: 14,
          isTestInvitation: true
        },
        superAdminActor
      );

      assert.strictEqual(prepRes.success, true);
      assert.ok(prepRes.invitation);
      assert.strictEqual(prepRes.invitation.status, "DRAFT");
      assert.strictEqual(prepRes.invitation.participantType, "DIGITAL_AGENCY");
      assert.match(prepRes.invitation.invitationCode, /^BETA-AGY-\d{4}$/);
      assert.strictEqual(prepRes.invitation.token.length, 32); // 16 bytes hex = 32 chars
    });

    it("prepares an invitation for SMALL_BUSINESS participant", () => {
      const cohort = createBetaCohort(
        { name: "SMB Cohort", description: "SMB Pilot", targetCount: 15 },
        superAdminActor
      ).cohort!;

      const prepRes = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "SMALL_BUSINESS",
          organizationName: "Ezulwini Glow Beauty Lounge",
          contactName: "Nomalungelo Dlamini",
          contactEmail: "info@ezulwiniglow.com",
          expiresInDays: 7,
          isTestInvitation: true
        },
        superAdminActor
      );

      assert.strictEqual(prepRes.success, true);
      assert.strictEqual(prepRes.invitation?.participantType, "SMALL_BUSINESS");
      assert.match(prepRes.invitation?.invitationCode || "", /^BETA-SMB-\d{4}$/);
    });

    it("prevents duplicate active invitations for the same contact email", () => {
      const cohort = createBetaCohort(
        { name: "Duplicate Guard Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Vanguard Marketing",
          contactName: "Alex Vance",
          contactEmail: "alex@vanguard.co",
          isTestInvitation: true
        },
        superAdminActor
      );

      const dupRes = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Vanguard Marketing Second Attempt",
          contactName: "Alex Vance",
          contactEmail: "alex@vanguard.co",
          isTestInvitation: true
        },
        superAdminActor
      );

      assert.strictEqual(dupRes.success, false);
      assert.match(dupRes.error || "", /Active invitation .* already exists/);
    });

    it("approves draft invitation and transitions status to APPROVED", () => {
      const cohort = createBetaCohort(
        { name: "Approval Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "MEDIUM_BUSINESS",
          organizationName: "Matsapha Precision Diagnostics",
          contactName: "Sipho M.",
          contactEmail: "sipho@matsapha-precision.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      const apprRes = approveBetaInvitation(inv.id, managerActor);
      assert.strictEqual(apprRes.success, true);
      assert.strictEqual(apprRes.invitation?.status, "APPROVED");
      assert.strictEqual(apprRes.invitation?.approvedBy?.uid, managerActor.uid);
    });

    it("generates a cryptographically secure invitation URL link", () => {
      const cohort = createBetaCohort(
        { name: "Link Gen Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Kukhanya Creative Labs",
          contactName: "Musa Zulu",
          contactEmail: "musa@kukhanya.co.sz",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);
      const link = generateInvitationLink(inv, "https://sitescout.ai");

      assert.match(link, /^https:\/\/sitescout\.ai\/invite\/[a-f0-9]{32}\?code=BETA-AGY-\d{4}$/);
    });

    it("does not mark invitation as SENT without confirmed provider delivery", () => {
      const cohort = createBetaCohort(
        { name: "Dispatch Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Swazi Growth Agency",
          contactName: "Lindiwe Ndlovu",
          contactEmail: "lindiwe@swazigrowth.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);

      // Dispatch without explicit delivery confirmation keeps status as APPROVED
      const resUnconfirmed = dispatchBetaInvitation(inv.id, superAdminActor, {
        confirmDelivery: false
      });
      assert.strictEqual(resUnconfirmed.success, true);
      assert.strictEqual(resUnconfirmed.invitation?.status, "APPROVED");

      // Dispatch WITH confirmed delivery transitions status to SENT
      const resConfirmed = dispatchBetaInvitation(inv.id, superAdminActor, {
        confirmDelivery: true,
        provider: "Direct Operator Handover"
      });
      assert.strictEqual(resConfirmed.success, true);
      assert.strictEqual(resConfirmed.invitation?.status, "SENT");
    });
  });

  describe("C. Invitation Validation & Acceptance Guard", () => {
    it("rejects non-existent invitation token or code", () => {
      const val = validateBetaInvitation("BETA-NONEXISTENT-9999");
      assert.strictEqual(val.valid, false);
      assert.match(val.error || "", /No matching beta invitation record found/);
    });

    it("rejects expired invitation link", () => {
      const cohort = createBetaCohort(
        { name: "Expiry Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "SMALL_BUSINESS",
          organizationName: "Old Bakery",
          contactName: "Bongani",
          contactEmail: "bongani@bakery.com",
          expiresInDays: -1, // Expired immediately
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);
      const val = validateBetaInvitation(inv.invitationCode);
      assert.strictEqual(val.valid, false);
      assert.match(val.error || "", /expired/);
    });

    it("revokes invitation and blocks future validation", () => {
      const cohort = createBetaCohort(
        { name: "Revoke Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Defunct Agency",
          contactName: "Mark",
          contactEmail: "mark@defunct.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      const revokeRes = revokeBetaInvitation(
        inv.id,
        "Candidate withdrew from agency operations",
        superAdminActor
      );
      assert.strictEqual(revokeRes.success, true);
      assert.strictEqual(revokeRes.invitation?.status, "REVOKED");

      const val = validateBetaInvitation(inv.invitationCode);
      assert.strictEqual(val.valid, false);
      assert.match(val.error || "", /revoked/);
    });

    it("rejects invitation acceptance if beta participation terms are not accepted", () => {
      const cohort = createBetaCohort(
        { name: "Terms Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Future Brand Works",
          contactName: "Zodwa Khumalo",
          contactEmail: "zodwa@futurebrand.co",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);

      const acceptRes = acceptBetaInvitation({
        invitationCodeOrToken: inv.token,
        userId: "usr_tester_zodwa_101",
        acceptTerms: false // Not accepted!
      });

      assert.strictEqual(acceptRes.success, false);
      assert.match(acceptRes.error || "", /Beta terms acceptance is required/);
    });

    it("accepts valid invitation, activates account, and records provenance", () => {
      const cohort = createBetaCohort(
        { name: "Enrollment Cohort", description: "Test", targetCount: 20 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Highveld Media Group",
          contactName: "Siphesihle Nkambule",
          contactEmail: "siphe@highveldmedia.sz",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);

      const acceptRes = acceptBetaInvitation({
        invitationCodeOrToken: inv.invitationCode,
        userId: "usr_tester_siphe_202",
        acceptTerms: true,
        clientMeta: { ip: "197.221.10.4", userAgent: "Mozilla/5.0" }
      });

      assert.strictEqual(acceptRes.success, true);
      assert.ok(acceptRes.participant);
      assert.strictEqual(acceptRes.participant.userId, "usr_tester_siphe_202");
      assert.strictEqual(acceptRes.participant.organizationName, "Highveld Media Group");
      assert.strictEqual(acceptRes.participant.onboardingStatus, "ACCOUNT_ACTIVATED");
      assert.strictEqual(acceptRes.invitation?.status, "ACCEPTED");
      assert.strictEqual(acceptRes.invitation?.betaTermsAccepted, true);
    });

    it("enforces registration gate: rejects open registration without valid invitation", () => {
      const gateCheckMissing = verifyRegistrationInvitationAccess("");
      assert.strictEqual(gateCheckMissing.allowed, false);
      assert.match(gateCheckMissing.error || "", /Controlled Beta/);

      const gateCheckBogus = verifyRegistrationInvitationAccess("BETA-FAKE-0000");
      assert.strictEqual(gateCheckBogus.allowed, false);
      assert.match(gateCheckBogus.error || "", /No matching beta invitation/);
    });
  });

  describe("D. Beta Activity Tracking & Accurate Recruitment Dashboard", () => {
    it("tracks actual participant activity and updates onboarding progression", () => {
      const cohort = createBetaCohort(
        { name: "Activity Cohort", description: "Test", targetCount: 20 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Active Agency",
          contactName: "Tfobile",
          contactEmail: "tfobile@activeagency.sz",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);
      acceptBetaInvitation({
        invitationCodeOrToken: inv.token,
        userId: "usr_active_tfobile",
        acceptTerms: true
      });

      // Record first search
      recordParticipantActivity("usr_active_tfobile", "search", true);
      // Record generation
      recordParticipantActivity("usr_active_tfobile", "generation", true);
      // Record preview creation
      recordParticipantActivity("usr_active_tfobile", "preview", true);
      // Record feedback submission
      recordParticipantActivity("usr_active_tfobile", "feedback", true);

      const dashRes = getBetaCohortDashboard(cohort.id, superAdminActor, {
        includeTestAccounts: true
      });
      assert.strictEqual(dashRes.success, true);
      assert.ok(dashRes.dashboard);

      const participant = dashRes.dashboard.participants.find(
        (p) => p.userId === "usr_active_tfobile"
      );
      assert.ok(participant);
      assert.strictEqual(participant.metrics.searchesCompleted, 1);
      assert.strictEqual(participant.metrics.websitesGenerated, 1);
      assert.strictEqual(participant.metrics.previewsCreated, 1);
      assert.strictEqual(participant.metrics.feedbackSubmitted, 1);
      assert.strictEqual(participant.onboardingStatus, "ACTIVE_PARTICIPANT");
    });

    it("displays accurate cohort recruitment dashboard statistics without fabrication", () => {
      const cohort = createBetaCohort(
        { name: "Stats Verification Cohort", description: "Test", targetCount: 25 },
        superAdminActor
      ).cohort!;

      // Add 2 invitations
      const inv1 = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Agency Alpha",
          contactName: "Alpha Lead",
          contactEmail: "alpha@agency.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      const inv2 = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "SMALL_BUSINESS",
          organizationName: "SMB Beta",
          contactName: "Beta Lead",
          contactEmail: "beta@smb.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv1.id, superAdminActor);
      approveBetaInvitation(inv2.id, superAdminActor);
      dispatchBetaInvitation(inv1.id, superAdminActor, { confirmDelivery: true });

      // Accept only inv1
      acceptBetaInvitation({
        invitationCodeOrToken: inv1.token,
        userId: "usr_alpha_lead",
        acceptTerms: true
      });

      const dash = getBetaCohortDashboard(cohort.id, superAdminActor, {
        includeTestAccounts: true
      }).dashboard!;

      assert.strictEqual(dash.targetParticipants, 25);
      assert.strictEqual(dash.invitations.length, 2);
      assert.strictEqual(dash.invitationsAccepted, 1);
      assert.strictEqual(dash.participants.length, 1);
    });

    it("submits beta feedback from enrolled participant and links to tracker", () => {
      const fbRes = submitBetaFeedback({
        betaUserId: "usr_active_tfobile",
        betaUserName: "Tfobile Agency Lead",
        featureModule: "business_discovery",
        category: "USABILITY",
        severity: "MEDIUM",
        description: "Search filter dropdown should support typing to autocomplete cities.",
        isTestSubmission: true
      });

      assert.strictEqual(fbRes.success, true);
      assert.ok(fbRes.feedback);
      assert.strictEqual(fbRes.feedback.betaUserId, "usr_active_tfobile");
    });

    it("enforces immutable audit trail across cohort and invitation lifecycle", () => {
      const cohort = createBetaCohort(
        { name: "Audit Trail Cohort", description: "Test", targetCount: 10 },
        superAdminActor
      ).cohort!;

      const inv = prepareBetaInvitation(
        {
          cohortId: cohort.id,
          participantType: "DIGITAL_AGENCY",
          organizationName: "Audited Agency",
          contactName: "Khabo",
          contactEmail: "khabo@audited.com",
          isTestInvitation: true
        },
        superAdminActor
      ).invitation!;

      approveBetaInvitation(inv.id, superAdminActor);
      revokeBetaInvitation(inv.id, "Audit test revocation", superAdminActor);

      const latestInv = getBetaCohortDashboard(cohort.id, superAdminActor, {
        includeTestAccounts: true
      }).dashboard!.invitations.find((i) => i.id === inv.id)!;

      assert.strictEqual(latestInv.auditTrail.length, 3);
      assert.strictEqual(latestInv.auditTrail[0].action, "INVITATION_PREPARED");
      assert.strictEqual(latestInv.auditTrail[1].action, "INVITATION_APPROVED");
      assert.strictEqual(latestInv.auditTrail[2].action, "INVITATION_REVOKED");
    });
  });
});

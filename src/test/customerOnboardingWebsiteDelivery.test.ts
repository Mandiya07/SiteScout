/**
 * SiteScout AI — Micro-Phase 19F Test Suite
 * CUSTOMER ONBOARDING & WEBSITE DELIVERY TESTING
 * 
 * Tests the complete lifecycle:
 * QUALIFIED PROSPECT → WON DEAL → CUSTOMER ACCOUNT → ONBOARDING → WEBSITE PROJECT
 * → REVISION TRACKING → VERSION APPROVAL → LAUNCH READINESS → VERIFIED DEPLOYMENT
 * → CANONICAL HANDOVER → SUPPORT INTEGRATION & CROSS-TENANT ISOLATION
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { 
  Business, 
  GeneratedSite, 
  TaskAssignee,
  CustomerSession,
  DeploymentEvidence
} from "../types";
import {
  convertProspectToCustomer,
  createCustomerAccount
} from "../lib/customerSubscription";
import {
  initiateCustomerOnboarding,
  updateOnboardingRequirement,
  advanceOnboardingStatus,
  pauseCustomerOnboarding,
  cancelCustomerOnboarding,
  updateOnboardingProjectDetails
} from "../lib/customerOnboarding";
import {
  initializeCustomerProject,
  updateProjectTask,
  recordCustomerVersionApproval,
  submitProjectRevision,
  evaluateLaunchReadiness,
  advanceProjectStatus,
  recordProjectDeployment
} from "../lib/customerProjectDelivery";
import {
  verifyDeployedWebsite,
  initiateCustomerHandover,
  confirmCustomerHandover,
  completeCustomerProject,
  createSupportTicket
} from "../lib/websiteLaunchHandover";
import {
  createCustomerSupportTicket,
  sanitizeTicketForCustomer
} from "../lib/customerSupport";
import {
  isCustomerAccountOwner,
  authorizeCustomerAccess
} from "../lib/customerPortalAccess";
import {
  applyWebsiteUpdate,
  restoreWebsiteVersion,
  recordCustomerApproval
} from "../lib/websiteVersioning";
import { normalizeWebsiteSchema } from "../lib/websiteSchema";

describe("MICRO-PHASE 19F: Customer Onboarding & Website Delivery Workflow", () => {
  const adminActor: TaskAssignee = {
    uid: "user_ops_lead_01",
    displayName: "Operations Director Thabo",
    role: "Admin"
  };

  const salesAgent: TaskAssignee = {
    uid: "user_agent_nomsa_02",
    displayName: "Nomsa Dlamini",
    role: "Sales Agent"
  };

  const deliveryLead: TaskAssignee = {
    uid: "user_dev_sipho_03",
    displayName: "Delivery Engineer Sipho",
    role: "Delivery Lead"
  };

  const unauthorizedActor: TaskAssignee = {
    uid: "user_viewer_04",
    displayName: "Observer Guest",
    role: "Viewer"
  };

  // Generates an isolated test business record
  const createTestWonProspect = (id = "biz_beta_royal_transport"): Business => ({
    id,
    name: "Royal Swazi Express Logistics",
    category: "Freight & Haulage",
    address: "Plot 88, King Mswati III Ave, Matsapha, Eswatini",
    phone: "+268 2518 9900",
    email: "dispatch@royallogistics.sz",
    description: "Cross-border freight haulage, refrigerated cargo, and logistics tracking across SADC.",
    rating: 4.8,
    reviewsCount: 46,
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
        poorMobileExperience: false,
        missingContact: false
      }
    },
    salesStage: "WON",
    dealOutcome: "WON",
    dealClosedAt: new Date().toISOString(),
    dealClosedBy: "Nomsa Dlamini",
    contractStatus: "SIGNED",
    contractSignedAt: new Date().toISOString(),
    contractSignedBy: "Robert Dlamini (Managing Director)",
    activeCommercialDocumentId: "doc_contract_royal_001",
    commercialDocuments: [
      {
        id: "doc_contract_royal_001",
        businessId: id,
        documentNumber: "CONT-2026-0001",
        type: "CONTRACT",
        status: "ACCEPTED",
        currentVersion: 1,
        currency: "USD",
        totalValue: 2500,
        totalValueCents: 250000,
        accessToken: "token_royal_001",
        accessTokenRevoked: false,
        currentVersionSnapshot: {
          version: 1,
          title: "Commercial Web Engine & Fleet Portal Agreement",
          type: "CONTRACT",
          status: "ACCEPTED",
          currency: "USD",
          proposedValue: 2500,
          proposedValueCents: 250000,
          items: [
            { id: "i1", description: "Multi-page Modern Fleet Logistics Web Platform", quantity: 1, unitPrice: 2200, unitPriceCents: 220000, totalPrice: 2200, totalPriceCents: 220000 },
            { id: "i2", description: "Managed Edge Hosting & Domain DNS Setup", quantity: 1, unitPrice: 300, unitPriceCents: 30000, totalPrice: 300, totalPriceCents: 30000 }
          ],
          termsAndConditions: "Standard delivery terms.",
          createdBy: adminActor,
          createdAt: new Date().toISOString()
        },
        versionHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    agreedDealValue: 2500,
    currency: "USD",
    paymentStatus: "UNPAID", // Rule: Deal being WON does NOT automatically mean payment has been received
    siteId: "site_royal_transport_v1",
    siteData: normalizeWebsiteSchema({
      id: "site_royal_transport_v1",
      businessName: "Royal Swazi Express Logistics",
      category: "Freight & Haulage",
      phone: "+268 2518 9900",
      address: "Plot 88, King Mswati III Ave, Matsapha, Eswatini",
      primaryColor: "#0f766e",
      secondaryColor: "#1e293b",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      fontStyle: "modern",
      version: 1,
      currentVersion: 1,
      previewApprovalStatus: "DRAFT",
      hero: {
        title: "Premier Cross-Border Fleet & Cold-Chain Logistics",
        subtitle: "Reliable freight forwarding across Eswatini, South Africa, and Mozambique.",
        imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
        ctaPrimary: "Request Haulage Quote",
        ctaSecondary: "View Fleet Operations"
      },
      about: {
        title: "About Royal Swazi Express",
        history: "Decades of dedicated freight transport connecting African markets.",
        mission: "Delivering reliable freight transport across southern Africa.",
        pitch: "Regional permits, bonded carriers, and 24/7 telematics."
      },
      services: [
        { title: "Cross-Border Haulage", description: "Inter-regional road cargo shipping with bonded carriers.", price: "Custom Quote" },
        { title: "Refrigerated Transport", description: "Temperature-controlled fleet for perishable goods and pharma.", price: "Custom Quote" }
      ],
      features: [
        { title: "24/7 Satellite Telematics", description: "Live fleet GPS tracking and cargo temperature telemetry.", icon: "truck" }
      ],
      contactPage: {
        title: "Contact Us",
        description: "Reach our dispatch team 24/7",
        email: "dispatch@royallogistics.sz"
      },
      versionHistory: []
    }),
    activities: [
      {
        id: "act_init",
        businessId: id,
        type: "lead_created",
        title: "Prospect Created",
        description: "Initial discovery from verified database.",
        timestamp: new Date().toISOString()
      }
    ]
  });

  // =========================================================================
  // SECTION 2A: PROSPECT-TO-CUSTOMER CONVERSION
  // =========================================================================
  describe("A. Prospect-to-Customer Conversion", () => {
    it("requires an authorized conversion action role", async () => {
      const prospect = createTestWonProspect();
      const res = await convertProspectToCustomer(
        prospect,
        "auth_uid_robert_01",
        unauthorizedActor // Viewer role
      );
      assert.strictEqual(res.success, false, "Unauthorized role must be rejected");
      assert.match(res.error || "", /Unauthorized/i, "Error message must state unauthorized role");
      assert.strictEqual(res.business.customerAccount, undefined, "Customer account must not be created");
    });

    it("prevents conversion of non-WON prospect without commercial agreement", async () => {
      const nonWonProspect: Business = {
        ...createTestWonProspect("biz_non_won_01"),
        salesStage: "QUALIFIED",
        dealOutcome: undefined,
        contractStatus: "NOT_SENT",
        activeCommercialDocumentId: undefined
      };

      const res = await convertProspectToCustomer(
        nonWonProspect,
        "auth_uid_robert_01",
        salesAgent
      );
      assert.strictEqual(res.success, false, "Non-WON prospect must not convert");
      assert.match(res.error || "", /Deal must be won/i, "Error must indicate requirement of WON status");
      assert.strictEqual(res.business.customerAccount, undefined, "Customer account must remain unset");
    });

    it("converts a legitimate WON deal into a customer account preserving business identity and CRM history", async () => {
      const prospect = createTestWonProspect();
      const initialActivitiesCount = prospect.activities?.length || 0;

      const res = await convertProspectToCustomer(
        prospect,
        "auth_uid_robert_01",
        salesAgent,
        { conversionNotes: "Deal closed by Nomsa after contract signing." }
      );

      assert.strictEqual(res.success, true, "Conversion must succeed");
      assert.ok(res.account, "CustomerAccount record must be returned");
      assert.ok(res.subscription, "Initial subscription must be established");
      assert.strictEqual(res.account.businessId, prospect.id, "Business identity ID must be preserved");
      assert.strictEqual(res.account.businessName, prospect.name, "Business name must match");
      assert.strictEqual(res.account.ownerUserId, "auth_uid_robert_01", "Owner user ID must be stored");
      assert.strictEqual(res.business.customerId, res.account.customerId, "Business record must link customer ID");

      // Verify payment status invariant: WON does NOT imply payment is received
      assert.strictEqual(res.business.paymentStatus, "UNPAID", "Deal marked WON must not automatically be marked PAID");

      // Verify commercial agreement association is preserved
      assert.strictEqual(res.business.activeCommercialDocumentId, "doc_contract_royal_001", "Commercial document remains linked");
      assert.strictEqual(res.business.commercialDocuments?.length, 1, "Commercial agreement array intact");

      // Verify existing prospect history remains accessible
      assert.ok((res.business.activities?.length || 0) > initialActivitiesCount, "Activity trail must be updated without deleting prior history");
      assert.strictEqual(res.business.activities?.[0].id, "act_init", "Original activity history must remain accessible");
    });

    it("prevents duplicate customer accounts when conversion is repeated", async () => {
      const prospect = createTestWonProspect();
      const firstRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      assert.strictEqual(firstRes.success, true);
      const firstCustomerId = firstRes.account?.customerId;

      // Repeat conversion on the already-converted business
      const secondRes = await convertProspectToCustomer(firstRes.business, "auth_uid_robert_01", salesAgent);
      assert.strictEqual(secondRes.success, true);
      assert.strictEqual(secondRes.isDuplicate, true, "Repeated conversion must return isDuplicate: true");
      assert.strictEqual(secondRes.account?.customerId, firstCustomerId, "Customer ID must not change or duplicate");
    });

    it("ensures conversion failure leaves CRM records completely uncorrupted", async () => {
      const corruptTestBiz: Business = {
        ...createTestWonProspect("biz_corrupt_test"),
        id: "", // Invalid ID
        name: ""
      };

      const res = await convertProspectToCustomer(corruptTestBiz, "user_x", salesAgent);
      assert.strictEqual(res.success, false, "Invalid record must fail");
      assert.strictEqual(res.business.id, "", "Business record remains unmodified on failure");
    });
  });

  // =========================================================================
  // SECTION 2B: CUSTOMER ONBOARDING
  // =========================================================================
  describe("B. Customer Onboarding", () => {
    it("initiates customer onboarding and generates canonical requirements checklist", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      assert.strictEqual(convRes.success, true);

      const onbRes = await initiateCustomerOnboarding(convRes.business, salesAgent, {
        targetDeliveryDate: "2026-11-30T17:00:00Z",
        projectNotes: "Client requires integration with fleet telematics portal and bilingual EN/SS copy."
      });

      assert.strictEqual(onbRes.success, true, "Onboarding initialization must succeed");
      assert.ok(onbRes.onboardingRecord, "Onboarding record must exist");
      const record = onbRes.onboardingRecord;

      assert.strictEqual(record.status, "PENDING", "Initial onboarding status must be PENDING");
      assert.strictEqual(record.businessId, prospect.id, "Must link to correct business ID");
      assert.strictEqual(record.targetDeliveryDate, "2026-11-30T17:00:00Z", "Target delivery date preserved");
      assert.strictEqual(record.contractDocumentId, "doc_contract_royal_001", "Contract document linked");

      // Verify authorized contacts extracted truthfully without inventing missing data
      assert.ok(record.contacts.length >= 1, "Must extract authorized contact");
      assert.strictEqual(record.contacts[0].email, "dispatch@royallogistics.sz", "Real contact email preserved");

      // Verify requirements checklist
      assert.ok(record.requirementsChecklist.length >= 5, "Checklist must contain technical, domain, brand, content requirements");
      const contractReq = record.requirementsChecklist.find(r => r.id === "req_contract_execution");
      assert.strictEqual(contractReq?.isCompleted, true, "Signed contract requirement is marked completed automatically");
      
      const domainReq = record.requirementsChecklist.find(r => r.id === "req_domain_dns");
      assert.strictEqual(domainReq?.isCompleted, false, "Domain access starts incomplete");
    });

    it("prevents advancing to READY_FOR_DELIVERY when required onboarding items are incomplete", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      const onbRes = await initiateCustomerOnboarding(convRes.business, salesAgent);
      assert.strictEqual(onbRes.success, true);

      // Attempt to jump to READY_FOR_DELIVERY while required items are pending
      const advanceRes = await advanceOnboardingStatus(
        onbRes.business,
        "READY_FOR_DELIVERY",
        salesAgent
      );

      assert.strictEqual(advanceRes.success, false, "Must block advancing to READY_FOR_DELIVERY with missing requirements");
      assert.match(advanceRes.error || "", /Missing required onboarding requirements/i);
    });

    it("completes checklist requirements, records provenance, and advances status", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = (await initiateCustomerOnboarding(convRes.business, salesAgent)).business;

      // Start onboarding
      const startRes = await advanceOnboardingStatus(biz, "IN_PROGRESS", salesAgent);
      assert.strictEqual(startRes.success, true);
      biz = startRes.business;
      assert.strictEqual(biz.onboardingRecord?.status, "IN_PROGRESS");

      // Mark payment, domain, branding, and content requirements completed with evidence
      const reqIds = ["req_payment_deposit", "req_domain_dns", "req_brand_assets", "req_content_catalogue"];
      for (const reqId of reqIds) {
        const reqRes = await updateOnboardingRequirement(
          biz,
          reqId,
          true,
          salesAgent,
          `Verified in client kickoff call by ${salesAgent.displayName}`
        );
        assert.strictEqual(reqRes.success, true);
        biz = reqRes.business;
      }

      // Now all required items are fulfilled; advance to READY_FOR_DELIVERY
      const readyRes = await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent);
      assert.strictEqual(readyRes.success, true, "Must successfully reach READY_FOR_DELIVERY when all items are fulfilled");
      assert.strictEqual(readyRes.onboardingRecord?.status, "READY_FOR_DELIVERY");
    });

    it("supports ON_HOLD and CANCELLED statuses with mandatory reason logging", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = (await initiateCustomerOnboarding(convRes.business, salesAgent)).business;

      // Pause without reason must fail
      const badPause = await pauseCustomerOnboarding(biz, "", salesAgent);
      assert.strictEqual(badPause.success, false, "Pausing without reason must be rejected");

      // Pause with valid reason
      const pauseRes = await pauseCustomerOnboarding(biz, "Awaiting board approval for new domain delegation", salesAgent);
      assert.strictEqual(pauseRes.success, true);
      assert.strictEqual(pauseRes.onboardingRecord?.status, "ON_HOLD");

      // Update project notes without corrupting commercial agreement
      const updateRes = await updateOnboardingProjectDetails(biz, { projectNotes: "Follow-up scheduled next Monday" }, salesAgent);
      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.onboardingRecord?.projectNotes, "Follow-up scheduled next Monday");
    });
  });

  // =========================================================================
  // SECTION 2C: WEBSITE PROJECT CREATION
  // =========================================================================
  describe("C. Website Project Creation", () => {
    it("creates a customer project linking customer, business, won deal, onboarding, contract, and website", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      // Complete requirements to reach READY_FOR_DELIVERY
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;

      const projRes = await initializeCustomerProject(biz, deliveryLead, {
        projectType: "WEBSITE_NEW",
        customDomain: "royallogistics.sz",
        targetDeliveryDate: "2026-11-30"
      });

      assert.strictEqual(projRes.success, true, "Project creation must succeed");
      assert.ok(projRes.project, "Project record must be defined");
      const proj = projRes.project;

      // Assert explicit linking to all required entities
      assert.strictEqual(proj.customerId, convRes.account?.customerId, "Must link to customer account ID");
      assert.strictEqual(proj.businessId, prospect.id, "Must link to business record ID");
      assert.strictEqual(proj.businessName, prospect.name, "Must preserve business name");
      assert.ok(proj.dealId, "Must link to won deal ID");
      assert.strictEqual(proj.onboardingId, biz.onboardingRecord?.id, "Must link to onboarding record ID");
      assert.strictEqual(proj.commercialDocumentId, "doc_contract_royal_001", "Must link to commercial agreement");
      assert.strictEqual(proj.currentSiteId, "site_royal_transport_v1", "Must link to generated website");
      assert.strictEqual(proj.previewUrl, "/preview/site_royal_transport_v1", "Must link to website preview URL");
      assert.strictEqual(proj.currentWebsiteVersion, 1, "Must link to website version 1");
      assert.strictEqual(proj.customDomain, "royallogistics.sz", "Must link domain configuration");
      assert.strictEqual(proj.assignedOwner.uid, deliveryLead.uid, "Project owner assigned");

      // Verify milestones initialized
      assert.ok(proj.milestones.length >= 5, "Must initialize default project delivery milestones");
      assert.strictEqual(proj.milestones[0].id, "ms_requirements", "Milestone 1 initialized");

      // Verify tasks initialized with dependencies
      assert.ok(proj.tasks.length >= 5, "Must initialize default project delivery tasks");
      const clientSignoffTask = proj.tasks.find(t => t.id === "task_client_signoff");
      assert.ok(clientSignoffTask?.dependencies && clientSignoffTask.dependencies.length > 0, "Task dependencies present");
    });

    it("prevents duplicate projects from repeated creation requests", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;

      const firstProj = await initializeCustomerProject(biz, deliveryLead);
      assert.strictEqual(firstProj.success, true);
      const projectId = firstProj.project?.id;

      // Repeat project creation
      const secondProj = await initializeCustomerProject(firstProj.business, deliveryLead);
      assert.strictEqual(secondProj.success, true);
      assert.strictEqual(secondProj.isDuplicate, true, "Must flag duplicate project request");
      assert.strictEqual(secondProj.project?.id, projectId, "Must not create duplicate project ID");
    });
  });

  // =========================================================================
  // SECTION 2D: WEBSITE DELIVERY WORKFLOW & STATUS TRANSITIONS
  // =========================================================================
  describe("D. Website Delivery Workflow", () => {
    const setupReadyProject = async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      const projRes = await initializeCustomerProject(biz, deliveryLead);
      return { biz: projRes.business, project: projRes.project! };
    };

    it("advances from NOT_STARTED to IN_PROGRESS and CUSTOMER_REVIEW", async () => {
      let { biz } = await setupReadyProject();

      const inProgressRes = await advanceProjectStatus(biz, "IN_PROGRESS", deliveryLead);
      assert.strictEqual(inProgressRes.success, true);
      assert.strictEqual(inProgressRes.project?.status, "IN_PROGRESS");
      biz = inProgressRes.business;

      const reviewRes = await advanceProjectStatus(biz, "CUSTOMER_REVIEW", deliveryLead);
      assert.strictEqual(reviewRes.success, true);
      assert.strictEqual(reviewRes.project?.status, "CUSTOMER_REVIEW");
    });

    it("blocks transition to APPROVED_FOR_LAUNCH without matching customer version approval", async () => {
      const { biz } = await setupReadyProject();

      // Attempt to move to APPROVED_FOR_LAUNCH before client approves v1
      const res = await advanceProjectStatus(biz, "APPROVED_FOR_LAUNCH", deliveryLead);
      assert.strictEqual(res.success, false, "Must block APPROVED_FOR_LAUNCH without approval");
      assert.match(res.error || "", /has not been approved by customer/i);
    });

    it("blocks transition to DEPLOYING without passing launch readiness checks", async () => {
      let { biz } = await setupReadyProject();

      // Record approval for v1
      const apprRes = await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Robert Dlamini",
          approverEmail: "robert@royallogistics.sz",
          approvalMethod: "DIGITAL_PORTAL"
        },
        deliveryLead
      );
      assert.strictEqual(apprRes.success, true);
      biz = apprRes.business;

      // Project has incomplete required tasks -> Launch readiness fails
      const deployRes = await advanceProjectStatus(biz, "DEPLOYING", deliveryLead);
      assert.strictEqual(deployRes.success, false, "Must block DEPLOYING when required tasks are incomplete");
      assert.match(deployRes.error || "", /Launch readiness checks failed/i);
    });

    it("prevents false LIVE status without verified deployment evidence HTTP 200", async () => {
      let { biz } = await setupReadyProject();

      // Attempt to set status directly to LIVE without deployment evidence
      const directLiveRes = await advanceProjectStatus(biz, "LIVE", deliveryLead);
      assert.strictEqual(directLiveRes.success, false, "Must block marking project LIVE directly without evidence");
      assert.match(directLiveRes.error || "", /Verified deployment evidence with HTTP 200/i);
    });
  });

  // =========================================================================
  // SECTION 2E: CUSTOMER REVIEW & REVISIONS
  // =========================================================================
  describe("E. Customer Review & Revisions", () => {
    it("records formal customer approval for a specific website version", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      const apprRes = await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Robert Dlamini",
          approverEmail: "robert@royallogistics.sz",
          approverRole: "Managing Director",
          approvalMethod: "DIGITAL_PORTAL",
          feedbackNotes: "Layout and fleet catalogue look excellent. Ready for launch."
        },
        deliveryLead
      );

      assert.strictEqual(apprRes.success, true);
      assert.strictEqual(apprRes.project?.status, "APPROVED_FOR_LAUNCH");
      assert.strictEqual(apprRes.project?.customerApprovals.length, 1);
      const record = apprRes.project?.customerApprovals[0];
      assert.strictEqual(record?.versionNumber, 1);
      assert.strictEqual(record?.approverName, "Robert Dlamini");
      assert.strictEqual(record?.status, "APPROVED");
    });

    it("blocks unauthorized actors from approving website versions", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      const unauthRes = await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Random Hacker",
          approverEmail: "hacker@evil.com",
          approvalMethod: "CLIENT_DIRECT"
        },
        unauthorizedActor // Viewer role
      );

      assert.strictEqual(unauthRes.success, false, "Unauthorized approval attempt must be blocked");
      assert.match(unauthRes.error || "", /Unauthorized/i);
    });

    it("submits revision request, increments version, and requires renewed approval", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      // 1. Approve v1
      biz = (await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Robert Dlamini",
          approverEmail: "robert@royallogistics.sz",
          approvalMethod: "DIGITAL_PORTAL"
        },
        deliveryLead
      )).business;
      assert.strictEqual(biz.customerProject?.status, "APPROVED_FOR_LAUNCH");

      // 2. Client submits revision request
      const revRes = await submitProjectRevision(
        biz,
        {
          section: "Services / Hazardous Materials",
          description: "Add ADR certified chemical transport service with specialized safety badge.",
          requestedBy: "Robert Dlamini"
        },
        deliveryLead
      );

      assert.strictEqual(revRes.success, true);
      assert.strictEqual(revRes.project?.currentWebsiteVersion, 2, "Website version must increment to 2");
      assert.strictEqual(revRes.project?.status, "REVISION_REQUIRED", "Status must revert to REVISION_REQUIRED");
      assert.strictEqual(revRes.project?.launchStatus, "NOT_READY", "Launch status must revert to NOT_READY");
      assert.strictEqual(revRes.project?.revisionHistory.length, 1);
      assert.strictEqual(revRes.project?.revisionHistory[0].versionRequested, 2);

      // Verify prior approval is NOT valid for v2
      const readiness = evaluateLaunchReadiness(revRes.business);
      assert.strictEqual(readiness.checks.customerApprovalPresent, false, "Prior v1 approval must not apply to v2");
    });

    it("preserves previous website versions in version history and allows rollback", async () => {
      const site = createTestWonProspect().siteData!;
      
      // 1. Initial approval on v1
      const approvedV1 = recordCustomerApproval(site, {
        decision: "APPROVED",
        approverName: "Robert Dlamini",
        notes: "v1 baseline approved"
      }).updatedSite;

      // 2. Material edit in website editor
      const updatedV2 = applyWebsiteUpdate(
        approvedV1,
        {
          hero: {
            ...approvedV1.hero!,
            title: "Updated Fleet Logistics 2026",
            subtitle: "Expanded network across southern Africa"
          }
        },
        "delivery_engineer",
        "Hero copy updated"
      );

      assert.strictEqual(updatedV2.currentVersion, 2, "Material edit increments version to 2");
      assert.strictEqual(updatedV2.clientApproved, false, "Prior approval must be invalidated");
      assert.strictEqual(updatedV2.previousApprovedVersion, 1, "Previous approved version recorded");
      assert.ok(updatedV2.versionHistory.length >= 2, "Version history preserves previous snapshots");

      // 3. Rollback to v1 snapshot
      const restoredV3 = restoreWebsiteVersion(updatedV2, 1, "rollback_agent");
      assert.strictEqual(restoredV3.hero?.title, site.hero?.title, "Restored title must match original v1");
    });
  });

  // =========================================================================
  // SECTION 2F: LAUNCH READINESS VERIFICATION
  // =========================================================================
  describe("F. Launch Readiness", () => {
    it("evaluates all launch readiness criteria and blocks when criteria are unfulfilled", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      // Initially tasks incomplete and no approval
      const res = evaluateLaunchReadiness(biz);
      assert.strictEqual(res.isReady, false);
      assert.strictEqual(res.checks.tasksCompleted, false);
      assert.strictEqual(res.checks.customerApprovalPresent, false);
      assert.ok(res.blockers.length >= 2);
    });

    it("passes launch readiness check once all tasks and version approvals are satisfied", async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      // 1. Approve v1
      biz = (await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Robert Dlamini",
          approverEmail: "robert@royallogistics.sz",
          approvalMethod: "DIGITAL_PORTAL"
        },
        deliveryLead
      )).business;

      // 2. Complete all tasks respecting dependencies
      // Task dependency order: task_content_validation -> task_mobile_testing, task_brand_assets -> task_client_signoff
      const taskOrder = ["task_domain_dns", "task_brand_assets", "task_content_validation", "task_mobile_testing", "task_client_signoff"];
      for (const tId of taskOrder) {
        const tRes = await updateProjectTask(biz, tId, true, deliveryLead, "Complete");
        assert.strictEqual(tRes.success, true);
        biz = tRes.business;
      }

      const res = evaluateLaunchReadiness(biz);
      assert.strictEqual(res.isReady, true, "Launch readiness must pass when all conditions are fulfilled");
      assert.strictEqual(res.checks.tasksCompleted, true);
      assert.strictEqual(res.checks.customerApprovalPresent, true);
      assert.strictEqual(res.checks.commercialTermsSatisfied, true);
      assert.strictEqual(res.checks.hostingAndDomainConfigured, true);
      assert.strictEqual(res.checks.contentAndContactMechanismsValid, true);
      assert.strictEqual(res.checks.qaScanClean, true);
      assert.strictEqual(res.blockers.length, 0);
    });
  });

  // =========================================================================
  // SECTION 2G & 2H: DEPLOYMENT, CANONICAL HANDOVER & SUPPORT INTEGRATION
  // =========================================================================
  describe("G & H. Deployment, Customer Handover & Support Integration", () => {
    const setupReadyForDeployProject = async () => {
      const prospect = createTestWonProspect();
      const convRes = await convertProspectToCustomer(prospect, "auth_uid_robert_01", salesAgent);
      let biz = convRes.business;
      biz = (await initiateCustomerOnboarding(biz, salesAgent)).business;
      for (const req of biz.onboardingRecord?.requirementsChecklist || []) {
        biz = (await updateOnboardingRequirement(biz, req.id, true, salesAgent, "Verified")).business;
      }
      biz = (await advanceOnboardingStatus(biz, "READY_FOR_DELIVERY", salesAgent)).business;
      biz = (await initializeCustomerProject(biz, deliveryLead)).business;

      // Approve v1
      biz = (await recordCustomerVersionApproval(
        biz,
        {
          versionNumber: 1,
          status: "APPROVED",
          approverName: "Robert Dlamini",
          approverEmail: "robert@royallogistics.sz",
          approvalMethod: "DIGITAL_PORTAL"
        },
        deliveryLead
      )).business;

      // Complete tasks
      const taskOrder = ["task_domain_dns", "task_brand_assets", "task_content_validation", "task_mobile_testing", "task_client_signoff"];
      for (const tId of taskOrder) {
        biz = (await updateProjectTask(biz, tId, true, deliveryLead, "Complete")).business;
      }

      // Advance to DEPLOYING
      biz = (await advanceProjectStatus(biz, "DEPLOYING", deliveryLead)).business;
      return biz;
    };

    it("simulates deployment failure and prevents false LIVE status", async () => {
      let biz = await setupReadyForDeployProject();

      const failedEvidence: DeploymentEvidence = {
        host: "edge-cluster-sz-01.sitescout.ai",
        liveUrl: "https://royallogistics.sz",
        httpStatus: 502,
        verified: false,
        verifiedAt: new Date().toISOString(),
        sslActive: false,
        deployer: deliveryLead,
        deployedAt: new Date().toISOString(),
        errorMessage: "DNS CNAME mismatch: Origin cluster unreachable (HTTP 502 Bad Gateway)"
      };

      const deployRes = await recordProjectDeployment(biz, failedEvidence, deliveryLead);
      assert.strictEqual(deployRes.success, false, "Deployment failure must be returned as failure");
      assert.strictEqual(deployRes.project?.status, "APPROVED_FOR_LAUNCH", "Status must NOT be set to LIVE on failed deploy");
      assert.strictEqual(deployRes.project?.launchStatus, "DEPLOYMENT_FAILED", "Launch status must be DEPLOYMENT_FAILED");
      assert.strictEqual(deployRes.business.deploymentStatus, undefined, "Business deploymentStatus must not be LIVE");
    });

    it("records verified deployment evidence (HTTP 200) and marks project LIVE", async () => {
      let biz = await setupReadyForDeployProject();

      const validEvidence: DeploymentEvidence = {
        host: "edge-cluster-sz-01.sitescout.ai",
        liveUrl: "https://royallogistics.sz",
        httpStatus: 200,
        verified: true,
        verifiedAt: new Date().toISOString(),
        sslActive: true,
        deployer: deliveryLead,
        deployedAt: new Date().toISOString(),
        sslCertificate: {
          issuer: "Let's Encrypt Authority X3",
          validUntil: "2027-01-01T00:00:00Z"
        }
      };

      const deployRes = await recordProjectDeployment(biz, validEvidence, deliveryLead);
      assert.strictEqual(deployRes.success, true, "Deployment recording must succeed");
      assert.strictEqual(deployRes.project?.status, "LIVE", "Project status must be LIVE");
      assert.strictEqual(deployRes.project?.launchStatus, "DEPLOYED_VERIFIED", "Launch status must be DEPLOYED_VERIFIED");
      assert.strictEqual(deployRes.business.deploymentStatus, "LIVE", "Business deployment status updated");
    });

    it("verifies live website via HTTP pre-flight checks and initiates secure customer handover", async () => {
      let biz = await setupReadyForDeployProject();
      const validEvidence: DeploymentEvidence = {
        host: "edge-cluster-sz-01.sitescout.ai",
        liveUrl: "https://royallogistics.sz",
        httpStatus: 200,
        verified: true,
        verifiedAt: new Date().toISOString(),
        sslActive: true,
        deployer: deliveryLead,
        deployedAt: new Date().toISOString()
      };
      biz = (await recordProjectDeployment(biz, validEvidence, deliveryLead)).business;

      // 1. Run live website launch verification
      const verifyRes = await verifyDeployedWebsite(biz, deliveryLead, { customUrl: "https://royallogistics.sz" });
      assert.strictEqual(verifyRes.success, true, "Website preflight verification must pass");
      assert.strictEqual(verifyRes.report?.verificationStatus, "VERIFIED_LIVE");
      biz = verifyRes.business;

      // 2. Initiate canonical customer handover
      const handRes = await initiateCustomerHandover(biz, deliveryLead, {
        customPortalUrl: "/portal/biz_beta_royal_transport",
        instructions: "Client can log into the Client Portal using their registered credentials."
      });

      assert.strictEqual(handRes.success, true, "Customer handover initiation must succeed");
      biz = handRes.business;
      assert.ok(handRes.handoverRecord, "Handover record must exist");
      const hnd = handRes.handoverRecord;

      // Verify canonical handover fields
      assert.ok(hnd.customerId, "Must include Customer ID");
      assert.strictEqual(hnd.projectId, biz.customerProject?.id, "Must include Project ID");
      assert.strictEqual(hnd.deployedVersion, 1, "Must include Website Version");
      assert.strictEqual(hnd.liveWebsiteUrl, "https://royallogistics.sz", "Must include Verified Live URL");
      assert.strictEqual(hnd.launchVerificationStatus, "VERIFIED_LIVE", "Must include Launch Verification Status");
      assert.ok(Array.isArray(hnd.outstandingIssues), "Must include Outstanding Issues list");
      assert.ok(hnd.supportInformation, "Must include Support Information terms");
      assert.strictEqual(hnd.supportInformation.supportTier, "STANDARD_CARE", "Support tier derived from agreement");
      assert.strictEqual(hnd.supportInformation.slaResponseHours, 48, "SLA response hours assigned");
      assert.ok(hnd.launchDate, "Must include Handover Date");

      // Verify security mandate: Never expose raw passwords or API keys in handover record
      const creds = hnd.accessCredentials;
      assert.strictEqual((creds as any).password, undefined, "Plain passwords must never be stored");
      assert.strictEqual((creds as any).apiKey, undefined, "API keys must never be stored in handover");
      assert.ok(creds.vaultReferenceId, "Vault reference ID used instead of plain credentials");

      // 3. Client acknowledges and confirms handover
      const confirmRes = await confirmCustomerHandover(biz, deliveryLead, {
        acceptedBy: "Robert Dlamini",
        clientFeedback: "Website is fully operational and telemetry links work smoothly. Handover confirmed."
      });
      assert.strictEqual(confirmRes.success, true);
      assert.strictEqual(confirmRes.handoverRecord?.handoverStatus, "ACCEPTED_BY_CLIENT");
      assert.strictEqual(confirmRes.handoverRecord?.acceptedBy, "Robert Dlamini");
      biz = confirmRes.business;

      // 4. Conclude and complete project
      const compRes = await completeCustomerProject(biz, deliveryLead, "All launch milestones delivered and accepted.");
      assert.strictEqual(compRes.success, true, "Project completion must succeed");
      assert.strictEqual(compRes.project?.status, "COMPLETED");
      assert.strictEqual(compRes.project?.completionEvidence?.finalVersion, 1);
    });

    it("integrates post-launch support tickets without a separate support database", async () => {
      let biz = await setupReadyForDeployProject();
      const validEvidence: DeploymentEvidence = {
        host: "edge-cluster-sz-01.sitescout.ai",
        liveUrl: "https://royallogistics.sz",
        httpStatus: 200,
        verified: true,
        verifiedAt: new Date().toISOString(),
        sslActive: true,
        deployer: deliveryLead,
        deployedAt: new Date().toISOString()
      };
      biz = (await recordProjectDeployment(biz, validEvidence, deliveryLead)).business;
      biz = (await verifyDeployedWebsite(biz, deliveryLead, { customUrl: "https://royallogistics.sz" })).business;
      biz = (await initiateCustomerHandover(biz, deliveryLead)).business;
      biz = (await confirmCustomerHandover(biz, deliveryLead, { acceptedBy: "Robert Dlamini" })).business;
      biz = (await completeCustomerProject(biz, deliveryLead)).business;

      // Create a support ticket linked to the completed project
      const ticketRes = await createSupportTicket(
        biz,
        {
          title: "Update contact phone number for Durban freight terminal",
          description: "New direct hotline installed: +27 31 990 4400. Please update the footer and contact page.",
          category: "CONTENT_UPDATE",
          priority: "NORMAL",
          reportedBy: "Robert Dlamini"
        },
        deliveryLead
      );

      assert.strictEqual(ticketRes.success, true, "Support ticket creation must succeed");
      assert.ok(ticketRes.ticket, "Ticket record returned");
      const ticket = ticketRes.ticket;

      assert.strictEqual(ticket.businessId, biz.id, "Ticket links to existing business record");
      assert.strictEqual(ticket.projectId, biz.customerProject?.id, "Ticket links to project ID");
      assert.strictEqual(ticket.relatedWebsiteVersion, 1, "Ticket links to deployed website version");
      assert.strictEqual(ticket.status, "OPEN");

      biz = ticketRes.business;
      // Verify tickets are stored within the business and project entities without separate DB
      assert.ok(biz.customerProject?.supportTickets?.some(t => t.id === ticket.id), "Ticket attached to customerProject");
    });

    it("enforces cross-customer isolation and blocks cross-tenant access", async () => {
      const bizA = createTestWonProspect("biz_tenant_alpha");
      const convResA = await convertProspectToCustomer(bizA, "auth_user_alpha", salesAgent);
      
      const bizB = createTestWonProspect("biz_tenant_bravo");
      const convResB = await convertProspectToCustomer(bizB, "auth_user_bravo", salesAgent);

      // Session for customer A
      const sessionA: CustomerSession = {
        uid: "auth_user_alpha",
        customerId: convResA.account?.customerId || "cust_alpha",
        businessId: "biz_tenant_alpha",
        email: "alpha@test.com",
        role: "customer",
        sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        isExpired: false
      };

      // Customer A verifies ownership of Biz A
      assert.strictEqual(isCustomerAccountOwner(convResA.business, sessionA), true, "User A owns Tenant Alpha");

      // Customer A attempts to access Biz B (cross-tenant access)
      assert.strictEqual(isCustomerAccountOwner(convResB.business, sessionA), false, "User A must NOT own Tenant Bravo");

      const accessResult = authorizeCustomerAccess(
        convResB.business,
        sessionA,
        "project",
        "proj_royal",
        "read"
      );

      assert.strictEqual(accessResult.authorized, false, "Cross-tenant access must be blocked");
      assert.strictEqual(accessResult.status, 403, "Status must be HTTP 403 Forbidden");
      assert.strictEqual(accessResult.errorCode, "FORBIDDEN_RESOURCE", "Error code must be FORBIDDEN_RESOURCE");
    });
  });
});

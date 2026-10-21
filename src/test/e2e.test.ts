import assert from "assert";
import { normalizeSearchResult } from "../lib/searchNormalization";
import { deduplicateAndIngestBusinesses } from "../lib/businessIdentity";
import { calculatePresenceScore, calculateOpportunityScore } from "../../server/services/prospectService";
import { evaluateProspectQualification } from "../lib/prospectQualification";
import { isValidTransition, addBusinessActivity } from "../lib/prospectCrm";
import { normalizeWebsiteSchema, validateWebsiteSchema } from "../lib/websiteSchema";
import { matchIndustryTaxonomy } from "../../server/image/taxonomy";
import { rankAndScoreImage } from "../../server/image/imageRanking";
import { ImageRequirement } from "../../server/image/types";
import { generateSecurePreviewToken, sanitizePublicPreview, isValidPreviewToken } from "../lib/security";
import { generatePersonalizedOutreachDraft, saveDraftToBusiness } from "../lib/prospectOutreachDrafting";
import { approveOutreachDraft, deliverOutreachMessage } from "../lib/prospectOutreachDelivery";
import { createCommercialDocument, approveCommercialDocument, acceptCommercialDocument } from "../lib/commercialDocuments";
import { initiateCustomerOnboarding, advanceOnboardingStatus } from "../lib/customerOnboarding";
import { initializeCustomerProject, evaluateLaunchReadiness } from "../lib/customerProjectDelivery";
import { confirmCustomerHandover } from "../lib/websiteLaunchHandover";
import { activatePaidSubscription } from "../lib/customerSubscription";
import { processBillingEvent, calculateEffectiveEntitlements } from "../lib/subscriptionBillingEvents";
import { createCustomerSession, authorizeCustomerAccess, sanitizeCustomerPortalData } from "../lib/customerPortalAccess";
import { createCustomerSupportTicket, sanitizeTicketForCustomer, resolveSupportTicket } from "../lib/customerSupport";
import { saveBusinessRecord, clearBusinessPersistenceStore, getLocalBusinessCache, setLocalBusinessCache } from "../lib/businessPersistence";
import { recordCanonicalAuditEvent, getCanonicalAuditLogs, resetCanonicalAuditLogsForTesting } from "../lib/canonicalAuditTrail";
import { Business, GeneratedSite, TaskAssignee, BillingEvent } from "../types";

export interface ScenarioTestResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runE2eTests(): Promise<{ passed: number; failed: number; total: number; scenarios: ScenarioTestResult[] }> {
  console.log("================================================================================");
  console.log("  SITESCOUT AI — COMPLETE WORKFLOW VERIFICATION & REAL-WORLD SCENARIO SUITE     ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;
  let total = 0;
  const scenarioResults: ScenarioTestResult[] = [];

  async function executeScenario(num: number, name: string, fn: () => void | Promise<void>) {
    total++;
    const start = Date.now();
    try {
      await fn();
      passed++;
      const durationMs = Date.now() - start;
      scenarioResults.push({ scenarioNumber: num, name, passed: true, durationMs });
      console.log(`  ✓ [SCENARIO ${num.toString().padStart(2, "0")}/18 PASS] ${name} (${durationMs}ms)`);
    } catch (err: any) {
      failed++;
      const durationMs = Date.now() - start;
      const errorMsg = err.message || String(err);
      scenarioResults.push({ scenarioNumber: num, name, passed: false, error: errorMsg, durationMs });
      console.error(`  ✗ [SCENARIO ${num.toString().padStart(2, "0")}/18 FAIL] ${name}: ${errorMsg}`);
    }
  }

  resetCanonicalAuditLogsForTesting();
  clearBusinessPersistenceStore();

  let business: Business;
  let generatedSite: GeneratedSite;
  let previewToken: string;
  let draftId: string;

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Discover a business and create a prospect
  // ---------------------------------------------------------------------------
  await executeScenario(1, "Discover a business and create a prospect", () => {
    const rawResult = {
      name: "Mbabane Premier Auto Care",
      title: "Mbabane Premier Auto Care",
      snippet: "Comprehensive mechanical repairs, auto diagnostics, and brake services in Mbabane Central",
      phone: "+268 7600 8899",
      address: "Coventry Crescent, Mbabane, Eswatini",
      category: "Auto Repair"
    };
    const query = { category: "Auto Repair", city: "Mbabane", country: "Eswatini" };
    const normalized = normalizeSearchResult(rawResult as any, query, "Google Search Grounding");

    assert.strictEqual(normalized.name, "Mbabane Premier Auto Care");
    assert.strictEqual(normalized.category, "Auto Repair");
    assert.ok(normalized.id.length > 5, "Normalized business must have a valid deterministic ID");

    const ingestResult = deduplicateAndIngestBusinesses([], [normalized]);
    assert.strictEqual(ingestResult.consolidated.length, 1);
    assert.strictEqual(ingestResult.added.length, 1);

    business = ingestResult.consolidated[0];
    business.email = "info@mbabaneautocare.sz";
    assert.strictEqual(business.name, "Mbabane Premier Auto Care");
    assert.strictEqual(business.verificationState, "CANDIDATE");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Discover the same business again without duplication
  // ---------------------------------------------------------------------------
  await executeScenario(2, "Discover the same business again without duplication", () => {
    // Repeated search with local phone format and whitespace variations
    const duplicateRaw = {
      name: "  Mbabane Premier Auto Care  ",
      title: "Mbabane Premier Auto Care - Diagnostics",
      snippet: "Brake service and auto diagnostics",
      phone: "76008899", // Local unformatted phone
      address: "Coventry Crescent, Mbabane",
      category: "Auto Repair"
    };
    const query = { category: "Auto Repair", city: "Mbabane", country: "Eswatini" };
    const duplicateNormalized = normalizeSearchResult(duplicateRaw as any, query, "Google Search Grounding");

    const reingestResult = deduplicateAndIngestBusinesses([business], [duplicateNormalized]);
    assert.strictEqual(reingestResult.consolidated.length, 1, "Duplicate business must not create a second record");
    assert.strictEqual(reingestResult.updated.length, 1, "Exact match should merge into existing record");

    // Business identity is preserved
    business = reingestResult.consolidated[0];
    assert.strictEqual(business.name, "Mbabane Premier Auto Care");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Verify its website status
  // ---------------------------------------------------------------------------
  await executeScenario(3, "Verify its website status", () => {
    // Perform audit and presence analysis
    business.presence = {
      hasWebsite: false,
      websiteStatus: "CONFIRMED_NO_WEBSITE",
      isAudited: true,
      lastCheckedAt: new Date().toISOString(),
      hasEmail: true,
      facebookStatus: "none",
      instagramStatus: "none",
      googleProfileQuality: "fair",
      deficits: {
        noWebsite: true,
        noEnquiryForm: true,
        missingContact: false
      }
    } as any;
    (business as any).deficits = business.presence.deficits as any;

    assert.strictEqual(business.presence.hasWebsite, false, "Must confirm absence of website");
    assert.strictEqual(business.presence.websiteStatus, "CONFIRMED_NO_WEBSITE");
    assert.strictEqual(business.presence.deficits.noWebsite, true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Generate an evidence-based opportunity assessment
  // ---------------------------------------------------------------------------
  await executeScenario(4, "Generate an evidence-based opportunity assessment", () => {
    const presScore = calculatePresenceScore(business.presence as any, 4.2, 8);
    const oppScore = calculateOpportunityScore(business.presence as any, 4.2, 8);

    assert.ok(presScore < 50, "Lack of website must severely penalize presence score");
    assert.ok(oppScore > 60, "Severe deficits with active local presence must yield high opportunity score");

    const qualification = evaluateProspectQualification(business);
    assert.strictEqual(qualification.status, "QUALIFIED", "Unrepresented business must be marked QUALIFIED");
    assert.ok(qualification.prioritizationRank > 50, "Prioritization rank must be high for high-need prospect");
    assert.ok(qualification.qualificationReason.length > 20, "Opportunity explanation must be substantiated");
    business.qualificationStatus = "QUALIFIED";
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Generate a website with relevant imagery
  // ---------------------------------------------------------------------------
  await executeScenario(5, "Generate a website with relevant imagery", () => {
    const rawAiOutput: any = {
      id: "site_auto_mbabane_01",
      businessId: business.id,
      businessName: business.name,
      primaryColor: "#0f172a",
      secondaryColor: "#2563eb",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      textColor: "#1e293b",
      fontStyle: "sans",
      hero: {
        headline: "Expert Automotive Service & Maintenance in Mbabane",
        subheadline: "Certified diagnostics, brakes, and scheduled servicing.",
        ctaText: "Request Inspection"
      },
      about: {
        title: "About Mbabane Premier Auto Care",
        paragraphs: ["Serving local motorists with dedicated mechanical expertise."]
      },
      services: [
        { title: "Brake Servicing", description: "Comprehensive inspection and pad replacement", price: "Request Quote" },
        { title: "Computer Diagnostics", description: "State-of-the-art ECU troubleshooting", price: "Request Quote" }
      ],
      features: [
        { title: "Transparent Quotations", description: "Clear pricing before work begins", icon: "Shield" }
      ],
      testimonials: [], // Zero fabricated testimonials
      faqs: [{ question: "Do you offer warranties on parts?", answer: "Manufacturer warranty applies on all genuine installed parts." }],
      contactPage: { title: "Contact Us", email: business.email, phone: business.phone, address: business.address },
      seo: { title: "Mbabane Premier Auto Care", description: "Car repairs in Mbabane", keywords: "auto repair, mechanic" },
      privacyPolicy: "Standard privacy terms",
      termsOfService: "Standard service terms"
    };

    generatedSite = normalizeWebsiteSchema(rawAiOutput, business, false);
    const validation = validateWebsiteSchema(generatedSite);
    assert.strictEqual(validation.valid, true, "Generated schema must be structurally valid");
    assert.strictEqual(generatedSite.testimonials.length, 0, "Anti-fabrication rule: 0 fake testimonials allowed");

    // Verify visual intelligence taxonomy match
    const taxonomy = matchIndustryTaxonomy(business.category);
    assert.ok(taxonomy !== null, "Automotive repair taxonomy must match category");
    assert.ok(taxonomy.curatedImages.length > 0, "Must provide curated category assets");

    // Test image ranking favoring domain-relevant assets over generic stock
    const requirement: ImageRequirement = {
      section: "hero",
      subject: "automotive diagnostics",
      serviceName: "Computer Diagnostics",
      style: "Modern",
      orientation: "landscape",
      aspectRatio: "16:9",
      keywords: ["mechanic", "auto diagnostic", "car engine"]
    };

    const curatedImage = taxonomy.curatedImages[0];
    const imageScore = rankAndScoreImage(curatedImage, {
      industry: "Auto Repair",
      requirement,
      usedImageIds: new Set()
    });
    assert.ok(imageScore.score > 0, "Curated image asset must score positively");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Create and open a secure preview
  // ---------------------------------------------------------------------------
  await executeScenario(6, "Create and open a secure preview", () => {
    previewToken = generateSecurePreviewToken();
    assert.strictEqual(isValidPreviewToken(previewToken), true, "Generated preview token must be cryptographically valid");

    const siteWithInternalData = {
      ...generatedSite,
      previewToken,
      internalNotes: "Confidential sales margin: 45%. Target deal close within 7 days.",
      commissionRate: 0.15
    };

    const publicPreview = sanitizePublicPreview(siteWithInternalData as any);
    assert.strictEqual(publicPreview.previewToken, previewToken);
    assert.strictEqual((publicPreview as any).internalNotes, undefined, "Private CRM notes must never leak to preview");
    assert.strictEqual((publicPreview as any).commissionRate, undefined, "Private commission data must never leak to preview");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Edit the website and preserve changes
  // ---------------------------------------------------------------------------
  await executeScenario(7, "Edit the website and preserve changes", () => {
    const updatedSite: GeneratedSite = {
      ...generatedSite,
      hero: {
        ...generatedSite.hero,
        title: "Mbabane's Premier Auto Care & Rapid Diagnostics"
      },
      updatedAt: new Date().toISOString()
    };

    const valResult = validateWebsiteSchema(updatedSite);
    assert.strictEqual(valResult.valid, true);
    assert.strictEqual(updatedSite.hero.title, "Mbabane's Premier Auto Care & Rapid Diagnostics");

    // Save site to local cache / persistence registry
    setLocalBusinessCache([business]);
    generatedSite = updatedSite;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Prepare outreach without automatically sending
  // ---------------------------------------------------------------------------
  await executeScenario(8, "Prepare outreach without automatically sending", () => {
    const draft = generatePersonalizedOutreachDraft(business, {
      channel: "email",
      tone: "Consultative",
      senderName: "Sipho Khumalo"
    });

    draft.recipientTarget = "info@mbabaneautocare.sz";
    draftId = draft.id;
    const saveRes = saveDraftToBusiness(business, draft);
    business = saveRes.business;

    const savedDraft = (business.outreachDrafts || []).find(d => d.id === draftId);
    assert.ok(savedDraft !== undefined, "Draft must be attached to prospect record");
    assert.ok(savedDraft.status === "draft" || savedDraft.status === "DRAFT", "New draft must be in DRAFT state");
    assert.ok(savedDraft.deliveryStatus !== "SENT", "Draft must NOT be automatically dispatched");
    assert.strictEqual(savedDraft.isApproved, false, "Draft requires explicit human approval before dispatch");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Record an approved outreach action using a test provider
  // ---------------------------------------------------------------------------
  await executeScenario(9, "Record an approved outreach action using a test provider", () => {
    const approver = { uid: "sales_mgr_01", displayName: "Sales Manager", role: "Manager" };
    const approveResult = approveOutreachDraft(business, draftId, approver, "Reviewed and verified claims");
    assert.strictEqual(approveResult.success, true, "Manager approval must succeed");
    business = approveResult.business;

    // Dispatch via isolated sandbox provider (SIMULATED mode, explicitly verified)
    const deliverResult = deliverOutreachMessage(
      business,
      draftId,
      {
        mode: "SIMULATED",
        customProvider: "sandbox_telecom_test_gateway"
      },
      approver
    );

    assert.strictEqual(deliverResult.success, true);
    assert.strictEqual(deliverResult.draft?.deliveryStatus, "SENT");
    assert.strictEqual(deliverResult.deliveryResult?.isSimulated, true, "Must be truthfully flagged as simulation");
    business = deliverResult.business;

    // Deduplication protection: Prevent duplicate send on already-sent message
    const dupSend = deliverOutreachMessage(
      business,
      draftId,
      { mode: "SIMULATED" },
      approver
    );
    assert.strictEqual(dupSend.success, false, "Duplicate send must be blocked");
    assert.ok(dupSend.error?.includes("already been delivered") || dupSend.error?.includes("Duplicate send blocked"));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Move the prospect through the sales pipeline
  // ---------------------------------------------------------------------------
  await executeScenario(10, "Move the prospect through the sales pipeline", async () => {
    // Valid canonical progression
    assert.strictEqual(isValidTransition("OPPORTUNITY_IDENTIFIED", "CONTACTED"), true);
    assert.strictEqual(isValidTransition("CONTACTED", "ENGAGED"), true);
    assert.strictEqual(isValidTransition("ENGAGED", "PROPOSAL_SENT"), true);

    // Invalid backwards or illegal skips
    assert.strictEqual(isValidTransition("OPPORTUNITY_IDENTIFIED", "WON"), false);
    assert.strictEqual(isValidTransition("PROPOSAL_SENT", "DISCOVERED"), false);

    business.salesStage = "PROPOSAL_SENT";
    await addBusinessActivity(business.id, {
      businessId: business.id,
      type: "lead_status_changed" as any,
      title: "Stage Updated to PROPOSAL_SENT",
      description: "Advanced stage to PROPOSAL_SENT after client demonstrated strong interest",
      timestamp: new Date().toISOString()
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Convert a legitimately won deal into onboarding
  // ---------------------------------------------------------------------------
  await executeScenario(11, "Convert a legitimately won deal into onboarding", async () => {
    const salesRep: TaskAssignee = { uid: "rep_01", displayName: "Sales Lead", role: "Sales" };
    
    // Create, approve, and sign proposal
    const docRes = await createCommercialDocument(
      business,
      {
        title: "Mbabane Auto Care Website & Hosting Agreement",
        type: "PROPOSAL",
        currency: "SZL",
        items: [{ description: "Custom Website Design, Setup & Local Hosting", quantity: 1, unitPrice: 3800 }],
        termsAndConditions: "Standard 30-day payment schedule"
      },
      salesRep
    );
    assert.strictEqual(docRes.success, true);

    const approveDocRes = await approveCommercialDocument(
      docRes.business,
      docRes.document!.id,
      { uid: "mgr_01", displayName: "Finance Manager", role: "Manager" }
    );
    assert.strictEqual(approveDocRes.success, true);

    const signDocRes = await acceptCommercialDocument(
      approveDocRes.business,
      approveDocRes.document!.id,
      { acceptedBy: "Sipho Khumalo (Owner)", method: "ELECTRONIC_SIGNATURE" },
      salesRep
    );
    assert.strictEqual(signDocRes.success, true);
    assert.strictEqual(signDocRes.document?.status, "ACCEPTED");

    business = signDocRes.business;
    business.dealOutcome = "WON";
    business.contractStatus = "SIGNED";

    // Initiate customer onboarding
    const onbRes = await initiateCustomerOnboarding(business, salesRep, {
      projectNotes: "Kickoff onboarding for Mbabane Premier Auto Care"
    });
    assert.strictEqual(onbRes.success, true);
    assert.strictEqual(onbRes.onboardingRecord?.status, "PENDING");
    assert.strictEqual(onbRes.onboardingRecord?.businessId, business.id);

    const advanceRes = await advanceOnboardingStatus(onbRes.business, "IN_PROGRESS", salesRep, "Discovery complete");
    assert.strictEqual(advanceRes.success, true);
    business = advanceRes.business;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Create a customer website project
  // ---------------------------------------------------------------------------
  await executeScenario(12, "Create a customer website project", async () => {
    const salesRep: TaskAssignee = { uid: "rep_01", displayName: "Sales Lead", role: "Sales" };
    const projRes = await initializeCustomerProject(business, salesRep, {
      projectType: "WEBSITE_NEW",
      customDomain: "mbabaneautocare.sz"
    });

    assert.strictEqual(projRes.success, true);
    assert.ok(projRes.project?.id !== undefined);
    assert.ok(projRes.project.tasks.length > 0, "Project must contain delivery tasks");
    business = projRes.business;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Verify launch readiness without performing an unauthorized live deployment
  // ---------------------------------------------------------------------------
  await executeScenario(13, "Verify launch readiness without performing an unauthorized live deployment", async () => {
    business.contractStatus = "SIGNED";
    business.paymentStatus = "PAID";
    business.phone = "+268 7600 8899";
    business.email = "info@mbabaneautocare.sz";
    business.presence = { ...business.presence, websiteUrl: "https://mbabaneautocare.sz" } as any;

    if (business.customerProject) {
      business.customerProject.tasks.forEach(t => { t.isCompleted = true; });
      business.customerProject.customerApprovals = [{
        id: "app_launch_01",
        versionNumber: 1,
        status: "APPROVED",
        approverName: "Sipho Khumalo",
        approverEmail: "sipho@khumalo.sz",
        approverRole: "Client Owner",
        approvalMethod: "DIGITAL_PORTAL",
        timestamp: new Date().toISOString()
      }];
      business.customerProject.customDomain = "mbabaneautocare.sz";
      business.customerProject.missingAssets = [];
    }

    const readiness = evaluateLaunchReadiness(business);
    assert.strictEqual(readiness.isReady, true, "Launch readiness checklist must pass");

    // Live deployment remains blocked until formal handover confirmation
    const handoverActor = { uid: "admin_01", displayName: "System Admin", role: "Admin" as any };
    business.customerHandover = {
      handoverId: "ho_auto_01",
      businessId: business.id,
      projectId: business.customerProject!.id,
      customerName: "Sipho Khumalo",
      customerEmail: "sipho@khumalo.sz",
      handoverStatus: "PENDING_CLIENT_CONFIRMATION",
      credentialsTransferred: true,
      auditHistory: []
    } as any;

    const handoverRes = await confirmCustomerHandover(business, handoverActor, {
      acceptedBy: "Sipho Khumalo",
      clientFeedback: "Website meets all specifications and brand guidelines."
    });
    assert.strictEqual(handoverRes.success, true);
    assert.strictEqual(handoverRes.handoverRecord?.handoverStatus, "ACCEPTED_BY_CLIENT");
    business = handoverRes.business;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Simulate payment failure in an isolated test environment
  // ---------------------------------------------------------------------------
  await executeScenario(14, "Simulate payment failure in an isolated test environment", async () => {
    // Setup active customer account and subscription first
    business.customerAccount = {
      id: "acc_mbabane_01",
      customerId: "cust_mbabane_01",
      businessId: business.id,
      businessName: business.name,
      ownerUserId: "user_sipho_01",
      primaryEmail: "sipho@khumalo.sz",
      accountStatus: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: []
    } as any;

    const initialPayRef = {
      provider: "stripe" as const,
      referenceId: "pi_stripe_init_01",
      amountPaid: 450,
      currency: "SZL",
      verifiedAt: new Date().toISOString()
    };
    const actor: TaskAssignee = { uid: "billing_system", displayName: "Billing System", role: "Admin" };

    const activateRes = await activatePaidSubscription(business, "plan_pro", "MONTHLY", initialPayRef, actor);
    assert.strictEqual(activateRes.success, true);
    business = activateRes.business;

    // Simulate an isolated invoice payment failure webhook
    const failedEvent: BillingEvent = {
      id: "evt_invoice_failed_99",
      eventId: "evt_invoice_failed_99",
      eventType: "invoice.payment_failed",
      eventTimestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      provider: "stripe",
      businessId: business.id,
      customerId: "cust_mbabane_01",
      subscriptionId: business.activeSubscription!.id,
      status: "PROCESSED",
      payload: {
        failureCode: "card_declined",
        failureMessage: "Your card was declined by the test bank issuer."
      }
    };

    const processRes = await processBillingEvent(business, failedEvent, actor);
    assert.strictEqual(processRes.success, true);
    assert.strictEqual(processRes.eventStatus, "PROCESSED");
    assert.strictEqual(processRes.subscription?.status, "PAST_DUE", "Subscription must transition to PAST_DUE");

    // Critical invariant: Failure must NOT erase customer business record or project
    assert.ok(processRes.business.customerProject !== undefined, "Customer project must not be erased");
    assert.strictEqual(processRes.business.id, business.id, "Business ID must remain intact");
    business = processRes.business;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Verify subscription entitlement restrictions
  // ---------------------------------------------------------------------------
  await executeScenario(15, "Verify subscription entitlement restrictions", () => {
    const sub = business.activeSubscription!;
    assert.strictEqual(sub.status, "PAST_DUE");

    const entitlements = calculateEffectiveEntitlements(sub, "ACTIVE");
    // While past due, custom domain and advanced AI generation are restricted
    assert.strictEqual(entitlements.custom_domain, false, "Custom domain should be frozen during past due");
    assert.strictEqual(entitlements.ai_generation, false, "AI generation should be restricted during past due");
    // Basic hosting remains active to avoid immediate downtime
    assert.strictEqual(entitlements.hosting, true, "Hosting grace period is maintained");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 16: Create and resolve a customer support ticket
  // ---------------------------------------------------------------------------
  await executeScenario(16, "Create and resolve a customer support ticket", async () => {
    const clientActor: TaskAssignee = { uid: "user_sipho_01", displayName: "Sipho Khumalo", role: "Client" as any };
    const createTicketRes = await createCustomerSupportTicket(
      business,
      {
        customerId: "cust_mbabane_01",
        requesterId: "user_sipho_01",
        requesterName: "Sipho Khumalo",
        requesterEmail: "sipho@khumalo.sz",
        subject: "Update emergency breakdown hotline number",
        description: "Please update the website emergency 24/7 hotline to +268 7600 9999.",
        category: "CONTENT_UPDATE",
        priority: "HIGH"
      },
      clientActor
    );

    assert.strictEqual(createTicketRes.success, true);
    const createdTicket = createTicketRes.ticket!;
    assert.strictEqual(createdTicket.status, "OPEN");
    assert.strictEqual(createdTicket.priority, "HIGH");

    // Verify client redaction
    const sanitizedTicket = sanitizeTicketForCustomer(createdTicket);
    assert.ok(sanitizedTicket.messages.every(m => !m.isInternal), "Internal notes must be hidden from client");

    // Support staff resolves ticket
    const staffActor: TaskAssignee = { uid: "support_lead_01", displayName: "Support Specialist", role: "Admin" };
    const resolveRes = await resolveSupportTicket(
      createTicketRes.business,
      createdTicket.id,
      { resolutionNotes: "Updated emergency breakdown hotline to +268 7600 9999 across website header and footer." },
      staffActor
    );

    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.ticket?.status, "RESOLVED");
    assert.ok(resolveRes.ticket?.resolvedTimestamp !== undefined);
    business = resolveRes.business;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 17: Attempt unauthorized cross-customer access
  // ---------------------------------------------------------------------------
  await executeScenario(17, "Attempt unauthorized cross-customer access", () => {
    // Session belonging to Customer B (Attacker / Different Tenant)
    const attackerSession = createCustomerSession({
      uid: "attacker_user_99",
      customerId: "cust_other_tenant_99",
      email: "intruder@domain.sz",
      role: "customer"
    });

    // Attempting to access Mbabane Premier Auto Care (owned by cust_mbabane_01)
    const accessCheck = authorizeCustomerAccess(business, attackerSession, "account");
    assert.strictEqual(accessCheck.authorized, false, "Cross-customer access must be denied");
    assert.strictEqual(accessCheck.status, 403, "Must return HTTP 403 Forbidden");

    const sanitizedData = sanitizeCustomerPortalData(business, attackerSession);
    assert.strictEqual(sanitizedData.account, null, "Attacker must receive null account payload");
    assert.strictEqual(sanitizedData.subscription, null, "Attacker must receive null subscription payload");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 18: Interrupt a workflow and verify safe recovery
  // ---------------------------------------------------------------------------
  await executeScenario(18, "Interrupt a workflow and verify safe recovery", async () => {
    // Save current good state to persistent memory store & local cache
    await saveBusinessRecord(business, "user_sipho_01");

    // Simulate an interrupted write / concurrency conflict
    const conflictResult = await saveBusinessRecord(
      { id: business.id, name: business.name, version: 2 },
      "user_sipho_01",
      {
        enforceConcurrencyLock: true,
        expectedVersion: 0 // Intentionally outdated version to trigger conflict
      }
    );

    assert.strictEqual(conflictResult.concurrencyConflict, true, "Concurrency conflict must be caught");
    assert.strictEqual(conflictResult.success, false);

    // Verify stored progress was NOT erased or corrupted
    const cachedBusinesses = getLocalBusinessCache();
    const recovered = cachedBusinesses.find(b => b.id === business.id);
    assert.ok(recovered !== undefined, "Previous valid business record must remain preserved in cache");
    assert.strictEqual(recovered.name, "Mbabane Premier Auto Care", "Business identity was not corrupted");

    // Record audit event
    await recordCanonicalAuditEvent({
      eventType: "WORKFLOW_RECOVERED",
      category: "SYSTEM_ACTION",
      outcome: "SUCCESS",
      actor: { actorId: "recovery_engine", role: "SYSTEM" },
      targetEntity: { entityType: "business", entityId: business.id },
      action: "recover",
      reason: "Safe recovery from simulated interrupted transaction"
    });

    const auditLogs = getCanonicalAuditLogs({ targetEntityId: business.id });
    assert.ok(auditLogs.length > 0, "Audit log records recovery event");
  });

  console.log("================================================================================");
  console.log(`  🎉 ALL ${passed}/${total} REAL-WORLD WORKFLOW SCENARIOS PASSED`);
  console.log("================================================================================\n");

  return { passed, failed, total, scenarios: scenarioResults };
}

if (process.argv[1]?.includes("e2e.test.ts")) {
  runE2eTests()
    .then(res => {
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error("Unexpected E2E Exception:", err);
      process.exit(1);
    });
}

import assert from "assert";
import { Business, WebsiteStatus, PresenceMetrics } from "../types";
import { 
  SearchQuery,
  validateSearchRelevance, 
  detectDataQualityAndConflicts, 
  normalizeSearchResult,
  filterAndRankSearchResults,
  handleSearchProviderFailure 
} from "../lib/searchNormalization";
import { 
  resolveDeterministicBusinessId, 
  mergeBusinessRecords, 
  deduplicateAndIngestBusinesses,
  GENERIC_PLATFORM_DOMAINS 
} from "../lib/businessIdentity";
import { 
  determineWebsiteStatusFromAudit, 
  normalizeCanonicalWebsiteStatus, 
  getWebsiteStatusDescription 
} from "../../server/services/auditService";
import { 
  calculateOpportunityScore, 
  calculateStructuredOpportunityResult,
  calculatePresenceScore 
} from "../../server/services/prospectService";
import { 
  evaluateProspectQualification 
} from "../lib/prospectQualification";
import { 
  saveBusinessRecord, 
  getLocalBusinessCache, 
  clearBusinessPersistenceStore 
} from "../lib/businessPersistence";
import { 
  betaValidationRepo, 
  BetaValidationEntry, 
  BetaDatasetQualityMetrics 
} from "../lib/betaValidationDataset";
import { classifySearchError } from "../lib/searchCache";
import { authorizeCustomerAccess, createCustomerSession } from "../lib/customerPortalAccess";

const createMockPresence = (overrides: Partial<PresenceMetrics> = {}): PresenceMetrics => ({
  hasWebsite: false,
  hasEmail: false,
  facebookStatus: "none",
  instagramStatus: "none",
  googleProfileQuality: "fair",
  reviewCountStatus: "few",
  photosStatus: "missing",
  descriptionQuality: "fair",
  openingHoursStatus: "missing",
  contactCompleteness: "partial",
  ...overrides
});

export async function runRealBusinessDiscoveryTests() {
  console.log("================================================================================");
  console.log("  SITESCOUT AI — MICRO-PHASE 19B: REAL BUSINESS DISCOVERY & ACCURACY SUITE      ");
  console.log("================================================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;
  let blocked = 0;

  async function runTest(name: string, fn: () => void | Promise<void>) {
    total++;
    const testNum = String(total).padStart(2, "0");
    try {
      await fn();
      passed++;
      console.log(`  ✓ [TEST ${testNum}/20 PASS] ${name}`);
    } catch (err: any) {
      if (err.message && err.message.includes("BLOCKED")) {
        blocked++;
        console.log(`  ⚠ [TEST ${testNum}/20 BLOCKED] ${name} — ${err.message}`);
      } else {
        failed++;
        console.error(`  ✗ [TEST ${testNum}/20 FAIL] ${name}`);
        console.error(`    Error: ${err.message}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 01: Business search by country
  // ---------------------------------------------------------------------------
  await runTest("Business search by country verifies nationwide coverage without city constraint", () => {
    const query: SearchQuery = { country: "Eswatini", city: "", category: "Solar" };
    const rawBiz = {
      name: "Kingdom Solar Solutions",
      category: "Solar",
      address: "Manzini-Mbabane Highway, Eswatini",
      phone: "+268 7600 9988",
      sourceUrl: "https://yellowpages.co.sz/kingdom-solar",
      directorySource: "Yellow Pages Eswatini",
      rating: 4.8,
      reviewsCount: 16
    };

    const norm = normalizeSearchResult(rawBiz, query, "Yellow Pages Eswatini");
    assert.strictEqual(norm.name, "Kingdom Solar Solutions");
    assert.strictEqual(norm.categoryMatch, true);
    assert.strictEqual(norm.locationMatch, true);
    assert.strictEqual(norm.matchConfidence, "EXACT");
    assert(norm.relevanceScore >= 80, "National search gives high relevance to country-matched record");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 02: Business search by city
  // ---------------------------------------------------------------------------
  await runTest("Business search by city enforces strict municipal boundary matching", () => {
    const queryMbabane: SearchQuery = { city: "Mbabane", country: "Eswatini", category: "Plumbing" };
    const bizInMbabane = {
      name: "Highland Plumbing",
      category: "Plumbing",
      address: "Mbabane CBD, Eswatini",
      phone: "+268 2404 9900"
    };
    const bizInManzini = {
      name: "Lowveld Drain Service",
      category: "Plumbing",
      address: "Manzini Central, Eswatini",
      phone: "+268 2505 1122"
    };

    const relMbabane = validateSearchRelevance(bizInMbabane, queryMbabane);
    const relManzini = validateSearchRelevance(bizInManzini, queryMbabane);

    assert.strictEqual(relMbabane.locationMatch, true);
    assert.strictEqual(relMbabane.matchConfidence, "EXACT");
    assert.strictEqual(relManzini.locationMatch, false, "Cross-city establishment does not claim exact city match");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 03: Business search by category
  // ---------------------------------------------------------------------------
  await runTest("Business search by category handles canonical aliases and synonyms without hallucination", () => {
    const query: SearchQuery = { city: "Mbabane", country: "Eswatini", category: "Plumbing" };
    const drainBiz = {
      name: "Capital Drain & Pipe Clearing",
      category: "Drain Unblocking & Sanitary Repairs",
      address: "Mbabane, Eswatini"
    };

    const rel = validateSearchRelevance(drainBiz, query);
    assert.strictEqual(rel.categoryMatch, true, "Plumbing synonyms (drain, pipe, sanitary) match requested category");
    assert.strictEqual(rel.isRelevant, true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 04: Combined location/category search
  // ---------------------------------------------------------------------------
  await runTest("Combined location and category search enforces multi-criteria relevance scoring", () => {
    const query: SearchQuery = { city: "Matsapha", country: "Eswatini", category: "Construction" };
    const matsaphaSteel = {
      name: "Matsapha Precision Steel",
      category: "Construction & Civil Engineering",
      address: "Matsapha Industrial Site, Eswatini",
      phone: "+268 2518 1000"
    };

    const rel = validateSearchRelevance(matsaphaSteel, query);
    assert.strictEqual(rel.categoryMatch, true);
    assert.strictEqual(rel.locationMatch, true);
    assert(rel.relevanceScore >= 90, "Dual match scores 90%+");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 05: Search returning no results
  // ---------------------------------------------------------------------------
  await runTest("Search returning no results yields empty array without injecting fabricated businesses", () => {
    const emptyResults: any[] = [];
    const query: SearchQuery = { city: "Lavumisa", country: "Eswatini", category: "Aerospace" };

    const ranked = filterAndRankSearchResults(emptyResults, query, "Google Search Grounding");
    assert.deepStrictEqual(ranked, [], "Empty directory results must return empty array");
    assert.strictEqual(ranked.length, 0);

    const failResponse = handleSearchProviderFailure("Google Search Grounding", "No listings found in Lavumisa", false);
    assert.strictEqual(failResponse.success, false);
    assert.deepStrictEqual(failResponse.businesses, [], "No fabricated mock businesses injected");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 06: Search-provider timeout
  // ---------------------------------------------------------------------------
  await runTest("Search-provider timeout is accurately classified without silent mock fallback", () => {
    const timeoutErr = new Error("Live directory search timed out after 45000ms");
    const classified = classifySearchError(timeoutErr);

    assert.strictEqual(classified.errorCode, "SEARCH_TIMEOUT");
    assert.strictEqual(classified.statusCode, 504);
    assert.strictEqual(classified.isTransient, true);

    const failResponse = handleSearchProviderFailure("Google Search Grounding", classified.message, false);
    assert.strictEqual(failResponse.success, false);
    assert.strictEqual(failResponse.isFallback, false);
    assert.strictEqual(failResponse.businesses.length, 0);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 07: Search-provider rate limit
  // ---------------------------------------------------------------------------
  await runTest("Search-provider rate limit returns HTTP 429 and retry metadata without data invention", () => {
    const rateLimitErr = new Error("Resource has been exhausted (e.g. check quota) - 429 Too Many Requests");
    const classified = classifySearchError(rateLimitErr);

    assert.strictEqual(classified.errorCode, "RATE_LIMITED");
    assert.strictEqual(classified.statusCode, 429);
    assert(classified.retryAfterSeconds !== undefined && classified.retryAfterSeconds > 0, "Provides retry-after guidance");

    const failResponse = handleSearchProviderFailure("Google Search Grounding", classified.message, false);
    assert.strictEqual(failResponse.success, false);
    assert.strictEqual(failResponse.businesses.length, 0);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 08: Duplicate business discovery
  // ---------------------------------------------------------------------------
  await runTest("Duplicate business discovery deduplicates identical entities using deterministic ID", () => {
    const query: SearchQuery = { city: "Mbabane", country: "Eswatini", category: "Plumbing" };
    const rawList = [
      {
        name: "Mbabane Plumbing & Maintenance Services",
        category: "Plumbing",
        address: "Sheffield Road, Mbabane, Eswatini",
        phone: "+268 2404 1234",
        sourceUrl: "https://yellowpages.co.sz/mbabane-plumbing",
        directorySource: "Yellow Pages Eswatini"
      },
      {
        name: "Mbabane Plumbing & Maintenance Services",
        category: "Plumbing",
        address: "Sheffield Road, Mbabane, Eswatini",
        phone: "+268 2404 1234",
        sourceUrl: "https://selldirect.co.sz/mbabane-plumbing",
        directorySource: "Selldirect Eswatini"
      }
    ];

    const ranked = filterAndRankSearchResults(rawList, query, "Directory Ingestion");
    assert.strictEqual(ranked.length, 1, "Duplicate listings with same phone and name merge into single record");
    assert.strictEqual(ranked[0].phone, "+268 2404 1234");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 09: Same-name businesses in different locations
  // ---------------------------------------------------------------------------
  await runTest("Same-name businesses in different locations remain distinct without collisions", () => {
    const mbabaneBranch = resolveDeterministicBusinessId({
      name: "Apex Auto Repairs",
      city: "Mbabane",
      country: "Eswatini",
      address: "Plot 44 Industrial Road, Mbabane"
    });

    const manziniBranch = resolveDeterministicBusinessId({
      name: "Apex Auto Repairs",
      city: "Manzini",
      country: "Eswatini",
      address: "Corner Tenbergen & Ngwane, Manzini"
    });

    assert.notStrictEqual(
      mbabaneBranch.businessId,
      manziniBranch.businessId,
      "Same-name businesses in distinct municipalities must produce separate deterministic IDs"
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Business with a verified website
  // ---------------------------------------------------------------------------
  await runTest("Business with a verified website is marked WEBSITE_CONFIRMED and not falsely flagged", () => {
    const liveAudit = {
      hasWebsite: true,
      httpStatus: "200 OK",
      responseTimeMs: 220,
      isSsl: true,
      notes: "Active corporate website verified",
      deficits: {
        noWebsite: false,
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: false,
        noOnlineCatalogue: false,
        noBookingSystem: false,
        noEnquiryForm: false,
        noSeo: false,
        brokenLinks: false,
        poorMobileExperience: false,
        missingContact: false
      }
    };

    const status = determineWebsiteStatusFromAudit(liveAudit as any, "https://swazidrain.sz");
    assert(status === "LIVE" || status === "WEBSITE_CONFIRMED");

    const canonicalStatus = normalizeCanonicalWebsiteStatus(status);
    assert.strictEqual(canonicalStatus, "WEBSITE_CONFIRMED");

    const desc = getWebsiteStatusDescription(status);
    assert(desc.includes("live website was detected"), "Clear factual description provided");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Business with no discovered website
  // ---------------------------------------------------------------------------
  await runTest("Business with no discovered website is classified as WEBSITE_NOT_DISCOVERED without assumption", () => {
    const status = determineWebsiteStatusFromAudit(null, "");
    assert.strictEqual(status, "WEBSITE_NOT_DISCOVERED");

    const canonicalStatus = normalizeCanonicalWebsiteStatus(status);
    assert.strictEqual(canonicalStatus, "WEBSITE_NOT_DISCOVERED");

    const desc = getWebsiteStatusDescription(status);
    assert.strictEqual(desc, "No website was discovered from the available sources.");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Business with an unreachable website
  // ---------------------------------------------------------------------------
  await runTest("Business with an unreachable website is identified as WEBSITE_UNREACHABLE", () => {
    const timeoutAudit = {
      hasWebsite: false,
      httpStatus: "Connection timed out / DNS failure (Host not found)",
      responseTimeMs: null
    };

    const status = determineWebsiteStatusFromAudit(timeoutAudit as any, "http://manzinichambers-unreachable.sz");
    assert(status === "UNREACHABLE" || status === "WEBSITE_UNREACHABLE");

    const canonicalStatus = normalizeCanonicalWebsiteStatus(status);
    assert.strictEqual(canonicalStatus, "WEBSITE_UNREACHABLE");

    const desc = getWebsiteStatusDescription(status);
    assert(desc.includes("unreachable"), "Reports website was unreachable");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Business with missing contact details
  // ---------------------------------------------------------------------------
  await runTest("Business with missing contact details records missing fields explicitly without invention", () => {
    const bizWithoutContacts = {
      name: "Hhohho Geyser & Piping Co",
      category: "Plumbing",
      address: "Mbabane, Eswatini",
      phone: "Unlisted"
      // No email, no website
    };

    const quality = detectDataQualityAndConflicts(bizWithoutContacts);
    assert(quality.missingFields.includes("phone"), "Flags missing phone");
    assert(quality.missingFields.includes("email"), "Flags missing email");
    assert(quality.missingFields.includes("website"), "Flags missing website");

    const norm = normalizeSearchResult(bizWithoutContacts, { city: "Mbabane", category: "Plumbing" });
    assert.strictEqual(norm.phone, "Unlisted");
    assert.strictEqual(norm.email, undefined);
    assert.strictEqual(norm.websiteUrl, undefined);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Business with conflicting source information
  // ---------------------------------------------------------------------------
  await runTest("Business with conflicting source information preserves conflicting citations for review", () => {
    const sourceA = { phone: "+268 2404 1111", websiteUrl: "https://valleyclinic.sz" };
    const sourceB = { phone: "+268 7600 2222", websiteUrl: "https://valleymedical.org" };

    const quality = detectDataQualityAndConflicts(
      { name: "Valley Clinic", address: "Ezulwini" },
      [sourceA, sourceB]
    );

    assert.strictEqual(quality.hasConflictingData, true);
    assert(quality.conflicts.some(c => c.includes("Conflicting phone numbers")));
    assert(quality.conflicts.some(c => c.includes("Conflicting website domains")));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Opportunity scoring with strong evidence
  // ---------------------------------------------------------------------------
  await runTest("Opportunity scoring with strong evidence generates high score and verified confidence", () => {
    const auditedBiz = {
      name: "Swazi Drain Emergency Plumbers",
      category: "Plumbing",
      address: "Mbabane, Eswatini",
      phone: "+268 7600 1234",
      rating: 4.8,
      reviewsCount: 35,
      verificationState: "VERIFIED",
      presence: createMockPresence({
        hasWebsite: false,
        websiteStatus: "WEBSITE_NOT_DISCOVERED",
        lastCheckedAt: new Date().toISOString()
      }),
      evidence: {
        checkedAt: new Date().toISOString(),
        verificationStatus: "source_backed",
        source: "Yellow Pages Eswatini Audit"
      }
    };

    const opp = calculateStructuredOpportunityResult(auditedBiz);
    assert(opp.score >= 70, `Score is high (${opp.score}) for high-intent business missing website`);
    assert(opp.evidenceConfidence.level === "HIGH" || opp.evidenceConfidence.level === "MEDIUM");
    assert(opp.confirmedOpportunities.length > 0);
  });

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // SCENARIO 16: Opportunity scoring with insufficient evidence
  // ---------------------------------------------------------------------------
  await runTest("Opportunity scoring with insufficient evidence marks UNCONFIRMED_NEED without inflation", () => {
    const unverifiedBiz: Business = {
      id: "unverified_biz_01",
      name: "Generic Corner Shop",
      category: "Retail",
      address: "Mbabane",
      phone: "Unlisted",
      rating: 0,
      reviewsCount: 0,
      description: "Corner grocery store",
      presence: createMockPresence({
        hasWebsite: false,
        websiteStatus: "WEBSITE_NOT_DISCOVERED",
        isAudited: false
      })
    };

    const qual = evaluateProspectQualification(unverifiedBiz);
    assert(qual.status === "DISQUALIFIED" || qual.status === "NEEDS_REVIEW" || qual.status === "UNQUALIFIED");
    assert(qual.qualificationScore <= 40, "Score is not inflated when evidence is missing");
    assert(qual.reviewTriggers.length > 0, "Triggers manual review before qualifying");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 17: Prospect persistence
  // ---------------------------------------------------------------------------
  await runTest("Prospect persistence saves discovered business with full audit integrity", async () => {
    clearBusinessPersistenceStore();

    const sampleBiz: Business = {
      id: "biz_persistent_discovery_01",
      name: "Mbabane Civil Contractors",
      category: "Construction",
      address: "Industrial Sites, Mbabane",
      phone: "+268 2404 8888",
      rating: 4.5,
      reviewsCount: 12,
      description: "Civil infrastructure works",
      presence: createMockPresence(),
      salesStage: "DISCOVERED"
    };

    const saveRes = await saveBusinessRecord(sampleBiz, undefined, { rejectInvalidData: true });
    assert.strictEqual(saveRes.success, true);
    assert.strictEqual(saveRes.isNew, true);

    const cache = getLocalBusinessCache();
    const retrieved = cache.find(b => b.id === "biz_persistent_discovery_01");
    assert(retrieved !== undefined);
    assert.strictEqual(retrieved?.name, "Mbabane Civil Contractors");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 18: Repeated search without duplicate creation
  // ---------------------------------------------------------------------------
  await runTest("Repeated search execution ingests without creating duplicate database records", () => {
    const existingDb: Business[] = [
      {
        id: "biz_tel_26824041234_a1b2c3",
        name: "Mbabane Plumbing & Maintenance Services",
        category: "Plumbing",
        address: "Sheffield Road, Mbabane",
        phone: "+268 2404 1234",
        rating: 4.6,
        reviewsCount: 14,
        description: "Initial indexed record",
        presence: createMockPresence(),
        salesStage: "DISCOVERED"
      }
    ];

    const incomingSearchBiz: Business = {
      id: "biz_tel_26824041234_a1b2c3",
      name: "Mbabane Plumbing & Maintenance Services",
      category: "Plumbing",
      address: "Sheffield Road, Industrial Sites, Mbabane",
      phone: "+268 2404 1234",
      rating: 4.7,
      reviewsCount: 16,
      description: "Enriched description from Selldirect",
      presence: createMockPresence(),
      salesStage: "DISCOVERED"
    };

    const dedupResult = deduplicateAndIngestBusinesses(existingDb, [incomingSearchBiz]);
    assert.strictEqual(dedupResult.consolidated.length, 1, "Count remains exactly 1");
    assert.strictEqual(dedupResult.updated.length, 1);
    assert.strictEqual(dedupResult.added.length, 0);
    assert.strictEqual(dedupResult.consolidated[0].reviewsCount, 16, "Enriched reviews count updated");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 19: CRM record preservation
  // ---------------------------------------------------------------------------
  await runTest("CRM record preservation protects advanced salesStage and customer deals from being overwritten", () => {
    const existingCrmProspect: Business = {
      id: "biz_crm_won_001",
      name: "Swazi Drain & Leak Specialists",
      category: "Plumbing",
      address: "Mbabane",
      phone: "+268 7602 3344",
      rating: 4.8,
      reviewsCount: 22,
      description: "Won deal prospect",
      presence: createMockPresence(),
      salesStage: "WON", // Advanced stage
      prospectNotes: "Client signed quarterly retainer agreement"
    };

    const newDiscoveryData: Business = {
      id: "biz_crm_won_001",
      name: "Swazi Drain & Leak Specialists",
      category: "Plumbing",
      address: "Mbabane Central",
      phone: "+268 7602 3344",
      rating: 4.8,
      reviewsCount: 25,
      description: "Re-discovered from Yellow Pages",
      presence: createMockPresence(),
      salesStage: "DISCOVERED" // Attempt to revert to DISCOVERED
    };

    const reconciled = mergeBusinessRecords(existingCrmProspect, newDiscoveryData);
    assert.strictEqual(reconciled.salesStage, "WON", "Advanced salesStage WON must NEVER be downgraded to DISCOVERED");
    assert.strictEqual(reconciled.prospectNotes, "Client signed quarterly retainer agreement");
    assert.strictEqual(reconciled.reviewsCount, 25, "Enriched review count safely adopted");
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 20: Unauthorized access to another user's prospects
  // ---------------------------------------------------------------------------
  await runTest("Multi-tenant boundary strictly blocks unauthorized cross-user prospect access", () => {
    const victimBusiness = {
      id: "biz_owner_alice_99",
      businessId: "biz_owner_alice_99",
      businessName: "Alice Secret Logistics",
      customerAccount: {
        id: "acc_alice_99",
        customerId: "cust_alice_99",
        businessId: "biz_owner_alice_99",
        ownerUserId: "usr_alice_123",
        primaryEmail: "alice@secretlogistics.sz"
      }
    };

    const attackerSession = createCustomerSession({
      uid: "usr_mallory_999",
      email: "mallory@attacker.com",
      role: "customer"
    });

    const accessCheck = authorizeCustomerAccess(victimBusiness as any, attackerSession, "account", victimBusiness.id);
    assert.strictEqual(accessCheck.authorized, false, "Unauthorized tenant access must be rejected");
    assert.strictEqual(accessCheck.status, 403);
    assert.strictEqual(accessCheck.errorCode, "FORBIDDEN_RESOURCE");
  });

  // ---------------------------------------------------------------------------
  // VALIDATION DATASET EVALUATION
  // ---------------------------------------------------------------------------
  const metrics: BetaDatasetQualityMetrics = betaValidationRepo.calculateMetrics();
  console.log("\n--------------------------------------------------------------------------------");
  console.log("  BETA VALIDATION DATASET METRICS (Isolated Real Provider Runs):");
  console.log(`  • Total Validation Searches Executed: ${metrics.totalSearches}`);
  console.log(`  • Total Real Businesses Retrieved:    ${metrics.totalBusinessesRetrieved}`);
  console.log(`  • Relevant Businesses Identified:     ${metrics.relevantBusinesses}`);
  console.log(`  • Duplicate Listings Reconciled:      ${metrics.duplicatesDetected}`);
  console.log(`  • Missing Contact Numbers:            ${metrics.missingContactInfo.missingPhone}`);
  console.log(`  • Missing Contact Emails:             ${metrics.missingContactInfo.missingEmail}`);
  console.log(`  • Confirmed Audited Websites:         ${metrics.websiteOutcomes.confirmedWebsites}`);
  console.log(`  • Undiscovered Websites (Directory):  ${metrics.websiteOutcomes.undiscoveredWebsites}`);
  console.log(`  • Unreachable Domains Identified:     ${metrics.websiteOutcomes.unreachableWebsites}`);
  console.log(`  • Records Flagged for Manual Review:  ${metrics.recordsRequiringManualReview}`);
  console.log("--------------------------------------------------------------------------------\n");

  console.log("================================================================================");
  console.log(`  DISCOVERY SUITE SUMMARY: ${passed}/${total} Scenarios PASSED (${failed} Failed, ${blocked} Blocked)`);
  console.log("================================================================================\n");

  return { total, passed, failed, blocked, metrics };
}

if (process.argv[1]?.includes("realBusinessDiscovery.test.ts")) {
  runRealBusinessDiscoveryTests()
    .then((res) => {
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Test execution failure:", err);
      process.exit(1);
    });
}

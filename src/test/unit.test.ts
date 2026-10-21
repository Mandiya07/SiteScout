import assert from "assert";
import { resolveDeterministicBusinessId, matchBusinessRecord, deduplicateAndIngestBusinesses, normalizePhoneNumber } from "../lib/businessIdentity";
import { evaluateProspectQualification } from "../lib/prospectQualification";
import { calculatePresenceScore, calculateOpportunityScore } from "../../server/services/prospectService";
import { classifyFact, sanitizeLiabilityClaims } from "../lib/websiteSchema";
import { matchIndustryTaxonomy } from "../../server/image/taxonomy";
import { rankAndScoreImage } from "../../server/image/imageRanking";
import { roundMoney } from "../lib/customerBilling";
import { formatCurrency } from "../lib/prospectFinancials";
import { calculateEffectiveEntitlements } from "../lib/subscriptionBillingEvents";
import { validateSearchPayload, validateAiGenerationPayload, validateContactFormPayload, validateFileUpload } from "../lib/apiSecurity";
import { Business, CustomerSubscription, GeneratedSite, ImageMetadata } from "../types";
import { ImageRequirement } from "../../server/image/types";

export async function runUnitTests(): Promise<{ passed: number; failed: number; total: number }> {
  console.log("=== RUNNING UNIT TEST SUITE ===");
  let passed = 0;
  let failed = 0;
  let total = 0;

  function test(description: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [UNIT PASS] ${description}`);
    } catch (err: any) {
      failed++;
      console.error(`  ✗ [UNIT FAIL] ${description}: ${err.message || err}`);
    }
  }

  // 1. Business Identity & Deduplication
  test("resolveDeterministicBusinessId generates identical IDs for equivalent names/locations", () => {
    const id1 = resolveDeterministicBusinessId({ name: "Alpha Plumbing", address: "Mbabane", phone: "+268 7600 1111" });
    const id2 = resolveDeterministicBusinessId({ name: "Alpha Plumbing", address: "Mbabane", phone: "+26876001111" });
    assert.strictEqual(id1.businessId, id2.businessId, "Normalized phone numbers must produce identical deterministic IDs");
  });

  test("matchBusinessRecord detects match with normalized international and local phones", () => {
    const existing: Business[] = [{ id: "b_apex", name: "Apex Builders", phone: "+268 7612 3456", address: "Manzini, Eswatini" } as any];
    const match = matchBusinessRecord(
      { name: "Apex Builders", phone: "76123456", address: "Manzini" },
      existing
    );
    assert.strictEqual(match.matched, true, "Should recognize equivalent phone and address");
    assert.ok(match.confidence >= 0.8, "Confidence should exceed matching threshold");
  });

  test("deduplicateAndIngestBusinesses collapses duplicates while merging metadata", () => {
    const initialDb: Business[] = [{ id: "b1", name: "Beta Electric", phone: "+268 7600 2222", address: "Ezulwini" } as any];
    const rawList = [
      { name: "Beta Electric", phone: "+268 7600 2222", address: "Ezulwini", email: "info@beta.sz" }
    ];
    const deduplicated = deduplicateAndIngestBusinesses(initialDb, rawList as any);
    assert.strictEqual(deduplicated.consolidated.length, 1, "Duplicate business records must be merged into single entity");
    assert.strictEqual(deduplicated.consolidated[0].email, "info@beta.sz", "Merged record preserves enriched fields");
  });

  // 2. Prospect Qualification & Scoring
  test("evaluateProspectQualification assigns HIGH priority to businesses without website", () => {
    const res = evaluateProspectQualification({
      id: "b_corner",
      name: "Corner Bakery",
      category: "Bakery",
      phone: "+268 7600 1234",
      presence: {
        hasWebsite: false,
        websiteStatus: "CONFIRMED_NO_WEBSITE",
        isAudited: true,
        lastCheckedAt: new Date().toISOString(),
        hasEmail: false,
        googleProfileQuality: "poor",
        deficits: { noWebsite: true }
      } as any,
      deficits: { noWebsite: true } as any
    } as any);
    assert.strictEqual(res.status, "QUALIFIED", "Unrepresented business should be qualified");
    assert.ok(res.qualificationScore > 0, "Opportunity score should be high for missing website");
  });

  test("calculatePresenceScore accurately calculates weighted digital presence", () => {
    const score1 = calculatePresenceScore({ hasWebsite: false, hasEmail: false } as any, 3.5, 2);
    const score2 = calculatePresenceScore({ hasWebsite: true, hasEmail: true, facebookStatus: "active" } as any, 4.8, 45);
    assert.ok(score1 < score2, "Business with website and reviews must have higher presence score");
  });

  // 3. Website Audit & Liability Sanitization
  test("sanitizeLiabilityClaims removes unsubstantiated certification and warranty claims", () => {
    const rawSite: GeneratedSite = {
      id: "site_test_plumbing",
      businessId: "biz_plumb",
      businessName: "Test Plumbing",
      hero: {
        headline: "100% satisfaction guarantee or full refund",
        subheadline: "Certified master technicians with 20 years experience",
        ctaText: "Call Now",
        secondaryCtaText: "WhatsApp"
      },
      about: {
        title: "About",
        paragraphs: ["Fast local responsive plumbing."]
      },
      services: [{ title: "Drain Cleaning", description: "Quick response", price: "Call for Pricing" }]
    } as any;
    const { sanitizedCount, findings } = sanitizeLiabilityClaims(rawSite);
    assert.ok(sanitizedCount > 0, "Unsubstantiated guarantee or certification should be detected and sanitized");
    assert.ok(findings.length > 0, "Sanitization findings must be recorded");
  });

  // 4. Image Taxonomy & Ranking
  test("matchIndustryTaxonomy resolves correct taxonomy for category aliases", () => {
    const taxPlumbing = matchIndustryTaxonomy("plumber");
    assert.strictEqual(taxPlumbing?.industry, "Plumbing", "Plumber should map to Plumbing taxonomy");
    const taxRestaurant = matchIndustryTaxonomy("cafe");
    assert.strictEqual(taxRestaurant?.industry, "Restaurant", "Cafe should map to Restaurant");
  });

  test("rankAndScoreImage favors high-relevance and verified license imagery", () => {
    const img1: any = {
      id: "img_pipe",
      fullUrl: "https://images.unsplash.com/photo-1",
      alt: "modern plumbing piping repair",
      tags: ["plumbing", "pipes"],
      license: "unsplash",
      provider: "unsplash",
      relevanceScore: 0.9,
      style: "modern",
      usageType: "stock"
    };
    const img2: any = {
      id: "img_wall",
      fullUrl: "https://images.unsplash.com/photo-2",
      alt: "abstract background wallpaper",
      tags: ["wallpaper"],
      license: "unknown",
      provider: "unsplash",
      relevanceScore: 0.1,
      style: "modern",
      usageType: "stock"
    };
    const req: ImageRequirement = {
      section: "hero",
      subject: "plumbing repair",
      serviceName: "plumbing repair",
      style: "Modern",
      orientation: "landscape",
      aspectRatio: "16:9",
      keywords: ["plumber", "repair"]
    };
    const score1 = rankAndScoreImage(img1, { industry: "Home Services", requirement: req, serviceName: "plumbing repair", usedImageIds: new Set() });
    const score2 = rankAndScoreImage(img2, { industry: "Home Services", requirement: req, serviceName: "plumbing repair", usedImageIds: new Set() });
    assert.ok(score1.score > score2.score, "Domain-relevant image should score substantially higher than abstract wallpaper");
  });

  // 5. Financial & Billing Invariants
  test("roundMoney maintains precision to 2 decimal places without floating drift", () => {
    assert.strictEqual(roundMoney(19.999), 20.00);
    assert.strictEqual(roundMoney(10.104), 10.10);
    assert.strictEqual(formatCurrency(1250, "USD"), "USD $1,250.00");
  });

  test("calculateEffectiveEntitlements derives feature limits accurately based on subscription plan", () => {
    const starterSub: CustomerSubscription = {
      id: "sub_1",
      subscriptionId: "sub_1",
      customerId: "cust_1",
      businessId: "biz_1",
      planId: "plan_basic",
      planName: "Basic",
      plan: "STARTER",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      unitPrice: 450,
      amount: 450,
      currency: "SZL",
      startDate: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
      cancelAtPeriodEnd: false,
      entitlementsSnapshot: {} as any,
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const starterEntitlements = calculateEffectiveEntitlements(starterSub);
    assert.strictEqual(starterEntitlements.custom_domain, false);
    assert.strictEqual(starterEntitlements.website_generation, true);

    const growthSub: CustomerSubscription = {
      ...starterSub,
      planId: "plan_pro",
      planName: "Pro",
      plan: "GROWTH"
    };
    const growthEntitlements = calculateEffectiveEntitlements(growthSub);
    assert.strictEqual(growthEntitlements.custom_domain, true);
  });

  // 6. Input Payload Validation Guards
  test("validateSearchPayload validates bounds and rejects malformed inputs", () => {
    assert.strictEqual(validateSearchPayload({ city: "Mbabane", page: 1 }).valid, true);
    assert.strictEqual(validateSearchPayload({ page: -1 }).valid, false);
    assert.strictEqual(validateSearchPayload({ radius: 9999 }).valid, false);
  });

  test("validateAiGenerationPayload requires non-empty business name", () => {
    assert.strictEqual(validateAiGenerationPayload({ business: { name: "Apex Ltd" } }).valid, true);
    assert.strictEqual(validateAiGenerationPayload({ business: { name: "" } }).valid, false);
    assert.strictEqual(validateAiGenerationPayload({}).valid, false);
  });

  test("validateContactFormPayload catches honeypots and invalid emails", () => {
    assert.strictEqual(
      validateContactFormPayload({ name: "Alice", email: "alice@test.com", message: "Inquiry details" }).valid,
      true
    );
    assert.strictEqual(
      validateContactFormPayload({ name: "Spam", email: "spam@test.com", message: "Buy now", honeypot: "bot-data" }).valid,
      false
    );
    assert.strictEqual(
      validateContactFormPayload({ name: "Alice", email: "bad-email", message: "Inquiry" }).valid,
      false
    );
  });

  test("validateFileUpload enforces extension and MIME integrity", () => {
    assert.strictEqual(
      validateFileUpload({ fileName: "photo.jpg", fileType: "image/jpeg", fileSize: 5000 }).valid,
      true
    );
    assert.strictEqual(
      validateFileUpload({ fileName: "script.sh", fileType: "image/png", fileSize: 5000 }).valid,
      false
    );
    assert.strictEqual(
      validateFileUpload({ fileName: "photo.png", fileType: "image/png", fileSize: 20 * 1024 * 1024 }).valid,
      false
    );
  });

  console.log(`=== UNIT TESTS SUMMARY: ${passed}/${total} PASSED (${failed} FAILED) ===\n`);
  return { passed, failed, total };
}

if (process.argv[1]?.includes("unit.test.ts")) {
  runUnitTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

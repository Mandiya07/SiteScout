import { runSecurityRuleAssertions } from "../../firestore.rules.test";
import { isPrivateIp, validateHostname, validateUrlForSsrf } from "../../server/ssrfGuard";
import { escapeHtml, sanitizeUrl } from "./htmlGenerator";
import { buildBusinessTruthProfile } from "./businessTruth";
import { calculatePresenceScore, calculateOpportunityScore } from "../../server/services/prospectService";

/**
 * SiteScout AI - Automated Phase 12 Comprehensive Test & QA Suite
 */

export async function runFullQaSuite(): Promise<{ total: number; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("  SITESCOUT AI - PHASE 12 AUTOMATED QA & QA SUITE  ");
  console.log("=================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: SSRF Protection & Host Validation
  // ----------------------------------------------------
  console.log("--> Group 1: SSRF Guard Protections");
  assert(isPrivateIp("127.0.0.1") === true, "Block IPv4 Loopback (127.0.0.1)");
  assert(isPrivateIp("10.0.0.5") === true, "Block Private IPv4 Class A (10.0.0.5)");
  assert(isPrivateIp("172.16.0.1") === true, "Block Private IPv4 Class B (172.16.0.1)");
  assert(isPrivateIp("192.168.1.1") === true, "Block Private IPv4 Class C (192.168.1.1)");
  assert(isPrivateIp("169.254.169.254") === true, "Block Cloud Metadata IP (169.254.169.254)");
  assert(isPrivateIp("8.8.8.8") === false, "Allow Public IPv4 (8.8.8.8)");

  assert(validateHostname("localhost").valid === false, "Reject Hostname: localhost");
  assert(validateHostname("metadata.google.internal").valid === false, "Reject Hostname: metadata.google.internal");
  assert(validateHostname("0x7f000001").valid === false, "Reject Hex Encoded IP Hostname");
  assert(validateHostname("google.com").valid === true, "Allow Valid Public Hostname: google.com");

  const ssrfLocalRes = await validateUrlForSsrf("http://localhost:3000/api/health");
  assert(ssrfLocalRes.safe === false, "Reject SSRF Target: http://localhost:3000");

  const ssrfFileRes = await validateUrlForSsrf("file:///etc/passwd");
  assert(ssrfFileRes.safe === false, "Reject Non-HTTP/HTTPS Protocol: file://");

  // ----------------------------------------------------
  // TEST GROUP 2: HTML Escaping & Link Sanitization
  // ----------------------------------------------------
  console.log("\n--> Group 2: HTML Escaping & XSS Protections");
  const malScript = '<script>alert("XSS")</script>';
  const escapedScript = escapeHtml(malScript);
  assert(!escapedScript.includes("<script>") && escapedScript.includes("&lt;script&gt;"), "Escape Script Tags");

  const malUrl = "javascript:alert('XSS')";
  const sanitizedMalUrl = sanitizeUrl(malUrl);
  assert(sanitizedMalUrl === "#", "Sanitize Malicious Scheme: javascript:");

  const validWaUrl = "https://wa.me/27123456789";
  assert(sanitizeUrl(validWaUrl) === "https://wa.me/27123456789", "Allow Safe HTTPS Scheme");

  // ----------------------------------------------------
  // TEST GROUP 3: Audit Semantics & Scoring Logic
  // ----------------------------------------------------
  console.log("\n--> Group 3: Audit Semantics & Scoring Logic");
  const presenceNoWeb = { hasWebsite: false, hasEmail: false };
  const scoreNoWeb = calculatePresenceScore(presenceNoWeb, 0, 0);
  const oppNoWeb = calculateOpportunityScore(presenceNoWeb, 0, 0);
  assert(scoreNoWeb < 50, "Low Presence Score for business without website");
  assert(oppNoWeb > 50, "High Opportunity Score for business without website");

  const presenceGoodWeb = {
    hasWebsite: true,
    hasEmail: true,
    facebookStatus: "active",
    googleProfileQuality: "good"
  };
  const scoreGoodWeb = calculatePresenceScore(presenceGoodWeb, 4.8, 120);
  assert(scoreGoodWeb >= 80, "High Presence Score for complete digital footprint");

  // ----------------------------------------------------
  // TEST GROUP 4: Business Truth Invariants
  // ----------------------------------------------------
  console.log("\n--> Group 4: Business Truth Invariants");
  const sampleBiz = {
    id: "biz-123",
    name: "Apex Plumbing",
    category: "Plumber",
    phone: "+27821234567",
    address: "Cape Town",
    presence: { hasWebsite: false }
  };
  const profile = buildBusinessTruthProfile(sampleBiz);
  assert(profile.businessName.value === "Apex Plumbing", "Truth Profile retains business name");
  assert(profile.website.value === "No website found", "Truth Profile confirms missing website");
  assert(profile.summary.verifiedCount >= 1, "Truth Profile assigns VERIFIED level to confirmed attributes");

  // ----------------------------------------------------
  // TEST GROUP 5: Firestore Security Rules TDD Matrix
  // ----------------------------------------------------
  console.log("\n--> Group 5: Firestore Security Rules Assertion Matrix");
  const secResult = runSecurityRuleAssertions();
  assert(secResult.failed === 0, "All 12 Firestore Attack Vector Payloads Blocked");

  console.log(`\n=================================================`);
  console.log(`  QA SUITE SUMMARY: ${passed}/${total} Tests PASSED (${failed} Failures)`);
  console.log(`=================================================\n`);

  return { total, passed, failed };
}

if (process.argv[1]?.includes("qaSuite.test.ts")) {
  runFullQaSuite().catch(console.error);
}

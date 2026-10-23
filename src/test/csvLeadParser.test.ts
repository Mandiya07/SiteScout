import { parseCsvRows, parseLeadsCsv, generateSampleLeadsCsv, detectHeaderMapping, parseSalesStage } from "../lib/csvLeadParser";

console.log("=== RUNNING CSV LEAD PARSER TEST SUITE ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

// 1. Test parseCsvRows RFC 4180
const testCsv = `"Company","Phone","Email"\r\n"Acme, Inc.","+1 555-0199","info@acme.com"\r\n"Beta ""The Best"" Ltd","+1 555-0200","hello@beta.com"`;
const rows = parseCsvRows(testCsv);
assert(rows.length === 3, "Parsed 3 rows (header + 2 data rows)");
assert(rows[1][0] === "Acme, Inc.", "Preserved comma inside quoted string");
assert(rows[2][0] === 'Beta "The Best" Ltd', "Handled escaped quotes correctly");

// 2. Test sample template generation & parsing
const sampleCsv = generateSampleLeadsCsv();
const parseResult = parseLeadsCsv(sampleCsv, { defaultCity: "Mbabane" });
assert(parseResult.success, "Sample CSV parsed successfully");
assert(parseResult.validCount === 4, `Parsed 4 valid leads (got ${parseResult.validCount})`);
assert(parseResult.leads[0].name === "Summit Logistics & Courier", "First lead name matched");
assert(parseResult.leads[0].isDemo === false, "Lead marked as real (isDemo: false)");
assert(parseResult.leads[0].dataType === "real", "Lead marked with dataType: real");
assert(parseResult.leads[0].salesStage === "DISCOVERED", "Discovered stage parsed accurately");
assert(parseResult.leads[1].salesStage === "CONTACTED", "Contacted stage parsed accurately");
assert(parseResult.leads[3].salesStage === "NEGOTIATION", "Negotiation stage parsed accurately");

// 3. Test various header formats (e.g. HubSpot export, Google Sheets)
const altHeaderCsv = `Account Name,Telephone,Contact Email,Web Address,City,Line of Business,Deal Stage,Remarks
"Mbabane Auto Repairs","+268 7611 0000","service@mbabaneauto.sz","https://mbabaneauto.sz","Mbabane","Automotive","Proposal Sent","Wants SEO package"
"Quick Byte Cafe","+268 7622 3344","cafe@quickbyte.sz","","Mbabane","Restaurant & Cafe","Engaged","Needs online ordering"`;

const altResult = parseLeadsCsv(altHeaderCsv);
assert(altResult.success, "Alternative header aliases recognized successfully");
assert(altResult.validCount === 2, "Parsed 2 leads from alternative headers");
assert(altResult.leads[0].name === "Mbabane Auto Repairs", "Extracted correct account name");
assert(altResult.leads[0].salesStage === "PROPOSAL_SENT", "Mapped 'Proposal Sent' to PROPOSAL_SENT stage");
assert(altResult.leads[1].salesStage === "ENGAGED", "Mapped 'Engaged' to ENGAGED stage");
assert(altResult.leads[1].websiteStatus === "CONFIRMED_NO_WEBSITE", "Flagged empty website as CONFIRMED_NO_WEBSITE");

// 4. Test missing name error handling
const emptyNameCsv = `Phone,Email,City\n"123","a@b.com","City"`;
const invalidResult = parseLeadsCsv(emptyNameCsv);
assert(!invalidResult.success, "Gracefully handled CSV missing Name header");

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

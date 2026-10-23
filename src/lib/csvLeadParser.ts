import { Business, CanonicalSalesStage, ProspectStatus, PresenceMetrics } from "../types";
import { resolveDeterministicBusinessId, normalizePhoneNumber } from "./businessIdentity";
import { toCanonicalStage, canonicalToProspectStatus } from "./prospectCrm";
import { normalizeUrl, buildBusinessTruthProfile } from "./businessTruth";
import { assignIndustryTag } from "./industryTagger";

/**
 * Result of CSV parsing operation.
 */
export interface CsvParseResult {
  success: boolean;
  leads: Business[];
  totalRows: number;
  validCount: number;
  skippedCount: number;
  warnings: string[];
  headersDetected: Record<string, string>;
  rawSampleRows: Record<string, string>[];
}

/**
 * Parses RFC 4180 compliant CSV text into a 2D array of strings.
 * Properly handles quotes, commas inside quotes, escaped quotes (""), and multiline cells.
 */
export function parseCsvRows(rawText: string): string[][] {
  // Strip BOM if present (Excel exports often include \uFEFF)
  const text = rawText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === '\r') {
        // Handle CRLF or standalone CR
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  // Push last cell & row if not empty
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Standard column aliases used across CRM exports (HubSpot, Salesforce, Google Sheets, Excel).
 */
const FIELD_ALIASES: Record<string, string[]> = {
  name: [
    "name", "business name", "company", "company name", "business", 
    "organization", "lead name", "account name", "client", "title"
  ],
  phone: [
    "phone", "phone number", "telephone", "tel", "mobile", 
    "mobile number", "contact number", "cell", "cellphone", "whatsapp"
  ],
  email: [
    "email", "email address", "e-mail", "contact email", "primary email", "lead email"
  ],
  website: [
    "website", "website url", "web", "url", "domain", "site", 
    "web address", "homepage", "link"
  ],
  address: [
    "address", "street", "street address", "location", "full address", 
    "office address", "physical address"
  ],
  city: [
    "city", "town", "municipality", "suburb"
  ],
  country: [
    "country", "nation"
  ],
  category: [
    "category", "industry", "sector", "business type", "type", 
    "trade", "niche", "line of business"
  ],
  salesStage: [
    "stage", "sales stage", "status", "prospect status", "pipeline stage", 
    "lead stage", "deal stage"
  ],
  notes: [
    "notes", "prospect notes", "comments", "description", "details", 
    "memo", "remarks", "opportunity", "summary"
  ],
  rating: [
    "rating", "stars", "score", "google rating", "review score"
  ],
  reviewsCount: [
    "reviews", "reviews count", "review count", "num reviews", "number of reviews"
  ],
  dealValue: [
    "value", "deal value", "estimated value", "amount", "price", "budget", "revenue"
  ]
};

/**
 * Normalizes header string to lowercase with stripped symbols.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Identifies column mapping by comparing row headers against known aliases.
 */
export function detectHeaderMapping(headerRow: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headerRow.map(normalizeHeader);

  for (const [canonicalField, aliases] of Object.entries(FIELD_ALIASES)) {
    for (let colIdx = 0; colIdx < normalizedHeaders.length; colIdx++) {
      const header = normalizedHeaders[colIdx];
      if (aliases.some(alias => header === alias || header.includes(alias))) {
        if (mapping[canonicalField] === undefined) {
          mapping[canonicalField] = colIdx;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Maps stage string to canonical sales stage.
 */
export function parseSalesStage(rawStage?: string): CanonicalSalesStage {
  if (!rawStage) return "DISCOVERED";
  const clean = rawStage.trim().toLowerCase();

  if (clean.includes("won") || clean.includes("closed won") || clean.includes("signed") || clean.includes("customer")) {
    return "WON";
  }
  if (clean.includes("lost") || clean.includes("closed lost") || clean.includes("declined") || clean.includes("archived")) {
    return "LOST";
  }
  if (clean.includes("negotiat") || clean.includes("reviewing terms")) {
    return "NEGOTIATION";
  }
  if (clean.includes("proposal") || clean.includes("quote") || clean.includes("pitched")) {
    return "PROPOSAL_SENT";
  }
  if (clean.includes("follow") || clean.includes("touch")) {
    return "FOLLOW_UP";
  }
  if (clean.includes("engaged") || clean.includes("interested") || clean.includes("meeting")) {
    return "ENGAGED";
  }
  if (clean.includes("preview") || clean.includes("demo sent") || clean.includes("site sent")) {
    return "PREVIEW_SENT";
  }
  if (clean.includes("contact") || clean.includes("outreach") || clean.includes("called") || clean.includes("emailed")) {
    return "CONTACTED";
  }
  if (clean.includes("verif") || clean.includes("qualified")) {
    return "VERIFIED";
  }
  if (clean.includes("audit")) {
    return "AUDIT_COMPLETE";
  }

  return toCanonicalStage(rawStage);
}

/**
 * Parses raw CSV string into a validated list of Business objects.
 */
export function parseLeadsCsv(
  csvText: string,
  options?: {
    defaultCategory?: string;
    defaultCity?: string;
    defaultCountry?: string;
    userId?: string;
  }
): CsvParseResult {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return {
      success: false,
      leads: [],
      totalRows: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: ["The provided CSV file is completely empty."],
      headersDetected: {},
      rawSampleRows: []
    };
  }

  const headerRow = rows[0];
  const colMap = detectHeaderMapping(headerRow);

  // Name is strictly required
  if (colMap.name === undefined) {
    return {
      success: false,
      leads: [],
      totalRows: rows.length - 1,
      validCount: 0,
      skippedCount: rows.length - 1,
      warnings: [
        `Could not detect a business name column. Please ensure one column header is named 'Name', 'Business Name', or 'Company'. Found headers: ${headerRow.join(", ")}`
      ],
      headersDetected: {},
      rawSampleRows: []
    };
  }

  const leads: Business[] = [];
  const warnings: string[] = [];
  const rawSampleRows: Record<string, string>[] = [];
  let skippedCount = 0;

  // Build human readable headers detected map
  const headersDetectedSummary: Record<string, string> = {};
  for (const [key, idx] of Object.entries(colMap)) {
    headersDetectedSummary[key] = headerRow[idx];
  }

  const dataRows = rows.slice(1);

  dataRows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2; // 1-indexed including header
    const rawName = row[colMap.name]?.trim() || "";

    if (!rawName) {
      skippedCount++;
      warnings.push(`Row ${rowNum}: Skipped because business name is missing or blank.`);
      return;
    }

    const rawPhone = colMap.phone !== undefined ? row[colMap.phone]?.trim() : "";
    const rawEmail = colMap.email !== undefined ? row[colMap.email]?.trim() : "";
    const rawWebsite = colMap.website !== undefined ? row[colMap.website]?.trim() : "";
    const rawAddr = colMap.address !== undefined ? row[colMap.address]?.trim() : "";
    const rawCity = colMap.city !== undefined ? row[colMap.city]?.trim() : (options?.defaultCity || "");
    const rawCountry = colMap.country !== undefined ? row[colMap.country]?.trim() : (options?.defaultCountry || "");
    const rawCat = colMap.category !== undefined ? row[colMap.category]?.trim() : (options?.defaultCategory || "General Commercial");
    const rawStage = colMap.salesStage !== undefined ? row[colMap.salesStage]?.trim() : "";
    const rawNotes = colMap.notes !== undefined ? row[colMap.notes]?.trim() : "";
    const rawRating = colMap.rating !== undefined ? parseFloat(row[colMap.rating]) : NaN;
    const rawReviews = colMap.reviewsCount !== undefined ? parseInt(row[colMap.reviewsCount], 10) : NaN;
    const rawValue = colMap.dealValue !== undefined ? parseFloat(row[colMap.dealValue].replace(/[^0-9.]/g, "")) : NaN;

    // Address combination
    let fullAddress = rawAddr;
    if (rawCity && !fullAddress.toLowerCase().includes(rawCity.toLowerCase())) {
      fullAddress = fullAddress ? `${fullAddress}, ${rawCity}` : rawCity;
    }
    if (rawCountry && !fullAddress.toLowerCase().includes(rawCountry.toLowerCase())) {
      fullAddress = fullAddress ? `${fullAddress}, ${rawCountry}` : rawCountry;
    }
    if (!fullAddress) {
      fullAddress = options?.defaultCity ? `${options.defaultCity}, Local Area` : "Local Area";
    }

    // Website normalization
    const cleanWebsite = rawWebsite ? normalizeUrl(rawWebsite) : undefined;

    // Deterministic ID resolution
    const idResult = resolveDeterministicBusinessId({
      name: rawName,
      address: fullAddress,
      phone: rawPhone,
      websiteUrl: cleanWebsite,
      city: rawCity,
      country: rawCountry,
      isDemo: false,
      dataType: "real"
    });

    const canonicalStage = parseSalesStage(rawStage);
    const prospectStatus = canonicalToProspectStatus(canonicalStage);

    // Initial presence metric setup
    const presence: PresenceMetrics = {
      hasWebsite: Boolean(cleanWebsite),
      websiteStatus: cleanWebsite ? "WEBSITE_LIVE" : "CONFIRMED_NO_WEBSITE",
      websiteUrl: cleanWebsite || undefined,
      hasEmail: Boolean(rawEmail),
      facebookStatus: "none",
      instagramStatus: "none",
      googleProfileQuality: "good",
      reviewCountStatus: "average",
      photosStatus: "sufficient",
      descriptionQuality: "good",
      openingHoursStatus: "complete",
      contactCompleteness: rawPhone && fullAddress ? "complete" : "partial"
    };

    const nowIso = new Date().toISOString();
    const parsedRating = !isNaN(rawRating) ? Math.min(5, Math.max(1, rawRating)) : 4.5;
    const parsedReviews = !isNaN(rawReviews) ? Math.max(0, rawReviews) : 12;

    const businessLead: Business = {
      id: idResult.businessId,
      name: rawName,
      category: rawCat,
      industryTag: assignIndustryTag({ name: rawName, category: rawCat, description: rawNotes }),
      address: fullAddress,
      phone: rawPhone || "Unlisted",
      email: rawEmail || undefined,
      websiteUrl: cleanWebsite || undefined,
      websiteStatus: cleanWebsite ? "WEBSITE_LIVE" : "CONFIRMED_NO_WEBSITE",
      reviewsCount: parsedReviews,
      rating: parsedRating,
      presence,
      description: rawNotes ? rawNotes.slice(0, 300) : `Imported lead in ${rawCat} sector located in ${fullAddress}.`,
      prospectNotes: rawNotes || "Imported via CSV lead list.",
      salesStage: canonicalStage,
      prospectStatus,
      isDemo: false,
      dataType: "real",
      directorySource: "CSV Import",
      opportunityScore: cleanWebsite ? 65 : 88,
      presenceScore: cleanWebsite ? 60 : 35,
      deficitCount: cleanWebsite ? 2 : 4,
      verificationState: "CONTACT_READY",
      createdAt: nowIso,
      updatedAt: nowIso,
      userId: options?.userId,
      estimatedDealValue: !isNaN(rawValue) ? rawValue : undefined
    };

    // Construct canonical truth profile
    businessLead.truthProfile = buildBusinessTruthProfile(businessLead);

    leads.push(businessLead);

    // Save sample rows for preview modal
    if (rawSampleRows.length < 5) {
      const sampleObj: Record<string, string> = {
        Name: rawName,
        Phone: rawPhone || "—",
        Email: rawEmail || "—",
        Website: cleanWebsite || "—",
        Address: fullAddress,
        Category: rawCat,
        Stage: canonicalStage
      };
      rawSampleRows.push(sampleObj);
    }
  });

  return {
    success: leads.length > 0,
    leads,
    totalRows: dataRows.length,
    validCount: leads.length,
    skippedCount,
    warnings,
    headersDetected: headersDetectedSummary,
    rawSampleRows
  };
}

/**
 * Generates an RFC 4180 standard CSV template with realistic sample lead data.
 */
export function generateSampleLeadsCsv(): string {
  const header = "Business Name,Phone,Email,Website,Address,City,Category,Sales Stage,Notes,Estimated Value";
  const rows = [
    `"Summit Logistics & Courier","+268 7601 2345","ops@summitcourier.com","","120 Mahlokohla St","Mbabane","Logistics & Transport","Discovered","High demand for online parcel tracking and quote requests.","$1200"`,
    `"Apex Dental Clinic","+268 7802 8910","info@apexdental.co.sz","https://apexdental.co.sz","Plot 44 Sheffield Rd","Manzini","Healthcare & Medical","Contacted","Existing website is outdated and not mobile-responsive. Needs appointment calendar.","$1800"`,
    `"Greenfield Solar & Electrical","+268 7915 6789","quotes@greenfieldsolar.com","","Industrial Site, Unit 5","Matsapha","Renewable Energy","New Prospect","Referred by local business association. Interested in commercial solar pitch.","$2500"`,
    `"Premier Legal Associates","+268 7644 1122","counsel@premierlegal.co.sz","","Mbabane Commercial Centre, Suite 3B","Mbabane","Legal & Advisory","Negotiation","Need corporate credibility landing page with WhatsApp callback link.","$1500"`
  ];

  return [header, ...rows].join("\r\n");
}

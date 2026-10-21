import { Business, EvidenceItem, BusinessVerificationState } from "../types";
import { resolveDeterministicBusinessId, GENERIC_PLATFORM_DOMAINS } from "./businessIdentity";
import { buildBusinessTruthProfile, normalizeUrl, extractDomain } from "./businessTruth";
import { evaluateProspectQualification } from "./prospectQualification";

export interface SearchQuery {
  category: string;
  city: string;
  country?: string;
  keywords?: string;
  page?: number;
}

export interface RelevanceResult {
  isRelevant: boolean;
  matchConfidence: "EXACT" | "PARTIAL" | "UNCERTAIN";
  categoryMatch: boolean;
  locationMatch: boolean;
  relevanceScore: number;
  relevanceExplanation: string;
}

export interface DataQualityResult {
  missingFields: string[];
  hasConflictingData: boolean;
  conflicts: string[];
}

export interface SearchProviderResponse {
  success: boolean;
  businesses: Business[];
  source: string;
  providerName: string;
  error?: string;
  totalResults: number;
  groundingUrls?: string[];
  isFallback?: boolean;
}

/**
 * Validates whether a business search result matches the requested search category, location, and keywords.
 * Enforces rule: Relevance score is strictly separate from verification state.
 */
export function validateSearchRelevance(
  business: Partial<Business>,
  query: SearchQuery
): RelevanceResult {
  const reqCat = (query.category || "").trim().toLowerCase();
  const reqCity = (query.city || "").trim().toLowerCase();
  const reqCountry = (query.country || "").trim().toLowerCase();
  const reqKw = (query.keywords || "").trim().toLowerCase();

  const bizName = (business.name || "").toLowerCase();
  const bizCat = (business.category || "").toLowerCase();
  const bizAddr = (business.address || "").toLowerCase();
  const bizDesc = (business.description || "").toLowerCase();

  // 1. Category Matching
  let categoryMatch = false;
  if (reqCat) {
    if (bizCat.includes(reqCat) || reqCat.includes(bizCat)) {
      categoryMatch = true;
    } else {
      // Common subcategories / synonym matching
      const catSynonyms: Record<string, string[]> = {
        plumbing: ["plumber", "drain", "water", "pipe", "sanitary", "geyser"],
        electrician: ["electrical", "power", "wiring", "solar", "lighting", "wiremen"],
        construction: ["civil", "builder", "contractor", "building", "paving", "joinery", "architectural"],
        restaurant: ["food", "bistro", "dining", "diner", "cafe", "grill", "steakhouse", "cuisine", "tapas", "eatery"],
        salon: ["barber", "hair", "beauty", "spa", "aesthetics", "nails", "massage", "wellness"],
        auto: ["mechanic", "car", "dealership", "garage", "workshop", "motor", "vehicle", "bakkie", "tyre"],
        accounting: ["tax", "audit", "bookkeeping", "finance", "cfo", "payroll"],
        legal: ["law", "attorney", "advocate", "notary", "court", "litigation"],
        medical: ["clinic", "doctor", "dental", "health", "pharmacy", "optometry"]
      };

      for (const [key, syns] of Object.entries(catSynonyms)) {
        if (reqCat.includes(key) || syns.some((s) => reqCat.includes(s))) {
          if (bizCat.includes(key) || syns.some((s) => bizCat.includes(s) || bizDesc.includes(s))) {
            categoryMatch = true;
            break;
          }
        }
      }
    }
  } else {
    categoryMatch = true; // No category specified
  }

  // 2. Location Matching
  let cityMatch = false;
  if (reqCity) {
    if (bizAddr.includes(reqCity) || bizName.includes(reqCity) || bizDesc.includes(reqCity)) {
      cityMatch = true;
    }
  }

  let countryMatch = false;
  if (reqCountry) {
    if (bizAddr.includes(reqCountry) || bizDesc.includes(reqCountry)) {
      countryMatch = true;
    }
  }

  let locationMatch = false;
  if (reqCity) {
    locationMatch = cityMatch;
  } else if (reqCountry) {
    locationMatch = countryMatch;
  } else {
    locationMatch = true; // Default
  }

  // 3. Keyword Alignment
  let keywordMatch = true;
  if (reqKw) {
    keywordMatch = bizName.includes(reqKw) || bizCat.includes(reqKw) || bizDesc.includes(reqKw) || bizAddr.includes(reqKw);
  }

  // 4. Determine Confidence & Score
  let matchConfidence: "EXACT" | "PARTIAL" | "UNCERTAIN" = "UNCERTAIN";
  let relevanceScore = 40;

  if (categoryMatch && locationMatch && keywordMatch) {
    matchConfidence = "EXACT";
    relevanceScore = 95;
  } else if ((categoryMatch && locationMatch) || (categoryMatch && keywordMatch)) {
    matchConfidence = "PARTIAL";
    relevanceScore = 75;
  } else if (categoryMatch || locationMatch) {
    matchConfidence = "PARTIAL";
    relevanceScore = 60;
  } else {
    matchConfidence = "UNCERTAIN";
    relevanceScore = 20;
  }

  // 5. Exclusion Rule: Exclude if NEITHER category NOR location match at all
  const isRelevant = (categoryMatch || locationMatch) && relevanceScore >= 40;

  // 6. Explanation Building
  const explanations: string[] = [];
  if (categoryMatch) explanations.push(`Category '${business.category || query.category}' matches search query.`);
  else explanations.push(`Category '${business.category || "Unspecified"}' differs from requested '${query.category}'.`);

  if (locationMatch) explanations.push(`Location matches '${query.city || query.country}'.`);
  else explanations.push(`Location '${business.address || "Unlisted"}' does not explicitly confirm '${query.city || query.country}'.`);

  if (reqKw) {
    if (keywordMatch) explanations.push(`Matches keyword '${query.keywords}'.`);
    else explanations.push(`Keyword '${query.keywords}' not explicitly found in listing.`);
  }

  const relevanceExplanation = `${matchConfidence} MATCH (${relevanceScore}%): ${explanations.join(" ")}`;

  return {
    isRelevant,
    matchConfidence,
    categoryMatch,
    locationMatch,
    relevanceScore,
    relevanceExplanation
  };
}

/**
 * Flags missing information and detects conflicts between multiple data signals.
 * Never invents missing details (e.g. unlisted phone numbers).
 */
export function detectDataQualityAndConflicts(
  business: Partial<Business>,
  additionalSources: any[] = []
): DataQualityResult {
  const missingFields: string[] = [];
  const conflicts: string[] = [];

  // Check missing mandatory & desirable business attributes
  if (!business.name || business.name.trim() === "" || business.name === "Local Establishment") {
    missingFields.push("name");
  }

  if (!business.category || business.category.trim() === "") {
    missingFields.push("category");
  }

  if (!business.address || business.address.trim() === "" || business.address === "Unlisted") {
    missingFields.push("address");
  }

  if (!business.phone || business.phone.trim() === "" || business.phone === "Unlisted" || business.phone === "null") {
    missingFields.push("phone");
  }

  const rawWeb = business.presence?.websiteUrl || business.sourceUrl || (business as any).websiteUrl;
  if (!rawWeb || rawWeb === "null" || rawWeb.trim() === "") {
    missingFields.push("website");
  }

  if (!business.presence?.hasEmail) {
    missingFields.push("email");
  }

  // Detect conflicts across sources or evidence items
  if (additionalSources && additionalSources.length > 1) {
    const phones = new Set<string>();
    const websites = new Set<string>();

    for (const src of additionalSources) {
      if (src.phone && src.phone !== "Unlisted") {
        phones.add(src.phone.replace(/[^0-9]/g, ""));
      }
      if (src.websiteUrl && src.websiteUrl !== "null") {
        websites.add(extractDomain(src.websiteUrl) || src.websiteUrl);
      }
    }

    if (phones.size > 1) {
      conflicts.push(`Conflicting phone numbers detected across source listings: ${Array.from(phones).join(", ")}`);
    }

    if (websites.size > 1) {
      conflicts.push(`Conflicting website domains detected across source listings: ${Array.from(websites).join(", ")}`);
    }
  }

  return {
    missingFields,
    hasConflictingData: conflicts.length > 0,
    conflicts
  };
}

/**
 * Standardizes raw search provider output into a canonical Business data structure
 * with full provenance tracking and evidence attribution.
 */
export function normalizeSearchResult(
  rawBusiness: any,
  query: SearchQuery,
  providerName: string = "Google Search Grounding"
): Business {
  const qObj: SearchQuery = typeof query === "string"
    ? { category: query, city: "Mbabane", country: "Eswatini" }
    : (query || { category: "General Services", city: "Mbabane", country: "Eswatini" });
  const city = qObj.city || "Mbabane";
  const country = qObj.country || "Eswatini";
  const category = rawBusiness.category || qObj.category || "General Services";
  const retrievedAt = new Date().toISOString();

  const rawWebUrl =
    rawBusiness.websiteUrl && rawBusiness.websiteUrl !== "null" && rawBusiness.websiteUrl.trim() !== ""
      ? rawBusiness.websiteUrl.trim()
      : undefined;

  const assignedSourceUrl =
    rawBusiness.sourceUrl && typeof rawBusiness.sourceUrl === "string" && rawBusiness.sourceUrl.startsWith("http")
      ? rawBusiness.sourceUrl
      : rawWebUrl;

  const candidateDomain = assignedSourceUrl ? extractDomain(assignedSourceUrl) : undefined;
  const isGeneric = candidateDomain ? GENERIC_PLATFORM_DOMAINS.has(candidateDomain) : false;
  const providerId = rawBusiness.sourceId || rawBusiness.id || (candidateDomain && !isGeneric ? candidateDomain : undefined);

  // Build Provenance Evidence
  const evidenceList: EvidenceItem[] = Array.isArray(rawBusiness.evidenceList) ? [...rawBusiness.evidenceList] : [];
  if (assignedSourceUrl) {
    evidenceList.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceType: assignedSourceUrl.includes("facebook.com") || assignedSourceUrl.includes("instagram.com")
        ? "SOCIAL_PROFILE"
        : (rawWebUrl === assignedSourceUrl ? "BUSINESS_WEBSITE" : "BUSINESS_DIRECTORY"),
      url: assignedSourceUrl,
      sourceUrl: assignedSourceUrl,
      sourceTitle: `${rawBusiness.name || rawBusiness.title} - ${rawBusiness.directorySource || providerName}`,
      retrievedAt,
      supports: [
        "name",
        "address",
        ...(rawBusiness.phone && rawBusiness.phone !== "Unlisted" ? ["phone"] : []),
        ...(rawWebUrl ? ["website"] : []),
        ...(category ? ["category"] : [])
      ],
      associationMethod: rawWebUrl === assignedSourceUrl ? "EXACT_URL" : "ENTITY_MATCH",
      confidence: 0.85
    });
  }

  // Verification State Rule: Search Grounding results default to CANDIDATE or CONTACT_READY (NEVER automatically VERIFIED)
  let verificationState: BusinessVerificationState = "CANDIDATE";
  if (rawBusiness.isDemo || rawBusiness.dataType === "demo") {
    verificationState = "DEMO";
  } else if (rawBusiness.phone && rawBusiness.phone !== "Unlisted" && assignedSourceUrl) {
    verificationState = "CONTACT_READY";
  } else {
    verificationState = "CANDIDATE";
  }

  // Validate Search Relevance & Quality
  const relevance = validateSearchRelevance(
    {
      name: rawBusiness.name || rawBusiness.title,
      category,
      address: rawBusiness.address || `${city}, ${country}`,
      description: rawBusiness.description
    },
    qObj
  );

  const quality = detectDataQualityAndConflicts({
    name: rawBusiness.name || rawBusiness.title,
    category,
    address: rawBusiness.address,
    phone: rawBusiness.phone,
    sourceUrl: assignedSourceUrl,
    presence: {
      hasWebsite: !!rawWebUrl,
      websiteUrl: rawWebUrl,
      hasEmail: false,
      facebookStatus: "none",
      instagramStatus: "none",
      googleProfileQuality: "fair",
      reviewCountStatus: "average",
      photosStatus: "sufficient",
      descriptionQuality: "fair",
      openingHoursStatus: "missing",
      contactCompleteness: rawBusiness.phone && rawBusiness.phone !== "Unlisted" ? "partial" : "missing"
    } as any
  });

  const deterministic = resolveDeterministicBusinessId({
    id: rawBusiness.id,
    sourceId: providerId,
    name: rawBusiness.name || rawBusiness.title,
    websiteUrl: rawWebUrl,
    sourceUrl: assignedSourceUrl,
    phone: rawBusiness.phone,
    address: rawBusiness.address || `${city}, ${country}`,
    city,
    country,
    isDemo: rawBusiness.isDemo || false
  });

  const rating = typeof rawBusiness.rating === "number" ? Math.max(0, Math.min(5, rawBusiness.rating)) : 0;
  const reviewsCount = typeof rawBusiness.reviewsCount === "number" ? Math.max(0, rawBusiness.reviewsCount) : 0;
  const rawEmail = rawBusiness.email && typeof rawBusiness.email === "string" && rawBusiness.email.trim() !== "" && rawBusiness.email.toLowerCase() !== "null" && rawBusiness.email.toLowerCase() !== "unlisted"
    ? rawBusiness.email.trim()
    : undefined;

  let websiteStatus: any = "WEBSITE_NOT_DISCOVERED";
  if (rawBusiness.websiteStatus) {
    websiteStatus = rawBusiness.websiteStatus;
  } else if (rawWebUrl) {
    websiteStatus = "WEBSITE_UNVERIFIED";
  } else {
    websiteStatus = "WEBSITE_NOT_DISCOVERED";
  }

  const isLiveWebsite = websiteStatus === "LIVE" || websiteStatus === "WEBSITE_LIVE" || websiteStatus === "WEBSITE_CONFIRMED";

  const normalizedBiz: Business = {
    id: deterministic.businessId,
    name: rawBusiness.name || rawBusiness.title || "Local Establishment",
    category,
    address: rawBusiness.address || `${city}, ${country}`,
    phone: rawBusiness.phone || "Unlisted",
    email: rawEmail,
    websiteUrl: rawWebUrl,
    websiteStatus,
    rating,
    reviewsCount,
    directorySource: rawBusiness.directorySource || providerName,
    providerName,
    providerId: String(providerId),
    sourceUrl: assignedSourceUrl,
    retrievedAt,
    evidenceList,
    verificationState,
    salesStage: "DISCOVERED",
    isDemo: rawBusiness.isDemo || false,
    dataType: rawBusiness.isDemo ? "demo" : "real",
    matchConfidence: relevance.matchConfidence,
    categoryMatch: relevance.categoryMatch,
    locationMatch: relevance.locationMatch,
    relevanceScore: relevance.relevanceScore,
    relevanceExplanation: relevance.relevanceExplanation,
    missingFields: quality.missingFields,
    hasConflictingData: quality.hasConflictingData,
    conflicts: quality.conflicts,
    description: rawBusiness.description || `Real-world establishment operating in ${city}, ${country}.`,
    presence: {
      hasWebsite: isLiveWebsite,
      websiteUrl: rawWebUrl,
      websiteStatus,
      hasEmail: !!rawEmail,
      facebookStatus: rawBusiness.hasSocial ? "active" : "none",
      instagramStatus: "none",
      googleProfileQuality: "fair",
      reviewCountStatus: reviewsCount < 10 ? "few" : "average",
      photosStatus: "sufficient",
      descriptionQuality: "fair",
      openingHoursStatus: "missing",
      contactCompleteness: rawBusiness.phone && rawBusiness.phone !== "Unlisted" ? "partial" : "missing"
    },
    evidence: {
      checkedAt: retrievedAt,
      source: `${providerName} (${rawBusiness.directorySource || "Public Directory"})`,
      httpStatus: rawWebUrl ? (isLiveWebsite ? "200 OK (Audited)" : "Website Candidate (Unchecked)") : "Directory Listing Only",
      websiteVerified: isLiveWebsite,
      verificationStatus: isLiveWebsite ? "verified_live_listing" : "directory_found",
      sourceUrls: assignedSourceUrl ? [assignedSourceUrl] : [],
      notes: rawBusiness.verificationNotes || relevance.relevanceExplanation
    }
  };

  const qualResult = evaluateProspectQualification(normalizedBiz);
  normalizedBiz.qualificationStatus = qualResult.status;
  normalizedBiz.qualificationScore = qualResult.qualificationScore;
  normalizedBiz.prioritizationRank = qualResult.prioritizationRank;
  normalizedBiz.qualificationResult = qualResult;

  normalizedBiz.truthProfile = buildBusinessTruthProfile(normalizedBiz);
  return normalizedBiz;
}

/**
 * Filters out completely irrelevant search results and ranks relevant businesses by relevance score.
 */
export function filterAndRankSearchResults(
  rawResults: any[],
  query: SearchQuery,
  providerName: string = "Google Search Grounding"
): Business[] {
  if (!Array.isArray(rawResults) || rawResults.length === 0) {
    return [];
  }

  const normalizedList = rawResults.map((raw) => normalizeSearchResult(raw, query, providerName));

  // Exclude clearly unrelated businesses
  const relevantList = normalizedList.filter((biz) => {
    const rel = validateSearchRelevance(biz, query);
    return rel.isRelevant;
  });

  // Deduplicate by business ID
  const seenIds = new Set<string>();
  const deduplicatedList: Business[] = [];

  for (const biz of relevantList) {
    if (!seenIds.has(biz.id)) {
      seenIds.add(biz.id);
      deduplicatedList.push(biz);
    }
  }

  // Sort by relevance score descending
  deduplicatedList.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return deduplicatedList;
}

/**
 * Handles provider errors, timeouts, rate limits, and empty results.
 * Never substitutes fabricated business records when a live search provider fails.
 */
export function handleSearchProviderFailure(
  providerName: string,
  errorMessage: string,
  isSandboxRequested: boolean = false,
  mockFallbackFn?: () => any[]
): SearchProviderResponse {
  if (!isSandboxRequested) {
    // Explicit error response for live provider failures without fake data substitution
    return {
      success: false,
      businesses: [],
      source: providerName,
      providerName,
      error: errorMessage || "Search provider query failed or returned no verified business records.",
      totalResults: 0,
      isFallback: false
    };
  }

  // Sandbox / Mock Mode Explicitly Requested
  const mockRaw = mockFallbackFn ? mockFallbackFn() : [];
  const query: SearchQuery = { category: "General", city: "Sandbox" };

  const sandboxBusinesses = mockRaw.map((raw) => {
    const norm = normalizeSearchResult({ ...raw, isDemo: true, dataType: "demo" }, query, "Local Sandbox Database");
    norm.isDemo = true;
    norm.dataType = "demo";
    norm.verificationState = "DEMO";
    norm.evidence = {
      checkedAt: new Date().toISOString(),
      source: "Local Sandbox Catalog (Demo Mode)",
      httpStatus: "Sandbox Mode",
      websiteVerified: false,
      verificationStatus: "sample_demo",
      notes: "DEMO DATA — NOT A REAL LIVE SEARCH RESULT. Provided for sandbox environment testing only."
    };
    return norm;
  });

  return {
    success: true,
    businesses: sandboxBusinesses,
    source: "mock_fallback",
    providerName: "Local Sandbox Catalog",
    error: `Sandbox mode active: ${errorMessage}`,
    totalResults: sandboxBusinesses.length,
    isFallback: true
  };
}

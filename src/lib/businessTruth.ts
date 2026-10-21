import { BusinessTruthProfile, TruthField, BusinessEvidence, AssociationMethod, TruthLevel } from "../types";

// URL Normalization helper
export function normalizeUrl(urlStr: string | null | undefined): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  let trimmed = urlStr.trim().toLowerCase();
  if (trimmed === "null" || trimmed === "undefined" || trimmed === "") return null;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = "https://" + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.hostname}${pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

// Hostname/Domain extraction helper
export function extractDomain(urlStr: string | null | undefined): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    let clean = urlStr.trim().toLowerCase();
    if (clean === "null" || clean === "undefined" || clean === "") return null;
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Entity Name Normalization
export function normalizeEntityName(nameStr: string | null | undefined): string {
  if (!nameStr || typeof nameStr !== "string") return "";
  return nameStr
    .toLowerCase()
    .replace(/\b(pty|ltd|limited|inc|incorporated|llc|corp|corporation|cc|co|company|services|group)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type AssociationStrength = "STRONG" | "MODERATE" | "WEAK" | "UNKNOWN";

export interface EvidenceAssociationResult {
  associationMethod: AssociationMethod;
  strength: AssociationStrength;
  confidence: number;
}

// Determine how strongly an evidence record associates with a target business
export function resolveEvidenceAssociation(biz: any, evidence: any): EvidenceAssociationResult {
  if (!biz || !evidence) {
    return { associationMethod: "UNKNOWN", strength: "UNKNOWN", confidence: 0 };
  }

  // 1. SOURCE_ID Match (Highest Priority)
  const bizSourceId = biz?.sourceId || biz?.evidence?.sourceId || null;
  const evSourceId = evidence?.sourceId || null;
  if (bizSourceId && evSourceId && bizSourceId === evSourceId) {
    return { associationMethod: "SOURCE_ID", strength: "STRONG", confidence: 0.95 };
  }

  // 2. EXACT_URL Match
  const bizUrlNorm = normalizeUrl(biz?.sourceUrl || biz?.evidence?.sourceUrls?.[0] || biz?.websiteUrl);
  const evUrlNorm = normalizeUrl(evidence?.url || evidence?.sourceUrl);
  if (bizUrlNorm && evUrlNorm && bizUrlNorm === evUrlNorm) {
    return { associationMethod: "EXACT_URL", strength: "STRONG", confidence: 0.90 };
  }

  // 3. DOMAIN_MATCH
  const bizDomain = extractDomain(biz?.websiteUrl || biz?.presence?.websiteUrl);
  const evDomain = extractDomain(evidence?.url || evidence?.sourceUrl);
  if (bizDomain && evDomain && bizDomain === evDomain && bizDomain.length > 3) {
    return { associationMethod: "DOMAIN_MATCH", strength: "MODERATE", confidence: 0.75 };
  }

  // 4. ENTITY_MATCH (Normalized name + context)
  const normBizName = normalizeEntityName(biz?.name || biz?.businessName);
  const evTitle = normalizeEntityName(evidence?.title || evidence?.sourceTitle || evidence?.sourceName);
  const evText = (evidence?.evidenceText || "").toLowerCase();

  if (normBizName.length > 2 && (evTitle.includes(normBizName) || normBizName.includes(evTitle) || evText.includes(normBizName))) {
    // Check contextual alignment (address / phone / city)
    const bizPhoneDigits = (biz?.phone || "").replace(/\D/g, "");
    const bizAddressNorm = (biz?.address || "").toLowerCase();
    const phoneMatched = bizPhoneDigits.length > 6 && evText.includes(bizPhoneDigits);
    const addressMatched = bizAddressNorm.length > 4 && evText.includes(bizAddressNorm.slice(0, 10));

    if (phoneMatched || addressMatched) {
      return { associationMethod: "ENTITY_MATCH", strength: "MODERATE", confidence: 0.65 };
    }
    // Name match only without contextual alignment is WEAK
    return { associationMethod: "ENTITY_MATCH", strength: "WEAK", confidence: 0.40 };
  }

  // 5. CONTENT_MATCH (Direct fact in evidence text)
  if (evText.length > 5) {
    const bizPhoneDigits = (biz?.phone || "").replace(/\D/g, "");
    if (bizPhoneDigits.length > 6 && evText.includes(bizPhoneDigits)) {
      return { associationMethod: "CONTENT_MATCH", strength: "MODERATE", confidence: 0.70 };
    }
  }

  return { associationMethod: "UNKNOWN", strength: "UNKNOWN", confidence: 0 };
}

export interface FieldEvidenceResolution {
  evidence: any | null;
  associationMethod: AssociationMethod;
  strength: AssociationStrength;
  confidence: number;
  matchCount: number;
  hasConflict?: boolean;
  conflictNotes?: string;
}

// Find evidence supporting specific field keys for a business
export function findEvidenceForBusiness(biz: any, fieldKeys: string[]): FieldEvidenceResolution {
  const isDemo = biz?.isDemo === true || biz?.dataType === "demo" || biz?.evidence?.verificationStatus === "sample_demo";
  if (isDemo) {
    return { evidence: null, associationMethod: "UNKNOWN", strength: "UNKNOWN", confidence: 0, matchCount: 0 };
  }

  const evidenceList: any[] = Array.isArray(biz?.evidenceList) ? biz.evidenceList : [];
  
  // Also include business.evidence object if present and valid
  const allCandidateSources = [...evidenceList];
  if (biz?.evidence && typeof biz.evidence === "object" && !allCandidateSources.some(e => e.url === biz.evidence.url)) {
    allCandidateSources.push({
      sourceType: "BUSINESS_DIRECTORY",
      url: biz.evidence.sourceUrls?.[0] || biz.sourceUrl || null,
      title: biz.evidence.source || biz.directorySource || "Verified Listing Source",
      retrievedAt: biz.evidence.retrievedAt || biz.evidence.checkedAt || null,
      supports: ["businessName", "name", "phone", "address", "website", "category"],
      sourceId: biz.evidence.sourceId || biz.sourceId || null
    });
  }

  const matches: Array<{ item: any; association: EvidenceAssociationResult }> = [];

  for (const item of allCandidateSources) {
    if (!item) continue;
    const supports = Array.isArray(item.supports)
      ? item.supports
      : Array.isArray(item.supportedFields)
      ? item.supportedFields
      : [];

    const explicitFieldSupport = fieldKeys.some(k => supports.includes(k));
    
    // Check if evidenceText contains direct validation
    const evText = (item.evidenceText || "").toLowerCase();
    const textValidates = fieldKeys.some(k => {
      if (k === "phone" && biz?.phone) {
        const digits = biz.phone.replace(/\D/g, "");
        return digits.length > 6 && evText.includes(digits);
      }
      if (k === "email" && biz?.email) {
        return evText.includes(biz.email.toLowerCase());
      }
      return false;
    });

    if (explicitFieldSupport || textValidates) {
      const association = resolveEvidenceAssociation(biz, item);
      if (association.strength === "STRONG" || association.strength === "MODERATE") {
        matches.push({ item, association });
      }
    }
  }

  // Fallback: If business has verified listing state with explicit sourceUrl and directorySource
  const isVerifiedListing = biz?.verificationState === "VERIFIED" || biz?.evidence?.verificationStatus === "verified_live_listing";
  const primarySourceUrl = biz?.evidence?.sourceUrls?.[0] || biz?.sourceUrl || biz?.evidence?.url || null;
  const defaultDirSource = biz?.directorySource || biz?.evidence?.source || null;

  if (matches.length === 0 && isVerifiedListing && primarySourceUrl && defaultDirSource) {
    // Only support identity & basic contact if verified listing record
    const baseSupported = ["businessName", "name", "phone", "address", "website", "category"];
    if (fieldKeys.some(k => baseSupported.includes(k))) {
      return {
        evidence: {
          title: defaultDirSource,
          url: primarySourceUrl,
          retrievedAt: biz?.evidence?.retrievedAt || null,
          supports: baseSupported
        },
        associationMethod: "EXACT_URL",
        strength: "STRONG",
        confidence: 0.90,
        matchCount: 1
      };
    }
  }

  if (matches.length === 0) {
    return { evidence: null, associationMethod: "UNKNOWN", strength: "UNKNOWN", confidence: 0, matchCount: 0 };
  }

  // Sort candidate matches by confidence descending
  matches.sort((a, b) => b.association.confidence - a.association.confidence);

  // Check for source conflicts among top matches if field value exists
  if (matches.length >= 2 && fieldKeys.includes("phone") && biz?.phone) {
    const mainMatch = matches[0];
    const secondaryMatch = matches[1];
    const val1 = (mainMatch.item.evidenceText || "").replace(/\D/g, "");
    const val2 = (secondaryMatch.item.evidenceText || "").replace(/\D/g, "");
    if (val1 && val2 && val1 !== val2 && val1.length > 6 && val2.length > 6) {
      return {
        evidence: mainMatch.item,
        associationMethod: mainMatch.association.associationMethod,
        strength: "WEAK",
        confidence: 0.45,
        matchCount: matches.length,
        hasConflict: true,
        conflictNotes: `Conflicting values detected across sources (${mainMatch.item.title || "Source A"} vs ${secondaryMatch.item.title || "Source B"})`
      };
    }
  }

  const best = matches[0];
  return {
    evidence: best.item,
    associationMethod: best.association.associationMethod,
    strength: best.association.strength,
    confidence: best.association.confidence,
    matchCount: matches.length
  };
}

// Helper to determine meaningful verificationMethod
export function determineVerificationMethod(
  level: TruthLevel,
  res?: FieldEvidenceResolution,
  options?: { isAudited?: boolean; isHttpCheck?: boolean; isWebsiteContent?: boolean; isManual?: boolean }
): string | null {
  if (level === "BUSINESS_SUPPLIED") {
    return "business_supplied";
  }
  if (level === "AI_DRAFT") {
    return "ai_inference";
  }
  if (level === "UNKNOWN") {
    return null;
  }
  if (level === "VERIFIED") {
    if (options?.isHttpCheck || options?.isAudited) {
      return "website_http_check";
    }
    if (options?.isWebsiteContent || res?.associationMethod === "CONTENT_MATCH" || res?.evidence?.sourceType === "BUSINESS_WEBSITE") {
      return "website_content_match";
    }
    if (options?.isManual || res?.associationMethod === "MANUAL") {
      return "manual_confirmation";
    }
    if (res && res.matchCount >= 2) {
      return "multiple_source_match";
    }
    if (res?.associationMethod && res.associationMethod !== "UNKNOWN") {
      return res.associationMethod;
    }
    return "source_match";
  }
  return null;
}

// Helper to determine confidence without fabricating precision
export function determineConfidence(
  level: TruthLevel,
  res?: FieldEvidenceResolution,
  overrideConfidence?: number | null
): number | null {
  if (level !== "VERIFIED") {
    // Unconfirmed, AI_DRAFT, BUSINESS_SUPPLIED, UNKNOWN fields must not have fabricated confidence
    return null;
  }
  if (typeof overrideConfidence === "number") {
    return overrideConfidence;
  }
  if (res?.confidence && res.confidence >= 0.6) {
    return res.confidence;
  }
  return null;
}

// Fake email filter
function isFakeEmail(emailStr: string, biz: any): boolean {
  if (!emailStr) return true;
  const lower = emailStr.toLowerCase().trim();
  if (lower.includes("example.com") || lower.includes("domain.com") || lower.includes("test.com")) {
    return true;
  }
  if (lower.startsWith("contact@") || lower.startsWith("info@")) {
    const emailDomain = lower.split("@")[1];
    const evidenceList = Array.isArray(biz?.evidenceList) ? biz.evidenceList : [];
    const websiteUrl = biz?.presence?.websiteUrl || biz?.websiteUrl || "";
    const hasDomainEvidence =
      evidenceList.some((e: any) => e.url && e.url.toLowerCase().includes(emailDomain)) ||
      websiteUrl.toLowerCase().includes(emailDomain);
    if (!hasDomainEvidence && !biz?.isOwnerEmail) return true;
  }
  return false;
}

export function buildBusinessTruthProfile(biz: any): BusinessTruthProfile {
  const name = biz?.name || biz?.businessName || "";
  const category = biz?.category || "";
  const phone = biz?.phone || "";
  const address = biz?.address || "";
  const rawEmail = biz?.email || biz?.contactPage?.email || "";
  const rating = typeof biz?.rating === "number" ? biz.rating : 0;
  const reviewsCount = typeof biz?.reviewsCount === "number" ? biz.reviewsCount : 0;
  const presence = biz?.presence || {};

  const isDemo =
    biz?.isDemo === true ||
    biz?.dataType === "demo" ||
    biz?.evidence?.verificationStatus === "sample_demo";

  const cleanEmail = isFakeEmail(rawEmail, biz) ? "" : rawEmail;
  const defaultDirSource = isDemo
    ? "Demo Sample Database"
    : biz?.directorySource || biz?.evidence?.source || null;

  // Helper to preserve existing verified field if current incoming data is weaker
  const existingProfile = biz?.truthProfile as BusinessTruthProfile | undefined;
  const preserveIfStronger = (fieldKey: string, newlyResolved: TruthField): TruthField => {
    if (!existingProfile) return newlyResolved;
    const existingField = (existingProfile as any)[fieldKey] as TruthField | undefined;
    if (existingField && existingField.level === "VERIFIED" && existingField.confidence && existingField.confidence >= 0.85) {
      if (newlyResolved.level !== "VERIFIED" || (newlyResolved.confidence && newlyResolved.confidence < existingField.confidence)) {
        return existingField;
      }
    }
    return newlyResolved;
  };

  // Helper for consistent dates (retrievedAt and verifiedAt)
  const resolveDates = (
    level: TruthLevel,
    fieldKey: string,
    evidence?: any
  ): { retrievedAt: string | null; verifiedAt: string | null } => {
    const existingField = existingProfile ? ((existingProfile as any)[fieldKey] as TruthField | undefined) : undefined;
    const retrievedAt = evidence?.retrievedAt || evidence?.checkedAt || existingField?.retrievedAt || null;
    const verifiedAt = level === "VERIFIED"
      ? (existingField?.verifiedAt || evidence?.verifiedAt || new Date().toISOString())
      : null;
    return { retrievedAt, verifiedAt };
  };

  // 1. Business Name
  const nameRes = findEvidenceForBusiness(biz, ["businessName", "name"]);
  let nameField: TruthField;
  if (!name) {
    nameField = {
      label: "Business Name", key: "businessName", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: "No business name specified", confidence: null,
      verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  } else if (isDemo) {
    nameField = {
      label: "Business Name", key: "businessName", value: name,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Synthetic demonstration profile placeholder",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (biz?.isOwnerName || biz?.dataType === "business_supplied") {
    nameField = {
      label: "Business Name", key: "businessName", value: name,
      status: "CONFIRMED", statusText: "✓ Owner Supplied", level: "BUSINESS_SUPPLIED",
      notes: "Business name provided directly by owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (nameRes.evidence && (nameRes.strength === "STRONG" || nameRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "businessName", nameRes.evidence);
    nameField = {
      label: "Business Name", key: "businessName", value: name,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Verified against ${nameRes.evidence.title || nameRes.evidence.source || "Directory Source"}`,
      evidenceId: nameRes.evidence.id || null,
      source: nameRes.evidence.title || nameRes.evidence.source || defaultDirSource,
      sourceUrl: nameRes.evidence.url || nameRes.evidence.sourceUrl || null,
      sourceId: nameRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", nameRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", nameRes)
    };
  } else {
    nameField = {
      label: "Business Name", key: "businessName", value: name,
      status: "UNCONFIRMED", statusText: "? Unconfirmed", level: "AI_DRAFT",
      notes: "Unconfirmed business name (no supporting registry citation)",
      source: defaultDirSource || null,
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  nameField = preserveIfStronger("businessName", nameField);

  // 2. Phone
  const phoneRes = findEvidenceForBusiness(biz, ["phone"]);
  let phoneField: TruthField;
  if (!phone) {
    phoneField = {
      label: "Phone", key: "phone", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: "No telephone number listed on record", confidence: null,
      verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  } else if (isDemo) {
    phoneField = {
      label: "Phone", key: "phone", value: phone,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Demo contact number placeholder",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (biz?.isOwnerPhone || biz?.customPhone || biz?.dataType === "business_supplied") {
    phoneField = {
      label: "Phone", key: "phone", value: phone,
      status: "CONFIRMED", statusText: "✓ Owner Supplied", level: "BUSINESS_SUPPLIED",
      notes: "Direct telephone line provided by business owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (phoneRes.hasConflict) {
    phoneField = {
      label: "Phone", key: "phone", value: phone,
      status: "UNCONFIRMED", statusText: "? Source Conflict", level: "AI_DRAFT",
      notes: phoneRes.conflictNotes || "Conflicting phone numbers found across directories",
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (phoneRes.evidence && (phoneRes.strength === "STRONG" || phoneRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "phone", phoneRes.evidence);
    phoneField = {
      label: "Phone", key: "phone", value: phone,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Direct telephone line confirmed on ${phoneRes.evidence.title || phoneRes.evidence.source || "Directory Source"}`,
      evidenceId: phoneRes.evidence.id || null,
      source: phoneRes.evidence.title || phoneRes.evidence.source || defaultDirSource,
      sourceUrl: phoneRes.evidence.url || phoneRes.evidence.sourceUrl || null,
      sourceId: phoneRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", phoneRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", phoneRes)
    };
  } else {
    phoneField = {
      label: "Phone", key: "phone", value: phone,
      status: "UNCONFIRMED", statusText: "? Unconfirmed", level: "AI_DRAFT",
      notes: "Telephone number exists on record but lacks supporting directory citation",
      source: defaultDirSource || null,
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  phoneField = preserveIfStronger("phone", phoneField);

  // 3. Email
  const emailRes = findEvidenceForBusiness(biz, ["email"]);
  let emailField: TruthField;
  if (!cleanEmail) {
    emailField = {
      label: "Email", key: "email", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: rawEmail ? "Synthesized/unverified email filtered out for accuracy" : "No public email address found",
      confidence: null, verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  } else if (isDemo) {
    emailField = {
      label: "Email", key: "email", value: cleanEmail,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Demo email address placeholder",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (biz?.isOwnerEmail || biz?.dataType === "business_supplied") {
    emailField = {
      label: "Email", key: "email", value: cleanEmail,
      status: "CONFIRMED", statusText: "✓ Owner Supplied", level: "BUSINESS_SUPPLIED",
      notes: "Email address provided by business owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (emailRes.evidence && (emailRes.strength === "STRONG" || emailRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "email", emailRes.evidence);
    emailField = {
      label: "Email", key: "email", value: cleanEmail,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Verified email contact on ${emailRes.evidence.title || emailRes.evidence.source || "Directory Source"}`,
      evidenceId: emailRes.evidence.id || null,
      source: emailRes.evidence.title || emailRes.evidence.source || defaultDirSource,
      sourceUrl: emailRes.evidence.url || emailRes.evidence.sourceUrl || null,
      sourceId: emailRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", emailRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", emailRes)
    };
  } else {
    emailField = {
      label: "Email", key: "email", value: cleanEmail,
      status: "UNCONFIRMED", statusText: "? Unconfirmed", level: "AI_DRAFT",
      notes: "Unconfirmed email address",
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  emailField = preserveIfStronger("email", emailField);

  // 4. Address
  const addressRes = findEvidenceForBusiness(biz, ["address"]);
  let addressField: TruthField;
  if (!address) {
    addressField = {
      label: "Address", key: "address", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: "Physical address unconfirmed / unlisted", confidence: null,
      verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  } else if (isDemo) {
    addressField = {
      label: "Address", key: "address", value: address,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Demo geographical placeholder",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (biz?.isOwnerAddress || biz?.dataType === "business_supplied") {
    addressField = {
      label: "Address", key: "address", value: address,
      status: "CONFIRMED", statusText: "✓ Owner Supplied", level: "BUSINESS_SUPPLIED",
      notes: "Physical address provided by business owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (addressRes.evidence && (addressRes.strength === "STRONG" || addressRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "address", addressRes.evidence);
    addressField = {
      label: "Address", key: "address", value: address,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Physical address referenced on ${addressRes.evidence.title || addressRes.evidence.source || "Directory Source"}`,
      evidenceId: addressRes.evidence.id || null,
      source: addressRes.evidence.title || addressRes.evidence.source || defaultDirSource,
      sourceUrl: addressRes.evidence.url || addressRes.evidence.sourceUrl || null,
      sourceId: addressRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", addressRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", addressRes)
    };
  } else {
    addressField = {
      label: "Address", key: "address", value: address,
      status: "UNCONFIRMED", statusText: "? Unconfirmed", level: "AI_DRAFT",
      notes: "Physical address listed without supporting directory citation",
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  addressField = preserveIfStronger("address", addressField);

  // 5. Website
  const hasWebsite = presence.hasWebsite ?? Boolean(biz?.websiteUrl);
  const websiteUrl = presence.websiteUrl || biz?.websiteUrl || "";
  const isFailedHttp = presence.websiteStatus === "BROKEN" || presence.websiteStatus === "UNREACHABLE" || presence.websiteStatus === "ERROR" || presence.websiteStatus === "REDIRECT" || biz?.websiteStatus === "BROKEN" || biz?.websiteStatus === "UNREACHABLE" || biz?.websiteStatus === "ERROR";
  const isAudited = presence.isAudited || biz?.isAudited || Boolean(presence.technicalMetrics);
  const isLive = presence.websiteStatus === "LIVE" || (isAudited && hasWebsite);
  const websiteRes = findEvidenceForBusiness(biz, ["website"]);

  let websiteField: TruthField;
  if (isFailedHttp) {
    websiteField = {
      label: "Website", key: "website", value: websiteUrl || "Inaccessible URL",
      status: "BROKEN", statusText: `❌ ${presence.websiteStatus || "Inaccessible"}`, level: "UNKNOWN",
      notes: presence.httpStatusText ? `Live HTTP check result: ${presence.httpStatusText}` : "A website candidate was found, but it was unreachable or failed live check",
      sourceUrl: websiteUrl || null, verificationMethod: "website_http_check", confidence: null,
      retrievedAt: presence.lastCheckedAt || null, verifiedAt: null
    };
  } else if (!hasWebsite || !websiteUrl) {
    const isVerifiedListing = biz?.verificationState === "VERIFIED" || biz?.evidence?.verificationStatus === "verified_live_listing";
    const hasEvidence = Boolean(websiteRes.evidence || biz?.evidence);
    if (isVerifiedListing && hasEvidence) {
      const dates = resolveDates("VERIFIED", "website", websiteRes.evidence || biz?.evidence);
      websiteField = {
        label: "Website", key: "website", value: "No website discovered",
        status: "MISSING", statusText: "✓ No website discovered", level: "VERIFIED",
        notes: "No website was discovered from the available sources",
        source: defaultDirSource || "Domain Audit", verificationMethod: "source_match", confidence: 0.90,
        retrievedAt: dates.retrievedAt, verifiedAt: dates.verifiedAt
      };
    } else {
      websiteField = {
        label: "Website", key: "website", value: "No website discovered",
        status: "MISSING", statusText: "✓ No website discovered", level: "UNKNOWN",
        notes: "No website was discovered from the available sources",
        source: defaultDirSource || "Domain Audit", verificationMethod: null, confidence: null,
        retrievedAt: null, verifiedAt: null
      };
    }
  } else if (isDemo) {
    websiteField = {
      label: "Website", key: "website", value: websiteUrl,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Demo website URL placeholder",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (isLive && isAudited) {
    const dates = resolveDates("VERIFIED", "website");
    websiteField = {
      label: "Website", key: "website", value: websiteUrl,
      status: "CONFIRMED", statusText: "✓ Verified Live", level: "VERIFIED",
      notes: "Website presence verified via direct live HTTP inspection",
      source: "Live Domain Audit", sourceUrl: websiteUrl,
      verificationMethod: "website_http_check", confidence: 0.95,
      retrievedAt: presence.lastCheckedAt || dates.retrievedAt,
      verifiedAt: dates.verifiedAt
    };
  } else if (websiteRes.evidence && (websiteRes.strength === "STRONG" || websiteRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "website", websiteRes.evidence);
    websiteField = {
      label: "Website", key: "website", value: websiteUrl,
      status: "CONFIRMED", statusText: "✓ Domain Grounded", level: "VERIFIED",
      notes: `Domain confirmed via ${websiteRes.evidence.title || "Directory Listing"}`,
      evidenceId: websiteRes.evidence.id || null,
      source: websiteRes.evidence.title || websiteRes.evidence.source || defaultDirSource,
      sourceUrl: websiteRes.evidence.url || websiteRes.evidence.sourceUrl || websiteUrl,
      sourceId: websiteRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", websiteRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", websiteRes)
    };
  } else {
    websiteField = {
      label: "Website", key: "website", value: websiteUrl,
      status: "UNCONFIRMED", statusText: "? Unconfirmed Domain", level: "UNKNOWN",
      notes: "Domain indexed on directory listing; live site check pending",
      source: defaultDirSource || "Directory Search", sourceUrl: websiteUrl,
      verificationMethod: null, confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  websiteField = preserveIfStronger("website", websiteField);

  // 6. Category
  const catRes = findEvidenceForBusiness(biz, ["category"]);
  let catField: TruthField;
  if (!category) {
    catField = {
      label: "Category", key: "category", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: "No industry category specified", confidence: null,
      verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  } else if (isDemo) {
    catField = {
      label: "Category", key: "category", value: category,
      status: "UNCONFIRMED", statusText: "? Unconfirmed (Demo)", level: "AI_DRAFT",
      notes: "Synthetic category classification",
      source: defaultDirSource, verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (catRes.evidence && (catRes.strength === "STRONG" || catRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "category", catRes.evidence);
    catField = {
      label: "Category", key: "category", value: category,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Industry taxonomy classified on ${catRes.evidence.title || catRes.evidence.source || "Directory Source"}`,
      evidenceId: catRes.evidence.id || null,
      source: catRes.evidence.title || catRes.evidence.source || defaultDirSource,
      sourceUrl: catRes.evidence.url || catRes.evidence.sourceUrl || null,
      sourceId: catRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", catRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", catRes)
    };
  } else {
    catField = {
      label: "Category", key: "category", value: category,
      status: "UNCONFIRMED", statusText: "? Inferred Category", level: "AI_DRAFT",
      notes: `Industry taxonomy inferred as ${category}`,
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  catField = preserveIfStronger("category", catField);

  // 7. Services
  const servRes = findEvidenceForBusiness(biz, ["services"]);
  let servField: TruthField;
  if (biz?.customServices) {
    servField = {
      label: "Services", key: "services", value: "Owner defined services",
      status: "CONFIRMED", statusText: "✓ Owner Defined", level: "BUSINESS_SUPPLIED",
      notes: "Services catalog confirmed by business owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (servRes.evidence && (servRes.strength === "STRONG" || servRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "services", servRes.evidence);
    servField = {
      label: "Services", key: "services", value: "Verified service list",
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Service list extracted from ${servRes.evidence.title || servRes.evidence.source || "Directory Source"}`,
      evidenceId: servRes.evidence.id || null,
      source: servRes.evidence.title || servRes.evidence.source || defaultDirSource,
      sourceUrl: servRes.evidence.url || servRes.evidence.sourceUrl || null,
      sourceId: servRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", servRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", servRes)
    };
  } else {
    servField = {
      label: "Services", key: "services", value: "Inferred from category",
      status: "UNCONFIRMED", statusText: "? AI Inferred", level: "AI_DRAFT",
      notes: "Service catalog inferred by AI — marked as draft copy",
      source: "AI Trade Suggestion", verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  servField = preserveIfStronger("services", servField);

  // 8. Opening Hours
  const hasCompleteHours = presence.openingHoursStatus === "complete" || biz?.hasHours;
  const hoursRes = findEvidenceForBusiness(biz, ["openingHours", "hours"]);
  let hoursField: TruthField;
  if (biz?.isOwnerHours) {
    hoursField = {
      label: "Opening Hours", key: "openingHours", value: "Owner operating schedule",
      status: "CONFIRMED", statusText: "✓ Owner Supplied", level: "BUSINESS_SUPPLIED",
      notes: "Operating schedule supplied by owner",
      source: "Business Owner Entry", verificationMethod: "business_supplied", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else if (hoursRes.evidence && (hoursRes.strength === "STRONG" || hoursRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "openingHours", hoursRes.evidence);
    hoursField = {
      label: "Opening Hours", key: "openingHours", value: "Verified operating schedule",
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Operating schedule retrieved from ${hoursRes.evidence.title || hoursRes.evidence.source || "Directory Source"}`,
      evidenceId: hoursRes.evidence.id || null,
      source: hoursRes.evidence.title || hoursRes.evidence.source || defaultDirSource,
      sourceUrl: hoursRes.evidence.url || hoursRes.evidence.sourceUrl || null,
      sourceId: hoursRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", hoursRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", hoursRes)
    };
  } else {
    hoursField = {
      label: "Opening Hours", key: "openingHours", value: null,
      status: "UNCONFIRMED", statusText: "? Unconfirmed", level: "AI_DRAFT",
      notes: "Operating schedule unconfirmed — default draft schedule used",
      source: "AI Draft Default", verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  }
  hoursField = preserveIfStronger("openingHours", hoursField);

  // 9. Rating
  const ratingRes = findEvidenceForBusiness(biz, ["rating"]);
  let ratingField: TruthField;
  if (rating > 0 && !isDemo && ratingRes.evidence && (ratingRes.strength === "STRONG" || ratingRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "rating", ratingRes.evidence);
    ratingField = {
      label: "Rating", key: "rating", value: `${rating} ★`,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Public review rating (${rating}/5.0) on ${ratingRes.evidence.title || ratingRes.evidence.source || defaultDirSource}`,
      evidenceId: ratingRes.evidence.id || null,
      source: ratingRes.evidence.title || ratingRes.evidence.source || defaultDirSource,
      sourceUrl: ratingRes.evidence.url || ratingRes.evidence.sourceUrl || null,
      sourceId: ratingRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", ratingRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", ratingRes)
    };
  } else if (rating > 0) {
    ratingField = {
      label: "Rating", key: "rating", value: `${rating} ★`,
      status: "UNCONFIRMED", statusText: "? Unconfirmed Rating", level: "AI_DRAFT",
      notes: isDemo ? "Demo review rating placeholder" : "Rating present on unverified record without explicit evidence citation",
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else {
    ratingField = {
      label: "Rating", key: "rating", value: null,
      status: "MISSING", statusText: "❌ No Rating", level: "UNKNOWN",
      notes: "No public rating recorded on directory citation",
      confidence: null, verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  }
  ratingField = preserveIfStronger("rating", ratingField);

  // 10. Reviews
  const reviewRes = findEvidenceForBusiness(biz, ["reviews", "reviewsCount"]);
  let reviewField: TruthField;
  if (reviewsCount > 0 && !isDemo && reviewRes.evidence && (reviewRes.strength === "STRONG" || reviewRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "reviews", reviewRes.evidence);
    reviewField = {
      label: "Reviews", key: "reviews", value: `${reviewsCount} customer reviews`,
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Public feedback volume (${reviewsCount} reviews) recorded on ${reviewRes.evidence.title || reviewRes.evidence.source || defaultDirSource}`,
      evidenceId: reviewRes.evidence.id || null,
      source: reviewRes.evidence.title || reviewRes.evidence.source || defaultDirSource,
      sourceUrl: reviewRes.evidence.url || reviewRes.evidence.sourceUrl || null,
      sourceId: reviewRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", reviewRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", reviewRes)
    };
  } else if (reviewsCount > 0) {
    reviewField = {
      label: "Reviews", key: "reviews", value: `${reviewsCount} customer reviews`,
      status: "UNCONFIRMED", statusText: "? Unconfirmed Volume", level: "AI_DRAFT",
      notes: isDemo ? "Demo review count placeholder" : "Review count present on unverified record without explicit evidence citation",
      verificationMethod: "ai_inference", confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else {
    reviewField = {
      label: "Reviews", key: "reviews", value: null,
      status: "MISSING", statusText: "❌ No Reviews", level: "UNKNOWN",
      notes: "No public review count recorded on directory citation",
      confidence: null, verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  }
  reviewField = preserveIfStronger("reviews", reviewField);

  // 11. Social Links
  const hasSocial =
    (presence.facebookStatus && presence.facebookStatus !== "none") ||
    (presence.instagramStatus && presence.instagramStatus !== "none") ||
    biz?.hasSocial;
  const socialRes = findEvidenceForBusiness(biz, ["socialLinks", "social"]);

  let socialField: TruthField;
  if (hasSocial && !isDemo && socialRes.evidence && (socialRes.strength === "STRONG" || socialRes.strength === "MODERATE")) {
    const dates = resolveDates("VERIFIED", "socialLinks", socialRes.evidence);
    socialField = {
      label: "Social links", key: "socialLinks", value: "Active social presence",
      status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
      notes: `Public social media profile detected on ${socialRes.evidence.title || socialRes.evidence.source || "Directory Source"}`,
      evidenceId: socialRes.evidence.id || null,
      source: socialRes.evidence.title || socialRes.evidence.source || defaultDirSource,
      sourceUrl: socialRes.evidence.url || socialRes.evidence.sourceUrl || null,
      sourceId: socialRes.evidence.sourceId || null,
      verificationMethod: determineVerificationMethod("VERIFIED", socialRes),
      retrievedAt: dates.retrievedAt,
      verifiedAt: dates.verifiedAt,
      confidence: determineConfidence("VERIFIED", socialRes)
    };
  } else if (hasSocial && !isDemo) {
    socialField = {
      label: "Social links", key: "socialLinks", value: "Active social presence",
      status: "UNCONFIRMED", statusText: "? Unconfirmed Social", level: "UNKNOWN",
      notes: "Social media profiles indexed without direct verification",
      verificationMethod: null, confidence: null,
      retrievedAt: null, verifiedAt: null
    };
  } else {
    socialField = {
      label: "Social links", key: "socialLinks", value: null,
      status: "MISSING", statusText: "❌ Missing", level: "UNKNOWN",
      notes: "No public social media profiles confirmed",
      confidence: null, verificationMethod: null, retrievedAt: null, verifiedAt: null
    };
  }
  socialField = preserveIfStronger("socialLinks", socialField);

  const fieldsList = [
    nameField,
    phoneField,
    addressField,
    websiteField,
    catField,
    servField,
    hoursField,
    ratingField,
    reviewField,
    emailField,
    socialField
  ];

  const confirmedCount = fieldsList.filter(
    f => f.status === "CONFIRMED" || f.status === "confirmed"
  ).length;

  const unconfirmedCount = fieldsList.filter(
    f => f.status === "UNCONFIRMED" || f.status === "unconfirmed" || f.status === "WEAK"
  ).length;

  const verifiedCount = fieldsList.filter(f => f.level === "VERIFIED").length;
  const businessSuppliedCount = fieldsList.filter(f => f.level === "BUSINESS_SUPPLIED").length;
  const aiDraftCount = fieldsList.filter(f => f.level === "AI_DRAFT").length;
  const unknownCount = fieldsList.filter(f => f.level === "UNKNOWN").length;

  return {
    id: `btp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: biz?.id || "unknown",
    businessName: nameField,
    phone: phoneField,
    address: addressField,
    website: websiteField,
    category: catField,
    services: servField,
    openingHours: hoursField,
    rating: ratingField,
    reviews: reviewField,
    email: emailField,
    socialLinks: socialField,
    summary: {
      confirmedCount,
      unconfirmedCount,
      verifiedCount,
      businessSuppliedCount,
      aiDraftCount,
      unknownCount,
      draftPolicy:
        "Truth Semantics Enforced: VERIFIED facts require evidence backing; BUSINESS-SUPPLIED reflects owner inputs; AI-DRAFT represents unverified suggestions; UNKNOWN/MISSING represents missing or unconfirmed evidence."
    },
    generatedAt: new Date().toISOString()
  };
}

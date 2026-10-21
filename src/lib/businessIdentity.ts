import { Business, EvidenceItem, CanonicalSalesStage } from "../types";
import { normalizeUrl, extractDomain, normalizeEntityName } from "./businessTruth";

/**
 * MICRO-PHASE 9A: DETERMINISTIC BUSINESS IDENTITY & DEDUPLICATION ENGINE
 * 
 * Establishes a reliable, collision-free identity strategy for all prospect records
 * in SiteScout AI. Eliminates random IDs, timestamp-based keys, and unsafe merges.
 */

// Generic / shared domains that should NOT be used as the single unique identifier for a business
export const GENERIC_PLATFORM_DOMAINS = new Set([
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "yellowpages.com",
  "yellowpages.co.sz",
  "yellowpages.co.za",
  "selldirect.co.sz",
  "selldirect.com",
  "infoisinfo.co.sz",
  "cybo.com",
  "sayellow.com",
  "swazibusiness.com",
  "google.com",
  "maps.google.com",
  "yelp.com",
  "tripadvisor.com",
  "wa.me",
  "api.whatsapp.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com"
]);

/**
 * Standardizes a phone number into an international numeric string without formatting artifacts.
 * Returns null if the number is unlisted, empty, or too short to be a valid phone number.
 */
export function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  const trimmed = phone.trim().toLowerCase();
  if (
    trimmed === "unlisted" ||
    trimmed === "none" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "n/a" ||
    trimmed === ""
  ) {
    return null;
  }

  // Remove all non-digits except leading +
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7 || /^0+$/.test(digits)) {
    return null;
  }

  return (hasPlus ? "+" : "") + digits;
}

/**
 * Cleans and normalizes an address string for stable deterministic comparison.
 */
export function normalizeAddress(address?: string | null): string {
  if (!address || typeof address !== "string") return "";
  return address
    .toLowerCase()
    .replace(/\b(street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|highway|hwy|way|building|bldg|floor|fl|suite|ste|shop|unit|box|po box)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a high-confidence, non-generic website domain.
 */
export function getCanonicalDomain(urlOrDomain?: string | null): string | null {
  if (!urlOrDomain) return null;
  const domain = extractDomain(urlOrDomain);
  if (!domain || domain.length < 4 || !domain.includes(".")) return null;
  if (GENERIC_PLATFORM_DOMAINS.has(domain)) return null;
  return domain;
}

/**
 * Deterministic string slugifier (safe for Firestore doc IDs and URL paths).
 */
export function slugify(str: string, maxLength = 60): string {
  const clean = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean.slice(0, maxLength);
}

/**
 * Deterministic hash function (FNV-1a 32-bit hex) for stable compact identifiers.
 */
export function deterministicHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type IdentitySignalStrategy = 
  | "SOURCE_ID"
  | "WEBSITE_DOMAIN"
  | "PHONE_NUMBER"
  | "NAME_AND_ADDRESS"
  | "NAME_AND_LOCATION_FALLBACK"
  | "DEMO_STABLE_SLUG";

export interface DeterministicIdentityResult {
  businessId: string;
  strategy: IdentitySignalStrategy;
  confidence: number;
  normalizedKey: string;
}

/**
 * Generates a deterministic, stable business ID adhering to strict priority rules:
 * 1. Stable source-provided business/entity ID (e.g. Google Place ID, Directory ID)
 * 2. Normalized website domain (excluding generic platforms)
 * 3. Normalized business phone number
 * 4. Normalized business name combined with location/address
 * 5. Normalized business name and location fallback
 * 
 * NEVER uses timestamps, array indexes, or random values.
 */
export function resolveDeterministicBusinessId(
  input: {
    id?: string;
    sourceId?: string;
    placeId?: string;
    googlePlaceId?: string;
    name?: string;
    businessName?: string;
    websiteUrl?: string;
    sourceUrl?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    isDemo?: boolean;
    dataType?: string;
    presence?: {
      websiteUrl?: string;
    };
  }
): DeterministicIdentityResult {
  const isDemo = input.isDemo === true || input.dataType === "demo" || (typeof input.id === "string" && input.id.startsWith("demo-"));
  const rawName = input.name || input.businessName || "";
  const normName = normalizeEntityName(rawName) || slugify(rawName, 30) || "establishment";

  // Priority 0: Explicit assigned canonical record ID
  if (input.id && typeof input.id === "string" && input.id.trim().length > 3) {
    return {
      businessId: input.id.trim(),
      strategy: "SOURCE_ID",
      confidence: 1.0,
      normalizedKey: `id:${input.id.trim()}`
    };
  }

  // Demo Record Deterministic Path
  if (isDemo) {
    const normAddr = normalizeAddress(input.address) || slugify(input.city || "", 20) || "local";
    const key = `demo:${normName}:${normAddr}`;
    const hash = deterministicHash(key);
    return {
      businessId: `demo-${slugify(normName, 24)}-${hash.slice(0, 6)}`,
      strategy: "DEMO_STABLE_SLUG",
      confidence: 0.99,
      normalizedKey: key
    };
  }

  // Priority 1: Stable source-provided business/entity ID
  const rawSourceId = input.sourceId || input.placeId || input.googlePlaceId;
  if (rawSourceId && typeof rawSourceId === "string" && rawSourceId.trim().length > 3) {
    const cleanSourceId = rawSourceId.trim();
    const hash = deterministicHash(`source:${cleanSourceId}`);
    return {
      businessId: `biz_src_${slugify(cleanSourceId, 24)}_${hash.slice(0, 6)}`,
      strategy: "SOURCE_ID",
      confidence: 1.0,
      normalizedKey: `source:${cleanSourceId}`
    };
  }

  // Priority 2: Normalized website domain
  const candidateUrl = input.websiteUrl || input.presence?.websiteUrl || input.sourceUrl;
  const canonicalDomain = getCanonicalDomain(candidateUrl);
  if (canonicalDomain) {
    const cleanDomain = canonicalDomain.replace(/\./g, "_");
    const hash = deterministicHash(`domain:${canonicalDomain}`);
    return {
      businessId: `biz_dom_${slugify(cleanDomain, 30)}_${hash.slice(0, 6)}`,
      strategy: "WEBSITE_DOMAIN",
      confidence: 0.95,
      normalizedKey: `domain:${canonicalDomain}`
    };
  }

  // Priority 3: Normalized business phone number
  const normPhone = normalizePhoneNumber(input.phone);
  if (normPhone && normPhone.length >= 8) {
    const cleanPhone = normPhone.replace(/\+/g, "");
    const hash = deterministicHash(`phone:${normPhone}`);
    return {
      businessId: `biz_tel_${cleanPhone}_${hash.slice(0, 6)}`,
      strategy: "PHONE_NUMBER",
      confidence: 0.90,
      normalizedKey: `phone:${normPhone}`
    };
  }

  // Priority 4: Normalized business name combined with location/address
  const normAddress = normalizeAddress(input.address);
  if (normName && normAddress && normAddress.length >= 4) {
    const key = `name_addr:${normName}:${normAddress}`;
    const hash = deterministicHash(key);
    return {
      businessId: `biz_loc_${slugify(normName, 20)}_${slugify(normAddress, 16)}_${hash.slice(0, 6)}`,
      strategy: "NAME_AND_ADDRESS",
      confidence: 0.85,
      normalizedKey: key
    };
  }

  // Priority 5: Normalized business name and city/location fallback
  const normLoc = normalizeAddress(input.city) || normalizeAddress(input.country) || "general";
  const fallbackKey = `name_loc:${normName}:${normLoc}`;
  const fallbackHash = deterministicHash(fallbackKey);
  return {
    businessId: `biz_nam_${slugify(normName, 24)}_${fallbackHash.slice(0, 6)}`,
    strategy: "NAME_AND_LOCATION_FALLBACK",
    confidence: 0.70,
    normalizedKey: fallbackKey
  };
}

export type IdentityMatchConfidence = 
  | "EXACT_ID"
  | "SOURCE_MATCH"
  | "DOMAIN_MATCH"
  | "PHONE_MATCH"
  | "NAME_AND_ADDRESS_MATCH"
  | "AMBIGUOUS_NAME_DIFFERENT_LOCATION"
  | "NO_MATCH";

export interface IdentityMatchResult {
  matched: boolean;
  matchType: IdentityMatchConfidence;
  confidence: number;
  matchedBusiness?: Business;
  flagForReview?: boolean;
  reviewReason?: string;
}

/**
 * Evaluates whether a candidate business record matches an existing business in the database.
 * Enforces rule: Identical names at different locations MUST NOT be merged.
 */
export function matchBusinessRecord(
  candidate: Partial<Business>,
  existingBusinesses: Business[]
): IdentityMatchResult {
  if (!candidate || existingBusinesses.length === 0) {
    return { matched: false, matchType: "NO_MATCH", confidence: 0 };
  }

  const candidateDet = resolveDeterministicBusinessId(candidate);

  // 1. Direct ID / Key Match
  const directIdMatch = existingBusinesses.find(b => b.id === candidate.id || b.id === candidateDet.businessId);
  if (directIdMatch) {
    return {
      matched: true,
      matchType: "EXACT_ID",
      confidence: 1.0,
      matchedBusiness: directIdMatch
    };
  }

  // 2. Source ID Match
  if (candidate.sourceUrl || candidate.evidence?.sourceUrls?.[0]) {
    const candidateSrc = normalizeUrl(candidate.sourceUrl || candidate.evidence?.sourceUrls?.[0]);
    if (candidateSrc) {
      const sourceMatch = existingBusinesses.find(b => {
        const bSrc = normalizeUrl(b.sourceUrl || b.evidence?.sourceUrls?.[0]);
        return bSrc && bSrc === candidateSrc;
      });
      if (sourceMatch) {
        return {
          matched: true,
          matchType: "SOURCE_MATCH",
          confidence: 0.95,
          matchedBusiness: sourceMatch
        };
      }
    }
  }

  // 3. Domain Match (non-generic domains only)
  const candidateDomain = getCanonicalDomain((candidate as any).websiteUrl || candidate.presence?.websiteUrl || candidate.sourceUrl);
  if (candidateDomain) {
    const domainMatch = existingBusinesses.find(b => {
      const bDomain = getCanonicalDomain((b as any).websiteUrl || b.presence?.websiteUrl || b.sourceUrl);
      return bDomain && bDomain === candidateDomain;
    });
    if (domainMatch) {
      return {
        matched: true,
        matchType: "DOMAIN_MATCH",
        confidence: 0.95,
        matchedBusiness: domainMatch
      };
    }
  }

  // 4. Phone Number Match
  const candidatePhone = normalizePhoneNumber(candidate.phone);
  if (candidatePhone) {
    const phoneMatch = existingBusinesses.find(b => {
      const bPhone = normalizePhoneNumber(b.phone);
      if (!bPhone) return false;
      if (bPhone === candidatePhone) return true;
      const bDigits = bPhone.replace(/\D/g, "");
      const cDigits = candidatePhone.replace(/\D/g, "");
      if (bDigits.length >= 7 && cDigits.length >= 7) {
        if (bDigits.endsWith(cDigits) || cDigits.endsWith(bDigits)) return true;
      }
      return false;
    });
    if (phoneMatch) {
      // Check if names are reasonably compatible (not completely disjoint businesses sharing a trunk line)
      const candNormName = normalizeEntityName(candidate.name);
      const existNormName = normalizeEntityName(phoneMatch.name);
      if (
        candNormName === existNormName ||
        candNormName.includes(existNormName) ||
        existNormName.includes(candNormName) ||
        !candNormName ||
        !existNormName
      ) {
        return {
          matched: true,
          matchType: "PHONE_MATCH",
          confidence: 0.90,
          matchedBusiness: phoneMatch
        };
      }
    }
  }

  // 5. Name + Exact Address Match
  const candName = normalizeEntityName(candidate.name);
  const candAddr = normalizeAddress(candidate.address);
  if (candName.length >= 3 && candAddr.length >= 5) {
    const nameAddrMatch = existingBusinesses.find(b => {
      const bName = normalizeEntityName(b.name);
      const bAddr = normalizeAddress(b.address);
      return bName === candName && bAddr === candAddr;
    });
    if (nameAddrMatch) {
      return {
        matched: true,
        matchType: "NAME_AND_ADDRESS_MATCH",
        confidence: 0.85,
        matchedBusiness: nameAddrMatch
      };
    }
  }

  // 6. Name collision check: Same name but different location or phone!
  // MUST NOT AUTO-MERGE: Flag as ambiguous
  if (candName.length >= 3) {
    const sameNameDiffLocation = existingBusinesses.find(b => {
      const bName = normalizeEntityName(b.name);
      if (bName !== candName) return false;
      const bAddr = normalizeAddress(b.address);
      const bPhone = normalizePhoneNumber(b.phone);
      
      // If address or phone differs significantly, they are separate branches/entities
      const differentAddress = candAddr.length >= 4 && bAddr.length >= 4 && candAddr !== bAddr;
      const differentPhone = candidatePhone && bPhone && candidatePhone !== bPhone;
      return differentAddress || differentPhone;
    });

    if (sameNameDiffLocation) {
      return {
        matched: false,
        matchType: "AMBIGUOUS_NAME_DIFFERENT_LOCATION",
        confidence: 0.3,
        matchedBusiness: sameNameDiffLocation,
        flagForReview: true,
        reviewReason: `Business name '${candidate.name}' matches '${sameNameDiffLocation.name}' but location/phone differs. Kept as distinct records.`
      };
    }
  }

  return { matched: false, matchType: "NO_MATCH", confidence: 0 };
}

/**
 * Merges an incoming partial business record into an existing canonical business record safely.
 * - Preserves evidence list without duplicates.
 * - Preserves user ownership and audit fields.
 * - Respects verification hierarchy: Never overwrites verified truth with unverified data.
 * - Preserves advanced pipeline stages.
 */
export function mergeBusinessRecords(
  existing: Business,
  incoming: Partial<Business>
): Business {
  const merged: Business = { ...existing };

  // 1. Evidence List Fusion (Deduplicate by URL / sourceId)
  const existingEvidence = existing.evidenceList || [];
  const incomingEvidence = incoming.evidenceList || [];
  const seenEvidenceUrls = new Set<string>();

  const consolidatedEvidence: EvidenceItem[] = [];
  for (const item of [...existingEvidence, ...incomingEvidence]) {
    const key = item.url || item.sourceUrl || item.id;
    if (!key || !seenEvidenceUrls.has(key)) {
      if (key) seenEvidenceUrls.add(key);
      consolidatedEvidence.push(item);
    }
  }
  merged.evidenceList = consolidatedEvidence;

  // 2. Truth Profile & Verification Preservation
  const isExistingVerified = existing.verificationState === "VERIFIED" || existing.verificationState === "CONTACT_READY";
  const isIncomingVerified = incoming.verificationState === "VERIFIED" || incoming.verificationState === "CONTACT_READY";

  if (isExistingVerified && !isIncomingVerified) {
    // Retain verified state against weaker incoming data
    merged.verificationState = existing.verificationState;
  } else if (isIncomingVerified) {
    merged.verificationState = incoming.verificationState;
  } else {
    merged.verificationState = existing.verificationState || incoming.verificationState || "CANDIDATE";
  }

  // 3. Contact Information Protection & Enrichment
  if (incoming.phone && incoming.phone !== "Unlisted") {
    if (!isExistingVerified || isIncomingVerified || !existing.phone || existing.phone === "Unlisted") {
      merged.phone = incoming.phone;
    }
  } else if (existing.phone && existing.phone !== "Unlisted") {
    merged.phone = existing.phone;
  }

  if (incoming.email && incoming.email.includes("@")) {
    if (!isExistingVerified || isIncomingVerified || !existing.email) {
      merged.email = incoming.email;
    }
  } else if (existing.email) {
    merged.email = existing.email;
  }

  if (incoming.address && incoming.address.trim().length >= 5) {
    if (!isExistingVerified || isIncomingVerified || !existing.address || existing.address.length < 5) {
      merged.address = incoming.address;
    }
  } else if (existing.address) {
    merged.address = existing.address;
  }

  // 4. Ratings and Reviews (take higher review count/more recent data)
  if (incoming.reviewsCount !== undefined && incoming.reviewsCount > (existing.reviewsCount || 0)) {
    merged.reviewsCount = incoming.reviewsCount;
    if (incoming.rating !== undefined && incoming.rating > 0) {
      merged.rating = incoming.rating;
    }
  }

  // 5. Source Reference Preservation
  if (!existing.sourceUrl && incoming.sourceUrl) {
    merged.sourceUrl = incoming.sourceUrl;
  }
  if (!existing.directorySource && incoming.directorySource) {
    merged.directorySource = incoming.directorySource;
  }

  // 6. Pipeline & Lifecycle Protection (Preserve advanced salesStage)
  const STAGE_RANKS: Record<string, number> = {
    DISCOVERED: 1,
    VERIFICATION_REQUIRED: 2,
    VERIFIED: 3,
    AUDIT_COMPLETE: 4,
    OPPORTUNITY_IDENTIFIED: 5,
    WEBSITE_GENERATED: 6,
    PREVIEW_READY: 7,
    PREVIEW_SENT: 8,
    ENGAGED: 9,
    FOLLOW_UP: 10,
    PROPOSAL_SENT: 11,
    NEGOTIATION: 12,
    WON: 13,
    LOST: 14
  };

  const existingRank = existing.salesStage ? STAGE_RANKS[existing.salesStage] || 0 : 0;
  const incomingRank = incoming.salesStage ? STAGE_RANKS[incoming.salesStage] || 0 : 0;
  if (incomingRank > existingRank && incoming.salesStage) {
    merged.salesStage = incoming.salesStage;
    merged.prospectStatus = incoming.prospectStatus || existing.prospectStatus;
  } else if (existing.salesStage) {
    merged.salesStage = existing.salesStage;
    merged.prospectStatus = existing.prospectStatus;
  } else if (incoming.salesStage) {
    merged.salesStage = incoming.salesStage;
    merged.prospectStatus = incoming.prospectStatus;
  }

  // 7. General Fields & Content Enrichment
  if (incoming.description !== undefined && incoming.description !== "") {
    merged.description = incoming.description;
  }
  if (incoming.prospectNotes !== undefined) {
    merged.prospectNotes = incoming.prospectNotes;
  }
  if (incoming.dealClosureNotes !== undefined) {
    merged.dealClosureNotes = incoming.dealClosureNotes;
  }
  if (incoming.analysis !== undefined) {
    merged.analysis = incoming.analysis;
  }
  if (incoming.presenceScore !== undefined) {
    merged.presenceScore = incoming.presenceScore;
  }
  if (incoming.pipelineBranch !== undefined) {
    merged.pipelineBranch = incoming.pipelineBranch;
  }
  if (incoming.isDemo !== undefined) {
    merged.isDemo = incoming.isDemo;
  }
  if (incoming.dataType !== undefined) {
    merged.dataType = incoming.dataType;
  }
  if (incoming.evidence !== undefined) {
    merged.evidence = incoming.evidence;
  }
  if (incoming.directorySource !== undefined) {
    merged.directorySource = incoming.directorySource;
  }

  // 8. Ownership & System Stamps
  merged.userId = existing.userId || incoming.userId;
  merged.ownerId = existing.ownerId || incoming.ownerId;
  merged.createdAt = existing.createdAt || incoming.createdAt || new Date().toISOString();
  merged.updatedAt = new Date().toISOString();
  merged.version = (existing.version || 0) + 1;

  // 9. Lifecycle Dimension Updates (Incoming non-default or explicit values take precedence)
  if (incoming.previewApprovalStatus && (existing.previewApprovalStatus === "PENDING" || incoming.previewApprovalStatus !== "PENDING")) {
    merged.previewApprovalStatus = incoming.previewApprovalStatus;
  } else {
    merged.previewApprovalStatus = existing.previewApprovalStatus || incoming.previewApprovalStatus || "PENDING";
  }

  if (incoming.contractStatus && (existing.contractStatus === "NOT_SENT" || incoming.contractStatus !== "NOT_SENT")) {
    merged.contractStatus = incoming.contractStatus;
  } else {
    merged.contractStatus = existing.contractStatus || incoming.contractStatus || "NOT_SENT";
  }

  if (incoming.paymentStatus && (existing.paymentStatus === "UNPAID" || incoming.paymentStatus !== "UNPAID")) {
    merged.paymentStatus = incoming.paymentStatus;
  } else {
    merged.paymentStatus = existing.paymentStatus || incoming.paymentStatus || "UNPAID";
  }

  if (incoming.dealOutcome && (existing.dealOutcome === "OPEN" || incoming.dealOutcome !== "OPEN")) {
    merged.dealOutcome = incoming.dealOutcome;
  } else {
    merged.dealOutcome = existing.dealOutcome || incoming.dealOutcome || "OPEN";
  }
  if (incoming.contractSignedAt) merged.contractSignedAt = incoming.contractSignedAt;
  if (incoming.contractSignedBy) merged.contractSignedBy = incoming.contractSignedBy;
  if (incoming.paymentReceivedAt) merged.paymentReceivedAt = incoming.paymentReceivedAt;
  if (incoming.paidAmount !== undefined) merged.paidAmount = incoming.paidAmount;
  if (incoming.totalContractValue !== undefined) merged.totalContractValue = incoming.totalContractValue;
  if (incoming.dealClosedAt) merged.dealClosedAt = incoming.dealClosedAt;
  if (incoming.dealClosedBy) merged.dealClosedBy = incoming.dealClosedBy;

  // 10. Qualification & Prioritization Preservation
  // Preserve manual overrides from existing if incoming does not have newer overrides
  if (existing.qualificationOverrides && existing.qualificationOverrides.length > 0) {
    merged.qualificationOverrides = existing.qualificationOverrides;
    merged.qualificationStatus = existing.qualificationStatus || incoming.qualificationStatus;
    merged.qualificationScore = existing.qualificationScore || incoming.qualificationScore;
    merged.prioritizationRank = existing.prioritizationRank || incoming.prioritizationRank;
    merged.qualificationResult = existing.qualificationResult || incoming.qualificationResult;
  } else {
    merged.qualificationOverrides = incoming.qualificationOverrides || existing.qualificationOverrides;
    merged.qualificationStatus = incoming.qualificationStatus || existing.qualificationStatus;
    merged.qualificationScore = incoming.qualificationScore !== undefined ? incoming.qualificationScore : existing.qualificationScore;
    merged.prioritizationRank = incoming.prioritizationRank !== undefined ? incoming.prioritizationRank : existing.prioritizationRank;
    merged.qualificationResult = incoming.qualificationResult || existing.qualificationResult;
  }

  // 11. Review Queue & Decision Preservation (Micro-Phase 11C)
  const combinedDecisions = [
    ...(existing.reviewDecisions || []),
    ...(incoming.reviewDecisions || []).filter(inc => !(existing.reviewDecisions || []).some(ex => ex.id === inc.id))
  ];
  if (combinedDecisions.length > 0) {
    merged.reviewDecisions = combinedDecisions;
  }
  if (incoming.reviewState) {
    merged.reviewState = incoming.reviewState;
  } else if (existing.reviewState) {
    merged.reviewState = existing.reviewState;
  }
  if (incoming.pendingReviewReasons && incoming.pendingReviewReasons.length > 0) {
    merged.pendingReviewReasons = incoming.pendingReviewReasons;
  } else if (existing.pendingReviewReasons && existing.pendingReviewReasons.length > 0) {
    merged.pendingReviewReasons = existing.pendingReviewReasons;
  }

  // 12. Qualification Audit Trail & Decision History Preservation (Micro-Phase 11D)
  const combinedAuditTrail = [
    ...(existing.qualificationAuditTrail || []),
    ...(incoming.qualificationAuditTrail || []).filter(inc => !(existing.qualificationAuditTrail || []).some(ex => ex.id === inc.id))
  ];
  if (combinedAuditTrail.length > 0) {
    combinedAuditTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    merged.qualificationAuditTrail = combinedAuditTrail;
  }

  // 13. Contact Profile & Outreach Approval Status Preservation (Micro-Phase 12A)
  if (incoming.contactProfile) {
    merged.contactProfile = incoming.contactProfile;
  } else if (existing.contactProfile) {
    merged.contactProfile = existing.contactProfile;
  }
  if (incoming.outreachApprovalStatus) {
    merged.outreachApprovalStatus = incoming.outreachApprovalStatus;
  } else if (existing.outreachApprovalStatus) {
    merged.outreachApprovalStatus = existing.outreachApprovalStatus;
  }
  if (incoming.outreachApprovedBy) {
    merged.outreachApprovedBy = incoming.outreachApprovedBy;
    merged.outreachApprovedAt = incoming.outreachApprovedAt;
    merged.outreachApprovalNotes = incoming.outreachApprovalNotes;
  } else if (existing.outreachApprovedBy) {
    merged.outreachApprovedBy = existing.outreachApprovedBy;
    merged.outreachApprovedAt = existing.outreachApprovedAt;
    merged.outreachApprovalNotes = existing.outreachApprovalNotes;
  }

  // 14. Outreach Drafts & Active Draft ID Preservation (Micro-Phase 12B)
  const combinedDrafts = [
    ...(incoming.outreachDrafts || []),
    ...(existing.outreachDrafts || []).filter(ex => !(incoming.outreachDrafts || []).some(inc => inc.id === ex.id))
  ];
  if (combinedDrafts.length > 0) {
    merged.outreachDrafts = combinedDrafts;
  }
  if (incoming.activeOutreachDraftId) {
    merged.activeOutreachDraftId = incoming.activeOutreachDraftId;
  } else if (existing.activeOutreachDraftId) {
    merged.activeOutreachDraftId = existing.activeOutreachDraftId;
  }

  return merged;
}

export interface IngestionResult {
  consolidated: Business[];
  added: Business[];
  updated: Business[];
  unchanged: Business[];
  flaggedForReview: Array<{
    candidate: Partial<Business>;
    existingRecord?: Business;
    reason: string;
  }>;
}

/**
 * Idempotent Ingestion & Deduplication Pipeline
 * Ingests candidate businesses against an existing database, guaranteeing:
 * - Deterministic identity assigned to all records
 * - Confident matches are merged safely without duplicate creation
 * - Distinct branches/locations with same name remain separate
 * - Ambiguous matches are kept separate and flagged for review
 */
export function deduplicateAndIngestBusinesses(
  existingDatabase: Business[],
  incomingCandidates: Partial<Business>[],
  options?: {
    defaultUserId?: string;
  }
): IngestionResult {
  const resultDatabase = [...existingDatabase];
  const added: Business[] = [];
  const updated: Business[] = [];
  const unchanged: Business[] = [];
  const flaggedForReview: IngestionResult["flaggedForReview"] = [];

  for (const candidate of incomingCandidates) {
    // 1. Assign deterministic ID
    const identity = resolveDeterministicBusinessId(candidate);
    const deterministicCandidate: Business = {
      name: candidate.name || "Local Establishment",
      category: candidate.category || "General Trade",
      address: candidate.address || "Unspecified Location",
      phone: candidate.phone || "Unlisted",
      reviewsCount: candidate.reviewsCount || 0,
      rating: candidate.rating || 0,
      presence: candidate.presence || {
        hasWebsite: false,
        hasEmail: false,
        facebookStatus: "none",
        instagramStatus: "none",
        googleProfileQuality: "fair",
        reviewCountStatus: "few",
        photosStatus: "missing",
        descriptionQuality: "fair",
        openingHoursStatus: "missing",
        contactCompleteness: "missing"
      },
      description: candidate.description || "",
      verificationState: candidate.verificationState || "CANDIDATE",
      salesStage: candidate.salesStage || "DISCOVERED",
      previewApprovalStatus: candidate.previewApprovalStatus || "PENDING",
      contractStatus: candidate.contractStatus || "NOT_SENT",
      paymentStatus: candidate.paymentStatus || "UNPAID",
      dealOutcome: candidate.dealOutcome || "OPEN",
      userId: candidate.userId || options?.defaultUserId,
      ownerId: candidate.ownerId || options?.defaultUserId,
      createdAt: candidate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...candidate,
      id: identity.businessId // strictly enforce deterministic ID
    };

    // 2. Perform Match
    const match = matchBusinessRecord(deterministicCandidate, resultDatabase);

    if (match.flagForReview) {
      flaggedForReview.push({
        candidate: deterministicCandidate,
        existingRecord: match.matchedBusiness,
        reason: match.reviewReason || "Ambiguous match flagged for review"
      });
    }

    if (match.matched && match.matchedBusiness) {
      // Confident match: merge into existing record
      const existingIdx = resultDatabase.findIndex(b => b.id === match.matchedBusiness!.id);
      if (existingIdx !== -1) {
        const merged = mergeBusinessRecords(resultDatabase[existingIdx], candidate);
        resultDatabase[existingIdx] = merged;
        updated.push(merged);
      }
    } else {
      // Check if already in resultDatabase by deterministic ID
      const directIdx = resultDatabase.findIndex(b => b.id === deterministicCandidate.id);
      if (directIdx !== -1) {
        const merged = mergeBusinessRecords(resultDatabase[directIdx], candidate);
        resultDatabase[directIdx] = merged;
        unchanged.push(merged);
      } else {
        // Safe new addition
        resultDatabase.push(deterministicCandidate);
        added.push(deterministicCandidate);
      }
    }
  }

  return {
    consolidated: resultDatabase,
    added,
    updated,
    unchanged,
    flaggedForReview
  };
}

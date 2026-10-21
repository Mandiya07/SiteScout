import { db, auth } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  query, where, orderBy, getDoc 
} from "firebase/firestore";
import { 
  Business, GeneratedSite, CanonicalSalesStage, 
  ProspectActivity, ProspectNote, ProspectFollowUp, CapturedLead,
  OpportunityScoreExplanation, DigitalDeficitAudit, PresenceMetrics, ProspectStatus, SalesStatus,
  PreviewApprovalStatus, ContractStatus, PaymentStatus, DealOutcome, LifecycleAuditEvent,
  WebsiteNeedStatus, OpportunityAssessmentStatus, OpportunityConfidence
} from "../types";
import { saveBusinessRecord } from "./businessPersistence";
import { buildProspectContactProfile } from "./prospectContactValidation";

// ==========================================
// 1. CANONICAL PIPELINE STAGES & DEFINITIONS
// ==========================================

export interface StageDefinition {
  id: CanonicalSalesStage;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  order: number;
}

export const CANONICAL_STAGES: StageDefinition[] = [
  {
    id: "DISCOVERED",
    label: "Discovered",
    shortLabel: "Discovered",
    description: "Prospect discovered from public search or initial lead feed",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-800",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    order: 0
  },
  {
    id: "VERIFICATION_REQUIRED",
    label: "Verification Required",
    shortLabel: "Unverified",
    description: "Business presence candidates pending verification check",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50/50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/60",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    order: 1
  },
  {
    id: "VERIFIED",
    label: "Verified",
    shortLabel: "Verified",
    description: "Business identity and active direct contact details confirmed",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50/50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-900/60",
    badgeBg: "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200",
    order: 2
  },
  {
    id: "AUDIT_COMPLETE",
    label: "Audit Complete",
    shortLabel: "Audited",
    description: "Web presence audit completed with explicit evidence findings",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50/50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/60",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
    order: 3
  },
  {
    id: "OPPORTUNITY_IDENTIFIED",
    label: "Opportunity Identified",
    shortLabel: "Opportunity",
    description: "Structured multi-dimensional opportunity score calculated",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-900/60",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200",
    order: 4
  },
  {
    id: "WEBSITE_GENERATED",
    label: "Website Generated",
    shortLabel: "Generated",
    description: "Draft modernization prototype site created for prospect",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50/50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-900/60",
    badgeBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
    order: 5
  },
  {
    id: "PREVIEW_READY",
    label: "Preview Ready",
    shortLabel: "Preview Ready",
    description: "Interactive draft preview link verified and ready to send",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50/50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-900/60",
    badgeBg: "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200",
    order: 6
  },
  {
    id: "PREVIEW_SENT",
    label: "Preview Sent",
    shortLabel: "Preview Sent",
    description: "Shareable interactive presentation link dispatched to client",
    color: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-50/50 dark:bg-fuchsia-950/30",
    border: "border-fuchsia-200 dark:border-fuchsia-900/60",
    badgeBg: "bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-800 dark:text-fuchsia-200",
    order: 7
  },
  {
    id: "ENGAGED",
    label: "Engaged",
    shortLabel: "Engaged",
    description: "Client viewed preview, submitted feedback, or initiated dialogue",
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50/50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-900/60",
    badgeBg: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200",
    order: 8
  },
  {
    id: "FOLLOW_UP",
    label: "Follow-Up Active",
    shortLabel: "Follow-Up",
    description: "Active follow-up communication or scheduled touchpoint",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50/50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-900/60",
    badgeBg: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200",
    order: 9
  },
  {
    id: "PROPOSAL_SENT",
    label: "Proposal Sent",
    shortLabel: "Proposal",
    description: "Formal commercial proposal, pricing, and contract delivered",
    color: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-50/50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-900/60",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200",
    order: 10
  },
  {
    id: "NEGOTIATION",
    label: "Negotiation",
    shortLabel: "Negotiation",
    description: "Active agreement customization, terms, or scope discussion",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50/50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/60",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    order: 11
  },
  {
    id: "WON",
    label: "Closed / Won",
    shortLabel: "Won",
    description: "Confirmed commercial sale outcome and client agreement",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900/60",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
    order: 12
  },
  {
    id: "LOST",
    label: "Archived / Lost",
    shortLabel: "Lost",
    description: "Declined proposal, unresponsive, or archived opportunity",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50/50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-900/60",
    badgeBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200",
    order: 13
  }
];

// Helper to normalize any legacy or arbitrary stage string into CanonicalSalesStage
export function toCanonicalStage(rawStage?: string): CanonicalSalesStage {
  if (!rawStage) return "DISCOVERED";
  const s = rawStage.toUpperCase().replace(/[\s\-_]/g, "");

  // Explicit sales outcome checks (MUST NOT map preview approval or CRM sync to WON!)
  if (s === "WON" || s.includes("DEALWON") || s.includes("CLOSEDWON") || s.includes("SALEWON")) return "WON";
  if (s.includes("LOST") || s.includes("REJECT") || s.includes("DECLINED") || s.includes("ARCHIVE")) return "LOST";
  if (s.includes("NEGOTIAT")) return "NEGOTIATION";
  if (s.includes("PROPOSAL")) return "PROPOSAL_SENT";
  if (s.includes("FOLLOWUP") || s.includes("FOLLOW") || s.includes("REMIND")) return "FOLLOW_UP";
  if (s.includes("ENGAGED") || s.includes("INTEREST") || s.includes("FEEDBACK") || s.includes("VIEWED")) return "ENGAGED";
  if (s.includes("PREVIEWSENT") || s.includes("SENT") || s.includes("DISPATCHED")) return "PREVIEW_SENT";
  if (s.includes("PREVIEWREADY") || s.includes("DRAFTREADY")) return "PREVIEW_READY";
  if (s.includes("WEBSITEGENERATED") || s.includes("SITEGENERATED") || s.includes("GENERATED")) return "WEBSITE_GENERATED";
  if (s.includes("OPPORTUNITY") || s.includes("ANALYZED") || s.includes("SCORED")) return "OPPORTUNITY_IDENTIFIED";
  if (s.includes("AUDIT") || s.includes("CHECKED")) return "AUDIT_COMPLETE";
  if (s === "VERIFIED" || s.includes("CONFIRMED")) return "VERIFIED";
  if (s.includes("VERIFICATION") || s.includes("UNVERIFIED")) return "VERIFICATION_REQUIRED";
  if (s.includes("DISCOVERED") || s.includes("NEW") || s.includes("LEAD")) return "DISCOVERED";

  return "DISCOVERED";
}

// Validates lifecycle transitions to prevent invalid stage corruptions
export function isValidTransition(
  currentStage: CanonicalSalesStage,
  targetStage: CanonicalSalesStage,
  context?: string
): boolean {
  if (currentStage === targetStage) return true;

  // LOST can be transitioned to from any active stage, and can be re-opened
  if (targetStage === "LOST") return true;

  // Legitimate operational exceptions
  if (currentStage === "FOLLOW_UP" && targetStage === "ENGAGED") return true;
  if (currentStage === "NEGOTIATION" && targetStage === "FOLLOW_UP") return true;
  if (currentStage === "ENGAGED" && targetStage === "PREVIEW_SENT") return true;
  if (currentStage === "PROPOSAL_SENT" && (targetStage === "ENGAGED" || targetStage === "FOLLOW_UP")) return true;
  if (currentStage === "LOST" && (targetStage === "DISCOVERED" || targetStage === "ENGAGED" || targetStage === "FOLLOW_UP")) return true;

  const orderMap: Record<CanonicalSalesStage, number> = {
    DISCOVERED: 0,
    NEW_PROSPECT: 0,
    VERIFICATION_REQUIRED: 1,
    VERIFIED: 2,
    AUDIT_COMPLETE: 3,
    OPPORTUNITY_IDENTIFIED: 4,
    QUALIFIED: 4,
    WEBSITE_GENERATED: 5,
    PREVIEW_READY: 6,
    PREVIEW_SENT: 7,
    CONTACTED: 7,
    ENGAGED: 8,
    DISCOVERY: 9,
    FOLLOW_UP: 9,
    PROPOSAL_SENT: 10,
    NEGOTIATION: 11,
    WON: 12,
    LOST: 13,
  };

  const currOrder = orderMap[currentStage] ?? 0;
  const targetOrder = orderMap[targetStage] ?? 0;

  // Allow forward progress
  if (targetOrder > currOrder) {
    // If attempting to jump directly to WON from early stages without proposal/negotiation, block unless context is explicit manual close
    if (targetStage === "WON" && currOrder < orderMap["PROPOSAL_SENT"] && context !== "EXPLICIT_MANUAL_WON") {
      return false;
    }
    return true;
  }

  // Allow backward step within active pipeline if done manually in CRM
  if (context === "EXPLICIT_CRM_MANUAL_UPDATE") {
    return true;
  }

  return false;
}

// Convert CanonicalSalesStage to legacy ProspectStatus format
export function canonicalToProspectStatus(stage: CanonicalSalesStage): ProspectStatus {
  switch (stage) {
    case "DISCOVERED":
    case "VERIFICATION_REQUIRED":
    case "VERIFIED": return "New";
    case "AUDIT_COMPLETE":
    case "OPPORTUNITY_IDENTIFIED": return "Analyzed";
    case "WEBSITE_GENERATED":
    case "PREVIEW_READY": return "Preview Ready";
    case "PREVIEW_SENT": return "Preview Sent";
    case "ENGAGED":
    case "FOLLOW_UP": return "Interested";
    case "PROPOSAL_SENT":
    case "NEGOTIATION": return "Proposal";
    case "WON": return "Won";
    case "LOST": return "Lost";
    default: return "New";
  }
}

// Convert CanonicalSalesStage to legacy SalesStatus format
export function canonicalToSalesStatus(stage: CanonicalSalesStage): SalesStatus {
  switch (stage) {
    case "DISCOVERED":
    case "VERIFICATION_REQUIRED":
    case "VERIFIED":
    case "AUDIT_COMPLETE":
    case "OPPORTUNITY_IDENTIFIED":
    case "WEBSITE_GENERATED":
    case "PREVIEW_READY": return "Lead";
    case "PREVIEW_SENT":
    case "FOLLOW_UP": return "Contacted";
    case "ENGAGED":
    case "NEGOTIATION": return "Negotiation";
    case "PROPOSAL_SENT": return "Proposal Sent";
    case "WON": return "Closed";
    case "LOST": return "Lost";
    default: return "Lead";
  }
}

export function getStageMeta(stage: CanonicalSalesStage | string): StageDefinition {
  const canonical = toCanonicalStage(stage);
  return CANONICAL_STAGES.find(s => s.id === canonical) || CANONICAL_STAGES[0];
}

// ==========================================
// 2. EXPLAINABLE OPPORTUNITY SCORE ENGINE
// ==========================================

export interface DeficitRule {
  key: keyof DigitalDeficitAudit;
  label: string;
  penaltyPoints: number;
  description: string;
}

export const DEFICIT_SCORING_RULES: DeficitRule[] = [
  { key: "noWebsite", label: "No Dedicated Website", penaltyPoints: 30, description: "Zero verified company web address registered or indexed" },
  { key: "outdatedWebsite", label: "Outdated / Legacy Website", penaltyPoints: 15, description: "Site uses non-responsive legacy HTML or lacks SSL encryption" },
  { key: "noWhatsappCta", label: "No Direct WhatsApp CTA", penaltyPoints: 10, description: "Mobile shoppers cannot start an instant 1-click WhatsApp conversation" },
  { key: "poorMobileExperience", label: "Missing Mobile Viewport / Optimization", penaltyPoints: 10, description: "Layout breaks or requires horizontal scrolling on smartphone screens" },
  { key: "noBookingSystem", label: "No Online Booking Engine", penaltyPoints: 8, description: "Lacks digital scheduling for consultations, quotes, or table bookings" },
  { key: "noOnlineCatalogue", label: "No Online Service/Product Menu", penaltyPoints: 7, description: "Services and pricing are opaque, causing prospective buyers to bounce" },
  { key: "noEnquiryForm", label: "No Digital Lead Capture Form", penaltyPoints: 6, description: "No after-hours quote request or contact form enabled" },
  { key: "noSeo", label: "No Search Engine Optimization", penaltyPoints: 6, description: "Missing meta titles, descriptions, and OpenGraph tags" },
  { key: "noGooglePresence", label: "Weak Google Maps Citation", penaltyPoints: 5, description: "Unclaimed or incomplete Google Business listing" },
  { key: "noSocialMedia", label: "No Active Social Channels", penaltyPoints: 5, description: "No linked Facebook or Instagram profile found in directory" },
  { key: "poorBranding", label: "Missing Visual Media Assets", penaltyPoints: 4, description: "No authentic high-resolution workspace or trade gallery photos" },
  { key: "brokenLinks", label: "Broken Domain / 404 Errors", penaltyPoints: 4, description: "Listed URL returns HTTP failure or redirect loop" },
  { key: "missingContact", label: "Incomplete Contact Coordinates", penaltyPoints: 5, description: "Missing public email or direct telephone line" }
];

export function calculateExplainableOpportunityScore(
  presence?: PresenceMetrics,
  rating: number = 0,
  reviewsCount: number = 0,
  businessName: string = "Prospect",
  category: string = "Local Business",
  phone: string = "",
  evidence?: any
): OpportunityScoreExplanation {
  const isAudited = presence?.isAudited || !!presence?.lastCheckedAt || !!evidence?.checkedAt;
  const webStatus = presence?.websiteStatus || (presence?.hasWebsite ? "LIVE" : "WEBSITE_NOT_DISCOVERED");

  // Determine Website Need Status & Assessment Status
  let websiteNeedStatus: WebsiteNeedStatus = "UNCONFIRMED_NEED";
  let assessmentStatus: OpportunityAssessmentStatus = "UNCHECKED";
  let opportunityConfidence: OpportunityConfidence = "UNCONFIRMED";

  const verifiedIssues: string[] = [];
  const estimatedIssues: string[] = [];
  const unknowns: string[] = [];

  // Use actual deficits if present
  const defs = presence?.deficits || {
    noWebsite: !presence?.hasWebsite && webStatus !== "WEBSITE_NOT_DISCOVERED",
    outdatedWebsite: false,
    noGooglePresence: presence?.googleProfileQuality === "poor",
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
  };

  // Evaluate Website Need Status & Opportunity Confidence based on Verifiable Evidence
  if (webStatus === "LIVE" || webStatus === "WEBSITE_LIVE" || webStatus === "WEBSITE_CONFIRMED") {
    if (isAudited) {
      assessmentStatus = "COMPLETE";
      const hasMajorDeficit = defs.outdatedWebsite || defs.poorMobileExperience || defs.noSeo || defs.brokenLinks || defs.noEnquiryForm || defs.noWhatsappCta || presence?.sslStatus === false || defs.missingContact;
      if (hasMajorDeficit) {
        websiteNeedStatus = "NEEDS_MODERNIZATION";
        opportunityConfidence = "HIGH";
        if (presence?.sslStatus === false) verifiedIssues.push("Missing SSL Encryption Certificate (HTTP)");
        if (defs.poorMobileExperience) verifiedIssues.push("Non-responsive / Poor Smartphone Navigation");
        if (defs.brokenLinks) verifiedIssues.push("Broken domain links / Host errors detected");
        if (defs.missingContact) verifiedIssues.push("Inaccessible or missing contact details on website");
        if (defs.noSeo) verifiedIssues.push("Missing Meta Descriptions & Search Tags");
        if (defs.noWhatsappCta) estimatedIssues.push("No Direct WhatsApp Instant Enquiry CTA");
        if (defs.noEnquiryForm) estimatedIssues.push("No Digital Lead Capture Form");
      } else {
        websiteNeedStatus = "NO_NEW_WEBSITE_NEEDED";
        opportunityConfidence = "HIGH";
      }
    } else {
      // Website URL located but full HTTP quality audit not yet run
      assessmentStatus = "INCOMPLETE";
      const hasInitialDeficit = defs.outdatedWebsite || defs.poorMobileExperience || defs.noSeo || defs.brokenLinks || defs.noEnquiryForm || defs.noWhatsappCta || presence?.sslStatus === false || defs.missingContact;
      if (hasInitialDeficit) {
        websiteNeedStatus = "NEEDS_MODERNIZATION";
        opportunityConfidence = "MEDIUM";
        if (presence?.sslStatus === false) verifiedIssues.push("Missing SSL Encryption Certificate (HTTP)");
        if (defs.poorMobileExperience) verifiedIssues.push("Non-responsive / Poor Smartphone Navigation");
        if (defs.brokenLinks) verifiedIssues.push("Broken domain links / Host errors detected");
        if (defs.missingContact) verifiedIssues.push("Inaccessible or missing contact details");
        if (defs.noSeo) verifiedIssues.push("Missing Meta Descriptions & Search Tags");
      } else {
        websiteNeedStatus = "UNCONFIRMED_NEED";
        opportunityConfidence = "MEDIUM";
        unknowns.push("Website URL discovered, but deep technical audit (SSL, smartphone layout, lead forms) pending.");
      }
    }
  } else if (webStatus === "BROKEN" || webStatus === "UNREACHABLE" || webStatus === "WEBSITE_UNREACHABLE") {
    assessmentStatus = isAudited ? "COMPLETE" : "INCOMPLETE";
    websiteNeedStatus = "NEEDS_NEW_WEBSITE";
    opportunityConfidence = isAudited ? "HIGH" : "MEDIUM";
    verifiedIssues.push(`Domain Unreachable / Broken Page (HTTP ${presence?.httpStatus || "Error"})`);
  } else if (webStatus === "CONFIRMED_NO_WEBSITE" || (webStatus === "NONE" && isAudited) || (defs.noWebsite && isAudited)) {
    assessmentStatus = "COMPLETE";
    websiteNeedStatus = "NEEDS_NEW_WEBSITE";
    opportunityConfidence = "HIGH";
    verifiedIssues.push("Confirmed No Official Corporate Website Indexed");
  } else {
    // WEBSITE_NOT_DISCOVERED or UNCHECKED
    assessmentStatus = isAudited ? "INCOMPLETE" : "UNCHECKED";
    websiteNeedStatus = "UNCONFIRMED_NEED";
    opportunityConfidence = "UNCONFIRMED";
    unknowns.push("Website existence unconfirmed (no domain located during public directory scan)");
    unknowns.push("Subpage booking widgets & contact forms (untested without URL)");
    unknowns.push("Mobile viewport rendering (untested without URL)");
  }

  // Evaluate Evidence Freshness
  let evidenceFreshness: "FRESH" | "STALE" | "MISSING" = "MISSING";
  if (isAudited) {
    const checkDateStr = presence?.lastCheckedAt || evidence?.checkedAt;
    if (checkDateStr) {
      const checkTime = new Date(checkDateStr).getTime();
      if (!isNaN(checkTime)) {
        const ageDays = (Date.now() - checkTime) / (1000 * 60 * 60 * 24);
        evidenceFreshness = ageDays > 90 ? "STALE" : "FRESH";
      } else {
        evidenceFreshness = "FRESH";
      }
    } else {
      evidenceFreshness = "FRESH";
    }
  }

  if (evidenceFreshness === "STALE") {
    unknowns.push("Evidence audit data is stale (> 90 days old) and requires re-verification.");
    if (opportunityConfidence === "HIGH") {
      opportunityConfidence = "MEDIUM";
    }
  }

  // Calculate Digital Deficit Points
  let deficitPoints = 0;
  const confirmedOpportunities: string[] = [];
  const unknownAreas: string[] = [...unknowns];
  const supportingEvidence: Array<{ criterion: string; status: "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN"; details: string; source?: string }> = [];

  const deficitItems = DEFICIT_SCORING_RULES.map(rule => {
    const isDetected = !!defs[rule.key];
    if (isDetected && websiteNeedStatus !== "UNCONFIRMED_NEED" && websiteNeedStatus !== "NO_NEW_WEBSITE_NEEDED") {
      deficitPoints += rule.penaltyPoints;
      confirmedOpportunities.push(rule.label);
      supportingEvidence.push({
        criterion: rule.label,
        status: rule.key === "noWebsite" ? "MISSING" : rule.key === "brokenLinks" ? "BROKEN" : "WEAK",
        details: rule.description,
        source: "Audit Engine"
      });
    }
    return {
      key: rule.key,
      label: rule.label,
      points: rule.penaltyPoints,
      detected: isDetected && websiteNeedStatus !== "UNCONFIRMED_NEED",
      reason: isDetected ? rule.description : "Requirement satisfied or verified present"
    };
  });

  // Calculate Normalized Deficit Score with CAPPING FOR UNCONFIRMED WEBSITES
  let normalizedDeficitScore = 0;
  if (websiteNeedStatus === "UNCONFIRMED_NEED") {
    // CAPPED at neutral 40 for unconfirmed undiscovered sites
    normalizedDeficitScore = 40;
  } else if (websiteNeedStatus === "NO_NEW_WEBSITE_NEEDED") {
    normalizedDeficitScore = 20;
  } else if (websiteNeedStatus === "NEEDS_NEW_WEBSITE") {
    normalizedDeficitScore = 85;
  } else if (websiteNeedStatus === "NEEDS_MODERNIZATION") {
    normalizedDeficitScore = Math.min(95, Math.max(50, deficitPoints * 2.2));
  } else {
    normalizedDeficitScore = Math.min(95, Math.max(15, deficitPoints * 2.0));
  }

  // Calculate Quality Points
  let qualityPoints = 40;
  const qualityFactors: { key: string; label: string; points: number; value: string | number; reason: string }[] = [];

  let repPoints = 0;
  if (rating >= 4.8) repPoints = 40;
  else if (rating >= 4.5) repPoints = 35;
  else if (rating >= 4.0) repPoints = 25;
  else if (rating >= 3.5) repPoints = 15;
  else if (rating > 0) repPoints = 5;
  qualityPoints += repPoints;
  qualityFactors.push({
    key: "rating",
    label: "Google / Directory Customer Rating",
    points: repPoints,
    value: rating > 0 ? `${rating.toFixed(1)} ★` : "Unrated",
    reason: rating >= 4.0 ? "Strong local customer reputation proves commercial viability" : rating > 0 ? "Average customer rating" : "No verified review rating recorded"
  });

  let reviewPoints = 0;
  if (reviewsCount >= 50) reviewPoints = 20;
  else if (reviewsCount >= 25) reviewPoints = 15;
  else if (reviewsCount >= 10) reviewPoints = 10;
  else if (reviewsCount >= 3) reviewPoints = 5;
  qualityPoints += reviewPoints;
  qualityFactors.push({
    key: "reviewsCount",
    label: "Customer Review Volume",
    points: reviewPoints,
    value: reviewsCount > 0 ? `${reviewsCount} reviews` : "0 reviews",
    reason: reviewsCount >= 10 ? "Established customer base actively leaves social proof" : reviewsCount > 0 ? "Emerging customer review profile" : "No verified review volume recorded"
  });
  const normalizedQualityScore = Math.min(100, Math.max(30, qualityPoints));

  // Commercial Fit (20%)
  const highIntentCategories = ["plumb", "dent", "law", "auto", "mechanic", "hvac", "electr", "roof", "contract", "salon", "restaur", "vet", "clean", "locksmith", "secur"];
  const isHighIntent = highIntentCategories.some(c => category.toLowerCase().includes(c));
  const commercialFitScore = isHighIntent ? 90 : (category.length > 2 ? 75 : 60);

  // Contactability (20%)
  let contactabilityScore = 40;
  if (phone && phone.trim() !== "" && phone.toLowerCase() !== "none" && phone.toLowerCase() !== "unlisted") {
    contactabilityScore += 40;
  }
  if (presence?.hasEmail) {
    contactabilityScore += 20;
  }
  contactabilityScore = Math.min(100, contactabilityScore);

  // Evidence Confidence
  let confidenceScore = 35;
  if (isAudited) confidenceScore += 30;
  if (evidence?.verificationStatus === "source_backed") confidenceScore += 20;
  if (rating > 0 && reviewsCount > 0) confidenceScore += 15;
  confidenceScore = Math.min(100, confidenceScore);
  const evidenceConfidenceLevel: "HIGH" | "MEDIUM" | "LOW" = confidenceScore >= 75 ? "HIGH" : confidenceScore >= 50 ? "MEDIUM" : "LOW";

  const deficitWeight = 0.35;
  const qualityWeight = 0.25;
  const commercialWeight = 0.20;
  const contactabilityWeight = 0.20;

  let rawTotalScore = Math.round(
    (normalizedDeficitScore * deficitWeight) +
    (normalizedQualityScore * qualityWeight) +
    (commercialFitScore * commercialWeight) +
    (contactabilityScore * contactabilityWeight)
  );

  // Score Capping Rules based on verifiable evidence
  if (websiteNeedStatus === "UNCONFIRMED_NEED") {
    // Capped at 55% for unconfirmed website status (Rule 11A)
    rawTotalScore = Math.min(55, rawTotalScore);
  } else if (websiteNeedStatus === "NO_NEW_WEBSITE_NEEDED") {
    rawTotalScore = Math.min(40, rawTotalScore);
  } else if (evidenceFreshness === "STALE") {
    rawTotalScore = Math.min(75, rawTotalScore);
  }

  const totalScore = Math.min(99, Math.max(20, rawTotalScore));

  // Summary Explanations
  const reputationSummary = rating > 0 ? `verified reputation (${rating.toFixed(1)}★ across ${reviewsCount} reviews)` : `unrated directory listing`;
  let summaryExplanation = "";
  let recommendedPitchStrategy = "";

  if (websiteNeedStatus === "UNCONFIRMED_NEED") {
    summaryExplanation = `Opportunity assessment for ${businessName} is UNCONFIRMED (${totalScore}% cap applied). No official corporate website has been confirmed and an HTTP audit is pending.`;
    recommendedPitchStrategy = "Execute a full HTTP website audit or contact the business directly to confirm website existence before making outreach claims.";
  } else if (websiteNeedStatus === "NO_NEW_WEBSITE_NEEDED") {
    summaryExplanation = `${businessName} operates an active, secure website with adequate conversion features based on audited evidence. Low opportunity for new website development.`;
    recommendedPitchStrategy = "Focus on ancillary digital services (such as search SEO optimization or targeted local ad campaigns) rather than a full website rebuild.";
  } else if (websiteNeedStatus === "NEEDS_NEW_WEBSITE") {
    summaryExplanation = `${businessName} represents an Evidence-Backed New Website Opportunity (${totalScore}%). Confirmed operating with no active website or unreachable domain, supported by ${reputationSummary}.`;
    recommendedPitchStrategy = "Present the completed website modernization prototype as a ready-to-launch digital asset to capture lost mobile search traffic.";
  } else {
    // NEEDS_MODERNIZATION
    summaryExplanation = `${businessName} is a High-Value Revamp Opportunity (${totalScore}%). Operates an existing website with documented usability or mobile deficits, supported by ${reputationSummary}.`;
    recommendedPitchStrategy = "Highlight specific documented issues (e.g. non-responsive layout, missing SSL, or lack of instant WhatsApp enquiry) and present the redesigned prototype site.";
  }

  return {
    totalScore,
    digitalDeficitScore: normalizedDeficitScore,
    businessQualityScore: normalizedQualityScore,
    commercialFitScore,
    contactabilityScore,
    evidenceConfidenceScore: confidenceScore,
    evidenceConfidenceLevel,
    websiteNeedStatus,
    assessmentStatus,
    opportunityConfidence,
    isVerifiedFinding: isAudited && websiteNeedStatus !== "UNCONFIRMED_NEED" && evidenceFreshness !== "STALE",
    verifiedIssues,
    estimatedIssues,
    unknowns,
    evidenceFreshness,
    deficitWeight,
    qualityWeight,
    commercialWeight,
    contactabilityWeight,
    formulaDescription: `Opportunity Score = (${normalizedDeficitScore} Deficit × 35%) + (${normalizedQualityScore} Quality × 25%) + (${commercialFitScore} Fit × 20%) + (${contactabilityScore} Contact × 20%) = ${totalScore}%`,
    deficitItems,
    qualityFactors,
    confirmedOpportunities,
    unknownAreas,
    supportingEvidence,
    assessmentStatement: websiteNeedStatus === "UNCONFIRMED_NEED" 
      ? "Opportunity assessment is UNCONFIRMED due to unverified website status."
      : "Opportunity assessment derived from verified evidence findings.",
    summaryExplanation,
    recommendedPitchStrategy
  };
}

// ==========================================
// 3. FIRESTORE SUBCOLLECTION CRM ENGINE
// ==========================================

// --- Activities Subcollection: /businesses/{businessId}/activities/{activityId} ---

export async function addBusinessActivity(
  businessId: string, 
  activity: Omit<ProspectActivity, "id">, 
  userId?: string
): Promise<ProspectActivity> {
  const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload: ProspectActivity = {
    ...activity,
    id: actId,
    businessId,
    timestamp: activity.timestamp || new Date().toISOString(),
    actorId: userId || activity.actorId
  };

  // Local storage caching for instant offline response
  try {
    const key = `sitescout_activities_${businessId}`;
    const cached = localStorage.getItem(key);
    const list: ProspectActivity[] = cached ? JSON.parse(cached) : [];
    list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      const cleanedPayload: Record<string, any> = { ...payload };
      Object.keys(cleanedPayload).forEach(k => {
        if (cleanedPayload[k] === undefined) delete cleanedPayload[k];
      });
      await setDoc(doc(db, "businesses", businessId, "activities", actId), cleanedPayload);
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to persist activity to /businesses/${businessId}/activities:`, err);
    }
  }

  return payload;
}

export async function getBusinessActivities(
  businessId: string,
  userId?: string
): Promise<ProspectActivity[]> {
  const cacheKey = `sitescout_activities_${businessId}`;
  let cachedList: ProspectActivity[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedList = JSON.parse(raw);
  } catch (e) {}

  if (!db || businessId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const colRef = collection(db, "businesses", businessId, "activities");
    const q = query(colRef, orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const results: ProspectActivity[] = [];
    snap.forEach(d => results.push(d.data() as ProspectActivity));

    if (results.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(results));
      return results;
    }
  } catch (err) {
    console.warn(`[Firestore Subcollection] Error reading activities for ${businessId}:`, err);
  }

  return cachedList;
}

// --- Notes Subcollection: /businesses/{businessId}/notes/{noteId} ---

export async function addBusinessNote(
  businessId: string,
  note: Omit<ProspectNote, "id" | "createdAt">,
  userId?: string,
  authorName?: string
): Promise<ProspectNote> {
  const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload: ProspectNote = {
    ...note,
    id: noteId,
    businessId,
    createdAt: new Date().toISOString(),
    authorId: userId,
    authorName: authorName || "SiteScout Agent",
    category: note.category || "general"
  };

  // Local storage caching
  try {
    const key = `sitescout_notes_${businessId}`;
    const cached = localStorage.getItem(key);
    const list: ProspectNote[] = cached ? JSON.parse(cached) : [];
    list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "notes", noteId), payload);
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to persist note to /businesses/${businessId}/notes:`, err);
    }
  }

  // Auto-log note creation activity
  addBusinessActivity(businessId, {
    businessId,
    type: "follow_up_sent",
    title: "Note Added",
    description: payload.content.length > 80 ? `${payload.content.slice(0, 80)}...` : payload.content,
    timestamp: new Date().toISOString(),
    actorId: userId
  });

  return payload;
}

export async function getBusinessNotes(businessId: string): Promise<ProspectNote[]> {
  const cacheKey = `sitescout_notes_${businessId}`;
  let cachedList: ProspectNote[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedList = JSON.parse(raw);
  } catch (e) {}

  if (!db || businessId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const colRef = collection(db, "businesses", businessId, "notes");
    const snap = await getDocs(colRef);
    const results: ProspectNote[] = [];
    snap.forEach(d => results.push(d.data() as ProspectNote));

    if (results.length > 0) {
      results.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      localStorage.setItem(cacheKey, JSON.stringify(results));
      return results;
    }
  } catch (err) {
    console.warn(`[Firestore Subcollection] Error reading notes for ${businessId}:`, err);
  }

  return cachedList;
}

export async function updateBusinessNote(
  businessId: string,
  noteId: string,
  updates: Partial<ProspectNote>
): Promise<void> {
  try {
    const key = `sitescout_notes_${businessId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const list: ProspectNote[] = JSON.parse(cached);
      const updatedList = list.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
      localStorage.setItem(key, JSON.stringify(updatedList));
    }
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "notes", noteId), {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to update note ${noteId}:`, err);
    }
  }
}

export async function deleteBusinessNote(businessId: string, noteId: string): Promise<void> {
  try {
    const key = `sitescout_notes_${businessId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const list: ProspectNote[] = JSON.parse(cached);
      localStorage.setItem(key, JSON.stringify(list.filter(n => n.id !== noteId)));
    }
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await deleteDoc(doc(db, "businesses", businessId, "notes", noteId));
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to delete note ${noteId}:`, err);
    }
  }
}

// --- Follow-Ups Subcollection: /businesses/{businessId}/followups/{followUpId} ---

export async function addBusinessFollowUp(
  businessId: string,
  followUp: Omit<ProspectFollowUp, "id" | "createdAt">,
  userId?: string
): Promise<ProspectFollowUp> {
  const followUpId = `flw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload: ProspectFollowUp = {
    ...followUp,
    id: followUpId,
    businessId,
    createdAt: new Date().toISOString(),
    status: followUp.status || "pending",
    actorId: userId
  };

  // Local storage caching
  try {
    const key = `sitescout_followups_${businessId}`;
    const cached = localStorage.getItem(key);
    const list: ProspectFollowUp[] = cached ? JSON.parse(cached) : [];
    list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "followups", followUpId), payload);
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to persist follow-up to /businesses/${businessId}/followups:`, err);
    }
  }

  // Auto-log activity
  addBusinessActivity(businessId, {
    businessId,
    type: "follow_up_sent",
    title: `Follow-up Scheduled: ${payload.title}`,
    description: `Due: ${payload.dueDate} via ${payload.channel.toUpperCase()}`,
    timestamp: new Date().toISOString(),
    actorId: userId
  });

  return payload;
}

export async function getBusinessFollowUps(businessId: string): Promise<ProspectFollowUp[]> {
  const cacheKey = `sitescout_followups_${businessId}`;
  let cachedList: ProspectFollowUp[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedList = JSON.parse(raw);
  } catch (e) {}

  if (!db || businessId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const colRef = collection(db, "businesses", businessId, "followups");
    const snap = await getDocs(colRef);
    const results: ProspectFollowUp[] = [];
    snap.forEach(d => results.push(d.data() as ProspectFollowUp));

    if (results.length > 0) {
      results.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      localStorage.setItem(cacheKey, JSON.stringify(results));
      return results;
    }
  } catch (err) {
    console.warn(`[Firestore Subcollection] Error reading followups for ${businessId}:`, err);
  }

  return cachedList;
}

export async function updateBusinessFollowUp(
  businessId: string,
  followUpId: string,
  updates: Partial<ProspectFollowUp>,
  userId?: string
): Promise<void> {
  try {
    const key = `sitescout_followups_${businessId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const list: ProspectFollowUp[] = JSON.parse(cached);
      const updatedList = list.map(f => f.id === followUpId ? { ...f, ...updates } : f);
      localStorage.setItem(key, JSON.stringify(updatedList));
    }
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "followups", followUpId), {
        ...updates,
        completedAt: updates.status === "completed" ? new Date().toISOString() : undefined
      }, { merge: true });
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to update followup ${followUpId}:`, err);
    }
  }

  if (updates.status === "completed") {
    addBusinessActivity(businessId, {
      businessId,
      type: "follow_up_sent",
      title: "Follow-up Completed",
      description: `Completed task on ${new Date().toLocaleDateString()}`,
      timestamp: new Date().toISOString(),
      actorId: userId
    });
  }
}

export async function updateProspectStage(
  business: Business,
  targetStage: CanonicalSalesStage,
  notes?: string,
  context?: string
): Promise<{ success: boolean; stage: CanonicalSalesStage; message: string }> {
  const currentStage = toCanonicalStage(business.salesStage || business.prospectStatus);

  if (!isValidTransition(currentStage, targetStage, context)) {
    return {
      success: false,
      stage: currentStage,
      message: `Invalid stage transition from ${currentStage} to ${targetStage}.`
    };
  }

  const updatedStage = targetStage;
  const derivedProspectStatus = canonicalToProspectStatus(updatedStage);

  business.salesStage = updatedStage;
  business.prospectStatus = derivedProspectStatus;
  business.updatedAt = new Date().toISOString();
  if (notes) {
    business.prospectNotes = business.prospectNotes ? `${notes}\n${business.prospectNotes}` : notes;
  }

  await saveBusinessRecord(business);

  addBusinessActivity(business.id, {
    businessId: business.id,
    type: updatedStage === "WON" ? "proposal_accepted" : updatedStage === "LOST" ? "proposal_declined" : "prospect_replied",
    title: `Lifecycle Stage Transition: ${currentStage} → ${updatedStage}`,
    description: notes || `Moved to ${updatedStage}`,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    stage: updatedStage,
    message: `Stage updated to ${updatedStage}`
  };
}

export async function deleteBusinessFollowUp(businessId: string, followUpId: string): Promise<void> {
  try {
    const key = `sitescout_followups_${businessId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const list: ProspectFollowUp[] = JSON.parse(cached);
      localStorage.setItem(key, JSON.stringify(list.filter(f => f.id !== followUpId)));
    }
  } catch (e) {}

  if (db && !businessId.startsWith("demo-")) {
    try {
      await deleteDoc(doc(db, "businesses", businessId, "followups", followUpId));
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to delete followup ${followUpId}:`, err);
    }
  }
}

// ==========================================
// 8. CAPTURED LEADS (Micro-Phase 8C)
// ==========================================

export async function getBusinessLeads(businessId: string): Promise<CapturedLead[]> {
  const cacheKey = `sitescout_leads_${businessId}`;
  let cachedList: CapturedLead[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedList = JSON.parse(raw);
  } catch (e) {}

  if (!db || businessId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const colRef = collection(db, "businesses", businessId, "leads");
    const snap = await getDocs(colRef);
    const results: CapturedLead[] = [];
    snap.forEach(d => results.push(d.data() as CapturedLead));

    if (results.length > 0) {
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem(cacheKey, JSON.stringify(results));
      return results;
    }
  } catch (err) {
    console.warn(`[Firestore Subcollection] Error reading leads for ${businessId}:`, err);
  }

  return cachedList;
}

export async function updateBusinessLeadStatus(
  businessId: string,
  leadId: string,
  status: CapturedLead["status"],
  userId?: string
): Promise<void> {
  try {
    const key = `sitescout_leads_${businessId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const list: CapturedLead[] = JSON.parse(cached);
      const updatedList = list.map(l => l.id === leadId ? { ...l, status } : l);
      localStorage.setItem(key, JSON.stringify(updatedList));
    }
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "leads", leadId), {
        status,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to update lead ${leadId}:`, err);
    }
  }

  addBusinessActivity(businessId, {
    businessId,
    type: "prospect_replied",
    title: `Enquiry Status: ${status}`,
    description: `Updated lead status to ${status}`,
    timestamp: new Date().toISOString(),
    actorId: userId
  });
}

export async function addBusinessLead(
  businessId: string,
  leadData: Omit<CapturedLead, "id" | "createdAt" | "status" | "source">
): Promise<CapturedLead> {
  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const payload: CapturedLead = {
    ...leadData,
    id: leadId,
    businessId,
    status: "NEW",
    createdAt: new Date().toISOString(),
    source: "website_contact_form",
    notificationStatus: leadData.notificationStatus || "NOT_CONFIGURED"
  };

  try {
    const key = `sitescout_leads_${businessId}`;
    const cached = localStorage.getItem(key);
    const list: CapturedLead[] = cached ? JSON.parse(cached) : [];
    list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}

  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test" && auth.currentUser) {
    try {
      await setDoc(doc(db, "businesses", businessId, "leads", leadId), payload);
    } catch (err) {
      console.warn(`[Firestore Subcollection] Failed to write lead for ${businessId}:`, err);
    }
  }

  return payload;
}

// ==========================================================
// 9. SEPARATED LIFECYCLE DIMENSIONS & AUDIT TRAIL (Micro-Phase 8D)
// ==========================================================

const memoryLifecycleAuditMap: Record<string, LifecycleAuditEvent[]> = {};

export async function recordLifecycleAuditEvent(
  businessId: string,
  event: Omit<LifecycleAuditEvent, "id" | "timestamp">,
  userId?: string
): Promise<LifecycleAuditEvent> {
  const eventId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const payload: LifecycleAuditEvent = {
    ...event,
    id: eventId,
    timestamp,
    actorId: userId || event.actorId
  };

  // 1. In-memory Map
  if (!memoryLifecycleAuditMap[businessId]) {
    memoryLifecycleAuditMap[businessId] = [];
  }
  memoryLifecycleAuditMap[businessId].unshift(payload);

  // 2. Local Cache (browser)
  try {
    if (typeof localStorage !== "undefined") {
      const key = `sitescout_audit_${businessId}`;
      const cached = localStorage.getItem(key);
      const list: LifecycleAuditEvent[] = cached ? JSON.parse(cached) : [];
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {}

  // 3. Firestore Subcollection /businesses/{businessId}/lifecycle_audits/{eventId}
  if (db && !businessId.startsWith("demo-") && process.env.NODE_ENV !== "test") {
    try {
      await setDoc(doc(db, "businesses", businessId, "lifecycle_audits", eventId), payload);
    } catch (err) {
      console.warn(`[Audit Trail] Failed to persist lifecycle audit for ${businessId}:`, err);
    }
  }

  // 4. Activity Timeline Log
  addBusinessActivity(businessId, {
    businessId,
    type: event.eventType === "deal_closure_action" ? "deal_won" : "prospect_replied",
    title: `Lifecycle Change: ${event.previousState || "NONE"} → ${event.newState}`,
    description: `Actor: ${event.actor}. Type: ${event.eventType}`,
    timestamp,
    actorId: userId || event.actorId,
    metadata: {
      auditId: eventId,
      previousState: event.previousState,
      newState: event.newState,
      eventType: event.eventType
    }
  });

  return payload;
}

export async function getBusinessLifecycleAuditEvents(businessId: string): Promise<LifecycleAuditEvent[]> {
  const cacheKey = `sitescout_audit_${businessId}`;
  let cachedList: LifecycleAuditEvent[] = memoryLifecycleAuditMap[businessId] ? [...memoryLifecycleAuditMap[businessId]] : [];
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(cacheKey);
      if (raw) cachedList = JSON.parse(raw);
    }
  } catch (e) {}

  if (!db || businessId.startsWith("demo-")) {
    return cachedList;
  }

  try {
    const colRef = collection(db, "businesses", businessId, "lifecycle_audits");
    const snap = await getDocs(colRef);
    const results: LifecycleAuditEvent[] = [];
    snap.forEach(d => results.push(d.data() as LifecycleAuditEvent));

    if (results.length > 0) {
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(results));
      }
      return results;
    }
  } catch (err) {
    console.warn(`[Audit Trail] Error reading audits for ${businessId}:`, err);
  }

  return cachedList;
}

/**
 * 1. Preview Approval Transition (PENDING -> APPROVED / REJECTED / CHANGES_REQUESTED)
 * CRITICAL RULE: Preview approval DOES NOT sign a contract, record payment, or close the deal as WON.
 */
export async function updatePreviewApprovalStatus(
  business: Business,
  status: PreviewApprovalStatus,
  actor: string = "Client",
  actorId?: string,
  notes?: string
): Promise<{ success: boolean; business: Business; previewApprovalStatus: PreviewApprovalStatus; message: string; auditEvent: LifecycleAuditEvent }> {
  const previousStatus = business.previewApprovalStatus || "PENDING";
  business.previewApprovalStatus = status;
  business.updatedAt = new Date().toISOString();

  // If status is approved, we mark deployment ready for review, but DO NOT modify contractStatus, paymentStatus, or dealOutcome!
  if (status === "APPROVED") {
    business.deploymentStatus = "CLIENT_APPROVED";
  }

  await saveBusinessRecord(business);

  const auditEvent = await recordLifecycleAuditEvent(business.id, {
    businessId: business.id,
    dimension: "previewApproval",
    eventType: "preview_approval_change",
    actor,
    actorId,
    previousState: previousStatus,
    newState: status,
    metadata: { notes }
  }, actorId);

  return {
    success: true,
    business,
    previewApprovalStatus: status,
    message: `Preview approval status updated to ${status}. Contract and deal outcome remain unchanged.`,
    auditEvent
  };
}

/**
 * 2. Contract Status Transition (NOT_SENT -> SENT -> SIGNED / DECLINED / EXPIRED)
 * CRITICAL RULE: Contract signing DOES NOT confirm payment and DOES NOT close deal as WON.
 */
export async function updateContractStatus(
  business: Business,
  status: ContractStatus,
  actor: string = "Client / Owner",
  actorId?: string,
  notes?: string,
  signedBy?: string
): Promise<{ success: boolean; business: Business; contractStatus: ContractStatus; message: string; auditEvent: LifecycleAuditEvent }> {
  const previousStatus = business.contractStatus || "NOT_SENT";
  business.contractStatus = status;
  business.updatedAt = new Date().toISOString();

  if (status === "SIGNED") {
    business.contractSignedAt = new Date().toISOString();
    if (signedBy) business.contractSignedBy = signedBy;
  }

  await saveBusinessRecord(business);

  const auditEvent = await recordLifecycleAuditEvent(business.id, {
    businessId: business.id,
    dimension: "contract",
    eventType: "contract_status_change",
    actor,
    actorId,
    previousState: previousStatus,
    newState: status,
    metadata: { notes, signedBy }
  }, actorId);

  return {
    success: true,
    business,
    contractStatus: status,
    message: `Contract status updated to ${status}. Payment and deal outcome remain independent.`,
    auditEvent
  };
}

/**
 * 3. Payment Status Transition (UNPAID -> PENDING -> PARTIALLY_PAID -> PAID / FAILED / REFUNDED)
 * CRITICAL RULE: Payment receipt DOES NOT automatically close deal as WON. Partial payments & refunds preserved.
 */
export async function updatePaymentStatus(
  business: Business,
  status: PaymentStatus,
  amount?: number,
  totalValue?: number,
  actor: string = "Payment Gateway / Finance",
  actorId?: string,
  notes?: string
): Promise<{ success: boolean; business: Business; paymentStatus: PaymentStatus; message: string; auditEvent: LifecycleAuditEvent }> {
  const previousStatus = business.paymentStatus || "UNPAID";
  business.paymentStatus = status;
  business.updatedAt = new Date().toISOString();

  if (amount !== undefined) business.paidAmount = amount;
  if (totalValue !== undefined) business.totalContractValue = totalValue;
  if (status === "PAID" || status === "PARTIALLY_PAID") {
    business.paymentReceivedAt = new Date().toISOString();
  }

  await saveBusinessRecord(business);

  const auditEvent = await recordLifecycleAuditEvent(business.id, {
    businessId: business.id,
    dimension: "payment",
    eventType: "payment_status_change",
    actor,
    actorId,
    previousState: previousStatus,
    newState: status,
    metadata: { amount, totalValue, notes }
  }, actorId);

  return {
    success: true,
    business,
    paymentStatus: status,
    message: `Payment status updated to ${status}. Deal outcome remains independent.`,
    auditEvent
  };
}

/**
 * 4. Deal Outcome Transition (OPEN -> WON / LOST)
 * CRITICAL RULE: A deal becomes WON ONLY through an explicit, authorized closure action.
 * Unauthorized requests to mark WON are rejected.
 */
export async function updateDealOutcome(
  business: Business,
  outcome: DealOutcome,
  actor: string = "Sales Manager",
  actorId?: string,
  notes?: string,
  isAuthorizedClosure: boolean = false
): Promise<{ success: boolean; business: Business; dealOutcome: DealOutcome; message: string; auditEvent?: LifecycleAuditEvent }> {
  const previousOutcome = business.dealOutcome || "OPEN";

  // Enforce explicit authorized closure rule
  if (outcome === "WON" && !isAuthorizedClosure) {
    return {
      success: false,
      business,
      dealOutcome: previousOutcome,
      message: "Unauthorized: Deal can only become WON via an explicit, authorized closure action under business rules."
    };
  }

  business.dealOutcome = outcome;
  business.updatedAt = new Date().toISOString();

  if (outcome === "WON") {
    business.salesStage = "WON";
    business.prospectStatus = "Won";
    business.dealClosedAt = new Date().toISOString();
    business.dealClosedBy = actor;
    if (notes) business.dealClosureNotes = notes;
  } else if (outcome === "LOST") {
    business.salesStage = "LOST";
    business.prospectStatus = "Lost";
    if (notes) business.dealClosureNotes = notes;
  } else {
    // Re-opened deal
    business.dealOutcome = "OPEN";
  }

  await saveBusinessRecord(business);

  const auditEvent = await recordLifecycleAuditEvent(business.id, {
    businessId: business.id,
    dimension: "dealOutcome",
    eventType: outcome === "WON" ? "deal_closure_action" : "deal_outcome_change",
    actor,
    actorId,
    previousState: previousOutcome,
    newState: outcome,
    metadata: { notes, isAuthorizedClosure }
  }, actorId);

  return {
    success: true,
    business,
    dealOutcome: outcome,
    message: `Deal outcome updated to ${outcome}.`,
    auditEvent
  };
}

/**
 * 5. CRM Synchronization
 * CRITICAL RULE: CRM Synchronization DOES NOT create WON deals. It maintains current deal outcome.
 */
export async function syncCrmProspect(
  business: Business,
  targetCrm: string = "HubSpot",
  actor: string = "System / User",
  actorId?: string
): Promise<{ success: boolean; business: Business; dealOutcome: DealOutcome; message: string; auditEvent: LifecycleAuditEvent }> {
  // Retain existing outcome or default to OPEN; DO NOT modify to WON
  const currentOutcome = business.dealOutcome || "OPEN";
  business.updatedAt = new Date().toISOString();

  const auditEvent = await recordLifecycleAuditEvent(business.id, {
    businessId: business.id,
    dimension: "crmSync",
    eventType: "crm_sync",
    actor,
    actorId,
    previousState: currentOutcome,
    newState: currentOutcome,
    metadata: { targetCrm }
  }, actorId);

  return {
    success: true,
    business,
    dealOutcome: currentOutcome,
    message: `Synchronized ${business.name} to ${targetCrm} without modifying deal outcome (remains ${currentOutcome}).`,
    auditEvent
  };
}

// Re-export Micro-Phase 9A Deterministic Business Identity & Deduplication Engine
export { 
  resolveDeterministicBusinessId, 
  matchBusinessRecord, 
  mergeBusinessRecords, 
  deduplicateAndIngestBusinesses,
  normalizePhoneNumber,
  normalizeAddress,
  getCanonicalDomain,
  GENERIC_PLATFORM_DOMAINS
} from "./businessIdentity";

// Re-export Micro-Phase 9B Canonical Business Persistence Service
export {
  saveBusinessRecord,
  getBusinessRecord,
  fetchUserBusinesses,
  deleteBusinessRecord,
  ingestAndPersistBusinesses,
  getLocalBusinessCache,
  setLocalBusinessCache,
  BUSINESS_CACHE_KEY
} from "./businessPersistence";

// Re-export Micro-Phase 13A Canonical Follow-Up Task Management
export {
  createFollowUpTask,
  assignFollowUpTask,
  rescheduleFollowUpTask,
  updateFollowUpTaskStatus,
  createFollowUpFromCommunication,
  getProspectFollowUpTasks,
  isTaskOverdue,
  getEffectiveTaskStatus,
  calculateDueTimestamp,
  isUserAuthorizedForTask
} from "./prospectFollowUpTasks";

// Re-export Micro-Phase 13B Follow-Up Sequences & Sales Pipeline Automation
export {
  DEFAULT_FOLLOW_UP_SEQUENCES,
  getAvailableSequences,
  getSequenceById,
  createFollowUpSequence,
  checkProspectSequenceEligibility,
  calculateStepDueDate,
  enrollProspectInSequence,
  advanceSequenceEnrollment,
  pauseSequenceEnrollment,
  resumeSequenceEnrollment,
  cancelSequenceEnrollment,
  handleSequenceReplyOrOptOut
} from "./prospectFollowUpSequences";

// Re-export Micro-Phase 13C Sales Pipeline Stage Management & Deal Progress Tracking
export {
  CANONICAL_PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  normalizePipelineStage,
  validatePipelineStageTransition,
  executePipelineStageTransition,
  updateDealCommercialTerms
} from "./prospectPipelineStages";

// Re-export Micro-Phase 13D Deal Value, Revenue Records & Financial Reporting
export {
  toCents,
  fromCents,
  formatCurrency,
  computeBusinessFinancialsFromLedger,
  recordFinancialLedgerEntry,
  recordPayment,
  recordRefund,
  calculateRevenueMetrics
} from "./prospectFinancials";

// Re-export Micro-Phase 14A Proposal, Contract & Commercial Document Integrity
export {
  generateDocumentNumber,
  createCommercialDocument,
  updateCommercialDocument,
  approveCommercialDocument,
  sendCommercialDocument,
  acceptCommercialDocument,
  rejectCommercialDocument,
  cancelCommercialDocument,
  getCommercialDocumentByAccessToken,
  revokeDocumentAccessToken
} from "./commercialDocuments";

// Re-export Micro-Phase 14B Customer Onboarding & Handoff
export {
  generateDefaultOnboardingChecklist,
  extractCustomerContacts,
  initiateCustomerOnboarding,
  updateOnboardingRequirement,
  advanceOnboardingStatus,
  pauseCustomerOnboarding,
  cancelCustomerOnboarding,
  updateOnboardingProjectDetails
} from "./customerOnboarding";

// Re-export Micro-Phase 14C Customer Project & Website Delivery Management
export {
  generateDefaultMilestones,
  generateDefaultProjectTasks,
  transferOnboardingRequirements,
  initializeCustomerProject,
  updateProjectTask,
  recordCustomerVersionApproval,
  submitProjectRevision,
  evaluateLaunchReadiness,
  advanceProjectStatus,
  recordProjectDeployment
} from "./customerProjectDelivery";

// Re-export Micro-Phase 14D Website Launch Verification, Handover, and Post-Launch Support
export {
  verifyDeployedWebsite,
  deriveSupportTerms,
  initiateCustomerHandover,
  confirmCustomerHandover,
  completeCustomerProject,
  createSupportTicket,
  resolveSupportTicket
} from "./websiteLaunchHandover";

// Re-export Micro-Phase 15A Customer Account, Subscription & Service Entitlement Management
export {
  CANONICAL_PLANS,
  createCustomerAccount,
  convertProspectToCustomer,
  activatePaidSubscription,
  changeSubscriptionPlan,
  markSubscriptionPastDue,
  cancelSubscription,
  expireSubscription,
  checkServiceEntitlement,
  adminOverrideSubscriptionPlan
} from "./customerSubscription";

// Re-export Micro-Phase 15C Subscription Lifecycle, Billing Events & Entitlement Sync
export {
  calculateEffectiveEntitlements,
  synchronizeEntitlements,
  processBillingEvent,
  renewSubscription,
  cancelSubscriptionWithPeriodEnd,
  reactivateSubscription
} from "./subscriptionBillingEvents";

// Re-export Micro-Phase 15D Billing Records, Invoices & Customer Payment History
export {
  roundMoney,
  createCustomerInvoice,
  recordCustomerInvoicePayment,
  recordFailedPaymentAttempt,
  refundCustomerPayment,
  voidCustomerInvoice,
  evaluateOverdueInvoices,
  getCustomerBillingSummary
} from "./customerBilling";

// Re-export Micro-Phase 16A Customer Support, Service Requests & Issue Management
export {
  sanitizeTicketForCustomer,
  normalizeSupportPriority,
  createCustomerSupportTicket,
  assignSupportTicket,
  updateSupportTicketStatus,
  addTicketMessage,
  reopenSupportTicket,
  resolveSupportTicket as resolveCustomerSupportTicket,
  getCustomerTickets,
  getStaffTickets
} from "./customerSupport";

// Re-export Micro-Phase 16B Customer Communication, Notifications & Support Messaging
export {
  validateRecipientForChannel,
  getEffectiveNotificationPreferences,
  updateCustomerNotificationPreferences,
  queueCustomerNotification,
  dispatchNotificationAttempt,
  recordNotificationDeliveryStatus,
  retryFailedNotification,
  markNotificationRead,
  getCustomerNotifications,
  getStaffNotificationAuditLog,
  dispatchSupportTicketNotification
} from "./customerCommunications";

// Re-export Micro-Phase 16C Customer Portal, Account Security & Access Control
export {
  createCustomerSession,
  isSessionValid,
  revokeCustomerSession,
  isCustomerAccountOwner,
  authorizeCustomerAccess,
  sanitizeCustomerPortalData,
  authorizeDirectApiAccess
} from "./customerPortalAccess";

// Re-export Micro-Phase 16D Customer Account Settings, Preferences & Data Management
export {
  validateProfileSettings,
  validateBusinessInfoSettings,
  getCanonicalAccountSettings,
  updateCustomerAccountSettings,
  deactivateCustomerAccount,
  reactivateCustomerAccount,
  SUPPORTED_TIMEZONES
} from "./customerAccountSettings";

// Re-export Micro-Phase 12B & 12C Outreach Drafts, Truthfulness & Delivery Management
export {
  generatePersonalizedOutreachDraft,
  scanDraftTruthfulness,
  extractVerifiedEvidenceGaps
} from "./prospectOutreachDrafting";

export {
  updateOutreachDraft,
  approveOutreachDraft,
  rejectOutreachDraft,
  submitDraftForReview,
  scheduleOutreachDelivery,
  cancelScheduledDelivery,
  rescheduleOutreachDelivery,
  deliverOutreachMessage,
  validatePreflightDelivery,
  isUserAuthorizedForOutreach,
  isUserAuthorizedForApproval
} from "./prospectOutreachDelivery";

// Re-export Micro-Phase 12D Communication History
export {
  createCanonicalCommunicationRecord,
  recordCommunicationLifecycleEvent,
  recordInboundReply,
  getProspectCommunicationTimeline
} from "./prospectCommunicationHistory";

// ==============================================================
// MICRO-PHASE 19E: CRM ANALYTICS & RECORD INTEGRITY FUNCTIONS
// ==============================================================

import {
  toCents,
  fromCents,
  formatCurrency,
  calculateRevenueMetrics
} from "./prospectFinancials";

export interface CrmDashboardAnalytics {
  totalProspects: number;
  qualifiedProspects: number;
  outreachPrepared: number;
  messagesActuallySent: number;
  repliesReceived: number;
  activeOpportunities: number;
  dealsWon: number;
  dealsLost: number;
  pipelineValueByCurrency: Record<string, number>;
  pipelineValueSummary: string;
  verifiedRevenueByCurrency: Record<string, number>;
  verifiedRevenueSummary: string;
  totalNetRevenueCents: number;
  confirmedPaidDealsCount: number;
}

/**
 * Calculates unified CRM analytics strictly from canonical records without hardcoding or simulation.
 */
export function calculateCrmDashboardAnalytics(businesses: Business[]): CrmDashboardAnalytics {
  const totalProspects = businesses.length;
  
  let qualifiedProspects = 0;
  let outreachPrepared = 0;
  let messagesActuallySent = 0;
  let repliesReceived = 0;
  let activeOpportunities = 0;
  let dealsWon = 0;
  let dealsLost = 0;
  const pipelineCentsByCurrency: Record<string, number> = {};

  const activePipelineStages: CanonicalSalesStage[] = [
    "QUALIFIED", "CONTACTED", "ENGAGED", "DISCOVERY", "PROPOSAL_SENT", "NEGOTIATION", "FOLLOW_UP"
  ];

  businesses.forEach(b => {
    // 1. Qualified prospects
    const stage = toCanonicalStage(b.salesStage || b.prospectStatus);
    const isQual = b.qualificationStatus === "QUALIFIED" || 
                   b.qualificationResult?.status === "QUALIFIED" ||
                   stage === "QUALIFIED" ||
                   stage === "ENGAGED" ||
                   stage === "DISCOVERY" ||
                   stage === "PROPOSAL_SENT" ||
                   stage === "NEGOTIATION" ||
                   stage === "WON";
    if (isQual) {
      qualifiedProspects++;
    }

    // 2. Outreach prepared
    const drafts = b.outreachDrafts || [];
    if (drafts.length > 0) {
      outreachPrepared += drafts.length;
    }

    // 3. Messages actually sent (direct or protocol, non-simulated)
    drafts.forEach(d => {
      if ((d.deliveryStatus === "SENT" || d.deliveryStatus === "PROTOCOL_DISPATCHED") && !d.lastDeliveryResult?.isSimulated) {
        messagesActuallySent++;
      }
    });
    const comms = b.communicationHistory || [];
    comms.forEach(c => {
      if ((c.deliveryStatus === "DELIVERED" || c.deliveryStatus === "ACCEPTED") && !c.isSimulated && c.direction === "OUTBOUND") {
        if (!drafts.some(d => d.lastDeliveryResult?.providerMessageId === c.providerMessageId)) {
          messagesActuallySent++;
        }
      }
    });

    // 4. Replies received
    if (comms.some(c => c.direction === "INBOUND")) {
      repliesReceived++;
    }

    // 5. Active opportunities
    if (activePipelineStages.includes(stage) && b.dealOutcome !== "WON" && b.dealOutcome !== "LOST") {
      activeOpportunities++;
      const curr = b.currency || b.dealDetails?.currency || "USD";
      const val = b.proposedDealValue ?? b.agreedDealValue ?? b.estimatedDealValue ?? b.dealDetails?.proposedValue ?? b.dealDetails?.estimatedValue ?? 0;
      pipelineCentsByCurrency[curr] = (pipelineCentsByCurrency[curr] || 0) + toCents(val);
    }

    // 6. Deals won and lost
    if (stage === "WON" || b.dealOutcome === "WON") {
      dealsWon++;
    } else if (stage === "LOST" || b.dealOutcome === "LOST") {
      dealsLost++;
    }
  });

  // 7. Pipeline Value
  const pipelineValueByCurrency: Record<string, number> = {};
  Object.entries(pipelineCentsByCurrency).forEach(([curr, cents]) => {
    pipelineValueByCurrency[curr] = fromCents(cents);
  });
  const pipeParts = Object.entries(pipelineValueByCurrency).map(([curr, val]) => formatCurrency(val, curr));
  const pipelineValueSummary = pipeParts.length > 0 ? pipeParts.join(" + ") : "$0.00";

  // 8. Verified Revenue
  const rev = calculateRevenueMetrics(businesses);

  return {
    totalProspects,
    qualifiedProspects,
    outreachPrepared,
    messagesActuallySent,
    repliesReceived,
    activeOpportunities,
    dealsWon,
    dealsLost,
    pipelineValueByCurrency,
    pipelineValueSummary,
    verifiedRevenueByCurrency: rev.netRevenueByCurrency,
    verifiedRevenueSummary: rev.formattedNetRevenueSummary,
    totalNetRevenueCents: rev.totalNetRevenueCents,
    confirmedPaidDealsCount: rev.confirmedPaidDealsCount
  };
}

/**
 * Creates a complete canonical prospect record from a verified business entity,
 * linking identity, contact profile, website presence, opportunity score, preview link,
 * outreach state, and initial pipeline stage without duplicate record creation.
 */
export function createProspectFromVerifiedBusiness(
  business: Business,
  site?: GeneratedSite,
  initialStage: CanonicalSalesStage = "QUALIFIED"
): Business {
  const now = new Date().toISOString();
  const contactProfile = business.contactProfile || buildProspectContactProfile(business);
  const oppScore = business.opportunityScoreExplanation || calculateExplainableOpportunityScore(
    business.presence,
    business.rating,
    business.reviewsCount,
    business.name,
    business.category,
    business.phone,
    business.evidence
  );

  const previewToken = site?.previewToken || business.previewToken;
  const siteId = site?.id || business.siteId;
  const previewUrl = previewToken 
    ? `https://preview.sitescout.ai/preview/${previewToken}`
    : (siteId ? `https://preview.sitescout.ai/preview/${siteId}` : undefined);

  return {
    ...business,
    contactProfile,
    opportunityScore: oppScore.totalScore,
    opportunityScoreExplanation: oppScore,
    qualificationStatus: business.qualificationStatus || "QUALIFIED",
    siteId,
    previewToken,
    previewUrl,
    salesStage: business.salesStage || initialStage,
    prospectStatus: business.prospectStatus || canonicalToProspectStatus(initialStage),
    dealOutcome: business.dealOutcome || "OPEN",
    outreachDrafts: business.outreachDrafts || [],
    communicationHistory: business.communicationHistory || [],
    followUpTasks: business.followUpTasks || [],
    financialLedger: business.financialLedger || [],
    stageHistory: business.stageHistory || [
      {
        id: `trans_${Date.now()}_init`,
        fromStage: "NEW_PROSPECT" as CanonicalSalesStage,
        toStage: initialStage,
        timestamp: now,
        actor: { uid: "system", displayName: "Verification Ingestion", role: "Admin" },
        reason: "Initial prospect creation from verified business directory record."
      }
    ],
    dealDetails: business.dealDetails || {
      id: `deal_${business.id}`,
      businessId: business.id,
      stage: initialStage,
      currency: business.currency || "USD",
      estimatedValue: business.estimatedDealValue || 0,
      createdAt: now,
      updatedAt: now,
      stageHistory: []
    },
    updatedAt: now
  };
}






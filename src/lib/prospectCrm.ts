import { db } from "./firebase";
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  query, where, orderBy, getDoc 
} from "firebase/firestore";
import { 
  Business, GeneratedSite, CanonicalSalesStage, 
  ProspectActivity, ProspectNote, ProspectFollowUp, 
  OpportunityScoreExplanation, DigitalDeficitAudit, PresenceMetrics, ProspectStatus, SalesStatus 
} from "../types";

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
    id: "NEW",
    label: "New Prospect",
    shortLabel: "New",
    description: "Identified local merchant pending initial gap assessment",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-800",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    order: 0
  },
  {
    id: "ANALYZED",
    label: "Deficit Analyzed",
    shortLabel: "Analyzed",
    description: "13-point digital gap audit and opportunity score calculated",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50/50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/60",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
    order: 1
  },
  {
    id: "PREVIEW_READY",
    label: "Preview Ready",
    shortLabel: "Ready",
    description: "Tailored interactive website draft generated and verified",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50/50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-900/60",
    badgeBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
    order: 2
  },
  {
    id: "PREVIEW_SENT",
    label: "Preview Sent",
    shortLabel: "Sent",
    description: "Shareable presentation link dispatched via WhatsApp/Email",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50/50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/60",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    order: 3
  },
  {
    id: "FOLLOW_UP_1",
    label: "1st Follow-Up",
    shortLabel: "Follow-up 1",
    description: "Initial follow-up reminder sent 2-3 days post-preview",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50/50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-900/60",
    badgeBg: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200",
    order: 4
  },
  {
    id: "FOLLOW_UP_2",
    label: "2nd Follow-Up",
    shortLabel: "Follow-up 2",
    description: "Secondary value-add hook or proof of concept follow-up",
    color: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-50/50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900/60",
    badgeBg: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200",
    order: 5
  },
  {
    id: "INTERESTED",
    label: "Client Interested",
    shortLabel: "Interested",
    description: "Prospect engaged, requested tweaks, or scheduled review call",
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50/50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-900/60",
    badgeBg: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200",
    order: 6
  },
  {
    id: "PROPOSAL_SENT",
    label: "Proposal Sent",
    shortLabel: "Proposal",
    description: "Commercial pricing quote, timeline, and hosting agreement sent",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-900/60",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200",
    order: 7
  },
  {
    id: "WON",
    label: "Closed / Won",
    shortLabel: "Won",
    description: "Client approved, payment confirmed, and website live",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900/60",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
    order: 8
  },
  {
    id: "LOST",
    label: "Archived / Lost",
    shortLabel: "Lost",
    description: "Unresponsive, closed indefinitely, or declined proposal",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50/50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-900/60",
    badgeBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200",
    order: 9
  }
];

// Helper to normalize any legacy or arbitrary stage string into CanonicalSalesStage
export function toCanonicalStage(rawStage?: string): CanonicalSalesStage {
  if (!rawStage) return "NEW";
  const s = rawStage.toUpperCase().replace(/[\s\-_]/g, "");
  
  if (s.includes("WON") || s.includes("CLOSED") || s.includes("APPROVED")) return "WON";
  if (s.includes("LOST") || s.includes("REJECT") || s.includes("ARCHIVE")) return "LOST";
  if (s.includes("PROPOSAL")) return "PROPOSAL_SENT";
  if (s.includes("INTEREST")) return "INTERESTED";
  if (s.includes("FOLLOWUP2") || s.includes("SECOND") || s.includes("2ND")) return "FOLLOW_UP_2";
  if (s.includes("FOLLOWUP1") || s.includes("FOLLOWUP") || s.includes("FIRST") || s.includes("1ST")) return "FOLLOW_UP_1";
  if (s.includes("PREVIEWSENT") || s.includes("SENT") || s.includes("CONTACTED")) return "PREVIEW_SENT";
  if (s.includes("PREVIEWREADY") || s.includes("READY") || s.includes("GENERATED")) return "PREVIEW_READY";
  if (s.includes("ANALYZED") || s.includes("AUDITED") || s.includes("SCORED")) return "ANALYZED";
  if (s.includes("NEW") || s.includes("LEAD") || s.includes("DISCOVERED")) return "NEW";
  
  return "NEW";
}

// Convert CanonicalSalesStage to legacy ProspectStatus format
export function canonicalToProspectStatus(stage: CanonicalSalesStage): ProspectStatus {
  switch (stage) {
    case "NEW": return "New";
    case "ANALYZED": return "Analyzed";
    case "PREVIEW_READY": return "Preview Ready";
    case "PREVIEW_SENT": return "Preview Sent";
    case "FOLLOW_UP_1":
    case "FOLLOW_UP_2":
    case "INTERESTED": return "Interested";
    case "PROPOSAL_SENT": return "Proposal";
    case "WON": return "Won";
    case "LOST": return "Lost";
    default: return "New";
  }
}

// Convert CanonicalSalesStage to legacy SalesStatus format
export function canonicalToSalesStatus(stage: CanonicalSalesStage): SalesStatus {
  switch (stage) {
    case "NEW": return "Lead";
    case "ANALYZED":
    case "PREVIEW_READY": return "Lead";
    case "PREVIEW_SENT":
    case "FOLLOW_UP_1":
    case "FOLLOW_UP_2": return "Contacted";
    case "INTERESTED": return "Negotiation";
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
  rating: number = 4.0,
  reviewsCount: number = 8,
  businessName: string = "Prospect"
): OpportunityScoreExplanation {
  const defs = presence?.deficits || {
    noWebsite: !presence?.hasWebsite,
    outdatedWebsite: false,
    noGooglePresence: presence?.googleProfileQuality === "poor",
    noSocialMedia: presence?.facebookStatus === "none" && presence?.instagramStatus === "none",
    poorBranding: presence?.photosStatus === "missing" || presence?.photosStatus === "outdated",
    noWhatsappCta: true,
    noOnlineCatalogue: !presence?.hasWebsite,
    noBookingSystem: true,
    noEnquiryForm: !presence?.hasEmail,
    noSeo: !presence?.hasWebsite,
    brokenLinks: false,
    poorMobileExperience: !presence?.hasWebsite,
    missingContact: !presence?.hasEmail || presence?.contactCompleteness === "missing"
  };

  // 1. Calculate Digital Deficit Score (0 - 100)
  let deficitPoints = 0;
  const deficitItems = DEFICIT_SCORING_RULES.map(rule => {
    const isDetected = !!defs[rule.key];
    if (isDetected) {
      deficitPoints += rule.penaltyPoints;
    }
    return {
      key: rule.key,
      label: rule.label,
      points: rule.penaltyPoints,
      detected: isDetected,
      reason: isDetected ? rule.description : "Requirement satisfied or verified present"
    };
  });
  const normalizedDeficitScore = Math.min(100, Math.max(20, deficitPoints));

  // 2. Calculate Business Quality Score (0 - 100)
  let qualityPoints = 50; // Baseline operating trust
  const qualityFactors: { key: string; label: string; points: number; value: string | number; reason: string }[] = [];

  // Reputation (0 - 30 pts)
  let repPoints = 4;
  if (rating >= 4.8) repPoints = 30;
  else if (rating >= 4.5) repPoints = 25;
  else if (rating >= 4.0) repPoints = 18;
  else if (rating >= 3.5) repPoints = 10;
  qualityPoints += repPoints;
  qualityFactors.push({
    key: "rating",
    label: "Google / Directory Customer Rating",
    points: repPoints,
    value: `${rating.toFixed(1)} ★`,
    reason: rating >= 4.0 ? "Strong local customer reputation proves commercial viability" : "Average customer rating"
  });

  // Review Volume (0 - 20 pts)
  let reviewPoints = 4;
  if (reviewsCount >= 50) reviewPoints = 20;
  else if (reviewsCount >= 25) reviewPoints = 16;
  else if (reviewsCount >= 10) reviewPoints = 12;
  else if (reviewsCount >= 3) reviewPoints = 8;
  qualityPoints += reviewPoints;
  qualityFactors.push({
    key: "reviewsCount",
    label: "Customer Review Volume",
    points: reviewPoints,
    value: `${reviewsCount} reviews`,
    reason: reviewsCount >= 10 ? "Established customer base actively leaves social proof" : "Emerging customer review profile"
  });

  const normalizedQualityScore = Math.min(100, Math.max(30, qualityPoints));

  // 3. Weighted Opportunity Score (55% Deficit + 45% Quality)
  const deficitWeight = 0.55;
  const qualityWeight = 0.45;
  const totalScore = Math.min(99, Math.max(35, Math.round(
    (normalizedDeficitScore * deficitWeight) + (normalizedQualityScore * qualityWeight)
  )));

  // Generate explainable summary
  const detectedCount = deficitItems.filter(i => i.detected).length;
  let summaryExplanation = "";
  let recommendedPitchStrategy = "";

  if (totalScore >= 80) {
    summaryExplanation = `${businessName} represents an Exceptional High-Opportunity Prospect (${totalScore}%). They have strong verified commercial reputation (${rating.toFixed(1)}★ across ${reviewsCount} reviews) but suffer from ${detectedCount} severe digital deficits including lack of mobile optimization and direct WhatsApp booking.`;
    recommendedPitchStrategy = "Lead with the contrast between their stellar local reputation and the lost mobile search traffic. Present the ready-to-launch website prototype as a free proof-of-concept.";
  } else if (totalScore >= 65) {
    summaryExplanation = `${businessName} is a High-Value Target (${totalScore}%), possessing verified operational status and solid local goodwill, alongside ${detectedCount} addressable digital bottlenecks.`;
    recommendedPitchStrategy = "Focus on immediate revenue friction: show how adding instant WhatsApp inquiries and an online service menu captures calls after operating hours.";
  } else {
    summaryExplanation = `${businessName} has a Moderate Opportunity Score (${totalScore}%), indicating some digital assets exist or baseline reviews are still emerging.`;
    recommendedPitchStrategy = "Offer a targeted modernization pitch emphasizing search engine ranking and conversion rate optimization.";
  }

  return {
    totalScore,
    digitalDeficitScore: normalizedDeficitScore,
    businessQualityScore: normalizedQualityScore,
    deficitWeight,
    qualityWeight,
    formulaDescription: `Opportunity Score = (${normalizedDeficitScore} Deficit Pts × 55%) + (${normalizedQualityScore} Quality Pts × 45%) = ${totalScore}%`,
    deficitItems,
    qualityFactors,
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

  if (db && !businessId.startsWith("demo-")) {
    try {
      await setDoc(doc(db, "businesses", businessId, "activities", actId), payload);
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

  if (db && !businessId.startsWith("demo-")) {
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

  if (db && !businessId.startsWith("demo-")) {
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

  if (db && !businessId.startsWith("demo-")) {
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

  if (db && !businessId.startsWith("demo-")) {
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

  if (db && !businessId.startsWith("demo-")) {
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

import { 
  Business, 
  QualificationStatus, 
  ReviewActionType, 
  ReviewFilterReason, 
  ReviewDecisionRecord, 
  ProspectReviewQueueFilter,
  EvidenceItem,
  QualificationAuditEvent 
} from "../types";
import { 
  evaluateProspectQualification, 
  applyQualificationOverride, 
  revertQualificationOverride 
} from "./prospectQualification";
import { 
  createAuditActor, 
  extractCriteriaSnapshot, 
  recordQualificationAuditEvent 
} from "./prospectQualificationAudit";

/**
 * MICRO-PHASE 11C: PROSPECT REVIEW QUEUE AND QUALIFICATION WORKFLOW ENGINE
 * 
 * Provides centralized queue inspection, evidence review, field verification/correction,
 * and qualification workflow. Enforces RBAC permissions, decision audit trails,
 * and maintains separation between review completion and sales outreach.
 */

export interface ReviewerContext {
  uid: string;
  displayName?: string;
  email?: string;
  role?: string;
}

/**
 * Verifies whether a user has sufficient authorization to review and qualify prospects.
 */
export function isUserAuthorizedForReview(user: ReviewerContext | null | undefined): boolean {
  if (!user || !user.uid) return false;
  const role = (user.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "guest") {
    return false;
  }
  // Authorized roles: Admin, Lead Reviewer, Manager, Sales Agent, or standard authenticated User
  return true;
}

/**
 * Analyzes a prospect's data and returns an array of specific review triggers.
 */
export function getProspectReviewReasons(business: Business): string[] {
  const reasons: string[] = [];

  // 1. Conflicting Directory Information
  if (business.hasConflictingData || (business.conflicts && business.conflicts.length > 0)) {
    reasons.push("Conflicting directory information across sources");
  }

  // 2. Unconfirmed Website Status / HTTP Audit Pending
  const webStatus = business.presence?.websiteStatus || "NONE";
  const needStatus = business.websiteNeedStatus || "UNCONFIRMED_NEED";
  if (
    needStatus === "UNCONFIRMED_NEED" ||
    webStatus === "WEBSITE_NOT_DISCOVERED" ||
    webStatus === "WEBSITE_CANDIDATE" ||
    (!business.presence?.isAudited && Boolean(business.presence?.websiteUrl))
  ) {
    reasons.push("Unconfirmed website status (HTTP audit pending)");
  }

  // 3. Stale Audit Evidence (>90 Days)
  const lastCheck = business.presence?.lastCheckedAt || business.evidence?.checkedAt;
  if (lastCheck) {
    const ageMs = Date.now() - new Date(lastCheck).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 90) {
      reasons.push(`Stale audit evidence (${Math.round(ageDays)} days old)`);
    }
  }

  // 4. Missing Direct Contact Coordinates
  const phone = business.phone ? business.phone.trim().toLowerCase() : "";
  const email = business.email ? business.email.trim().toLowerCase() : "";
  const isUncontactable = (!phone || phone === "unlisted" || phone === "none") && (!email || email === "none");
  if (isUncontactable) {
    reasons.push("Missing direct contact coordinates (unlisted phone & email)");
  }

  // 5. Low Confidence Evidence (<50% or UNCERTAIN match)
  if (business.matchConfidence === "UNCERTAIN") {
    reasons.push("Uncertain directory entity match confidence");
  }
  if (business.qualificationResult?.criteria?.evidenceConfidence?.passed === false) {
    reasons.push("Low evidence confidence (<50%)");
  }

  // 6. Explicit Triggers from Qualification Result
  if (business.qualificationResult?.reviewTriggers) {
    business.qualificationResult.reviewTriggers.forEach(trig => {
      if (!reasons.some(r => r.toLowerCase().includes(trig.toLowerCase().slice(0, 20)))) {
        reasons.push(trig);
      }
    });
  }

  // 7. Explicit Review State Flag
  if (business.reviewState === "NEEDS_REVERIFICATION") {
    reasons.push("Re-verification requested by reviewer");
  }

  return reasons;
}

/**
 * Checks whether a business belongs in the Review Queue.
 */
export function isProspectInReviewQueue(business: Business): boolean {
  // Disqualified prospects without review flags are excluded from active review queue
  if (business.qualificationStatus === "DISQUALIFIED" && (!business.reviewDecisions || business.reviewDecisions.length === 0)) {
    return false;
  }

  // Explicit NEEDS_REVIEW or UNQUALIFIED status
  if (business.qualificationStatus === "NEEDS_REVIEW" || business.qualificationStatus === "UNQUALIFIED") {
    return true;
  }

  // Explicit pending review state
  if (business.reviewState === "PENDING" || business.reviewState === "NEEDS_REVERIFICATION") {
    return true;
  }

  // Has active review reasons
  const reasons = getProspectReviewReasons(business);
  return reasons.length > 0;
}

/**
 * Filters the list of prospects for review queue view.
 */
export function filterProspectReviewQueue(
  businesses: Business[],
  filter: ProspectReviewQueueFilter
): Business[] {
  return businesses.filter(biz => {
    // Basic Search Query match
    if (filter.searchQuery && filter.searchQuery.trim() !== "") {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchName = (biz.name || "").toLowerCase().includes(q);
      const matchCat = (biz.category || "").toLowerCase().includes(q);
      const matchAddr = (biz.address || "").toLowerCase().includes(q);
      const matchPhone = (biz.phone || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchAddr && !matchPhone) {
        return false;
      }
    }

    // Category filter
    if (filter.category && filter.category !== "all") {
      if ((biz.category || "").toLowerCase() !== filter.category.toLowerCase()) {
        return false;
      }
    }

    // Location filter
    if (filter.location && filter.location !== "all") {
      if (!(biz.address || "").toLowerCase().includes(filter.location.toLowerCase())) {
        return false;
      }
    }

    // Qualification Status filter
    if (filter.qualificationStatus && filter.qualificationStatus !== "all") {
      const currentQualStatus = biz.qualificationStatus || biz.qualificationResult?.status || "UNQUALIFIED";
      if (currentQualStatus !== filter.qualificationStatus) {
        return false;
      }
    }

    // Review Status filter (pending vs reviewed vs all)
    if (filter.reviewStatus === "pending") {
      if (biz.reviewState === "REVIEWED") return false;
      if (!isProspectInReviewQueue(biz)) return false;
    } else if (filter.reviewStatus === "reviewed") {
      if (biz.reviewState !== "REVIEWED" && (!biz.reviewDecisions || biz.reviewDecisions.length === 0)) {
        return false;
      }
    }

    // Reason-specific filter
    if (filter.reason && filter.reason !== "all") {
      const reasons = getProspectReviewReasons(biz);
      switch (filter.reason) {
        case "conflicting_data":
          if (!biz.hasConflictingData && (!biz.conflicts || biz.conflicts.length === 0)) {
            return false;
          }
          break;
        case "unconfirmed_website":
          if (
            biz.websiteNeedStatus !== "UNCONFIRMED_NEED" &&
            biz.presence?.websiteStatus !== "WEBSITE_NOT_DISCOVERED" &&
            biz.presence?.isAudited !== false
          ) {
            return false;
          }
          break;
        case "stale_evidence": {
          const lastCheck = biz.presence?.lastCheckedAt || biz.evidence?.checkedAt;
          if (!lastCheck) return false;
          const ageDays = (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays <= 90) return false;
          break;
        }
        case "unlisted_contact": {
          const p = (biz.phone || "").toLowerCase().trim();
          const e = (biz.email || "").toLowerCase().trim();
          if (p && p !== "unlisted" && p !== "none" && e && e !== "none") {
            return false;
          }
          break;
        }
        case "low_confidence":
          if (
            biz.matchConfidence !== "UNCERTAIN" &&
            biz.qualificationResult?.criteria?.evidenceConfidence?.passed !== false
          ) {
            return false;
          }
          break;
        case "out_of_scope":
          if (!["government", "embassy", "military", "ngo"].some(c => (biz.category || "").toLowerCase().includes(c))) {
            return false;
          }
          break;
        default:
          break;
      }
    }

    return true;
  });
}

export interface ReviewActionInput {
  action: ReviewActionType;
  fieldChanged?: "name" | "category" | "address" | "phone" | "email" | "websiteUrl" | string;
  newValue?: any;
  reason: string;
  evidenceCitation?: string;
  user: ReviewerContext;
}

export interface ReviewActionResult {
  success: boolean;
  business: Business;
  reviewRecord?: ReviewDecisionRecord;
  error?: string;
}

/**
 * Executes a verified review action with complete audit trail and authorization controls.
 */
export function executeProspectReviewAction(
  business: Business,
  input: ReviewActionInput
): ReviewActionResult {
  // 1. Authorization Guardrail
  if (!isUserAuthorizedForReview(input.user)) {
    return {
      success: false,
      business,
      error: "Unauthorized user: Insufficient permissions to perform prospect review action."
    };
  }

  // 2. Reason Validation Guardrail
  if (!input.reason || input.reason.trim().length < 5) {
    return {
      success: false,
      business,
      error: "A valid, documented explanation (minimum 5 characters) is required for review decisions."
    };
  }

  const now = new Date().toISOString();
  const reviewerName = input.user.displayName || input.user.email || "Authorized Reviewer";
  const reviewerRole = input.user.role || "Lead Reviewer";

  const prevStatus = business.qualificationStatus || business.qualificationResult?.status || "UNQUALIFIED";
  const prevScore = business.qualificationScore ?? business.qualificationResult?.qualificationScore ?? 0;
  const prevRank = business.prioritizationRank ?? business.qualificationResult?.prioritizationRank ?? 0;

  let updatedBiz: Business = { ...business };
  let oldValue: any = undefined;
  let resultingStatus: QualificationStatus | undefined = undefined;

  switch (input.action) {
    // A. Confirm Existing Field
    case "confirm_field": {
      if (!input.fieldChanged) {
        return { success: false, business, error: "fieldChanged is required for confirm_field action." };
      }
      oldValue = (business as any)[input.fieldChanged];
      
      // If evidence item provided, attach to evidenceList
      if (input.evidenceCitation) {
        const newEvidenceItem: EvidenceItem = {
          id: `ev_conf_${Date.now()}`,
          sourceType: "MANUAL",
          url: input.evidenceCitation.startsWith("http") ? input.evidenceCitation : "https://verified.sitescout.internal",
          title: `Field Verified by ${reviewerName}`,
          supports: [input.fieldChanged],
          associationMethod: "MANUAL",
          retrievedAt: now,
          confidence: 0.95,
          evidenceText: `Verified ${input.fieldChanged}: "${oldValue}". Note: ${input.reason}`
        };
        updatedBiz.evidenceList = [...(updatedBiz.evidenceList || []), newEvidenceItem];
      }

      // If phone was confirmed, clear unlisted flag
      if (input.fieldChanged === "phone" && updatedBiz.missingFields) {
        updatedBiz.missingFields = updatedBiz.missingFields.filter(f => f !== "phone");
      }
      break;
    }

    // B. Correct Business Field
    case "correct_field": {
      if (!input.fieldChanged) {
        return { success: false, business, error: "fieldChanged is required for correct_field action." };
      }
      oldValue = (business as any)[input.fieldChanged];
      (updatedBiz as any)[input.fieldChanged] = input.newValue;

      // Also update presence websiteUrl if website was changed
      if (input.fieldChanged === "websiteUrl") {
        updatedBiz.presence = {
          ...updatedBiz.presence,
          websiteUrl: input.newValue,
          hasWebsite: Boolean(input.newValue && input.newValue.trim() !== ""),
          websiteStatus: input.newValue ? "LIVE" : "CONFIRMED_NO_WEBSITE"
        };
      }

      // Attach evidence citation
      if (input.evidenceCitation) {
        const newEvidenceItem: EvidenceItem = {
          id: `ev_corr_${Date.now()}`,
          sourceType: "MANUAL",
          url: input.evidenceCitation.startsWith("http") ? input.evidenceCitation : "https://verified.sitescout.internal",
          title: `Field Correction by ${reviewerName}`,
          supports: [input.fieldChanged],
          associationMethod: "MANUAL",
          retrievedAt: now,
          confidence: 0.95,
          evidenceText: `Corrected ${input.fieldChanged} from "${oldValue}" to "${input.newValue}". Note: ${input.reason}`
        };
        updatedBiz.evidenceList = [...(updatedBiz.evidenceList || []), newEvidenceItem];
      }

      // Remove from missingFields if populated
      if (input.newValue && updatedBiz.missingFields) {
        updatedBiz.missingFields = updatedBiz.missingFields.filter(f => f !== input.fieldChanged);
      }

      // Re-evaluate qualification with corrected data
      const reQual = evaluateProspectQualification(updatedBiz);
      updatedBiz.qualificationStatus = reQual.status;
      updatedBiz.qualificationScore = reQual.qualificationScore;
      updatedBiz.prioritizationRank = reQual.prioritizationRank;
      updatedBiz.qualificationResult = reQual;
      resultingStatus = reQual.status;
      break;
    }

    // C. Mark Evidence as Stale
    case "mark_evidence_stale": {
      updatedBiz.presence = {
        ...updatedBiz.presence,
        lastCheckedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      };
      const reQual = evaluateProspectQualification(updatedBiz);
      updatedBiz.qualificationStatus = "NEEDS_REVIEW";
      updatedBiz.qualificationScore = reQual.qualificationScore;
      updatedBiz.prioritizationRank = reQual.prioritizationRank;
      updatedBiz.qualificationResult = reQual;
      updatedBiz.reviewState = "NEEDS_REVERIFICATION";
      resultingStatus = "NEEDS_REVIEW";
      break;
    }

    // D. Mark Evidence as Conflicting
    case "mark_evidence_conflicting": {
      updatedBiz.hasConflictingData = true;
      updatedBiz.conflicts = [...(updatedBiz.conflicts || []), input.reason];
      const reQual = evaluateProspectQualification(updatedBiz);
      updatedBiz.qualificationStatus = "NEEDS_REVIEW";
      updatedBiz.qualificationScore = reQual.qualificationScore;
      updatedBiz.prioritizationRank = reQual.prioritizationRank;
      updatedBiz.qualificationResult = reQual;
      updatedBiz.reviewState = "NEEDS_REVERIFICATION";
      resultingStatus = "NEEDS_REVIEW";
      break;
    }

    // E. Mark Evidence as Insufficient
    case "mark_evidence_insufficient": {
      const reQual = evaluateProspectQualification(updatedBiz);
      updatedBiz.qualificationStatus = "UNQUALIFIED";
      updatedBiz.qualificationScore = Math.min(30, reQual.qualificationScore);
      updatedBiz.prioritizationRank = Math.min(25, reQual.prioritizationRank);
      updatedBiz.qualificationResult = {
        ...reQual,
        status: "UNQUALIFIED",
        qualificationReason: `Insufficient evidence: ${input.reason}`
      };
      updatedBiz.reviewState = "REVIEWED";
      resultingStatus = "UNQUALIFIED";
      break;
    }

    // F. Qualify Prospect (Human-in-the-Loop Override)
    case "qualify_prospect": {
      updatedBiz = applyQualificationOverride(
        updatedBiz,
        "QUALIFIED",
        input.reason,
        input.user
      );
      updatedBiz.reviewState = "REVIEWED";
      // Clear pending review triggers that were verified
      updatedBiz.pendingReviewReasons = [];
      resultingStatus = "QUALIFIED";
      break;
    }

    // G. Disqualify Prospect
    case "disqualify_prospect": {
      updatedBiz = applyQualificationOverride(
        updatedBiz,
        "DISQUALIFIED",
        input.reason,
        input.user
      );
      updatedBiz.reviewState = "REVIEWED";
      resultingStatus = "DISQUALIFIED";
      break;
    }

    // H. Request Re-Verification
    case "request_reverification": {
      updatedBiz.reviewState = "NEEDS_REVERIFICATION";
      updatedBiz.verificationState = "CANDIDATE";
      const reQual = evaluateProspectQualification(updatedBiz);
      updatedBiz.qualificationStatus = "NEEDS_REVIEW";
      updatedBiz.qualificationResult = reQual;
      resultingStatus = "NEEDS_REVIEW";
      break;
    }

    // I. Revert Override
    case "revert_qualification": {
      updatedBiz = revertQualificationOverride(
        updatedBiz,
        input.reason,
        input.user
      );
      resultingStatus = updatedBiz.qualificationStatus;
      break;
    }

    default:
      return { success: false, business, error: `Unknown review action: ${input.action}` };
  }

  // Build Review Decision Record
  const decisionRecord: ReviewDecisionRecord = {
    id: `rev_dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    action: input.action,
    fieldChanged: input.fieldChanged,
    oldValue,
    newValue: input.newValue,
    reason: input.reason.trim(),
    evidenceCitation: input.evidenceCitation,
    reviewerId: input.user.uid,
    reviewerName,
    reviewerRole,
    timestamp: now,
    resultingStatus
  };

  // Micro-Phase 11D: Qualification Audit Trail Integration
  const currentStatus = updatedBiz.qualificationStatus || resultingStatus || prevStatus;
  const currentScore = updatedBiz.qualificationScore ?? prevScore;
  const currentRank = updatedBiz.prioritizationRank ?? prevRank;

  if (input.action === "qualify_prospect" && updatedBiz.qualificationAuditTrail?.length) {
    updatedBiz.qualificationAuditTrail[0].decisionType = "REVIEW_APPROVAL";
  } else if (input.action === "disqualify_prospect" && updatedBiz.qualificationAuditTrail?.length) {
    updatedBiz.qualificationAuditTrail[0].decisionType = "REVIEW_DISQUALIFICATION";
  } else if (input.action !== "revert_qualification") {
    // Record EVIDENCE_CHANGE or CRITERIA_SCORE_CHANGE
    const auditActor = createAuditActor(input.user, false);
    const decisionType = (input.action === "correct_field" && currentScore !== prevScore)
      ? "CRITERIA_SCORE_CHANGE"
      : "EVIDENCE_CHANGE";

    const qualAuditEvent: QualificationAuditEvent = {
      id: `qaud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId: business.id,
      decisionType,
      actor: auditActor,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: currentStatus,
      previousScore: prevScore,
      newScore: currentScore,
      previousPrioritizationRank: prevRank,
      newPrioritizationRank: currentRank,
      reason: input.reason.trim(),
      criteriaSnapshot: extractCriteriaSnapshot(updatedBiz.qualificationResult?.criteria),
      evidenceReferences: [
        input.evidenceCitation,
        ...(updatedBiz.evidenceList?.map(e => e.evidenceText || e.title || e.url).filter(Boolean) as string[] || [])
      ].filter(Boolean) as string[],
      isAutomated: false,
      metadata: {
        reviewAction: input.action,
        fieldChanged: input.fieldChanged,
        oldValue,
        newValue: input.newValue
      }
    };

    updatedBiz.qualificationAuditTrail = [qualAuditEvent, ...(updatedBiz.qualificationAuditTrail || [])];

    recordQualificationAuditEvent(business.id, {
      decisionType,
      actor: auditActor,
      previousStatus: prevStatus,
      newStatus: currentStatus,
      previousScore: prevScore,
      newScore: currentScore,
      previousPrioritizationRank: prevRank,
      newPrioritizationRank: currentRank,
      reason: input.reason.trim(),
      criteriaSnapshot: qualAuditEvent.criteriaSnapshot,
      evidenceReferences: qualAuditEvent.evidenceReferences,
      isAutomated: false,
      metadata: qualAuditEvent.metadata
    }).catch(() => {});
  }

  updatedBiz.reviewDecisions = [...(updatedBiz.reviewDecisions || []), decisionRecord];
  updatedBiz.updatedAt = now;

  return {
    success: true,
    business: updatedBiz,
    reviewRecord: decisionRecord
  };
}

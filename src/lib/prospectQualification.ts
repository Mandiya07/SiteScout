import { 
  Business, 
  QualificationStatus, 
  ProspectQualificationResult, 
  QualificationOverrideRecord,
  OpportunityScoreExplanation,
  QualificationAuditEvent,
  QualificationDecisionType
} from "../types";
import { calculateExplainableOpportunityScore } from "./prospectCrm";
import { 
  createAuditActor, 
  extractCriteriaSnapshot, 
  recordQualificationAuditEvent 
} from "./prospectQualificationAudit";

/**
 * MICRO-PHASE 11B: PROSPECT QUALIFICATION AND EVIDENCE-BASED PRIORITIZATION ENGINE
 * 
 * Standardizes prospect qualification based on verifiable evidence, documented website needs,
 * contactability, and service fit. Strictly prevents assumptions about buyer interest,
 * prohibits missing data from inflating scores, and maintains transparent audit records for manual overrides.
 */

export interface QualificationEvaluationOptions {
  activeOverride?: QualificationOverrideRecord;
  overrideHistory?: QualificationOverrideRecord[];
}

/**
 * Evaluates a business against the 5 standardized qualification criteria:
 * 1. Identity & Relevance (Valid business entity, non-generic name, geographic match)
 * 2. Opportunity Evidence (Documented website need or confirmed missing web presence)
 * 3. Evidence Quality & Freshness (Audit verified, high/medium confidence, not stale)
 * 4. Contactability (Legitimate phone or email coordinate available for outreach)
 * 5. Service Fit (Identified deficits align with SiteScout AI web modernization capabilities)
 */
export function evaluateProspectQualification(
  business: Business,
  opportunityExplanation?: OpportunityScoreExplanation,
  options?: QualificationEvaluationOptions
): ProspectQualificationResult {
  const opp = opportunityExplanation || calculateExplainableOpportunityScore(
    business.presence,
    business.rating,
    business.reviewsCount,
    business.name,
    business.category,
    business.phone,
    business.evidence
  );

  const disqualificationReasons: string[] = [];
  const reviewTriggers: string[] = [];

  // 1. Identity & Relevance Evaluation
  const hasValidName = !!business.name && business.name.trim().length >= 2 && !business.name.toLowerCase().includes("sample business");
  const hasValidCategory = !business.category || business.category.trim().length >= 2;
  const isExcludedCategory = ["government", "embassy", "military", "ngo_international"].some(cat => 
    (business.category || "").toLowerCase().includes(cat)
  );

  let identityRelevancePassed = hasValidName && hasValidCategory && !isExcludedCategory;
  let identityScoreContribution = identityRelevancePassed ? 20 : 0;
  let identityExplanation = identityRelevancePassed
    ? `Verified local business identity: ${business.name} in category ${business.category}.`
    : `Identity incomplete or out of service scope: name="${business.name}", category="${business.category}".`;

  if (isExcludedCategory) {
    disqualificationReasons.push(`Category '${business.category}' is outside commercial web design service scope.`);
  }

  // 2. Opportunity Evidence Evaluation
  const needStatus = opp.websiteNeedStatus || "UNCONFIRMED_NEED";
  let opportunityEvidencePassed = false;
  let oppScoreContribution = 0;
  let oppExplanation = "";

  if (needStatus === "NO_NEW_WEBSITE_NEEDED") {
    opportunityEvidencePassed = false;
    oppScoreContribution = 0;
    oppExplanation = "Business operates an active, modern, secure website with no documented major deficits.";
    disqualificationReasons.push("Business already has an active, high-performing website with adequate mobile and SSL features.");
  } else if (needStatus === "NEEDS_NEW_WEBSITE") {
    opportunityEvidencePassed = true;
    oppScoreContribution = 25;
    oppExplanation = `Confirmed need for new website: ${opp.verifiedIssues.join("; ") || "No active website indexed."}`;
  } else if (needStatus === "NEEDS_MODERNIZATION") {
    opportunityEvidencePassed = true;
    oppScoreContribution = 25;
    oppExplanation = `Documented modernization deficits: ${opp.verifiedIssues.concat(opp.estimatedIssues).join("; ") || "Outdated web features."}`;
  } else {
    // UNCONFIRMED_NEED
    opportunityEvidencePassed = false;
    oppScoreContribution = 10;
    oppExplanation = "Website existence and technical needs remain unconfirmed. HTTP audit pending.";
    reviewTriggers.push("Unconfirmed website presence requires active HTTP verification before qualification.");
  }

  // 3. Evidence Quality, Freshness & Confidence
  const evidenceFreshness = opp.evidenceFreshness || "MISSING";
  const confidenceLevel = opp.evidenceConfidenceLevel || "LOW";
  let evidenceQualityPassed = false;
  let evidenceScoreContribution = 0;
  let evidenceExplanation = "";

  if (evidenceFreshness === "STALE") {
    evidenceQualityPassed = false;
    evidenceScoreContribution = 5;
    evidenceExplanation = "Evidence data is older than 90 days. Fresh directory verification or HTTP re-audit required.";
    reviewTriggers.push("Audit evidence is stale (> 90 days old). Re-verification needed.");
  } else if (confidenceLevel === "HIGH" && opp.isVerifiedFinding) {
    evidenceQualityPassed = true;
    evidenceScoreContribution = 20;
    evidenceExplanation = "High-confidence, verified evidence backed by technical audit.";
  } else if (confidenceLevel === "MEDIUM") {
    evidenceQualityPassed = true;
    evidenceScoreContribution = 12;
    evidenceExplanation = "Medium-confidence evidence from directory listings; technical details pending confirmation.";
  } else {
    evidenceQualityPassed = false;
    evidenceScoreContribution = 5;
    evidenceExplanation = "Low confidence or missing evidence; requires human review or live audit.";
    reviewTriggers.push("Low evidence confidence; additional verification required.");
  }

  // 4. Contactability Evaluation (Mandatory for Outreach)
  const phone = (business.phone || "").trim();
  const hasPhone = phone !== "" && phone.toLowerCase() !== "unlisted" && phone.toLowerCase() !== "none";
  const hasEmail = !!business.presence?.hasEmail;
  const hasContact = hasPhone || hasEmail;

  let contactabilityPassed = hasContact;
  let contactScoreContribution = contactabilityPassed ? (hasPhone && hasEmail ? 20 : 15) : 0;
  let contactExplanation = contactabilityPassed
    ? `Direct contact coordinates available (${hasPhone ? `Phone: ${phone}` : ""}${hasPhone && hasEmail ? ", " : ""}${hasEmail ? "Email verified" : ""}).`
    : "No verified direct phone or email available in public listings.";

  if (!hasContact) {
    disqualificationReasons.push("Missing direct contact coordinates (unlisted telephone and no public email).");
  }

  // 5. Service Fit Evaluation
  // Evaluates whether identified deficits match SiteScout AI's services:
  // Mobile redesign, SSL security, WhatsApp CTA, catalog showcase, lead forms, SEO tags.
  const hasServiceDeficit = opp.deficitItems.some(item => item.detected) || needStatus === "NEEDS_NEW_WEBSITE" || needStatus === "NEEDS_MODERNIZATION";
  let serviceFitPassed = hasServiceDeficit && !isExcludedCategory;
  let serviceFitScoreContribution = serviceFitPassed ? 15 : 0;
  let serviceFitExplanation = serviceFitPassed
    ? "Identified digital deficits align with SiteScout AI website modernization services."
    : "No clear match between prospect situation and automated website creation services.";

  // Conflict Detection Check
  if (business.hasConflictingData && business.conflicts && business.conflicts.length > 0) {
    reviewTriggers.push(`Conflicting data detected: ${business.conflicts.join("; ")}`);
  }

  // Calculate Base Qualification Score (0 - 100)
  const rawQualScore = Math.min(100, Math.max(0, 
    identityScoreContribution + 
    oppScoreContribution + 
    evidenceScoreContribution + 
    contactScoreContribution + 
    serviceFitScoreContribution
  ));

  // Determine Automated Status
  let autoStatus: QualificationStatus = "UNQUALIFIED";

  if (disqualificationReasons.length > 0) {
    autoStatus = "DISQUALIFIED";
  } else if (reviewTriggers.length > 0 || needStatus === "UNCONFIRMED_NEED" || confidenceLevel === "LOW" || evidenceFreshness === "STALE") {
    autoStatus = "NEEDS_REVIEW";
  } else if (identityRelevancePassed && opportunityEvidencePassed && evidenceQualityPassed && contactabilityPassed && serviceFitPassed) {
    autoStatus = "QUALIFIED";
  } else {
    autoStatus = "UNQUALIFIED";
  }

  // Check for Manual Overrides (Preserves User Control)
  const activeOverride = options && "activeOverride" in options
    ? options.activeOverride
    : business.qualificationResult?.activeOverride;
  const overrideHistory = options && "overrideHistory" in options
    ? (options.overrideHistory || [])
    : (business.qualificationResult?.overrideHistory || business.qualificationOverrides || []);
  
  const finalStatus: QualificationStatus = activeOverride ? activeOverride.newStatus : autoStatus;
  const isManualOverride = !!activeOverride;

  // Evidence-Based Prioritization Rank Calculation (1 to 100)
  // Strict rule: Missing data NEVER inflates priority. Opportunity score is separate from qualification status.
  let statusMultiplier = 0;
  switch (finalStatus) {
    case "QUALIFIED": statusMultiplier = 1.0; break;
    case "NEEDS_REVIEW": statusMultiplier = 0.55; break;
    case "UNQUALIFIED": statusMultiplier = 0.25; break;
    case "DISQUALIFIED": statusMultiplier = 0.0; break;
  }

  // Prioritization rank merges qualification score, opportunity score, and status gate
  let prioritizationRank = 0;
  if (finalStatus !== "DISQUALIFIED") {
    const oppWeight = 0.40;
    const qualWeight = 0.60;
    const blendedScore = (opp.totalScore * oppWeight) + (rawQualScore * qualWeight);
    prioritizationRank = Math.round(blendedScore * statusMultiplier);
    // Boundary check
    prioritizationRank = Math.min(99, Math.max(1, prioritizationRank));
  }

  // Explanation generator
  let qualificationReason = "";
  if (isManualOverride) {
    qualificationReason = `Manual Override to ${finalStatus} by ${activeOverride.userName}: "${activeOverride.reason}". (Automated status was ${activeOverride.originalAutoStatus}).`;
  } else if (finalStatus === "QUALIFIED") {
    qualificationReason = `Qualified for outreach. Verified website opportunity (${needStatus}) with active contact coordinates and ${confidenceLevel} evidence confidence.`;
  } else if (finalStatus === "DISQUALIFIED") {
    qualificationReason = `Disqualified based on criteria: ${disqualificationReasons.join(" ")}`;
  } else if (finalStatus === "NEEDS_REVIEW") {
    qualificationReason = `Requires human or HTTP review: ${reviewTriggers.join(" ") || "Incomplete evidence requires verification."}`;
  } else {
    qualificationReason = "Unqualified: Insufficient verified evidence or data points to assess prospect viability.";
  }

  const prioritizationExplanation = finalStatus === "DISQUALIFIED"
    ? "Rank: 0. Prospect is disqualified based on documented criteria; excluded from active outreach queues."
    : `Priority Rank ${prioritizationRank}/100 based on ${finalStatus} status (${Math.round(statusMultiplier * 100)}% multiplier), ${opp.totalScore}% opportunity score, and ${rawQualScore}% qualification score.`;

  return {
    status: finalStatus,
    qualificationScore: rawQualScore,
    isManualOverride,
    overrideHistory,
    activeOverride,
    criteria: {
      identityRelevance: {
        code: "ID_RELEVANCE",
        label: "Business Identity & Relevance",
        passed: identityRelevancePassed,
        scoreContribution: identityScoreContribution,
        explanation: identityExplanation,
        isMandatory: true
      },
      opportunityEvidence: {
        code: "OPP_EVIDENCE",
        label: "Documented Website Opportunity",
        passed: opportunityEvidencePassed,
        scoreContribution: oppScoreContribution,
        explanation: oppExplanation,
        isMandatory: true
      },
      evidenceConfidence: {
        code: "EVID_CONFIDENCE",
        label: "Evidence Freshness & Confidence",
        passed: evidenceQualityPassed,
        scoreContribution: evidenceScoreContribution,
        explanation: evidenceExplanation,
        isMandatory: false
      },
      contactability: {
        code: "CONTACTABILITY",
        label: "Direct Contact Coordinates",
        passed: contactabilityPassed,
        scoreContribution: contactScoreContribution,
        explanation: contactExplanation,
        isMandatory: true
      },
      serviceFit: {
        code: "SERVICE_FIT",
        label: "Service Deficit Alignment",
        passed: serviceFitPassed,
        scoreContribution: serviceFitScoreContribution,
        explanation: serviceFitExplanation,
        isMandatory: false
      }
    },
    qualificationReason,
    disqualificationReasons: disqualificationReasons.length > 0 ? disqualificationReasons : undefined,
    reviewTriggers: reviewTriggers.length > 0 ? reviewTriggers : undefined,
    prioritizationRank,
    prioritizationExplanation,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Applies a user-controlled manual qualification override.
 * Preserves the original automated status, audit trail, author, and timestamp.
 */
export function applyQualificationOverride(
  business: Business,
  newStatus: QualificationStatus,
  reason: string,
  user: { uid: string; displayName?: string; email?: string; role?: string }
): Business {
  const currentResult = business.qualificationResult || evaluateProspectQualification(business);
  const originalAutoStatus = currentResult.activeOverride?.originalAutoStatus || currentResult.status;
  const previousStatus = currentResult.status;
  const previousScore = currentResult.qualificationScore;
  const previousRank = currentResult.prioritizationRank;
  const now = new Date().toISOString();

  const overrideRecord: QualificationOverrideRecord = {
    id: `qov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    previousStatus,
    newStatus,
    reason: reason.trim() || "Manual status adjustment by sales agent",
    userId: user.uid,
    userName: user.displayName || user.email || "Authorized User",
    timestamp: now,
    originalAutoStatus
  };

  const updatedHistory = [...(business.qualificationOverrides || []), overrideRecord];

  // Re-evaluate qualification with the new active override
  const updatedResult = evaluateProspectQualification(business, undefined, {
    activeOverride: overrideRecord,
    overrideHistory: updatedHistory
  });

  // Micro-Phase 11D: Create immutable qualification audit event
  const actor = createAuditActor(user, false);
  const auditEvent: QualificationAuditEvent = {
    id: `qaud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    decisionType: "MANUAL_OVERRIDE",
    actor,
    timestamp: now,
    previousStatus,
    newStatus,
    previousScore,
    newScore: updatedResult.qualificationScore,
    previousPrioritizationRank: previousRank,
    newPrioritizationRank: updatedResult.prioritizationRank,
    reason: overrideRecord.reason,
    criteriaSnapshot: extractCriteriaSnapshot(updatedResult.criteria),
    evidenceReferences: business.evidenceList?.map(e => e.evidenceText || e.title || e.url).filter(Boolean) as string[],
    isAutomated: false
  };

  const updatedAuditTrail = [auditEvent, ...(business.qualificationAuditTrail || [])];

  // Persist into background cache/Firestore
  recordQualificationAuditEvent(business.id, {
    decisionType: "MANUAL_OVERRIDE",
    actor,
    previousStatus,
    newStatus,
    previousScore,
    newScore: updatedResult.qualificationScore,
    previousPrioritizationRank: previousRank,
    newPrioritizationRank: updatedResult.prioritizationRank,
    reason: overrideRecord.reason,
    criteriaSnapshot: auditEvent.criteriaSnapshot,
    evidenceReferences: auditEvent.evidenceReferences,
    isAutomated: false
  }).catch(() => {});

  return {
    ...business,
    qualificationStatus: newStatus,
    qualificationScore: updatedResult.qualificationScore,
    prioritizationRank: updatedResult.prioritizationRank,
    qualificationResult: updatedResult,
    qualificationOverrides: updatedHistory,
    qualificationAuditTrail: updatedAuditTrail,
    updatedAt: now
  };
}

/**
 * Clears an existing manual qualification override, reverting the prospect to its
 * automated evidence-derived qualification status.
 */
export function revertQualificationOverride(
  business: Business,
  revertReason: string,
  user: { uid: string; displayName?: string; email?: string; role?: string }
): Business {
  const currentResult = business.qualificationResult;
  if (!currentResult?.activeOverride) {
    return business; // No active override to revert
  }

  const previousStatus = currentResult.status;
  const previousScore = currentResult.qualificationScore;
  const previousRank = currentResult.prioritizationRank;
  const now = new Date().toISOString();

  const revertRecord: QualificationOverrideRecord = {
    id: `qov_revert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    previousStatus,
    newStatus: currentResult.activeOverride.originalAutoStatus,
    reason: `Reverted override: ${revertReason.trim() || "Restored automated evidence calculation"}`,
    userId: user.uid,
    userName: user.displayName || user.email || "Authorized User",
    timestamp: now,
    originalAutoStatus: currentResult.activeOverride.originalAutoStatus
  };

  const updatedHistory = [...(business.qualificationOverrides || []), revertRecord];

  // Re-evaluate without activeOverride to restore pure evidence-backed status
  const restoredResult = evaluateProspectQualification(business, undefined, {
    activeOverride: undefined,
    overrideHistory: updatedHistory
  });

  // Micro-Phase 11D: Create immutable qualification audit event for reversal
  const actor = createAuditActor(user, false);
  const auditEvent: QualificationAuditEvent = {
    id: `qaud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    decisionType: "OVERRIDE_REVERSAL",
    actor,
    timestamp: now,
    previousStatus,
    newStatus: restoredResult.status,
    previousScore,
    newScore: restoredResult.qualificationScore,
    previousPrioritizationRank: previousRank,
    newPrioritizationRank: restoredResult.prioritizationRank,
    reason: revertRecord.reason,
    criteriaSnapshot: extractCriteriaSnapshot(restoredResult.criteria),
    evidenceReferences: business.evidenceList?.map(e => e.evidenceText || e.title || e.url).filter(Boolean) as string[],
    isAutomated: false
  };

  const updatedAuditTrail = [auditEvent, ...(business.qualificationAuditTrail || [])];

  // Persist into background cache/Firestore
  recordQualificationAuditEvent(business.id, {
    decisionType: "OVERRIDE_REVERSAL",
    actor,
    previousStatus,
    newStatus: restoredResult.status,
    previousScore,
    newScore: restoredResult.qualificationScore,
    previousPrioritizationRank: previousRank,
    newPrioritizationRank: restoredResult.prioritizationRank,
    reason: revertRecord.reason,
    criteriaSnapshot: auditEvent.criteriaSnapshot,
    evidenceReferences: auditEvent.evidenceReferences,
    isAutomated: false
  }).catch(() => {});

  return {
    ...business,
    qualificationStatus: restoredResult.status,
    qualificationScore: restoredResult.qualificationScore,
    prioritizationRank: restoredResult.prioritizationRank,
    qualificationResult: restoredResult,
    qualificationOverrides: updatedHistory,
    qualificationAuditTrail: updatedAuditTrail,
    updatedAt: now
  };
}

/**
 * Evaluates prospect qualification and automatically records an audit event
 * if status, score, or criteria changed.
 */
export function evaluateAndRecordQualification(
  business: Business,
  actor?: { uid?: string; displayName?: string; email?: string; role?: string },
  reason?: string
): { business: Business; auditEvent?: QualificationAuditEvent } {
  const previousStatus = business.qualificationStatus || business.qualificationResult?.status || "UNQUALIFIED";
  const previousScore = business.qualificationScore ?? business.qualificationResult?.qualificationScore ?? 0;
  const previousRank = business.prioritizationRank ?? business.qualificationResult?.prioritizationRank ?? 0;

  const result = evaluateProspectQualification(business);
  const isFirstEvaluation = !business.qualificationResult && (!business.qualificationAuditTrail || business.qualificationAuditTrail.length === 0);
  const statusChanged = result.status !== previousStatus;
  const scoreChanged = result.qualificationScore !== previousScore;
  const rankChanged = result.prioritizationRank !== previousRank;

  let auditEvent: QualificationAuditEvent | undefined = undefined;
  let updatedAuditTrail = business.qualificationAuditTrail ? [...business.qualificationAuditTrail] : [];

  if (isFirstEvaluation || statusChanged || scoreChanged || rankChanged) {
    const isAuto = !actor || actor.role === "SYSTEM" || actor.uid === "system_evaluator";
    const auditActor = createAuditActor(actor as any, isAuto);
    const decisionType: QualificationDecisionType = isFirstEvaluation 
      ? "INITIAL_EVALUATION" 
      : statusChanged 
        ? "AUTOMATED_REEVALUATION" 
        : "CRITERIA_SCORE_CHANGE";

    const defaultReason = isFirstEvaluation
      ? `Initial qualification assessment: ${result.qualificationReason}`
      : `Automated re-evaluation: status=${result.status}, score=${result.qualificationScore}, priority=${result.prioritizationRank}`;

    auditEvent = {
      id: `qaud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId: business.id,
      decisionType,
      actor: auditActor,
      timestamp: new Date().toISOString(),
      previousStatus: isFirstEvaluation ? "UNQUALIFIED" : previousStatus,
      newStatus: result.status,
      previousScore: isFirstEvaluation ? 0 : previousScore,
      newScore: result.qualificationScore,
      previousPrioritizationRank: isFirstEvaluation ? 0 : previousRank,
      newPrioritizationRank: result.prioritizationRank,
      reason: reason || defaultReason,
      criteriaSnapshot: extractCriteriaSnapshot(result.criteria),
      evidenceReferences: business.evidenceList?.map(e => e.evidenceText || e.title || e.url).filter(Boolean) as string[],
      isAutomated: isAuto
    };

    updatedAuditTrail = [auditEvent, ...updatedAuditTrail.filter(e => e.id !== auditEvent?.id)];

    recordQualificationAuditEvent(business.id, {
      decisionType,
      actor: auditActor,
      previousStatus: auditEvent.previousStatus,
      newStatus: auditEvent.newStatus,
      previousScore: auditEvent.previousScore,
      newScore: auditEvent.newScore,
      previousPrioritizationRank: auditEvent.previousPrioritizationRank,
      newPrioritizationRank: auditEvent.newPrioritizationRank,
      reason: auditEvent.reason,
      criteriaSnapshot: auditEvent.criteriaSnapshot,
      evidenceReferences: auditEvent.evidenceReferences,
      isAutomated: isAuto
    }).catch(() => {});
  }

  const updatedBiz: Business = {
    ...business,
    qualificationStatus: result.status,
    qualificationScore: result.qualificationScore,
    prioritizationRank: result.prioritizationRank,
    qualificationResult: result,
    qualificationAuditTrail: updatedAuditTrail,
    updatedAt: new Date().toISOString()
  };

  return { business: updatedBiz, auditEvent };
}

/**
 * Compares two prospects for prioritization sorting.
 * 1. Higher Prioritization Rank first.
 * 2. If ranks are tied, higher Opportunity Score first.
 * 3. If opportunity scores are tied, higher Customer Review Rating first.
 */
export function compareProspectPrioritization(a: Business, b: Business): number {
  const rankA = a.prioritizationRank ?? a.qualificationResult?.prioritizationRank ?? 0;
  const rankB = b.prioritizationRank ?? b.qualificationResult?.prioritizationRank ?? 0;

  if (rankB !== rankA) {
    return rankB - rankA;
  }

  const oppA = a.opportunityScore ?? 0;
  const oppB = b.opportunityScore ?? 0;

  if (oppB !== oppA) {
    return oppB - oppA;
  }

  const ratingA = a.rating ?? 0;
  const ratingB = b.rating ?? 0;
  return ratingB - ratingA;
}

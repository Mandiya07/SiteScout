import {
  Business,
  CanonicalSalesStage,
  DealDetails,
  StageTransitionRecord,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { handleSequenceReplyOrOptOut } from "./prospectFollowUpSequences";
import { initiateCustomerOnboarding } from "./customerOnboarding";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 13C: SALES PIPELINE STAGE MANAGEMENT & DEAL PROGRESS TRACKING
 * 
 * Establishes a reliable sales pipeline and deal tracking system:
 * - Configurable canonical stages (NEW_PROSPECT -> QUALIFIED -> CONTACTED -> ENGAGED -> DISCOVERY -> PROPOSAL_SENT -> NEGOTIATION -> WON / LOST)
 * - Strict stage transition validations preventing premature or unauthorized deal closures
 * - Preview approval separation (preview approval NEVER automatically marks deal WON)
 * - Explicit commercial terms tracking (distinguishing estimated vs. agreed value and currency)
 * - Immutable transition audit history and sequence integration
 */

export interface CanonicalStageDefinition {
  id: CanonicalSalesStage;
  label: string;
  description: string;
  order: number;
  color: string;
  badgeBg: string;
  isTerminal?: boolean;
}

export const CANONICAL_PIPELINE_STAGES: CanonicalStageDefinition[] = [
  {
    id: "NEW_PROSPECT",
    label: "New Prospect",
    description: "Identified local business candidate prior to qualification review.",
    order: 0,
    color: "text-slate-700 dark:text-slate-300",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
  },
  {
    id: "QUALIFIED",
    label: "Qualified",
    description: "Passed digital presence deficit scan and commercial fit criteria.",
    order: 1,
    color: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200"
  },
  {
    id: "CONTACTED",
    label: "Contacted",
    description: "Initial outreach initiated or personalized prototype link dispatched.",
    order: 2,
    color: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200"
  },
  {
    id: "ENGAGED",
    label: "Engaged",
    description: "Prospect accessed prototype preview, viewed demo, or replied to message.",
    order: 3,
    color: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200"
  },
  {
    id: "DISCOVERY",
    label: "Discovery & Follow-Up",
    description: "Active consultation, website requirements discovery, and demo meetings.",
    order: 4,
    color: "text-purple-700 dark:text-purple-300",
    badgeBg: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200"
  },
  {
    id: "PROPOSAL_SENT",
    label: "Proposal Sent",
    description: "Formal digital solution package, price quote, and scope of work delivered.",
    order: 5,
    color: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200"
  },
  {
    id: "NEGOTIATION",
    label: "Negotiation",
    description: "Reviewing commercial terms, customized package options, and payment plans.",
    order: 6,
    color: "text-orange-700 dark:text-orange-300",
    badgeBg: "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200"
  },
  {
    id: "WON",
    label: "Closed Won",
    description: "Commercial terms accepted and contract/payment commitments confirmed.",
    order: 7,
    color: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200",
    isTerminal: true
  },
  {
    id: "LOST",
    label: "Closed Lost",
    description: "Prospect declined, opted out, or deal was abandoned with documented reason.",
    order: 8,
    color: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200",
    isTerminal: true
  }
];

export const PIPELINE_STAGE_ORDER: Record<CanonicalSalesStage, number> = {
  DISCOVERED: 0,
  NEW_PROSPECT: 0,
  VERIFICATION_REQUIRED: 1,
  VERIFIED: 1,
  AUDIT_COMPLETE: 1,
  OPPORTUNITY_IDENTIFIED: 1,
  QUALIFIED: 1,
  WEBSITE_GENERATED: 2,
  PREVIEW_READY: 2,
  PREVIEW_SENT: 2,
  CONTACTED: 2,
  ENGAGED: 3,
  DISCOVERY: 4,
  FOLLOW_UP: 4,
  PROPOSAL_SENT: 5,
  NEGOTIATION: 6,
  WON: 7,
  LOST: 8
};

/**
 * Normalizes any legacy or arbitrary stage string into a CanonicalSalesStage.
 */
export function normalizePipelineStage(rawStage?: string): CanonicalSalesStage {
  if (!rawStage) return "NEW_PROSPECT";
  const s = rawStage.toUpperCase().replace(/[\s\-_]/g, "");

  if (s === "WON" || s.includes("DEALWON") || s.includes("CLOSEDWON") || s.includes("SALEWON")) return "WON";
  if (s.includes("LOST") || s.includes("REJECT") || s.includes("DECLINED") || s.includes("ARCHIVE")) return "LOST";
  if (s.includes("NEGOTIAT")) return "NEGOTIATION";
  if (s.includes("PROPOSAL")) return "PROPOSAL_SENT";
  if (s.includes("DISCOVERY") || s.includes("REQUIREMENT")) return "DISCOVERY";
  if (s.includes("FOLLOWUP") || s.includes("FOLLOW") || s.includes("REMIND")) return "FOLLOW_UP";
  if (s.includes("ENGAGED") || s.includes("INTEREST") || s.includes("FEEDBACK") || s.includes("VIEWED")) return "ENGAGED";
  if (s.includes("CONTACTED")) return "CONTACTED";
  if (s.includes("PREVIEWSENT") || s.includes("SENT") || s.includes("DISPATCHED")) return "PREVIEW_SENT";
  if (s.includes("PREVIEWREADY") || s.includes("DRAFTREADY")) return "PREVIEW_READY";
  if (s.includes("WEBSITEGENERATED") || s.includes("SITEGENERATED") || s.includes("GENERATED")) return "WEBSITE_GENERATED";
  if (s.includes("QUALIFIED") || s.includes("QUAL")) return "QUALIFIED";
  if (s.includes("OPPORTUNITY") || s.includes("ANALYZED") || s.includes("SCORED")) return "OPPORTUNITY_IDENTIFIED";
  if (s.includes("AUDIT") || s.includes("CHECKED")) return "AUDIT_COMPLETE";
  if (s === "VERIFIED" || s.includes("CONFIRMED")) return "VERIFIED";
  if (s.includes("VERIFICATION") || s.includes("UNVERIFIED")) return "VERIFICATION_REQUIRED";
  if (s.includes("NEWPROSPECT") || s.includes("DISCOVERED") || s.includes("NEW") || s.includes("LEAD")) return "NEW_PROSPECT";

  return "NEW_PROSPECT";
}

/**
 * Validates a proposed pipeline stage transition.
 * Enforces business rules, role permissions, and requires evidence for WON and LOST transitions.
 */
export function validatePipelineStageTransition(
  business: Business,
  targetStage: CanonicalSalesStage,
  actor: TaskAssignee,
  options?: {
    reason?: string;
    commercialTermsConfirmed?: boolean;
    agreedValue?: number;
    contractSigned?: boolean;
    lossReason?: string;
    isExplicitOverride?: boolean;
  }
): {
  valid: boolean;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Authorization check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    blockers.push(`User role "${actor.role}" is unauthorized to change sales pipeline stages.`);
    return { valid: false, blockers, warnings };
  }

  const currentStage = normalizePipelineStage(business.salesStage || business.prospectStatus);

  if (currentStage === targetStage) {
    return { valid: true, blockers, warnings };
  }

  const currentOrder = PIPELINE_STAGE_ORDER[currentStage] ?? 0;
  const targetOrder = PIPELINE_STAGE_ORDER[targetStage] ?? 0;

  // 2. LOST Transition Validation
  if (targetStage === "LOST") {
    const lossReason = options?.lossReason || options?.reason;
    if (!lossReason || lossReason.trim().length === 0) {
      blockers.push("A documented reason is required when marking a deal as LOST.");
    }
    return { valid: blockers.length === 0, blockers, warnings };
  }

  // 3. WON Transition Validation (CRITICAL INVARIANT)
  // Preview approval alone NEVER closes a deal as WON!
  // Requires confirmed commercial terms, agreed contract/payment conditions, or explicit authorized confirmation.
  if (targetStage === "WON") {
    // Check if user is attempting to skip directly from initial uncontacted stages without proposal/negotiation
    if (currentOrder < PIPELINE_STAGE_ORDER["PROPOSAL_SENT"] && !options?.isExplicitOverride) {
      blockers.push(`Cannot mark deal WON directly from "${currentStage}". Deal must reach Proposal Sent or Negotiation first, or require explicit override.`);
    }

    const hasConfirmedTerms = options?.commercialTermsConfirmed || business.contractStatus === "SIGNED" || business.paymentStatus === "PAID" || business.paymentStatus === "PARTIALLY_PAID";
    if (!hasConfirmedTerms && !options?.isExplicitOverride) {
      blockers.push("Marking a deal as WON requires confirmed acceptance of commercial terms, signed contract, or received deposit/payment.");
    }

    const agreedValue = options?.agreedValue ?? business.agreedDealValue ?? business.dealDetails?.agreedValue ?? business.totalContractValue;
    if (agreedValue !== undefined && agreedValue <= 0) {
      warnings.push("Agreed deal value is $0 or unrecorded.");
    }

    return { valid: blockers.length === 0, blockers, warnings };
  }

  // 4. Backward Transitions
  if (targetOrder < currentOrder) {
    if (!options?.reason && !options?.isExplicitOverride) {
      warnings.push(`Moving backward in pipeline from "${currentStage}" to "${targetStage}". Reason recommended.`);
    }
  }

  return {
    valid: blockers.length === 0,
    blockers,
    warnings
  };
}

/**
 * Executes a canonical sales pipeline stage transition with audit logging,
 * deal record synchronization, and sequence integration.
 */
export async function executePipelineStageTransition(
  business: Business,
  targetStage: CanonicalSalesStage,
  actor: TaskAssignee,
  options?: {
    reason?: string;
    commercialTermsConfirmed?: boolean;
    estimatedValue?: number;
    agreedValue?: number;
    currency?: string;
    proposedServices?: string[];
    expectedCloseDate?: string;
    lossReason?: string;
    isExplicitOverride?: boolean;
  }
): Promise<{
  success: boolean;
  business: Business;
  dealDetails?: DealDetails;
  transition?: StageTransitionRecord;
  error?: string;
}> {
  const validation = validatePipelineStageTransition(business, targetStage, actor, options);
  if (!validation.valid) {
    return {
      success: false,
      business,
      error: validation.blockers.join(" ")
    };
  }

  const currentStage = normalizePipelineStage(business.salesStage || business.prospectStatus);
  const now = new Date().toISOString();

  // Create transition record
  const transition: StageTransitionRecord = {
    id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fromStage: currentStage,
    toStage: targetStage,
    timestamp: now,
    actor,
    reason: options?.reason || options?.lossReason,
    metadata: {
      estimatedValue: options?.estimatedValue,
      agreedValue: options?.agreedValue,
      currency: options?.currency || business.currency || "USD",
      commercialTermsConfirmed: options?.commercialTermsConfirmed
    }
  };

  const existingHistory = business.stageHistory || business.dealDetails?.stageHistory || [];
  const updatedStageHistory = [...existingHistory, transition];

  // Prepare updated deal details
  const existingDeal = business.dealDetails;
  const dealId = existingDeal?.id || `deal_${business.id}`;
  const currency = options?.currency || business.currency || existingDeal?.currency || "USD";
  const estimatedValue = options?.estimatedValue ?? business.estimatedDealValue ?? existingDeal?.estimatedValue;
  const agreedValue = options?.agreedValue ?? business.agreedDealValue ?? existingDeal?.agreedValue;
  const proposedServices = options?.proposedServices ?? business.proposedServices ?? existingDeal?.proposedServices;
  const expectedCloseDate = options?.expectedCloseDate ?? business.expectedCloseDate ?? existingDeal?.expectedCloseDate;

  const wonDetails = targetStage === "WON" 
    ? {
        closedBy: actor.displayName || actor.uid,
        closedAt: now,
        commercialTermsConfirmed: options?.commercialTermsConfirmed ?? true,
        paymentMethodOrTerms: options?.reason,
        contractSigned: options?.commercialTermsConfirmed || business.contractStatus === "SIGNED",
        notes: options?.reason
      }
    : existingDeal?.wonDetails;

  const lossReason = targetStage === "LOST" ? (options?.lossReason || options?.reason) : undefined;

  const updatedDealDetails: DealDetails = {
    id: dealId,
    businessId: business.id,
    assignedOwner: actor,
    stage: targetStage,
    estimatedValue,
    agreedValue,
    currency,
    proposedServices,
    expectedCloseDate,
    lossReason,
    wonDetails,
    createdAt: existingDeal?.createdAt || now,
    updatedAt: now,
    stageHistory: updatedStageHistory
  };

  // Derive legacy prospectStatus for compatibility
  const derivedProspectStatus = targetStage === "WON" 
    ? "Won" 
    : targetStage === "LOST" 
    ? "Lost" 
    : targetStage === "PROPOSAL_SENT" || targetStage === "NEGOTIATION" 
    ? "Proposal" 
    : targetStage === "ENGAGED" || targetStage === "DISCOVERY" 
    ? "Interested" 
    : "Analyzed";

  let updatedBusiness: Business = {
    ...business,
    salesStage: targetStage,
    prospectStatus: derivedProspectStatus,
    dealDetails: updatedDealDetails,
    stageHistory: updatedStageHistory,
    currency,
    estimatedDealValue: estimatedValue,
    agreedDealValue: agreedValue,
    proposedServices,
    expectedCloseDate,
    lossReason,
    assignedOwner: actor,
    updatedAt: now
  };

  // Synchronize separated lifecycle outcome dimensions
  if (targetStage === "WON") {
    updatedBusiness.dealOutcome = "WON";
    updatedBusiness.dealClosedAt = now;
    updatedBusiness.dealClosedBy = actor.displayName || actor.uid;
    if (agreedValue) {
      updatedBusiness.totalContractValue = agreedValue;
    }
    // Safe automation: complete active sequences on won
    const seqRes = handleSequenceReplyOrOptOut(updatedBusiness, "deal_won", actor);
    updatedBusiness = seqRes.business;
    // Micro-Phase 14B: Initialize customer onboarding record
    const onbRes = await initiateCustomerOnboarding(updatedBusiness, actor);
    if (onbRes.success) {
      updatedBusiness = onbRes.business;
    }
  } else if (targetStage === "LOST") {
    updatedBusiness.dealOutcome = "LOST";
    updatedBusiness.dealClosureNotes = lossReason;
    // Safe automation: stop active sequences on lost
    const seqRes = handleSequenceReplyOrOptOut(updatedBusiness, "opt_out", actor, lossReason);
    updatedBusiness = seqRes.business;
  }

  // Persist
  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: targetStage === "WON" ? "proposal_accepted" : targetStage === "LOST" ? "proposal_declined" : "prospect_replied",
      title: `Pipeline Stage: ${currentStage} → ${targetStage}`,
      description: options?.reason || `Moved deal stage to ${targetStage}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    dealDetails: updatedDealDetails,
    transition
  };
}

/**
 * Updates commercial parameters of a deal without changing the stage.
 */
export function updateDealCommercialTerms(
  business: Business,
  updates: {
    estimatedValue?: number;
    agreedValue?: number;
    currency?: string;
    proposedServices?: string[];
    expectedCloseDate?: string;
    assignedOwner?: TaskAssignee;
  },
  actor: TaskAssignee
): {
  success: boolean;
  business: Business;
  dealDetails: DealDetails;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      dealDetails: business.dealDetails || ({} as DealDetails),
      error: `Unauthorized: User role "${actor.role}" cannot update deal terms.`
    };
  }

  const now = new Date().toISOString();
  const currentStage = normalizePipelineStage(business.salesStage || business.prospectStatus);
  const existingDeal = business.dealDetails;
  const dealId = existingDeal?.id || `deal_${business.id}`;

  const updatedDeal: DealDetails = {
    id: dealId,
    businessId: business.id,
    assignedOwner: updates.assignedOwner || existingDeal?.assignedOwner || actor,
    stage: currentStage,
    estimatedValue: updates.estimatedValue !== undefined ? updates.estimatedValue : existingDeal?.estimatedValue,
    agreedValue: updates.agreedValue !== undefined ? updates.agreedValue : existingDeal?.agreedValue,
    currency: updates.currency || existingDeal?.currency || business.currency || "USD",
    proposedServices: updates.proposedServices || existingDeal?.proposedServices || business.proposedServices,
    expectedCloseDate: updates.expectedCloseDate || existingDeal?.expectedCloseDate || business.expectedCloseDate,
    lossReason: existingDeal?.lossReason,
    wonDetails: existingDeal?.wonDetails,
    createdAt: existingDeal?.createdAt || now,
    updatedAt: now,
    stageHistory: existingDeal?.stageHistory || business.stageHistory || []
  };

  const updatedBusiness: Business = {
    ...business,
    dealDetails: updatedDeal,
    currency: updatedDeal.currency,
    estimatedDealValue: updatedDeal.estimatedValue,
    agreedDealValue: updatedDeal.agreedValue,
    proposedServices: updatedDeal.proposedServices,
    expectedCloseDate: updatedDeal.expectedCloseDate,
    assignedOwner: updatedDeal.assignedOwner,
    updatedAt: now
  };

  // Sync to persistence
  saveBusinessRecord(updatedBusiness).catch(() => {});

  return {
    success: true,
    business: updatedBusiness,
    dealDetails: updatedDeal
  };
}

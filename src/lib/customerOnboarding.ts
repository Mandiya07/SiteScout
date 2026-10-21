import {
  Business,
  CustomerContactHandoff,
  CustomerOnboardingRecord,
  CustomerOnboardingStatus,
  OnboardingAuditRecord,
  OnboardingRequirementItem,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 14B: CUSTOMER ONBOARDING AND HANDOFF AFTER DEAL CLOSURE
 * 
 * Provides a controlled, auditable transition from a won deal into customer onboarding
 * and project delivery. Preserves confirmed customer identity, agreed services, commercial values,
 * and tracks verified handoff requirements before delivery kickoff.
 */

/**
 * Generates canonical onboarding requirements checklist for a newly won deal.
 */
export function generateDefaultOnboardingChecklist(business: Business): OnboardingRequirementItem[] {
  const isContractSigned = business.contractStatus === "SIGNED" || business.dealDetails?.wonDetails?.contractSigned;
  const isPaymentReceived = business.paymentStatus === "PAID" || business.paymentStatus === "PARTIALLY_PAID";

  return [
    {
      id: "req_contract_execution",
      category: "TECHNICAL",
      label: "Executed Commercial Agreement",
      description: "Signed contract or verified commercial agreement acceptance.",
      isCompleted: !!isContractSigned,
      isRequired: true,
      completedAt: isContractSigned ? (business.contractSignedAt || new Date().toISOString()) : undefined,
      evidenceNotes: isContractSigned ? `Signed by ${business.contractSignedBy || "Client"}` : undefined
    },
    {
      id: "req_payment_deposit",
      category: "PAYMENT",
      label: "Initial Deposit / Payment Confirmation",
      description: "Receipt of initial setup deposit or payment confirmation as per agreed terms.",
      isCompleted: !!isPaymentReceived,
      isRequired: true,
      completedAt: isPaymentReceived ? (business.paymentReceivedAt || new Date().toISOString()) : undefined,
      evidenceNotes: isPaymentReceived ? `Payment state: ${business.paymentStatus}` : undefined
    },
    {
      id: "req_domain_dns",
      category: "DOMAIN_ACCESS",
      label: "Domain Access & DNS Delegation",
      description: "Custom domain name identified and DNS credentials or delegation established.",
      isCompleted: false,
      isRequired: true
    },
    {
      id: "req_brand_assets",
      category: "BRANDING",
      label: "High-Resolution Brand Assets & Logo",
      description: "Client logo, typography preferences, and official color palette confirmed.",
      isCompleted: false,
      isRequired: true
    },
    {
      id: "req_content_catalogue",
      category: "CONTENT",
      label: "Service Catalogue & Business Copy",
      description: "Verified listing of core services, service descriptions, and operating details.",
      isCompleted: false,
      isRequired: true
    },
    {
      id: "req_kickoff_briefing",
      category: "KICKOFF_CALL",
      label: "Project Kick-Off & Timeline Briefing",
      description: "Introductory kickoff alignment with client stakeholder to confirm delivery scope.",
      isCompleted: false,
      isRequired: false
    }
  ];
}

/**
 * Extracts and normalizes customer contacts for onboarding handoff.
 */
export function extractCustomerContacts(business: Business): CustomerContactHandoff[] {
  const contacts: CustomerContactHandoff[] = [];
  const primaryEmail = business.contactProfile?.primaryEmail?.normalizedValue || 
    business.contactProfile?.primaryEmail?.value ||
    business.email;
  
  const phone = business.contactProfile?.primaryPhone?.normalizedValue || 
    business.contactProfile?.primaryPhone?.value ||
    business.phone;

  const name = business.contactProfile?.primaryEmail?.contactName || 
    business.contractSignedBy || 
    "Authorized Client Representative";

  if (primaryEmail) {
    contacts.push({
      name,
      email: primaryEmail,
      phone,
      role: "Primary Commercial Stakeholder",
      isPrimary: true,
      verified: !!business.contactProfile?.primaryEmail?.isVerified
    });
  }

  return contacts;
}

/**
 * Initiates customer onboarding for a won deal.
 */
export async function initiateCustomerOnboarding(
  business: Business,
  actor: TaskAssignee,
  options?: {
    targetDeliveryDate?: string;
    projectNotes?: string;
  }
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  isDuplicate?: boolean;
  error?: string;
}> {
  // 1. Role Authorization Check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot initiate customer onboarding.`
    };
  }

  // 2. Deal Validation: Deal must be WON or have confirmed commercial terms
  const isWon = business.salesStage === "WON" || 
    business.dealOutcome === "WON" || 
    business.contractStatus === "SIGNED" || 
    business.dealDetails?.wonDetails?.commercialTermsConfirmed;

  if (!isWon) {
    return {
      success: false,
      business,
      error: `Cannot initiate onboarding for prospect "${business.name}". Deal must be won or have signed commercial terms before onboarding handoff.`
    };
  }

  // 3. Duplicate Prevention: Check if active onboarding already exists
  if (business.onboardingRecord && business.onboardingRecord.status !== "CANCELLED") {
    return {
      success: true,
      business,
      onboardingRecord: business.onboardingRecord,
      isDuplicate: true
    };
  }

  const now = new Date().toISOString();
  const agreedServices = business.dealDetails?.proposedServices || business.proposedServices || ["Custom Website Layout & Deployment"];
  const agreedCommercialValue = business.agreedDealValue ?? business.dealDetails?.agreedValue ?? business.totalContractValue ?? 0;
  const currency = business.currency || business.dealDetails?.currency || "USD";
  const contacts = extractCustomerContacts(business);
  const requirementsChecklist = generateDefaultOnboardingChecklist(business);

  const missingRequirements = requirementsChecklist
    .filter(r => r.isRequired && !r.isCompleted)
    .map(r => r.label);

  const initialAudit: OnboardingAuditRecord = {
    id: `onb_aud_${Date.now()}_1`,
    fromStatus: "PENDING",
    toStatus: "PENDING",
    timestamp: now,
    actor,
    notes: `Customer onboarding initiated following deal closure. Agreed value: ${currency} ${agreedCommercialValue}`
  };

  const onboardingRecord: CustomerOnboardingRecord = {
    id: `onb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    businessName: business.name,
    dealId: business.dealDetails?.id || `deal_${business.id}`,
    status: "PENDING",
    agreedServices,
    agreedCommercialValue,
    currency,
    contractDocumentId: business.activeCommercialDocumentId,
    paymentStatus: business.paymentStatus || "UNPAID",
    contacts,
    assignedOwner: business.assignedOwner || actor,
    requirementsChecklist,
    missingRequirements,
    projectNotes: options?.projectNotes,
    targetDeliveryDate: options?.targetDeliveryDate,
    auditHistory: [initialAudit],
    createdAt: now,
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    onboardingRecord,
    onboardingStatus: "PENDING"
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: "Customer Onboarding Initiated",
      description: `Handoff record created for ${business.name}. Status: PENDING`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    onboardingRecord,
    isDuplicate: false
  };
}

/**
 * Updates a requirement item in the onboarding checklist.
 */
export async function updateOnboardingRequirement(
  business: Business,
  requirementId: string,
  isCompleted: boolean,
  actor: TaskAssignee,
  evidenceNotes?: string
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot update onboarding requirements.`
    };
  }

  const record = business.onboardingRecord;
  if (!record) {
    return { success: false, business, error: "No onboarding record found for this business." };
  }

  if (record.status === "COMPLETED" || record.status === "CANCELLED") {
    return {
      success: false,
      business,
      error: `Cannot modify requirements for an onboarding record in ${record.status} status.`
    };
  }

  const now = new Date().toISOString();
  const updatedChecklist = record.requirementsChecklist.map(item => {
    if (item.id === requirementId) {
      return {
        ...item,
        isCompleted,
        completedAt: isCompleted ? now : undefined,
        completedBy: isCompleted ? actor : undefined,
        evidenceNotes: evidenceNotes !== undefined ? evidenceNotes : item.evidenceNotes
      };
    }
    return item;
  });

  const missingRequirements = updatedChecklist
    .filter(r => r.isRequired && !r.isCompleted)
    .map(r => r.label);

  // If a requirement was unchecked while in READY_FOR_DELIVERY, revert to IN_PROGRESS
  let status = record.status;
  if (!isCompleted && status === "READY_FOR_DELIVERY") {
    status = "IN_PROGRESS";
  }

  const updatedRecord: CustomerOnboardingRecord = {
    ...record,
    status,
    requirementsChecklist: updatedChecklist,
    missingRequirements,
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    onboardingRecord: updatedRecord,
    onboardingStatus: status
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    onboardingRecord: updatedRecord
  };
}

/**
 * Advances the onboarding lifecycle status with strict handoff validation.
 */
export async function advanceOnboardingStatus(
  business: Business,
  targetStatus: CustomerOnboardingStatus,
  actor: TaskAssignee,
  notes?: string
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot advance onboarding status.`
    };
  }

  const record = business.onboardingRecord;
  if (!record) {
    return { success: false, business, error: "No onboarding record found for this business." };
  }

  const currentStatus = record.status;
  if (currentStatus === targetStatus) {
    return { success: true, business, onboardingRecord: record };
  }

  // 1. Strict Delivery Guard: Cannot advance to READY_FOR_DELIVERY or ACTIVE with incomplete requirements
  if (targetStatus === "READY_FOR_DELIVERY" || targetStatus === "ACTIVE") {
    const unfulfilledRequirements = record.requirementsChecklist
      .filter(r => r.isRequired && !r.isCompleted)
      .map(r => r.label);

    if (unfulfilledRequirements.length > 0) {
      return {
        success: false,
        business,
        error: `Cannot transition to ${targetStatus}: Missing required onboarding requirements: ${unfulfilledRequirements.join(", ")}.`
      };
    }

    if (!record.contacts || record.contacts.length === 0 || !record.contacts[0].email) {
      return {
        success: false,
        business,
        error: `Cannot transition to ${targetStatus}: At least one verified customer contact email is required.`
      };
    }

    if (!record.agreedServices || record.agreedServices.length === 0) {
      return {
        success: false,
        business,
        error: `Cannot transition to ${targetStatus}: Agreed delivery services must be defined.`
      };
    }
  }

  const now = new Date().toISOString();
  const auditEntry: OnboardingAuditRecord = {
    id: `onb_aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    timestamp: now,
    actor,
    notes: notes || `Status changed from ${currentStatus} to ${targetStatus}`
  };

  const updatedRecord: CustomerOnboardingRecord = {
    ...record,
    status: targetStatus,
    startedAt: targetStatus === "IN_PROGRESS" && !record.startedAt ? now : record.startedAt,
    completedAt: targetStatus === "COMPLETED" ? now : record.completedAt,
    auditHistory: [...record.auditHistory, auditEntry],
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    onboardingRecord: updatedRecord,
    onboardingStatus: targetStatus
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: `Onboarding Status: ${targetStatus}`,
      description: `Transitioned from ${currentStatus} to ${targetStatus}. By: ${actor.displayName || "Agent"}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    onboardingRecord: updatedRecord
  };
}

/**
 * Pauses customer onboarding.
 */
export async function pauseCustomerOnboarding(
  business: Business,
  reason: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  error?: string;
}> {
  if (!reason || reason.trim().length === 0) {
    return { success: false, business, error: "Reason is required to place onboarding on hold." };
  }

  const res = await advanceOnboardingStatus(business, "ON_HOLD", actor, reason);
  if (res.success && res.business.onboardingRecord) {
    res.business.onboardingRecord.onHoldReason = reason;
  }
  return res;
}

/**
 * Cancels customer onboarding.
 */
export async function cancelCustomerOnboarding(
  business: Business,
  reason: string,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  error?: string;
}> {
  if (!reason || reason.trim().length === 0) {
    return { success: false, business, error: "Reason is required to cancel customer onboarding." };
  }

  const res = await advanceOnboardingStatus(business, "CANCELLED", actor, reason);
  if (res.success && res.business.onboardingRecord) {
    res.business.onboardingRecord.cancellationReason = reason;
  }
  return res;
}

/**
 * Updates project details (target date, notes) without altering commercial terms.
 */
export async function updateOnboardingProjectDetails(
  business: Business,
  updates: {
    projectNotes?: string;
    targetDeliveryDate?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  onboardingRecord?: CustomerOnboardingRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot modify onboarding project details.`
    };
  }

  const record = business.onboardingRecord;
  if (!record) {
    return { success: false, business, error: "No onboarding record found." };
  }

  const updatedRecord: CustomerOnboardingRecord = {
    ...record,
    projectNotes: updates.projectNotes !== undefined ? updates.projectNotes : record.projectNotes,
    targetDeliveryDate: updates.targetDeliveryDate !== undefined ? updates.targetDeliveryDate : record.targetDeliveryDate,
    updatedAt: new Date().toISOString()
  };

  const updatedBusiness: Business = {
    ...business,
    onboardingRecord: updatedRecord
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    onboardingRecord: updatedRecord
  };
}

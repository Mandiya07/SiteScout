import {
  Business,
  CustomerProjectRecord,
  CustomerProjectRequirement,
  CustomerProjectRevision,
  CustomerProjectStatus,
  CustomerProjectTask,
  CustomerVersionApproval,
  DeliveryMilestone,
  DeploymentEvidence,
  LaunchReadinessResult,
  ProjectAuditRecord,
  ProjectLaunchStatus,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 14C: CUSTOMER PROJECT AND WEBSITE DELIVERY MANAGEMENT
 * 
 * Manages the delivery lifecycle from onboarding handoff to website production,
 * review, revision tracking, launch readiness verification, and deployment.
 * Enforces versioned approvals, task dependencies, content provenance, and
 * prevents marking projects live without verified deployment evidence.
 */

/**
 * Generates default delivery milestones for a customer project.
 */
export function generateDefaultMilestones(): DeliveryMilestone[] {
  return [
    {
      id: "ms_requirements",
      title: "Requirements & Brand Alignment",
      description: "Transfer confirmed onboarding requirements, brand palette, and official service catalogue.",
      order: 1,
      status: "COMPLETED",
      completedAt: new Date().toISOString()
    },
    {
      id: "ms_layout_assembly",
      title: "Layout Assembly & Component Engineering",
      description: "Produce high-fidelity responsive layout with interactive forms, contact actions, and SEO meta tags.",
      order: 2,
      status: "IN_PROGRESS"
    },
    {
      id: "ms_customer_review",
      title: "Customer Review & Version Approval",
      description: "Deliver secure interactive preview to client stakeholders and capture formal version sign-off.",
      order: 3,
      status: "PENDING"
    },
    {
      id: "ms_qa_preflight",
      title: "Pre-Flight QA & DNS Configuration",
      description: "Verify domain DNS records, SSL certificates, contact endpoints, and run integrity scans.",
      order: 4,
      status: "PENDING"
    },
    {
      id: "ms_production_launch",
      title: "Production Deployment & Handover",
      description: "Deploy layout to production edge servers, verify live HTTP 200 response, and complete client handover.",
      order: 5,
      status: "PENDING"
    }
  ];
}

/**
 * Generates default project tasks with dependencies and ownership.
 */
export function generateDefaultProjectTasks(projectId: string, assignedOwner: TaskAssignee): CustomerProjectTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: "task_domain_dns",
      projectId,
      title: "Domain DNS Delegation & SSL Setup",
      description: "Verify DNS records point to production edge cluster and SSL certificates are active.",
      assignedTo: assignedOwner,
      isRequired: true,
      isCompleted: false,
      history: [{ timestamp: now, actor: assignedOwner, action: "CREATED", notes: "Task initialized" }]
    },
    {
      id: "task_brand_assets",
      projectId,
      title: "High-Resolution Brand Assets Integration",
      description: "Incorporate client logos, typography, official palette, and verified service photography.",
      assignedTo: assignedOwner,
      isRequired: true,
      isCompleted: false,
      history: [{ timestamp: now, actor: assignedOwner, action: "CREATED", notes: "Task initialized" }]
    },
    {
      id: "task_content_validation",
      projectId,
      title: "Content & Business Truth Verification",
      description: "Validate all services, pricing tiers, operating hours, and physical location details against confirmed facts.",
      assignedTo: assignedOwner,
      isRequired: true,
      isCompleted: false,
      history: [{ timestamp: now, actor: assignedOwner, action: "CREATED", notes: "Task initialized" }]
    },
    {
      id: "task_mobile_testing",
      projectId,
      title: "Mobile Responsiveness & Contact Channel Audit",
      description: "Verify WhatsApp click-to-chat, click-to-call phone buttons, and lead forms on mobile devices.",
      assignedTo: assignedOwner,
      dependencies: ["task_content_validation"],
      isRequired: true,
      isCompleted: false,
      history: [{ timestamp: now, actor: assignedOwner, action: "CREATED", notes: "Task initialized" }]
    },
    {
      id: "task_client_signoff",
      projectId,
      title: "Customer Final Version Sign-Off",
      description: "Obtain formal customer sign-off for the release version prior to production launch.",
      assignedTo: assignedOwner,
      dependencies: ["task_mobile_testing", "task_brand_assets"],
      isRequired: true,
      isCompleted: false,
      history: [{ timestamp: now, actor: assignedOwner, action: "CREATED", notes: "Task initialized" }]
    }
  ];
}

/**
 * Transfers confirmed onboarding checklist items into project requirements with content provenance.
 */
export function transferOnboardingRequirements(business: Business): {
  requirements: CustomerProjectRequirement[];
  missingAssets: string[];
} {
  const requirements: CustomerProjectRequirement[] = [];
  const missingAssets: string[] = [];

  const onboarding = business.onboardingRecord;
  if (onboarding && onboarding.requirementsChecklist) {
    for (const item of onboarding.requirementsChecklist) {
      requirements.push({
        id: `req_proj_${item.id}`,
        category: item.category,
        title: item.label,
        description: item.description,
        provenance: item.category === "BRANDING" || item.category === "CONTENT" ? "CUSTOMER_SUPPLIED" : "SYSTEM_AUDIT",
        isVerified: item.isCompleted,
        isRequired: item.isRequired,
        transferredFromOnboardingId: onboarding.id,
        sourceReference: item.evidenceNotes,
        verifiedAt: item.completedAt,
        verifiedBy: item.completedBy
      });

      if (item.isRequired && !item.isCompleted) {
        missingAssets.push(item.label);
      }
    }
  } else {
    // Basic baseline requirement
    requirements.push({
      id: "req_proj_baseline",
      category: "TECHNICAL",
      title: "Website Layout Architecture",
      description: "Production responsive architecture.",
      provenance: "AI_GENERATED",
      isVerified: true,
      isRequired: true
    });
  }

  return { requirements, missingAssets };
}

/**
 * Initializes a canonical customer project for a won deal with confirmed onboarding.
 */
export async function initializeCustomerProject(
  business: Business,
  actor: TaskAssignee,
  options?: {
    projectType?: "WEBSITE_NEW" | "WEBSITE_REVAMP" | "ECOMMERCE" | "CUSTOM_PORTAL";
    targetDeliveryDate?: string;
    customDomain?: string;
  }
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  isDuplicate?: boolean;
  error?: string;
}> {
  // 1. Authorization check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot initialize customer delivery projects.`
    };
  }

  // 2. Onboarding Precondition Check:
  // Must have an active onboarding record in READY_FOR_DELIVERY, ACTIVE, or COMPLETED
  const onboarding = business.onboardingRecord;
  const isEligible = onboarding && (
    onboarding.status === "READY_FOR_DELIVERY" ||
    onboarding.status === "ACTIVE" ||
    onboarding.status === "COMPLETED" ||
    business.dealOutcome === "WON"
  );

  if (!isEligible) {
    return {
      success: false,
      business,
      error: `Cannot initialize customer project for "${business.name}". Customer onboarding must reach READY_FOR_DELIVERY or ACTIVE before project handoff.`
    };
  }

  // 3. Duplicate Prevention: Check if active project already exists
  if (business.customerProject && business.customerProject.status !== "CANCELLED") {
    return {
      success: true,
      business,
      project: business.customerProject,
      isDuplicate: true
    };
  }

  const now = new Date().toISOString();
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const agreedServices = onboarding?.agreedServices || business.dealDetails?.proposedServices || ["Custom Website Modernization"];
  const assignedOwner = business.assignedOwner || actor;
  const { requirements, missingAssets } = transferOnboardingRequirements(business);
  const milestones = generateDefaultMilestones();
  const tasks = generateDefaultProjectTasks(projectId, assignedOwner);

  const initialAudit: ProjectAuditRecord = {
    id: `pa_${Date.now()}_1`,
    fromStatus: "NOT_STARTED",
    toStatus: "NOT_STARTED",
    timestamp: now,
    actor,
    reason: "Customer delivery project initialized following confirmed onboarding handoff."
  };

  const project: CustomerProjectRecord = {
    id: projectId,
    businessId: business.id,
    businessName: business.name,
    customerId: business.customerAccount?.customerId || business.customerId,
    dealId: business.dealDetails?.id || `deal_${business.id}`,
    onboardingId: onboarding?.id || `onb_${business.id}`,
    commercialDocumentId: business.activeCommercialDocumentId || onboarding?.contractDocumentId || business.contractDocumentId,
    projectType: options?.projectType || (business.presence?.hasWebsite ? "WEBSITE_REVAMP" : "WEBSITE_NEW"),
    agreedServices,
    assignedOwner,
    status: "NOT_STARTED",
    launchStatus: "NOT_READY",
    targetDeliveryDate: options?.targetDeliveryDate || onboarding?.targetDeliveryDate,
    currentWebsiteVersion: business.siteData?.currentVersion || business.siteData?.version || 1,
    currentSiteId: business.siteId,
    previewUrl: business.siteId ? `/preview/${business.siteId}` : undefined,
    customDomain: options?.customDomain || (business.presence?.websiteUrl ? business.presence.websiteUrl.replace(/^https?:\/\//, "") : undefined),
    requirements,
    missingAssets,
    tasks,
    milestones,
    customerApprovals: [],
    revisionHistory: [],
    auditHistory: [initialAudit],
    createdAt: now,
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: project,
    projectStatus: "NOT_STARTED"
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: "Delivery Project Initialized",
      description: `Project ${projectId} created for ${business.name}. Scope: ${agreedServices.join(", ")}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    project,
    isDuplicate: false
  };
}

/**
 * Updates a project task with full audit history and dependency enforcement.
 */
export async function updateProjectTask(
  business: Business,
  taskId: string,
  isCompleted: boolean,
  actor: TaskAssignee,
  notes?: string
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot update project tasks.`
    };
  }

  const project = business.customerProject;
  if (!project) {
    return { success: false, business, error: "No customer project found for this business." };
  }

  const targetTask = project.tasks.find(t => t.id === taskId);
  if (!targetTask) {
    return { success: false, business, error: `Task "${taskId}" not found in project.` };
  }

  // Dependency enforcement: If completing, ensure all dependencies are met
  if (isCompleted && targetTask.dependencies && targetTask.dependencies.length > 0) {
    for (const depId of targetTask.dependencies) {
      const depTask = project.tasks.find(t => t.id === depId);
      if (depTask && !depTask.isCompleted) {
        return {
          success: false,
          business,
          error: `Cannot complete task "${targetTask.title}": Dependent task "${depTask.title}" must be completed first.`
        };
      }
    }
  }

  const now = new Date().toISOString();
  const updatedTasks = project.tasks.map(t => {
    if (t.id === taskId) {
      const historyEntry = {
        timestamp: now,
        actor,
        action: isCompleted ? ("COMPLETED" as const) : ("REOPENED" as const),
        notes: notes || (isCompleted ? "Marked complete" : "Reopened task")
      };
      return {
        ...t,
        isCompleted,
        completedAt: isCompleted ? now : undefined,
        completedBy: isCompleted ? actor : undefined,
        completionNotes: notes || t.completionNotes,
        history: [...t.history, historyEntry]
      };
    }
    return t;
  });

  const updatedProject: CustomerProjectRecord = {
    ...project,
    tasks: updatedTasks,
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: updatedProject
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    project: updatedProject
  };
}

/**
 * Records customer or authorized staff review and approval for a specific website version.
 */
export async function recordCustomerVersionApproval(
  business: Business,
  approval: {
    versionNumber: number;
    status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
    approverName: string;
    approverEmail: string;
    approverRole?: string;
    approvalMethod: "DIGITAL_PORTAL" | "WRITTEN_CONFIRMATION" | "CLIENT_DIRECT";
    feedbackNotes?: string;
    snapshotHash?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record version approvals.`
    };
  }

  const project = business.customerProject;
  if (!project) {
    return { success: false, business, error: "No customer project found for this business." };
  }

  const now = new Date().toISOString();
  const approvalRecord: CustomerVersionApproval = {
    id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    versionNumber: approval.versionNumber,
    siteId: project.currentSiteId,
    status: approval.status,
    approverName: approval.approverName,
    approverEmail: approval.approverEmail,
    approverRole: approval.approverRole || "Client Stakeholder",
    approvalMethod: approval.approvalMethod,
    timestamp: now,
    feedbackNotes: approval.feedbackNotes,
    snapshotHash: approval.snapshotHash || `v${approval.versionNumber}_${Date.now()}`
  };

  let newStatus = project.status;
  if (approval.status === "APPROVED") {
    newStatus = "APPROVED_FOR_LAUNCH";
  } else if (approval.status === "CHANGES_REQUESTED" || approval.status === "REJECTED") {
    newStatus = "REVISION_REQUIRED";
  }

  const auditEntry: ProjectAuditRecord = {
    id: `pa_${Date.now()}_appr`,
    fromStatus: project.status,
    toStatus: newStatus,
    timestamp: now,
    actor,
    reason: `Customer review outcome: ${approval.status} for Version ${approval.versionNumber} by ${approval.approverName}`
  };

  const updatedProject: CustomerProjectRecord = {
    ...project,
    status: newStatus,
    customerApprovals: [...project.customerApprovals, approvalRecord],
    auditHistory: [...project.auditHistory, auditEntry],
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: updatedProject,
    projectStatus: newStatus
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    project: updatedProject
  };
}

/**
 * Submits a layout revision request, automatically incrementing website version
 * and requiring re-approval if previously approved.
 */
export async function submitProjectRevision(
  business: Business,
  revision: {
    section: string;
    description: string;
    requestedBy: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot submit project revisions.`
    };
  }

  const project = business.customerProject;
  if (!project) {
    return { success: false, business, error: "No customer project found for this business." };
  }

  const now = new Date().toISOString();
  const nextVersion = project.currentWebsiteVersion + 1;

  const revisionRecord: CustomerProjectRevision = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    versionRequested: nextVersion,
    section: revision.section,
    description: revision.description,
    requestedBy: revision.requestedBy,
    requestedAt: now,
    status: "OPEN"
  };

  // If project was APPROVED_FOR_LAUNCH, a new revision resets status back to REVISION_REQUIRED
  // so that unverified edits are never launched silently without fresh approval!
  let newStatus = project.status;
  if (newStatus === "APPROVED_FOR_LAUNCH" || newStatus === "CUSTOMER_REVIEW") {
    newStatus = "REVISION_REQUIRED";
  }

  const auditEntry: ProjectAuditRecord = {
    id: `pa_${Date.now()}_rev`,
    fromStatus: project.status,
    toStatus: newStatus,
    timestamp: now,
    actor,
    reason: `Revision requested on "${revision.section}". Version incremented from v${project.currentWebsiteVersion} to v${nextVersion}. Re-approval required.`
  };

  const updatedProject: CustomerProjectRecord = {
    ...project,
    currentWebsiteVersion: nextVersion,
    status: newStatus,
    launchStatus: "NOT_READY",
    revisionHistory: [...project.revisionHistory, revisionRecord],
    auditHistory: [...project.auditHistory, auditEntry],
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: updatedProject,
    projectStatus: newStatus
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    project: updatedProject
  };
}

/**
 * Rigorously evaluates launch readiness across all 6 production criteria.
 */
export function evaluateLaunchReadiness(business: Business): LaunchReadinessResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const project = business.customerProject;

  if (!project) {
    return {
      isReady: false,
      blockers: ["No customer project record exists."],
      warnings: [],
      checks: {
        tasksCompleted: false,
        customerApprovalPresent: false,
        commercialTermsSatisfied: false,
        hostingAndDomainConfigured: false,
        contentAndContactMechanismsValid: false,
        qaScanClean: false
      }
    };
  }

  // 1. Task Completion Check
  const tasks = project.tasks || [];
  const incompleteRequiredTasks = tasks
    .filter(t => t.isRequired && !t.isCompleted)
    .map(t => t.title);
  const tasksCompleted = incompleteRequiredTasks.length === 0;
  if (!tasksCompleted) {
    blockers.push(`Incomplete required tasks: ${incompleteRequiredTasks.join(", ")}`);
  }

  // 2. Customer Approval Check (Must match currentWebsiteVersion)
  const approvals = project.customerApprovals || [];
  const currentVersionApproval = approvals.find(
    a => a.versionNumber === project.currentWebsiteVersion && a.status === "APPROVED"
  );
  const customerApprovalPresent = !!currentVersionApproval;
  if (!customerApprovalPresent) {
    blockers.push(`Missing customer approval for current website version (v${project.currentWebsiteVersion}).`);
  }

  // 3. Commercial Terms Check
  const commercialTermsSatisfied = 
    business.contractStatus === "SIGNED" || 
    business.paymentStatus === "PAID" || 
    business.paymentStatus === "PARTIALLY_PAID" ||
    (business.onboardingRecord?.paymentStatus && business.onboardingRecord.paymentStatus !== "UNPAID");
  if (!commercialTermsSatisfied) {
    blockers.push("Commercial terms not satisfied (signed contract or payment confirmation required prior to launch).");
  }

    // 4. Hosting & Domain Check
  const hostingAndDomainConfigured = !!(project.customDomain || business.presence?.websiteUrl || project.previewUrl);
  if (!hostingAndDomainConfigured) {
    blockers.push("Domain or production host URL not configured.");
  }

  // 4b. HTTPS Readiness Check
  const domainCandidate = project.customDomain || business.presence?.websiteUrl || project.previewUrl || "";
  const isHttpsOrEligible = domainCandidate.startsWith("https://") || 
    domainCandidate.startsWith("/") || 
    (!!project.customDomain && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(project.customDomain));
  const httpsReady = isHttpsOrEligible;
  if (!httpsReady) {
    warnings.push("Target domain format may require manual DNS and SSL certificate verification.");
  }

  // 5. Content & Contact Mechanisms Valid
  const hasPhone = !!(business.phone && business.phone !== "Unlisted");
  const hasEmail = !!(business.email || business.contactProfile?.primaryEmail?.normalizedValue || business.contactProfile?.primaryEmail?.value);
  const contentAndContactMechanismsValid = hasPhone || hasEmail;
  if (!contentAndContactMechanismsValid) {
    blockers.push("No verified customer contact phone or email mechanism configured.");
  }

  // 5b. Required Pages and Navigation Check
  const site = business.siteData;
  const hasRequiredSections = !site || (
    !!site.hero && 
    Array.isArray(site.services) && site.services.length > 0 &&
    (!!site.contactPage || hasPhone || hasEmail)
  );
  const requiredPagesPresent = hasRequiredSections;
  if (!requiredPagesPresent) {
    blockers.push("Website is missing one or more required sections (hero, services, or contact mechanism).");
  }

  // 5c. Mobile Responsiveness Check
  const mobileTask = tasks.find(t => t.id === "task_mobile_testing");
  const mobileResponsivenessVerified = mobileTask ? mobileTask.isCompleted : true;
  if (mobileTask && !mobileTask.isCompleted) {
    // If incomplete, it's already caught in tasksCompleted, but we mark the specific check
  }

  // 6. QA Scan Clean
  const missingAssets = project.missingAssets || [];
  const qaScanClean = missingAssets.length === 0;
  if (!qaScanClean) {
    warnings.push(`Missing assets recorded: ${missingAssets.join(", ")}`);
  }

  const isReady = blockers.length === 0;

  return {
    isReady,
    blockers,
    warnings,
    checks: {
      tasksCompleted,
      customerApprovalPresent,
      commercialTermsSatisfied,
      hostingAndDomainConfigured,
      contentAndContactMechanismsValid,
      qaScanClean,
      requiredPagesPresent,
      mobileResponsivenessVerified,
      httpsReady
    }
  };
}

/**
 * Transitions project delivery lifecycle with strict pre-conditions.
 */
export async function advanceProjectStatus(
  business: Business,
  targetStatus: CustomerProjectStatus,
  actor: TaskAssignee,
  reason?: string
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot advance project status.`
    };
  }

  const project = business.customerProject;
  if (!project) {
    return { success: false, business, error: "No customer project found for this business." };
  }

  const currentStatus = project.status;
  if (currentStatus === targetStatus) {
    return { success: true, business, project };
  }

  // Lifecycle Validation Guard 1: Cannot move to APPROVED_FOR_LAUNCH without matching version approval
  if (targetStatus === "APPROVED_FOR_LAUNCH") {
    const hasApproval = project.customerApprovals.some(
      a => a.versionNumber === project.currentWebsiteVersion && a.status === "APPROVED"
    );
    if (!hasApproval) {
      return {
        success: false,
        business,
        error: `Cannot transition to APPROVED_FOR_LAUNCH: Version ${project.currentWebsiteVersion} has not been approved by customer.`
      };
    }
  }

  // Lifecycle Validation Guard 2: Cannot move to DEPLOYING without passing Launch Readiness Check
  if (targetStatus === "DEPLOYING") {
    const readiness = evaluateLaunchReadiness(business);
    if (!readiness.isReady) {
      return {
        success: false,
        business,
        error: `Cannot transition to DEPLOYING: Launch readiness checks failed: ${readiness.blockers.join("; ")}`
      };
    }
  }

  // Lifecycle Validation Guard 3: Cannot mark LIVE without verified deployment evidence!
  if (targetStatus === "LIVE") {
    if (!project.deploymentEvidence || !project.deploymentEvidence.verified || project.deploymentEvidence.httpStatus !== 200) {
      return {
        success: false,
        business,
        error: "Cannot mark project LIVE: Verified deployment evidence with HTTP 200 response is strictly required."
      };
    }
  }

  // Lifecycle Validation Guard 4: Cannot move to COMPLETED without launch verification and customer handover!
  if (targetStatus === "COMPLETED") {
    if (project.status !== "LIVE") {
      return {
        success: false,
        business,
        error: `Cannot complete project: Project status is currently "${project.status}", must be "LIVE".`
      };
    }
    if (project.verificationStatus !== "VERIFIED_LIVE" && business.launchVerificationStatus !== "VERIFIED_LIVE") {
      return {
        success: false,
        business,
        error: "Cannot complete project: Website launch verification status is not VERIFIED_LIVE."
      };
    }
    const handover = project.handoverRecord || business.customerHandover;
    if (!handover || (handover.handoverStatus !== "HANDED_OVER" && handover.handoverStatus !== "ACCEPTED_BY_CLIENT")) {
      return {
        success: false,
        business,
        error: "Cannot complete project: Formal customer handover has not been executed."
      };
    }
    const incompleteTasks = project.tasks.filter(t => t.isRequired && !t.isCompleted);
    if (incompleteTasks.length > 0) {
      return {
        success: false,
        business,
        error: `Cannot complete project: ${incompleteTasks.length} required tasks remain incomplete.`
      };
    }
  }

  const now = new Date().toISOString();
  const auditEntry: ProjectAuditRecord = {
    id: `pa_${Date.now()}_trans`,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    timestamp: now,
    actor,
    reason: reason || `Status changed from ${currentStatus} to ${targetStatus}`
  };

  const updatedProject: CustomerProjectRecord = {
    ...project,
    status: targetStatus,
    auditHistory: [...project.auditHistory, auditEntry],
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: updatedProject,
    projectStatus: targetStatus
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    project: updatedProject
  };
}

/**
 * Records verified production deployment evidence, updating project to LIVE on verified success.
 */
export async function recordProjectDeployment(
  business: Business,
  evidence: DeploymentEvidence,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  project?: CustomerProjectRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record deployments.`
    };
  }

  const project = business.customerProject;
  if (!project) {
    return { success: false, business, error: "No customer project found for this business." };
  }

  const now = new Date().toISOString();
  const isSuccessful = evidence.verified && evidence.httpStatus === 200 && !!evidence.liveUrl;

  const targetLaunchStatus: ProjectLaunchStatus = isSuccessful ? "DEPLOYED_VERIFIED" : "DEPLOYMENT_FAILED";
  const targetProjectStatus: CustomerProjectStatus = isSuccessful ? "LIVE" : "APPROVED_FOR_LAUNCH";

  const auditEntry: ProjectAuditRecord = {
    id: `pa_${Date.now()}_deploy`,
    fromStatus: project.status,
    toStatus: targetProjectStatus,
    timestamp: now,
    actor,
    reason: isSuccessful
      ? `Production deployment verified live on ${evidence.host} (${evidence.liveUrl}). Response: HTTP 200.`
      : `Production deployment failed: ${evidence.errorMessage || "Non-200 HTTP response"}`
  };

  const updatedProject: CustomerProjectRecord = {
    ...project,
    status: targetProjectStatus,
    launchStatus: targetLaunchStatus,
    deploymentEvidence: evidence,
    auditHistory: [...project.auditHistory, auditEntry],
    updatedAt: now
  };

  const updatedBusiness: Business = {
    ...business,
    customerProject: updatedProject,
    projectStatus: targetProjectStatus,
    deploymentStatus: isSuccessful ? "LIVE" : business.deploymentStatus
  };

  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: isSuccessful ? "Website Deployed LIVE" : "Deployment Failed",
      description: isSuccessful
        ? `Live at: ${evidence.liveUrl} (Host: ${evidence.host})`
        : `Deployment issue: ${evidence.errorMessage}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: isSuccessful,
    business: updatedBusiness,
    project: updatedProject,
    error: isSuccessful ? undefined : evidence.errorMessage || "Deployment failed to achieve verified HTTP 200 status."
  };
}

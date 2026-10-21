import {
  BetaFeedbackAttachment,
  BetaFeedbackCategory,
  BetaFeedbackRecord,
  BetaFeatureModule,
  BetaIssueAuditEntry,
  BetaIssueRecord,
  BetaIssueSeverity,
  BetaIssueStatus,
  BetaWorkflowAnalyticsSummary,
  TaskAssignee,
  VisualQualityRating,
  WorkflowEventRecord,
  WorkflowExecutionStatus,
  WorkflowOperationType
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";

/**
 * MICRO-PHASE 19H: BETA USER FEEDBACK, ISSUE TRACKING & CONTINUOUS IMPROVEMENT
 * 
 * Production engine for SiteScout AI:
 * 1. Structured beta tester feedback collection across 14 modules.
 * 2. Visual presentation ratings across 9 subjective quality dimensions.
 * 3. Systematic issue classification (7 categories, 4 severity tiers, 7 lifecycle states).
 * 4. Administrator issue dashboard with role-based assignment and resolution tracking.
 * 5. Continuous improvement tracking with root cause, affected component, and test evidence.
 * 6. Measurable workflow analytics distinguishing attempted, successful, failed, and abandoned operations.
 * 7. Strict privacy protection and exclusion of test events from real beta analytics.
 */

// Internal In-Memory State Repositories (isolated, fast, resilient)
const feedbackRepository = new Map<string, BetaFeedbackRecord>();
const issueRepository = new Map<string, BetaIssueRecord>();
const workflowEventRepository: WorkflowEventRecord[] = [];

let feedbackCounter = 0;
let issueCounter = 0;

/**
 * Clears all repositories. Strictly for isolated unit/integration test harnesses.
 */
export function resetBetaFeedbackRepository(): void {
  feedbackRepository.clear();
  issueRepository.clear();
  workflowEventRepository.length = 0;
  feedbackCounter = 0;
  issueCounter = 0;
}

/**
 * Sanitizes user input by redacting sensitive secrets, API keys, passwords, and server file paths.
 */
export function sanitizeSensitiveText(input: string): string {
  if (!input) return "";
  return input
    .replace(/(AIza[0-9A-Za-z-_]{20,})/g, "[REDACTED_API_KEY]")
    .replace(/(sk_live_[0-9A-Za-z]{24,})/g, "[REDACTED_STRIPE_KEY]")
    .replace(/(sk_test_[0-9A-Za-z]{24,})/g, "[REDACTED_STRIPE_TEST_KEY]")
    .replace(/(whsec_[0-9A-Za-z]{24,})/g, "[REDACTED_WEBHOOK_SECRET]")
    .replace(/(password|secret|bearer)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, "$1: [REDACTED]")
    .replace(/\/app\/applet\/[\w./-]+/g, "[SANITIZED_PATH]");
}

/**
 * Submits beta feedback from an authorized tester.
 * Enforces validation, secret redaction, and debounce deduplication.
 */
export function submitBetaFeedback(input: {
  betaUserId: string;
  betaUserName?: string;
  betaUserEmail?: string;
  featureModule: BetaFeatureModule;
  category: BetaFeedbackCategory;
  description: string;
  severity?: BetaIssueSeverity;
  relatedRecordRef?: string;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string;
  }>;
  visualRatings?: VisualQualityRating;
  isTestSubmission?: boolean;
}): {
  success: boolean;
  feedback?: BetaFeedbackRecord;
  isDuplicate?: boolean;
  error?: string;
} {
  // 1. Mandatory Fields Validation
  if (!input.betaUserId || input.betaUserId.trim() === "") {
    return { success: false, error: "Beta feedback submission rejected: betaUserId is required." };
  }

  if (!input.featureModule) {
    return { success: false, error: "Beta feedback submission rejected: featureModule is required." };
  }

  if (!input.category) {
    return { success: false, error: "Beta feedback submission rejected: category is required." };
  }

  if (!input.description || input.description.trim() === "") {
    return { success: false, error: "Beta feedback submission rejected: description is required." };
  }

  const now = new Date().toISOString();
  const sanitizedDesc = sanitizeSensitiveText(input.description.trim());
  const severity: BetaIssueSeverity = input.severity || "MEDIUM";

  // 2. Duplicate Check: Within 60 seconds, same user, same module, same description
  const existingList = Array.from(feedbackRepository.values());
  const isDuplicate = existingList.some(f => {
    if (f.betaUserId !== input.betaUserId) return false;
    if (f.featureModule !== input.featureModule) return false;
    if (f.description !== sanitizedDesc) return false;
    const diffMs = Math.abs(Date.parse(now) - Date.parse(f.submissionTimestamp));
    return diffMs < 60000;
  });

  if (isDuplicate) {
    const existing = existingList.find(
      f => f.betaUserId === input.betaUserId && f.featureModule === input.featureModule && f.description === sanitizedDesc
    );
    return {
      success: true,
      feedback: existing,
      isDuplicate: true
    };
  }

  // 3. Process Attachments
  const attachments: BetaFeedbackAttachment[] = (input.attachments || []).map((att, idx) => ({
    id: `att_${Date.now()}_${idx + 1}`,
    fileName: att.fileName,
    fileType: att.fileType,
    fileSize: att.fileSize,
    storageUrl: att.storageUrl,
    uploadedAt: now,
    isSanitized: true
  }));

  feedbackCounter++;
  const year = new Date().getFullYear();
  const feedbackId = `FBK-${year}-${String(feedbackCounter).padStart(4, "0")}`;
  const recordId = `fbk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const record: BetaFeedbackRecord = {
    id: recordId,
    feedbackId,
    betaUserId: input.betaUserId,
    betaUserName: input.betaUserName,
    betaUserEmail: input.betaUserEmail,
    featureModule: input.featureModule,
    category: input.category,
    description: sanitizedDesc,
    severity,
    relatedRecordRef: input.relatedRecordRef,
    submissionTimestamp: now,
    status: "NEW",
    attachments: attachments.length > 0 ? attachments : undefined,
    visualRatings: input.visualRatings,
    isTestSubmission: !!input.isTestSubmission,
    createdAt: now,
    updatedAt: now
  };

  feedbackRepository.set(record.id, record);

  return {
    success: true,
    feedback: record,
    isDuplicate: false
  };
}

/**
 * Creates a formal tracking issue from one or more feedback items.
 */
export function createIssueFromFeedback(
  feedbackIdOrIds: string | string[],
  issueData: {
    title: string;
    description?: string;
    severity?: BetaIssueSeverity;
    assignedTo?: TaskAssignee;
  },
  actor: TaskAssignee,
  isTestIssue: boolean = false
): {
  success: boolean;
  issue?: BetaIssueRecord;
  isDuplicate?: boolean;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot create beta issues.`
    };
  }

  const ids = Array.isArray(feedbackIdOrIds) ? feedbackIdOrIds : [feedbackIdOrIds];
  const matchedFeedback: BetaFeedbackRecord[] = [];

  for (const id of ids) {
    const f = feedbackRepository.get(id) || Array.from(feedbackRepository.values()).find(x => x.feedbackId === id);
    if (f) matchedFeedback.push(f);
  }

  if (matchedFeedback.length === 0) {
    return { success: false, error: "No matching beta feedback records found to create issue from." };
  }

  const primaryFeedback = matchedFeedback[0];
  const now = new Date().toISOString();
  const sanitizedTitle = sanitizeSensitiveText(issueData.title.trim());

  // Duplicate Check: Check if an open issue with identical title and primary module already exists
  const existingIssues = Array.from(issueRepository.values());
  const existingDup = existingIssues.find(
    i => i.title.toLowerCase() === sanitizedTitle.toLowerCase() && i.featureModule === primaryFeedback.featureModule && i.status !== "CLOSED"
  );

  if (existingDup) {
    // Link feedback ID to existing issue without creating duplicate
    for (const f of matchedFeedback) {
      if (!existingDup.sourceFeedbackIds.includes(f.feedbackId)) {
        existingDup.sourceFeedbackIds.push(f.feedbackId);
      }
    }
    return {
      success: true,
      issue: existingDup,
      isDuplicate: true
    };
  }

  issueCounter++;
  const year = new Date().getFullYear();
  const issueNumber = `ISS-${year}-${String(issueCounter).padStart(4, "0")}`;
  const issueId = `iss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const severity: BetaIssueSeverity = issueData.severity || primaryFeedback.severity || "MEDIUM";

  const auditEntry: BetaIssueAuditEntry = {
    id: `ia_${Date.now()}_create`,
    timestamp: now,
    actor,
    action: "CREATED",
    toStatus: "NEW",
    toSeverity: severity,
    notes: `Issue created from feedback: ${matchedFeedback.map(f => f.feedbackId).join(", ")}.`
  };

  const newIssue: BetaIssueRecord = {
    id: issueId,
    issueId,
    issueNumber,
    title: sanitizedTitle,
    description: issueData.description ? sanitizeSensitiveText(issueData.description) : primaryFeedback.description,
    featureModule: primaryFeedback.featureModule,
    category: primaryFeedback.category,
    severity,
    status: "NEW",
    assignedTo: issueData.assignedTo,
    reportedBy: {
      uid: primaryFeedback.betaUserId,
      displayName: primaryFeedback.betaUserName,
      email: primaryFeedback.betaUserEmail
    },
    sourceFeedbackIds: matchedFeedback.map(f => f.feedbackId),
    auditTrail: [auditEntry],
    createdAt: now,
    updatedAt: now,
    isTestIssue
  };

  issueRepository.set(newIssue.id, newIssue);

  // Update feedback records to TRIAGED and link to issue
  for (const f of matchedFeedback) {
    f.status = "TRIAGED";
    f.linkedIssueId = newIssue.issueNumber;
    f.updatedAt = now;
    feedbackRepository.set(f.id, f);
  }

  return {
    success: true,
    issue: newIssue,
    isDuplicate: false
  };
}

/**
 * Assigns an issue to an administrator or engineer.
 */
export function assignBetaIssue(
  issueId: string,
  assignee: TaskAssignee,
  actor: TaskAssignee
): {
  success: boolean;
  issue?: BetaIssueRecord;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, error: `Unauthorized: User role "${actor.role}" cannot assign issues.` };
  }

  const issue = issueRepository.get(issueId) || Array.from(issueRepository.values()).find(i => i.issueNumber === issueId);
  if (!issue) {
    return { success: false, error: `Issue "${issueId}" not found.` };
  }

  const now = new Date().toISOString();
  issue.assignedTo = assignee;
  issue.updatedAt = now;

  const auditEntry: BetaIssueAuditEntry = {
    id: `ia_${Date.now()}_assign`,
    timestamp: now,
    actor,
    action: "ASSIGNED",
    notes: `Assigned issue to ${assignee.displayName} (${assignee.role}).`
  };
  issue.auditTrail.push(auditEntry);

  if (issue.status === "NEW") {
    issue.status = "TRIAGED";
  }

  issueRepository.set(issue.id, issue);

  return { success: true, issue };
}

/**
 * Updates an issue's severity with audit logging.
 */
export function updateBetaIssueSeverity(
  issueId: string,
  newSeverity: BetaIssueSeverity,
  actor: TaskAssignee,
  reason?: string
): {
  success: boolean;
  issue?: BetaIssueRecord;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, error: `Unauthorized: User role "${actor.role}" cannot change issue severity.` };
  }

  const issue = issueRepository.get(issueId) || Array.from(issueRepository.values()).find(i => i.issueNumber === issueId);
  if (!issue) {
    return { success: false, error: `Issue "${issueId}" not found.` };
  }

  const now = new Date().toISOString();
  const oldSeverity = issue.severity;
  issue.severity = newSeverity;
  issue.updatedAt = now;

  const auditEntry: BetaIssueAuditEntry = {
    id: `ia_${Date.now()}_sev`,
    timestamp: now,
    actor,
    action: "SEVERITY_CHANGED",
    fromSeverity: oldSeverity,
    toSeverity: newSeverity,
    notes: reason || `Severity changed from ${oldSeverity} to ${newSeverity}.`
  };
  issue.auditTrail.push(auditEntry);

  issueRepository.set(issue.id, issue);

  return { success: true, issue };
}

/**
 * Updates an issue's lifecycle status with role authorization and validation evidence.
 */
export function updateBetaIssueStatus(
  issueId: string,
  newStatus: BetaIssueStatus,
  actor: TaskAssignee,
  options?: {
    rootCause?: string;
    affectedComponent?: string;
    resolutionEvidence?: string;
    resolutionNotes?: string;
    notes?: string;
  }
): {
  success: boolean;
  issue?: BetaIssueRecord;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, error: `Unauthorized: User role "${actor.role}" cannot update issue status.` };
  }

  const issue = issueRepository.get(issueId) || Array.from(issueRepository.values()).find(i => i.issueNumber === issueId);
  if (!issue) {
    return { success: false, error: `Issue "${issueId}" not found.` };
  }

  const now = new Date().toISOString();
  const oldStatus = issue.status;

  // Resolving requires resolution details
  if (newStatus === "RESOLVED") {
    if (!options?.rootCause || !options.affectedComponent || !options.resolutionEvidence) {
      return {
        success: false,
        error: "Resolving an issue requires rootCause, affectedComponent, and resolutionEvidence."
      };
    }
    issue.rootCause = options.rootCause;
    issue.affectedComponent = options.affectedComponent;
    issue.resolutionEvidence = options.resolutionEvidence;
    issue.resolutionNotes = options.resolutionNotes || options.notes;
    issue.resolvedAt = now;
    issue.resolvedBy = actor;
  }

  issue.status = newStatus;
  issue.updatedAt = now;

  const auditEntry: BetaIssueAuditEntry = {
    id: `ia_${Date.now()}_status`,
    timestamp: now,
    actor,
    action: newStatus === "RESOLVED" ? "RESOLVED" : "STATUS_CHANGED",
    fromStatus: oldStatus,
    toStatus: newStatus,
    notes: options?.notes || `Status transitioned from ${oldStatus} to ${newStatus}.`
  };
  issue.auditTrail.push(auditEntry);

  issueRepository.set(issue.id, issue);

  // Sync associated feedback status
  for (const fId of issue.sourceFeedbackIds) {
    const feedback = Array.from(feedbackRepository.values()).find(f => f.feedbackId === fId);
    if (feedback) {
      feedback.status = newStatus;
      feedback.updatedAt = now;
      feedbackRepository.set(feedback.id, feedback);
    }
  }

  return { success: true, issue };
}

/**
 * Reopens an unresolved or regressed problem.
 */
export function reopenBetaIssue(
  issueId: string,
  actor: TaskAssignee,
  reason: string
): {
  success: boolean;
  issue?: BetaIssueRecord;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, error: `Unauthorized: User role "${actor.role}" cannot reopen issues.` };
  }

  if (!reason || reason.trim() === "") {
    return { success: false, error: "Reopening an issue requires a non-empty explanation/reason." };
  }

  const issue = issueRepository.get(issueId) || Array.from(issueRepository.values()).find(i => i.issueNumber === issueId);
  if (!issue) {
    return { success: false, error: `Issue "${issueId}" not found.` };
  }

  const now = new Date().toISOString();
  const oldStatus = issue.status;

  issue.status = "REOPENED";
  issue.reopenedAt = now;
  issue.reopenedReason = reason;
  issue.updatedAt = now;

  const auditEntry: BetaIssueAuditEntry = {
    id: `ia_${Date.now()}_reopen`,
    timestamp: now,
    actor,
    action: "REOPENED",
    fromStatus: oldStatus,
    toStatus: "REOPENED",
    notes: `Issue reopened: ${reason}`
  };
  issue.auditTrail.push(auditEntry);

  issueRepository.set(issue.id, issue);

  return { success: true, issue };
}

/**
 * Records a granular beta workflow event (attempted, successful, failed, abandoned).
 * Enforces separation of test validation runs from real beta operations.
 */
export function recordWorkflowEvent(eventInput: {
  operation: WorkflowOperationType;
  status: WorkflowExecutionStatus;
  userId: string;
  businessId?: string;
  metadata?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  isTestEvent?: boolean;
}): WorkflowEventRecord {
  const event: WorkflowEventRecord = {
    id: `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    operation: eventInput.operation,
    status: eventInput.status,
    userId: eventInput.userId,
    businessId: eventInput.businessId,
    metadata: eventInput.metadata,
    errorCode: eventInput.errorCode,
    errorMessage: eventInput.errorMessage ? sanitizeSensitiveText(eventInput.errorMessage) : undefined,
    durationMs: eventInput.durationMs,
    timestamp: new Date().toISOString(),
    isTestEvent: !!eventInput.isTestEvent
  };

  workflowEventRepository.push(event);
  return event;
}

/**
 * Computes beta workflow completion and health analytics.
 * Strictly excludes test execution events unless explicitly requested.
 */
export function computeBetaWorkflowAnalytics(options?: {
  includeTestEvents?: boolean;
}): BetaWorkflowAnalyticsSummary {
  const includeTest = !!options?.includeTestEvents;
  const filteredEvents = workflowEventRepository.filter(e => (includeTest ? true : !e.isTestEvent));

  const allOperations: WorkflowOperationType[] = [
    "business_search",
    "relevant_business_discovery",
    "prospect_save",
    "website_audit",
    "website_generation",
    "image_relevance_validation",
    "preview_creation",
    "website_edit",
    "outreach_draft_prepare",
    "crm_task_complete",
    "customer_onboarding_complete",
    "general_error"
  ];

  const breakdown: BetaWorkflowAnalyticsSummary["operationsBreakdown"] = {} as any;
  for (const op of allOperations) {
    breakdown[op] = { attempted: 0, successful: 0, failed: 0, abandoned: 0, successRate: 0 };
  }

  let totalOperations = 0;
  let totalAttempted = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalAbandoned = 0;
  const distinctUsers = new Set<string>();

  for (const event of filteredEvents) {
    totalOperations++;
    distinctUsers.add(event.userId);

    const b = breakdown[event.operation] || { attempted: 0, successful: 0, failed: 0, abandoned: 0, successRate: 0 };

    if (event.status === "ATTEMPTED") {
      totalAttempted++;
      b.attempted++;
    } else if (event.status === "SUCCESSFUL") {
      totalSuccessful++;
      b.successful++;
    } else if (event.status === "FAILED") {
      totalFailed++;
      b.failed++;
    } else if (event.status === "ABANDONED") {
      totalAbandoned++;
      b.abandoned++;
    }
    breakdown[event.operation] = b;
  }

  // Calculate success rates
  for (const op of allOperations) {
    const b = breakdown[op];
    const totalDone = b.successful + b.failed + b.abandoned;
    b.successRate = totalDone > 0 ? Math.round((b.successful / totalDone) * 100) : 0;
  }

  return {
    totalOperations,
    attempted: totalAttempted,
    successful: totalSuccessful,
    failed: totalFailed,
    abandoned: totalAbandoned,
    operationsBreakdown: breakdown,
    activeTestersCount: distinctUsers.size,
    isTestDataExcluded: !includeTest
  };
}

/**
 * Returns Administrator Issue Dashboard Data.
 * Enforces role authorization (Admins / Staff only).
 */
export function getAdminIssueDashboardData(
  filters: {
    featureModule?: BetaFeatureModule;
    category?: BetaFeedbackCategory;
    severity?: BetaIssueSeverity;
    status?: BetaIssueStatus;
    searchQuery?: string;
  },
  actor: TaskAssignee
): {
  success: boolean;
  issues?: BetaIssueRecord[];
  metrics?: {
    totalIssues: number;
    openIssues: number;
    criticalIssues: number;
    readyForRetestCount: number;
    resolvedCount: number;
    feedbackCount: number;
    averageVisualRatings?: Record<string, number>;
  };
  error?: string;
  status: number;
} {
  const isAdmin =
    actor.role === "Admin" ||
    actor.role === "admin" ||
    (actor as any).role === "SUPER_ADMIN" ||
    (actor as any).role === "staff";

  if (!isAdmin) {
    return {
      success: false,
      status: 403,
      error: "Access denied: Administrator privileges required to access the Beta Issue Dashboard."
    };
  }

  let issues = Array.from(issueRepository.values());

  if (filters.featureModule) {
    issues = issues.filter(i => i.featureModule === filters.featureModule);
  }
  if (filters.category) {
    issues = issues.filter(i => i.category === filters.category);
  }
  if (filters.severity) {
    issues = issues.filter(i => i.severity === filters.severity);
  }
  if (filters.status) {
    issues = issues.filter(i => i.status === filters.status);
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    issues = issues.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }

  // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
  const severityWeight: Record<BetaIssueSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };
  issues.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  const allIssues = Array.from(issueRepository.values());
  const allFeedback = Array.from(feedbackRepository.values());

  // Compute visual rating averages from feedback
  const feedbackWithRatings = allFeedback.filter(f => !!f.visualRatings);
  let averageVisualRatings: Record<string, number> | undefined;

  if (feedbackWithRatings.length > 0) {
    const totals: Record<string, number> = {
      professionalAppearance: 0,
      businessRelevance: 0,
      heroSectionQuality: 0,
      imageRelevance: 0,
      typography: 0,
      layout: 0,
      mobileResponsiveness: 0,
      contentAccuracy: 0,
      overallPresentationQuality: 0
    };

    for (const f of feedbackWithRatings) {
      const vr = f.visualRatings!;
      totals.professionalAppearance += vr.professionalAppearance;
      totals.businessRelevance += vr.businessRelevance;
      totals.heroSectionQuality += vr.heroSectionQuality;
      totals.imageRelevance += vr.imageRelevance;
      totals.typography += vr.typography;
      totals.layout += vr.layout;
      totals.mobileResponsiveness += vr.mobileResponsiveness;
      totals.contentAccuracy += vr.contentAccuracy;
      totals.overallPresentationQuality += vr.overallPresentationQuality;
    }

    const count = feedbackWithRatings.length;
    averageVisualRatings = {
      professionalAppearance: Math.round((totals.professionalAppearance / count) * 10) / 10,
      businessRelevance: Math.round((totals.businessRelevance / count) * 10) / 10,
      heroSectionQuality: Math.round((totals.heroSectionQuality / count) * 10) / 10,
      imageRelevance: Math.round((totals.imageRelevance / count) * 10) / 10,
      typography: Math.round((totals.typography / count) * 10) / 10,
      layout: Math.round((totals.layout / count) * 10) / 10,
      mobileResponsiveness: Math.round((totals.mobileResponsiveness / count) * 10) / 10,
      contentAccuracy: Math.round((totals.contentAccuracy / count) * 10) / 10,
      overallPresentationQuality: Math.round((totals.overallPresentationQuality / count) * 10) / 10
    };
  }

  const metrics = {
    totalIssues: allIssues.length,
    openIssues: allIssues.filter(i => i.status !== "RESOLVED" && i.status !== "CLOSED").length,
    criticalIssues: allIssues.filter(i => i.severity === "CRITICAL" && i.status !== "CLOSED").length,
    readyForRetestCount: allIssues.filter(i => i.status === "READY_FOR_RETEST").length,
    resolvedCount: allIssues.filter(i => i.status === "RESOLVED").length,
    feedbackCount: allFeedback.length,
    averageVisualRatings
  };

  return {
    success: true,
    status: 200,
    issues,
    metrics
  };
}

/**
 * Returns feedback for a specific tester.
 * Enforces privacy: users can only view their own feedback unless they are Admins.
 */
export function getBetaUserFeedbackList(
  targetUserId: string,
  requestingUser: { uid: string; role?: string }
): {
  success: boolean;
  status: number;
  feedback?: BetaFeedbackRecord[];
  error?: string;
} {
  const isAdmin = requestingUser.role === "Admin" || requestingUser.role === "admin";
  const isOwner = requestingUser.uid === targetUserId;

  if (!isOwner && !isAdmin) {
    return {
      success: false,
      status: 403,
      error: "Access denied: You are not authorized to view another tester's feedback records."
    };
  }

  const all = Array.from(feedbackRepository.values());
  const userFeedback = all.filter(f => f.betaUserId === targetUserId);

  return {
    success: true,
    status: 200,
    feedback: userFeedback
  };
}

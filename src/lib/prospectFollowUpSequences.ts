import {
  Business,
  FollowUpSequence,
  FollowUpSequenceStep,
  FollowUpSequenceStatus,
  ProspectSequenceEnrollment,
  SequenceEnrollmentStatus,
  SequenceEnrollmentHistoryEntry,
  TaskAssignee,
  FollowUpTask,
  FollowUpTaskType,
  FollowUpTaskPriority
} from "../types";
import { isUserAuthorizedForTask, createFollowUpTask, updateFollowUpTaskStatus } from "./prospectFollowUpTasks";
import { addBusinessActivity } from "./prospectCrm";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * MICRO-PHASE 13B: FOLLOW-UP SEQUENCES AND SALES PIPELINE AUTOMATION
 * 
 * Manages reusable, multi-step sales outreach sequences, strict prospect eligibility,
 * safe task generation intervals, automatic stop-on-reply/opt-out triggers,
 * and comprehensive audit history without sending unauthorized messages.
 */

export const DEFAULT_FOLLOW_UP_SEQUENCES: FollowUpSequence[] = [
  {
    id: "seq_standard_multitouch",
    name: "Standard Multi-Touch Follow-Up",
    description: "Balanced phone, email, and WhatsApp touchpoints for newly qualified local businesses.",
    status: "ACTIVE",
    targetChannel: "multi_channel",
    completionConditions: {
      stopOnReply: true,
      stopOnOptOut: true,
      stopOnDisqualification: true,
      stopOnDealWon: true,
      stopOnMeetingBooked: true
    },
    steps: [
      {
        stepNumber: 1,
        title: "Initial Outreach Call & Value Pitch",
        actionType: "manual_task",
        taskType: "call",
        priority: "HIGH",
        delayDays: 0,
        taskDescriptionTemplate: "Call decision-maker. Review digital audit findings and offer to send tailored live website prototype.",
        requiresManualApproval: false
      },
      {
        stepNumber: 2,
        title: "Send Tailored Prototype Link & Audit Summary",
        actionType: "approved_communication",
        taskType: "email",
        channel: "email",
        priority: "MEDIUM",
        delayDays: 2,
        taskDescriptionTemplate: "Review and approve outreach email containing the verified prototype URL and speed benchmarks.",
        requiresManualApproval: true
      },
      {
        stepNumber: 3,
        title: "Direct WhatsApp Follow-Up Check-In",
        actionType: "approved_communication",
        taskType: "whatsapp",
        channel: "whatsapp",
        priority: "HIGH",
        delayDays: 3,
        taskDescriptionTemplate: "Review and send 1-tap WhatsApp reminder asking if they reviewed the mobile layout preview.",
        requiresManualApproval: true
      },
      {
        stepNumber: 4,
        title: "Executive Closing Call / Final Decision Check",
        actionType: "manual_task",
        taskType: "call",
        priority: "URGENT",
        delayDays: 4,
        taskDescriptionTemplate: "Closing phone consultation. Discuss setup options, custom domain, and launch timeline.",
        requiresManualApproval: false
      }
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "seq_post_preview_closing",
    name: "Post-Preview Demo & Proposal Sequence",
    description: "Follow-up sequence after a prospect has accessed and viewed their live website preview.",
    status: "ACTIVE",
    targetChannel: "multi_channel",
    completionConditions: {
      stopOnReply: true,
      stopOnOptOut: true,
      stopOnDisqualification: true,
      stopOnDealWon: true
    },
    steps: [
      {
        stepNumber: 1,
        title: "Review Preview Analytics & Custom Proposal",
        actionType: "manual_task",
        taskType: "review",
        priority: "HIGH",
        delayDays: 1,
        taskDescriptionTemplate: "Check prospect preview view count and prepare package tier options.",
        requiresManualApproval: false
      },
      {
        stepNumber: 2,
        title: "Proposal Walkthrough & Q&A Call",
        actionType: "manual_task",
        taskType: "meeting",
        priority: "HIGH",
        delayDays: 2,
        taskDescriptionTemplate: "Schedule 15-minute Google Meet or phone walkthrough to close subscription contract.",
        requiresManualApproval: false
      }
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    id: "seq_cold_reengagement",
    name: "Cold Prospect Re-Engagement",
    description: "Gentle re-engagement for dormant prospects with updated competitive insights.",
    status: "ACTIVE",
    targetChannel: "email",
    completionConditions: {
      stopOnReply: true,
      stopOnOptOut: true,
      stopOnDisqualification: true,
      stopOnDealWon: true
    },
    steps: [
      {
        stepNumber: 1,
        title: "Re-engagement Insight Email",
        actionType: "approved_communication",
        taskType: "email",
        channel: "email",
        priority: "LOW",
        delayDays: 7,
        taskDescriptionTemplate: "Send updated market snapshot comparing local competitor site speed and mobile features.",
        requiresManualApproval: true
      },
      {
        stepNumber: 2,
        title: "Final Reconnect Check-in Call",
        actionType: "manual_task",
        taskType: "call",
        priority: "MEDIUM",
        delayDays: 5,
        taskDescriptionTemplate: "Brief direct call to check if digital refresh is planned for upcoming business quarter.",
        requiresManualApproval: false
      }
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z"
  }
];

const SEQUENCE_STORAGE_KEY = "sitescout_custom_sequences";
const inMemoryCustomSequences: Map<string, FollowUpSequence> = new Map();

/**
 * Loads available sequences (combining defaults with user custom sequences).
 */
export function getAvailableSequences(): FollowUpSequence[] {
  const customMap = new Map<string, FollowUpSequence>();

  // Load from in-memory cache
  inMemoryCustomSequences.forEach((seq, id) => {
    customMap.set(id, seq);
  });

  // Load from localStorage if present
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SEQUENCE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((seq: FollowUpSequence) => {
            if (seq && seq.id) {
              customMap.set(seq.id, seq);
            }
          });
        }
      }
    }
  } catch (e) {}

  const nonOverlappingDefaults = DEFAULT_FOLLOW_UP_SEQUENCES.filter(d => !customMap.has(d.id));
  return [...nonOverlappingDefaults, ...Array.from(customMap.values())];
}

/**
 * Retrieves a sequence by its unique ID.
 */
export function getSequenceById(sequenceId: string): FollowUpSequence | undefined {
  const all = getAvailableSequences();
  return all.find(s => s.id === sequenceId);
}

/**
 * Creates and persists a reusable follow-up sequence.
 */
export function createFollowUpSequence(
  input: {
    name: string;
    description?: string;
    status?: FollowUpSequenceStatus;
    targetChannel?: FollowUpSequence["targetChannel"];
    steps: FollowUpSequenceStep[];
    completionConditions?: FollowUpSequence["completionConditions"];
  },
  actor?: TaskAssignee
): { success: boolean; sequence?: FollowUpSequence; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot create follow-up sequences.`
    };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Sequence name is required." };
  }

  if (!input.steps || input.steps.length === 0) {
    return { success: false, error: "Sequence must have at least one step." };
  }

  // Safe automation rule: Verify all approved_communication steps explicitly have requiresManualApproval=true
  const validatedSteps = input.steps.map((step, idx) => ({
    ...step,
    stepNumber: idx + 1,
    requiresManualApproval: step.actionType === "approved_communication" ? true : (step.requiresManualApproval ?? false)
  }));

  const now = new Date().toISOString();
  const newSeq: FollowUpSequence = {
    id: `seq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim(),
    description: input.description?.trim(),
    status: input.status || "ACTIVE",
    targetChannel: input.targetChannel || "multi_channel",
    steps: validatedSteps,
    completionConditions: {
      stopOnReply: input.completionConditions?.stopOnReply ?? true,
      stopOnOptOut: input.completionConditions?.stopOnOptOut ?? true,
      stopOnDisqualification: input.completionConditions?.stopOnDisqualification ?? true,
      stopOnDealWon: input.completionConditions?.stopOnDealWon ?? true,
      stopOnMeetingBooked: input.completionConditions?.stopOnMeetingBooked ?? true
    },
    createdBy: actor,
    createdAt: now,
    updatedAt: now
  };

  inMemoryCustomSequences.set(newSeq.id, newSeq);

  try {
    if (typeof localStorage !== "undefined") {
      const existing = getAvailableSequences().filter(s => !DEFAULT_FOLLOW_UP_SEQUENCES.some(d => d.id === s.id));
      localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify([...existing, newSeq]));
    }
  } catch (e) {}

  return { success: true, sequence: newSeq };
}

/**
 * Checks prospect eligibility for follow-up sequence enrollment or execution.
 */
export function checkProspectSequenceEligibility(business: Business): {
  eligible: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  // 1. Legal / Opt-out exclusion
  if (business.doNotContact === true) {
    blockers.push("Prospect has requested Do-Not-Contact (opt-out / legal exclusion).");
  }

  // 2. Disqualified prospect
  if (business.qualificationStatus === "DISQUALIFIED") {
    blockers.push("Prospect is DISQUALIFIED from outreach sequences.");
  }

  // 3. Lost outcome exclusion
  if (business.dealOutcome === "LOST") {
    blockers.push("Prospect deal outcome is marked LOST.");
  }

  return {
    eligible: blockers.length === 0,
    blockers
  };
}

/**
 * Helper to calculate scheduled date string given delay in days.
 */
export function calculateStepDueDate(baseDate: Date | string, delayDays: number, delayHours: number = 0): string {
  const d = typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate.getTime());
  d.setDate(d.getDate() + delayDays);
  if (delayHours > 0) {
    d.setHours(d.getHours() + delayHours);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Enrolls a prospect in a follow-up sequence.
 * Enforces role authorization, prospect eligibility, and auto-generates Step 1 task.
 */
export function enrollProspectInSequence(
  business: Business,
  sequenceIdOrSeq: string | FollowUpSequence,
  actor: TaskAssignee,
  options?: {
    customAssignee?: TaskAssignee;
    startDate?: string;
  }
): {
  success: boolean;
  business: Business;
  enrollment?: ProspectSequenceEnrollment;
  task?: FollowUpTask;
  error?: string;
} {
  // 1. Authorization check
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot enroll prospects in sequences.`
    };
  }

  // 2. Sequence lookup & status check
  const sequence = typeof sequenceIdOrSeq === "string" ? getSequenceById(sequenceIdOrSeq) : sequenceIdOrSeq;
  if (!sequence) {
    return {
      success: false,
      business,
      error: `Sequence "${typeof sequenceIdOrSeq === "string" ? sequenceIdOrSeq : "unknown"}" not found.`
    };
  }

  if (sequence.status !== "ACTIVE") {
    return {
      success: false,
      business,
      error: `Cannot enroll in sequence "${sequence.name}": Status is ${sequence.status} (must be ACTIVE).`
    };
  }

  // 3. Prospect eligibility check
  const eligibility = checkProspectSequenceEligibility(business);
  if (!eligibility.eligible) {
    return {
      success: false,
      business,
      error: `Prospect enrollment blocked: ${eligibility.blockers.join("; ")}`
    };
  }

  const existingEnrollments = business.sequenceEnrollments || [];

  // 4. Duplicate enrollment check:
  // Cannot be actively enrolled in the exact same sequence simultaneously
  const activeExisting = existingEnrollments.find(e => e.sequenceId === sequence.id && e.status === "ACTIVE");
  if (activeExisting) {
    return {
      success: false,
      business,
      error: `Prospect is already actively enrolled in "${sequence.name}" (Enrollment ID: ${activeExisting.id}).`
    };
  }

  const now = new Date().toISOString();
  const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const step1 = sequence.steps[0];
  const startDate = options?.startDate || now;
  const step1DueDate = calculateStepDueDate(startDate, step1.delayDays, step1.delayHours || 0);

  // 5. Generate Step 1 Follow-Up Task
  const step1IdempotencyKey = `${enrollmentId}_step_${step1.stepNumber}`;
  const taskRes = createFollowUpTask(
    business,
    {
      title: `[${sequence.name}] Step 1: ${step1.title}`,
      description: step1.taskDescriptionTemplate || `Sequence step 1 for ${business.name}`,
      dueDate: step1DueDate,
      dueTime: "10:00",
      type: step1.taskType || "call",
      priority: step1.priority || "HIGH",
      assignedTo: options?.customAssignee || actor,
      idempotencyKey: step1IdempotencyKey
    },
    actor
  );

  const updatedBizWithTask = taskRes.business;
  const generatedTaskId = taskRes.task?.id;

  const initialHistory: SequenceEnrollmentHistoryEntry = {
    id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "enrolled",
    timestamp: now,
    actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
    details: `Enrolled prospect in sequence "${sequence.name}". Step 1 scheduled for ${step1DueDate}.`
  };

  const newEnrollment: ProspectSequenceEnrollment = {
    id: enrollmentId,
    sequenceId: sequence.id,
    sequenceName: sequence.name,
    prospectId: business.id,
    businessId: business.id,
    status: "ACTIVE",
    enrolledAt: now,
    enrolledBy: actor,
    currentStepNumber: 1,
    completedStepNumbers: [],
    lastStepExecutedAt: now,
    nextScheduledStepAt: `${step1DueDate}T10:00:00`,
    nextScheduledStepNumber: 1,
    generatedTaskIds: generatedTaskId ? [generatedTaskId] : [],
    history: [initialHistory]
  };

  const updatedEnrollments = [newEnrollment, ...existingEnrollments];
  const finalBusiness: Business = {
    ...updatedBizWithTask,
    sequenceEnrollments: updatedEnrollments,
    activeSequenceEnrollmentId: enrollmentId
  };

  // Sync to localStorage & Firestore
  try {
    localStorage.setItem(`sitescout_enrollments_${business.id}`, JSON.stringify(updatedEnrollments));
    if (db && !business.id.startsWith("demo-")) {
      setDoc(doc(db, "businesses", business.id, "enrollments", enrollmentId), newEnrollment).catch(() => {});
    }
  } catch (e) {}

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "follow_up_sent",
      title: `Sequence Enrolled: ${sequence.name}`,
      description: `Prospect enrolled by ${actor.displayName || "Sales Agent"}. Step 1 task created for ${step1DueDate}.`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: finalBusiness,
    enrollment: newEnrollment,
    task: taskRes.task
  };
}

/**
 * Safely advances an enrolled prospect to the next sequence step.
 * Strictly verifies eligibility, enforces manual approval for communication steps,
 * and creates follow-up tasks according to configured intervals.
 */
export function advanceSequenceEnrollment(
  business: Business,
  enrollmentId: string,
  actor: TaskAssignee,
  options?: {
    isMessageApproved?: boolean;
    customNote?: string;
  }
): {
  success: boolean;
  business: Business;
  enrollment?: ProspectSequenceEnrollment;
  task?: FollowUpTask;
  isCompleted?: boolean;
  error?: string;
} {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot advance sequences.`
    };
  }

  const enrollments = business.sequenceEnrollments || [];
  const targetIdx = enrollments.findIndex(e => e.id === enrollmentId);
  if (targetIdx < 0) {
    return { success: false, business, error: `Enrollment ID "${enrollmentId}" not found.` };
  }

  const enrollment = enrollments[targetIdx];
  const now = new Date().toISOString();

  // 1. Ineligible prospect re-check
  const eligibility = checkProspectSequenceEligibility(business);
  if (!eligibility.eligible) {
    // Automatically transition enrollment to INELIGIBLE
    const ineligibleHistory: SequenceEnrollmentHistoryEntry = {
      id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "marked_ineligible",
      timestamp: now,
      actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
      details: `Sequence halted: Prospect became ineligible (${eligibility.blockers.join("; ")})`
    };

    const updatedEnrollment: ProspectSequenceEnrollment = {
      ...enrollment,
      status: "INELIGIBLE",
      ineligibleAt: now,
      ineligibleReason: eligibility.blockers.join("; "),
      history: [...enrollment.history, ineligibleHistory]
    };

    const newEnrollments = [...enrollments];
    newEnrollments[targetIdx] = updatedEnrollment;

    return {
      success: false,
      business: { ...business, sequenceEnrollments: newEnrollments },
      enrollment: updatedEnrollment,
      error: `Sequence halted: Prospect is ineligible (${eligibility.blockers.join("; ")}).`
    };
  }

  // 2. State validation
  if (enrollment.status === "PAUSED") {
    return {
      success: false,
      business,
      error: "Sequence enrollment is PAUSED. Resume the sequence before advancing steps."
    };
  }

  if (enrollment.status === "COMPLETED" || enrollment.status === "CANCELLED" || enrollment.status === "INELIGIBLE") {
    return {
      success: false,
      business,
      error: `Cannot advance sequence enrollment with status "${enrollment.status}".`
    };
  }

  const sequence = getSequenceById(enrollment.sequenceId);
  if (!sequence) {
    return { success: false, business, error: `Sequence definition "${enrollment.sequenceId}" not found.` };
  }

  const currentStep = sequence.steps.find(s => s.stepNumber === enrollment.currentStepNumber);
  if (!currentStep) {
    return { success: false, business, error: `Sequence step ${enrollment.currentStepNumber} not found.` };
  }

  // 3. Approval Requirement Invariant:
  // If current step is approved_communication, explicit approval is mandatory before advancement
  if (currentStep.actionType === "approved_communication" && currentStep.requiresManualApproval) {
    if (!options?.isMessageApproved) {
      return {
        success: false,
        business,
        error: `Step ${currentStep.stepNumber} ("${currentStep.title}") requires explicit manual approval before automated communication dispatch.`
      };
    }
  }

  const completedSteps = Array.from(new Set([...enrollment.completedStepNumbers, currentStep.stepNumber]));
  const nextStep = sequence.steps.find(s => s.stepNumber === currentStep.stepNumber + 1);

  if (!nextStep) {
    // All steps completed!
    const completionHistory: SequenceEnrollmentHistoryEntry = {
      id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: "completed",
      timestamp: now,
      actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
      details: `Sequence "${sequence.name}" completed successfully. All ${sequence.steps.length} steps executed.`
    };

    const completedEnrollment: ProspectSequenceEnrollment = {
      ...enrollment,
      status: "COMPLETED",
      completedStepNumbers: completedSteps,
      completedAt: now,
      lastStepExecutedAt: now,
      nextScheduledStepAt: undefined,
      nextScheduledStepNumber: undefined,
      history: [...enrollment.history, completionHistory]
    };

    const updatedList = [...enrollments];
    updatedList[targetIdx] = completedEnrollment;

    const updatedBiz: Business = {
      ...business,
      sequenceEnrollments: updatedList
    };

    return {
      success: true,
      business: updatedBiz,
      enrollment: completedEnrollment,
      isCompleted: true
    };
  }

  // Next step exists -> schedule and generate task for next step
  const nextDueDate = calculateStepDueDate(now, nextStep.delayDays, nextStep.delayHours || 0);
  const nextTaskIdempotencyKey = `${enrollment.id}_step_${nextStep.stepNumber}`;

  const taskRes = createFollowUpTask(
    business,
    {
      title: `[${sequence.name}] Step ${nextStep.stepNumber}: ${nextStep.title}`,
      description: nextStep.taskDescriptionTemplate || `Sequence step ${nextStep.stepNumber} for ${business.name}`,
      dueDate: nextDueDate,
      dueTime: "10:00",
      type: nextStep.taskType || "call",
      priority: nextStep.priority || "MEDIUM",
      assignedTo: actor,
      idempotencyKey: nextTaskIdempotencyKey
    },
    actor
  );

  const updatedBizWithTask = taskRes.business;
  const newTaskId = taskRes.task?.id;

  const advanceHistory: SequenceEnrollmentHistoryEntry = {
    id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "step_advanced",
    timestamp: now,
    actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
    details: `Advanced from Step ${currentStep.stepNumber} to Step ${nextStep.stepNumber} ("${nextStep.title}"). Next due: ${nextDueDate}.${options?.customNote ? ` Note: ${options.customNote}` : ""}`
  };

  const advancedEnrollment: ProspectSequenceEnrollment = {
    ...enrollment,
    currentStepNumber: nextStep.stepNumber,
    completedStepNumbers: completedSteps,
    lastStepExecutedAt: now,
    nextScheduledStepAt: `${nextDueDate}T10:00:00`,
    nextScheduledStepNumber: nextStep.stepNumber,
    generatedTaskIds: newTaskId ? [...enrollment.generatedTaskIds, newTaskId] : enrollment.generatedTaskIds,
    history: [...enrollment.history, advanceHistory]
  };

  const updatedEnrollments = [...(updatedBizWithTask.sequenceEnrollments || enrollments)];
  const enrollIdx = updatedEnrollments.findIndex(e => e.id === enrollmentId);
  if (enrollIdx >= 0) {
    updatedEnrollments[enrollIdx] = advancedEnrollment;
  }

  const finalBiz: Business = {
    ...updatedBizWithTask,
    sequenceEnrollments: updatedEnrollments
  };

  return {
    success: true,
    business: finalBiz,
    enrollment: advancedEnrollment,
    task: taskRes.task,
    isCompleted: false
  };
}

/**
 * Pauses an active sequence enrollment.
 */
export function pauseSequenceEnrollment(
  business: Business,
  enrollmentId: string,
  actor: TaskAssignee,
  reason?: string
): { success: boolean; business: Business; enrollment?: ProspectSequenceEnrollment; error?: string } {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, business, error: `Unauthorized: User role "${actor.role}" cannot pause sequences.` };
  }

  const enrollments = business.sequenceEnrollments || [];
  const targetIdx = enrollments.findIndex(e => e.id === enrollmentId);
  if (targetIdx < 0) return { success: false, business, error: "Enrollment not found." };

  const enrollment = enrollments[targetIdx];
  if (enrollment.status !== "ACTIVE") {
    return { success: false, business, error: `Cannot pause enrollment with status "${enrollment.status}".` };
  }

  const now = new Date().toISOString();
  const pauseHistory: SequenceEnrollmentHistoryEntry = {
    id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "paused",
    timestamp: now,
    actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
    details: `Sequence paused by ${actor.displayName || "User"}.${reason ? ` Reason: ${reason}` : ""}`
  };

  const updatedEnrollment: ProspectSequenceEnrollment = {
    ...enrollment,
    status: "PAUSED",
    pausedAt: now,
    pausedReason: reason || "Paused by sales representative.",
    history: [...enrollment.history, pauseHistory]
  };

  const updatedList = [...enrollments];
  updatedList[targetIdx] = updatedEnrollment;

  return {
    success: true,
    business: { ...business, sequenceEnrollments: updatedList },
    enrollment: updatedEnrollment
  };
}

/**
 * Resumes a paused sequence enrollment after re-verifying prospect eligibility.
 */
export function resumeSequenceEnrollment(
  business: Business,
  enrollmentId: string,
  actor: TaskAssignee
): { success: boolean; business: Business; enrollment?: ProspectSequenceEnrollment; error?: string } {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, business, error: `Unauthorized: User role "${actor.role}" cannot resume sequences.` };
  }

  const enrollments = business.sequenceEnrollments || [];
  const targetIdx = enrollments.findIndex(e => e.id === enrollmentId);
  if (targetIdx < 0) return { success: false, business, error: "Enrollment not found." };

  const enrollment = enrollments[targetIdx];
  if (enrollment.status !== "PAUSED") {
    return { success: false, business, error: `Cannot resume enrollment with status "${enrollment.status}".` };
  }

  const eligibility = checkProspectSequenceEligibility(business);
  if (!eligibility.eligible) {
    return {
      success: false,
      business,
      error: `Cannot resume: Prospect is ineligible (${eligibility.blockers.join("; ")}).`
    };
  }

  const now = new Date().toISOString();
  const resumeHistory: SequenceEnrollmentHistoryEntry = {
    id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "resumed",
    timestamp: now,
    actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
    details: `Sequence resumed by ${actor.displayName || "User"}.`
  };

  const updatedEnrollment: ProspectSequenceEnrollment = {
    ...enrollment,
    status: "ACTIVE",
    pausedAt: undefined,
    pausedReason: undefined,
    history: [...enrollment.history, resumeHistory]
  };

  const updatedList = [...enrollments];
  updatedList[targetIdx] = updatedEnrollment;

  return {
    success: true,
    business: { ...business, sequenceEnrollments: updatedList },
    enrollment: updatedEnrollment
  };
}

/**
 * Cancels a sequence enrollment and safely cancels open tasks generated by it.
 */
export function cancelSequenceEnrollment(
  business: Business,
  enrollmentId: string,
  actor: TaskAssignee,
  reason?: string
): { success: boolean; business: Business; enrollment?: ProspectSequenceEnrollment; error?: string } {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return { success: false, business, error: `Unauthorized: User role "${actor.role}" cannot cancel sequences.` };
  }

  const enrollments = business.sequenceEnrollments || [];
  const targetIdx = enrollments.findIndex(e => e.id === enrollmentId);
  if (targetIdx < 0) return { success: false, business, error: "Enrollment not found." };

  const enrollment = enrollments[targetIdx];
  const now = new Date().toISOString();

  const cancelHistory: SequenceEnrollmentHistoryEntry = {
    id: `seq_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "cancelled",
    timestamp: now,
    actor: { uid: actor.uid, displayName: actor.displayName, role: actor.role },
    details: `Sequence cancelled.${reason ? ` Reason: ${reason}` : ""}`
  };

  const updatedEnrollment: ProspectSequenceEnrollment = {
    ...enrollment,
    status: "CANCELLED",
    cancelledAt: now,
    cancelledReason: reason || "Cancelled by user.",
    history: [...enrollment.history, cancelHistory]
  };

  const updatedList = [...enrollments];
  updatedList[targetIdx] = updatedEnrollment;

  // Safely cancel open tasks generated by this enrollment
  let currentBiz: Business = { ...business, sequenceEnrollments: updatedList };
  if (enrollment.generatedTaskIds && enrollment.generatedTaskIds.length > 0) {
    enrollment.generatedTaskIds.forEach(taskId => {
      const task = (currentBiz.followUpTasks || []).find(t => t.id === taskId);
      if (task && task.status === "OPEN") {
        const cancelTaskRes = updateFollowUpTaskStatus(
          currentBiz,
          taskId,
          "CANCELLED",
          actor,
          `Cancelled due to sequence cancellation: ${reason || "User action"}`
        );
        if (cancelTaskRes.success) {
          currentBiz = cancelTaskRes.business;
        }
      }
    });
  }

  return {
    success: true,
    business: currentBiz,
    enrollment: updatedEnrollment
  };
}

/**
 * Handles inbound reply, opt-out, or status change events by stopping or pausing sequences.
 * Guarantees no further automated sequence actions occur once a prospect replies or opts out.
 */
export function handleSequenceReplyOrOptOut(
  business: Business,
  trigger: "reply" | "opt_out" | "disqualified" | "deal_won" | "reply_requires_review",
  actor?: TaskAssignee,
  details?: string,
  options?: { pauseOnly?: boolean }
): { success: boolean; business: Business; stoppedEnrollmentsCount: number; pausedEnrollmentsCount: number } {
  const enrollments = business.sequenceEnrollments || [];
  let updatedBiz = { ...business };
  let stoppedCount = 0;
  let pausedCount = 0;
  const now = new Date().toISOString();

  // If prospect opted out, set persistent suppression flag on business record
  if (trigger === "opt_out") {
    updatedBiz.doNotContact = true;
  }

  enrollments.forEach(enrollment => {
    if (enrollment.status !== "ACTIVE" && enrollment.status !== "PAUSED") return;

    const sequence = getSequenceById(enrollment.sequenceId);
    const conditions = sequence?.completionConditions;

    // Check if reply requires review and should pause rather than cancel
    const shouldPauseForReview = 
      (trigger === "reply_requires_review" || (trigger === "reply" && options?.pauseOnly === true)) &&
      enrollment.status === "ACTIVE";

    if (shouldPauseForReview) {
      pausedCount++;
      const pauseReason = `Sequence paused for human review: Prospect replied (${details || "Inbound inquiry pending agent evaluation"}).`;
      const pauseRes = pauseSequenceEnrollment(
        updatedBiz,
        enrollment.id,
        actor || { uid: "system", displayName: "Automation Sentinel", role: "Admin" },
        pauseReason
      );
      if (pauseRes.success) {
        updatedBiz = pauseRes.business;
      }
      return;
    }

    let shouldStop = false;
    let stopReason = "";

    if (trigger === "reply" && conditions?.stopOnReply !== false) {
      shouldStop = true;
      stopReason = `Stopped automatically: Prospect replied to outreach (${details || "Inbound message received"}).`;
    } else if (trigger === "opt_out" && conditions?.stopOnOptOut !== false) {
      shouldStop = true;
      stopReason = `Stopped automatically: Prospect opted out / requested Do-Not-Contact.`;
    } else if (trigger === "disqualified" && conditions?.stopOnDisqualification !== false) {
      shouldStop = true;
      stopReason = `Halted automatically: Prospect marked DISQUALIFIED.`;
    } else if (trigger === "deal_won" && conditions?.stopOnDealWon !== false) {
      shouldStop = true;
      stopReason = `Completed automatically: Prospect won / deal closed successfully.`;
    }

    if (shouldStop) {
      stoppedCount++;
      const res = cancelSequenceEnrollment(
        updatedBiz,
        enrollment.id,
        actor || { uid: "system", displayName: "Automation Sentinel", role: "Admin" },
        stopReason
      );
      if (res.success) {
        updatedBiz = res.business;
      }
    }
  });

  return {
    success: true,
    business: updatedBiz,
    stoppedEnrollmentsCount: stoppedCount,
    pausedEnrollmentsCount: pausedCount
  };
}

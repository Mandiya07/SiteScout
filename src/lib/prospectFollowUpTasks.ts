import {
  Business,
  FollowUpTask,
  FollowUpTaskType,
  FollowUpTaskStatus,
  FollowUpTaskPriority,
  TaskAssignee,
  TaskHistoryEntry,
  TaskHistoryAction,
  TaskReminderConfig
} from "../types";
import { AUTHORIZED_OUTREACH_ROLES, UNAUTHORIZED_OUTREACH_ROLES } from "./prospectOutreachDelivery";
import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 13A: PROSPECT FOLLOW-UP SCHEDULING AND TASK MANAGEMENT
 * 
 * Manages the canonical task lifecycle for sales representatives, agency leads,
 * and account managers to schedule, assign, reschedule, track, and complete
 * follow-up activities without losing sales opportunities.
 */

export function isUserAuthorizedForTask(role?: string): boolean {
  if (!role) return true;
  const lowerRole = role.toLowerCase();
  if (
    UNAUTHORIZED_OUTREACH_ROLES.map(r => r.toLowerCase()).includes(lowerRole) ||
    lowerRole.includes("unauthorized") ||
    lowerRole.includes("restricted") ||
    lowerRole.includes("guest") ||
    lowerRole.includes("read-only") ||
    lowerRole.includes("viewer")
  ) {
    return false;
  }
  return true;
}

/**
 * Calculates unix timestamp in milliseconds for a due date, time, and timezone.
 */
export function calculateDueTimestamp(dueDate: string, dueTime?: string, timeZone?: string): number {
  try {
    let dateStr = dueDate.trim();
    if (dateStr.includes("T")) {
      // Already an ISO string
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) return parsed;
    }
    
    const timeStr = dueTime ? dueTime.trim() : "09:00";
    const combined = `${dateStr.split("T")[0]}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}`;
    const parsed = Date.parse(combined);
    if (!isNaN(parsed)) {
      return parsed;
    }
  } catch (e) {}
  
  // Fallback
  return Date.now() + 24 * 60 * 60 * 1000;
}

/**
 * Determines whether a task is overdue based on its dueTimestamp and the reference time.
 * Invariant: Completed or Cancelled tasks are NEVER overdue.
 */
export function isTaskOverdue(task: FollowUpTask, referenceTime?: Date | string | number): boolean {
  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    return false;
  }
  const refMs = referenceTime 
    ? (typeof referenceTime === "number" ? referenceTime : new Date(referenceTime).getTime())
    : Date.now();
  
  return task.dueTimestamp < refMs;
}

/**
 * Returns the effective dynamic status of a task (e.g. dynamically evaluating OVERDUE).
 */
export function getEffectiveTaskStatus(task: FollowUpTask, referenceTime?: Date | string | number): FollowUpTaskStatus {
  if (task.status === "COMPLETED") return "COMPLETED";
  if (task.status === "CANCELLED") return "CANCELLED";
  if (isTaskOverdue(task, referenceTime)) return "OVERDUE";
  return task.status;
}

/**
 * Creates a new canonical follow-up task for a prospect.
 * Enforces role authorization, field validation, and duplicate prevention.
 */
export function createFollowUpTask(
  business: Business,
  input: {
    title: string;
    description?: string;
    type?: FollowUpTaskType;
    priority?: FollowUpTaskPriority;
    dueDate: string;
    dueTime?: string;
    timeZone?: string;
    assignedTo?: TaskAssignee;
    communicationId?: string;
    draftId?: string;
    evidenceReferences?: string[];
    reminder?: Partial<TaskReminderConfig>;
    idempotencyKey?: string;
  },
  actor?: TaskAssignee
): { success: boolean; business: Business; task?: FollowUpTask; error?: string; isDuplicate?: boolean } {
  if (actor && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot create follow-up tasks.`
    };
  }

  if (!input.title || input.title.trim().length === 0) {
    return {
      success: false,
      business,
      error: "Task title is required."
    };
  }

  if (!input.dueDate || input.dueDate.trim().length === 0) {
    return {
      success: false,
      business,
      error: "Task due date is required."
    };
  }

  const existingTasks = business.followUpTasks || [];
  const now = new Date().toISOString();
  const dueTimestamp = calculateDueTimestamp(input.dueDate, input.dueTime, input.timeZone);

  // Duplicate prevention check:
  // Match on idempotencyKey OR exact title + prospectId + dueDate within active tasks
  const isDuplicate = existingTasks.some(t => {
    if (input.idempotencyKey && t.idempotencyKey === input.idempotencyKey) {
      return true;
    }
    if (
      !input.idempotencyKey &&
      t.status !== "COMPLETED" &&
      t.status !== "CANCELLED" &&
      t.title.trim().toLowerCase() === input.title.trim().toLowerCase() &&
      t.dueDate === input.dueDate &&
      Math.abs(Date.parse(t.createdAt) - Date.parse(now)) < 5000
    ) {
      return true;
    }
    return false;
  });

  if (isDuplicate) {
    const existing = existingTasks.find(t => 
      (input.idempotencyKey && t.idempotencyKey === input.idempotencyKey) ||
      (t.title.trim().toLowerCase() === input.title.trim().toLowerCase() && t.dueDate === input.dueDate)
    );
    return {
      success: true,
      business,
      task: existing,
      isDuplicate: true
    };
  }

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const initialHistory: TaskHistoryEntry = {
    id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "created",
    timestamp: now,
    actor: actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined,
    details: `Task created: "${input.title}". Due: ${input.dueDate} ${input.dueTime || ""}. Priority: ${input.priority || "MEDIUM"}`
  };

  const newTask: FollowUpTask = {
    id: taskId,
    prospectId: business.id,
    businessId: business.id,
    title: input.title.trim(),
    description: input.description?.trim(),
    type: input.type || "call",
    status: "OPEN",
    priority: input.priority || "MEDIUM",
    assignedTo: input.assignedTo || (actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined),
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    timeZone: input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    dueTimestamp,
    createdAt: now,
    updatedAt: now,
    communicationId: input.communicationId,
    draftId: input.draftId,
    evidenceReferences: input.evidenceReferences || [],
    reminder: input.reminder ? {
      enabled: input.reminder.enabled ?? true,
      remindBeforeMinutes: input.reminder.remindBeforeMinutes ?? 60,
      isDismissed: false
    } : undefined,
    history: [initialHistory],
    idempotencyKey: input.idempotencyKey
  };

  const updatedTasks = [newTask, ...existingTasks];
  const updatedBusiness: Business = {
    ...business,
    followUpTasks: updatedTasks,
    nextFollowUpDate: input.dueDate
  };

  // Sync to local storage
  try {
    const key = `sitescout_tasks_${business.id}`;
    localStorage.setItem(key, JSON.stringify(updatedTasks));
  } catch (e) {}

  // Sync to Firestore if available
  if (db && !business.id.startsWith("demo-")) {
    try {
      setDoc(doc(db, "businesses", business.id, "tasks", taskId), newTask).catch(() => {});
    } catch (e) {}
  }

  // Log activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "follow_up_sent",
      title: `Task Scheduled: ${newTask.title}`,
      description: `Type: ${newTask.type.toUpperCase()} | Due: ${newTask.dueDate} | Assigned to: ${newTask.assignedTo?.displayName || "Unassigned"}`,
      timestamp: now,
      actorId: actor?.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    task: newTask,
    isDuplicate: false
  };
}

/**
 * Reassigns an existing follow-up task to a new user.
 */
export function assignFollowUpTask(
  business: Business,
  taskId: string,
  newAssignee: TaskAssignee,
  actor?: TaskAssignee,
  note?: string
): { success: boolean; business: Business; task?: FollowUpTask; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot assign tasks.`
    };
  }

  const existingTasks = business.followUpTasks || [];
  const targetIdx = existingTasks.findIndex(t => t.id === taskId);

  if (targetIdx < 0) {
    return { success: false, business, error: `Task with ID "${taskId}" not found.` };
  }

  const targetTask = existingTasks[targetIdx];
  const now = new Date().toISOString();

  const historyEntry: TaskHistoryEntry = {
    id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "assigned",
    timestamp: now,
    actor: actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined,
    details: `Task reassigned from ${targetTask.assignedTo?.displayName || "Unassigned"} to ${newAssignee.displayName || newAssignee.uid}.${note ? ` Note: ${note}` : ""}`,
    previousState: { assignedTo: targetTask.assignedTo },
    newState: { assignedTo: newAssignee }
  };

  const updatedTask: FollowUpTask = {
    ...targetTask,
    assignedTo: newAssignee,
    updatedAt: now,
    history: [...targetTask.history, historyEntry]
  };

  const updatedTasks = [...existingTasks];
  updatedTasks[targetIdx] = updatedTask;

  const updatedBusiness: Business = {
    ...business,
    followUpTasks: updatedTasks
  };

  // Sync to local storage & Firestore
  try {
    localStorage.setItem(`sitescout_tasks_${business.id}`, JSON.stringify(updatedTasks));
    if (db && !business.id.startsWith("demo-")) {
      setDoc(doc(db, "businesses", business.id, "tasks", taskId), updatedTask, { merge: true }).catch(() => {});
    }
  } catch (e) {}

  return { success: true, business: updatedBusiness, task: updatedTask };
}

/**
 * Reschedules a follow-up task with a new due date, time, or time zone.
 * Preserves complete audit history of changes.
 */
export function rescheduleFollowUpTask(
  business: Business,
  taskId: string,
  newSchedule: {
    dueDate: string;
    dueTime?: string;
    timeZone?: string;
  },
  actor?: TaskAssignee,
  reason?: string
): { success: boolean; business: Business; task?: FollowUpTask; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot reschedule tasks.`
    };
  }

  if (!newSchedule.dueDate || newSchedule.dueDate.trim().length === 0) {
    return { success: false, business, error: "New due date is required for rescheduling." };
  }

  const existingTasks = business.followUpTasks || [];
  const targetIdx = existingTasks.findIndex(t => t.id === taskId);

  if (targetIdx < 0) {
    return { success: false, business, error: `Task with ID "${taskId}" not found.` };
  }

  const targetTask = existingTasks[targetIdx];
  const now = new Date().toISOString();
  const newDueTimestamp = calculateDueTimestamp(newSchedule.dueDate, newSchedule.dueTime, newSchedule.timeZone);

  const historyEntry: TaskHistoryEntry = {
    id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: "rescheduled",
    timestamp: now,
    actor: actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined,
    details: `Rescheduled from ${targetTask.dueDate} ${targetTask.dueTime || ""} to ${newSchedule.dueDate} ${newSchedule.dueTime || ""}.${reason ? ` Reason: ${reason}` : ""}`,
    previousState: {
      dueDate: targetTask.dueDate,
      dueTime: targetTask.dueTime,
      dueTimestamp: targetTask.dueTimestamp,
      status: targetTask.status
    },
    newState: {
      dueDate: newSchedule.dueDate,
      dueTime: newSchedule.dueTime,
      dueTimestamp: newDueTimestamp,
      status: targetTask.status === "CANCELLED" ? "CANCELLED" : "OPEN"
    }
  };

  const updatedTask: FollowUpTask = {
    ...targetTask,
    dueDate: newSchedule.dueDate,
    dueTime: newSchedule.dueTime,
    timeZone: newSchedule.timeZone || targetTask.timeZone,
    dueTimestamp: newDueTimestamp,
    // Reset from OVERDUE to OPEN if status was overdue
    status: (targetTask.status === "COMPLETED" || targetTask.status === "CANCELLED") ? targetTask.status : "OPEN",
    updatedAt: now,
    history: [...targetTask.history, historyEntry]
  };

  const updatedTasks = [...existingTasks];
  updatedTasks[targetIdx] = updatedTask;

  const updatedBusiness: Business = {
    ...business,
    followUpTasks: updatedTasks,
    nextFollowUpDate: newSchedule.dueDate
  };

  // Sync
  try {
    localStorage.setItem(`sitescout_tasks_${business.id}`, JSON.stringify(updatedTasks));
    if (db && !business.id.startsWith("demo-")) {
      setDoc(doc(db, "businesses", business.id, "tasks", taskId), updatedTask, { merge: true }).catch(() => {});
    }
  } catch (e) {}

  return { success: true, business: updatedBusiness, task: updatedTask };
}

/**
 * Updates task status (e.g. to IN_PROGRESS, COMPLETED, CANCELLED, or OPEN).
 */
export function updateFollowUpTaskStatus(
  business: Business,
  taskId: string,
  newStatus: FollowUpTaskStatus,
  actor?: TaskAssignee,
  note?: string
): { success: boolean; business: Business; task?: FollowUpTask; error?: string } {
  if (actor && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot update task status.`
    };
  }

  const existingTasks = business.followUpTasks || [];
  const targetIdx = existingTasks.findIndex(t => t.id === taskId);

  if (targetIdx < 0) {
    return { success: false, business, error: `Task with ID "${taskId}" not found.` };
  }

  const targetTask = existingTasks[targetIdx];
  const now = new Date().toISOString();

  let action: TaskHistoryAction = "status_changed";
  if (newStatus === "COMPLETED") action = "completed";
  if (newStatus === "CANCELLED") action = "cancelled";

  const historyEntry: TaskHistoryEntry = {
    id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    timestamp: now,
    actor: actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined,
    details: `Task status transitioned: ${targetTask.status} → ${newStatus}.${note ? ` Note: ${note}` : ""}`,
    previousState: { status: targetTask.status },
    newState: { status: newStatus }
  };

  const updatedTask: FollowUpTask = {
    ...targetTask,
    status: newStatus,
    updatedAt: now,
    completedAt: newStatus === "COMPLETED" ? now : targetTask.completedAt,
    completedBy: newStatus === "COMPLETED" ? (actor ? { uid: actor.uid, displayName: actor.displayName, role: actor.role } : undefined) : targetTask.completedBy,
    cancelledAt: newStatus === "CANCELLED" ? now : targetTask.cancelledAt,
    cancelledReason: newStatus === "CANCELLED" ? (note || "Task cancelled by user.") : targetTask.cancelledReason,
    history: [...targetTask.history, historyEntry]
  };

  const updatedTasks = [...existingTasks];
  updatedTasks[targetIdx] = updatedTask;

  const updatedBusiness: Business = {
    ...business,
    followUpTasks: updatedTasks
  };

  // Sync
  try {
    localStorage.setItem(`sitescout_tasks_${business.id}`, JSON.stringify(updatedTasks));
    if (db && !business.id.startsWith("demo-")) {
      setDoc(doc(db, "businesses", business.id, "tasks", taskId), updatedTask, { merge: true }).catch(() => {});
    }
  } catch (e) {}

  // Auto-log activity on completion
  if (newStatus === "COMPLETED") {
    try {
      addBusinessActivity(business.id, {
        businessId: business.id,
        type: "follow_up_sent",
        title: `Task Completed: ${updatedTask.title}`,
        description: `Marked completed by ${actor?.displayName || "User"} on ${new Date().toLocaleDateString()}`,
        timestamp: now,
        actorId: actor?.uid
      });
    } catch (e) {}
  }

  return { success: true, business: updatedBusiness, task: updatedTask };
}

/**
 * Creates a follow-up task directly from a communication record.
 */
export function createFollowUpFromCommunication(
  business: Business,
  communicationId: string,
  taskDetails: {
    title: string;
    dueDate: string;
    dueTime?: string;
    type?: FollowUpTaskType;
    priority?: FollowUpTaskPriority;
    description?: string;
    assignedTo?: TaskAssignee;
  },
  actor?: TaskAssignee
): { success: boolean; business: Business; task?: FollowUpTask; error?: string } {
  const commHistory = business.communicationHistory || [];
  const comm = commHistory.find(c => c.id === communicationId);

  if (!comm) {
    return {
      success: false,
      business,
      error: `Communication record with ID "${communicationId}" not found.`
    };
  }

  const contextSnippet = `[Context from ${comm.direction} ${comm.channel.toUpperCase()} (${new Date(comm.createdAt).toLocaleDateString()})]: ${comm.subject ? `Subject: ${comm.subject} | ` : ""}${comm.body.slice(0, 200)}...`;
  const description = taskDetails.description 
    ? `${taskDetails.description}\n\n${contextSnippet}`
    : `Follow up on ${comm.direction} ${comm.channel} interaction.\n\n${contextSnippet}`;

  return createFollowUpTask(
    business,
    {
      title: taskDetails.title,
      description,
      dueDate: taskDetails.dueDate,
      dueTime: taskDetails.dueTime,
      type: taskDetails.type || (comm.channel === "phone_script" ? "call" : comm.channel === "email" ? "email" : "other"),
      priority: taskDetails.priority || "MEDIUM",
      assignedTo: taskDetails.assignedTo,
      communicationId: comm.id,
      draftId: comm.draftId,
      evidenceReferences: comm.evidenceReferences
    },
    actor
  );
}

/**
 * Retrieves and filters prospect follow-up tasks with dynamic overdue calculation.
 * Blocks unauthorized users from accessing tasks.
 */
export function getProspectFollowUpTasks(
  business: Business,
  filters?: {
    status?: FollowUpTaskStatus | "ALL" | "ACTIVE" | "OVERDUE";
    assigneeUid?: string;
    type?: FollowUpTaskType;
    priority?: FollowUpTaskPriority;
    referenceTime?: Date | string | number;
  },
  user?: TaskAssignee
): {
  authorized: boolean;
  tasks: FollowUpTask[];
  allCount: number;
  openCount: number;
  inProgressCount: number;
  overdueCount: number;
  completedCount: number;
  cancelledCount: number;
  error?: string;
} {
  if (user && user.role && !isUserAuthorizedForTask(user.role)) {
    return {
      authorized: false,
      tasks: [],
      allCount: 0,
      openCount: 0,
      inProgressCount: 0,
      overdueCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      error: `Access Denied: User role "${user.role}" does not have permissions to view prospect tasks.`
    };
  }

  const rawTasks = business.followUpTasks || [];
  const refTime = filters?.referenceTime || Date.now();

  let openCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  // Process and compute status for all tasks
  const processed = rawTasks.map(t => {
    const effectiveStatus = getEffectiveTaskStatus(t, refTime);
    if (effectiveStatus === "COMPLETED") completedCount++;
    else if (effectiveStatus === "CANCELLED") cancelledCount++;
    else if (effectiveStatus === "OVERDUE") overdueCount++;
    else if (effectiveStatus === "IN_PROGRESS") inProgressCount++;
    else if (effectiveStatus === "OPEN") openCount++;

    return {
      ...t,
      status: effectiveStatus
    };
  });

  // Apply filters
  const filtered = processed.filter(t => {
    if (filters?.status && filters.status !== "ALL") {
      if (filters.status === "ACTIVE") {
        if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      } else if (filters.status === "OVERDUE") {
        if (t.status !== "OVERDUE") return false;
      } else {
        if (t.status !== filters.status) return false;
      }
    }

    if (filters?.assigneeUid && t.assignedTo?.uid !== filters.assigneeUid) {
      return false;
    }

    if (filters?.type && t.type !== filters.type) {
      return false;
    }

    if (filters?.priority && t.priority !== filters.priority) {
      return false;
    }

    return true;
  });

  // Sort by dueTimestamp ascending (earliest due first)
  filtered.sort((a, b) => {
    if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
    if (a.status !== "OVERDUE" && b.status === "OVERDUE") return 1;
    return a.dueTimestamp - b.dueTimestamp;
  });

  return {
    authorized: true,
    tasks: filtered,
    allCount: rawTasks.length,
    openCount,
    inProgressCount,
    overdueCount,
    completedCount,
    cancelledCount
  };
}

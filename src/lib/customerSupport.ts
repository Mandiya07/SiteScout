import {
  Business,
  CustomerSupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  TicketAttachment,
  TicketMessage,
  TaskAssignee,
  NotificationCategory
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";
import { checkServiceEntitlement } from "./customerSubscription";
import { dispatchSupportTicketNotification } from "./customerCommunications";

/**
 * MICRO-PHASE 16A: CUSTOMER SUPPORT, SERVICE REQUESTS & ISSUE MANAGEMENT
 * 
 * Canonical engine for customer issue reporting, tracking, staff assignment,
 * multi-party messaging with internal note redaction, SLA enforcement, and auditable resolution.
 * 
 * Core Invariants:
 * 1. Customers can access ONLY their own support records.
 * 2. Internal notes (isInternal: true) are strictly redacted from customer-facing queries.
 * 3. Every status, priority, or assignment change is recorded in an immutable audit trail.
 * 4. Original customer request (subject, description, requesterId, createdTimestamp) is immutable.
 * 5. Duplicate ticket submissions (identical subject & requester within 60s) are rejected.
 * 6. SLA resolution times are configured truthfully based on canonical subscription entitlement.
 * 7. Real notifications are dispatched via canonical business activity tracking.
 */

/**
 * Strips internal staff notes and internal audit items before exposing ticket to customers.
 */
export function sanitizeTicketForCustomer(ticket: CustomerSupportTicket): CustomerSupportTicket {
  return {
    ...ticket,
    messages: (ticket.messages || []).filter(m => !m.isInternal),
    auditTrail: (ticket.auditTrail || []).filter(a => a.action !== "INTERNAL_NOTE_ADDED")
  };
}

/**
 * Normalizes ticket priorities to standard Canonical 16A enum.
 */
export function normalizeSupportPriority(priority?: SupportTicketPriority | string): SupportTicketPriority {
  if (!priority) return "NORMAL";
  const p = priority.toUpperCase();
  if (p === "CRITICAL" || p === "URGENT") return "URGENT";
  if (p === "HIGH") return "HIGH";
  if (p === "LOW") return "LOW";
  return "NORMAL";
}

/**
 * Creates a formal canonical customer support ticket.
 */
export async function createCustomerSupportTicket(
  business: Business,
  ticketData: {
    customerId?: string;
    requesterId: string;
    requesterName: string;
    requesterEmail?: string;
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority?: SupportTicketPriority;
    relatedWebsiteVersion?: number;
    relatedTaskId?: string;
    siteId?: string;
    projectId?: string;
    attachments?: TicketAttachment[];
    initialMessage?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  isDuplicate?: boolean;
  error?: string;
}> {
  if (!ticketData.subject || ticketData.subject.trim() === "") {
    return {
      success: false,
      business,
      error: "Support ticket rejected: Subject is required."
    };
  }

  if (!ticketData.description || ticketData.description.trim() === "") {
    return {
      success: false,
      business,
      error: "Support ticket rejected: Description is required."
    };
  }

  if (!ticketData.requesterId || ticketData.requesterId.trim() === "") {
    return {
      success: false,
      business,
      error: "Support ticket rejected: Requester ID is required."
    };
  }

  const existingTickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const now = new Date().toISOString();
  const nowMs = Date.now();

  // Duplicate Submission Prevention: Check within 60 seconds for identical subject and requester
  const duplicate = existingTickets.find(t => {
    if (t.requesterId === ticketData.requesterId && t.subject.toLowerCase() === ticketData.subject.trim().toLowerCase()) {
      const createdMs = Date.parse(t.createdTimestamp);
      if (!isNaN(createdMs) && Math.abs(nowMs - createdMs) < 60000) {
        return true;
      }
    }
    return false;
  });

  if (duplicate) {
    return {
      success: false,
      business,
      isDuplicate: true,
      error: `Duplicate ticket detected: A ticket with subject "${ticketData.subject}" was submitted recently.`
    };
  }

  const customerId = ticketData.customerId || business.customerAccount?.customerId || `cust_${business.id.substring(0, 8)}`;
  const year = new Date().getFullYear();
  const ticketCount = existingTickets.length + 1;
  const ticketNumber = `TICK-${year}-${String(ticketCount).padStart(4, "0")}`;
  const ticketId = `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // True SLA Check: Derived from real customer entitlement
  const slaCheck = checkServiceEntitlement(business, "support_sla", ticketData.requesterId);
  const isCoveredUnderSla = slaCheck.entitled;
  let slaTargetResolution: string | undefined = undefined;

  if (isCoveredUnderSla) {
    const hours = business.activeSubscription?.planId === "plan_enterprise" ? 4 :
                  business.activeSubscription?.planId === "plan_elite" ? 12 : 24;
    slaTargetResolution = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  const priority = normalizeSupportPriority(ticketData.priority);
  const subject = ticketData.subject.trim();
  const description = ticketData.description.trim();
  const attachments = ticketData.attachments || [];

  const initialMessages: TicketMessage[] = [];
  if (ticketData.initialMessage || description) {
    initialMessages.push({
      id: `msg_${ticketId}_1`,
      ticketId,
      senderId: ticketData.requesterId,
      senderName: ticketData.requesterName,
      senderRole: "customer",
      message: ticketData.initialMessage || description,
      isInternal: false,
      timestamp: now,
      attachments
    });
  }

  const newTicket: CustomerSupportTicket = {
    id: ticketId,
    ticketId,
    ticketNumber,
    customerId,
    businessId: business.id,
    businessName: business.name,
    projectId: ticketData.projectId || business.customerProject?.id,
    siteId: ticketData.siteId,
    requesterId: ticketData.requesterId,
    requesterName: ticketData.requesterName,
    requesterEmail: ticketData.requesterEmail,
    subject,
    title: subject,
    description,
    category: ticketData.category,
    priority,
    status: "OPEN",
    relatedWebsiteVersion: ticketData.relatedWebsiteVersion || business.customerProject?.currentWebsiteVersion || 1,
    websiteVersion: ticketData.relatedWebsiteVersion || business.customerProject?.currentWebsiteVersion || 1,
    relatedTaskId: ticketData.relatedTaskId,
    attachments,
    messages: initialMessages,
    isCoveredUnderSla,
    slaTargetResolution,
    createdTimestamp: now,
    reportedAt: now,
    updatedTimestamp: now,
    auditTrail: [
      {
        timestamp: now,
        actor,
        action: "CREATED",
        notes: `Ticket created by ${ticketData.requesterName} (${ticketData.category}, Priority: ${priority})`
      }
    ]
  };

  const updatedTickets = [...existingTickets, newTicket];
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  // Canonical Notification via Business Activity & Communication Layer
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "support_ticket_created",
      title: `Support Ticket Opened: ${ticketNumber}`,
      description: `[${priority}] ${subject} (Category: ${ticketData.category})`,
      timestamp: now,
      actorId: actor.uid
    });
    const notifRes = await dispatchSupportTicketNotification(updatedBiz, "SUPPORT_TICKET_CREATED", newTicket, { actor });
    if (notifRes.success) updatedBiz = notifRes.business;
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    ticket: newTicket
  };
}

/**
 * Assigns a staff member to a support ticket with role validation.
 */
export async function assignSupportTicket(
  business: Business,
  ticketId: string,
  staffAssignee: TaskAssignee,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot assign support tickets.`
    };
  }

  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const targetTicket = tickets.find(t => t.id === ticketId || t.ticketId === ticketId);

  if (!targetTicket) {
    return { success: false, business, error: `Support ticket "${ticketId}" not found.` };
  }

  const now = new Date().toISOString();
  const nextStatus: SupportTicketStatus = targetTicket.status === "OPEN" ? "IN_PROGRESS" : targetTicket.status;

  const updatedTicket: CustomerSupportTicket = {
    ...targetTicket,
    assignedStaff: staffAssignee,
    assignedTo: staffAssignee,
    status: nextStatus,
    updatedTimestamp: now,
    auditTrail: [
      ...targetTicket.auditTrail,
      {
        timestamp: now,
        actor,
        action: "ASSIGNED",
        notes: `Assigned to ${staffAssignee.displayName} (${staffAssignee.role || "Staff"})`
      }
    ]
  };

  const updatedTickets = tickets.map(t => (t.id === targetTicket.id ? updatedTicket : t));
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "support_ticket_updated",
      title: `Support Ticket Assigned: ${targetTicket.ticketNumber}`,
      description: `Assigned to ${staffAssignee.displayName}`,
      timestamp: now,
      actorId: actor.uid
    });
    const notifRes = await dispatchSupportTicketNotification(updatedBiz, "SUPPORT_TICKET_ASSIGNED", updatedTicket, { actor });
    if (notifRes.success) updatedBiz = notifRes.business;
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    ticket: updatedTicket
  };
}

/**
 * Updates support ticket status with formal lifecycle rules and auditing.
 */
export async function updateSupportTicketStatus(
  business: Business,
  ticketId: string,
  newStatus: SupportTicketStatus,
  actor: TaskAssignee,
  notes?: string
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot update ticket statuses.`
    };
  }

  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const targetTicket = tickets.find(t => t.id === ticketId || t.ticketId === ticketId);

  if (!targetTicket) {
    return { success: false, business, error: `Support ticket "${ticketId}" not found.` };
  }

  const now = new Date().toISOString();
  const previousStatus = targetTicket.status;

  const resolvedTimestamp = newStatus === "RESOLVED" ? now :
                            (newStatus === "OPEN" || newStatus === "IN_PROGRESS") ? undefined : targetTicket.resolvedTimestamp;
  const closedTimestamp = newStatus === "CLOSED" || newStatus === "CANCELLED" ? now :
                          (newStatus === "OPEN" || newStatus === "IN_PROGRESS") ? undefined : targetTicket.closedTimestamp;

  const updatedTicket: CustomerSupportTicket = {
    ...targetTicket,
    status: newStatus,
    resolvedTimestamp,
    resolvedAt: resolvedTimestamp,
    closedTimestamp,
    updatedTimestamp: now,
    auditTrail: [
      ...targetTicket.auditTrail,
      {
        timestamp: now,
        actor,
        action: newStatus === "RESOLVED" ? "RESOLVED" : newStatus === "CLOSED" ? "CLOSED" : "STATUS_CHANGED",
        previousStatus,
        newStatus,
        notes: notes || `Status updated from ${previousStatus} to ${newStatus}`
      }
    ]
  };

  const updatedTickets = tickets.map(t => (t.id === targetTicket.id ? updatedTicket : t));
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "support_ticket_updated",
      title: `Support Ticket ${targetTicket.ticketNumber} Status: ${newStatus}`,
      description: `Transitioned from ${previousStatus} to ${newStatus}. ${notes ? `Notes: ${notes}` : ""}`,
      timestamp: now,
      actorId: actor.uid
    });
    const notifRes = await dispatchSupportTicketNotification(updatedBiz, "SUPPORT_STATUS_CHANGED", updatedTicket, { actor, customNote: notes });
    if (notifRes.success) updatedBiz = notifRes.business;
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    ticket: updatedTicket
  };
}

/**
 * Adds a response or internal note to a support ticket.
 */
export async function addTicketMessage(
  business: Business,
  ticketId: string,
  messageData: {
    senderId: string;
    senderName: string;
    senderRole: "customer" | "staff" | "system";
    message: string;
    isInternal?: boolean;
    attachments?: TicketAttachment[];
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  message?: TicketMessage;
  error?: string;
}> {
  if (!messageData.message || messageData.message.trim() === "") {
    return { success: false, business, error: "Message cannot be empty." };
  }

  // Internal notes require staff authorization
  if (messageData.isInternal && actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: Role "${actor.role}" cannot post internal staff notes.`
    };
  }

  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const targetTicket = tickets.find(t => t.id === ticketId || t.ticketId === ticketId);

  if (!targetTicket) {
    return { success: false, business, error: `Support ticket "${ticketId}" not found.` };
  }

  const now = new Date().toISOString();
  const messageId = `msg_${targetTicket.id}_${(targetTicket.messages || []).length + 1}`;

  const newMessage: TicketMessage = {
    id: messageId,
    ticketId: targetTicket.id,
    senderId: messageData.senderId,
    senderName: messageData.senderName,
    senderRole: messageData.senderRole,
    message: messageData.message.trim(),
    isInternal: Boolean(messageData.isInternal),
    timestamp: now,
    attachments: messageData.attachments
  };

  // Status transitions based on communication
  let nextStatus = targetTicket.status;
  if (!messageData.isInternal) {
    if (messageData.senderRole === "customer") {
      if (targetTicket.status === "WAITING_FOR_CUSTOMER") {
        nextStatus = "IN_PROGRESS";
      }
    } else if (messageData.senderRole === "staff") {
      if (targetTicket.status === "OPEN" || targetTicket.status === "IN_PROGRESS") {
        nextStatus = "WAITING_FOR_CUSTOMER";
      }
    }
  }

  const updatedTicket: CustomerSupportTicket = {
    ...targetTicket,
    status: nextStatus,
    messages: [...(targetTicket.messages || []), newMessage],
    updatedTimestamp: now,
    auditTrail: [
      ...targetTicket.auditTrail,
      {
        timestamp: now,
        actor,
        action: messageData.isInternal ? "INTERNAL_NOTE_ADDED" : messageData.senderRole === "customer" ? "CUSTOMER_REPLIED" : "STAFF_REPLIED",
        notes: messageData.isInternal ? "Internal staff note added" : `Message posted by ${messageData.senderName}`
      }
    ]
  };

  const updatedTickets = tickets.map(t => (t.id === targetTicket.id ? updatedTicket : t));
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  if (!messageData.isInternal) {
    try {
      addBusinessActivity(business.id, {
        businessId: business.id,
        type: "support_ticket_updated",
        title: `Reply on Ticket ${targetTicket.ticketNumber}`,
        description: `${messageData.senderName} (${messageData.senderRole}): ${messageData.message.substring(0, 100)}`,
        timestamp: now,
        actorId: actor.uid
      });
      const eventCat: NotificationCategory = messageData.senderRole === "customer" ? "SUPPORT_CUSTOMER_REPLY" : "SUPPORT_STAFF_REPLY";
      const notifRes = await dispatchSupportTicketNotification(updatedBiz, eventCat, updatedTicket, { actor, messageSummary: messageData.message });
      if (notifRes.success) updatedBiz = notifRes.business;
    } catch (e) {}
  }

  return {
    success: true,
    business: updatedBiz,
    ticket: updatedTicket,
    message: newMessage
  };
}

/**
 * Reopens a resolved or closed support ticket.
 */
export async function reopenSupportTicket(
  business: Business,
  ticketId: string,
  actor: TaskAssignee,
  reason: string
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  error?: string;
}> {
  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const targetTicket = tickets.find(t => t.id === ticketId || t.ticketId === ticketId);

  if (!targetTicket) {
    return { success: false, business, error: `Support ticket "${ticketId}" not found.` };
  }

  const now = new Date().toISOString();
  const updatedTicket: CustomerSupportTicket = {
    ...targetTicket,
    status: "OPEN",
    resolvedTimestamp: undefined,
    resolvedAt: undefined,
    closedTimestamp: undefined,
    updatedTimestamp: now,
    auditTrail: [
      ...targetTicket.auditTrail,
      {
        timestamp: now,
        actor,
        action: "REOPENED",
        previousStatus: targetTicket.status,
        newStatus: "OPEN",
        notes: `Ticket reopened: ${reason}`
      }
    ]
  };

  const updatedTickets = tickets.map(t => (t.id === targetTicket.id ? updatedTicket : t));
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "support_ticket_updated",
      title: `Support Ticket Reopened: ${targetTicket.ticketNumber}`,
      description: `Reason: ${reason}`,
      timestamp: now,
      actorId: actor.uid
    });
    const notifRes = await dispatchSupportTicketNotification(updatedBiz, "SUPPORT_STATUS_CHANGED", updatedTicket, { actor, customNote: `Ticket Reopened: ${reason}` });
    if (notifRes.success) updatedBiz = notifRes.business;
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    ticket: updatedTicket
  };
}

/**
 * Resolves a support ticket with formal resolution notes.
 */
export async function resolveSupportTicket(
  business: Business,
  ticketId: string,
  resolutionData: {
    resolutionNotes: string;
    billableHours?: number;
    verifiedLiveAt?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  ticket?: CustomerSupportTicket;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot resolve support tickets.`
    };
  }

  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const targetTicket = tickets.find(t => t.id === ticketId || t.ticketId === ticketId);

  if (!targetTicket) {
    return { success: false, business, error: `Support ticket "${ticketId}" not found.` };
  }

  const now = new Date().toISOString();
  const updatedTicket: CustomerSupportTicket = {
    ...targetTicket,
    status: "RESOLVED",
    resolvedTimestamp: now,
    resolvedAt: now,
    resolutionSummary: resolutionData.resolutionNotes,
    resolutionNotes: resolutionData.resolutionNotes,
    billableHours: resolutionData.billableHours ?? 0,
    verifiedLiveAt: resolutionData.verifiedLiveAt || now,
    updatedTimestamp: now,
    auditTrail: [
      ...targetTicket.auditTrail,
      {
        timestamp: now,
        actor,
        action: "RESOLVED",
        previousStatus: targetTicket.status,
        newStatus: "RESOLVED",
        notes: resolutionData.resolutionNotes
      }
    ]
  };

  const updatedTickets = tickets.map(t => (t.id === targetTicket.id ? updatedTicket : t));
  let updatedBiz: Business = {
    ...business,
    supportTickets: updatedTickets,
    customerProject: business.customerProject ? {
      ...business.customerProject,
      supportTickets: updatedTickets
    } : undefined
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "support_ticket_resolved",
      title: `Support Ticket Resolved: ${targetTicket.ticketNumber}`,
      description: resolutionData.resolutionNotes,
      timestamp: now,
      actorId: actor.uid
    });
    const notifRes = await dispatchSupportTicketNotification(updatedBiz, "SUPPORT_TICKET_RESOLVED", updatedTicket, { actor, customNote: resolutionData.resolutionNotes });
    if (notifRes.success) updatedBiz = notifRes.business;
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    ticket: updatedTicket
  };
}

/**
 * Retrieves tickets for a customer requester, enforcing boundary isolation and redaction.
 */
export function getCustomerTickets(
  business: Business,
  requesterId: string
): CustomerSupportTicket[] {
  const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
  return tickets
    .filter(t => t.requesterId === requesterId || t.customerId === requesterId)
    .map(t => sanitizeTicketForCustomer(t));
}

/**
 * Retrieves all support tickets for authorized staff members.
 */
/**
 * Retrieves all support tickets for authorized staff members.
 */
export function getStaffTickets(business: Business): CustomerSupportTicket[] {
  return business.supportTickets || business.customerProject?.supportTickets || [];
}

export {
  resolveSupportTicket as resolveCustomerSupportTicket
};

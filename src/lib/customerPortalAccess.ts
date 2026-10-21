import {
  Business,
  CustomerAccount,
  CustomerInvoice,
  CustomerSession,
  CustomerSupportTicket,
  PortalAuthorizationResult,
  PortalResourceType,
  PortalRole
} from "../types";
import { sanitizeTicketForCustomer } from "./customerSupport";
import { getCustomerNotifications } from "./customerCommunications";
import { checkServiceEntitlement } from "./customerSubscription";

/**
 * MICRO-PHASE 16C: CUSTOMER PORTAL, ACCOUNT SECURITY & ACCESS CONTROL
 * 
 * Canonical authorization and security engine for customer-facing accounts.
 * Enforces strict server-side boundary isolation, preventing ID-based resource enumeration,
 * session spoofing, privilege escalation, and unauthorized customer access.
 */

export const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a customer session record with secure expiration.
 */
export function createCustomerSession(params: {
  uid: string;
  email: string;
  role?: PortalRole;
  customerId?: string;
  businessId?: string;
  expiresInMs?: number;
  isVerified?: boolean;
}): CustomerSession {
  const now = Date.now();
  const duration = params.expiresInMs ?? DEFAULT_SESSION_DURATION_MS;
  const expiresAt = new Date(now + duration).toISOString();

  return {
    uid: params.uid,
    email: params.email.toLowerCase().trim(),
    role: params.role || "customer",
    customerId: params.customerId,
    businessId: params.businessId,
    sessionToken: `sess_${params.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    sessionExpiresAt: expiresAt,
    isExpired: false,
    isVerified: params.isVerified ?? true
  };
}

/**
 * Checks whether a session is valid and unexpired.
 */
export function isSessionValid(session?: CustomerSession | null): {
  valid: boolean;
  error?: string;
  errorCode?: "UNAUTHENTICATED" | "EXPIRED_SESSION";
} {
  if (!session || !session.uid) {
    return {
      valid: false,
      error: "Authentication required. No active session found.",
      errorCode: "UNAUTHENTICATED"
    };
  }

  if (session.isExpired) {
    return {
      valid: false,
      error: "Session expired. Please log in again.",
      errorCode: "EXPIRED_SESSION"
    };
  }

  const expiryTime = Date.parse(session.sessionExpiresAt);
  if (!isNaN(expiryTime) && Date.now() > expiryTime) {
    return {
      valid: false,
      error: "Session token has expired.",
      errorCode: "EXPIRED_SESSION"
    };
  }

  return { valid: true };
}

/**
 * Invalidates and revokes an active customer session.
 */
export function revokeCustomerSession(session: CustomerSession): CustomerSession {
  return {
    ...session,
    isExpired: true,
    sessionExpiresAt: new Date(Date.now() - 1000).toISOString()
  };
}

/**
 * Validates ownership between a session user and a business's customer account.
 */
export function isCustomerAccountOwner(business: Business, session: CustomerSession): boolean {
  if (!business || !session) return false;

  const account = business.customerAccount;
  if (!account) {
    // If no customerAccount sub-record exists yet, check root business ID association
    return business.id === session.businessId || (business as any).userId === session.uid;
  }

  // 1. Match by authenticated Firebase Auth UID
  if (account.ownerUserId && account.ownerUserId === session.uid) {
    return true;
  }

  // 2. Match by verified customer ID
  if (session.customerId && account.customerId === session.customerId) {
    return true;
  }

  // 3. Match by verified primary email
  if (account.primaryEmail && session.email && account.primaryEmail.toLowerCase() === session.email.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Enforces server-side authorization on customer portal resource requests.
 * Completely independent of frontend visibility states.
 */
export function authorizeCustomerAccess(
  business: Business,
  session: CustomerSession | null | undefined,
  resourceType: PortalResourceType,
  resourceId?: string,
  action: "read" | "write" | "admin" = "read"
): PortalAuthorizationResult {
  // 1. Session Validity Check
  const sessionCheck = isSessionValid(session);
  if (!sessionCheck.valid || !session) {
    return {
      authorized: false,
      status: 401,
      errorCode: sessionCheck.errorCode || "UNAUTHENTICATED",
      reason: sessionCheck.error || "Authentication required."
    };
  }

  // 2. Admin Role Bypass
  if (session.role === "admin") {
    return { authorized: true, status: 200 };
  }

  // 3. Staff Role Validation
  if (session.role === "staff" || session.role === "sales" || session.role === "support") {
    if (action === "admin") {
      return {
        authorized: false,
        status: 403,
        errorCode: "ROLE_UNAUTHORIZED",
        reason: "Forbidden: Administrative privileges required."
      };
    }
    // Granular role permissions
    if (session.role === "support" && (resourceType === "subscription" || resourceType === "invoice") && action === "write") {
      return {
        authorized: false,
        status: 403,
        errorCode: "ROLE_UNAUTHORIZED",
        reason: "Forbidden: Support staff cannot alter billing or subscription records."
      };
    }
    if (session.role === "sales" && resourceType === "support_ticket" && action === "write") {
      return {
        authorized: false,
        status: 403,
        errorCode: "ROLE_UNAUTHORIZED",
        reason: "Forbidden: Sales staff cannot modify customer support tickets."
      };
    }
    return { authorized: true, status: 200 };
  }

  // 4. Customer Role - Strict Resource Boundary Isolation
  const ownsAccount = isCustomerAccountOwner(business, session);
  if (!ownsAccount) {
    return {
      authorized: false,
      status: 403,
      errorCode: "FORBIDDEN_RESOURCE",
      reason: "Access denied: Resource does not belong to your customer account."
    };
  }

  // 5. Expired / Cancelled Account Entitlement Enforcement
  const subStatus = business.activeSubscription?.status || business.customerAccount?.currentSubscriptionStatus;
  const isTerminated = subStatus === "CANCELLED" || subStatus === "EXPIRED";

  if (isTerminated && action === "write") {
    return {
      authorized: false,
      status: 403,
      errorCode: "ENTITLEMENT_RESTRICTED",
      reason: "Action restricted: Your subscription has ended. Historical records remain accessible in read-only mode."
    };
  }

  // 6. Granular Resource-Level ID Checks
  if (resourceId) {
    if (resourceType === "invoice") {
      const invoices = business.invoices || [];
      const invoice = invoices.find(inv => inv.id === resourceId || inv.invoiceId === resourceId);
      if (!invoice) {
        return {
          authorized: false,
          status: 404,
          errorCode: "NOT_FOUND",
          reason: "Invoice not found or access denied."
        };
      }
      // Ensure invoice is actually for this customer
      if (session.customerId && invoice.customerId && invoice.customerId !== session.customerId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Invoice belongs to another customer account."
        };
      }
    } else if (resourceType === "support_ticket") {
      const tickets = business.supportTickets || business.customerProject?.supportTickets || [];
      const ticket = tickets.find(t => t.id === resourceId || t.ticketId === resourceId);
      if (!ticket) {
        return {
          authorized: false,
          status: 404,
          errorCode: "NOT_FOUND",
          reason: "Support ticket not found or access denied."
        };
      }
      // Ensure ticket is for this customer
      if (session.customerId && ticket.requesterId !== session.customerId && ticket.customerId !== session.customerId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Support ticket belongs to another customer account."
        };
      }
    } else if (resourceType === "payment") {
      const payments = business.payments || [];
      const payment = payments.find(p => p.id === resourceId || p.paymentNumber === resourceId);
      if (!payment) {
        return {
          authorized: false,
          status: 404,
          errorCode: "NOT_FOUND",
          reason: "Payment receipt not found or access denied."
        };
      }
      if (session.customerId && payment.customerId && payment.customerId !== session.customerId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Payment receipt belongs to another customer account."
        };
      }
    } else if (resourceType === "preview_record") {
      if (business.id !== resourceId && business.customerProject?.id !== resourceId && session.businessId !== resourceId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Preview record belongs to another customer account."
        };
      }
    } else if (resourceType === "document") {
      const docs = (business.customerProject as any)?.commercialDocuments || (business as any).customerDocuments || [];
      const doc = docs.find((d: any) => d.id === resourceId || d.documentId === resourceId);
      if (doc && session.customerId && doc.customerId && doc.customerId !== session.customerId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Document belongs to another customer account."
        };
      }
    } else if (resourceType === "communication") {
      const notifications = business.notifications || [];
      const notif = notifications.find(n => n.id === resourceId);
      if (notif && session.customerId && notif.recipient?.id !== session.customerId && notif.recipient?.id !== session.uid) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Communication belongs to another customer account."
        };
      }
    } else if (resourceType === "project" || resourceType === "website_version") {
      if (business.id !== resourceId && business.customerProject?.id !== resourceId && session.businessId !== resourceId) {
        return {
          authorized: false,
          status: 403,
          errorCode: "FORBIDDEN_RESOURCE",
          reason: "Access denied: Project does not belong to your customer account."
        };
      }
    }
  }

  return { authorized: true, status: 200 };
}

/**
 * Sanitizes complete customer portal bundle, stripping all internal staff notes,
 * internal CRM prospect scores, internal audit trails, and sensitive metadata.
 */
export function sanitizeCustomerPortalData(
  business: Business,
  session: CustomerSession
): {
  account: CustomerAccount | null;
  subscription: any;
  invoices: CustomerInvoice[];
  payments: any[];
  supportTickets: CustomerSupportTicket[];
  project: any;
  communications: any[];
} {
  const owns = isCustomerAccountOwner(business, session);
  if (!owns && session.role !== "admin" && session.role !== "staff") {
    return {
      account: null,
      subscription: null,
      invoices: [],
      payments: [],
      supportTickets: [],
      project: null,
      communications: []
    };
  }

  // 1. Redact Internal Notes from Support Tickets
  const rawTickets = business.supportTickets || business.customerProject?.supportTickets || [];
  const customerTickets = rawTickets
    .filter(t => !session.customerId || t.requesterId === session.customerId || t.customerId === session.customerId)
    .map(t => sanitizeTicketForCustomer(t));

  // 2. Filter Invoices for Customer
  const customerInvoices = (business.invoices || [])
    .filter(inv => !session.customerId || inv.customerId === session.customerId)
    .map(inv => ({
      ...inv,
      internalNotes: undefined // Strip internal notes if present
    }));

  // 3. Filter Payments for Customer
  const customerPayments = (business.payments || [])
    .filter(p => !session.customerId || p.customerId === session.customerId);

  // 4. Filter Notifications for Customer
  const customerNotifications = getCustomerNotifications(business, session.customerId || session.uid);

  // 5. Project Information (Sanitized)
  const project = business.customerProject ? {
    id: business.customerProject.id,
    businessId: business.id,
    businessName: business.customerProject.businessName || business.name,
    domain: business.customerProject.customDomain,
    status: business.customerProject.status,
    launchDate: business.customerProject.targetDeliveryDate,
    websiteVersion: business.customerProject.currentWebsiteVersion || 1
  } : null;

  return {
    account: business.customerAccount || null,
    subscription: business.activeSubscription || null,
    invoices: customerInvoices,
    payments: customerPayments,
    supportTickets: customerTickets,
    project,
    communications: customerNotifications
  };
}

/**
 * Validates direct API or deep-link access bypassing UI navigation.
 */
export function authorizeDirectApiAccess(
  allBusinesses: Business[],
  session: CustomerSession | null | undefined,
  resourceType: PortalResourceType,
  targetResourceId: string
): {
  allowed: boolean;
  status: number;
  error?: string;
  data?: any;
} {
  const sessionCheck = isSessionValid(session);
  if (!sessionCheck.valid || !session) {
    return {
      allowed: false,
      status: 401,
      error: sessionCheck.error || "Authentication required."
    };
  }

  // Locate the business containing the requested resource
  let foundBusiness: Business | undefined;
  let targetResourceData: any = null;

  for (const biz of allBusinesses) {
    if (resourceType === "invoice") {
      const inv = (biz.invoices || []).find(i => i.id === targetResourceId || i.invoiceId === targetResourceId);
      if (inv) {
        foundBusiness = biz;
        targetResourceData = inv;
        break;
      }
    } else if (resourceType === "payment") {
      const pmt = (biz.payments || []).find(p => p.id === targetResourceId || p.paymentNumber === targetResourceId);
      if (pmt) {
        foundBusiness = biz;
        targetResourceData = pmt;
        break;
      }
    } else if (resourceType === "support_ticket") {
      const tickets = biz.supportTickets || biz.customerProject?.supportTickets || [];
      const t = tickets.find(tick => tick.id === targetResourceId || tick.ticketId === targetResourceId);
      if (t) {
        foundBusiness = biz;
        targetResourceData = sanitizeTicketForCustomer(t);
        break;
      }
    } else if (resourceType === "document") {
      const docs = (biz.customerProject as any)?.commercialDocuments || (biz as any).customerDocuments || [];
      const d = docs.find((doc: any) => doc.id === targetResourceId || doc.documentId === targetResourceId);
      if (d) {
        foundBusiness = biz;
        targetResourceData = d;
        break;
      }
    } else if (resourceType === "preview_record") {
      if (biz.id === targetResourceId || biz.customerProject?.id === targetResourceId) {
        foundBusiness = biz;
        targetResourceData = { id: targetResourceId, businessId: biz.id, status: "available" };
        break;
      }
    } else if (resourceType === "project" || resourceType === "account") {
      if (biz.id === targetResourceId || biz.customerAccount?.id === targetResourceId || biz.customerProject?.id === targetResourceId) {
        foundBusiness = biz;
        targetResourceData = biz.customerAccount || biz.customerProject;
        break;
      }
    }
  }

  if (!foundBusiness) {
    return {
      allowed: false,
      status: 404,
      error: "Requested resource not found."
    };
  }

  const authResult = authorizeCustomerAccess(foundBusiness, session, resourceType, targetResourceId, "read");
  if (!authResult.authorized) {
    return {
      allowed: false,
      status: authResult.status,
      error: authResult.reason || "Access denied: Unauthorized access to resource."
    };
  }

  return {
    allowed: true,
    status: 200,
    data: targetResourceData
  };
}

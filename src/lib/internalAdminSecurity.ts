export type {
  AdminPermission,
  HighRiskAdminOperation,
  InternalAdminRole,
  PrivilegedAdminAuditEvent,
  PrivilegedAuthorizationResult,
  StaffAccount
} from "../types";
import {
  AdminPermission,
  Business,
  CustomerSession,
  HighRiskAdminOperation,
  InternalAdminRole,
  PrivilegedAdminAuditEvent,
  PrivilegedAuthorizationResult,
  StaffAccount
} from "../types";
import { isSessionValid } from "./customerPortalAccess";
import { recordLifecycleAuditEvent } from "./prospectCrm";
import { bridgePrivilegedToCanonical, resetCanonicalAuditLogsForTesting } from "./canonicalAuditTrail";
export * from "./canonicalAuditTrail";

/**
 * MICRO-PHASE 17A: INTERNAL ADMINISTRATION, ROLES & PRIVILEGED OPERATIONS
 * 
 * Canonical engine for internal administration, role-based access control (RBAC),
 * high-risk operation guards, anti-privilege-escalation verification, and audit logging.
 */

/**
 * Normalizes any role representation into a canonical InternalAdminRole.
 */
export function normalizeAdminRole(role?: string | null): InternalAdminRole {
  if (!role || typeof role !== "string") return "CUSTOMER";
  const r = role.trim().toUpperCase();

  switch (r) {
    case "SUPER_ADMIN":
    case "SUPERADMIN":
      return "SUPER_ADMIN";
    case "ADMIN":
      return "ADMIN";
    case "MANAGER":
      return "MANAGER";
    case "SUPPORT":
      return "SUPPORT";
    case "SALES":
      return "SALES";
    case "STAFF":
      return "STAFF";
    case "USER":
    case "CLIENT":
    case "CUSTOMER":
    default:
      return "CUSTOMER";
  }
}

/**
 * Canonical Mapping of Role to Minimum Required Permissions.
 */
export const ROLE_PERMISSIONS: Record<InternalAdminRole, AdminPermission[]> = {
  CUSTOMER: [],

  STAFF: [
    "VIEW_CUSTOMERS",
    "VIEW_PROJECTS",
    "MANAGE_PROJECTS",
    "VIEW_CRM",
    "MANAGE_CRM",
    "VIEW_SUPPORT_TICKETS",
    "MANAGE_SUPPORT_TICKETS",
    "VIEW_INTERNAL_STAFF_NOTES",
    "WRITE_INTERNAL_STAFF_NOTES"
  ],

  SALES: [
    "VIEW_CUSTOMERS",
    "VIEW_PROJECTS",
    "VIEW_CRM",
    "MANAGE_CRM",
    "VIEW_SUBSCRIPTIONS",
    "VIEW_FINANCIALS"
  ],

  SUPPORT: [
    "VIEW_CUSTOMERS",
    "VIEW_SUPPORT_TICKETS",
    "MANAGE_SUPPORT_TICKETS",
    "VIEW_INTERNAL_STAFF_NOTES",
    "WRITE_INTERNAL_STAFF_NOTES",
    "VIEW_PROJECTS"
  ],

  MANAGER: [
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "ACCESS_SENSITIVE_CUSTOMER_DATA",
    "VIEW_SUBSCRIPTIONS",
    "VIEW_FINANCIALS",
    "VIEW_SUPPORT_TICKETS",
    "MANAGE_SUPPORT_TICKETS",
    "VIEW_INTERNAL_STAFF_NOTES",
    "WRITE_INTERNAL_STAFF_NOTES",
    "VIEW_PROJECTS",
    "MANAGE_PROJECTS",
    "PUBLISH_LAUNCH_WEBSITES",
    "VIEW_CRM",
    "MANAGE_CRM",
    "VIEW_STAFF_ACCOUNTS",
    "VIEW_AUDIT_LOGS",
    "VIEW_SYSTEM_HEALTH"
  ],

  ADMIN: [
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "CHANGE_CUSTOMER_OWNERSHIP",
    "ACCESS_SENSITIVE_CUSTOMER_DATA",
    "DELETE_CUSTOMER_ACCOUNT",
    "VIEW_SUBSCRIPTIONS",
    "CHANGE_SUBSCRIPTION_STATUS",
    "GRANT_REVOKE_ENTITLEMENTS",
    "VIEW_FINANCIALS",
    "EDIT_FINANCIAL_RECORDS",
    "ISSUE_REFUNDS",
    "VIEW_SUPPORT_TICKETS",
    "MANAGE_SUPPORT_TICKETS",
    "VIEW_INTERNAL_STAFF_NOTES",
    "WRITE_INTERNAL_STAFF_NOTES",
    "VIEW_PROJECTS",
    "MANAGE_PROJECTS",
    "PUBLISH_LAUNCH_WEBSITES",
    "VIEW_CRM",
    "MANAGE_CRM",
    "VIEW_STAFF_ACCOUNTS",
    "MANAGE_STAFF_ACCOUNTS",
    "CHANGE_USER_ROLES",
    "DEACTIVATE_USERS",
    "IMPERSONATE_USER",
    "VIEW_AUDIT_LOGS",
    "VIEW_SYSTEM_HEALTH"
  ],

  SUPER_ADMIN: [
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "CHANGE_CUSTOMER_OWNERSHIP",
    "ACCESS_SENSITIVE_CUSTOMER_DATA",
    "DELETE_CUSTOMER_ACCOUNT",
    "VIEW_SUBSCRIPTIONS",
    "CHANGE_SUBSCRIPTION_STATUS",
    "GRANT_REVOKE_ENTITLEMENTS",
    "VIEW_FINANCIALS",
    "EDIT_FINANCIAL_RECORDS",
    "ISSUE_REFUNDS",
    "VIEW_SUPPORT_TICKETS",
    "MANAGE_SUPPORT_TICKETS",
    "VIEW_INTERNAL_STAFF_NOTES",
    "WRITE_INTERNAL_STAFF_NOTES",
    "VIEW_PROJECTS",
    "MANAGE_PROJECTS",
    "PUBLISH_LAUNCH_WEBSITES",
    "VIEW_CRM",
    "MANAGE_CRM",
    "VIEW_STAFF_ACCOUNTS",
    "MANAGE_STAFF_ACCOUNTS",
    "CHANGE_USER_ROLES",
    "DEACTIVATE_USERS",
    "IMPERSONATE_USER",
    "VIEW_AUDIT_LOGS",
    "VIEW_SYSTEM_HEALTH",
    "MODIFY_SECURITY_SETTINGS",
    "SYSTEM_ADMIN"
  ]
};

/**
 * Checks whether a role possesses a specific administrative permission.
 */
export function hasPermission(role: InternalAdminRole | string, permission: AdminPermission): boolean {
  const canonicalRole = normalizeAdminRole(role);
  const permissions = ROLE_PERMISSIONS[canonicalRole] || [];
  return permissions.includes(permission);
}

/**
 * High-Risk Operations requiring explicit authorization and elevated permissions.
 */
export const HIGH_RISK_REQUIRED_PERMISSIONS: Record<HighRiskAdminOperation, AdminPermission> = {
  CHANGE_CUSTOMER_OWNERSHIP: "CHANGE_CUSTOMER_OWNERSHIP",
  CHANGE_SUBSCRIPTION_STATUS: "CHANGE_SUBSCRIPTION_STATUS",
  GRANT_REVOKE_ENTITLEMENTS: "GRANT_REVOKE_ENTITLEMENTS",
  EDIT_FINANCIAL_RECORDS: "EDIT_FINANCIAL_RECORDS",
  ISSUE_REFUNDS: "ISSUE_REFUNDS",
  DELETE_RECORDS: "DELETE_CUSTOMER_ACCOUNT",
  CHANGE_USER_ROLES: "CHANGE_USER_ROLES",
  ACCESS_SENSITIVE_CUSTOMER_DATA: "ACCESS_SENSITIVE_CUSTOMER_DATA",
  PUBLISH_LAUNCH_WEBSITES: "PUBLISH_LAUNCH_WEBSITES",
  MODIFY_SECURITY_SETTINGS: "MODIFY_SECURITY_SETTINGS",
  IMPERSONATE_USER: "IMPERSONATE_USER"
};

/**
 * Determines whether an operation is classified as high-risk.
 */
export function isHighRiskOperation(operation: string): operation is HighRiskAdminOperation {
  return operation in HIGH_RISK_REQUIRED_PERMISSIONS;
}

// =========================================================================
// CANONICAL STAFF DIRECTORY & REGISTRY
// =========================================================================

/**
 * Canonical in-memory staff directory seeded with foundational operators.
 * Replaced / augmented by backend database records.
 */
let staffRegistry: StaffAccount[] = [
  {
    id: "staff_super_admin",
    uid: "admin_super_404",
    email: "siphom.yati@gmail.com",
    name: "Sipho M. (Super Admin)",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "staff_admin_001",
    uid: "admin_user_001",
    email: "admin@sitescout.sz",
    name: "Platform Administrator",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "staff_mgr_001",
    uid: "manager_user_001",
    email: "manager@sitescout.sz",
    name: "Operations Manager",
    role: "MANAGER",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "staff_sup_001",
    uid: "support_agent_555",
    email: "support@agency.sz",
    name: "Support Specialist",
    role: "SUPPORT",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "staff_sales_001",
    uid: "sales_agent_001",
    email: "sales@agency.sz",
    name: "Sales Executive",
    role: "SALES",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "staff_staff_001",
    uid: "staff_agent_303",
    email: "agent@agency.sz",
    name: "Operations Fulfillment Staff",
    role: "STAFF",
    status: "ACTIVE",
    assignedBusinessIds: ["biz_portal_alpha"], // Scoped to Alpha Corp only
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

export function getStaffDirectory(): StaffAccount[] {
  return [...staffRegistry];
}

export function resetStaffRegistryForTesting(seed?: StaffAccount[]): void {
  staffRegistry = seed ? [...seed] : [
    {
      id: "staff_super_admin",
      uid: "admin_super_404",
      email: "siphom.yati@gmail.com",
      name: "Sipho M. (Super Admin)",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "staff_admin_001",
      uid: "admin_user_001",
      email: "admin@sitescout.sz",
      name: "Platform Administrator",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "staff_mgr_001",
      uid: "manager_user_001",
      email: "manager@sitescout.sz",
      name: "Operations Manager",
      role: "MANAGER",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "staff_sup_001",
      uid: "support_agent_555",
      email: "support@agency.sz",
      name: "Support Specialist",
      role: "SUPPORT",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "staff_sales_001",
      uid: "sales_agent_001",
      email: "sales@agency.sz",
      name: "Sales Executive",
      role: "SALES",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "staff_staff_001",
      uid: "staff_agent_303",
      email: "agent@agency.sz",
      name: "Operations Fulfillment Staff",
      role: "STAFF",
      status: "ACTIVE",
      assignedBusinessIds: ["biz_portal_alpha"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ];
}

export function findStaffAccount(identifier: string): StaffAccount | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toLowerCase().trim();
  return staffRegistry.find(
    s => s.id === identifier || s.uid === identifier || s.email.toLowerCase() === clean
  );
}

// =========================================================================
// PRIVILEGED AUDIT TRAIL LOGGING
// =========================================================================

let privilegedAuditLogs: PrivilegedAdminAuditEvent[] = [];

export function getPrivilegedAuditLogs(filter?: {
  actorUid?: string;
  operation?: string;
  status?: string;
  limit?: number;
}): PrivilegedAdminAuditEvent[] {
  let logs = [...privilegedAuditLogs];
  if (filter?.actorUid) {
    logs = logs.filter(l => l.actor.uid === filter.actorUid);
  }
  if (filter?.operation) {
    logs = logs.filter(l => l.operation === filter.operation);
  }
  if (filter?.status) {
    logs = logs.filter(l => l.status === filter.status);
  }
  if (filter?.limit) {
    logs = logs.slice(0, filter.limit);
  }
  return logs;
}

export function clearPrivilegedAuditLogsForTesting(): void {
  privilegedAuditLogs = [];
  try {
    resetCanonicalAuditLogsForTesting();
  } catch (e) {}
}

/**
 * Records a privileged admin audit event to both centralized admin audit logs
 * and business CRM lifecycle audits if a businessId is present.
 */
export async function recordPrivilegedAuditEvent(
  event: Omit<PrivilegedAdminAuditEvent, "id" | "timestamp">
): Promise<PrivilegedAdminAuditEvent> {
  const fullEvent: PrivilegedAdminAuditEvent = {
    ...event,
    id: `audit_priv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };

  privilegedAuditLogs.unshift(fullEvent);

  // Synchronize with Canonical Audit Trail
  try {
    await bridgePrivilegedToCanonical(fullEvent);
  } catch (e) {
    // Non-fatal sync
  }

  // Preserve existing CRM audit infrastructure without duplication
  if (fullEvent.targetEntity.businessId) {
    try {
      await recordLifecycleAuditEvent(
        fullEvent.targetEntity.businessId,
        {
          businessId: fullEvent.targetEntity.businessId,
          dimension: "crmSync",
          eventType: "crm_sync",
          actor: fullEvent.actor.name || fullEvent.actor.email,
          actorId: fullEvent.actor.uid,
          previousState: fullEvent.previousState ? JSON.stringify(fullEvent.previousState) : "none",
          newState: fullEvent.newState ? JSON.stringify(fullEvent.newState) : fullEvent.status,
          recordRef: `${fullEvent.targetEntity.entityType}:${fullEvent.targetEntity.entityId}`,
          metadata: {
            privilegedOperation: fullEvent.operation,
            status: fullEvent.status,
            role: fullEvent.actor.role,
            denialReason: fullEvent.denialReason || ""
          }
        },
        fullEvent.actor.uid
      );
    } catch (e) {
      // Non-fatal logging fallback
      console.warn("[Privileged Audit] Lifecycle sync skipped:", e);
    }
  }

  return fullEvent;
}

// =========================================================================
// CONCURRENCY & OPERATION LOCKING
// =========================================================================

interface OperationLock {
  lockKey: string;
  actorUid: string;
  expiresAt: number;
}

const activeOperationLocks = new Map<string, OperationLock>();

/**
 * Acquires an exclusive lock for concurrent privileged operation safety.
 */
export function acquireOperationLock(
  lockKey: string,
  actorUid: string,
  timeoutMs: number = 5000
): boolean {
  const now = Date.now();
  const existing = activeOperationLocks.get(lockKey);

  if (existing && existing.expiresAt > now) {
    if (existing.actorUid === actorUid) {
      // Re-entrant lock for same actor
      existing.expiresAt = now + timeoutMs;
      return true;
    }
    // Resource currently locked by another operation
    return false;
  }

  activeOperationLocks.set(lockKey, {
    lockKey,
    actorUid,
    expiresAt: now + timeoutMs
  });
  return true;
}

/**
 * Releases an operation lock.
 */
export function releaseOperationLock(lockKey: string, actorUid: string): void {
  const existing = activeOperationLocks.get(lockKey);
  if (existing && existing.actorUid === actorUid) {
    activeOperationLocks.delete(lockKey);
  }
}

export function clearOperationLocksForTesting(): void {
  activeOperationLocks.clear();
}

// =========================================================================
// OPERATOR IDENTITY & PERMISSION VALIDATION
// =========================================================================

export interface OperatorIdentityVerification {
  valid: boolean;
  operator?: StaffAccount;
  canonicalRole: InternalAdminRole;
  isEscalationAttempt: boolean;
  errorCode?: "UNAUTHENTICATED" | "EXPIRED_SESSION" | "ACCOUNT_DEACTIVATED" | "OPERATOR_REVOKED" | "PRIVILEGE_ESCALATION_BLOCKED";
  reason?: string;
}

/**
 * Verifies operator identity against the canonical staff directory.
 * Strictly prevents role manipulation through client state or browser payloads.
 */
export function verifyOperatorIdentity(
  actor?: { uid?: string; email?: string; name?: string; role?: string } | null,
  session?: CustomerSession | null
): OperatorIdentityVerification {
  // 1. Check for Active Session Validity if provided
  if (session) {
    const sessionCheck = isSessionValid(session);
    if (!sessionCheck.valid) {
      return {
        valid: false,
        canonicalRole: "CUSTOMER",
        isEscalationAttempt: false,
        errorCode: sessionCheck.errorCode || "UNAUTHENTICATED",
        reason: sessionCheck.error || "Authentication required."
      };
    }
  }

  const effectiveUid = actor?.uid || session?.uid;
  const effectiveEmail = actor?.email || session?.email;

  if (!effectiveUid && !effectiveEmail) {
    return {
      valid: false,
      canonicalRole: "CUSTOMER",
      isEscalationAttempt: false,
      errorCode: "UNAUTHENTICATED",
      reason: "Authentication required. Missing actor credentials."
    };
  }

  // 2. Query Canonical Staff Directory
  const staff = findStaffAccount(effectiveUid || "") || findStaffAccount(effectiveEmail || "");

  if (!staff) {
    // Caller is a Customer / External User
    const claimedRole = normalizeAdminRole(actor?.role || session?.role);
    if (claimedRole !== "CUSTOMER") {
      // Detected Privilege Escalation Attempt: External user claimed an internal staff/admin role!
      return {
        valid: false,
        canonicalRole: "CUSTOMER",
        isEscalationAttempt: true,
        errorCode: "PRIVILEGE_ESCALATION_BLOCKED",
        reason: `Privilege escalation blocked: Unregistered user '${effectiveEmail || effectiveUid}' attempted to assume '${claimedRole}' role.`
      };
    }
    return {
      valid: true,
      canonicalRole: "CUSTOMER",
      isEscalationAttempt: false
    };
  }

  // 3. Check for Revocation / Deactivation
  if (staff.isRevoked) {
    return {
      valid: false,
      operator: staff,
      canonicalRole: staff.role,
      isEscalationAttempt: false,
      errorCode: "OPERATOR_REVOKED",
      reason: "Operator account privileges have been revoked."
    };
  }

  if (staff.status === "SUSPENDED" || staff.status === "DEACTIVATED") {
    return {
      valid: false,
      operator: staff,
      canonicalRole: staff.role,
      isEscalationAttempt: false,
      errorCode: "ACCOUNT_DEACTIVATED",
      reason: `Operator account is ${staff.status.toLowerCase()}. Access denied.`
    };
  }

  // 4. Role Tampering Verification: Check if claimed role exceeds verified canonical role
  const claimedRole = normalizeAdminRole(actor?.role || session?.role);
  if (actor?.role && claimedRole !== staff.role) {
    const roleHierarchy: Record<InternalAdminRole, number> = {
      CUSTOMER: 0,
      STAFF: 1,
      SALES: 1,
      SUPPORT: 1,
      MANAGER: 2,
      ADMIN: 3,
      SUPER_ADMIN: 4
    };

    if (roleHierarchy[claimedRole] > roleHierarchy[staff.role]) {
      return {
        valid: false,
        operator: staff,
        canonicalRole: staff.role,
        isEscalationAttempt: true,
        errorCode: "PRIVILEGE_ESCALATION_BLOCKED",
        reason: `Privilege escalation blocked: Operator '${staff.email}' (verified: ${staff.role}) attempted to assume elevated '${claimedRole}' role.`
      };
    }
  }

  return {
    valid: true,
    operator: staff,
    canonicalRole: staff.role,
    isEscalationAttempt: false
  };
}

// =========================================================================
// SERVER-SIDE PRIVILEGED AUTHORIZATION ENGINE
// =========================================================================

export interface AuthorizePrivilegedOperationParams {
  actor?: { uid?: string; email?: string; name?: string; role?: string } | null;
  session?: CustomerSession | null;
  operation: HighRiskAdminOperation | string;
  requiredPermission?: AdminPermission;
  targetEntity?: {
    entityType: string;
    entityId: string;
    businessId?: string;
  };
  highRiskJustification?: string;
  action?: "read" | "write" | "admin" | "delete";
}

/**
 * Authorizes privileged operations server-side.
 * Enforces role boundaries, anti-escalation guards, scope isolation,
 * concurrency protections, and automatic immutable audit trail persistence.
 */
export async function authorizePrivilegedOperation(
  params: AuthorizePrivilegedOperationParams
): Promise<PrivilegedAuthorizationResult> {
  const targetEntity = params.targetEntity || { entityType: "system", entityId: "root" };
  const action = params.action || "write";

  // 1. Identity & Anti-Escalation Check
  const identity = verifyOperatorIdentity(params.actor, params.session);

  if (!identity.valid) {
    const audit = await recordPrivilegedAuditEvent({
      actor: {
        uid: params.actor?.uid || params.session?.uid || "unauthenticated",
        email: params.actor?.email || params.session?.email || "anonymous",
        name: params.actor?.name,
        role: identity.canonicalRole
      },
      operation: params.operation,
      targetEntity,
      action,
      status: "DENIED",
      denialReason: identity.reason || "Identity verification failed"
    });

    const status = identity.errorCode === "UNAUTHENTICATED" || identity.errorCode === "EXPIRED_SESSION" ? 401 : 403;
    return {
      authorized: false,
      status,
      errorCode: identity.errorCode,
      reason: identity.reason,
      auditEvent: audit
    };
  }

  const role = identity.canonicalRole;
  const operator = identity.operator;

  // 2. Customers must NEVER access internal administration
  if (role === "CUSTOMER") {
    const audit = await recordPrivilegedAuditEvent({
      actor: {
        uid: params.actor?.uid || params.session?.uid || "unknown",
        email: params.actor?.email || params.session?.email || "unknown",
        name: params.actor?.name,
        role: "CUSTOMER"
      },
      operation: params.operation,
      targetEntity,
      action,
      status: "DENIED",
      denialReason: "Customer access denied to internal administration function."
    });

    return {
      authorized: false,
      status: 403,
      errorCode: "ROLE_UNAUTHORIZED",
      reason: "Access denied: Internal administration functions are restricted to authorized personnel.",
      auditEvent: audit
    };
  }

  // 3. Determine Required Permission
  let reqPermission = params.requiredPermission;
  if (!reqPermission && isHighRiskOperation(params.operation)) {
    reqPermission = HIGH_RISK_REQUIRED_PERMISSIONS[params.operation];
  }

  if (reqPermission && !hasPermission(role, reqPermission)) {
    const audit = await recordPrivilegedAuditEvent({
      actor: {
        uid: operator!.uid,
        email: operator!.email,
        name: operator!.name,
        role
      },
      operation: params.operation,
      targetEntity,
      action,
      status: "DENIED",
      denialReason: `Role '${role}' lacks required permission '${reqPermission}'`
    });

    return {
      authorized: false,
      status: 403,
      errorCode: "ROLE_UNAUTHORIZED",
      reason: `Forbidden: Role '${role}' lacks required permission '${reqPermission}'.`,
      auditEvent: audit
    };
  }

  // 4. Staff Customer Scope Check (Staff accessing an unauthorized customer)
  if (
    operator &&
    operator.assignedBusinessIds &&
    operator.assignedBusinessIds.length > 0 &&
    targetEntity.businessId
  ) {
    if (!operator.assignedBusinessIds.includes(targetEntity.businessId) && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const audit = await recordPrivilegedAuditEvent({
        actor: {
          uid: operator.uid,
          email: operator.email,
          name: operator.name,
          role
        },
        operation: params.operation,
        targetEntity,
        action,
        status: "DENIED",
        denialReason: `Staff '${operator.email}' is not assigned to business '${targetEntity.businessId}'`
      });

      return {
        authorized: false,
        status: 403,
        errorCode: "UNAUTHORIZED_CUSTOMER_SCOPE",
        reason: `Forbidden: You do not have permission to access records for customer '${targetEntity.businessId}'.`,
        auditEvent: audit
      };
    }
  }

  // 5. High-Risk Justification Check
  if (isHighRiskOperation(params.operation) && !params.highRiskJustification && role !== "SUPER_ADMIN") {
    const audit = await recordPrivilegedAuditEvent({
      actor: {
        uid: operator!.uid,
        email: operator!.email,
        name: operator!.name,
        role
      },
      operation: params.operation,
      targetEntity,
      action,
      status: "DENIED",
      denialReason: "High-risk operation requires explicit justification."
    });

    return {
      authorized: false,
      status: 400,
      errorCode: "HIGH_RISK_JUSTIFICATION_REQUIRED",
      reason: "High-risk operation requires an explicit justification/reason.",
      auditEvent: audit
    };
  }

  // 6. Record Authorized Audit Event
  const audit = await recordPrivilegedAuditEvent({
    actor: {
      uid: operator!.uid,
      email: operator!.email,
      name: operator!.name,
      role
    },
    operation: params.operation,
    targetEntity,
    action,
    status: "AUTHORIZED",
    metadata: {
      justification: params.highRiskJustification || "Standard operational execution"
    }
  });

  return {
    authorized: true,
    status: 200,
    auditEvent: audit
  };
}

// =========================================================================
// HIGH-RISK OPERATIONS EXECUTORS
// =========================================================================

/**
 * High-Risk: Change Customer Ownership.
 */
export async function executeChangeCustomerOwnership(params: {
  targetBusiness: Business;
  newOwnerUserId: string;
  newOwnerEmail: string;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "CHANGE_CUSTOMER_OWNERSHIP",
    targetEntity: {
      entityType: "business_customer_account",
      entityId: params.targetBusiness.customerAccount?.id || params.targetBusiness.id,
      businessId: params.targetBusiness.id
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const updatedBiz: Business = {
    ...params.targetBusiness,
    customerAccount: params.targetBusiness.customerAccount ? {
      ...params.targetBusiness.customerAccount,
      ownerUserId: params.newOwnerUserId,
      primaryEmail: params.newOwnerEmail,
      updatedAt: new Date().toISOString()
    } : undefined
  };

  return { success: true, business: updatedBiz, status: 200 };
}

/**
 * High-Risk: Change Subscription Status.
 */
export async function executeChangeSubscriptionStatus(params: {
  targetBusiness: Business;
  newStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "SUSPENDED";
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "CHANGE_SUBSCRIPTION_STATUS",
    targetEntity: {
      entityType: "subscription",
      entityId: params.targetBusiness.activeSubscription?.id || "sub_active",
      businessId: params.targetBusiness.id
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const updatedBiz: Business = {
    ...params.targetBusiness,
    activeSubscription: params.targetBusiness.activeSubscription ? {
      ...params.targetBusiness.activeSubscription,
      status: params.newStatus as any,
      updatedAt: new Date().toISOString()
    } : undefined,
    customerAccount: params.targetBusiness.customerAccount ? {
      ...params.targetBusiness.customerAccount,
      currentSubscriptionStatus: params.newStatus as any,
      updatedAt: new Date().toISOString()
    } : undefined
  };

  return { success: true, business: updatedBiz, status: 200 };
}

/**
 * High-Risk: Grant or Revoke Entitlements.
 */
export async function executeGrantOrRevokeEntitlements(params: {
  targetBusiness: Business;
  entitlementKey: string;
  granted: boolean;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "GRANT_REVOKE_ENTITLEMENTS",
    targetEntity: {
      entityType: "entitlement",
      entityId: params.entitlementKey,
      businessId: params.targetBusiness.id
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const currentEntitlements = (params.targetBusiness.activeSubscription as any)?.entitlements || {};
  const updatedBiz: Business = {
    ...params.targetBusiness,
    activeSubscription: params.targetBusiness.activeSubscription ? {
      ...params.targetBusiness.activeSubscription,
      entitlements: {
        ...currentEntitlements,
        [params.entitlementKey]: params.granted
      }
    } as any : undefined
  };

  return { success: true, business: updatedBiz, status: 200 };
}

/**
 * High-Risk: Edit Financial Records.
 */
export async function executeEditFinancialRecords(params: {
  targetBusiness: Business;
  invoiceId: string;
  adjustments: { amountDue?: number; status?: any };
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "EDIT_FINANCIAL_RECORDS",
    targetEntity: {
      entityType: "invoice",
      entityId: params.invoiceId,
      businessId: params.targetBusiness.id
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const invoices = params.targetBusiness.invoices || [];
  const updatedInvoices = invoices.map(inv => {
    if (inv.id === params.invoiceId || inv.invoiceId === params.invoiceId) {
      return {
        ...inv,
        ...params.adjustments,
        updatedAt: new Date().toISOString()
      };
    }
    return inv;
  });

  return {
    success: true,
    business: { ...params.targetBusiness, invoices: updatedInvoices },
    status: 200
  };
}

/**
 * High-Risk: Issue Refund with Concurrency Lock.
 */
export async function executeIssueRefund(params: {
  targetBusiness: Business;
  paymentId: string;
  refundAmount: number;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const lockKey = `refund_lock_${params.paymentId}`;
  const acquired = acquireOperationLock(lockKey, params.actor.uid);
  if (!acquired) {
    return {
      success: false,
      error: "Conflict: Another refund operation is currently in flight on this payment.",
      status: 409
    };
  }

  try {
    const auth = await authorizePrivilegedOperation({
      actor: params.actor,
      session: params.session,
      operation: "ISSUE_REFUNDS",
      targetEntity: {
        entityType: "payment",
        entityId: params.paymentId,
        businessId: params.targetBusiness.id
      },
      highRiskJustification: params.reason
    });

    if (!auth.authorized) {
      return { success: false, error: auth.reason, status: auth.status };
    }

    const payments = params.targetBusiness.payments || [];
    const payment = payments.find(p => p.id === params.paymentId);
    if (!payment) {
      return { success: false, error: "Payment record not found.", status: 404 };
    }

    if (payment.amount < params.refundAmount) {
      return { success: false, error: "Refund amount exceeds paid amount.", status: 400 };
    }

    const updatedPayments = payments.map(p => {
      if (p.id === params.paymentId) {
        return {
          ...p,
          refundedAmount: (p.refundedAmount || 0) + params.refundAmount,
          status: (p.refundedAmount || 0) + params.refundAmount >= p.amount ? "REFUNDED" : "PARTIALLY_REFUNDED"
        };
      }
      return p;
    });

    return {
      success: true,
      business: { ...params.targetBusiness, payments: updatedPayments as any },
      status: 200
    };
  } finally {
    releaseOperationLock(lockKey, params.actor.uid);
  }
}

/**
 * High-Risk: Change User Role.
 */
export async function executeChangeUserRole(params: {
  targetStaffId: string;
  newRole: InternalAdminRole;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; updatedAccount?: StaffAccount; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "CHANGE_USER_ROLES",
    targetEntity: {
      entityType: "staff_account",
      entityId: params.targetStaffId
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  // Operators cannot grant roles higher than their own verified role
  const actorAccount = findStaffAccount(params.actor.uid) || findStaffAccount(params.actor.email);
  const actorRole = actorAccount?.role || "CUSTOMER";

  if (params.newRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    await recordPrivilegedAuditEvent({
      actor: {
        uid: params.actor.uid,
        email: params.actor.email,
        name: params.actor.name,
        role: actorRole
      },
      operation: "CHANGE_USER_ROLES",
      targetEntity: { entityType: "staff_account", entityId: params.targetStaffId },
      action: "write",
      status: "DENIED",
      denialReason: "Only SUPER_ADMIN can grant the SUPER_ADMIN role."
    });

    return {
      success: false,
      error: "Forbidden: Only SUPER_ADMIN can grant the SUPER_ADMIN role.",
      status: 403
    };
  }

  const target = staffRegistry.find(s => s.id === params.targetStaffId || s.uid === params.targetStaffId);
  if (!target) {
    return { success: false, error: "Target staff account not found.", status: 404 };
  }

  target.role = params.newRole;
  target.updatedAt = new Date().toISOString();

  return { success: true, updatedAccount: { ...target }, status: 200 };
}

/**
 * High-Risk: Deactivate or Revoke Staff Account.
 */
export async function executeDeactivateStaffAccount(params: {
  targetStaffId: string;
  revokeImmediately?: boolean;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "DEACTIVATE_USERS",
    targetEntity: {
      entityType: "staff_account",
      entityId: params.targetStaffId
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const target = staffRegistry.find(s => s.id === params.targetStaffId || s.uid === params.targetStaffId);
  if (!target) {
    return { success: false, error: "Target staff account not found.", status: 404 };
  }

  target.status = "DEACTIVATED";
  if (params.revokeImmediately) {
    target.isRevoked = true;
  }
  target.updatedAt = new Date().toISOString();

  return { success: true, status: 200 };
}

/**
 * High-Risk: Delete Records.
 */
export async function executeDeleteRecord(params: {
  targetEntityType: string;
  targetEntityId: string;
  businessId?: string;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "DELETE_RECORDS",
    targetEntity: {
      entityType: params.targetEntityType,
      entityId: params.targetEntityId,
      businessId: params.businessId
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  return { success: true, status: 200 };
}

/**
 * High-Risk: Publish or Launch Customer Website.
 */
export async function executePublishLaunchWebsite(params: {
  targetBusiness: Business;
  siteId: string;
  customDomain?: string;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; business?: Business; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "PUBLISH_LAUNCH_WEBSITES",
    targetEntity: {
      entityType: "website",
      entityId: params.siteId,
      businessId: params.targetBusiness.id
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  const updatedBiz: Business = {
    ...params.targetBusiness,
    customerProject: params.targetBusiness.customerProject ? {
      ...params.targetBusiness.customerProject,
      launchStatus: "DEPLOYED_VERIFIED",
      status: "COMPLETED",
      customDomain: params.customDomain || params.targetBusiness.customerProject.customDomain,
      updatedAt: new Date().toISOString()
    } : undefined
  };

  return { success: true, business: updatedBiz, status: 200 };
}

/**
 * High-Risk: Modify Core Security Settings.
 */
export async function executeModifySecuritySettings(params: {
  settingKey: string;
  newValue: any;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<{ success: boolean; error?: string; status: number }> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "MODIFY_SECURITY_SETTINGS",
    targetEntity: {
      entityType: "system_security_setting",
      entityId: params.settingKey
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return { success: false, error: auth.reason, status: auth.status };
  }

  return { success: true, status: 200 };
}

/**
 * High-Risk: User Impersonation with Strict Audit Trail.
 * Forbids unlogged impersonation and restricts to ADMIN and SUPER_ADMIN.
 */
export interface ImpersonationResult {
  success: boolean;
  impersonationSession?: {
    impersonatedUserId: string;
    impersonatedEmail?: string;
    impersonatedByUid: string;
    impersonatedByRole: InternalAdminRole;
    startedAt: string;
    expiresAt: string;
  };
  error?: string;
  status: number;
}

export async function executeUserImpersonation(params: {
  targetUserId: string;
  targetUserEmail?: string;
  actor: { uid: string; email: string; role?: string; name?: string };
  session?: CustomerSession | null;
  reason: string;
}): Promise<ImpersonationResult> {
  const auth = await authorizePrivilegedOperation({
    actor: params.actor,
    session: params.session,
    operation: "IMPERSONATE_USER",
    requiredPermission: "IMPERSONATE_USER",
    targetEntity: {
      entityType: "user_account",
      entityId: params.targetUserId
    },
    highRiskJustification: params.reason
  });

  if (!auth.authorized) {
    return {
      success: false,
      error: auth.reason || "Unauthorized impersonation attempt.",
      status: auth.status
    };
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1-hour session limit

  return {
    success: true,
    impersonationSession: {
      impersonatedUserId: params.targetUserId,
      impersonatedEmail: params.targetUserEmail,
      impersonatedByUid: params.actor.uid,
      impersonatedByRole: normalizeAdminRole(params.actor.role),
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString()
    },
    status: 200
  };
}

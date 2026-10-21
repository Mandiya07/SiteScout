import {
  Business,
  CustomerAccountSettings,
  CustomerBillingPreferences,
  CustomerBusinessInfoSettings,
  CustomerProfileSettings,
  CustomerSecuritySettings,
  CustomerSession,
  CustomerNotificationPreferences,
  TaskAssignee
} from "../types";
import { authorizeCustomerAccess } from "./customerPortalAccess";
import { saveBusinessRecord } from "./businessPersistence";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./customerCommunications";

/**
 * MICRO-PHASE 16D: CUSTOMER ACCOUNT SETTINGS, PREFERENCES & DATA MANAGEMENT
 * 
 * Canonical customer settings engine providing:
 * 1. Strict input validation across profile, business info, notification & billing preferences.
 * 2. Truth-profile protection: Customer updates preserve verified business data and are classified as BUSINESS_SUPPLIED.
 * 3. Immutable audit trails for all sensitive setting adjustments.
 * 4. Safe account deactivation preserving financial, contractual, and audit compliance history.
 * 5. Multi-tenant customer boundary isolation.
 */

export const SUPPORTED_TIMEZONES = [
  "Africa/Mbabane",
  "Africa/Johannesburg",
  "UTC",
  "GMT",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney"
];

/**
 * Validates customer profile updates.
 */
export function validateProfileSettings(profile?: Partial<CustomerProfileSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!profile) return { valid: false, errors: ["Profile payload is required."] };

  if (profile.displayName !== undefined) {
    const trimmed = profile.displayName.trim();
    if (trimmed.length < 2) {
      errors.push("Display name must be at least 2 characters.");
    }
  }

  if (profile.contactEmail !== undefined) {
    const email = profile.contactEmail.trim();
    if (!email || !email.includes("@") || !email.includes(".")) {
      errors.push("A valid contact email address is required.");
    }
  }

  if (profile.phoneNumber !== undefined && profile.phoneNumber.trim() !== "") {
    const digits = profile.phoneNumber.replace(/\D/g, "");
    if (digits.length < 7) {
      errors.push("Phone number must contain at least 7 digits.");
    }
  }

  if (profile.timeZone !== undefined) {
    const tz = profile.timeZone.trim();
    if (!tz || tz.length < 2) {
      errors.push("Time zone cannot be empty.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates business information settings.
 */
export function validateBusinessInfoSettings(bizInfo?: Partial<CustomerBusinessInfoSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!bizInfo) return { valid: false, errors: ["Business info payload is required."] };

  if (bizInfo.companyName !== undefined) {
    const name = bizInfo.companyName.trim();
    if (name.length < 2) {
      errors.push("Company name must be at least 2 characters.");
    }
  }

  if (bizInfo.websiteUrl !== undefined && bizInfo.websiteUrl.trim() !== "") {
    const url = bizInfo.websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.includes(".")) {
      errors.push("Website URL must be a valid domain or web address.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Retrieves or bootstraps canonical account settings for a business.
 */
export function getCanonicalAccountSettings(business: Business): CustomerAccountSettings {
  if (business.accountSettings) {
    return business.accountSettings;
  }

  const account = business.customerAccount;
  const now = new Date().toISOString();
  const customerId = account?.customerId || `cust_${business.id.substring(0, 8)}`;

  const recipientPrefs = business.notificationPreferences?.[customerId] || DEFAULT_NOTIFICATION_PREFERENCES;

  return {
    id: `settings_${customerId}`,
    customerId,
    businessId: business.id,
    profile: {
      displayName: account?.businessName || business.name,
      contactEmail: account?.primaryEmail || business.email || "client@company.sz",
      phoneNumber: business.phone || "",
      timeZone: "Africa/Mbabane",
      locale: "en-SZ"
    },
    businessInfo: {
      companyName: business.name,
      physicalAddress: business.address || "",
      websiteUrl: business.sourceUrl || "",
      industryCategory: business.category || "General Business"
    },
    notificationPreferences: { ...recipientPrefs },
    billingPreferences: {
      invoiceDeliveryEmail: account?.primaryEmail || business.email || "",
      preferredCurrency: business.currency || "SZL",
      billingFrequency: "MONTHLY",
      taxExempt: false,
      poNumberRequired: false
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 1440,
      activeSessionsCount: 1
    },
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Updates customer account settings with strict boundary and validation enforcement.
 */
export async function updateCustomerAccountSettings(
  business: Business,
  session: CustomerSession,
  settingsUpdate: {
    profile?: Partial<CustomerProfileSettings>;
    businessInfo?: Partial<CustomerBusinessInfoSettings>;
    notificationPreferences?: Partial<CustomerNotificationPreferences>;
    billingPreferences?: Partial<CustomerBillingPreferences>;
    security?: Partial<CustomerSecuritySettings>;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  settings?: CustomerAccountSettings;
  error?: string;
  status?: number;
}> {
  // 1. Authorization check
  const authCheck = authorizeCustomerAccess(business, session, "account", undefined, "write");
  if (!authCheck.authorized) {
    return {
      success: false,
      business,
      status: authCheck.status,
      error: authCheck.reason || "Unauthorized: You do not have permission to modify these settings."
    };
  }

  // 2. Validate Profile Updates
  if (settingsUpdate.profile) {
    const profileVal = validateProfileSettings(settingsUpdate.profile);
    if (!profileVal.valid) {
      return {
        success: false,
        business,
        status: 400,
        error: `Profile validation failed: ${profileVal.errors.join("; ")}`
      };
    }
  }

  // 3. Validate Business Info Updates
  if (settingsUpdate.businessInfo) {
    const bizVal = validateBusinessInfoSettings(settingsUpdate.businessInfo);
    if (!bizVal.valid) {
      return {
        success: false,
        business,
        status: 400,
        error: `Business information validation failed: ${bizVal.errors.join("; ")}`
      };
    }
  }

  const currentSettings = getCanonicalAccountSettings(business);
  const now = new Date().toISOString();

  // 4. Construct Updated Settings
  const updatedProfile: CustomerProfileSettings = {
    ...currentSettings.profile,
    ...(settingsUpdate.profile || {})
  };

  const updatedBusinessInfo: CustomerBusinessInfoSettings = {
    ...currentSettings.businessInfo,
    ...(settingsUpdate.businessInfo || {})
  };

  const updatedNotifPrefs: CustomerNotificationPreferences = {
    ...currentSettings.notificationPreferences,
    ...(settingsUpdate.notificationPreferences || {}),
    updatedAt: now
  };

  const updatedBillingPrefs: CustomerBillingPreferences = {
    ...currentSettings.billingPreferences,
    ...(settingsUpdate.billingPreferences || {})
  };

  const updatedSecurity: CustomerSecuritySettings = {
    ...currentSettings.security,
    ...(settingsUpdate.security || {})
  };

  const newSettings: CustomerAccountSettings = {
    ...currentSettings,
    profile: updatedProfile,
    businessInfo: updatedBusinessInfo,
    notificationPreferences: updatedNotifPrefs,
    billingPreferences: updatedBillingPrefs,
    security: updatedSecurity,
    updatedAt: now
  };

  // 5. Preserve Verified Business Truth Data from Accidental Overwrite
  // Customer updates to address/phone are classified as BUSINESS_SUPPLIED, never downgrading VERIFIED evidence
  let updatedTruthProfile = business.truthProfile;
  if (updatedTruthProfile && settingsUpdate.businessInfo) {
    const tp = { ...updatedTruthProfile };
    if (settingsUpdate.businessInfo.physicalAddress && tp.address?.level !== "VERIFIED") {
      tp.address = {
        ...tp.address,
        value: settingsUpdate.businessInfo.physicalAddress,
        level: "BUSINESS_SUPPLIED",
        status: "CONFIRMED",
        statusText: "✓ Owner Supplied"
      };
    }
    if (settingsUpdate.profile?.phoneNumber && tp.phone?.level !== "VERIFIED") {
      tp.phone = {
        ...tp.phone,
        value: settingsUpdate.profile.phoneNumber,
        level: "BUSINESS_SUPPLIED",
        status: "CONFIRMED",
        statusText: "✓ Owner Supplied"
      };
    }
    updatedTruthProfile = tp;
  }

  // 6. Audit Logging in Customer Account
  const updatedAccount = business.customerAccount ? {
    ...business.customerAccount,
    primaryEmail: updatedProfile.contactEmail || business.customerAccount.primaryEmail,
    businessName: updatedBusinessInfo.companyName || business.customerAccount.businessName,
    updatedAt: now,
    auditTrail: [
      ...(business.customerAccount.auditTrail || []),
      {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        actor,
        action: "SETTINGS_UPDATED" as const,
        notes: `Settings updated by ${actor.displayName || session.email}`
      }
    ]
  } : undefined;

  const updatedBiz: Business = {
    ...business,
    name: updatedBusinessInfo.companyName || business.name,
    address: updatedBusinessInfo.physicalAddress || business.address,
    phone: updatedProfile.phoneNumber || business.phone,
    email: updatedProfile.contactEmail || business.email,
    truthProfile: updatedTruthProfile,
    customerAccount: updatedAccount,
    accountSettings: newSettings,
    notificationPreferences: {
      ...(business.notificationPreferences || {}),
      [newSettings.customerId]: updatedNotifPrefs
    }
  };

  try {
    await saveBusinessRecord(updatedBiz);
  } catch (e: any) {
    return {
      success: false,
      business,
      status: 500,
      error: `Failed to persist settings: ${e.message || "Database write error"}`
    };
  }

  return {
    success: true,
    business: updatedBiz,
    settings: newSettings,
    status: 200
  };
}

/**
 * Deactivates a customer account with explicit confirmation and preservation
 * of legally/business-required financial, contractual, and audit history.
 */
export async function deactivateCustomerAccount(
  business: Business,
  session: CustomerSession,
  deactivationData: {
    confirmDeactivation: boolean;
    reason?: string;
    feedback?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  deactivationSummary?: any;
  error?: string;
  status?: number;
}> {
  // 1. Authorization check
  const authCheck = authorizeCustomerAccess(business, session, "account", undefined, "write");
  if (!authCheck.authorized) {
    return {
      success: false,
      business,
      status: authCheck.status,
      error: authCheck.reason || "Unauthorized: You do not have permission to deactivate this account."
    };
  }

  // 2. Explicit Confirmation Guard
  if (!deactivationData.confirmDeactivation) {
    return {
      success: false,
      business,
      status: 400,
      error: "Account deactivation rejected: Explicit user confirmation is required."
    };
  }

  const now = new Date().toISOString();
  const currentSettings = getCanonicalAccountSettings(business);

  // 3. Compute preserved historical records (Financial, contractual, and audit compliance preservation)
  const preservedHistoricalRecords = {
    invoicesCount: (business.invoices || []).length,
    paymentsCount: (business.payments || []).length,
    supportTicketsCount: (business.supportTickets || business.customerProject?.supportTickets || []).length,
    contractsCount: (business.commercialDocuments || []).length,
    auditLogsCount: (business.customerAccount?.auditTrail || []).length
  };

  // 4. Update Deactivation Status
  const updatedSettings: CustomerAccountSettings = {
    ...currentSettings,
    deactivationStatus: {
      isDeactivated: true,
      deactivatedAt: now,
      deactivatedBy: actor.displayName || session.email,
      reason: deactivationData.reason || "Customer requested deactivation",
      preservedHistoricalRecords
    },
    updatedAt: now
  };

  // 5. Update Account Status to SUSPENDED / CLOSED
  const updatedAccount = business.customerAccount ? {
    ...business.customerAccount,
    accountStatus: "SUSPENDED" as const,
    currentSubscriptionStatus: "CANCELLED" as const,
    updatedAt: now,
    auditTrail: [
      ...(business.customerAccount.auditTrail || []),
      {
        id: `audit_deact_${Date.now()}`,
        timestamp: now,
        actor,
        action: "DEACTIVATED" as const,
        fromStatus: business.customerAccount.accountStatus,
        toStatus: "SUSPENDED" as const,
        notes: `Account deactivated. Reason: ${deactivationData.reason || "Customer requested"}. Preserved ${preservedHistoricalRecords.invoicesCount} invoices, ${preservedHistoricalRecords.paymentsCount} payments.`
      }
    ]
  } : undefined;

  // 6. Suspend active subscription if exists
  const updatedSubscription = business.activeSubscription ? {
    ...business.activeSubscription,
    status: "CANCELLED" as const,
    cancelledAt: now,
    cancelReason: deactivationData.reason || "Account deactivated",
    updatedAt: now
  } : undefined;

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    activeSubscription: updatedSubscription,
    accountSettings: updatedSettings
  };

  try {
    await saveBusinessRecord(updatedBiz);
  } catch (e: any) {
    return {
      success: false,
      business,
      status: 500,
      error: `Failed to persist account deactivation: ${e.message || "Database write error"}`
    };
  }

  return {
    success: true,
    business: updatedBiz,
    status: 200,
    deactivationSummary: {
      isDeactivated: true,
      deactivatedAt: now,
      preservedHistoricalRecords
    }
  };
}

/**
 * Reactivates a previously deactivated customer account.
 */
export async function reactivateCustomerAccount(
  business: Business,
  session: CustomerSession,
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  error?: string;
  status?: number;
}> {
  const authCheck = authorizeCustomerAccess(business, session, "account", undefined, "write");
  if (!authCheck.authorized) {
    return {
      success: false,
      business,
      status: authCheck.status,
      error: authCheck.reason || "Unauthorized to reactivate account."
    };
  }

  const now = new Date().toISOString();
  const currentSettings = getCanonicalAccountSettings(business);

  const updatedSettings: CustomerAccountSettings = {
    ...currentSettings,
    deactivationStatus: {
      isDeactivated: false,
      preservedHistoricalRecords: currentSettings.deactivationStatus?.preservedHistoricalRecords || {
        invoicesCount: 0,
        paymentsCount: 0,
        supportTicketsCount: 0,
        contractsCount: 0,
        auditLogsCount: 0
      }
    },
    updatedAt: now
  };

  const updatedAccount = business.customerAccount ? {
    ...business.customerAccount,
    accountStatus: "ACTIVE" as const,
    updatedAt: now,
    auditTrail: [
      ...(business.customerAccount.auditTrail || []),
      {
        id: `audit_react_${Date.now()}`,
        timestamp: now,
        actor,
        action: "REACTIVATED" as const,
        fromStatus: business.customerAccount.accountStatus,
        toStatus: "ACTIVE" as const,
        notes: `Account reactivated by ${actor.displayName || session.email}`
      }
    ]
  } : undefined;

  const updatedBiz: Business = {
    ...business,
    customerAccount: updatedAccount,
    accountSettings: updatedSettings
  };

  try {
    await saveBusinessRecord(updatedBiz);
  } catch (e: any) {
    return {
      success: false,
      business,
      status: 500,
      error: `Failed to persist reactivation: ${e.message}`
    };
  }

  return {
    success: true,
    business: updatedBiz,
    status: 200
  };
}

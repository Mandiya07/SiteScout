import { 
  Business, 
  ContactRecord, 
  ContactValidationStatus, 
  ContactChannel, 
  ContactScope, 
  ContactVerificationMethod,
  OutreachApprovalStatus,
  ProspectContactValidationProfile,
  EvidenceItem
} from "../types";

/**
 * MICRO-PHASE 12A: PROSPECT OUTREACH PREPARATION AND CONTACT DATA VALIDATION ENGINE
 * 
 * Standardizes evidence-supported prospect contact preparation before outreach.
 * Strictly prevents fabricated contact details, distinguishes format validation from true verification,
 * detects conflicting or invalid sources, and enforces permission-controlled outreach preparation.
 */

// List of known disposable, dummy, test, and placeholder email domains
const DISPOSABLE_OR_TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.org",
  "placeholder.com",
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "throwawaymail.com",
  "none.com",
  "invalid.com",
  "fake.com",
  "sample.com",
  "dummy.com",
  "noemail.com",
  "unknown.com",
  "notavailable.sz",
  "noemail.sz",
  "swazidummy.sz",
  "placeholder.sz"
]);

// Common role-based / general business email local parts
const GENERAL_BUSINESS_LOCAL_PARTS = new Set([
  "info",
  "contact",
  "sales",
  "admin",
  "administrator",
  "support",
  "hello",
  "office",
  "enquiries",
  "enquiry",
  "reception",
  "help",
  "billing",
  "accounts",
  "booking",
  "bookings",
  "service",
  "services",
  "frontdesk",
  "mail",
  "general",
  "inquiries",
  "customercare",
  "orders"
]);

/**
 * Validates an email address format according to RFC 5322 syntax standards,
 * checks for disposable/dummy domains, and classifies scope as GENERAL_BUSINESS vs NAMED_INDIVIDUAL.
 */
export function validateEmailFormat(rawEmail: string | undefined | null): {
  isValid: boolean;
  errors: string[];
  normalized: string;
  scope: ContactScope;
  domain?: string;
  isTestDomain: boolean;
} {
  const errors: string[] = [];
  if (!rawEmail || typeof rawEmail !== "string") {
    return {
      isValid: false,
      errors: ["Email is empty or not provided."],
      normalized: "",
      scope: "GENERAL_BUSINESS",
      isTestDomain: false
    };
  }

  const trimmed = rawEmail.trim().toLowerCase();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      errors: ["Email cannot be blank."],
      normalized: "",
      scope: "GENERAL_BUSINESS",
      isTestDomain: false
    };
  }

  // Basic structure check
  if (!trimmed.includes("@")) {
    errors.push("Missing '@' character in email address.");
    return { isValid: false, errors, normalized: trimmed, scope: "GENERAL_BUSINESS", isTestDomain: false };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    errors.push("Email must contain exactly one '@' character.");
    return { isValid: false, errors, normalized: trimmed, scope: "GENERAL_BUSINESS", isTestDomain: false };
  }

  const [localPart, domainPart] = parts;

  // Local part validation
  if (!localPart || localPart.length === 0) {
    errors.push("Email local part (before @) is empty.");
  } else if (localPart.length > 64) {
    errors.push("Email local part exceeds maximum length of 64 characters.");
  } else if (localPart.startsWith(".") || localPart.endsWith(".")) {
    errors.push("Email local part cannot start or end with a dot.");
  } else if (localPart.includes("..")) {
    errors.push("Email local part cannot contain consecutive dots.");
  }

  // Domain part validation
  if (!domainPart || domainPart.length === 0) {
    errors.push("Email domain part (after @) is empty.");
  } else if (domainPart.length > 255) {
    errors.push("Email domain part exceeds maximum length of 255 characters.");
  } else if (!domainPart.includes(".")) {
    errors.push("Email domain must contain a valid top-level domain (TLD).");
  } else if (domainPart.startsWith(".") || domainPart.endsWith(".") || domainPart.startsWith("-") || domainPart.endsWith("-")) {
    errors.push("Email domain cannot start or end with a dot or hyphen.");
  } else if (domainPart.includes("..")) {
    errors.push("Email domain cannot contain consecutive dots.");
  }

  // Check TLD format
  if (domainPart && domainPart.includes(".")) {
    const domainSubparts = domainPart.split(".");
    const tld = domainSubparts[domainSubparts.length - 1];
    if (tld.length < 2) {
      errors.push("Top-level domain (TLD) must be at least 2 characters long.");
    } else if (!/^[a-z]+$/i.test(tld)) {
      errors.push("Top-level domain must contain only alphabetical characters.");
    }
  }

  // RFC 5322 regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed) && errors.length === 0) {
    errors.push("Email contains invalid characters or does not conform to RFC 5322 standard.");
  }

  // Dummy / test domain check
  const isTestDomain = DISPOSABLE_OR_TEST_DOMAINS.has(domainPart);
  if (isTestDomain) {
    errors.push(`Domain '${domainPart}' is a placeholder, disposable, or test domain.`);
  }

  // Scope detection (General Business vs Named Individual)
  const isGeneralLocalPart = GENERAL_BUSINESS_LOCAL_PARTS.has(localPart);
  const scope: ContactScope = isGeneralLocalPart ? "GENERAL_BUSINESS" : "NAMED_INDIVIDUAL";

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    normalized: trimmed,
    scope,
    domain: domainPart,
    isTestDomain
  };
}

/**
 * Validates and normalizes phone numbers (E.164 and localized standards),
 * checks for dummy numbers, and identifies WhatsApp capability / mobile status.
 */
export function validatePhoneFormat(
  rawPhone: string | undefined | null,
  defaultCountry = "SZ"
): {
  isValid: boolean;
  errors: string[];
  normalized: string;
  isMobile: boolean;
  whatsappCapable: boolean;
  countryCode?: string;
  scope: ContactScope;
} {
  const errors: string[] = [];
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      errors: ["Phone number is empty or not provided."],
      normalized: "",
      isMobile: false,
      whatsappCapable: false,
      scope: "GENERAL_BUSINESS"
    };
  }

  const trimmed = rawPhone.trim();
  const lower = trimmed.toLowerCase();

  if (trimmed.length === 0 || lower === "unlisted" || lower === "none" || lower === "n/a") {
    return {
      isValid: false,
      errors: ["Phone number is unlisted or missing."],
      normalized: "",
      isMobile: false,
      whatsappCapable: false,
      scope: "GENERAL_BUSINESS"
    };
  }

  // Check for dummy or placeholder phone strings
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 0) {
    errors.push("Phone number contains no numeric digits.");
    return { isValid: false, errors, normalized: "", isMobile: false, whatsappCapable: false, scope: "GENERAL_BUSINESS" };
  }

  // Check for all repeating digits (e.g. 0000000, 1111111)
  const isAllRepeating = /^(\d)\1+$/.test(digitsOnly);
  if (isAllRepeating && digitsOnly.length >= 4) {
    errors.push("Phone number consists entirely of repeating placeholder digits.");
  }

  // Check for ascending sequence (12345678)
  if (digitsOnly === "12345678" || digitsOnly === "123456789" || digitsOnly === "0123456789") {
    errors.push("Phone number is a sequential placeholder pattern.");
  }

  // Minimum and maximum length check (ITU-T E.164: 7 to 15 digits)
  if (digitsOnly.length < 7) {
    errors.push("Phone number is too short (minimum 7 digits required).");
  } else if (digitsOnly.length > 15) {
    errors.push("Phone number is too long (maximum 15 digits according to E.164).");
  }

  // Normalize international format
  let normalized = "";
  let isMobile = false;
  let whatsappCapable = false;
  let countryCode: string | undefined = undefined;

  if (trimmed.startsWith("+")) {
    normalized = `+${digitsOnly}`;
  } else if (trimmed.startsWith("00")) {
    normalized = `+${digitsOnly.substring(2)}`;
  } else if (defaultCountry === "SZ") {
    // Eswatini local number normalization
    if (digitsOnly.startsWith("268") && digitsOnly.length >= 10) {
      normalized = `+${digitsOnly}`;
    } else if (digitsOnly.length === 8) {
      normalized = `+268${digitsOnly}`;
    } else if (digitsOnly.startsWith("0") && digitsOnly.length === 9) {
      normalized = `+268${digitsOnly.substring(1)}`;
    } else {
      normalized = `+268${digitsOnly}`;
    }
  } else if (defaultCountry === "ZA") {
    // South Africa local number normalization
    if (digitsOnly.startsWith("27") && digitsOnly.length >= 11) {
      normalized = `+${digitsOnly}`;
    } else if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
      normalized = `+27${digitsOnly.substring(1)}`;
    } else {
      normalized = `+27${digitsOnly}`;
    }
  } else {
    normalized = trimmed.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
  }

  // Detect Country & Mobile / WhatsApp Capability
  if (normalized.startsWith("+268")) {
    countryCode = "+268";
    const nationalNumber = normalized.substring(4);
    // Eswatini mobile prefixes: 76, 78, 79, 74
    if (nationalNumber.startsWith("76") || nationalNumber.startsWith("78") || nationalNumber.startsWith("79") || nationalNumber.startsWith("74")) {
      isMobile = true;
      whatsappCapable = true;
    } else if (nationalNumber.startsWith("24") || nationalNumber.startsWith("25")) {
      // Landline switchboards
      isMobile = false;
      whatsappCapable = false;
    }
  } else if (normalized.startsWith("+27")) {
    countryCode = "+27";
    const nationalNumber = normalized.substring(3);
    // South Africa mobile prefixes: 6x, 71-79, 81-84
    if (/^[678]/.test(nationalNumber)) {
      isMobile = true;
      whatsappCapable = true;
    } else {
      isMobile = false;
      whatsappCapable = false;
    }
  } else if (normalized.startsWith("+")) {
    countryCode = normalized.substring(0, 3);
    // Default heuristic for other international numbers
    isMobile = true;
    whatsappCapable = true;
  }

  const scope: ContactScope = isMobile ? "NAMED_INDIVIDUAL" : "GENERAL_BUSINESS";
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    normalized: isValid ? normalized : trimmed,
    isMobile,
    whatsappCapable,
    countryCode,
    scope
  };
}

/**
 * Determines the ContactValidationStatus strictly distinguishing format validity from verified truth.
 * CRITICAL RULE: A contact is NEVER marked as VERIFIED merely because its format is valid!
 */
export function determineContactValidationStatus(params: {
  value?: string | null;
  formatValid: boolean;
  isExplicitlyVerified?: boolean;
  verificationMethod?: ContactVerificationMethod | string;
  isHardBounceOrDead?: boolean;
}): ContactValidationStatus {
  const { value, formatValid, isExplicitlyVerified, isHardBounceOrDead } = params;

  if (!value || value.trim().length === 0 || value.toLowerCase() === "unlisted" || value.toLowerCase() === "none") {
    return "UNKNOWN";
  }

  if (!formatValid || isHardBounceOrDead) {
    return "INVALID";
  }

  // Only mark as VERIFIED if there is explicit proof of verification
  if (isExplicitlyVerified) {
    return "VERIFIED";
  }

  // Valid format without external verification proof is FORMAT_VALID
  return "FORMAT_VALID";
}

/**
 * Anti-Fabrication Safeguard:
 * Confirms that contact data is grounded in actual records and has not been fabricated or hallucinated.
 */
export function verifyContactDataGrounding(business: Business): {
  isGrounded: boolean;
  fabricatedFields: string[];
  warnings: string[];
} {
  const fabricatedFields: string[] = [];
  const warnings: string[] = [];

  // Check phone
  if (business.phone) {
    const valPhone = validatePhoneFormat(business.phone);
    if (!valPhone.isValid) {
      warnings.push(`Phone '${business.phone}' has format issues: ${valPhone.errors.join("; ")}`);
    }
  }

  // Check email
  if (business.email) {
    const valEmail = validateEmailFormat(business.email);
    if (valEmail.isTestDomain) {
      fabricatedFields.push("email");
      warnings.push(`Email '${business.email}' uses a known test/placeholder domain.`);
    } else if (!valEmail.isValid) {
      warnings.push(`Email '${business.email}' has invalid syntax: ${valEmail.errors.join("; ")}`);
    }
  }

  return {
    isGrounded: fabricatedFields.length === 0,
    fabricatedFields,
    warnings
  };
}

/**
 * Detects conflicting contact details across available evidence records and public listings.
 */
export function detectContactConflicts(
  primaryPhone: string | undefined,
  primaryEmail: string | undefined,
  evidenceList?: EvidenceItem[]
): {
  hasConflicts: boolean;
  conflicts: string[];
} {
  const conflicts: string[] = [];
  if (!evidenceList || evidenceList.length === 0) {
    return { hasConflicts: false, conflicts: [] };
  }

  const phoneNumbersFound = new Set<string>();
  const emailsFound = new Set<string>();

  if (primaryPhone && primaryPhone.trim() !== "" && primaryPhone.toLowerCase() !== "unlisted") {
    phoneNumbersFound.add(validatePhoneFormat(primaryPhone).normalized);
  }
  if (primaryEmail && primaryEmail.trim() !== "") {
    emailsFound.add(validateEmailFormat(primaryEmail).normalized);
  }

  // Inspect evidence items
  evidenceList.forEach((ev) => {
    if (ev.evidenceText) {
      // Look for phone occurrences in evidence text
      const phoneMatches = ev.evidenceText.match(/(?:\+268|\+27|\+1|\+44|0)\s*\d{2,4}(?:[\s-]?\d{2,4}){1,3}/g);
      if (phoneMatches) {
        phoneMatches.forEach((pm) => {
          const val = validatePhoneFormat(pm);
          if (val.isValid && val.normalized && val.normalized.length >= 8) {
            phoneNumbersFound.add(val.normalized);
          }
        });
      }

      // Look for email occurrences
      const emailMatches = ev.evidenceText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatches) {
        emailMatches.forEach((em) => {
          const norm = validateEmailFormat(em).normalized;
          if (norm && !DISPOSABLE_OR_TEST_DOMAINS.has(norm.split("@")[1])) {
            emailsFound.add(norm);
          }
        });
      }
    }
  });

  if (phoneNumbersFound.size > 1) {
    conflicts.push(`Found ${phoneNumbersFound.size} conflicting phone numbers across directory sources.`);
  }
  if (emailsFound.size > 1) {
    conflicts.push(`Found ${emailsFound.size} conflicting email addresses across listings.`);
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

/**
 * Builds a comprehensive ProspectContactValidationProfile for a given business entity.
 */
export function buildProspectContactProfile(business: Business): ProspectContactValidationProfile {
  const contacts: ContactRecord[] = [];
  const formatIssues: string[] = [];
  const unverifiedWarnings: string[] = [];
  const availableOutreachChannels: ("email" | "phone" | "whatsapp" | "in_person")[] = [];

  const now = new Date().toISOString();

  // 1. Process Phone Contact
  let primaryPhoneRecord: ContactRecord | undefined = undefined;
  if (business.phone && business.phone.trim() !== "" && business.phone.toLowerCase() !== "unlisted" && business.phone.toLowerCase() !== "none") {
    const valPhone = validatePhoneFormat(business.phone);
    const isExplicitlyVerified = business.verificationState === "VERIFIED" || 
      (business.evidenceList && business.evidenceList.some(e => e.supports?.includes("phone") && (e.confidence || 0) >= 0.9));

    const status = determineContactValidationStatus({
      value: business.phone,
      formatValid: valPhone.isValid,
      isExplicitlyVerified
    });

    primaryPhoneRecord = {
      id: `cnt_ph_${business.id}_${Date.now()}`,
      type: "phone",
      value: business.phone,
      normalizedValue: valPhone.normalized,
      contactScope: valPhone.scope,
      status,
      formatValid: valPhone.isValid,
      isVerified: status === "VERIFIED",
      source: business.directorySource || "PUBLIC_DIRECTORY",
      evidenceReference: business.sourceUrl,
      lastValidatedAt: now,
      validationErrors: valPhone.errors.length > 0 ? valPhone.errors : undefined,
      verificationMethod: isExplicitlyVerified ? "MANUAL_CONFIRMED" : "UNVERIFIED",
      isPrimary: true,
      whatsappCapable: valPhone.whatsappCapable
    };

    contacts.push(primaryPhoneRecord);

    if (!valPhone.isValid) {
      formatIssues.push(`Phone issue: ${valPhone.errors.join("; ")}`);
    } else {
      availableOutreachChannels.push("phone");
      if (valPhone.whatsappCapable) {
        availableOutreachChannels.push("whatsapp");
      }
      if (status !== "VERIFIED") {
        unverifiedWarnings.push("Phone format is valid but unverified with subscriber.");
      }
    }
  }

  // 2. Process Email Contact
  let primaryEmailRecord: ContactRecord | undefined = undefined;
  const rawEmail = business.email || (business.truthProfile?.email?.value as string);
  if (rawEmail && rawEmail.trim() !== "") {
    const valEmail = validateEmailFormat(rawEmail);
    const isExplicitlyVerified = (business.truthProfile?.email?.level === "VERIFIED" || business.truthProfile?.email?.status === "CONFIRMED") ||
      (business.evidenceList && business.evidenceList.some(e => e.supports?.includes("email") && (e.confidence || 0) >= 0.9));

    const status = determineContactValidationStatus({
      value: rawEmail,
      formatValid: valEmail.isValid,
      isExplicitlyVerified
    });

    primaryEmailRecord = {
      id: `cnt_em_${business.id}_${Date.now()}`,
      type: "email",
      value: rawEmail,
      normalizedValue: valEmail.normalized,
      contactScope: valEmail.scope,
      status,
      formatValid: valEmail.isValid,
      isVerified: status === "VERIFIED",
      source: business.truthProfile?.email?.sourceUrl || business.sourceUrl || "WEBSITE_SCRAPE",
      evidenceReference: business.truthProfile?.email?.notes || undefined,
      lastValidatedAt: now,
      validationErrors: valEmail.errors.length > 0 ? valEmail.errors : undefined,
      verificationMethod: isExplicitlyVerified ? "SMTP_CHECK" : "UNVERIFIED",
      isPrimary: true
    };

    contacts.push(primaryEmailRecord);

    if (!valEmail.isValid) {
      formatIssues.push(`Email issue: ${valEmail.errors.join("; ")}`);
    } else {
      availableOutreachChannels.push("email");
      if (status !== "VERIFIED") {
        unverifiedWarnings.push("Email syntax is valid but unverified with mail server.");
      }
    }
  }

  // 3. Process Physical In-Person Channel (if address exists)
  if (business.address && business.address.trim().length >= 4 && !business.address.toLowerCase().includes("sample address")) {
    availableOutreachChannels.push("in_person");
    contacts.push({
      id: `cnt_addr_${business.id}_${Date.now()}`,
      type: "in_person",
      value: business.address,
      normalizedValue: business.address.trim(),
      contactScope: "GENERAL_BUSINESS",
      status: "FORMAT_VALID",
      formatValid: true,
      isVerified: false,
      source: business.directorySource || "GOOGLE_PLACES",
      lastValidatedAt: now,
      verificationMethod: "PUBLIC_REGISTRY"
    });
  }

  // 4. Check for Conflicts
  const conflictCheck = detectContactConflicts(business.phone, rawEmail, business.evidenceList);

  // 5. Calculate Readiness Score & Flags
  const hasPhone = !!primaryPhoneRecord && primaryPhoneRecord.formatValid;
  const hasEmail = !!primaryEmailRecord && primaryEmailRecord.formatValid;
  const hasVerified = contacts.some(c => c.status === "VERIFIED");
  const hasNamed = contacts.some(c => c.contactScope === "NAMED_INDIVIDUAL");
  const hasGeneral = contacts.some(c => c.contactScope === "GENERAL_BUSINESS");

  let score = 0;
  if (hasPhone) score += 40;
  if (hasEmail) score += 30;
  if (primaryPhoneRecord?.whatsappCapable) score += 15;
  if (hasNamed) score += 10;
  if (hasVerified) score += 15;
  if (conflictCheck.hasConflicts) score -= 20;
  if (formatIssues.length > 0) score -= 25;

  const readinessScore = Math.min(100, Math.max(0, score));

  // Determine Contact Confidence
  let contactConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
  if (hasVerified && (hasPhone || hasEmail)) {
    contactConfidence = "HIGH";
  } else if (hasPhone && hasEmail && formatIssues.length === 0) {
    contactConfidence = "MEDIUM";
  } else if (hasPhone || hasEmail) {
    contactConfidence = "LOW";
  }

  // Outreach readiness check
  const isOutreachReady = (hasPhone || hasEmail) && formatIssues.length === 0 && !conflictCheck.hasConflicts;

  return {
    businessId: business.id,
    primaryEmail: primaryEmailRecord,
    primaryPhone: primaryPhoneRecord,
    primaryWhatsapp: primaryPhoneRecord?.whatsappCapable ? primaryPhoneRecord : undefined,
    allContacts: contacts,
    isOutreachReady,
    readinessScore,
    contactConfidence,
    readinessFlags: {
      hasValidChannel: hasPhone || hasEmail,
      hasVerifiedChannel: hasVerified,
      hasNamedContact: hasNamed,
      hasGeneralContact: hasGeneral,
      hasConflictingContacts: conflictCheck.hasConflicts,
      missingPhone: !hasPhone,
      missingEmail: !hasEmail,
      unverifiedWarnings,
      formatIssues,
      conflicts: conflictCheck.conflicts
    },
    availableOutreachChannels: Array.from(new Set(availableOutreachChannels)),
    outreachApprovalStatus: business.outreachApprovalStatus || "NOT_REQUESTED",
    outreachApprovalNotes: business.outreachApprovalNotes,
    outreachApprovedBy: business.outreachApprovedBy,
    outreachApprovedAt: business.outreachApprovedAt,
    validatedAt: now
  };
}

/**
 * Prepares a prospect for outreach review by building validated contact coordinates,
 * verifying authorization, and ensuring disqualified prospects or ungrounded data are not presented as ready.
 * 
 * NOTE: This function does NOT automatically send any messages or initiate live outreach.
 */
export function prepareProspectForOutreach(
  business: Business,
  user?: { uid: string; displayName?: string; role?: string; permissions?: string[] }
): {
  success: boolean;
  contactProfile: ProspectContactValidationProfile;
  warnings: string[];
  blockers: string[];
  canInitiateOutreach: boolean;
  reason?: string;
} {
  const contactProfile = buildProspectContactProfile(business);
  const warnings: string[] = [...contactProfile.readinessFlags.unverifiedWarnings];
  const blockers: string[] = [];

  // Check RBAC Permissions
  if (user && (user.role === "Viewer" || user.role === "Guest" || user.role === "Auditor")) {
    return {
      success: false,
      contactProfile,
      warnings,
      blockers: ["User role does not possess outreach preparation permissions."],
      canInitiateOutreach: false,
      reason: "Unauthorized: Viewer role cannot prepare prospects for sales outreach."
    };
  }

  // Qualification Status Check
  if (business.qualificationStatus === "DISQUALIFIED") {
    blockers.push("Prospect is marked as DISQUALIFIED from sales outreach.");
  }

  // Missing coordinates check
  if (!contactProfile.readinessFlags.hasValidChannel) {
    blockers.push("No valid phone number or email address found for outreach.");
  }

  // Format issues check
  if (contactProfile.readinessFlags.formatIssues.length > 0) {
    blockers.push(...contactProfile.readinessFlags.formatIssues);
  }

  // Conflict issues
  if (contactProfile.readinessFlags.hasConflictingContacts) {
    warnings.push(...contactProfile.readinessFlags.conflicts);
  }

  const canInitiateOutreach = blockers.length === 0 && contactProfile.isOutreachReady;

  return {
    success: blockers.length === 0,
    contactProfile,
    warnings,
    blockers,
    canInitiateOutreach,
    reason: blockers.length > 0 ? blockers.join(" ") : "Prospect contact profile is validated and outreach-ready."
  };
}

/**
 * Updates the Outreach Approval Status for a prospect entity.
 * Keeps outreach approval completely separate from Qualification and Sales Stage.
 */
export function updateOutreachApproval(
  business: Business,
  status: OutreachApprovalStatus,
  approver: { uid: string; displayName?: string; role?: string },
  notes?: string
): {
  success: boolean;
  business: Business;
  error?: string;
} {
  if (!approver || !approver.uid) {
    return { success: false, business, error: "Approver UID is required." };
  }

  if (approver.role === "Viewer" || approver.role === "Guest") {
    return { success: false, business, error: "Unauthorized: Viewers cannot approve outreach campaigns." };
  }

  const now = new Date().toISOString();
  const updatedBusiness: Business = {
    ...business,
    outreachApprovalStatus: status,
    outreachApprovalNotes: notes || business.outreachApprovalNotes,
    outreachApprovedBy: approver.displayName || approver.uid,
    outreachApprovedAt: now,
    updatedAt: now
  };

  // Re-sync contact profile with new approval status
  updatedBusiness.contactProfile = buildProspectContactProfile(updatedBusiness);

  return {
    success: true,
    business: updatedBusiness
  };
}

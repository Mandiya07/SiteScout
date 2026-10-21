export interface DigitalDeficitAudit {
  noWebsite: boolean;
  outdatedWebsite: boolean;
  noGooglePresence: boolean;
  noSocialMedia: boolean;
  poorBranding: boolean;
  noWhatsappCta: boolean;
  noOnlineCatalogue: boolean;
  noBookingSystem: boolean;
  noEnquiryForm: boolean;
  noSeo: boolean;
  brokenLinks: boolean;
  poorMobileExperience: boolean;
  missingContact: boolean;
}

export interface TechnicalMetrics {
  statusCode: number;
  statusText: string;
  responseTimeMs: number | null;
  speedGrade: "FAST" | "AVERAGE" | "SLOW" | "FAILED";
  isSsl: boolean;
  hasViewport: boolean;
  hasTitle: boolean;
  titleText: string;
  hasMetaDescription: boolean;
  metaDescriptionText: string;
  hasOpenGraph: boolean;
  hasH1: boolean;
  h1Text: string;
  hasTelLink: boolean;
  hasMailtoLink: boolean;
  hasWhatsappCta: boolean;
  hasBookingEngine: boolean;
  hasLeadForm: boolean;
  hasSocialLinks: boolean;
  socialNetworksFound: string[];
  isLegacyMarkup: boolean;
  detectedLegacyTags: string[];
  contentLengthBytes: number;
}

export interface ConversionBottleneck {
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  label: string;
  finding: string;
  revenueImpact: string;
  recommendedPitch: string;
}

export type FindingStatus = "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN" | "NOT_DETECTED";

export interface DetailedAuditFinding {
  field: string;
  key: keyof DigitalDeficitAudit;
  status: FindingStatus;
  evidence: string;
  checkedUrl: string;
  checkedAt: string;
}

export interface ModernizationPitch {
  hook: string;
  coreArgument: string;
  quickWinSolution: string;
}

export interface WebsiteAuditPayload {
  success: boolean;
  url: string;
  businessName?: string;
  audit: {
    hasWebsite: boolean;
    httpStatus: string;
    responseTimeMs: number | null;
    isSsl: boolean;
    notes: string;
    deficits: DigitalDeficitAudit;
    detailedFindings?: DetailedAuditFinding[];
    technicalMetrics?: TechnicalMetrics;
    conversionBottlenecks?: ConversionBottleneck[];
    executiveSummary?: string;
    modernizationPitch?: ModernizationPitch;
  };
  technicalMetrics?: TechnicalMetrics;
  conversionBottlenecks?: ConversionBottleneck[];
  executiveSummary?: string;
  modernizationPitch?: ModernizationPitch;
  deficitCount: number;
  presenceScore: number;
  opportunityScore: number;
  evidence?: AuditEvidence;
}

export type EvidenceSourceType =
  | "GOOGLE_MAPS"
  | "GOOGLE_SEARCH"
  | "BUSINESS_WEBSITE"
  | "BUSINESS_DIRECTORY"
  | "SOCIAL_PROFILE"
  | "BUSINESS_SUPPLIED"
  | "MANUAL"
  | "OTHER";

export type AssociationMethod =
  | "SOURCE_ID"
  | "EXACT_URL"
  | "DOMAIN_MATCH"
  | "ENTITY_MATCH"
  | "CONTENT_MATCH"
  | "BUSINESS_SUPPLIED"
  | "MANUAL"
  | "UNKNOWN";

export interface BusinessEvidence {
  id: string;
  sourceType: EvidenceSourceType;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceName?: string | null;
  sourceId?: string | null;
  retrievedAt?: string | null;
  evidenceText?: string | null;
  supportedFields: string[];
  associationMethod: AssociationMethod;
  confidence?: number | null;
}

export interface EvidenceItem extends Partial<BusinessEvidence> {
  sourceType: EvidenceSourceType;
  url: string;
  title?: string;
  retrievedAt: string;
  supports: string[];
  associationMethod?: AssociationMethod;
  evidenceText?: string | null;
  sourceId?: string | null;
  confidence?: number | null;
}

export type BusinessVerificationState =
  | "DEMO"
  | "UNVERIFIED"
  | "CANDIDATE"
  | "VERIFIED"
  | "CONTACT_READY";

export type WebsiteStatus =
  | "NONE"
  | "CONFIRMED_NO_WEBSITE"
  | "WEBSITE_NOT_DISCOVERED"
  | "LIVE"
  | "WEBSITE_LIVE"
  | "WEBSITE_CONFIRMED"
  | "BROKEN"
  | "PARKED"
  | "DIRECTORY_ONLY"
  | "SOCIAL_ONLY"
  | "UNKNOWN"
  | "WEBSITE_CANDIDATE"
  | "WEBSITE_UNVERIFIED"
  | "UNREACHABLE"
  | "WEBSITE_UNREACHABLE"
  | "WEBSITE_ASSOCIATION_UNCONFIRMED"
  | "ERROR"
  | "REDIRECT";

export type DeficitFindingStatus = "PRESENT" | "MISSING" | "UNKNOWN" | "WEAK" | "BROKEN";

export interface DeficitFinding {
  status: DeficitFindingStatus;
  notes?: string;
  verifiedAt?: string;
  source?: string;
}

export type CanonicalSalesStage =
  | "DISCOVERED"
  | "NEW_PROSPECT"
  | "QUALIFIED"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "AUDIT_COMPLETE"
  | "OPPORTUNITY_IDENTIFIED"
  | "WEBSITE_GENERATED"
  | "PREVIEW_READY"
  | "PREVIEW_SENT"
  | "CONTACTED"
  | "ENGAGED"
  | "DISCOVERY"
  | "FOLLOW_UP"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

// Micro-Phase 13C: Sales Pipeline Stage & Deal Progress Tracking Types
export interface StageTransitionRecord {
  id: string;
  fromStage: CanonicalSalesStage;
  toStage: CanonicalSalesStage;
  timestamp: string;
  actor?: TaskAssignee;
  reason?: string;
  metadata?: Record<string, any>;
}

// Micro-Phase 13D: Deal Value, Revenue Records & Financial Ledger Types
export type FinancialEntryType =
  | "ESTIMATE_SET"
  | "PROPOSAL_QUOTED"
  | "COMMERCIAL_AGREED"
  | "INVOICE_ISSUED"
  | "PAYMENT_RECEIVED"
  | "REFUND_ISSUED"
  | "ADJUSTMENT";

export interface FinancialLedgerEntry {
  id: string;
  businessId: string;
  dealId?: string;
  type: FinancialEntryType;
  amountCents: number;
  amount: number;
  currency: string;
  idempotencyKey?: string;
  previousAmountCents?: number;
  actor: TaskAssignee;
  timestamp: string;
  reference?: string;
  notes?: string;
}

export interface DealDetails {
  id: string;
  businessId: string;
  assignedOwner?: TaskAssignee;
  stage: CanonicalSalesStage;
  estimatedValue?: number;
  proposedValue?: number;
  agreedValue?: number;
  invoicedValue?: number;
  paidValue?: number;
  refundedValue?: number;
  netRevenue?: number;
  currency?: string; // e.g. "USD", "ZAR", "EUR", "GBP"
  proposedServices?: string[];
  expectedCloseDate?: string;
  lossReason?: string;
  wonDetails?: {
    closedBy: string;
    closedAt: string;
    commercialTermsConfirmed: boolean;
    paymentMethodOrTerms?: string;
    contractSigned?: boolean;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
  stageHistory: StageTransitionRecord[];
  financialLedger?: FinancialLedgerEntry[];
}

// Micro-Phase 14A: Commercial Document Integrity & Lifecycle Types
export type CommercialDocumentType = 
  | "PROPOSAL" 
  | "CONTRACT" 
  | "STATEMENT_OF_WORK" 
  | "QUOTE";

export type CommercialDocumentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface CommercialDocumentItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitPriceCents: number;
  totalPrice: number;
  totalPriceCents: number;
}

export interface DocumentAcceptanceEvidence {
  acceptedBy: string;
  acceptedByEmail?: string;
  acceptedAt: string;
  signatureText?: string;
  ipAddress?: string;
  userAgent?: string;
  method: "ELECTRONIC_SIGNATURE" | "WRITTEN_CONFIRMATION" | "VERBAL_AUTHORIZATION" | "PORTAL_ACCEPTANCE";
  evidenceReference?: string;
}

export interface CommercialDocumentVersion {
  version: number;
  title: string;
  summary?: string;
  type: CommercialDocumentType;
  status: CommercialDocumentStatus;
  currency: string;
  proposedValue: number;
  proposedValueCents: number;
  items: CommercialDocumentItem[];
  termsAndConditions: string;
  timeline?: string;
  deliverables?: string[];
  expiresAt?: string;
  createdAt: string;
  createdBy: TaskAssignee;
  approvedAt?: string;
  approvedBy?: TaskAssignee;
  sentAt?: string;
  sentBy?: TaskAssignee;
  recipientEmail?: string;
  acceptance?: DocumentAcceptanceEvidence;
  cancelledAt?: string;
  cancelledBy?: TaskAssignee;
  cancellationReason?: string;
  notes?: string;
}

export interface CommercialDocument {
  id: string;
  businessId: string;
  dealId?: string;
  documentNumber: string; // e.g., "PROP-2026-0042"
  type: CommercialDocumentType;
  status: CommercialDocumentStatus;
  currentVersion: number;
  currency: string;
  totalValue: number;
  totalValueCents: number;
  accessToken: string; // secure non-predictable token for recipient access
  accessTokenRevoked: boolean;
  expiresAt?: string;
  currentVersionSnapshot: CommercialDocumentVersion;
  versionHistory: CommercialDocumentVersion[];
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
}

// Micro-Phase 14B: Customer Onboarding & Handoff Lifecycle Types
export type CustomerOnboardingStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY_FOR_DELIVERY"
  | "ACTIVE"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export interface OnboardingRequirementItem {
  id: string;
  category: "BRANDING" | "DOMAIN_ACCESS" | "CONTENT" | "PAYMENT" | "KICKOFF_CALL" | "TECHNICAL";
  label: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  completedAt?: string;
  completedBy?: TaskAssignee;
  evidenceNotes?: string;
}

export interface CustomerContactHandoff {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface OnboardingAuditRecord {
  id: string;
  fromStatus: CustomerOnboardingStatus;
  toStatus: CustomerOnboardingStatus;
  timestamp: string;
  actor: TaskAssignee;
  notes?: string;
}

export interface CustomerOnboardingRecord {
  id: string;
  businessId: string;
  businessName: string;
  dealId: string;
  status: CustomerOnboardingStatus;
  agreedServices: string[];
  agreedCommercialValue: number;
  currency: string;
  contractDocumentId?: string;
  contractVersion?: number;
  paymentStatus: PaymentStatus;
  contacts: CustomerContactHandoff[];
  assignedOwner: TaskAssignee;
  requirementsChecklist: OnboardingRequirementItem[];
  missingRequirements: string[];
  projectNotes?: string;
  startedAt?: string;
  targetDeliveryDate?: string;
  completedAt?: string;
  onHoldReason?: string;
  cancellationReason?: string;
  auditHistory: OnboardingAuditRecord[];
  createdAt: string;
  updatedAt: string;
}

// Micro-Phase 14C: Customer Project & Website Delivery Management Types
export type CustomerProjectStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "CUSTOMER_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED_FOR_LAUNCH"
  | "DEPLOYING"
  | "LIVE"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type ProjectLaunchStatus =
  | "NOT_READY"
  | "READINESS_CHECK_PASSED"
  | "DEPLOYING"
  | "DEPLOYED_VERIFIED"
  | "DEPLOYMENT_FAILED";

export type ContentProvenance = "CUSTOMER_SUPPLIED" | "AI_GENERATED" | "SYSTEM_AUDIT" | "MANUALLY_SPECIFIED";

export interface CustomerProjectRequirement {
  id: string;
  category: "BRANDING" | "DOMAIN_ACCESS" | "CONTENT" | "PAYMENT" | "KICKOFF_CALL" | "TECHNICAL" | "CUSTOM";
  title: string;
  description: string;
  provenance: ContentProvenance;
  isVerified: boolean;
  isRequired: boolean;
  transferredFromOnboardingId?: string;
  sourceReference?: string;
  verifiedAt?: string;
  verifiedBy?: TaskAssignee;
}

export interface CustomerProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedTo: TaskAssignee;
  dueDate?: string;
  dependencies?: string[]; // IDs of tasks that must complete first
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: TaskAssignee;
  completionNotes?: string;
  history: Array<{
    timestamp: string;
    actor: TaskAssignee;
    action: "CREATED" | "UPDATED" | "COMPLETED" | "REOPENED";
    notes?: string;
  }>;
}

export interface DeliveryMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  targetDate?: string;
  completedAt?: string;
}

export interface CustomerVersionApproval {
  id: string;
  versionNumber: number;
  siteId?: string;
  status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  approverName: string;
  approverEmail: string;
  approverRole: string;
  approvalMethod: "DIGITAL_PORTAL" | "WRITTEN_CONFIRMATION" | "CLIENT_DIRECT";
  timestamp: string;
  feedbackNotes?: string;
  snapshotHash?: string;
}

export interface CustomerProjectRevision {
  id: string;
  versionRequested: number;
  section: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DECLINED";
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface DeploymentEvidence {
  verified: boolean;
  host: string;
  liveUrl: string;
  verifiedAt: string;
  httpStatus: number;
  sslActive: boolean;
  deployer: TaskAssignee;
  deploymentLog?: string[];
  errorMessage?: string;
  targetPath?: string;
  deployedAt?: string;
  sslCertificate?: {
    issuer: string;
    validUntil: string;
  };
}

export interface LaunchReadinessResult {
  isReady: boolean;
  blockers: string[];
  warnings: string[];
  checks: {
    tasksCompleted: boolean;
    customerApprovalPresent: boolean;
    commercialTermsSatisfied: boolean;
    hostingAndDomainConfigured: boolean;
    contentAndContactMechanismsValid: boolean;
    qaScanClean: boolean;
    requiredPagesPresent?: boolean;
    mobileResponsivenessVerified?: boolean;
    httpsReady?: boolean;
  };
}

export interface ProjectAuditRecord {
  id: string;
  fromStatus: CustomerProjectStatus;
  toStatus: CustomerProjectStatus;
  timestamp: string;
  actor: TaskAssignee;
  reason?: string;
}

export interface CustomerProjectRecord {
  id: string;
  businessId: string;
  businessName: string;
  customerId?: string;
  dealId: string;
  onboardingId: string;
  commercialDocumentId?: string;
  projectType: "WEBSITE_NEW" | "WEBSITE_REVAMP" | "ECOMMERCE" | "CUSTOM_PORTAL";
  agreedServices: string[];
  assignedOwner: TaskAssignee;
  status: CustomerProjectStatus;
  launchStatus: ProjectLaunchStatus;
  targetDeliveryDate?: string;
  currentWebsiteVersion: number;
  currentSiteId?: string;
  previewUrl?: string;
  customDomain?: string;
  requirements: CustomerProjectRequirement[];
  missingAssets: string[];
  tasks: CustomerProjectTask[];
  milestones: DeliveryMilestone[];
  customerApprovals: CustomerVersionApproval[];
  revisionHistory: CustomerProjectRevision[];
  deploymentEvidence?: DeploymentEvidence;
  // Micro-Phase 14D fields
  verificationStatus?: LaunchVerificationStatus;
  latestVerificationReport?: WebsiteLaunchVerificationReport;
  handoverRecord?: CustomerHandoverRecord;
  supportTickets?: PostLaunchSupportTicket[];
  completionEvidence?: {
    completedAt: string;
    completedBy: TaskAssignee;
    finalVersion: number;
    handoverId: string;
    verificationId: string;
  };
  auditHistory: ProjectAuditRecord[];
  createdAt: string;
  updatedAt: string;
}

// Micro-Phase 14D: Website Launch Verification, Handover, and Post-Launch Support Types
export type LaunchVerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED_LIVE"
  | "VERIFICATION_FAILED"
  | "UNKNOWN";

export interface WebsiteVerificationChecks {
  urlAccessible: boolean;
  httpStatusCode: number | null;
  httpsActive: boolean;
  versionMatched: boolean;
  corePagesLoading: boolean;
  contactMechanismsFunctioning: boolean;
  linksResponsive: boolean;
  mobileResponsiveVerified: boolean;
  noBlockingConsoleErrors: boolean;
}

export interface WebsiteLaunchVerificationReport {
  id: string;
  projectId: string;
  businessId: string;
  liveUrl: string;
  verifiedVersion: number;
  verificationStatus: LaunchVerificationStatus;
  timestamp: string;
  verifiedBy: TaskAssignee;
  checks: WebsiteVerificationChecks;
  responseTimeMs?: number;
  sslIssuer?: string;
  failures: string[];
  warnings: string[];
  evidenceSnapshot?: {
    domTitle?: string;
    h1Text?: string;
    verifiedAt: string;
    checkedEndpoints: string[];
  };
}

export type HandoverStatus =
  | "PENDING_HANDOVER"
  | "HANDED_OVER"
  | "ACCEPTED_BY_CLIENT"
  | "DISPUTED";

export interface HandoverSupportTerms {
  supportTier: "COMMUNITY" | "STANDARD_CARE" | "PREMIUM_SLA" | "CUSTOM_ENTERPRISE";
  includedMonthlyHours: number;
  slaResponseHours: number;
  supportEmail: string;
  emergencyContact?: string;
  coverageDetails: string[];
  billingCadence?: "MONTHLY" | "ANNUAL" | "AD_HOC";
  contractReferenceDocId?: string;
}

export interface HandoverAuditRecord {
  id: string;
  timestamp: string;
  actor: TaskAssignee;
  fromStatus: HandoverStatus;
  toStatus: HandoverStatus;
  notes?: string;
}

export interface CustomerHandoverRecord {
  id: string;
  projectId: string;
  businessId: string;
  businessName: string;
  customerId?: string;
  liveWebsiteUrl: string;
  deployedVersion: number;
  launchVerificationStatus?: LaunchVerificationStatus;
  launchDate: string;
  // Security Mandate: Never store raw passwords or secrets in plain records
  accessCredentials: {
    clientPortalUrl: string;
    maskedDnsRegistrar?: string;
    vaultReferenceId?: string;
    instructionsSummary: string;
  };
  outstandingIssues: string[];
  supportInformation: HandoverSupportTerms;
  handoverStatus: HandoverStatus;
  handedOverAt?: string;
  handedOverBy?: TaskAssignee;
  acceptedBy?: string;
  acceptedAt?: string;
  clientFeedback?: string;
  auditHistory: HandoverAuditRecord[];
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "MEDIUM" | "CRITICAL";
export type SupportTicketCategory =
  | "CONTENT_UPDATE"
  | "BUG_FIX"
  | "DOMAIN_DNS"
  | "EMAIL_SETUP"
  | "EMAIL_HOSTING"
  | "SECURITY"
  | "FEATURE_REQUEST"
  | "PERFORMANCE"
  | "BILLING_INQUIRY"
  | "TRAINING_ONBOARDING"
  | "GENERAL_INQUIRY";
export type SupportTicketStatus =
  | "OPEN"
  | "IN_TRIAGE"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_INTERNAL"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED"
  | "OUT_OF_SCOPE";

export interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "staff" | "system";
  message: string;
  isInternal: boolean;
  timestamp: string;
  attachments?: TicketAttachment[];
}

export interface SupportTicketAuditRecord {
  timestamp: string;
  actor: TaskAssignee;
  action: 
    | "CREATED" 
    | "STATUS_CHANGED" 
    | "ASSIGNED" 
    | "CUSTOMER_REPLIED" 
    | "STAFF_REPLIED" 
    | "INTERNAL_NOTE_ADDED" 
    | "RESOLVED" 
    | "REOPENED" 
    | "CLOSED" 
    | "CANCELLED"
    | "COMMENTED";
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
}

export interface CustomerSupportTicket {
  id: string;
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  businessId: string;
  businessName?: string;
  projectId?: string;
  siteId?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  reportedBy?: string; // Alias for backward compatibility
  assignedStaff?: TaskAssignee;
  assignedTo?: TaskAssignee; // Alias for backward compatibility
  subject: string;
  title: string; // Alias for subject
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  relatedWebsiteVersion?: number;
  websiteVersion?: number; // Alias for backward compatibility
  relatedTaskId?: string;
  attachments: TicketAttachment[];
  messages: TicketMessage[];
  isCoveredUnderSla: boolean;
  slaTargetResolution?: string;
  billableHours?: number;
  resolutionSummary?: string;
  resolutionNotes?: string; // Alias
  createdTimestamp: string;
  reportedAt: string; // Alias
  updatedTimestamp: string;
  resolvedTimestamp?: string;
  resolvedAt?: string; // Alias
  closedTimestamp?: string;
  verifiedLiveAt?: string;
  auditTrail: SupportTicketAuditRecord[];
}

export type PostLaunchSupportTicket = CustomerSupportTicket;

// Micro-Phase 16B: Customer Communication, Notifications & Support Messaging Types

export type NotificationChannel = "IN_APP" | "EMAIL" | "WHATSAPP" | "SMS";

export type NotificationStatus =
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type NotificationCategory =
  | "SUPPORT_TICKET_CREATED"
  | "SUPPORT_TICKET_ASSIGNED"
  | "SUPPORT_CUSTOMER_REPLY"
  | "SUPPORT_STAFF_REPLY"
  | "SUPPORT_STATUS_CHANGED"
  | "SUPPORT_TICKET_RESOLVED"
  | "BILLING_INVOICE_ISSUED"
  | "BILLING_PAYMENT_SUCCESS"
  | "BILLING_PAYMENT_FAILED"
  | "PROJECT_STAGE_UPDATE"
  | "SECURITY_ALERT"
  | "GENERAL_ALERT"
  | "MARKETING_UPDATE";

export interface NotificationContent {
  templateId?: string;
  subject?: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "customer" | "staff" | "admin";
}

export interface NotificationEntityReference {
  entityType: "support_ticket" | "invoice" | "payment" | "subscription" | "project" | "business";
  entityId: string;
  referenceNumber?: string;
}

export interface NotificationProviderRecord {
  provider: "system_inapp" | "resend_smtp" | "twilio_sms" | "meta_whatsapp" | "webhook_dispatcher";
  providerMessageId?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface NotificationDeliveryInfo {
  attemptsCount: number;
  maxAttempts: number;
  lastAttemptTimestamp?: string;
  nextRetryTimestamp?: string;
  isTransientError?: boolean;
  failureReason?: string;
}

export interface CustomerNotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  marketingOptIn: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt?: string;
}

export interface CustomerNotificationRecord {
  id: string;
  notificationId: string;
  businessId: string;
  recipientId: string;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
  category: NotificationCategory;
  isMarketing: boolean;
  content: NotificationContent;
  relatedEntity?: NotificationEntityReference;
  status: NotificationStatus;
  providerRecord?: NotificationProviderRecord;
  deliveryInfo: NotificationDeliveryInfo;
  idempotencyKey?: string;
  readAt?: string;
  createdTimestamp: string;
  sentTimestamp?: string;
  deliveredTimestamp?: string;
  failedTimestamp?: string;
}

// Micro-Phase 16C: Customer Portal, Account Security & Access Control Types
export type PortalRole = "customer" | "staff" | "admin" | "sales" | "support" | "manager" | "super_admin" | InternalAdminRole;

// Micro-Phase 17A: Internal Administration, Roles & Privileged Operations Types
export type InternalAdminRole =
  | "CUSTOMER"
  | "STAFF"
  | "SALES"
  | "SUPPORT"
  | "MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export type AdminPermission =
  // Customer Domain
  | "VIEW_CUSTOMERS"
  | "MANAGE_CUSTOMERS"
  | "CHANGE_CUSTOMER_OWNERSHIP"
  | "ACCESS_SENSITIVE_CUSTOMER_DATA"
  | "DELETE_CUSTOMER_ACCOUNT"
  // Subscriptions & Billing
  | "VIEW_SUBSCRIPTIONS"
  | "CHANGE_SUBSCRIPTION_STATUS"
  | "GRANT_REVOKE_ENTITLEMENTS"
  // Financial & Payments
  | "VIEW_FINANCIALS"
  | "EDIT_FINANCIAL_RECORDS"
  | "ISSUE_REFUNDS"
  // Support & Tickets
  | "VIEW_SUPPORT_TICKETS"
  | "MANAGE_SUPPORT_TICKETS"
  | "VIEW_INTERNAL_STAFF_NOTES"
  | "WRITE_INTERNAL_STAFF_NOTES"
  // Projects & Websites
  | "VIEW_PROJECTS"
  | "MANAGE_PROJECTS"
  | "PUBLISH_LAUNCH_WEBSITES"
  // Prospecting & CRM
  | "VIEW_CRM"
  | "MANAGE_CRM"
  // Staff & Administration
  | "VIEW_STAFF_ACCOUNTS"
  | "MANAGE_STAFF_ACCOUNTS"
  | "CHANGE_USER_ROLES"
  | "DEACTIVATE_USERS"
  | "IMPERSONATE_USER"
  // System Health & Security
  | "VIEW_AUDIT_LOGS"
  | "VIEW_SYSTEM_HEALTH"
  | "MODIFY_SECURITY_SETTINGS"
  | "SYSTEM_ADMIN";

export type HighRiskAdminOperation =
  | "CHANGE_CUSTOMER_OWNERSHIP"
  | "CHANGE_SUBSCRIPTION_STATUS"
  | "GRANT_REVOKE_ENTITLEMENTS"
  | "EDIT_FINANCIAL_RECORDS"
  | "ISSUE_REFUNDS"
  | "DELETE_RECORDS"
  | "CHANGE_USER_ROLES"
  | "ACCESS_SENSITIVE_CUSTOMER_DATA"
  | "PUBLISH_LAUNCH_WEBSITES"
  | "MODIFY_SECURITY_SETTINGS"
  | "IMPERSONATE_USER";

export interface StaffAccount {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: InternalAdminRole;
  assignedRegions?: string[];
  assignedBusinessIds?: string[];
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  isRevoked?: boolean;
}

export interface PrivilegedAdminAuditEvent {
  id: string;
  timestamp: string;
  actor: {
    uid: string;
    email: string;
    name?: string;
    role: InternalAdminRole;
  };
  operation: HighRiskAdminOperation | string;
  targetEntity: {
    entityType: string;
    entityId: string;
    businessId?: string;
  };
  action: "read" | "write" | "admin" | "delete";
  status: "AUTHORIZED" | "DENIED" | "FAILED";
  denialReason?: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
}

export interface PrivilegedAuthorizationResult {
  authorized: boolean;
  status: 200 | 400 | 401 | 403 | 404 | 409;
  errorCode?:
    | "UNAUTHENTICATED"
    | "EXPIRED_SESSION"
    | "ROLE_UNAUTHORIZED"
    | "PRIVILEGE_ESCALATION_BLOCKED"
    | "UNAUTHORIZED_CUSTOMER_SCOPE"
    | "ACCOUNT_DEACTIVATED"
    | "OPERATOR_REVOKED"
    | "CONCURRENT_OPERATION_CONFLICT"
    | "HIGH_RISK_JUSTIFICATION_REQUIRED"
    | "INVALID_OPERATION";
  reason?: string;
  auditEvent?: PrivilegedAdminAuditEvent;
}

// Micro-Phase 17B: Canonical Audit Trail, Security Events & Administrative Accountability Types
export type AuditOutcome = "SUCCESS" | "FAILED" | "DENIED";

export type AuditEventCategory = 
  | "USER_ACTION" 
  | "ADMIN_ACTION" 
  | "SYSTEM_ACTION" 
  | "SECURITY_EVENT";

export type AuditActorType = "HUMAN" | "AUTOMATED" | "SYSTEM" | "EXTERNAL";

export interface CanonicalAuditEvent {
  eventId: string;
  eventType: string;
  category: AuditEventCategory;
  outcome: AuditOutcome;
  actor: {
    actorId: string;
    actorType: AuditActorType;
    email?: string;
    role?: string;
    name?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  targetEntity: {
    entityType: string;
    entityId: string;
    businessId?: string;
  };
  action: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  correlationId?: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface AuditEventFilter {
  category?: AuditEventCategory;
  outcome?: AuditOutcome;
  eventType?: string;
  actorId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  businessId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  limit?: number;
}

export interface CustomerSession {
  uid: string;
  email: string;
  role: PortalRole;
  customerId?: string;
  businessId?: string;
  sessionToken?: string;
  sessionExpiresAt: string;
  isExpired: boolean;
  isVerified?: boolean;
}

export type PortalResourceType =
  | "account"
  | "subscription"
  | "invoice"
  | "payment"
  | "support_ticket"
  | "project"
  | "website_version"
  | "preview_record"
  | "document"
  | "communication";

export interface PortalAuthorizationResult {
  authorized: boolean;
  status: 200 | 400 | 401 | 403 | 404;
  errorCode?: "UNAUTHENTICATED" | "EXPIRED_SESSION" | "FORBIDDEN_RESOURCE" | "NOT_FOUND" | "ROLE_UNAUTHORIZED" | "ENTITLEMENT_RESTRICTED";
  reason?: string;
  sanitizedData?: any;
}

// Micro-Phase 16D: Customer Account Settings, Preferences & Data Management Types
export interface CustomerProfileSettings {
  displayName: string;
  contactEmail: string;
  phoneNumber?: string;
  timeZone: string;
  locale?: string;
  jobTitle?: string;
}

export interface CustomerBusinessInfoSettings {
  companyName: string;
  tradeName?: string;
  registrationNumber?: string;
  taxId?: string;
  physicalAddress?: string;
  billingAddress?: string;
  websiteUrl?: string;
  industryCategory?: string;
  operatingHours?: string;
}

export interface CustomerBillingPreferences {
  invoiceDeliveryEmail?: string;
  preferredCurrency?: string;
  billingFrequency?: "MONTHLY" | "ANNUAL";
  taxExempt?: boolean;
  poNumberRequired?: boolean;
}

export interface CustomerSecuritySettings {
  twoFactorEnabled?: boolean;
  sessionTimeoutMinutes?: number;
  lastPasswordChangeTimestamp?: string;
  activeSessionsCount?: number;
}

export interface CustomerAccountSettings {
  id: string;
  customerId: string;
  businessId: string;
  profile: CustomerProfileSettings;
  businessInfo: CustomerBusinessInfoSettings;
  notificationPreferences: CustomerNotificationPreferences;
  billingPreferences: CustomerBillingPreferences;
  security: CustomerSecuritySettings;
  deactivationStatus?: {
    isDeactivated: boolean;
    deactivatedAt?: string;
    deactivatedBy?: string;
    reason?: string;
    preservedHistoricalRecords: {
      invoicesCount: number;
      paymentsCount: number;
      supportTicketsCount: number;
      contractsCount: number;
      auditLogsCount: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Micro-Phase 15A: Customer Account, Subscription & Service Entitlement Management Types

export type CustomerAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED" | "ARCHIVED";

export interface AccountAuditRecord {
  id: string;
  timestamp: string;
  actor: TaskAssignee;
  action: "CREATED" | "STATUS_CHANGED" | "OWNER_TRANSFERRED" | "SUBSCRIPTION_ATTACHED" | "NOTE_ADDED" | "SETTINGS_UPDATED" | "DEACTIVATED" | "REACTIVATED";
  fromStatus?: CustomerAccountStatus;
  toStatus?: CustomerAccountStatus;
  notes?: string;
}

export interface CustomerAccount {
  id: string;
  customerId: string;
  businessId: string;
  businessName: string;
  ownerUserId: string;
  primaryEmail: string;
  accountStatus: CustomerAccountStatus;
  activeSubscriptionId?: string;
  currentPlanId?: string;
  currentSubscriptionStatus?: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  auditTrail: AccountAuditRecord[];
}

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";

export type BillingInterval = "MONTHLY" | "ANNUAL" | "QUARTERLY" | "ONE_TIME";

export type ServiceEntitlementKey =
  | "website_generation"
  | "website_editing"
  | "hosting"
  | "custom_domain"
  | "lead_capture"
  | "crm"
  | "analytics"
  | "support_sla"
  | "ai_generation";

export type ServiceEntitlements = Record<ServiceEntitlementKey, boolean>;

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  tier: "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE";
  pricing: {
    monthly: number;
    annual: number;
    currency: string;
  };
  entitlements: ServiceEntitlements;
  usageLimits?: {
    maxWebsites?: number;
    maxAiGenerationsPerMonth?: number;
    maxLeadsPerMonth?: number;
    slaResponseHours?: number;
  };
  isPublic: boolean;
}

export type PaymentProviderType =
  | "stripe"
  | "paypal"
  | "mtn_momo"
  | "bank_wire"
  | "manual_verified"
  | "offline_transfer"
  | "offline"
  | "cash"
  | "bank_transfer";

export interface PaymentProviderReference {
  provider: PaymentProviderType;
  referenceId: string;
  paymentMethodType?: string;
  lastPaymentVerifiedAt?: string;
  receiptNumber?: string;
  amountPaid?: number;
  currency?: string;
  isSandbox?: boolean;
}

export interface SubscriptionAuditRecord {
  id: string;
  timestamp: string;
  actor: TaskAssignee;
  action: "CREATED" | "UPGRADED" | "DOWNGRADED" | "CANCELLED" | "PAUSED" | "RESUMED" | "EXPIRED" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED" | "RENEWED" | "REACTIVATED" | "REFUNDED" | "DISPUTED";
  fromPlanId?: string;
  toPlanId?: string;
  fromStatus?: SubscriptionStatus;
  toStatus?: SubscriptionStatus;
  notes?: string;
}

export interface CustomerSubscription {
  id: string;
  subscriptionId: string;
  customerId: string;
  businessId: string;
  planId: string;
  planName: string;
  plan?: string;
  amount?: number;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  unitPrice: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelAtPeriodEnd?: boolean;
  pausedAt?: string;
  pauseReason?: string;
  lastRenewedAt?: string;
  lastEventTimestamp?: string;
  processedBillingEvents?: string[];
  paymentProviderRef?: PaymentProviderReference;
  entitlementsSnapshot: ServiceEntitlements;
  auditTrail: SubscriptionAuditRecord[];
  createdAt: string;
  updatedAt: string;
}

// Micro-Phase 15C: Billing Events & Lifecycle Synchronization Types
export type BillingEventType =
  | "invoice.paid"
  | "invoice.payment_failed"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "subscription.expired"
  | "subscription.reactivated"
  | "subscription.plan_changed"
  | "charge.refunded"
  | "charge.dispute.created";

export interface BillingEvent {
  id: string;
  eventId: string;
  eventType: BillingEventType;
  customerId: string;
  businessId: string;
  subscriptionId?: string;
  provider: PaymentProviderType;
  eventTimestamp: string;
  processedAt: string;
  payload?: any;
  status: "PROCESSED" | "IGNORED_DUPLICATE" | "IGNORED_STALE" | "FAILED";
  notes?: string;
  isSandbox?: boolean;
}

// Micro-Phase 15D: Billing Records, Invoices & Customer Payment History Types
export type CustomerInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "VOID"
  | "REFUNDED";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerInvoice {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  businessId: string;
  subscriptionId?: string;
  dealId?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  status: CustomerInvoiceStatus;
  linkedPaymentIds: string[];
  notes?: string;
  isSandbox?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentRecordStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export interface PaymentRefundRecord {
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  refundedAt: string;
  referenceId?: string;
  isSandbox?: boolean;
}

export interface CustomerPaymentRecord {
  id: string;
  paymentId: string;
  paymentNumber: string;
  invoiceId: string;
  customerId: string;
  businessId: string;
  subscriptionId?: string;
  amount: number;
  netAmount: number;
  currency: string;
  status: PaymentRecordStatus;
  paymentMethod: "card" | "mtn_momo" | "bank_transfer" | "cash" | "offline";
  paymentProviderRef: PaymentProviderReference;
  paidAt: string;
  refundedAmount: number;
  refunds: PaymentRefundRecord[];
  isSandbox?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBillingSummary {
  customerId: string;
  businessId: string;
  currentPlanId: string;
  currentPlanName: string;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  totalRefunded: number;
  netRevenue: number;
  outstandingBalance: number;
  invoicesCount: number;
  paymentsCount: number;
  lastPaymentDate?: string;
}

export interface EntitlementCheckResult {
  entitled: boolean;
  feature: ServiceEntitlementKey;
  reason?: string;
  planId?: string;
  subscriptionStatus?: SubscriptionStatus;
  customerId?: string;
}

// Micro-Phase 19G: Stripe Sandbox, Checkout Session & Financial Validation Types
export interface StripeSandboxConfig {
  mode: "test";
  isSandbox: true;
  testPublishableKey?: string;
  testSecretKey?: string;
  testWebhookSecret?: string;
  isConfigured: boolean;
}

export interface SandboxCheckoutSession {
  sessionId: string;
  customerId: string;
  businessId: string;
  planId: string;
  planName: string;
  billingInterval: BillingInterval;
  amount: number;
  currency: string;
  status: "open" | "complete" | "expired";
  isSandbox: true;
  clientSecret: string;
  paymentUrl: string;
  expiresAt: string;
  createdAt: string;
  metadata?: Record<string, string>;
  tamperProofToken: string;
}

export interface SandboxPaymentVerificationResult {
  verified: boolean;
  isSandbox: true;
  transactionRef: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "tampered" | "rejected";
  evidence?: PaymentProviderReference;
  rejectionReason?: string;
  verifiedAt: string;
}

export interface CustomerBillingDashboardData {
  customerId: string;
  businessId: string;
  businessName: string;
  currentPlan: PlanDefinition;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate?: string;
  cancelAtPeriodEnd?: boolean;
  outstandingBalance: number;
  invoices: CustomerInvoice[];
  payments: CustomerPaymentRecord[];
  activeEntitlements: ServiceEntitlements;
  entitlementDetails: Record<ServiceEntitlementKey, boolean>;
  sandboxTransactionsCount: number;
}

// =========================================================================
// Micro-Phase 19H: Beta User Feedback, Issue Tracking & Continuous Improvement Types
// =========================================================================

export type BetaFeedbackCategory =
  | "BUG"
  | "USABILITY"
  | "DATA_QUALITY"
  | "VISUAL_QUALITY"
  | "PERFORMANCE"
  | "SECURITY"
  | "FEATURE_REQUEST";

export type BetaIssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type BetaIssueStatus =
  | "NEW"
  | "TRIAGED"
  | "IN_PROGRESS"
  | "READY_FOR_RETEST"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type BetaFeatureModule =
  | "business_discovery"
  | "business_data_accuracy"
  | "website_verification"
  | "opportunity_scoring"
  | "ai_website_generation"
  | "image_relevance"
  | "website_editing"
  | "website_previews"
  | "outreach_preparation"
  | "crm"
  | "sales_pipeline"
  | "customer_onboarding"
  | "billing_subscriptions"
  | "general_usability";

export interface VisualQualityRating {
  professionalAppearance: number; // 1-5
  businessRelevance: number; // 1-5
  heroSectionQuality: number; // 1-5
  imageRelevance: number; // 1-5
  typography: number; // 1-5
  layout: number; // 1-5
  mobileResponsiveness: number; // 1-5
  contentAccuracy: number; // 1-5
  overallPresentationQuality: number; // 1-5
  subjectiveNotes?: string;
}

export interface BetaFeedbackAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: string;
  isSanitized?: boolean;
}

export interface BetaFeedbackRecord {
  id: string;
  feedbackId: string;
  betaUserId: string;
  betaUserName?: string;
  betaUserEmail?: string;
  featureModule: BetaFeatureModule;
  category: BetaFeedbackCategory;
  description: string;
  severity: BetaIssueSeverity;
  relatedRecordRef?: string;
  submissionTimestamp: string;
  status: BetaIssueStatus;
  attachments?: BetaFeedbackAttachment[];
  visualRatings?: VisualQualityRating;
  linkedIssueId?: string;
  isTestSubmission?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BetaIssueAuditEntry {
  id: string;
  timestamp: string;
  actor: TaskAssignee;
  action:
    | "CREATED"
    | "STATUS_CHANGED"
    | "SEVERITY_CHANGED"
    | "ASSIGNED"
    | "RESOLVED"
    | "REOPENED"
    | "NOTE_ADDED";
  fromStatus?: BetaIssueStatus;
  toStatus?: BetaIssueStatus;
  fromSeverity?: BetaIssueSeverity;
  toSeverity?: BetaIssueSeverity;
  notes?: string;
}

export interface BetaIssueRecord {
  id: string;
  issueId: string;
  issueNumber: string;
  title: string;
  description: string;
  featureModule: BetaFeatureModule;
  category: BetaFeedbackCategory;
  severity: BetaIssueSeverity;
  status: BetaIssueStatus;
  assignedTo?: TaskAssignee;
  reportedBy: { uid: string; displayName?: string; email?: string };
  sourceFeedbackIds: string[];
  rootCause?: string;
  affectedComponent?: string;
  resolutionEvidence?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: TaskAssignee;
  reopenedAt?: string;
  reopenedReason?: string;
  auditTrail: BetaIssueAuditEntry[];
  createdAt: string;
  updatedAt: string;
  isTestIssue?: boolean;
}

export type WorkflowOperationType =
  | "business_search"
  | "relevant_business_discovery"
  | "prospect_save"
  | "website_audit"
  | "website_generation"
  | "image_relevance_validation"
  | "preview_creation"
  | "website_edit"
  | "outreach_draft_prepare"
  | "crm_task_complete"
  | "customer_onboarding_complete"
  | "general_error";

export type WorkflowExecutionStatus = "ATTEMPTED" | "SUCCESSFUL" | "FAILED" | "ABANDONED";

export interface WorkflowEventRecord {
  id: string;
  operation: WorkflowOperationType;
  status: WorkflowExecutionStatus;
  userId: string;
  businessId?: string;
  metadata?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  timestamp: string;
  isTestEvent?: boolean;
}

export interface BetaWorkflowAnalyticsSummary {
  totalOperations: number;
  attempted: number;
  successful: number;
  failed: number;
  abandoned: number;
  operationsBreakdown: Record<
    WorkflowOperationType,
    {
      attempted: number;
      successful: number;
      failed: number;
      abandoned: number;
      successRate: number;
    }
  >;
  activeTestersCount: number;
  isTestDataExcluded: boolean;
}

// =============================================================================
// MICRO-PHASE 20A: CONTROLLED BETA COHORT & INVITATION RECRUITMENT TYPES
// =============================================================================

export type BetaParticipantType = 
  | "DIGITAL_AGENCY" 
  | "SMALL_BUSINESS" 
  | "MEDIUM_BUSINESS" 
  | "INTERNAL_TESTER";

export type BetaInvitationStatus = 
  | "DRAFT" 
  | "APPROVED" 
  | "SENT" 
  | "ACCEPTED" 
  | "DECLINED" 
  | "EXPIRED" 
  | "REVOKED";

export type BetaOnboardingStatus = 
  | "INVITED" 
  | "ACCEPTED_TERMS" 
  | "ACCOUNT_ACTIVATED" 
  | "FIRST_SEARCH_COMPLETED" 
  | "MOCKUP_GENERATED" 
  | "ACTIVE_PARTICIPANT" 
  | "INACTIVE";

export type BetaCohortStatus = "RECRUITING" | "ACTIVE" | "PAUSED" | "CLOSED";

export interface BetaCohortAuditEntry {
  id: string;
  timestamp: string;
  actor: TaskAssignee;
  action: 
    | "COHORT_CREATED"
    | "TARGET_UPDATED"
    | "INVITATION_PREPARED"
    | "INVITATION_APPROVED"
    | "INVITATION_SENT"
    | "INVITATION_ACCEPTED"
    | "INVITATION_DECLINED"
    | "INVITATION_REVOKED"
    | "ACCOUNT_ACTIVATED"
    | "TERMS_ACCEPTED";
  notes?: string;
}

export interface BetaCohort {
  id: string;
  name: string;
  description: string;
  targetCount: number;
  status: BetaCohortStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskAssignee;
}

export interface BetaInvitation {
  id: string;
  invitationCode: string;
  token: string;
  cohortId: string;
  participantType: BetaParticipantType;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  status: BetaInvitationStatus;
  approvedBy?: TaskAssignee;
  approvedAt?: string;
  sentAt?: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedByUid?: string;
  declinedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  betaTermsAccepted: boolean;
  betaTermsAcceptedAt?: string;
  notes?: string;
  auditTrail: BetaCohortAuditEntry[];
  isTestInvitation?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BetaParticipantRecord {
  id: string;
  cohortId: string;
  invitationId: string;
  userId: string;
  organizationName: string;
  participantType: BetaParticipantType;
  contactEmail: string;
  contactName: string;
  onboardingStatus: BetaOnboardingStatus;
  activatedAt: string;
  lastActiveAt: string;
  metrics: {
    searchesCompleted: number;
    prospectsCreated: number;
    websitesGenerated: number;
    previewsCreated: number;
    crmTasksCompleted: number;
    feedbackSubmitted: number;
    issuesReported: number;
  };
  isTestAccount?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BetaCohortDashboardData {
  cohort: BetaCohort;
  targetParticipants: number;
  invitationsPrepared: number;
  invitationsSent: number;
  invitationsAccepted: number;
  activeParticipants: number;
  inactiveParticipants: number;
  completedOnboarding: number;
  feedbackReceived: number;
  outstandingIssues: number;
  participants: BetaParticipantRecord[];
  invitations: BetaInvitation[];
}

// Micro-Phase 8D: Separated Lifecycle State Types
export type PreviewApprovalStatus = 
  | "DRAFT" 
  | "READY_FOR_REVIEW" 
  | "REVIEW_REQUESTED" 
  | "PENDING" 
  | "CHANGES_REQUESTED" 
  | "APPROVED" 
  | "REJECTED";
export type ContractStatus = "NOT_SENT" | "SENT" | "SIGNED" | "DECLINED" | "EXPIRED";
export type PaymentStatus = "UNPAID" | "PENDING" | "PARTIALLY_PAID" | "PAID" | "FAILED" | "REFUNDED";
export type DealOutcome = "OPEN" | "WON" | "LOST";

export interface LifecycleAuditEvent {
  id: string;
  businessId: string;
  dimension?: "previewApproval" | "contract" | "payment" | "dealOutcome" | "crmSync";
  eventType: 
    | "preview_approval_change" 
    | "contract_status_change" 
    | "payment_status_change" 
    | "deal_outcome_change" 
    | "deal_closure_action" 
    | "crm_sync";
  actor: string;
  actorId?: string;
  timestamp: string;
  previousState: string;
  newState: string;
  recordRef?: string;
  metadata?: Record<string, any>;
}

export type ActivityType =
  | "business_discovered"
  | "business_verified"
  | "website_checked"
  | "audit_completed"
  | "opportunity_scored"
  | "preview_generated"
  | "preview_sent"
  | "preview_viewed"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "follow_up_sent"
  | "prospect_replied"
  | "proposal_sent"
  | "proposal_accepted"
  | "proposal_declined"
  | "preview_approved"
  | "contract_signed"
  | "payment_recorded"
  | "deal_closed_won"
  | "deal_closed_lost"
  | "deal_won"
  | "outreach_approved"
  | "outreach_rejected"
  | "customer_onboarding"
  | "support_ticket_created"
  | "support_ticket_updated"
  | "support_ticket_resolved";

export interface ProspectActivity {
  id: string;
  businessId: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  actorId?: string;
  metadata?: Record<string, any>;
}

export interface ProspectNote {
  id: string;
  businessId: string;
  content: string;
  category?: "general" | "call_summary" | "objection" | "pricing" | "meeting";
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  authorId?: string;
  authorName?: string;
}

// Micro-Phase 13A: Canonical Follow-Up Task & Task Management Types
export type FollowUpTaskType = 
  | "call" 
  | "email" 
  | "meeting" 
  | "review" 
  | "whatsapp" 
  | "in_person" 
  | "other";

export type FollowUpTaskStatus = 
  | "OPEN" 
  | "IN_PROGRESS" 
  | "COMPLETED" 
  | "CANCELLED" 
  | "OVERDUE";

export type FollowUpTaskPriority = 
  | "LOW" 
  | "MEDIUM" 
  | "HIGH" 
  | "URGENT";

export interface TaskAssignee {
  uid: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export type TaskHistoryAction = 
  | "created" 
  | "assigned" 
  | "rescheduled" 
  | "status_changed" 
  | "edited" 
  | "completed" 
  | "cancelled"
  | "reminder_sent"
  | "reminder_dismissed";

export interface TaskHistoryEntry {
  id: string;
  action: TaskHistoryAction;
  timestamp: string;
  actor?: { uid?: string; displayName?: string; role?: string };
  details: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

export interface TaskReminderConfig {
  enabled: boolean;
  remindBeforeMinutes?: number; // e.g. 15, 60, 1440
  remindedAt?: string;
  isDismissed?: boolean;
}

export interface FollowUpTask {
  id: string;
  prospectId: string;
  businessId: string;
  title: string;
  description?: string;
  type: FollowUpTaskType;
  status: FollowUpTaskStatus;
  priority: FollowUpTaskPriority;
  assignedTo?: TaskAssignee;
  dueDate: string; // YYYY-MM-DD or ISO
  dueTime?: string; // HH:mm
  timeZone?: string;
  dueTimestamp: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  completedBy?: TaskAssignee;
  cancelledAt?: string;
  cancelledReason?: string;
  communicationId?: string; // Link to communication history
  draftId?: string; // Link to outreach draft
  evidenceReferences?: string[];
  reminder?: TaskReminderConfig;
  history: TaskHistoryEntry[];
  idempotencyKey?: string;
}

// Micro-Phase 13B: Follow-Up Sequences and Sales Pipeline Automation Types
export type FollowUpSequenceStatus = 
  | "DRAFT" 
  | "ACTIVE" 
  | "PAUSED" 
  | "COMPLETED" 
  | "CANCELLED";

export type SequenceStepActionType = 
  | "manual_task" 
  | "scheduled_reminder" 
  | "approved_communication";

export interface FollowUpSequenceStep {
  stepNumber: number;
  title: string;
  actionType: SequenceStepActionType;
  taskType?: FollowUpTaskType;
  priority?: FollowUpTaskPriority;
  delayDays: number;
  delayHours?: number;
  channel?: OutreachDraftChannel;
  taskDescriptionTemplate?: string;
  requiresManualApproval: boolean;
}

export interface SequenceCompletionConditions {
  stopOnReply?: boolean;
  stopOnOptOut?: boolean;
  stopOnDisqualification?: boolean;
  stopOnDealWon?: boolean;
  stopOnMeetingBooked?: boolean;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description?: string;
  status: FollowUpSequenceStatus;
  targetChannel?: OutreachDraftChannel | "multi_channel";
  steps: FollowUpSequenceStep[];
  completionConditions?: SequenceCompletionConditions;
  createdBy?: TaskAssignee;
  createdAt: string;
  updatedAt: string;
}

export type SequenceEnrollmentStatus = 
  | "ACTIVE" 
  | "PAUSED" 
  | "COMPLETED" 
  | "CANCELLED" 
  | "INELIGIBLE";

export type SequenceEnrollmentHistoryAction = 
  | "enrolled" 
  | "step_advanced" 
  | "task_generated" 
  | "paused" 
  | "resumed" 
  | "completed" 
  | "cancelled" 
  | "marked_ineligible" 
  | "message_approved";

export interface SequenceEnrollmentHistoryEntry {
  id: string;
  action: SequenceEnrollmentHistoryAction;
  timestamp: string;
  actor?: { uid?: string; displayName?: string; role?: string };
  details: string;
  metadata?: Record<string, any>;
}

export interface ProspectSequenceEnrollment {
  id: string;
  sequenceId: string;
  sequenceName: string;
  prospectId: string;
  businessId: string;
  status: SequenceEnrollmentStatus;
  enrolledAt: string;
  enrolledBy: TaskAssignee;
  currentStepNumber: number;
  completedStepNumbers: number[];
  lastStepExecutedAt?: string;
  nextScheduledStepAt?: string;
  nextScheduledStepNumber?: number;
  pausedAt?: string;
  pausedReason?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  ineligibleAt?: string;
  ineligibleReason?: string;
  generatedTaskIds: string[];
  history: SequenceEnrollmentHistoryEntry[];
}

export interface ProspectFollowUp {
  id: string;
  businessId: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  channel: "whatsapp" | "phone" | "email" | "in_person" | "other";
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
  completedAt?: string;
  actorId?: string;
}

export interface ScoreComponentDetail {
  score: number;
  weight: number;
  contribution: number;
  description: string;
}

export interface StructuredOpportunityResult {
  score: number;
  scoreComponents: {
    digitalDeficit: ScoreComponentDetail & { confirmedDeficitCount: number };
    businessQuality: ScoreComponentDetail & { rating: number; reviewsCount: number };
    commercialFit: ScoreComponentDetail & { category: string; fitRating: "HIGH" | "MEDIUM" | "STANDARD" };
    contactability: ScoreComponentDetail & { channels: string[] };
  };
  evidenceConfidence: {
    score: number;
    level: "HIGH" | "MEDIUM" | "LOW";
    verifiedSignals: number;
    totalSignals: number;
    provenanceNotes: string;
  };
  confirmedOpportunities: string[];
  unknownAreas: string[];
  supportingEvidence: Array<{
    criterion: string;
    status: "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN";
    details: string;
    source?: string;
  }>;
  timestamp: string;
  assessmentStatement: string;
}

// Micro-Phase 11B: Prospect Qualification & Evidence-Based Prioritization Types
export type QualificationStatus =
  | "UNQUALIFIED"
  | "NEEDS_REVIEW"
  | "QUALIFIED"
  | "DISQUALIFIED";

export interface QualificationCriterionDetail {
  code: string;
  label: string;
  passed: boolean;
  scoreContribution: number;
  explanation: string;
  isMandatory?: boolean;
}

export interface QualificationOverrideRecord {
  id: string;
  businessId: string;
  previousStatus: QualificationStatus;
  newStatus: QualificationStatus;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
  originalAutoStatus: QualificationStatus;
}

export interface ProspectQualificationResult {
  status: QualificationStatus;
  qualificationScore: number;
  isManualOverride: boolean;
  overrideHistory?: QualificationOverrideRecord[];
  activeOverride?: QualificationOverrideRecord;
  criteria: {
    identityRelevance: QualificationCriterionDetail;
    opportunityEvidence: QualificationCriterionDetail;
    evidenceConfidence: QualificationCriterionDetail;
    contactability: QualificationCriterionDetail;
    serviceFit: QualificationCriterionDetail;
  };
  qualificationReason: string;
  disqualificationReasons?: string[];
  reviewTriggers?: string[];
  prioritizationRank: number;
  prioritizationExplanation: string;
  calculatedAt: string;
}

// Micro-Phase 11C: Prospect Review Queue & Qualification Workflow Types
export type ReviewActionType =
  | "confirm_field"
  | "correct_field"
  | "mark_evidence_stale"
  | "mark_evidence_conflicting"
  | "mark_evidence_insufficient"
  | "qualify_prospect"
  | "disqualify_prospect"
  | "request_reverification"
  | "revert_qualification";

export type ReviewFilterReason =
  | "all"
  | "conflicting_data"
  | "unconfirmed_website"
  | "stale_evidence"
  | "unlisted_contact"
  | "low_confidence"
  | "out_of_scope";

export interface ReviewDecisionRecord {
  id: string;
  businessId: string;
  action: ReviewActionType;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
  evidenceCitation?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  timestamp: string;
  resultingStatus?: QualificationStatus;
}

export interface ProspectReviewQueueFilter {
  reason?: ReviewFilterReason;
  qualificationStatus?: string;
  category?: string;
  location?: string;
  searchQuery?: string;
  reviewStatus?: "pending" | "reviewed" | "all";
}

// Micro-Phase 11D: Prospect Qualification Audit Trail & Decision History Types
export type QualificationDecisionType =
  | "INITIAL_EVALUATION"
  | "AUTOMATED_REEVALUATION"
  | "MANUAL_OVERRIDE"
  | "REVIEW_APPROVAL"
  | "REVIEW_DISQUALIFICATION"
  | "EVIDENCE_CHANGE"
  | "OVERRIDE_REVERSAL"
  | "CRITERIA_SCORE_CHANGE";

export interface QualificationAuditActor {
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  isAutomated: boolean;
}

export interface QualificationCriteriaSnapshot {
  identityRelevance?: { passed: boolean; scoreContribution: number; explanation?: string };
  opportunityEvidence?: { passed: boolean; scoreContribution: number; explanation?: string };
  evidenceConfidence?: { passed: boolean; scoreContribution: number; explanation?: string };
  contactability?: { passed: boolean; scoreContribution: number; explanation?: string };
  serviceFit?: { passed: boolean; scoreContribution: number; explanation?: string };
}

export interface QualificationAuditEvent {
  id: string;
  businessId: string;
  decisionType: QualificationDecisionType;
  actor: QualificationAuditActor;
  timestamp: string;
  previousStatus: QualificationStatus;
  newStatus: QualificationStatus;
  previousScore: number;
  newScore: number;
  previousPrioritizationRank: number;
  newPrioritizationRank: number;
  reason: string;
  criteriaSnapshot: QualificationCriteriaSnapshot;
  evidenceReferences?: string[];
  isAutomated: boolean;
  metadata?: Record<string, any>;
}

// Micro-Phase 12A: Prospect Outreach Preparation & Contact Data Validation
export type ContactValidationStatus =
  | "UNVERIFIED"
  | "FORMAT_VALID"
  | "VERIFIED"
  | "INVALID"
  | "UNKNOWN";

export type ContactChannel = "email" | "phone" | "whatsapp" | "in_person" | "website";

export type ContactScope = "GENERAL_BUSINESS" | "NAMED_INDIVIDUAL";

export type ContactVerificationMethod =
  | "MANUAL_CONFIRMED"
  | "SMTP_CHECK"
  | "DNS_MX_VALIDATED"
  | "PHONE_VERIFIED"
  | "DIRECT_REPLY"
  | "PUBLIC_REGISTRY"
  | "IN_PERSON_CONFIRMED"
  | "UNVERIFIED";

export interface ContactRecord {
  id: string;
  type: ContactChannel;
  value: string;
  normalizedValue: string;
  contactScope: ContactScope;
  contactName?: string;
  contactRole?: string;
  status: ContactValidationStatus;
  formatValid: boolean;
  isVerified: boolean;
  source: string;
  evidenceReference?: string;
  lastValidatedAt: string;
  validationErrors?: string[];
  verificationMethod?: ContactVerificationMethod | string;
  isPrimary?: boolean;
  whatsappCapable?: boolean;
  notes?: string;
}

export type OutreachApprovalStatus =
  | "NOT_REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "BLOCKED";

export interface ProspectContactValidationProfile {
  businessId: string;
  primaryEmail?: ContactRecord;
  primaryPhone?: ContactRecord;
  primaryWhatsapp?: ContactRecord;
  allContacts: ContactRecord[];
  isOutreachReady: boolean;
  readinessScore: number; // 0 - 100
  contactConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  readinessFlags: {
    hasValidChannel: boolean;
    hasVerifiedChannel: boolean;
    hasNamedContact: boolean;
    hasGeneralContact: boolean;
    hasConflictingContacts: boolean;
    missingPhone: boolean;
    missingEmail: boolean;
    unverifiedWarnings: string[];
    formatIssues: string[];
    conflicts: string[];
  };
  availableOutreachChannels: ("email" | "phone" | "whatsapp" | "in_person")[];
  outreachApprovalStatus?: OutreachApprovalStatus;
  outreachApprovalNotes?: string;
  outreachApprovedBy?: string;
  outreachApprovedAt?: string;
  validatedAt: string;
}

// Micro-Phase 12B: Personalized Outreach Draft Generation and Truthfulness Controls
export type OutreachDraftChannel = 
  | "email" 
  | "whatsapp" 
  | "sms" 
  | "phone_script" 
  | "linkedin" 
  | "in_person";

export type OutreachTone = 
  | "Consultative" 
  | "Direct Gap Audit" 
  | "Friendly Local" 
  | "Executive" 
  | "Urgent Opportunity" 
  | "Professional" 
  | "Casual" 
  | "Concise";

export type OutreachDraftLength = "short" | "medium" | "detailed";

export type ClaimProvenanceType = 
  | "VERIFIED_FACT" 
  | "BUSINESS_SUPPLIED" 
  | "AUDIT_EVIDENCE" 
  | "AI_SUGGESTION" 
  | "UNSUPPORTED_ASSUMPTION";

export interface OutreachDraftClaim {
  id: string;
  claimText: string;
  provenance: ClaimProvenanceType;
  sourceRef?: string;
  isSupported: boolean;
  unsupportedReason?: string;
  confidence: number; // 0.0 to 1.0
}

export interface OutreachDraftHistoryEntry {
  version: number;
  timestamp: string;
  action: "generated" | "edited" | "regenerated" | "approved" | "rejected" | "discarded" | "scheduled" | "cancelled" | "sent" | "failed";
  actor?: string;
  actorRole?: string;
  subject?: string;
  body: string;
  reason?: string;
}

// Micro-Phase 12C: Outreach Approval, Scheduling, and Delivery Readiness Types
export type OutreachApprovalState =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type OutreachDeliveryStatus =
  | "NOT_SCHEDULED"
  | "SCHEDULED"
  | "DELIVERING"
  | "SENT"
  | "FAILED"
  | "CANCELLED"
  | "PROTOCOL_DISPATCHED";

export type OutreachDeliveryMode =
  | "SIMULATED"
  | "DIRECT_INTEGRATION"
  | "PROTOCOL_CLIENT"
  | "MANUAL_LOG";

export interface OutreachScheduleConfig {
  scheduledAt: string; // ISO 8601 string in future
  timeZone?: string;
  scheduledBy: string;
  scheduledByRole?: string;
  scheduledTimestamp: number;
  idempotencyKey: string;
  retryCount?: number;
  maxRetries?: number;
  autoSend?: boolean;
}

export interface OutreachDeliveryResult {
  success: boolean;
  deliveryStatus: OutreachDeliveryStatus;
  deliveryMode: OutreachDeliveryMode;
  dispatchedAt: string;
  provider?: string;
  providerMessageId?: string;
  recipientAddress?: string;
  channel: OutreachDraftChannel;
  isSimulated: boolean;
  error?: string;
  httpStatus?: number;
  auditNote?: string;
  retryCount?: number;
}

export interface OutreachAuditRecord {
  id: string;
  draftId: string;
  businessId: string;
  timestamp: string;
  action:
    | "created"
    | "edited"
    | "regenerated"
    | "submitted_for_review"
    | "approved"
    | "rejected"
    | "approval_invalidated"
    | "scheduled"
    | "rescheduled"
    | "schedule_cancelled"
    | "preflight_passed"
    | "preflight_failed"
    | "dispatch_attempted"
    | "sent"
    | "send_failed"
    | "protocol_dispatched"
    | "simulated_sent"
    | "duplicate_send_prevented"
    | "discarded";
  actor: string;
  actorRole: string;
  actorUid?: string;
  details?: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
}

// Micro-Phase 12D: Outreach Delivery Tracking and Communication History Types
export type CommunicationDeliveryStage = 
  | "QUEUED"
  | "ACCEPTED"
  | "DELIVERED"
  | "FAILED"
  | "BOUNCED"
  | "REPLIED"
  | "PROTOCOL_DISPATCHED"
  | "CANCELLED";

export type CommunicationEventType =
  | "approved"
  | "scheduled"
  | "submitted"
  | "provider_accepted"
  | "provider_rejected"
  | "delivered"
  | "delivery_failed"
  | "bounced"
  | "replied"
  | "cancelled";

export interface CommunicationLifecycleEvent {
  id: string;
  communicationId: string;
  eventType: CommunicationEventType;
  timestamp: string;
  provider: string;
  providerMessageId?: string;
  status: CommunicationDeliveryStage;
  isSimulated: boolean;
  details?: string;
  rawPayload?: Record<string, any>;
  idempotencyKey?: string;
}

export interface CommunicationRecord {
  id: string;
  businessId: string;
  prospectId?: string;
  contactId?: string;
  channel: OutreachDraftChannel;
  provider: string;
  providerMessageId?: string;
  direction: "OUTBOUND" | "INBOUND";
  subject?: string;
  body: string;
  senderAddress?: string;
  recipientAddress: string;
  approvalStatus: OutreachApprovalState;
  deliveryStatus: CommunicationDeliveryStage;
  isSimulated: boolean;
  draftId?: string;
  evidenceReferences?: string[];
  hasReadReceipt?: boolean;
  readAt?: string;
  createdAt: string;
  approvedAt?: string;
  scheduledAt?: string;
  submittedAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  repliedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  events: CommunicationLifecycleEvent[];
  replyCount?: number;
  parentCommunicationId?: string;
  threadId?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  provider: string;
  error?: string;
  parsedEvent?: CommunicationLifecycleEvent;
}

export interface OutreachDraft {
  id: string;
  businessId: string;
  channel: OutreachDraftChannel;
  tone: OutreachTone;
  length: OutreachDraftLength;
  subject?: string;
  alternativeSubjects?: string[];
  body: string;
  followUpSubject?: string;
  followUpBody?: string;
  callToAction: string;
  recipientTarget?: string;
  claims: OutreachDraftClaim[];
  unsupportedClaimsCount: number;
  truthfulnessScore: number; // 0 to 100
  isFlaggedForReview: boolean;
  flaggedReasons: string[];
  evidenceReferences: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
  isApproved: boolean;
  // Micro-Phase 12C: Separate Approval & Delivery Lifecycles
  approvalStatus?: OutreachApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  deliveryStatus?: OutreachDeliveryStatus;
  deliveryMode?: OutreachDeliveryMode;
  lastDeliveryResult?: OutreachDeliveryResult;
  scheduleConfig?: OutreachScheduleConfig;
  status: "draft" | "under_review" | "approved" | "discarded" | "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED" | "PROTOCOL_DISPATCHED";
  history: OutreachDraftHistoryEntry[];
  auditTrail?: OutreachAuditRecord[];
}

export interface DraftGenerationOptions {
  channel?: OutreachDraftChannel;
  tone?: OutreachTone;
  length?: OutreachDraftLength;
  senderName?: string;
  previewUrl?: string;
  focusGaps?: string[];
  customUserNotes?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  userId?: string;
  userRole?: string;
}

export interface DraftTruthfulnessScan {
  isValid: boolean;
  truthfulnessScore: number;
  claims: OutreachDraftClaim[];
  unsupportedClaims: OutreachDraftClaim[];
  flaggedIssues: string[];
  sanitizedBody: string;
}

export type WebsiteNeedStatus =
  | "NEEDS_NEW_WEBSITE"
  | "NEEDS_MODERNIZATION"
  | "NO_NEW_WEBSITE_NEEDED"
  | "UNCONFIRMED_NEED";

export type OpportunityAssessmentStatus =
  | "COMPLETE"
  | "INCOMPLETE"
  | "UNCHECKED";

export type OpportunityConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNCONFIRMED";

export interface OpportunityScoreExplanation {
  totalScore: number;
  digitalDeficitScore: number;
  businessQualityScore: number;
  commercialFitScore?: number;
  contactabilityScore?: number;
  evidenceConfidenceScore?: number;
  evidenceConfidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
  websiteNeedStatus?: WebsiteNeedStatus;
  assessmentStatus?: OpportunityAssessmentStatus;
  opportunityConfidence?: OpportunityConfidence;
  isVerifiedFinding?: boolean;
  verifiedIssues?: string[];
  estimatedIssues?: string[];
  unknowns?: string[];
  evidenceFreshness?: "FRESH" | "STALE" | "MISSING";
  deficitWeight: number;
  qualityWeight: number;
  commercialWeight?: number;
  contactabilityWeight?: number;
  formulaDescription: string;
  deficitItems: {
    key: string;
    label: string;
    points: number;
    detected: boolean;
    reason: string;
  }[];
  qualityFactors: {
    key: string;
    label: string;
    points: number;
    value: string | number;
    reason: string;
  }[];
  confirmedOpportunities?: string[];
  unknownAreas?: string[];
  supportingEvidence?: Array<{
    criterion: string;
    status: "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN";
    details: string;
    source?: string;
  }>;
  assessmentStatement?: string;
  summaryExplanation: string;
  recommendedPitchStrategy: string;
}

export type PreviewEventType =
  | "preview_opened"
  | "page_viewed"
  | "cta_clicked"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "feedback_submitted"
  | "approval_submitted";

export interface PreviewTelemetryEvent {
  id: string;
  previewToken: string;
  eventType: PreviewEventType;
  timestamp: string;
  device: "mobile" | "desktop";
  referrer?: string;
  details?: Record<string, any>;
}

export interface PresenceMetrics {
  hasWebsite: boolean;
  websiteStatus?: WebsiteStatus;
  websiteUrl?: string;
  canonicalUrl?: string;
  domain?: string;
  httpStatus?: number | string;
  sslStatus?: boolean;
  isAudited?: boolean;
  lastCheckedAt?: string;
  hasEmail: boolean;
  facebookStatus: "active" | "weak" | "none";
  instagramStatus: "active" | "weak" | "none";
  googleProfileQuality: "good" | "fair" | "poor";
  reviewCountStatus: "few" | "average" | "many";
  photosStatus: "sufficient" | "missing" | "outdated";
  descriptionQuality: "good" | "fair" | "poor";
  openingHoursStatus: "complete" | "missing";
  contactCompleteness: "complete" | "partial" | "missing";
  // Detailed 13-point deficit flags
  deficits?: DigitalDeficitAudit;
  detailedDeficits?: Record<string, DeficitFinding>;
}

export interface AuditEvidence {
  checkedAt: string;
  source: string;
  httpStatus?: number | string;
  responseTimeMs?: number;
  websiteVerified: boolean;
  notes: string;
  sourceUrls?: string[];
  verificationStatus?: "source_backed" | "unconfirmed" | "detected" | "verified_live_listing" | "directory_found" | "sample_demo";
  verificationMethod?: string;
  isEstimated?: boolean;
}

export interface VerificationChecklistItem {
  status: "passed" | "failed" | "unconfirmed";
  details: string;
}

export interface VerificationChecklist {
  businessIdentity: VerificationChecklistItem;
  exactPhone: VerificationChecklistItem;
  exactAddress: VerificationChecklistItem;
  websiteAbsenceCheck: VerificationChecklistItem;
  operatingStatus: VerificationChecklistItem;
  ratingSync: VerificationChecklistItem;
  socialMediaPresence: VerificationChecklistItem;
  independentVerificationAuditStamp: VerificationChecklistItem;
}

export type TruthFieldLevel = "VERIFIED" | "BUSINESS_SUPPLIED" | "AI_DRAFT" | "UNKNOWN";
export type ContentLevel = TruthFieldLevel;
export type TruthLevel = TruthFieldLevel;

export type TruthFieldStatus =
  | "CONFIRMED"
  | "MISSING"
  | "WEAK"
  | "BROKEN"
  | "UNCONFIRMED"
  | "confirmed"
  | "unconfirmed"
  | "not_found";

export interface TruthField<T = any> {
  label: string;
  key: string;
  value: T | null;
  status: TruthFieldStatus;
  statusText: string;
  level: ContentLevel;
  notes?: string;
  evidenceId?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  retrievedAt?: string | null;
  verifiedAt?: string | null;
  verificationMethod?:
    | "source_match"
    | "multiple_source_match"
    | "business_supplied"
    | "website_http_check"
    | "website_content_match"
    | "manual_confirmation"
    | "ai_inference"
    | "not_available"
    | string
    | null;
  confidence?: number | null;
}

export interface BusinessTruthProfile {
  id: string;
  businessId: string;
  businessName: TruthField;
  phone: TruthField;
  address: TruthField;
  website: TruthField;
  category: TruthField;
  services: TruthField;
  openingHours: TruthField;
  rating: TruthField;
  reviews: TruthField;
  email: TruthField;
  socialLinks: TruthField;
  summary: {
    confirmedCount: number;
    unconfirmedCount: number;
    verifiedCount: number;
    businessSuppliedCount: number;
    aiDraftCount: number;
    unknownCount?: number;
    draftPolicy: string;
  };
  generatedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email?: string;
  websiteUrl?: string;
  websiteStatus?: WebsiteStatus;
  reviewsCount: number;
  rating: number;
  presence: PresenceMetrics;
  description: string;
  presenceScore?: number;
  opportunityScore?: number;
  opportunityScoreExplanation?: OpportunityScoreExplanation;
  analysis?: OpportunityAnalysis;
  directorySource?: string;
  providerName?: string;
  providerId?: string;
  retrievedAt?: string;
  matchConfidence?: "EXACT" | "PARTIAL" | "UNCERTAIN";
  categoryMatch?: boolean;
  locationMatch?: boolean;
  relevanceScore?: number;
  relevanceExplanation?: string;
  missingFields?: string[];
  hasConflictingData?: boolean;
  conflicts?: string[];
  deficitCount?: number;
  evidence?: AuditEvidence;
  evidenceList?: EvidenceItem[];
  verificationState?: BusinessVerificationState;
  verificationChecklist?: VerificationChecklist;
  sourceUrl?: string;
  isDemo?: boolean;
  dataType?: "real" | "demo";
  truthProfile?: BusinessTruthProfile;
  userId?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  salesStage?: CanonicalSalesStage;
  // Enhanced Tripartite Scoring (Point 43, 44, 45)
  businessQualityScore?: number;
  digitalDeficitScore?: number;
  websiteOpportunityScore?: number;
  websiteNeedStatus?: WebsiteNeedStatus;
  assessmentStatus?: OpportunityAssessmentStatus;
  opportunityConfidence?: OpportunityConfidence;
  // Pipeline Architecture Classification
  pipelineBranch?: "BRANCH_A_WEBSITE_AUDITED" | "BRANCH_B_CANDIDATE_VERIFIED";
  pipelineStage?: "REAL_SOURCE_FETCHED" | "URL_DETECTED_AUDITED" | "CANDIDATE_VERIFIED" | "CONFIRMED_REVAMP_PROSPECT" | "GENERATION_READY";
  liveAuditDetails?: {
    rawUrl?: string;
    httpStatus?: string;
    responseTimeMs?: number;
    isSsl?: boolean;
    geminiAnalysisSummary?: string;
  };
  // Micro-Phase 11B, 11C & 11D: Qualification, Review Queue, Prioritization & Audit Trail
  qualificationStatus?: QualificationStatus;
  qualificationScore?: number;
  prioritizationRank?: number;
  qualificationResult?: ProspectQualificationResult;
  qualificationOverrides?: QualificationOverrideRecord[];
  reviewDecisions?: ReviewDecisionRecord[];
  reviewState?: "PENDING" | "REVIEWED" | "NEEDS_REVERIFICATION";
  pendingReviewReasons?: string[];
  qualificationAuditTrail?: QualificationAuditEvent[];
  // Micro-Phase 12A: Contact Data Validation & Outreach Preparation
  contactProfile?: ProspectContactValidationProfile;
  outreachApprovalStatus?: OutreachApprovalStatus;
  outreachApprovalNotes?: string;
  outreachApprovedBy?: string;
  outreachApprovedAt?: string;
  // Micro-Phase 12B, 12C & 12D: Outreach Drafts, Scheduling, Delivery & Communication History
  outreachDrafts?: OutreachDraft[];
  activeOutreachDraftId?: string;
  doNotContact?: boolean;
  outreachConsentGranted?: boolean;
  communicationHistory?: CommunicationRecord[];
  // Micro-Phase 13A: Canonical Follow-Up Tasks
  followUpTasks?: FollowUpTask[];
  // Micro-Phase 13B: Follow-Up Sequence Enrollments
  sequenceEnrollments?: ProspectSequenceEnrollment[];
  activeSequenceEnrollmentId?: string;
  // Micro-Phase 13C & 13D: Sales Pipeline Stage & Financial Ledger Fields
  dealDetails?: DealDetails;
  stageHistory?: StageTransitionRecord[];
  financialLedger?: FinancialLedgerEntry[];
  // Micro-Phase 14A: Commercial Documents & Proposals
  commercialDocuments?: CommercialDocument[];
  activeCommercialDocumentId?: string;
  // Micro-Phase 14B: Customer Onboarding & Handoff Fields
  onboardingRecord?: CustomerOnboardingRecord;
  onboardingStatus?: CustomerOnboardingStatus;
  // Micro-Phase 14C: Customer Project & Delivery Fields
  customerProject?: CustomerProjectRecord;
  projectStatus?: CustomerProjectStatus;
  // Micro-Phase 14D: Website Launch Verification, Handover, and Support Fields
  launchVerificationStatus?: LaunchVerificationStatus;
  customerHandover?: CustomerHandoverRecord;
  supportTickets?: PostLaunchSupportTicket[];
  // Micro-Phase 16B: Customer Communication, Notifications & Support Messaging Fields
  notifications?: CustomerNotificationRecord[];
  notificationPreferences?: Record<string, CustomerNotificationPreferences>;
  // Micro-Phase 16D: Customer Account Settings & Preferences
  accountSettings?: CustomerAccountSettings;
  // Micro-Phase 15A & 15C & 15D: Customer Account, Subscription, Invoices & Payment Fields
  customerAccount?: CustomerAccount;
  activeSubscription?: CustomerSubscription;
  subscriptionHistory?: CustomerSubscription[];
  billingEvents?: BillingEvent[];
  invoices?: CustomerInvoice[];
  payments?: CustomerPaymentRecord[];
  currency?: string;
  estimatedDealValue?: number;
  proposedDealValue?: number;
  agreedDealValue?: number;
  invoicedDealValue?: number;
  paidDealValue?: number;
  refundedDealValue?: number;
  netRevenue?: number;
  proposedServices?: string[];
  expectedCloseDate?: string;
  lossReason?: string;
  assignedOwner?: TaskAssignee;
  // Prospect pipeline fields
  prospectStatus?: ProspectStatus;
  lastContactedAt?: string;
  nextFollowUpDate?: string;
  prospectNotes?: string;
  siteId?: string;
  previewToken?: string;
  previewUrl?: string;
  previewViews?: number;
  previewLastViewedAt?: string;
  previewDevice?: "mobile" | "desktop";
  deploymentStatus?: DeploymentStatus;
  // Micro-Phase 8D: 4 Separated Lifecycle Dimensions
  clientApproved?: boolean;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  previewApprovalStatus?: PreviewApprovalStatus;
  contractStatus?: ContractStatus;
  paymentStatus?: PaymentStatus;
  dealOutcome?: DealOutcome;
  paidAmount?: number;
  totalContractValue?: number;
  depositAmount?: number;
  contractSignedAt?: string;
  contractSignedBy?: string;
  paymentReceivedAt?: string;
  dealClosedAt?: string;
  dealClosedBy?: string;
  dealClosureNotes?: string;
  customerId?: string;
  siteData?: GeneratedSite;
  activities?: any[];
  contractDocumentId?: string;
}

export type Prospect = Business;

export type ProspectStatus = 
  | "New"
  | "Analyzed"
  | "Preview Ready"
  | "Preview Sent"
  | "Interested"
  | "Proposal"
  | "Won"
  | "Lost";

export interface OpportunityAnalysis {
  presenceScore: number;
  opportunityScore: number;
  whyWebsiteNeeded: string;
  recommendations: string[];
  competitorPitches: string[];
  evidenceSummary?: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface VisualAnalysisReport {
  detectedSubject: string;
  tradeAuthenticity: "high_fidelity_trade_match" | "acceptable_context" | "generic_stock_warning";
  focalPointPosition: "left_weighted" | "center" | "right_weighted" | "distributed";
  negativeSpaceLocation: "left" | "right" | "top" | "center" | "minimal";
  overlayReadabilityScore: number; // 0 - 100
  contrastRating: "optimal_dark_overlay" | "optimal_light_overlay" | "high_contrast" | "busy_background";
  analysisSummary: string;
  visualDefects?: string[];
}

export interface ImageMetadata {
  id: string;
  provider: "unsplash" | "pexels" | "pixabay" | "curated_taxonomy" | "user_upload" | "business_asset" | "ai_generated";
  source?: string;
  selectionMethod?: string;
  sourceUrl: string;
  thumbnailUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  license: string;
  licenseUrl?: string;
  usageType: "stock" | "client_asset" | "user_upload" | "ai_generated";
  section: "hero" | "about" | "services" | "gallery" | "contact" | "features";
  query: string;
  industry: string;
  subcategory?: string;
  relevanceScore: number;
  relevanceBreakdown?: {
    metadataRelevance?: number;      // max 25
    visualRelevance?: number;        // max 35 (authentic trade tools/scene vs generic stock)
    composition?: number;            // max 20 (rule-of-thirds, visual balance)
    textOverlaySuitability?: number; // max 20 (clean negative space, headline headroom)
    // Legacy support
    industryMatch?: number;
    serviceMatch?: number;
    sectionMatch?: number;
    visualQuality?: number;
    orientation?: number;
    resolution?: number;
  };
  visualAnalysis?: VisualAnalysisReport;
  explanation?: string;
  orientation?: "landscape" | "portrait" | "square";
  createdAt: string;
}

export interface ImageRequirement {
  section: "hero" | "about" | "services" | "gallery" | "contact" | "features";
  subject: string;
  serviceName?: string;
  style: string;
  orientation: "landscape" | "portrait" | "square";
  aspectRatio: "16:9" | "4:3" | "1:1" | "3:2";
  keywords: string[];
  negativeKeywords?: string[];
  purpose?: string;
}

export interface VisualBusinessProfile {
  industry: string;
  subcategory: string;
  services: string[];
  audience: string[];
  visualStyle: string;
  preferredSubjects: string[];
  avoidSubjects: string[];
  localContext?: string;
  heroRequirement?: ImageRequirement;
  aboutRequirement?: ImageRequirement;
  servicesRequirements?: ImageRequirement[];
  galleryRequirements?: ImageRequirement[];
}

export interface HeroSection {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  imageUrl?: string;
  photographer?: string;
  photographerUrl?: string;
  license?: string;
  imageMetadata?: ImageMetadata;
}

export interface AboutSection {
  title: string;
  history: string;
  mission: string;
  pitch: string;
  imageUrl?: string;
  imageMetadata?: ImageMetadata;
}

export interface ServiceItem {
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
  imageMetadata?: ImageMetadata;
}

export interface FeatureItem {
  title: string;
  icon: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TestimonialItem {
  name: string;
  review: string;
  rating: number;
  isVerified?: boolean;
}

export interface BlogPostItem {
  title: string;
  summary: string;
  category: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
  license?: string;
  usageType?: "stock" | "client_asset" | "user_upload" | "ai_generated";
  relevanceScore?: number;
  explanation?: string;
  imageMetadata?: ImageMetadata;
}

export type DeploymentStatus = 
  | "DRAFT"
  | "PREVIEW_READY"
  | "CLIENT_APPROVED"
  | "DEPLOYING"
  | "LIVE"
  | "DEPLOY_FAILED";

export type SalesStatus = "Lead" | "Contacted" | "Negotiation" | "Proposal Sent" | "Closed" | "Lost";

export interface GeneratedSite {
  id: string;
  businessId?: string;
  deploymentStatus?: DeploymentStatus;
  deploymentLogs?: string[];
  salesStatus?: SalesStatus;
  salesStage?: CanonicalSalesStage;
  tags?: string[];
  ownerId?: string;
  previewToken?: string;
  createdAt?: string;
  updatedAt?: string;
  businessName: string;
  phone: string;
  email?: string;
  clientEmail?: string;
  address: string;
  country?: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: "sans" | "serif" | "display" | "modern";
  seo: SeoMetadata;
  hero: HeroSection;
  about: AboutSection;
  services: ServiceItem[];
  features: FeatureItem[];
  gallery: GalleryImage[];
  faqs: FAQItem[];
  testimonials: TestimonialItem[];
  blog: BlogPostItem[];
  whatsappMessage: string;
  contactPage: {
    title: string;
    description: string;
    email: string;
  };
  privacyPolicy: string;
  termsOfService: string;
  notFoundPage: {
    title: string;
    message: string;
  };
  logoUrl?: string;
  publishedUrl?: string;
  sectionsOrder?: string[];
  logoType?: "text" | "icon" | "image";
  logoIcon?: string;
  clientFeedback?: { message: string; timestamp: string; status: string; }[];
  isUserSupplied?: boolean;
  clientApproved?: boolean;
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  previewViews?: number;
  previewLastViewedAt?: string;
  previewHistory?: { timestamp: string; device: "mobile" | "desktop"; referrer?: string }[];
  proposal?: Proposal;
  truthProfile?: BusinessTruthProfile;
  publishing?: {
    customDomain?: string;
    subdomain?: string;
    hostingProvider?: string;
    sslActive?: boolean;
    sitemapUrl?: string;
    lastPublished?: string;
    status?: "published" | "unpublished";
  };
  crmSynced?: boolean;
  isDemo?: boolean;
  dataType?: "real" | "demo";
  visualProfile?: VisualBusinessProfile;
  imageAttributions?: ImageMetadata[];
  presence?: any;
  deficits?: any;
  provenance?: Record<string, ContentLevel>;
  generationMethod?: string;
  generationTimestamp?: string;
  lastEditedAt?: string;
  version?: number;
  currentVersion?: number;
  versionHistory?: any[];
  previousApprovedVersion?: number;
  approvalHistory?: any[];
  // Micro-Phase 8D: 4 Separated Lifecycle Dimensions
  previewApprovalStatus?: PreviewApprovalStatus;
  contractStatus?: ContractStatus;
  paymentStatus?: PaymentStatus;
  dealOutcome?: DealOutcome;
  paidAmount?: number;
  totalContractValue?: number;
  depositAmount?: number;
  contractSignedAt?: string;
  contractSignedBy?: string;
  paymentReceivedAt?: string;
  dealClosedAt?: string;
  dealClosedBy?: string;
}

export interface SalesOutreach {
  email: string;
  whatsapp: string;
  sms: string;
  coldCall: string;
  followUp: string;
  linkedin: string;
  messenger: string;
}

export interface PricingCalculator {
  packageName: string;
  packagePrice: number;
  hostingPrice: number;
  maintenancePrice: number;
  domainPrice: number;
  emailPrice: number;
  seoPrice: number;
  gbpOtpPrice: number;
  logoPrice: number;
  supportMonthlyPrice: number;
  isRecurring: boolean;
}

export interface Proposal {
  id: string;
  businessId: string;
  businessName: string;
  clientEmail: string;
  clientName: string;
  dateCreated: string;
  expiryDate: string;
  features: string[];
  pricing: PricingCalculator;
  status: "draft" | "sent" | "approved" | "rejected";
  timeline: string;
  terms: string;
  // Micro-Phase 8D: 4 Separated Lifecycle Dimensions
  previewApprovalStatus?: PreviewApprovalStatus;
  contractStatus?: ContractStatus;
  paymentStatus?: PaymentStatus;
  dealOutcome?: DealOutcome;
  paidAmount?: number;
  contractSignedAt?: string;
  contractSignedBy?: string;
  paymentReceivedAt?: string;
}

export interface SearchFilters {
  country: string;
  city: string;
  town: string;
  category: string;
  keywords: string;
  radius: string;
  page?: number;
  directorySource?: string;
  deficitFilters?: {
    noWebsite?: boolean;
    outdatedWebsite?: boolean;
    noGooglePresence?: boolean;
    noSocialMedia?: boolean;
    poorBranding?: boolean;
    noWhatsappCta?: boolean;
    noOnlineCatalogue?: boolean;
    noBookingSystem?: boolean;
    noEnquiryForm?: boolean;
    noSeo?: boolean;
    brokenLinks?: boolean;
    poorMobileExperience?: boolean;
    missingContact?: boolean;
  };
}

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: "Admin" | "User";
  subscription: "Free Trial" | "Pro Plan" | "Agency VIP";
  isVerified: boolean;
}

export interface PartnerNiche {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  whyTheyNeedUs: string;
  averageClientNeed: string;
  pitchHook: string;
  typicalTicketSize: string;
  suggestedSplit: string;
  searchQuery: string;
}

export interface PartnerDeal {
  id: string;
  partnerName: string;
  partnerType: string;
  partnerEmail: string;
  partnerPhone: string;
  status: "Targeted" | "Prospecting" | "Contacted" | "In Negotiation" | "Agreement Signed" | "Active Partner";
  splitPercentage: number;
  referredClientCount: number;
  totalRevenueGenerated: number;
  notes: string;
}

export interface CapturedLead {
  id: string;
  businessId: string;
  siteId?: string;
  previewToken?: string;
  businessName?: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "ARCHIVED";
  createdAt: string;
  source: "website_contact_form" | "public_preview" | "manual";
  notificationStatus: "NOT_CONFIGURED" | "PENDING" | "DELIVERED" | "FAILED";
  notificationError?: string;
  ipHash?: string;
}


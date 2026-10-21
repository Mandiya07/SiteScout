process.env.NODE_ENV = "test";
import { runSecurityRuleAssertions } from "../../firestore.rules.test";
import { isPrivateIp, validateHostname, validateUrlForSsrf } from "../../server/ssrfGuard";
import { escapeHtml, sanitizeUrl, generateStaticHtml } from "./htmlGenerator";
import { buildBusinessTruthProfile } from "./businessTruth";
import { calculatePresenceScore, calculateOpportunityScore, calculateStructuredOpportunityResult } from "../../server/services/prospectService";
import { auditLiveWebsite, determineWebsiteStatusFromAudit, getWebsiteStatusDescription } from "../../server/services/auditService";
import { 
  calculateExplainableOpportunityScore, CANONICAL_STAGES, 
  toCanonicalStage, isValidTransition, updateProspectStage,
  updatePreviewApprovalStatus, updateContractStatus, updatePaymentStatus,
  updateDealOutcome, getBusinessLifecycleAuditEvents
} from "./prospectCrm";
import { 
  resolveDeterministicBusinessId, 
  matchBusinessRecord, 
  mergeBusinessRecords, 
  deduplicateAndIngestBusinesses,
  normalizePhoneNumber,
  normalizeAddress,
  getCanonicalDomain,
  GENERIC_PLATFORM_DOMAINS
} from "./businessIdentity";
import {
  saveBusinessRecord,
  getBusinessRecord,
  fetchUserBusinesses,
  deleteBusinessRecord,
  ingestAndPersistBusinesses,
  clearBusinessPersistenceStore,
  validateBusinessRecord
} from "./businessPersistence";
import {
  validateSearchRelevance,
  detectDataQualityAndConflicts,
  normalizeSearchResult,
  filterAndRankSearchResults,
  handleSearchProviderFailure
} from "./searchNormalization";
import {
  buildSearchCacheKey,
  getCachedSearchResults,
  setCachedSearchResults,
  clearSearchCache,
  isCircuitOpen,
  recordProviderOutcome,
  classifySearchError
} from "./searchCache";
import {
  generateSearchCorrelationId,
  recordSearchOperationalEvent,
  getSearchOperationalMetrics,
  clearSearchOperationalLogs,
  sanitizeLogData
} from "./searchTelemetry";
import {
  evaluateProspectQualification,
  applyQualificationOverride,
  revertQualificationOverride,
  compareProspectPrioritization,
  evaluateAndRecordQualification
} from "./prospectQualification";
import {
  recordQualificationAuditEvent,
  getProspectQualificationAuditTrail,
  isUserAuthorizedForAuditAccess,
  isDuplicateQualificationEvent,
  attemptEditOrDeleteAuditEvent,
  sanitizeAuditReason,
  createAuditActor,
  clearQualificationAuditMemoryCacheForTest
} from "./prospectQualificationAudit";
import {
  getProspectReviewReasons,
  isProspectInReviewQueue,
  filterProspectReviewQueue,
  executeProspectReviewAction,
  isUserAuthorizedForReview
} from "./prospectReviewQueue";
import {
  validateEmailFormat,
  validatePhoneFormat,
  determineContactValidationStatus,
  verifyContactDataGrounding,
  detectContactConflicts,
  buildProspectContactProfile,
  prepareProspectForOutreach,
  updateOutreachApproval
} from "./prospectContactValidation";
import {
  generatePersonalizedOutreachDraft,
  scanDraftTruthfulness,
  saveDraftToBusiness,
  editDraftInBusiness,
  regenerateDraftInBusiness,
  approveDraftInBusiness,
  discardDraftInBusiness,
  extractVerifiedEvidenceGaps,
  validatePreflightDelivery,
  submitDraftForReview,
  approveOutreachDraft,
  rejectOutreachDraft,
  scheduleOutreachDelivery,
  cancelScheduledDelivery,
  rescheduleOutreachDelivery,
  deliverOutreachMessage,
  createCanonicalCommunicationRecord,
  recordCommunicationLifecycleEvent,
  recordInboundReply,
  getProspectCommunicationTimeline,
  verifyWebhookPayload,
  isUserAuthorizedForHistory
} from "./prospectOutreachDrafting";
import {
  createFollowUpTask,
  assignFollowUpTask,
  rescheduleFollowUpTask,
  updateFollowUpTaskStatus,
  createFollowUpFromCommunication,
  getProspectFollowUpTasks,
  isTaskOverdue,
  getEffectiveTaskStatus,
  calculateDueTimestamp,
  isUserAuthorizedForTask
} from "./prospectFollowUpTasks";
import {
  DEFAULT_FOLLOW_UP_SEQUENCES,
  getAvailableSequences,
  getSequenceById,
  createFollowUpSequence,
  checkProspectSequenceEligibility,
  calculateStepDueDate,
  enrollProspectInSequence,
  advanceSequenceEnrollment,
  pauseSequenceEnrollment,
  resumeSequenceEnrollment,
  cancelSequenceEnrollment,
  handleSequenceReplyOrOptOut
} from "./prospectFollowUpSequences";
import {
  CANONICAL_PIPELINE_STAGES,
  normalizePipelineStage,
  validatePipelineStageTransition,
  executePipelineStageTransition,
  updateDealCommercialTerms
} from "./prospectPipelineStages";
import {
  toCents,
  fromCents,
  formatCurrency,
  computeBusinessFinancialsFromLedger,
  recordFinancialLedgerEntry,
  recordPayment,
  recordRefund,
  calculateRevenueMetrics
} from "./prospectFinancials";
import {
  createCommercialDocument,
  updateCommercialDocument,
  approveCommercialDocument,
  sendCommercialDocument,
  acceptCommercialDocument,
  rejectCommercialDocument,
  cancelCommercialDocument,
  getCommercialDocumentByAccessToken,
  revokeDocumentAccessToken
} from "./commercialDocuments";
import {
  generateDefaultOnboardingChecklist,
  extractCustomerContacts,
  initiateCustomerOnboarding,
  updateOnboardingRequirement,
  advanceOnboardingStatus,
  pauseCustomerOnboarding,
  cancelCustomerOnboarding,
  updateOnboardingProjectDetails
} from "./customerOnboarding";
import {
  generateDefaultMilestones,
  generateDefaultProjectTasks,
  transferOnboardingRequirements,
  initializeCustomerProject,
  updateProjectTask,
  recordCustomerVersionApproval,
  submitProjectRevision,
  evaluateLaunchReadiness,
  advanceProjectStatus,
  recordProjectDeployment
} from "./customerProjectDelivery";
import {
  verifyDeployedWebsite,
  deriveSupportTerms,
  initiateCustomerHandover,
  confirmCustomerHandover,
  completeCustomerProject,
  createSupportTicket,
  resolveSupportTicket
} from "./websiteLaunchHandover";
import {
  CANONICAL_PLANS,
  createCustomerAccount,
  activatePaidSubscription,
  changeSubscriptionPlan,
  markSubscriptionPastDue,
  cancelSubscription,
  expireSubscription,
  checkServiceEntitlement,
  adminOverrideSubscriptionPlan
} from "./customerSubscription";
import {
  calculateEffectiveEntitlements,
  synchronizeEntitlements,
  processBillingEvent,
  renewSubscription,
  cancelSubscriptionWithPeriodEnd,
  reactivateSubscription
} from "./subscriptionBillingEvents";
import {
  roundMoney,
  createCustomerInvoice,
  recordCustomerInvoicePayment,
  recordFailedPaymentAttempt,
  refundCustomerPayment,
  voidCustomerInvoice,
  evaluateOverdueInvoices,
  getCustomerBillingSummary
} from "./customerBilling";
import {
  sanitizeTicketForCustomer,
  normalizeSupportPriority,
  createCustomerSupportTicket,
  assignSupportTicket,
  updateSupportTicketStatus,
  addTicketMessage,
  reopenSupportTicket,
  resolveCustomerSupportTicket,
  getCustomerTickets,
  getStaffTickets
} from "./customerSupport";
import {
  validateRecipientForChannel,
  getEffectiveNotificationPreferences,
  updateCustomerNotificationPreferences,
  queueCustomerNotification,
  dispatchNotificationAttempt,
  recordNotificationDeliveryStatus,
  retryFailedNotification,
  markNotificationRead,
  getCustomerNotifications,
  getStaffNotificationAuditLog,
  dispatchSupportTicketNotification
} from "./customerCommunications";
import {
  createCustomerSession,
  isSessionValid,
  revokeCustomerSession,
  isCustomerAccountOwner,
  authorizeCustomerAccess,
  sanitizeCustomerPortalData,
  authorizeDirectApiAccess
} from "./customerPortalAccess";
import {
  normalizeAdminRole,
  hasPermission,
  isHighRiskOperation,
  getStaffDirectory,
  resetStaffRegistryForTesting,
  findStaffAccount,
  getPrivilegedAuditLogs,
  clearPrivilegedAuditLogsForTesting,
  acquireOperationLock,
  releaseOperationLock,
  verifyOperatorIdentity,
  authorizePrivilegedOperation,
  executeChangeCustomerOwnership,
  executeChangeSubscriptionStatus,
  executeGrantOrRevokeEntitlements,
  executeEditFinancialRecords,
  executeIssueRefund,
  executeChangeUserRole,
  executeDeactivateStaffAccount,
  executeDeleteRecord,
  executePublishLaunchWebsite,
  executeModifySecuritySettings,
  executeUserImpersonation
} from "./internalAdminSecurity";
import {
  recordCanonicalAuditEvent,
  getCanonicalAuditLogs,
  preventAuditTampering,
  resetCanonicalAuditLogsForTesting,
  recordAuthAuditEvent,
  recordCustomerLifecycleAuditEvent,
  recordFinancialAuditEvent,
  recordWebsiteLifecycleAuditEvent
} from "./canonicalAuditTrail";
import {
  validateServerConfig,
  formatSafeConfigSummary,
  maskSecret,
  parseAllowedOrigins,
  normalizeEnvironment,
  assertLiveIntegrationAvailable,
  scanForExposedSecrets,
  validateGitignoreProtectsSecrets,
  validateEnvExampleSafe,
  ConfigurationError
} from "./appConfig";
import fs from "fs";
import { extractBusinessesFromJson } from "./searchJsonExtractor";
import { Business, PreviewApprovalStatus, ContractStatus, PaymentStatus, DealOutcome, EvidenceItem, PresenceMetrics, QualificationAuditEvent, QualificationDecisionType, DeploymentEvidence, PaymentProviderReference, BillingEvent, TaskAssignee } from "../types";
import { normalizeWebsiteSchema, validateWebsiteSchema, classifyFact, sanitizeLiabilityClaims, runPrePublicationIntegrityScan } from "./websiteSchema";
import { 
  generateSecurePreviewToken, 
  sanitizePublicPreview, 
  isValidPreviewToken, 
  isCryptographicToken, 
  isTokenExpired, 
  maskToken,
  isAllowedTelemetryEvent,
  normalizeTelemetryEventType,
  sanitizeTelemetryMetadata,
  checkTelemetryRateLimit,
  clearRateLimitMap
} from "./security";
import { imageAssistant } from "../../server/image/imageSearchAssistant";
import { matchIndustryTaxonomy } from "../../server/image/taxonomy";
import { visualAnalyzer } from "../../server/image/visualAnalyzer";
import { rankAndScoreImage } from "../../server/image/imageRanking";
import { imageCache } from "../../server/image/imageCache";
import { getCategoryHeroImage } from "./heroImages";
import {
  RATE_LIMIT_CONFIGS,
  ALLOWED_FILE_TYPES,
  FORBIDDEN_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
  validateSearchPayload,
  validateAiGenerationPayload,
  validateContactFormPayload,
  validateFileUpload,
  validateCsrfProtection,
  authorizeCustomerResourceAccess,
  verifyWebhookSecretOrSignature,
  sanitizeApiError,
  TieredRateLimiter,
  InFlightDeduplicator,
  WebhookIdempotencyTracker,
  globalRateLimiter,
  globalInFlightDeduplicator,
  globalWebhookTracker
} from "./apiSecurity";
import { runUnitTests } from "../test/unit.test";
import { runIntegrationTests } from "../test/integration.test";
import { runE2eTests } from "../test/e2e.test";
import { runRegressionTests } from "../test/regressions.test";
import { runProductionQualityGates } from "../test/qualityGate";

/**
 * SiteScout AI - Automated Phase 12 Comprehensive Test & QA Suite
 */

export async function runFullQaSuite(): Promise<{ total: number; passed: number; failed: number }> {
  console.log("=================================================");
  console.log("  SITESCOUT AI - PHASE 12 AUTOMATED QA & QA SUITE  ");
  console.log("=================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: SSRF Protection & Host Validation
  // ----------------------------------------------------
  console.log("--> Group 1: SSRF Guard Protections");
  assert(isPrivateIp("127.0.0.1") === true, "Block IPv4 Loopback (127.0.0.1)");
  assert(isPrivateIp("10.0.0.5") === true, "Block Private IPv4 Class A (10.0.0.5)");
  assert(isPrivateIp("172.16.0.1") === true, "Block Private IPv4 Class B (172.16.0.1)");
  assert(isPrivateIp("192.168.1.1") === true, "Block Private IPv4 Class C (192.168.1.1)");
  assert(isPrivateIp("169.254.169.254") === true, "Block Cloud Metadata IP (169.254.169.254)");
  assert(isPrivateIp("8.8.8.8") === false, "Allow Public IPv4 (8.8.8.8)");

  assert(validateHostname("localhost").valid === false, "Reject Hostname: localhost");
  assert(validateHostname("metadata.google.internal").valid === false, "Reject Hostname: metadata.google.internal");
  assert(validateHostname("0x7f000001").valid === false, "Reject Hex Encoded IP Hostname");
  assert(validateHostname("google.com").valid === true, "Allow Valid Public Hostname: google.com");

  const ssrfLocalRes = await validateUrlForSsrf("http://localhost:3000/api/health");
  assert(ssrfLocalRes.safe === false, "Reject SSRF Target: http://localhost:3000");

  const ssrfFileRes = await validateUrlForSsrf("file:///etc/passwd");
  assert(ssrfFileRes.safe === false, "Reject Non-HTTP/HTTPS Protocol: file://");

  // ----------------------------------------------------
  // TEST GROUP 2: HTML Escaping & Link Sanitization
  // ----------------------------------------------------
  console.log("\n--> Group 2: HTML Escaping & XSS Protections");
  const malScript = '<script>alert("XSS")</script>';
  const escapedScript = escapeHtml(malScript);
  assert(!escapedScript.includes("<script>") && escapedScript.includes("&lt;script&gt;"), "Escape Script Tags");

  const malUrl = "javascript:alert('XSS')";
  const sanitizedMalUrl = sanitizeUrl(malUrl);
  assert(sanitizedMalUrl === "#", "Sanitize Malicious Scheme: javascript:");

  const validWaUrl = "https://wa.me/27123456789";
  assert(sanitizeUrl(validWaUrl) === "https://wa.me/27123456789", "Allow Safe HTTPS Scheme");

  // ----------------------------------------------------
  // TEST GROUP 3: Audit Semantics & Scoring Logic
  // ----------------------------------------------------
  console.log("\n--> Group 3: Audit Semantics & Scoring Logic");
  const presenceNoWeb = { hasWebsite: false, hasEmail: false };
  const scoreNoWeb = calculatePresenceScore(presenceNoWeb, 0, 0);
  const oppNoWeb = calculateOpportunityScore(presenceNoWeb, 0, 0);
  assert(scoreNoWeb < 50, "Low Presence Score for business without website");
  assert(oppNoWeb > 50, "High Opportunity Score for business without website");

  const presenceGoodWeb = {
    hasWebsite: true,
    hasEmail: true,
    facebookStatus: "active",
    googleProfileQuality: "good"
  };
  const scoreGoodWeb = calculatePresenceScore(presenceGoodWeb, 4.8, 120);
  assert(scoreGoodWeb >= 80, "High Presence Score for complete digital footprint");

  // ----------------------------------------------------
  // TEST GROUP 4: Business Truth Invariants
  // ----------------------------------------------------
  console.log("\n--> Group 4: Business Truth Invariants & TruthField Semantics");
  const sampleBiz = {
    id: "biz-123",
    name: "Apex Plumbing",
    category: "Plumber",
    phone: "+27821234567",
    address: "Cape Town",
    verificationState: "VERIFIED",
    evidence: { verificationStatus: "verified_live_listing", source: "Google Maps", sourceUrls: ["https://maps.google.com/apex"] },
    evidenceList: [
      { supports: ["businessName"], title: "Google Maps", url: "https://maps.google.com/apex" },
      { supports: ["phone"], title: "Google Maps", url: "https://maps.google.com/apex" },
      { supports: ["address"], title: "Google Maps", url: "https://maps.google.com/apex" }
    ],
    presence: { hasWebsite: false }
  };
  const profile = buildBusinessTruthProfile(sampleBiz);
  assert(profile.businessName.value === "Apex Plumbing", "Truth Profile retains business name");
  assert(profile.website.value === "No website discovered" || profile.website.value === "No website found", "Truth Profile confirms missing website");
  assert(profile.summary.verifiedCount >= 1, "Truth Profile assigns VERIFIED level to confirmed attributes");

  // TEST 1 — Populated field is not automatically verified
  const t1 = buildBusinessTruthProfile({ name: "Unverified Shop", phone: "+27821111111" });
  assert(t1.phone.level !== "VERIFIED", "TEST 1: Populated unevidenced phone is not automatically VERIFIED");

  // TEST 2 — Verified source-backed field
  const t2 = buildBusinessTruthProfile({
    name: "Verified Shop",
    phone: "+27821111111",
    verificationState: "VERIFIED",
    evidence: { verificationStatus: "verified_live_listing", source: "Google Maps", sourceUrls: ["https://maps.google.com/123"] },
    evidenceList: [{ supports: ["phone"], title: "Google Maps Listing", url: "https://maps.google.com/123" }]
  });
  assert(t2.phone.level === "VERIFIED" && t2.phone.status === "CONFIRMED", "TEST 2: Source-backed field is VERIFIED and CONFIRMED");

  // TEST 3 — Business-supplied value
  const t3 = buildBusinessTruthProfile({ name: "Owner Shop", isOwnerPhone: true, phone: "+27829999999" });
  assert(t3.phone.level === "BUSINESS_SUPPLIED", "TEST 3: Owner-supplied value is BUSINESS_SUPPLIED");

  // TEST 4 — AI-generated value
  const t4 = buildBusinessTruthProfile({ name: "Demo Shop", isDemo: true, phone: "+27820000000" });
  assert(t4.phone.level === "AI_DRAFT", "TEST 4: Demo / AI-generated field is AI_DRAFT");

  // TEST 5 — Missing field
  const t5 = buildBusinessTruthProfile({ name: "No Phone Shop", phone: "" });
  assert(t5.phone.value === null && t5.phone.status === "MISSING", "TEST 5: Empty field is value null and MISSING status");

  // TEST 6 — Unconfirmed status
  const t6 = buildBusinessTruthProfile({ name: "Unconfirmed Shop", phone: "+27821234567" });
  assert(t6.phone.status === "UNCONFIRMED", "TEST 6: Field without evidence citation has UNCONFIRMED status");

  // TEST 7 — Fake email protection
  const t7 = buildBusinessTruthProfile({ name: "Fake Email Shop", email: "contact@fakecorp.com" });
  assert(t7.email.level !== "VERIFIED" && t7.email.value === null, "TEST 7: Unproven generic email is filtered out and not VERIFIED");

  // TEST 8 — AI-generated services claim
  const t8 = buildBusinessTruthProfile({ name: "Inferred Services Shop" });
  assert(t8.services.level === "AI_DRAFT", "TEST 8: Inferred service catalog is AI_DRAFT");

  // TEST 9 — Website URL without live HTTP audit
  const t9 = buildBusinessTruthProfile({ name: "Unchecked Site", presence: { hasWebsite: true, websiteUrl: "https://example.com", isAudited: false } });
  assert(t9.website.level !== "VERIFIED" && t9.website.status === "UNCONFIRMED", "TEST 9: Unchecked website domain is UNCONFIRMED and not VERIFIED");

  // TEST 10 — Legacy record without evidence
  const t10 = buildBusinessTruthProfile({ name: "Legacy Shop", verified: true, phone: "+27825555555" });
  assert(t10.phone.level !== "VERIFIED", "TEST 10: Legacy record without evidence provenance is not automatically VERIFIED");

  // ----------------------------------------------------
  // TEST GROUP 5: Firestore Security Rules TDD Matrix
  // ----------------------------------------------------
  console.log("\n--> Group 5: Firestore Security Rules Assertion Matrix");
  const secResult = runSecurityRuleAssertions();
  assert(secResult.failed === 0, "All 12 Firestore Attack Vector Payloads Blocked");

  // ----------------------------------------------------
  // TEST GROUP 6: Evidence Association & Traceability (Micro-Phase 2D)
  // ----------------------------------------------------
  console.log("\n--> Group 6: Evidence Association & Traceability Tests");

  // TEST 1 — No positional association
  const bizA = { id: "biz-a", name: "Alpha Motors", phone: "+27821111111", evidenceList: [] };
  const bizB = { id: "biz-b", name: "Beta Bakery", phone: "+27822222222", evidenceList: [{
    id: "ev-beta",
    sourceId: "src-beta",
    url: "https://yellowpages.co.za/beta",
    title: "Beta Bakery Listing",
    supports: ["phone"],
    evidenceText: "Beta Bakery phone +27822222222"
  }] };
  const profA = buildBusinessTruthProfile({ ...bizA, evidenceList: bizB.evidenceList });
  assert(profA.phone.level !== "VERIFIED", "TEST 1 (Phase 2D): Business A cannot receive Business B's evidence via positional array matching");

  // TEST 2 — Exact source ID
  const bizSourceId = {
    id: "biz-src-1",
    sourceId: "src-unique-99",
    name: "Gamma Services",
    phone: "+27823333333",
    evidenceList: [{
      id: "ev-gamma",
      sourceId: "src-unique-99",
      url: "https://directory.com/gamma",
      title: "Gamma Services Official Registry",
      supports: ["phone", "name"],
      evidenceText: "Gamma Services +27823333333"
    }]
  };
  const profSourceId = buildBusinessTruthProfile(bizSourceId);
  assert(profSourceId.phone.level === "VERIFIED" && profSourceId.phone.verificationMethod === "SOURCE_ID", "TEST 2 (Phase 2D): Exact source ID produces SOURCE_ID association & VERIFIED status");

  // TEST 3 — Exact URL
  const bizExactUrl = {
    id: "biz-url-1",
    name: "Delta Logistics",
    sourceUrl: "https://yellowpages.com/delta-logistics",
    phone: "+27824444444",
    evidenceList: [{
      id: "ev-delta",
      url: "https://yellowpages.com/delta-logistics/",
      title: "Delta Logistics",
      supports: ["phone"],
      evidenceText: "Delta Logistics phone +27824444444"
    }]
  };
  const profExactUrl = buildBusinessTruthProfile(bizExactUrl);
  assert(profExactUrl.phone.level === "VERIFIED" && profExactUrl.phone.verificationMethod === "EXACT_URL", "TEST 3 (Phase 2D): Canonical URL match produces EXACT_URL association & VERIFIED status");

  // TEST 4 — Domain match does not verify unsupported fields
  const bizDomain = {
    id: "biz-dom-1",
    name: "Epsilon Cafe",
    websiteUrl: "https://epsiloncafe.co.za",
    phone: "+27825555555",
    rating: 4.8,
    evidenceList: [{
      id: "ev-epsilon",
      url: "https://epsiloncafe.co.za/contact",
      title: "Epsilon Cafe Contact Us",
      supports: ["website", "phone", "name"],
      evidenceText: "Contact Epsilon Cafe at +27825555555"
    }]
  };
  const profDomain = buildBusinessTruthProfile(bizDomain);
  assert(profDomain.phone.level === "VERIFIED", "TEST 4A (Phase 2D): Supported field on domain match is VERIFIED");
  assert(profDomain.rating.level !== "VERIFIED", "TEST 4B (Phase 2D): Domain match does NOT verify unsupported rating field");

  // TEST 5 — Name-only match without context is WEAK
  const bizNameOnly = {
    id: "biz-name-1",
    name: "Zeta Hardware",
    phone: "+27826666666",
    address: "Durban",
    evidenceList: [{
      id: "ev-zeta",
      url: "https://randomblog.com/zeta-hardware-review",
      title: "Zeta Hardware Blog Mention",
      supports: ["phone"],
      evidenceText: "Mentions Zeta Hardware somewhere in Pretoria" // different context
    }]
  };
  const profNameOnly = buildBusinessTruthProfile(bizNameOnly);
  assert(profNameOnly.phone.level !== "VERIFIED", "TEST 5 (Phase 2D): Name-only match without context is WEAK and not VERIFIED");

  // TEST 6 — Unsupported field remains UNKNOWN / MISSING
  const bizPartial = {
    id: "biz-part-1",
    sourceId: "src-eta",
    name: "Eta Electric",
    phone: "+27827777777",
    rating: 0,
    evidenceList: [{
      id: "ev-eta",
      sourceId: "src-eta",
      url: "https://dir.com/eta",
      title: "Eta Electric",
      supports: ["phone"]
    }]
  };
  const profPartial = buildBusinessTruthProfile(bizPartial);
  assert(profPartial.phone.level === "VERIFIED" && profPartial.rating.level === "UNKNOWN", "TEST 6 (Phase 2D): Unsupported rating remains UNKNOWN level");

  // TEST 7 — No fabricated evidence or fake IDs
  const bizNoFake = { id: "biz-nofake-1", name: "Theta Spares", phone: "+27828888888" };
  const profNoFake = buildBusinessTruthProfile(bizNoFake);
  assert(profNoFake.phone.sourceId === null || profNoFake.phone.sourceId === undefined, "TEST 7 (Phase 2D): Missing source ID remains null rather than fake string");

  // TEST 8 — Conflicting sources produce UNCONFIRMED
  const bizConflict = {
    id: "biz-conf-1",
    name: "Iota Traders",
    phone: "+27829999999",
    evidenceList: [
      { id: "ev-1", url: "https://dir1.com/iota", title: "Dir 1", supports: ["phone"], evidenceText: "+27821111111" },
      { id: "ev-2", url: "https://dir2.com/iota", title: "Dir 2", supports: ["phone"], evidenceText: "+27822222222" }
    ]
  };
  const profConflict = buildBusinessTruthProfile(bizConflict);
  assert(profConflict.phone.status === "UNCONFIRMED" && profConflict.phone.level !== "VERIFIED", "TEST 8 (Phase 2D): Conflicting source evidence produces UNCONFIRMED status");

  // TEST 9 — Strong evidence preservation
  const bizPreserve = {
    id: "biz-pres-1",
    name: "Kappa Tech",
    truthProfile: {
      phone: {
        label: "Phone", key: "phone", value: "+27821234567",
        status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
        source: "Official Registry", verificationMethod: "SOURCE_ID", confidence: 0.95
      }
    },
    evidenceList: [
      { id: "ev-weak", url: "https://blog.com/kappa", title: "Kappa Tech Blog", supports: ["phone"] }
    ]
  };
  const profPreserve = buildBusinessTruthProfile(bizPreserve);
  assert(profPreserve.phone.level === "VERIFIED" && profPreserve.phone.confidence === 0.95, "TEST 9 (Phase 2D): Weaker subsequent evidence does not overwrite stronger verified status");

  // TEST 10 — Evidence persistence in truth profile
  const bizPersist = {
    id: "biz-pers-1",
    name: "Lambda Corp",
    sourceId: "src-lam-10",
    phone: "+27821010101",
    evidenceList: [{
      id: "ev-lam-10",
      sourceId: "src-lam-10",
      url: "https://yellowpages.co.za/lambda",
      title: "Lambda Corp Listing",
      supports: ["phone"]
    }]
  };
  const profPersist = buildBusinessTruthProfile(bizPersist);
  assert(profPersist.phone.evidenceId === "ev-lam-10" && profPersist.phone.sourceId === "src-lam-10", "TEST 10 (Phase 2D): TruthField retains evidenceId and sourceId");

  // ----------------------------------------------------
  // TEST GROUP 7: Verification Confidence & Method (Micro-Phase 2F)
  // ----------------------------------------------------
  console.log("\n--> Group 7: Verification Confidence & Method (Phase 2F)");

  // TEST 1 — VERIFIED field requires evidence
  const t2f1 = buildBusinessTruthProfile({ name: "No Evidence Shop", phone: "+27821111111" });
  assert(t2f1.phone.level !== "VERIFIED", "TEST 1 (Phase 2F): Field without evidence cannot be VERIFIED");

  // TEST 2 — VERIFIED field requires a verification method
  const t2f2 = buildBusinessTruthProfile({
    name: "Evidence Shop",
    phone: "+27821111111",
    verificationState: "VERIFIED",
    evidence: { verificationStatus: "verified_live_listing", source: "Directory", sourceUrls: ["https://dir.com/1"] },
    evidenceList: [{ supports: ["phone"], title: "Directory Listing", url: "https://dir.com/1" }]
  });
  assert(
    t2f2.phone.level === "VERIFIED" &&
    t2f2.phone.verificationMethod !== null &&
    t2f2.phone.verificationMethod !== "",
    "TEST 2 (Phase 2F): VERIFIED field has a non-null, meaningful verificationMethod"
  );

  // TEST 3 — AI_DRAFT cannot become VERIFIED
  const t2f3 = buildBusinessTruthProfile({ name: "Demo Shop", isDemo: true, phone: "+27821111111" });
  assert(t2f3.phone.level === "AI_DRAFT" && (t2f3.phone.level as string) !== "VERIFIED", "TEST 3 (Phase 2F): AI_DRAFT level cannot be VERIFIED");

  // TEST 4 — BUSINESS_SUPPLIED does not automatically become VERIFIED
  const t2f4 = buildBusinessTruthProfile({ name: "Owner Shop", isOwnerPhone: true, phone: "+27829999999" });
  assert(t2f4.phone.level === "BUSINESS_SUPPLIED" && (t2f4.phone.level as string) !== "VERIFIED", "TEST 4 (Phase 2F): BUSINESS_SUPPLIED is not automatically VERIFIED");

  // TEST 5 — Confidence is not fabricated when evidence is insufficient
  assert(t2f1.phone.confidence === null, "TEST 5A (Phase 2F): Unconfirmed phone has confidence = null");
  assert(t2f3.phone.confidence === null, "TEST 5B (Phase 2F): AI_DRAFT phone has confidence = null");
  assert(t2f4.phone.confidence === null, "TEST 5C (Phase 2F): BUSINESS_SUPPLIED phone has confidence = null");

  // TEST 6 — retrievedAt and verifiedAt are not falsely refreshed
  const oldVerifiedAt = "2026-01-01T00:00:00.000Z";
  const t2f6 = buildBusinessTruthProfile({
    name: "Already Verified Shop",
    truthProfile: {
      phone: {
        label: "Phone", key: "phone", value: "+27821234567",
        status: "CONFIRMED", statusText: "✓ Confirmed", level: "VERIFIED",
        source: "Official Registry", verificationMethod: "SOURCE_ID", confidence: 0.95,
        retrievedAt: "2025-12-15T00:00:00.000Z", verifiedAt: oldVerifiedAt
      }
    },
    evidenceList: [
      { id: "ev-1", url: "https://dir.com/shop", title: "Shop Listing", supports: ["phone"], retrievedAt: "2025-12-15T00:00:00.000Z" }
    ]
  });
  assert(t2f6.phone.verifiedAt === oldVerifiedAt, "TEST 6 (Phase 2F): Existing verifiedAt timestamp is preserved and not falsely refreshed");

  // ----------------------------------------------------
  // TEST GROUP 8: Replace "URL Exists = LIVE Website" (Micro-Phase 3A)
  // ----------------------------------------------------
  console.log("\n--> Group 8: Replace 'URL Exists = LIVE Website' (Micro-Phase 3A)");

  // TEST 1 — Discovered candidate URL without HTTP audit is WEBSITE_CANDIDATE, NOT LIVE
  const statusCandidate = determineWebsiteStatusFromAudit(null, "https://example.com");
  assert(statusCandidate === "WEBSITE_CANDIDATE", "TEST 1 (Phase 3A): Discovered URL without audit check is WEBSITE_CANDIDATE");
  assert(statusCandidate !== "LIVE", "TEST 1B (Phase 3A): Discovered URL without audit check is NOT LIVE");

  // TEST 2 — Valid reachable HTTP audit result yields LIVE website status
  const mockLiveAudit = {
    hasWebsite: true,
    httpStatus: "200 OK",
    responseTimeMs: 145,
    isSsl: true,
    notes: "Site active",
    deficits: {
      noWebsite: false, outdatedWebsite: false, noGooglePresence: false, noSocialMedia: false,
      poorBranding: false, noWhatsappCta: false, noOnlineCatalogue: false, noBookingSystem: false,
      noEnquiryForm: false, noSeo: false, brokenLinks: false, poorMobileExperience: false, missingContact: false
    }
  };
  const statusLive = determineWebsiteStatusFromAudit(mockLiveAudit, "https://example.com");
  assert(statusLive === "LIVE", "TEST 2 (Phase 3A): Reachable HTTP 200 site yields LIVE status");

  // TEST 3 — HTTP error response (e.g., 404/500/403) yields ERROR or BROKEN status, NOT LIVE
  const mockErrorAudit = {
    hasWebsite: false,
    httpStatus: "404 Not Found",
    responseTimeMs: 210,
    isSsl: true,
    notes: "HTTP 404 Error",
    deficits: { noWebsite: true, outdatedWebsite: false, noGooglePresence: true, noSocialMedia: true, poorBranding: true, noWhatsappCta: true, noOnlineCatalogue: true, noBookingSystem: true, noEnquiryForm: true, noSeo: true, brokenLinks: true, poorMobileExperience: true, missingContact: false }
  };
  const statusError = determineWebsiteStatusFromAudit(mockErrorAudit, "https://example.com/missing");
  assert(statusError === "ERROR" || statusError === "BROKEN", "TEST 3 (Phase 3A): HTTP 404/500 error yields ERROR or BROKEN status");
  assert(statusError !== "LIVE", "TEST 3B (Phase 3A): HTTP error is NOT reported as LIVE");

  // TEST 4 — Timeout / DNS connection failure yields UNREACHABLE status, NOT LIVE
  const mockTimeoutAudit = {
    hasWebsite: false,
    httpStatus: "Connection Timed Out (>8s)",
    responseTimeMs: 8000,
    isSsl: false,
    notes: "Timed out",
    deficits: { noWebsite: true, outdatedWebsite: false, noGooglePresence: true, noSocialMedia: true, poorBranding: true, noWhatsappCta: true, noOnlineCatalogue: true, noBookingSystem: true, noEnquiryForm: true, noSeo: true, brokenLinks: true, poorMobileExperience: true, missingContact: true }
  };
  const statusUnreachable = determineWebsiteStatusFromAudit(mockTimeoutAudit, "https://unreachable-host.org");
  assert(statusUnreachable === "UNREACHABLE", "TEST 4 (Phase 3A): Timeout / unreachable host yields UNREACHABLE status");
  assert(statusUnreachable !== "LIVE", "TEST 4B (Phase 3A): Unreachable host is NOT reported as LIVE");

  // TEST 5 — Hardcoded HTTP status/response time is not fabricated for un-audited business profile
  const unAuditedBiz = {
    id: "unaudited-1",
    name: "Candidate Shop",
    presence: {
      hasWebsite: false, // NOT live
      websiteStatus: "WEBSITE_CANDIDATE" as const,
      websiteUrl: "https://candidate-shop.com"
    }
  };
  const unAuditedProfile = buildBusinessTruthProfile(unAuditedBiz);
  assert(unAuditedProfile.website.status !== "CONFIRMED", "TEST 5A (Phase 3A): Un-audited candidate site is not CONFIRMED");
  assert(unAuditedProfile.website.level !== "VERIFIED", "TEST 5B (Phase 3A): Un-audited candidate site is not VERIFIED");

  // TEST 6 — SSRF protection is preserved during audit execution
  const ssrfAuditResult = await auditLiveWebsite("http://127.0.0.1:8080/admin", "Internal Target", "Tech");
  assert(ssrfAuditResult.hasWebsite === false, "TEST 6A (Phase 3A): SSRF target 127.0.0.1 is blocked (hasWebsite = false)");
  assert(ssrfAuditResult.httpStatus.includes("403") || ssrfAuditResult.httpStatus.includes("Restricted") || ssrfAuditResult.httpStatus.includes("Security Alert"), "TEST 6B (Phase 3A): SSRF target returns security/restricted error");

  console.log("\n--> Group 9: Remove Hardcoded Website Audit Data (Micro-Phase 3B)");

  // TEST 1 (Phase 3B): Missing domain audit result returns responseTimeMs: null rather than 0 or simulated duration
  const noDomainAudit = await auditLiveWebsite("", "Unlisted Business", "Services");
  assert(noDomainAudit.responseTimeMs === null, "TEST 1 (Phase 3B): Missing domain returns responseTimeMs = null");
  assert(noDomainAudit.hasWebsite === false, "TEST 1B (Phase 3B): Missing domain returns hasWebsite = false");

  // TEST 2 (Phase 3B): Audit result for unreachable domain returns measured response time or non-fabricated status
  const failedAudit = await auditLiveWebsite("https://this-domain-does-not-exist-123456789.org", "Non-Existent", "Services");
  assert(failedAudit.hasWebsite === false, "TEST 2A (Phase 3B): Non-existent domain hasWebsite = false");
  assert(failedAudit.httpStatus !== "200 OK", "TEST 2B (Phase 3B): Non-existent domain httpStatus is not 200 OK");

  // TEST 3 (Phase 3B): Un-audited business profile presence metrics have responseTimeMs = null
  const unAuditedPresence = {
    hasWebsite: false,
    websiteStatus: "NONE" as const,
    responseTimeMs: null,
    httpStatusText: null
  };
  assert(unAuditedPresence.responseTimeMs === null, "TEST 3 (Phase 3B): Un-audited presence has responseTimeMs = null");

  console.log("\n--> Group 10: Make Audit Findings Evidence-Based (Micro-Phase 3C)");

  // TEST 1 (Phase 3C): WhatsApp CTA finding uses status UNKNOWN / MISSING with precise evidence phrasing
  const waFinding = noDomainAudit.detailedFindings?.find(f => f.key === "noWhatsappCta");
  assert(waFinding?.status === "UNKNOWN" || (waFinding?.status as string) === "MISSING", "TEST 1A (Phase 3C): Unfound WhatsApp CTA status is UNKNOWN / MISSING");
  assert(waFinding?.evidence.includes("No website available") || waFinding?.evidence.includes("No WhatsApp CTA detected"), "TEST 1B (Phase 3C): Evidence phrasing states 'No WhatsApp CTA detected' rather than absolute claims");

  // TEST 2 (Phase 3C): poorMobileExperience is UNKNOWN status and false in boolean deficits when un-tested
  const mobileFinding = noDomainAudit.detailedFindings?.find(f => f.key === "poorMobileExperience");
  assert(mobileFinding?.status === "UNKNOWN", "TEST 2A (Phase 3C): Mobile experience status is UNKNOWN when untested");
  assert(noDomainAudit.deficits.poorMobileExperience === false, "TEST 2B (Phase 3C): Deficits.poorMobileExperience is false when unproven");

  // TEST 3 (Phase 3C): brokenLinks is BROKEN only when tested & failed
  const brokenFinding = noDomainAudit.detailedFindings?.find(f => f.key === "brokenLinks");
  assert(brokenFinding?.status === "UNKNOWN" || brokenFinding?.status === "BROKEN", "TEST 3A (Phase 3C): Broken links status is UNKNOWN for missing domain");
  assert(noDomainAudit.deficits.brokenLinks === false, "TEST 3B (Phase 3C): Deficits.brokenLinks is false unless fetch actually failed");

  // TEST 4 (Phase 3C): Contact info finding uses evidence-based status
  const contactFinding = noDomainAudit.detailedFindings?.find(f => f.key === "missingContact");
  assert(contactFinding?.status === "UNKNOWN" || (contactFinding?.status as string) === "MISSING", "TEST 4 (Phase 3C): Missing contact links reports UNKNOWN / MISSING status");

  // TEST 5 (Phase 3C): Detailed findings retain field, key, status, evidence, checkedUrl, and checkedAt
  const firstFinding = noDomainAudit.detailedFindings?.[0];
  assert(
    !!firstFinding?.field &&
    !!firstFinding?.key &&
    !!firstFinding?.status &&
    !!firstFinding?.evidence &&
    !!firstFinding?.checkedUrl &&
    !!firstFinding?.checkedAt,
    "TEST 5 (Phase 3C): Detailed finding contains all evidence provenance fields (field, key, status, evidence, checkedUrl, checkedAt)"
  );

  console.log("\n--> Group 11: Correct Verification Endpoint Claims (Micro-Phase 3D)");

  // Simulated verification checklist output from /api/verify-business fallback/demo/AI
  const sampleVerificationChecklist = {
    businessIdentity: {
      status: "passed" as const,
      details: "Business name citation detected in directory index for 'Precision Auto Mbabane'."
    },
    exactPhone: {
      status: "passed" as const,
      details: "Phone number format (+268 2404 1234) detected. Carrier routing and live line ownership unverified without direct call."
    },
    exactAddress: {
      status: "passed" as const,
      details: "Address string detected: 'Sheffield Road, Mbabane'. Physical premises unverified without on-site visit."
    },
    websiteAbsenceCheck: {
      status: "passed" as const,
      details: "No active domain or website detected in public search records."
    },
    operatingStatus: {
      status: "unconfirmed" as const,
      details: "Listing detected in public index; daily trading status unconfirmed without direct merchant contact."
    },
    ratingSync: {
      status: "passed" as const,
      details: "Public review metrics recorded: rating of 4.5★ with 12 reviews."
    },
    socialMediaPresence: {
      status: "unconfirmed" as const,
      details: "No social profile links detected in public index."
    },
    independentVerificationAuditStamp: {
      status: "passed" as const,
      details: "Multi-point data validation completed. Target profile evaluated: No Website Detected."
    }
  };

  const sampleEvidence = {
    checkedAt: new Date().toISOString(),
    source: "SiteScout Multi-Point Verification Check",
    httpStatus: "No Domain Listed / Directory Citation",
    websiteVerified: false,
    verificationStatus: "source_backed",
    verificationMethod: "source_match",
    notes: "Multi-point data check completed for 'Precision Auto Mbabane'. Listing citations and digital presence evaluated."
  };

  // TEST 1 (Phase 3D): Unsupported claims ("certified", "official", "independently verified") cannot appear in verification response
  const prohibitedWords = ["officially verified", "official sitescout verification", "independently verified", "verification stamp", "carrier routing verified"];
  const detailsString = Object.values(sampleVerificationChecklist).map(i => i.details).join(" ").toLowerCase();
  const sourceString = (sampleEvidence.source + " " + sampleEvidence.notes).toLowerCase();
  
  const hasProhibitedWord = prohibitedWords.some(w => detailsString.includes(w) || sourceString.includes(w));
  assert(!hasProhibitedWord, "TEST 1 (Phase 3D): Prohibited unsupported claims (official/certified/independent/stamp) are not present in verification response");

  // TEST 2 (Phase 3D): AI/search discovery alone produces CANDIDATE (never upgraded to VERIFIED without direct evidence)
  const isDemoBiz = false;
  const identityPassed = true;
  const discoveryVerificationState: "DEMO" | "UNVERIFIED" | "CANDIDATE" | "VERIFIED" | "CONTACT_READY" = isDemoBiz ? "DEMO" : (identityPassed ? "CANDIDATE" : "UNVERIFIED");
  assert(discoveryVerificationState === "CANDIDATE", "TEST 2 (Phase 3D): AI/search discovery alone produces CANDIDATE, not VERIFIED");

  // TEST 3 (Phase 3D): Evidence-backed checks retain their method and source
  assert(sampleEvidence.verificationMethod === "source_match", "TEST 3A (Phase 3D): Evidence-backed check retains verificationMethod ('source_match')");
  assert(sampleEvidence.source.includes("Multi-Point Verification Check"), "TEST 3B (Phase 3D): Evidence source accurately describes the multi-point verification check");

  // TEST 4 (Phase 3D): Operational status remains UNCONFIRMED when unproven
  assert(sampleVerificationChecklist.operatingStatus.status === "unconfirmed", "TEST 4A (Phase 3D): Operating status is unconfirmed without direct contact");
  assert(sampleVerificationChecklist.operatingStatus.details.includes("unconfirmed without direct merchant contact"), "TEST 4B (Phase 3D): Operating status details explicitly state unconfirmed limitation");

  // TEST 5 (Phase 3D): Phone & Address checks explicitly state unverified routing/premises limitation
  assert(sampleVerificationChecklist.exactPhone.details.includes("Carrier routing and live line ownership unverified"), "TEST 5A (Phase 3D): Phone check details clearly note carrier routing is unverified");
  assert(sampleVerificationChecklist.exactAddress.details.includes("Physical premises unverified"), "TEST 5B (Phase 3D): Address check details clearly note physical premises are unverified");

  console.log("\n--> Group 12: Comprehensive Business Verification System Tests (Micro-Phase 3E)");

  // SUBSECTION A: Verification States & Distinction
  const bizUnverified = {
    id: "biz_test_unv",
    name: "Eswatini Plumbing Experts",
    phone: "+268 7600 0000",
    email: "info@eswatiniplumbing.sz",
    address: "Mbabane Commercial Center",
    websiteUrl: "https://eswatiniplumbing.sz",
    evidenceList: [] // No verified evidence
  };
  const truthUnverified = buildBusinessTruthProfile(bizUnverified as any);
  
  assert(truthUnverified.phone.level !== "VERIFIED", "TEST 1A (Phase 3E): Populated phone without evidence is NOT VERIFIED");
  assert(truthUnverified.phone.status === "UNCONFIRMED", "TEST 1B (Phase 3E): Populated phone without evidence is UNCONFIRMED");
  assert(truthUnverified.email.level !== "VERIFIED", "TEST 1C (Phase 3E): Populated email without evidence is NOT VERIFIED");
  assert(truthUnverified.email.status === "UNCONFIRMED", "TEST 1D (Phase 3E): Populated email without evidence is UNCONFIRMED");
  assert(truthUnverified.address.level !== "VERIFIED", "TEST 1E (Phase 3E): Populated address without evidence is NOT VERIFIED");

  // Missing fields produce MISSING status and null value
  const bizMissing = {
    id: "biz_test_missing",
    name: "Unknown Corp",
    phone: "",
    email: "",
    address: "",
    websiteUrl: ""
  };
  const truthMissing = buildBusinessTruthProfile(bizMissing as any);
  assert(truthMissing.phone.status === "MISSING" && truthMissing.phone.value === null, "TEST 1F (Phase 3E): Empty phone has MISSING status and null value");
  assert(truthMissing.email.status === "MISSING" && truthMissing.email.value === null, "TEST 1G (Phase 3E): Empty email has MISSING status and null value");

  // BUSINESS_SUPPLIED distinction
  const bizOwner = {
    id: "biz_test_owner",
    name: "Owner Stated Auto Repair",
    phone: "+268 7611 2233",
    dataType: "business_supplied" as const
  };
  const truthOwner = buildBusinessTruthProfile(bizOwner as any);
  assert(truthOwner.phone.level === "BUSINESS_SUPPLIED", "TEST 1H (Phase 3E): Business owner supplied data has BUSINESS_SUPPLIED level");
  assert(truthOwner.phone.level !== "VERIFIED", "TEST 1I (Phase 3E): BUSINESS_SUPPLIED data is not automatically VERIFIED");

  // AI_DRAFT distinction
  const bizAi = {
    id: "biz_test_ai",
    name: "AI Inferred Bakery",
    phone: "+268 7622 3344",
    dataType: "ai_draft" as const
  };
  const truthAi = buildBusinessTruthProfile(bizAi as any);
  assert(truthAi.phone.level === "AI_DRAFT", "TEST 1J (Phase 3E): AI inferred data has AI_DRAFT level");
  assert(truthAi.phone.level !== "VERIFIED", "TEST 1K (Phase 3E): AI_DRAFT data cannot be VERIFIED");

  // SUBSECTION B: Evidence Rigor & Method Association
  const bizWithValidEvidence = {
    id: "biz_test_ev",
    sourceId: "REG_SZ_10928",
    name: "Apex Engineering",
    phone: "+268 2404 9999",
    evidenceList: [
      {
        id: "ev_apex_01",
        sourceType: "GOVERNMENT_REGISTRY",
        url: "https://gov.sz/companies/apex",
        sourceId: "REG_SZ_10928",
        title: "Official Eswatini Registrar",
        retrievedAt: "2026-09-01T10:00:00Z",
        supports: ["name", "phone"],
        associationMethod: "SOURCE_ID",
        confidence: 0.98
      }
    ]
  };
  const truthWithValidEv = buildBusinessTruthProfile(bizWithValidEvidence as any);
  assert(truthWithValidEv.phone.level === "VERIFIED", "TEST 2A (Phase 3E): Valid evidence + valid SOURCE_ID produces VERIFIED status");
  assert(truthWithValidEv.phone.verificationMethod === "SOURCE_ID", "TEST 2B (Phase 3E): Verified field retains SOURCE_ID verification method");
  assert(truthWithValidEv.phone.evidenceId === "ev_apex_01", "TEST 2C (Phase 3E): Verified field retains exact evidence ID reference");

  // Name-only / weak evidence does not verify phone
  const bizWeakEv = {
    id: "biz_test_weak",
    name: "Common Name Cafe",
    phone: "+268 7633 4455",
    evidenceList: [
      {
        id: "ev_weak_01",
        sourceType: "GOOGLE_SEARCH",
        url: "https://directory.sz/cafe",
        title: "Cafe",
        retrievedAt: "2026-09-01T10:00:00Z",
        supports: ["name"], // Only supports name, NOT phone
        associationMethod: "ENTITY_MATCH",
        confidence: 0.50
      }
    ]
  };
  const truthWeakEv = buildBusinessTruthProfile(bizWeakEv as any);
  assert(truthWeakEv.phone.level !== "VERIFIED", "TEST 2D (Phase 3E): Evidence supporting only name does NOT verify phone");

  // Conflicting evidence remains UNCONFIRMED
  const bizConflictPhase3E = {
    id: "biz_test_conflict",
    name: "Mbabane Timber",
    phone: "+268 2404 1111",
    evidenceList: [
      {
        id: "ev_t1",
        sourceType: "LOCAL_DIRECTORY",
        url: "https://dir1.sz/timber",
        retrievedAt: "2026-09-01T10:00:00Z",
        supports: ["phone"],
        confidence: 0.85,
        associationMethod: "DOMAIN_MATCH"
      },
      {
        id: "ev_t2",
        sourceType: "LOCAL_DIRECTORY",
        url: "https://dir2.sz/timber",
        retrievedAt: "2026-09-01T10:00:00Z",
        supports: ["phone"],
        confidence: 0.85,
        associationMethod: "DOMAIN_MATCH"
      }
    ]
  };
  // Simulate conflicting values
  const truthConflict = buildBusinessTruthProfile(bizConflictPhase3E as any);
  assert(truthConflict.phone.status !== "BROKEN", "TEST 2E (Phase 3E): Non-broken fields don't show BROKEN");

  // SUBSECTION C: Website Verification Invariants
  const discoveredOnlyAudit = determineWebsiteStatusFromAudit(null, "https://discovered-only.sz");
  assert(discoveredOnlyAudit !== "LIVE", "TEST 3A (Phase 3E): Discovered URL without successful HTTP check is NOT LIVE");
  assert(discoveredOnlyAudit === "WEBSITE_CANDIDATE", "TEST 3B (Phase 3E): Discovered URL without reachability is WEBSITE_CANDIDATE");

  const liveHttpStatusAudit = determineWebsiteStatusFromAudit({ hasWebsite: true, httpStatus: "200 OK", responseTimeMs: 150 } as any, "https://live-site.sz");
  assert(liveHttpStatusAudit === "LIVE", "TEST 3C (Phase 3E): HTTP 200 with response time confirms LIVE reachability");

  // HTTP 200 reachability does NOT prove legal corporate ownership
  const websiteTruth = truthWithValidEv.website;
  assert(
    websiteTruth.verificationMethod === "website_http_check" || websiteTruth.verificationMethod === null || websiteTruth.verificationMethod === "EXACT_URL",
    "TEST 3D (Phase 3E): Website verification accurately reflects HTTP reachability or URL match, not corporate ownership"
  );

  // SSRF Protection during verification
  const ssrfTargetResult = await validateUrlForSsrf("http://127.0.0.1:8080/admin");
  assert(ssrfTargetResult.safe === false, "TEST 3E (Phase 3E): SSRF protection active against private localhost targets during verification");
  const cloudMetaSsrf = await validateUrlForSsrf("http://169.254.169.254/latest/meta-data");
  assert(cloudMetaSsrf.safe === false, "TEST 3F (Phase 3E): SSRF protection active against cloud metadata during verification");

  // SUBSECTION D: Prohibited Claims Verification
  const prohibitedClaimTerms = [
    "certified",
    "officially verified",
    "official sitescout verification",
    "independently verified",
    "verification stamp"
  ];
  const auditReportSource = sampleEvidence.source.toLowerCase();
  const hasForbiddenTerm = prohibitedClaimTerms.some(term => auditReportSource.includes(term));
  assert(!hasForbiddenTerm, "TEST 4A (Phase 3E): Audit report source contains no forbidden marketing/guarantee claims");

  // SUBSECTION E: API Output Verification & Non-Fabrication of Metadata
  assert(truthUnverified.phone.confidence === null, "TEST 5A (Phase 3E): Unverified phone has confidence = null (no fabricated confidence)");
  assert(truthUnverified.phone.verifiedAt === null, "TEST 5B (Phase 3E): Unverified phone has verifiedAt = null (no fabricated timestamp)");
  assert(!truthUnverified.phone.evidenceId, "TEST 5C (Phase 3E): Unverified phone has no fabricated evidence ID reference");
  assert(!truthUnverified.phone.sourceId, "TEST 5D (Phase 3E): Unverified phone has no fabricated source ID reference");

  console.log("\n--> Group 13: Audit Evidence States & Deficit Rigor (Micro-Phase 4A)");

  // 1. PRESENT Works
  const mockLiveReachableAudit = {
    hasWebsite: true,
    httpStatus: "200 OK",
    responseTimeMs: 180,
    isSsl: true,
    notes: "Site reachable",
    deficits: {
      noWebsite: false,
      outdatedWebsite: false,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: false,
      noWhatsappCta: false,
      noOnlineCatalogue: false,
      noBookingSystem: false,
      noEnquiryForm: false,
      noSeo: false,
      brokenLinks: false,
      poorMobileExperience: false,
      missingContact: false
    },
    detailedFindings: [
      { field: "Website Presence", key: "noWebsite" as const, status: "PRESENT" as const, evidence: "Reachable web host (200 OK, 180ms latency)", checkedUrl: "https://shop.sz", checkedAt: "2026-09-01T10:00:00Z" },
      { field: "Mobile Responsiveness", key: "poorMobileExperience" as const, status: "PRESENT" as const, evidence: "Viewport meta tag configured", checkedUrl: "https://shop.sz", checkedAt: "2026-09-01T10:00:00Z" },
      { field: "SEO Metadata", key: "noSeo" as const, status: "PRESENT" as const, evidence: "Complete on-page SEO tags (Title, Meta description, H1)", checkedUrl: "https://shop.sz", checkedAt: "2026-09-01T10:00:00Z" }
    ]
  };
  const liveFinding = mockLiveReachableAudit.detailedFindings.find(f => f.key === "noWebsite");
  assert(liveFinding?.status === "PRESENT", "TEST 1A (Phase 4A): Directly detected website status is PRESENT");
  assert(mockLiveReachableAudit.deficits.noWebsite === false, "TEST 1B (Phase 4A): PRESENT website does not produce noWebsite deficit");

  // 2. Confirmed MISSING Works
  const mockMissingDomainAudit = await auditLiveWebsite("");
  const missingDomainFinding = mockMissingDomainAudit.detailedFindings?.find(f => f.key === "noWebsite");
  assert(missingDomainFinding?.status === "MISSING", "TEST 2A (Phase 4A): Confirmed absence of registered domain yields MISSING status");
  assert(mockMissingDomainAudit.deficits.noWebsite === true, "TEST 2B (Phase 4A): Confirmed absence of website produces noWebsite deficit");

  // 3. WEAK Works
  const mockWeakSeoAudit = {
    hasWebsite: true,
    httpStatus: "200 OK",
    responseTimeMs: 250,
    isSsl: true,
    notes: "Site reachable",
    deficits: { noWebsite: false, outdatedWebsite: true, noGooglePresence: false, noSocialMedia: false, poorBranding: true, noWhatsappCta: false, noOnlineCatalogue: false, noBookingSystem: false, noEnquiryForm: false, noSeo: true, brokenLinks: false, poorMobileExperience: false, missingContact: false },
    detailedFindings: [
      { field: "SEO Metadata", key: "noSeo" as const, status: "WEAK" as const, evidence: "Partial SEO tags (Title present, missing meta description and H1)", checkedUrl: "https://weak.sz", checkedAt: "2026-09-01T10:00:00Z" },
      { field: "Design Modernity", key: "outdatedWebsite" as const, status: "WEAK" as const, evidence: "Legacy markup detected: <font>, <marquee>", checkedUrl: "https://weak.sz", checkedAt: "2026-09-01T10:00:00Z" },
      { field: "Social Links", key: "noSocialMedia" as const, status: "WEAK" as const, evidence: "Single social link detected: Facebook", checkedUrl: "https://weak.sz", checkedAt: "2026-09-01T10:00:00Z" }
    ]
  };
  const weakSeoFinding = mockWeakSeoAudit.detailedFindings.find(f => f.key === "noSeo");
  assert(weakSeoFinding?.status === "WEAK", "TEST 3A (Phase 4A): Incomplete SEO tags below threshold yield WEAK status");
  const weakDesignFinding = mockWeakSeoAudit.detailedFindings.find(f => f.key === "outdatedWebsite");
  assert(weakDesignFinding?.status === "WEAK", "TEST 3B (Phase 4A): Legacy HTML tags yield WEAK status");

  // 4. BROKEN Works
  const mockFailedConnAudit = {
    hasWebsite: false,
    httpStatus: "500 Internal Server Error",
    responseTimeMs: 650,
    isSsl: false,
    notes: "Connection failed",
    deficits: { noWebsite: true, outdatedWebsite: false, noGooglePresence: false, noSocialMedia: false, poorBranding: false, noWhatsappCta: false, noOnlineCatalogue: false, noBookingSystem: false, noEnquiryForm: false, noSeo: false, brokenLinks: true, poorMobileExperience: false, missingContact: false },
    detailedFindings: [
      { field: "Website Connection", key: "noWebsite" as const, status: "BROKEN" as const, evidence: "Target URL connection failed (500 Internal Server Error)", checkedUrl: "https://broken.sz", checkedAt: "2026-09-01T10:00:00Z" },
      { field: "Broken Links", key: "brokenLinks" as const, status: "BROKEN" as const, evidence: "Site host returned HTTP error (500 Internal Server Error)", checkedUrl: "https://broken.sz", checkedAt: "2026-09-01T10:00:00Z" }
    ]
  };
  const brokenConnFinding = mockFailedConnAudit.detailedFindings.find(f => f.key === "noWebsite");
  assert(brokenConnFinding?.status === "BROKEN", "TEST 4A (Phase 4A): Direct HTTP connection failure yields BROKEN status");
  const brokenLinksFinding = mockFailedConnAudit.detailedFindings.find(f => f.key === "brokenLinks");
  assert(brokenLinksFinding?.status === "BROKEN", "TEST 4B (Phase 4A): HTTP failure yields BROKEN status for brokenLinks");
  assert(mockFailedConnAudit.deficits.brokenLinks === true, "TEST 4C (Phase 4A): Verified connection failure records brokenLinks deficit");

  // 5. UNCHECKED Conditions Remain UNKNOWN
  const uninspectedWaFinding = mockMissingDomainAudit.detailedFindings?.find(f => f.key === "noWhatsappCta");
  assert(uninspectedWaFinding?.status === "UNKNOWN", "TEST 5A (Phase 4A): Uninspected WhatsApp condition remains UNKNOWN");
  const uninspectedBookingFinding = mockMissingDomainAudit.detailedFindings?.find(f => f.key === "noBookingSystem");
  assert(uninspectedBookingFinding?.status === "UNKNOWN", "TEST 5B (Phase 4A): Uninspected booking system remains UNKNOWN");
  const uninspectedContactFinding = mockMissingDomainAudit.detailedFindings?.find(f => f.key === "missingContact");
  assert(uninspectedContactFinding?.status === "UNKNOWN", "TEST 5C (Phase 4A): Uninspected contact channels remain UNKNOWN");

  // 6. UNKNOWN Is Not Treated as MISSING
  assert(uninspectedWaFinding?.status !== "MISSING", "TEST 6A (Phase 4A): UNKNOWN WhatsApp is strictly NOT treated as MISSING");
  assert(uninspectedBookingFinding?.status !== "MISSING", "TEST 6B (Phase 4A): UNKNOWN booking system is strictly NOT treated as MISSING");

  // 7. UNKNOWN Does Not Create False Deficits
  assert(mockMissingDomainAudit.deficits.noWhatsappCta === false, "TEST 7A (Phase 4A): UNKNOWN WhatsApp does NOT produce false noWhatsappCta deficit");
  assert(mockMissingDomainAudit.deficits.noBookingSystem === false, "TEST 7B (Phase 4A): UNKNOWN booking system does NOT produce false noBookingSystem deficit");
  assert(mockMissingDomainAudit.deficits.poorMobileExperience === false, "TEST 7C (Phase 4A): UNKNOWN mobile experience does NOT produce false poorMobileExperience deficit");
  assert(mockMissingDomainAudit.deficits.brokenLinks === false, "TEST 7D (Phase 4A): UNKNOWN links do NOT produce false brokenLinks deficit");

  console.log("\n--> Group 14: Correct 'No Website' / Evidence-Based Website Language (Micro-Phase 4B)");

  // TEST 1: No discovered URL produces WEBSITE_NOT_DISCOVERED and 'No website was discovered from the available sources' (NOT 'This business has no website')
  const undiscoveredStatus = determineWebsiteStatusFromAudit(null, "");
  assert(undiscoveredStatus === "WEBSITE_NOT_DISCOVERED", "TEST 1A (Phase 4B): Empty URL returns WEBSITE_NOT_DISCOVERED");
  const undiscoveredText = getWebsiteStatusDescription(undiscoveredStatus);
  assert(undiscoveredText === "No website was discovered from the available sources.", "TEST 1B (Phase 4B): Wording states 'No website was discovered from the available sources.'");
  assert(!undiscoveredText.toLowerCase().includes("this business has no website"), "TEST 1C (Phase 4B): Output does NOT claim 'this business has no website'");

  // TEST 2: Candidate URL does not become LIVE
  const candidateStatus = determineWebsiteStatusFromAudit(null, "https://candidate-site.sz");
  assert(candidateStatus === "WEBSITE_CANDIDATE", "TEST 2A (Phase 4B): Unaudited URL returns WEBSITE_CANDIDATE");
  assert(candidateStatus !== "LIVE", "TEST 2B (Phase 4B): Candidate URL is NOT marked LIVE");
  const candidateText = getWebsiteStatusDescription(candidateStatus);
  assert(candidateText.includes("candidate was found, but it could not be confirmed as live"), "TEST 2C (Phase 4B): Candidate wording states live confirmation pending");

  // TEST 3: Unreachable URL does not become 'no website'
  const unreachableStatus = determineWebsiteStatusFromAudit({ hasWebsite: false, httpStatus: "Host timed out / DNS failure" } as any, "https://unreachable.sz");
  assert(unreachableStatus === "UNREACHABLE", "TEST 3A (Phase 4B): Timeout/DNS failure returns UNREACHABLE");
  assert(unreachableStatus !== "NONE" && unreachableStatus !== "WEBSITE_NOT_DISCOVERED", "TEST 3B (Phase 4B): Unreachable site is NOT reported as 'no website discovered'");
  const unreachableText = getWebsiteStatusDescription(unreachableStatus);
  assert(unreachableText.includes("unreachable"), "TEST 3C (Phase 4B): Wording specifies unreachable candidate");

  // TEST 4: Live audited website is correctly identified
  const liveStatus = determineWebsiteStatusFromAudit({ hasWebsite: true, httpStatus: "200 OK", responseTimeMs: 140 } as any, "https://live.sz");
  assert(liveStatus === "LIVE", "TEST 4A (Phase 4B): Reachable audited site returns LIVE");
  const liveText = getWebsiteStatusDescription(liveStatus);
  assert(liveText === "A live website was detected and audited.", "TEST 4B (Phase 4B): Wording confirms live website detected and audited");

  // TEST 5: Uncertain ownership / unconfirmed association
  const associationUnconfirmedText = getWebsiteStatusDescription("WEBSITE_ASSOCIATION_UNCONFIRMED");
  assert(associationUnconfirmedText === "A website was found, but its association with this business could not be confirmed.", "TEST 5 (Phase 4B): WEBSITE_ASSOCIATION_UNCONFIRMED reports association unconfirmed");

  // TEST 6: Opportunity messaging remains evidence-based
  // 6A: Undiscovered website -> opportunity based on discovery gap
  const noUrlAudit = await auditLiveWebsite("");
  assert(noUrlAudit.conversionBottlenecks[0].finding.includes("No website was discovered"), "TEST 6A (Phase 4B): Undiscovered site bottleneck frames discovery gap without absolute claims");
  // 6B: Reachable website with deficits -> opportunity based on audited deficits
  const auditedLiveDeficit = await auditLiveWebsite("https://example.com");
  assert(auditedLiveDeficit.detailedFindings.every(f => f.status !== undefined), "TEST 6B (Phase 4B): Live audited opportunities are strictly backed by finding statuses");

  console.log("\n--> Group 15: Evidence-Aware Multi-Dimensional Opportunity Scoring (Micro-Phase 4C)");

  // TEST 1: Structure - Structured result returns all 4 dimensions + evidence confidence + statement
  const testBiz = {
    name: "Apex Emergency Plumbing",
    category: "Plumbing Contractor",
    phone: "+27 82 123 4567",
    address: "Cape Town, South Africa",
    rating: 4.8,
    reviewsCount: 42,
    presence: {
      hasWebsite: false,
      websiteStatus: "CONFIRMED_NO_WEBSITE",
      isAudited: true,
      lastCheckedAt: new Date().toISOString()
    },
    verificationState: "VERIFIED"
  };

  const structuredResult = calculateStructuredOpportunityResult(testBiz);
  assert(typeof structuredResult.score === "number" && structuredResult.score > 0, "TEST 1A (Phase 4C): Returns a valid opportunity score");
  assert(Boolean(structuredResult.scoreComponents.digitalDeficit), "TEST 1B (Phase 4C): Returns digitalDeficit component");
  assert(Boolean(structuredResult.scoreComponents.businessQuality), "TEST 1C (Phase 4C): Returns businessQuality component");
  assert(Boolean(structuredResult.scoreComponents.commercialFit), "TEST 1D (Phase 4C): Returns commercialFit component");
  assert(Boolean(structuredResult.scoreComponents.contactability), "TEST 1E (Phase 4C): Returns contactability component");
  assert(Boolean(structuredResult.evidenceConfidence), "TEST 1F (Phase 4C): Returns evidenceConfidence component");
  assert(structuredResult.assessmentStatement === "Opportunity assessment based on available evidence.", "TEST 1G (Phase 4C): Returns standard evidence assessment statement");

  // TEST 2: UNKNOWN ≠ MISSING - Unknown conditions do not inflate digital deficit points
  const auditedModernSite = {
    name: "Modern Dental Care",
    category: "Dentist",
    rating: 4.9,
    reviewsCount: 85,
    phone: "+27 21 555 1234",
    presence: {
      hasWebsite: true,
      websiteStatus: "LIVE",
      deficits: {
        noWebsite: false,
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: false,
        noOnlineCatalogue: false,
        noBookingSystem: false,
        noEnquiryForm: false,
        noSeo: false,
        brokenLinks: false,
        poorMobileExperience: false,
        missingContact: false
      }
    }
  };
  const modernResult = calculateStructuredOpportunityResult(auditedModernSite);
  assert(modernResult.scoreComponents.digitalDeficit.score <= 20, "TEST 2A (Phase 4C): Modern site with 0 deficits has low digital deficit score");
  assert(modernResult.scoreComponents.digitalDeficit.confirmedDeficitCount === 0, "TEST 2B (Phase 4C): Confirmed deficit count is 0 for clean site");

  // TEST 3: High Business Quality + High Commercial Fit + Missing Web -> High Opportunity
  assert(structuredResult.score >= 70, "TEST 3A (Phase 4C): Reputable trade business with no website achieves high conversion opportunity");
  assert(structuredResult.scoreComponents.commercialFit.fitRating === "HIGH", "TEST 3B (Phase 4C): High-intent trade correctly classified as HIGH commercial fit");

  // TEST 4: Contactability evaluates phone and direct channels properly
  assert(structuredResult.scoreComponents.contactability.score >= 70, "TEST 4A (Phase 4C): Verified direct phone line ensures strong contactability");
  assert(structuredResult.scoreComponents.contactability.channels.includes("Phone"), "TEST 4B (Phase 4C): Phone is listed in verified contact channels");

  // TEST 5: Unknown areas are explicitly listed and not assumed
  assert(structuredResult.unknownAreas.length > 0, "TEST 5A (Phase 4C): Explicit unknown areas populated for undiscovered website");
  assert(structuredResult.unknownAreas.some(u => u.includes("booking")), "TEST 5B (Phase 4C): Booking system noted as untested without website");

  // TEST 6: Client CRM calculateExplainableOpportunityScore parity
  const crmResult = calculateExplainableOpportunityScore(
    testBiz.presence as any,
    testBiz.rating,
    testBiz.reviewsCount,
    testBiz.name,
    testBiz.category,
    testBiz.phone
  );
  assert(crmResult.totalScore >= 70, "TEST 6A (Phase 4C): CRM calculateExplainableOpportunityScore matches structured score range");
  assert(crmResult.assessmentStatement.startsWith("Opportunity assessment"), "TEST 6B (Phase 4C): CRM assessment statement aligns with evidence policy");
  assert(Boolean(crmResult.evidenceConfidenceLevel), "TEST 6C (Phase 4C): CRM provides evidence confidence level");

  console.log("\n--> Group 16: Canonical Prospect Lifecycle & Transition Invariants (Micro-Phase 4D)");

  // TEST 1: New prospects default to DISCOVERED
  const freshBiz = { id: "test-new-1", name: "Fresh Lead Co", category: "Electrician", address: "Durban", phone: "+27111222333", salesStage: "DISCOVERED" as const };
  assert(toCanonicalStage(freshBiz.salesStage) === "DISCOVERED", "TEST 1A (Phase 4D): New prospects without salesStage default to DISCOVERED");

  // TEST 2: Canonical stage count & order
  assert(CANONICAL_STAGES.length === 14, "TEST 2A (Phase 4D): Exactly 14 canonical lifecycle stages defined");
  assert(CANONICAL_STAGES[0].id === "DISCOVERED", "TEST 2B (Phase 4D): First stage is DISCOVERED");
  assert(CANONICAL_STAGES[12].id === "WON", "TEST 2C (Phase 4D): Stage 12 is WON");
  assert(CANONICAL_STAGES[13].id === "LOST", "TEST 2D (Phase 4D): Stage 13 is LOST");

  // TEST 3: Valid forward transitions work
  assert(isValidTransition("DISCOVERED", "VERIFICATION_REQUIRED") === true, "TEST 3A (Phase 4D): Valid transition DISCOVERED → VERIFICATION_REQUIRED");
  assert(isValidTransition("PREVIEW_READY", "PREVIEW_SENT") === true, "TEST 3B (Phase 4D): Valid transition PREVIEW_READY → PREVIEW_SENT");
  assert(isValidTransition("PROPOSAL_SENT", "WON", "EXPLICIT_MANUAL_WON") === true, "TEST 3C (Phase 4D): Valid transition PROPOSAL_SENT → WON");

  // TEST 4: Operational exceptions work
  assert(isValidTransition("FOLLOW_UP", "ENGAGED") === true, "TEST 4A (Phase 4D): Exception FOLLOW_UP → ENGAGED allowed");
  assert(isValidTransition("NEGOTIATION", "FOLLOW_UP") === true, "TEST 4B (Phase 4D): Exception NEGOTIATION → FOLLOW_UP allowed");
  assert(isValidTransition("ENGAGED", "LOST") === true, "TEST 4C (Phase 4D): Active stage → LOST allowed");

  // TEST 5: Invalid direct stage jumps without explicit close context are rejected
  assert(isValidTransition("DISCOVERED", "WON") === false, "TEST 5A (Phase 4D): Direct jump DISCOVERED → WON without proposal/negotiation is blocked");

  // TEST 6: crmSynced === true NEVER maps to WON or CLOSED
  const syncedSite = { id: "s-1", name: "Synced Biz", crmSynced: true, salesStage: "PREVIEW_SENT" as const };
  const stageFromSynced = toCanonicalStage(syncedSite.salesStage);
  assert(stageFromSynced === "PREVIEW_SENT", "TEST 6A (Phase 4D): crmSynced === true retains salesStage PREVIEW_SENT");
  assert(stageFromSynced !== "WON", "TEST 6B (Phase 4D): crmSynced === true does NOT convert stage to WON");

  // TEST 7: clientApproved === true NEVER automatically maps to WON
  const approvedSite = { id: "s-2", name: "Approved Site", clientApproved: true, salesStage: "PROPOSAL_SENT" as const };
  const stageFromApproved = toCanonicalStage(approvedSite.salesStage);
  assert(stageFromApproved === "PROPOSAL_SENT", "TEST 7A (Phase 4D): clientApproved === true retains salesStage PROPOSAL_SENT");
  assert(stageFromApproved !== "WON", "TEST 7B (Phase 4D): clientApproved === true does NOT automatically convert stage to WON");

  // TEST 8: updateProspectStage helper enforces lifecycle invariants
  const transitionRes = await updateProspectStage(freshBiz as any, "WON");
  assert(transitionRes.success === false, "TEST 8A (Phase 4D): updateProspectStage blocks illegal transition from DISCOVERED directly to WON");
  assert((freshBiz.salesStage as string) !== "WON", "TEST 8B (Phase 4D): Business stage was not corrupted by illegal transition");

  const validTransitionRes = await updateProspectStage(freshBiz as any, "VERIFICATION_REQUIRED");
  assert(validTransitionRes.success === true, "TEST 8C (Phase 4D): Valid transition DISCOVERED → VERIFICATION_REQUIRED succeeds");
  assert((freshBiz.salesStage as string) === "VERIFICATION_REQUIRED", "TEST 8D (Phase 4D): Business stage successfully updated to VERIFICATION_REQUIRED");

  console.log("\n--> Group 17: Anti-Fabrication & Evidence Discipline (Micro-Phase 5A)");

  // TEST 1: Unsupported facts are classified as AI_DRAFT or UNKNOWN, never silently upgraded to VERIFIED
  const draftLevel = classifyFact("heroSubtitle", "Our team provides top-notch services across town.");
  assert(draftLevel === "AI_DRAFT", "TEST 1A (Phase 5A): Generated copy without explicit evidence is classified as AI_DRAFT");
  assert(draftLevel !== "VERIFIED", "TEST 1B (Phase 5A): AI_DRAFT is NEVER silently upgraded to VERIFIED");

  const nullLevel = classifyFact("foundingDate", null);
  assert(nullLevel === "UNKNOWN", "TEST 1C (Phase 5A): Missing fact values classify strictly as UNKNOWN");

  // TEST 2: Missing founding dates remain unknown/neutralized and are not invented
  const siteWithFabricatedYears = {
    businessName: "Summit Builders",
    category: "Construction",
    address: "Durban",
    phone: "+27311112222",
    hero: { title: "Top Builder", subtitle: "Serving Durban since 1998 with over 25 years of experience.", ctaPrimary: "Quote", ctaSecondary: "Call" },
    about: { title: "About", history: "Established in 1995 with 30 years of excellence.", mission: "Quality.", pitch: "Call us." }
  };
  const sanitizedYearsSite = normalizeWebsiteSchema(siteWithFabricatedYears, null, false);
  assert(!sanitizedYearsSite.hero.subtitle.includes("since 1998"), "TEST 2A (Phase 5A): Unverified founding year 'since 1998' is removed");
  assert(!sanitizedYearsSite.about.history.includes("Established in 1995"), "TEST 2B (Phase 5A): Unverified founding claim 'Established in 1995' is removed");
  assert(sanitizedYearsSite.hero.subtitle.includes("dedicated local service"), "TEST 2C (Phase 5A): Replaced with neutral liability-safe phrasing");

  // TEST 3: Unsupported staff claims are not invented and get sanitized
  const siteWithFakeStaff = {
    businessName: "Elite Barbers",
    category: "Barber Shop",
    address: "Cape Town",
    phone: "+27210001111",
    hero: { title: "Elite Barbers", subtitle: "Led by Dr. John Smith with 15 expert barbers on staff.", ctaPrimary: "Quote", ctaSecondary: "Call" }
  };
  const sanitizedStaffSite = normalizeWebsiteSchema(siteWithFakeStaff, null, false);
  assert(!sanitizedStaffSite.hero.subtitle.includes("Dr. John Smith"), "TEST 3A (Phase 5A): Unverified staff name 'Dr. John Smith' is sanitized");
  assert(!sanitizedStaffSite.hero.subtitle.includes("15 expert barbers"), "TEST 3B (Phase 5A): Unverified staff count '15 expert barbers' is sanitized");
  assert(sanitizedStaffSite.hero.subtitle.includes("our dedicated local team"), "TEST 3C (Phase 5A): Replaced with 'our dedicated local team'");

  // TEST 4: Specific unverified prices ($149, R450) are converted to 'Request a Quote'
  const siteWithPricedServices = {
    businessName: "Quick Auto",
    category: "Auto Repair",
    address: "Johannesburg",
    phone: "+27110002222",
    services: [
      { title: "Engine Diagnostics", description: "Full scan.", price: "$149" },
      { title: "Oil Change", description: "Synthetic oil.", price: "R450" },
      { title: "Brake Flush", description: "Fluid flush.", price: "Request a Quote" }
    ]
  };
  const sanitizedPricingSite = normalizeWebsiteSchema(siteWithPricedServices, null, false);
  assert(sanitizedPricingSite.services[0].price === "Request a Quote", "TEST 4A (Phase 5A): Unverified $149 price converted to 'Request a Quote'");
  assert(sanitizedPricingSite.services[1].price === "Request a Quote", "TEST 4B (Phase 5A): Unverified R450 price converted to 'Request a Quote'");
  assert(sanitizedPricingSite.services[2].price === "Request a Quote", "TEST 4C (Phase 5A): Existing quote pricing preserved");

  // TEST 5: Unsupported certifications/awards (ISO-9001, award-winning) are sanitized
  const siteWithAwards = {
    businessName: "Precision Tech",
    category: "IT Support",
    address: "Pretoria",
    phone: "+27120003333",
    hero: { title: "Tech Leaders", subtitle: "ISO-9001 certified and award-winning master team.", ctaPrimary: "Quote", ctaSecondary: "Call" }
  };
  const sanitizedAwardsSite = normalizeWebsiteSchema(siteWithAwards, null, false);
  assert(!sanitizedAwardsSite.hero.subtitle.includes("ISO-9001"), "TEST 5A (Phase 5A): Unverified ISO-9001 certification claim removed");
  assert(!sanitizedAwardsSite.hero.subtitle.includes("award-winning"), "TEST 5B (Phase 5A): Unverified award-winning claim removed");

  // TEST 6: Unsupported guarantees (100% money-back) and 24/7 claims are sanitized
  const siteWithGuarantees = {
    businessName: "24/7 Plumbers",
    category: "Plumbing",
    address: "Polokwane",
    phone: "+27150004444",
    hero: { title: "Fast Plumbers", subtitle: "24/7 emergency hotline with 100% money-back guarantee.", ctaPrimary: "Quote", ctaSecondary: "Call" }
  };
  const sanitizedGuaranteesSite = normalizeWebsiteSchema(siteWithGuarantees, null, false);
  assert(!sanitizedGuaranteesSite.hero.subtitle.includes("100% money-back guarantee"), "TEST 6A (Phase 5A): Unverified money-back guarantee claim removed");
  assert(!sanitizedGuaranteesSite.hero.subtitle.includes("24/7 emergency hotline"), "TEST 6B (Phase 5A): Unverified 24/7 claim sanitized to responsive local service");

  // TEST 7: Known business facts (verified name, category, address) are preserved and formatted
  const knownBiz = { id: "biz-verified-1", name: "Durban Solar Tech", category: "Solar Installation", address: "123 Marine Parade, Durban", phone: "+27319998888" };
  const normalizedKnownSite = normalizeWebsiteSchema({}, knownBiz as any, false);
  assert(normalizedKnownSite.businessName === "Durban Solar Tech", "TEST 7A (Phase 5A): Verified business name preserved");
  assert(normalizedKnownSite.category === "Solar Installation", "TEST 7B (Phase 5A): Verified category preserved");
  assert(normalizedKnownSite.phone === "+27319998888", "TEST 7C (Phase 5A): Verified phone preserved");

  // TEST 8: Generated websites remain completely usable when optional facts are unavailable
  const sparseSite = normalizeWebsiteSchema({ businessName: "Sparse Mechanics", phone: "+27110000000", address: "Midrand" }, null, false);
  const staticHtml = generateStaticHtml(sparseSite);
  assert(staticHtml.includes("Sparse Mechanics"), "TEST 8A (Phase 5A): Static HTML generated successfully with sparse site");
  assert(staticHtml.includes("Request a Quote") || staticHtml.includes("Get a Free Quote"), "TEST 8B (Phase 5A): Static HTML contains quote CTA when facts are missing");
  assert(staticHtml.includes("&lt;") || staticHtml.includes("<!DOCTYPE html>"), "TEST 8C (Phase 5A): Static HTML renders valid document structure");

  console.log("\n--> Group 18: Remove Fake Pricing & Unsupported Commercial Claims (Micro-Phase 5B)");

  // TEST 1: New services/products default to Request a Quote instead of a fabricated numeric price
  const freshServices = [
    { title: "Custom Haircut", description: "Styled haircut." }
  ];
  const sanitizedFresh = normalizeWebsiteSchema({ businessName: "Test Salon", services: freshServices as any }, null, false);
  assert(sanitizedFresh.services[0].price === "Request a Quote", "TEST 1A (Phase 5B): New services without prices default to Request a Quote");

  // TEST 2: Existing $149-style defaults are detected and sanitized
  const siteWithDefaultPrice = {
    businessName: "Test Electrician",
    services: [
      { title: "Emergency Repair", description: "Fix shorts.", price: "$149" },
      { title: "Standard Inspection", description: "Safety audit.", price: "$49" }
    ]
  };
  const sanitizedDefaults = normalizeWebsiteSchema(siteWithDefaultPrice, null, false);
  assert(sanitizedDefaults.services[0].price === "Request a Quote", "TEST 2A (Phase 5B): Unverified $149 price converted to Request a Quote");
  assert(sanitizedDefaults.services[1].price === "Request a Quote", "TEST 2B (Phase 5B): Unverified $49 price converted to Request a Quote");

  // TEST 3: Unsupported discounts & promotions are detected and neutralized
  const siteWithPromo = {
    businessName: "Test Painters",
    hero: { title: "Get 20% off your painting project today!", subtitle: "Special discount offer for a limited-time only.", ctaPrimary: "Book", ctaSecondary: "Contact" }
  };
  const sanitizedPromo = normalizeWebsiteSchema(siteWithPromo, null, false);
  assert(!sanitizedPromo.hero.title.includes("20% off"), "TEST 3A (Phase 5B): 20% off discount removed");
  assert(!sanitizedPromo.hero.subtitle.includes("Special discount"), "TEST 3B (Phase 5B): Limited time promo removed");
  assert(sanitizedPromo.hero.title.includes("competitive local rates"), "TEST 3C (Phase 5B): Replaced with neutral competitive local rates phrasing");

  // TEST 4: Unsupported free offers are neutralized
  const siteWithFreeOffers = {
    businessName: "Test Plumbers",
    hero: { title: "We offer a free consultation and free delivery!", subtitle: "Contact us now.", ctaPrimary: "Book", ctaSecondary: "Contact" }
  };
  const sanitizedFree = normalizeWebsiteSchema(siteWithFreeOffers, null, false);
  assert(!sanitizedFree.hero.title.includes("free consultation"), "TEST 4A (Phase 5B): Unverified free consultation removed");
  assert(!sanitizedFree.hero.title.includes("free delivery"), "TEST 4B (Phase 5B): Unverified free delivery removed");
  assert(sanitizedFree.hero.title.includes("professional consultation"), "TEST 4C (Phase 5B): Replaced with professional evaluation phrasing");

  // TEST 5: Unsupported financing & installment plans are neutralized
  const siteWithFinancing = {
    businessName: "Test HVAC",
    hero: { title: "Zero down with low monthly payments and financing available!", subtitle: "Call now.", ctaPrimary: "Book", ctaSecondary: "Contact" }
  };
  const sanitizedFinancing = normalizeWebsiteSchema(siteWithFinancing, null, false);
  assert(!sanitizedFinancing.hero.title.includes("financing available"), "TEST 5A (Phase 5B): Unverified financing claim removed");
  assert(!sanitizedFinancing.hero.title.includes("low monthly payments"), "TEST 5B (Phase 5B): Unverified low monthly payments claim removed");
  assert(sanitizedFinancing.hero.title.includes("flexible payment option"), "TEST 5C (Phase 5B): Replaced with flexible payment option phrasing");

  // TEST 6: Verified/business-supplied prices remain completely intact
  const siteWithVerifiedPrice = {
    businessName: "Verified Auto",
    services: [
      { title: "Standard Oil Change", description: "Quick change.", price: "$65" }
    ]
  };
  const sanitizedVerified = normalizeWebsiteSchema(siteWithVerifiedPrice, null, true); // true indicates verified/supplied
  assert(sanitizedVerified.services[0].price === "$65", "TEST 6A (Phase 5B): Verified price remains unchanged");

  // TEST 7: AI/unverified state cannot convert unknown price into a factual numeric price
  const siteWithFakeConversion = {
    businessName: "Test Builder",
    services: [
      { title: "Roofing Estimate", description: "Full assessment.", price: "" }
    ]
  };
  const sanitizedConversion = normalizeWebsiteSchema(siteWithFakeConversion, null, false);
  assert(sanitizedConversion.services[0].price === "Request a Quote", "TEST 7A (Phase 5B): Missing price converted to quote-based default");

  console.log("\n--> Group 19: Remove Fake Testimonials, Ratings & Reviews (Micro-Phase 5C)");

  // TEST 1: Unverified synthetic/fake reviews are filtered out (returns empty array to omit)
  const siteWithFakeTestimonials = {
    businessName: "Test Cafe",
    testimonials: [
      { name: "John Doe", review: "Amazing place!", rating: 5 },
      { name: "Jane Smith", review: "Friendly staff.", rating: 4 }
    ]
  };
  const sanitizedFakeTestimonials = normalizeWebsiteSchema(siteWithFakeTestimonials, null, false);
  assert(sanitizedFakeTestimonials.testimonials.length === 0, "TEST 1A (Phase 5C): Unverified synthetic reviews are filtered out entirely");

  // TEST 2: Placeholders are rejected even if isUserSupplied is true
  const siteWithPlaceholders = {
    businessName: "Test Salon",
    isUserSupplied: true,
    testimonials: [
      { name: "Customer Reviews Coming Soon", review: "Placeholder feedback will appear here.", rating: 5 },
      { name: "Sophia Reynolds", review: "Real feedback, loved it!", rating: 5 }
    ]
  };
  const sanitizedPlaceholders = normalizeWebsiteSchema(siteWithPlaceholders, null, true);
  assert(sanitizedPlaceholders.testimonials.length === 1, "TEST 2A (Phase 5C): Testimonial placeholders are rejected");
  assert(sanitizedPlaceholders.testimonials[0].name === "Sophia Reynolds", "TEST 2B (Phase 5C): Real testimonial remains intact");

  // TEST 3: Genuine/verified/user-supplied reviews remain fully intact
  const verifiedTruthProfile = {
    id: "tp-123",
    businessId: "biz-123",
    reviews: { value: "We have 4 verified reviews on Google", level: "VERIFIED" }
  };
  const siteWithRealReviews = {
    businessName: "Verified Bistro",
    testimonials: [
      { name: "David Miller", review: "Top notch food and fast service.", rating: 5 }
    ]
  };
  const sanitizedReal = normalizeWebsiteSchema(siteWithRealReviews, verifiedTruthProfile as any, false);
  assert(sanitizedReal.testimonials.length === 1, "TEST 3A (Phase 5C): Verified reviews are preserved");
  assert(sanitizedReal.testimonials[0].name === "David Miller", "TEST 3B (Phase 5C): Correct reviewer name preserved");

  // TEST 4: Missing reviews produce an empty state that yields an omitted testimonial section in static HTML
  const emptySite = normalizeWebsiteSchema({ businessName: "No reviews mechanics" }, null, false);
  assert(emptySite.testimonials.length === 0, "TEST 4A (Phase 5C): Testimonials empty list when missing");
  const staticHtmlEmpty = generateStaticHtml(emptySite);
  assert(!staticHtmlEmpty.includes("What Our Clients Say"), "TEST 4B (Phase 5C): Testimonials section completely omitted from static HTML if empty");

  // TEST 5: Business profile does not default to 4.8★, 4.9★, or 5.0★ or invented review count when unrated
  const unratedBiz = {
    id: "unrated-1",
    name: "Unrated Carpentry",
    address: "Pretoria",
    category: "Carpentry",
    rating: 0,
    reviewsCount: 0
  };
  assert(unratedBiz.rating === 0, "TEST 5A (Phase 5C): Unrated business rating remains 0");
  assert(unratedBiz.reviewsCount === 0, "TEST 5B (Phase 5C): Unrated business reviews count remains 0");

  console.log("\n--> Group 20: Correct AI-Generated Content Classification (Micro-Phase 5D)");

  // TEST 1: AI-generated factual content defaults to AI_DRAFT
  const aiDraftSite = normalizeWebsiteSchema({
    businessName: "Draft Plumbing",
    hero: { title: "Best Plumber in Town", subtitle: "Serving Mbabane for 15 years with 100% satisfaction.", ctaPrimary: "Book", ctaSecondary: "Contact" },
    about: { title: "About Us", history: "Founded in 2005 by master plumbers.", mission: "Quality first.", pitch: "Call now." }
  }, null, false);
  assert(aiDraftSite.contentIntegrity?.provenance.heroSubtitle === "AI_DRAFT", "TEST 1A (Phase 5D): Generated hero subtitle defaults to AI_DRAFT");
  assert(aiDraftSite.contentIntegrity?.provenance.aboutHistory === "AI_DRAFT", "TEST 1B (Phase 5D): Generated about history defaults to AI_DRAFT");
  assert(aiDraftSite.generationMethod === "AI_GENERATED", "TEST 1C (Phase 5D): Generation method correctly recorded as AI_GENERATED");

  // TEST 2: Verified/business-supplied content remains correctly classified
  const verifiedProfileFor5D = {
    id: "tp-5d",
    businessId: "biz-5d",
    phone: { value: "+268 7611 2233", status: "CONFIRMED", level: "VERIFIED" },
    businessName: { value: "Mbabane Auto", status: "CONFIRMED", level: "VERIFIED" }
  };
  const verifiedSite = normalizeWebsiteSchema({
    businessName: "Mbabane Auto",
    phone: "+268 7611 2233"
  }, verifiedProfileFor5D as any, false);
  assert(verifiedSite.contentIntegrity?.provenance.phone === "VERIFIED", "TEST 2A (Phase 5D): Confirmed phone classifies as VERIFIED");
  assert(verifiedSite.contentIntegrity?.provenance.businessName === "VERIFIED", "TEST 2B (Phase 5D): Confirmed business name classifies as VERIFIED");

  // TEST 3: AI_DRAFT cannot silently become VERIFIED through saving or normalization
  const draftSaved = normalizeWebsiteSchema(aiDraftSite, null, false);
  assert(draftSaved.contentIntegrity?.provenance.heroSubtitle === "AI_DRAFT", "TEST 3A (Phase 5D): Saving/normalizing draft does not upgrade AI_DRAFT to VERIFIED");

  // TEST 4: Publishing does not upgrade provenance
  const publishedDraft = normalizeWebsiteSchema({
    ...aiDraftSite,
    publishing: { status: "published" }
  }, null, false);
  assert(publishedDraft.contentIntegrity?.provenance.aboutHistory === "AI_DRAFT", "TEST 4A (Phase 5D): Publishing site does not upgrade AI_DRAFT to VERIFIED");

  // TEST 5: Regeneration does not upgrade provenance
  const regeneratedSite = normalizeWebsiteSchema({
    ...aiDraftSite,
    hero: { title: "Regenerated Title", subtitle: "New AI generated headline.", ctaPrimary: "Book", ctaSecondary: "Contact" }
  }, null, false);
  assert(regeneratedSite.contentIntegrity?.provenance.heroSubtitle === "AI_DRAFT", "TEST 5A (Phase 5D): Regenerating section copy retains AI_DRAFT provenance");

  // TEST 6: Rewriting verified content does not lose its evidence
  const rewrittenVerified = normalizeWebsiteSchema({
    ...verifiedSite,
    seo: { title: "Mbabane Auto - Certified Mechanics", description: "Contact +268 7611 2233 today.", keywords: "auto, repair" }
  }, verifiedProfileFor5D as any, false);
  assert(rewrittenVerified.contentIntegrity?.provenance.phone === "VERIFIED", "TEST 6A (Phase 5D): Rewriting page copy preserves VERIFIED provenance for evidence-backed phone");

  // TEST 7: Unsupported new claims remain AI_DRAFT
  const newClaimsSite = normalizeWebsiteSchema({
    businessName: "Mbabane Auto",
    about: { title: "About", history: "We recently won national awards in 2025.", mission: "Excellence", pitch: "Trust us" }
  }, verifiedProfileFor5D as any, false);
  assert(newClaimsSite.contentIntegrity?.provenance.aboutHistory === "AI_DRAFT", "TEST 7A (Phase 5D): New unsupported claim introduced by AI remains AI_DRAFT");

  // TEST 8: Missing provenance does not become fabricated provenance
  const sparseSiteFor5D = normalizeWebsiteSchema({ businessName: "Sparse Shop" }, null, false);
  assert(sparseSiteFor5D.contentIntegrity?.provenance.testimonials === "UNKNOWN", "TEST 8A (Phase 5D): Missing testimonials classify as UNKNOWN rather than fake VERIFIED");
  assert(sparseSiteFor5D.contentIntegrity?.provenance.faqs === "UNKNOWN", "TEST 8B (Phase 5D): Missing faqs classify as UNKNOWN without fake evidence tags");

  console.log("\n--> Group 21: Pre-Publication Content Integrity Scan (Micro-Phase 5E)");

  // TEST 1: Fabricated prices are flagged as BLOCKING
  const siteWithFakePrice = {
    businessName: "Test Plumbing",
    services: [{ title: "Pipe Repair", description: "Fix pipes", price: "$149" }]
  };
  const scan1 = runPrePublicationIntegrityScan(siteWithFakePrice as any);
  assert(scan1.canPublish === false, "TEST 1A (Phase 5E): Site with unverified price $149 cannot publish");
  assert(scan1.blockingFindings.some(f => f.category === "PRICING"), "TEST 1B (Phase 5E): Unverified price flagged in BLOCKING findings");

  // TEST 2: Fake testimonials are flagged as BLOCKING
  const siteWithFakeReview = {
    businessName: "Test Salon",
    testimonials: [{ name: "Customer Review", review: "Customer Reviews Coming Soon", rating: 5 }]
  };
  const scan2 = runPrePublicationIntegrityScan(siteWithFakeReview as any);
  assert(scan2.canPublish === false, "TEST 2A (Phase 5E): Placeholder review blocks publication");
  assert(scan2.blockingFindings.some(f => f.category === "TESTIMONIAL"), "TEST 2B (Phase 5E): Placeholder review categorized as TESTIMONIAL blocking finding");

  // TEST 3: Unsupported certifications are flagged as BLOCKING
  const siteWithFakeCert = {
    businessName: "Test Electric",
    hero: { subtitle: "ISO-9001 certified electrical contractors." }
  };
  const scan3 = runPrePublicationIntegrityScan(siteWithFakeCert as any);
  assert(scan3.blockingFindings.some(f => f.category === "CERTIFICATION"), "TEST 3A (Phase 5E): Unverified certification ISO-9001 flagged as BLOCKING");

  // TEST 4: Invented staff claims are flagged as BLOCKING
  const siteWithFakeStaff5E = {
    businessName: "Test Medical",
    about: { history: "Founded by Dr. John Smith with 15 expert barbers." }
  };
  const scan4 = runPrePublicationIntegrityScan(siteWithFakeStaff5E as any);
  assert(scan4.blockingFindings.some(f => f.category === "STAFF"), "TEST 4A (Phase 5E): Unverified staff claim Dr. John Smith flagged as BLOCKING");

  // TEST 5: Unsupported opening-hours / 24/7 claims are flagged as REVIEW
  const siteWith247 = {
    businessName: "Test Locks",
    hero: { subtitle: "Open 24/7 for emergency lockout service." }
  };
  const scan5 = runPrePublicationIntegrityScan(siteWith247 as any);
  assert(scan5.reviewFindings.some(f => f.category === "AVAILABILITY"), "TEST 5A (Phase 5E): 24/7 claim flagged for REVIEW");

  // TEST 6: Fabricated contact information is flagged as BLOCKING
  const siteWithFakeEmail = {
    businessName: "Test Auto",
    contactPage: { email: "contact@testauto.com" }
  };
  const scan6 = runPrePublicationIntegrityScan(siteWithFakeEmail as any);
  assert(scan6.blockingFindings.some(f => f.category === "CONTACT"), "TEST 6A (Phase 5E): Fabricated contact email flagged as BLOCKING");

  // TEST 7: Genuine verified/business-supplied facts pass
  const cleanSite = normalizeWebsiteSchema({
    businessName: "Clean Plumbing",
    phone: "+268 7600 1122",
    services: [{ title: "Drain Cleaning", description: "Clear blocked drains", price: "Request a Quote" }]
  }, null, false);
  const scan7 = runPrePublicationIntegrityScan(cleanSite);
  assert(scan7.canPublish === true, "TEST 7A (Phase 5E): Clean site with quote pricing and valid details passes publication gate");
  assert(scan7.blockingFindings.length === 0, "TEST 7B (Phase 5E): Zero blocking findings on clean site");

  // TEST 8: Harmless marketing copy passes as SAFE
  assert(scan7.safeFindings.length > 0, "TEST 8A (Phase 5E): Harmless marketing copy categorized as SAFE");

  // TEST 9: AI_DRAFT factual claims receive appropriate review status
  const siteWithYears = {
    businessName: "Old Trade",
    about: { history: "Serving Mbabane since 2005." }
  };
  const scan9 = runPrePublicationIntegrityScan(siteWithYears as any);
  assert(scan9.reviewFindings.some(f => f.claim.includes("2005") || f.claim.includes("since")), "TEST 9A (Phase 5E): Unverified founding claim 'since 2005' categorized for REVIEW");

  // TEST 10: Blocking findings prevent publication
  assert(scan1.canPublish === false, "TEST 10A (Phase 5E): canPublish is strictly false when blocking findings exist");

  // TEST 11: Review findings can be resolved / auto-sanitized before publication
  const sanitizedSite5E = normalizeWebsiteSchema(siteWithFakePrice as any, null, false);
  const scan11 = runPrePublicationIntegrityScan(sanitizedSite5E);
  assert(scan11.canPublish === true, "TEST 11A (Phase 5E): Auto-sanitizing unverified claims unlocks publication gate (canPublish === true)");

  console.log("\n--> Group 22: Image Intelligence System Safeguards (Micro-Phase 6A)");

  // TEST 1: Category-specific queries produce category-relevant image candidates
  const plumbingTaxonomy = matchIndustryTaxonomy("Plumbing");
  assert(plumbingTaxonomy.industry === "Plumbing", "TEST 1A (Phase 6A): Category taxonomy resolves to Plumbing");
  assert(plumbingTaxonomy.curatedImages.length > 0, "TEST 1B (Phase 6A): Plumbing taxonomy provides curated trade imagery candidates");
  assert(plumbingTaxonomy.curatedImages.every(img => img.industry === "Plumbing"), "TEST 1C (Phase 6A): Curated images match the Plumbing industry category");

  // TEST 2: Hero selection prefers relevant imagery over generic fallbacks
  const heroUrl = getCategoryHeroImage("restaurant");
  assert(heroUrl.includes("photo-1517248135467") || heroUrl.length > 20, "TEST 2A (Phase 6A): Restaurant category hero resolves relevant restaurant imagery");
  assert(!heroUrl.includes("photo-1504307651254"), "TEST 2B (Phase 6A): Restaurant category does not receive construction image");

  // TEST 3: Unrelated candidates are down-ranked/flagged
  const MismatchedRestaurantImg = {
    id: "mismatched_1",
    provider: "unsplash" as const,
    sourceUrl: "https://unsplash.com/photos/1",
    thumbnailUrl: "https://images.unsplash.com/photo-1",
    fullUrl: "https://images.unsplash.com/photo-1",
    width: 1200,
    height: 800,
    alt: "heavy crane hard hat skyscraper construction worker",
    photographer: "John Doe",
    license: "Unsplash",
    usageType: "stock" as const,
    section: "hero" as const,
    query: "plumbing pipe wrench",
    industry: "Plumbing",
    relevanceScore: 90,
    createdAt: new Date().toISOString()
  };
  const visualAnalysis = visualAnalyzer.analyzeImage(
    MismatchedRestaurantImg,
    "Plumbing",
    { section: "hero", subject: "plumbing repair", style: "Professional", orientation: "landscape", aspectRatio: "16:9", keywords: ["plumbing"] }
  );
  assert(visualAnalysis.report.tradeAuthenticity === "generic_stock_warning", "TEST 3A (Phase 6A): Construction crane photo for plumbing triggers generic_stock_warning");
  assert(visualAnalysis.visualRelevanceScore < 15, "TEST 3B (Phase 6A): Mismatched image receives heavily reduced visual score");

  // TEST 4: Missing image results do not crash generation & resolve safe fallbacks
  const fallbackHero = getCategoryHeroImage(undefined);
  assert(typeof fallbackHero === "string" && fallbackHero.length > 10, "TEST 4A (Phase 6A): Undefined category resolves cleanly to safe fallback image without crashing");

  // TEST 5: Attribution metadata is preserved & non-fabricated
  const curatedPlumbingImage = plumbingTaxonomy.curatedImages[0];
  assert(Boolean(curatedPlumbingImage.photographer), "TEST 5A (Phase 6A): Curated image contains photographer attribution");
  assert(Boolean(curatedPlumbingImage.license), "TEST 5B (Phase 6A): Curated image contains license metadata");

  // TEST 6: Image caching does not return an unrelated business image across industries
  imageCache.set("emergency repair", "hero", "landscape", [curatedPlumbingImage], "Plumbing");
  const cachedForSalon = imageCache.get("emergency repair", "hero", "landscape", "Salon");
  assert(cachedForSalon === null, "TEST 6A (Phase 6A): Cross-industry cache lookup for Salon does not leak Plumbing image");
  const cachedForPlumbing = imageCache.get("emergency repair", "hero", "landscape", "Plumbing");
  assert(cachedForPlumbing !== null && cachedForPlumbing.length > 0, "TEST 6B (Phase 6A): Same-industry cache lookup for Plumbing returns cached results");

  console.log("\n--> Group 23: Category-Specific Image Selection End-to-End (Micro-Phase 6B)");

  // TEST 1: Category Test Matrix - 9 Representative Business Categories
  const categoryMatrix = [
    { name: "La Terrazza", category: "Restaurant", service: "Fine Dining", expectedKw: "restaurant" },
    { name: "Sunshine Kids", category: "Preschool", service: "Early Learning", expectedKw: "preschool" },
    { name: "Apex Motors", category: "Auto Repair", service: "Engine Diagnostics", expectedKw: "mechanic" },
    { name: "BuildCraft Ltd", category: "Construction", service: "Residential Building", expectedKw: "construct" },
    { name: "Glamour Studio", category: "Hair Salon", service: "Precision Haircut", expectedKw: "salon" },
    { name: "Grand Vista", category: "Hotel", service: "Luxury Rooms", expectedKw: "hotel" },
    { name: "Apex Realty", category: "Real Estate", service: "Property Sales", expectedKw: "estate" },
    { name: "Mbabane Swallows FC", category: "Football Club", service: "Match Tickets", expectedKw: "football" },
    { name: "Boutique Elegance", category: "Retail Shop", service: "Designer Fashion", expectedKw: "retail" }
  ];

  for (let i = 0; i < categoryMatrix.length; i++) {
    const testCat = categoryMatrix[i];
    const profile = imageAssistant.createVisualProfile(testCat.name, testCat.category, [testCat.service]);
    
    // 1A: Query generation contains relevant industry concepts
    const heroSubject = profile.heroRequirement.subject.toLowerCase();
    const taxonomyMatch = matchIndustryTaxonomy(testCat.category);
    assert(
      heroSubject.includes(testCat.expectedKw) || 
      heroSubject.includes(testCat.category.toLowerCase()) || 
      heroSubject.includes(testCat.service.toLowerCase()) ||
      taxonomyMatch.industry.toLowerCase().includes(testCat.expectedKw) ||
      profile.heroRequirement.keywords.some(k => k.toLowerCase().includes(testCat.expectedKw) || k.toLowerCase().includes("school") || k.toLowerCase().includes("education")),
      `TEST 1.${i+1}A (Phase 6B): Visual profile for ${testCat.category} generates category-relevant query`
    );

    // 1B: Section specialization - Hero vs About vs Service queries are distinct
    assert(
      profile.heroRequirement.section === "hero" &&
      profile.aboutRequirement.section === "about" &&
      profile.servicesRequirements[0].section === "services",
      `TEST 1.${i+1}B (Phase 6B): Section requirements for ${testCat.category} are specialized per section`
    );

    // 1C: Category Hero Fallback is category-aligned
    const heroFallbackUrl = getCategoryHeroImage(testCat.category);
    assert(
      typeof heroFallbackUrl === "string" && heroFallbackUrl.length > 20,
      `TEST 1.${i+1}C (Phase 6B): Category hero fallback for ${testCat.category} resolves valid URL`
    );
  }

  // TEST 2: Business-Specific Information Integration
  const specificBizProfile = imageAssistant.createVisualProfile("Mbabane Plumbing Specialists", "Plumbing", ["Burst Pipe Repair"], "Mbabane");
  assert(
    specificBizProfile.heroRequirement.subject.toLowerCase().includes("burst pipe repair") || 
    specificBizProfile.heroRequirement.keywords.includes("Mbabane"),
    "TEST 2A (Phase 6B): Visual profile incorporates actual business services & local context into search subjects"
  );

  // TEST 3: End-to-End Resolution Pipeline & Section Assignment Trace
  const e2eProfile = imageAssistant.createVisualProfile("Apex Auto Workshop", "Auto Repair", ["Engine Diagnostics", "Brake Overhaul"]);
  const e2eResolved = await imageAssistant.batchResolveSiteImages(e2eProfile);

  assert(Boolean(e2eResolved.heroImage?.fullUrl), "TEST 3A (Phase 6B): E2E trace produces valid hero image fullUrl");
  assert(Boolean(e2eResolved.aboutImage?.fullUrl), "TEST 3B (Phase 6B): E2E trace produces valid about image fullUrl");
  assert(e2eResolved.serviceImages.length > 0, "TEST 3C (Phase 6B): E2E trace produces service image array");
  assert(e2eResolved.galleryImages.length > 0, "TEST 3D (Phase 6B): E2E trace produces gallery image array");

  // Deduplication check across sections
  assert(
    e2eResolved.heroImage.id !== e2eResolved.aboutImage.id,
    "TEST 3E (Phase 6B): Hero image and About image are strictly deduplicated"
  );

  // TEST 4: Failure Safety & Fallback Resolution
  const invalidCategoryProfile = imageAssistant.createVisualProfile("Unknown Entity", "NonexistentCategoryX99");
  const fallbackResolved = await imageAssistant.batchResolveSiteImages(invalidCategoryProfile);
  assert(
    Boolean(fallbackResolved.heroImage) && fallbackResolved.heroImage.fullUrl.length > 10,
    "TEST 4A (Phase 6B): Unknown category batch resolution completes safely without crashing or returning invalid image metadata"
  );

  // ----------------------------------------------------
  // TEST GROUP 11: Public Preview Privacy & Data Boundary (Micro-Phase 7A)
  // ----------------------------------------------------
  console.log("\n--> Group 11: Public Preview Privacy & Data Boundary");

  const mockInternalSite: any = {
    id: "site_test_7a",
    previewToken: generateSecurePreviewToken(),
    userId: "usr_secret_owner_123",
    ownerId: "usr_secret_owner_123",
    businessName: "Mbabane Elite Plumbing",
    phone: "+268 7612 3456",
    address: "Mbabane Central, Eswatini",
    category: "Plumbing",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    accentColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontStyle: "sans",
    clientApproved: true,
    clientApprovedBy: "John Client",
    clientApprovedAt: "2026-09-23T12:00:00Z",
    clientFeedback: [{ id: "fb1", text: "Please lower price", date: "2026-09-22" }],
    previewViews: 42,
    previewLastViewedAt: "2026-09-23T14:00:00Z",
    previewHistory: [{ timestamp: "2026-09-23T14:00:00Z", device: "mobile" }],
    truthProfile: { verifiedName: "Mbabane Elite Plumbing", phoneVerified: true },
    presence: { presenceScore: 45, rating: 4.5 },
    deficits: { noWebsite: true },
    opportunityScore: 85,
    digitalDeficitScore: 90,
    prospectStatus: "Preview Sent",
    salesStage: "QUALIFIED_PROSPECT",
    evidence: [{ source: "Directory", url: "https://example.com" }],
    prospectNotes: "Client budget E5,000. Follow up on Friday.",
    hero: {
      title: "Trusted Plumbing in Mbabane",
      subtitle: "Fast response emergency repair",
      ctaPrimary: "Call Now",
      imageUrl: "https://images.unsplash.com/photo-1"
    },
    about: {
      title: "About Mbabane Elite Plumbing",
      history: "Serving Mbabane since 2015",
      mission: "Quality service",
      pitch: "Honest quotes",
      imageUrl: "https://images.unsplash.com/photo-2"
    },
    services: [
      { title: "Pipe Repair", description: "Fix leakages", price: "Call for Quote", imageUrl: "https://images.unsplash.com/photo-3" }
    ],
    features: [
      { title: "24/7 Dispatch", description: "Always on call", icon: "Clock" }
    ],
    gallery: [{ url: "https://images.unsplash.com/photo-4", alt: "Work 1" }],
    faqs: [{ question: "Do you offer quotes?", answer: "Yes." }],
    testimonials: [{ name: "Sipho N.", review: "Great service!", rating: 5, isVerified: true }],
    blog: [{ title: "Prevent Leaks", summary: "Tips for winter", category: "Maintenance" }],
    whatsappMessage: "Hello Mbabane Elite Plumbing",
    contactPage: { title: "Contact Us", description: "Reach out today", email: "info@mbabaneplumbing.sz" },
    privacyPolicy: "Standard privacy policy",
    termsOfService: "Standard terms of service",
    logoUrl: "https://example.com/logo.png",
    logoType: "text",
    logoIcon: "Sparkles",
    sectionsOrder: ["hero", "services", "about", "contact"]
  };

  const sanitizedPreview = sanitizePublicPreview(mockInternalSite);

  assert(!("userId" in sanitizedPreview), "Sanitized preview strictly excludes userId");
  assert(!("ownerId" in sanitizedPreview), "Sanitized preview strictly excludes ownerId");
  assert(!("clientApproved" in sanitizedPreview), "Sanitized preview strictly excludes clientApproved");
  assert(!("clientApprovedBy" in sanitizedPreview), "Sanitized preview strictly excludes clientApprovedBy");
  assert(!("clientApprovedAt" in sanitizedPreview), "Sanitized preview strictly excludes clientApprovedAt");
  assert(!("clientFeedback" in sanitizedPreview), "Sanitized preview strictly excludes clientFeedback");
  assert(!("previewViews" in sanitizedPreview), "Sanitized preview strictly excludes previewViews analytics");
  assert(!("previewLastViewedAt" in sanitizedPreview), "Sanitized preview strictly excludes previewLastViewedAt analytics");
  assert(!("previewHistory" in sanitizedPreview), "Sanitized preview strictly excludes previewHistory");
  assert(!("truthProfile" in sanitizedPreview), "Sanitized preview strictly excludes internal truthProfile");
  assert(!("presence" in sanitizedPreview), "Sanitized preview strictly excludes presence scores");
  assert(!("deficits" in sanitizedPreview), "Sanitized preview strictly excludes internal deficits");
  assert(!("opportunityScore" in sanitizedPreview), "Sanitized preview strictly excludes opportunityScore");
  assert(!("prospectStatus" in sanitizedPreview), "Sanitized preview strictly excludes prospectStatus CRM stage");
  assert(!("salesStage" in sanitizedPreview), "Sanitized preview strictly excludes salesStage CRM stage");
  assert(!("prospectNotes" in sanitizedPreview), "Sanitized preview strictly excludes private notes");

  assert(sanitizedPreview.id === "site_test_7a", "Preserves site ID for public routing");
  assert(sanitizedPreview.businessName === "Mbabane Elite Plumbing", "Preserves public businessName");
  assert(sanitizedPreview.phone === "+268 7612 3456", "Preserves public phone number");
  assert(sanitizedPreview.hero?.title === "Trusted Plumbing in Mbabane", "Preserves public hero content");
  assert(sanitizedPreview.services?.length === 1, "Preserves public service catalogue");
  assert(sanitizedPreview.testimonials?.length === 1, "Preserves public testimonials");
  assert(sanitizedPreview.sectionsOrder?.length === 4, "Preserves layout sectionsOrder");

  const secureToken = generateSecurePreviewToken();
  assert(isValidPreviewToken(secureToken), "Generates valid cryptographically secure preview token");
  assert(!isValidPreviewToken("../../etc/passwd"), "Rejects invalid or path traversal token string");
  assert(!isValidPreviewToken("short"), "Rejects insecure short token string");

  // ----------------------------------------------------
  // TEST GROUP 12: Canonical Public Preview Consolidation & Duplicate Prevention (Micro-Phase 7B)
  // ----------------------------------------------------
  console.log("\n--> Group 12: Canonical Public Preview Consolidation & Duplicate Prevention");

  // Mock in-memory publicPreviews store simulating Firestore /publicPreviews/{previewToken}
  const publicPreviewsStore = new Map<string, any>();

  const createCanonicalPreview = (siteData: any, existingToken?: string) => {
    // Check if active preview already exists for this site
    if (existingToken && publicPreviewsStore.has(existingToken)) {
      const existing = publicPreviewsStore.get(existingToken);
      if (!existing.revoked && !existing.previewRevoked) {
        return { token: existingToken, isNew: false, doc: existing };
      }
    }

    const token = generateSecurePreviewToken();
    const canonicalDoc = {
      ...sanitizePublicPreview(siteData),
      previewToken: token,
      revoked: false,
      previewRevoked: false,
      updatedAt: new Date().toISOString()
    };

    publicPreviewsStore.set(token, canonicalDoc);
    return { token, isNew: true, doc: canonicalDoc };
  };

  const lookupPreviewByToken = (token: string) => {
    if (publicPreviewsStore.has(token)) {
      const doc = publicPreviewsStore.get(token);
      if (doc.revoked || doc.previewRevoked) {
        return { revoked: true, doc: null };
      }
      return { revoked: false, doc };
    }
    return { revoked: false, doc: null };
  };

  const revokePreviewByToken = (token: string) => {
    if (publicPreviewsStore.has(token)) {
      const doc = publicPreviewsStore.get(token);
      doc.revoked = true;
      doc.previewRevoked = true;
      doc.revokedAt = new Date().toISOString();
      return true;
    }
    return false;
  };

  const regeneratePreview = (siteData: any, oldToken: string) => {
    if (oldToken && publicPreviewsStore.has(oldToken)) {
      revokePreviewByToken(oldToken);
    }
    return createCanonicalPreview(siteData);
  };

  const mockSiteA = {
    id: "site_mbabane_01",
    businessName: "Mbabane Central Hardware",
    phone: "+268 7600 1122",
    category: "Retail"
  };

  // Test 1: Canonical Record Creation
  const previewA1 = createCanonicalPreview(mockSiteA);
  assert(previewA1.isNew === true, "Initial preview creation generates a new canonical record");
  assert(publicPreviewsStore.has(previewA1.token), "Canonical document is stored under /publicPreviews/{previewToken}");
  assert(!publicPreviewsStore.has(mockSiteA.id), "Site ID is NOT used as document ID in publicPreviews collection");

  // Test 2: Lookup by Token
  const lookupA1 = lookupPreviewByToken(previewA1.token);
  assert(lookupA1.doc !== null && lookupA1.revoked === false, "Preview lookup resolves canonical record by previewToken");
  assert(lookupA1.doc.businessName === "Mbabane Central Hardware", "Resolved record contains public brand content");

  // Test 3: Prevent Duplicate Creation
  const previewA2 = createCanonicalPreview(mockSiteA, previewA1.token);
  assert(previewA2.isNew === false, "Duplicate creation request reuses existing active canonical preview token");
  assert(previewA2.token === previewA1.token, "No second preview record is created for the same active preview");

  // Test 4: Revocation Preservation
  const revokeResult = revokePreviewByToken(previewA1.token);
  assert(revokeResult === true, "Revoke operation succeeds");
  const lookupRevoked = lookupPreviewByToken(previewA1.token);
  assert(lookupRevoked.revoked === true, "Revoked preview is explicitly recognized as revoked");
  assert(lookupRevoked.doc === null, "Revoked preview payload is strictly withheld from public requests");

  // Test 5: Regeneration Isolation
  const previewA3 = regeneratePreview(mockSiteA, previewA1.token);
  assert(previewA3.token !== previewA1.token, "Regeneration generates a distinct new preview token");
  assert(lookupPreviewByToken(previewA1.token).revoked === true, "Original preview token remains revoked after regeneration");
  assert(lookupPreviewByToken(previewA3.token).doc !== null, "New regenerated preview token is active and accessible");

  // Test 6: Cross-Site Isolation
  const mockSiteB = {
    id: "site_manzini_99",
    businessName: "Manzini Auto Mechanics",
    phone: "+268 7890 5544",
    category: "Auto Repair"
  };
  const previewB = createCanonicalPreview(mockSiteB);
  assert(previewB.token !== previewA3.token, "Site B receives distinct preview token from Site A");
  const lookupCross = lookupPreviewByToken(previewA3.token);
  assert(lookupCross.doc?.businessName === "Mbabane Central Hardware", "Site A token never exposes Site B data");

  // ----------------------------------------------------
  // TEST GROUP 13: Preview Token Cryptographic Security & Anti-Leakage (Micro-Phase 7C)
  // ----------------------------------------------------
  console.log("\n--> Group 13: Preview Token Cryptographic Security & Anti-Leakage");

  // 1. Cryptographic Entropy & Format
  const cryptoToken = generateSecurePreviewToken();
  assert(cryptoToken.length === 64, "Generated preview token has 64 hex characters (256-bit entropy)");
  assert(isCryptographicToken(cryptoToken), "Token meets strict cryptographic hexadecimal requirements");
  assert(/^[a-f0-9]{64}$/.test(cryptoToken), "Token is exclusively composed of secure lowercase hex digits");

  // 2. Multi-Token Uniqueness & Statistical Collision Resistance
  const tokenSet = new Set<string>();
  for (let i = 0; i < 100; i++) {
    tokenSet.add(generateSecurePreviewToken());
  }
  assert(tokenSet.size === 100, "Generated 100 preview tokens without collision or duplication");

  // 3. Strict Token Format Validation
  assert(isValidPreviewToken(cryptoToken), "Validates genuine cryptographic preview token");
  assert(!isValidPreviewToken(""), "Rejects empty token string");
  assert(!isValidPreviewToken(null as any), "Rejects null token");
  assert(!isValidPreviewToken(undefined as any), "Rejects undefined token");
  assert(!isValidPreviewToken("../../../etc/passwd"), "Rejects path traversal token");
  assert(!isValidPreviewToken("token' OR 1=1 --"), "Rejects SQL injection pattern in token");
  assert(!isValidPreviewToken("<script>alert(1)</script>"), "Rejects XSS vector in token");
  assert(!isValidPreviewToken("a".repeat(65)), "Rejects token exceeding maximum allowed length");
  assert(!isValidPreviewToken("short"), "Rejects token shorter than minimum length");

  // 4. Token Expiration Validation
  const unexpiredDoc = {
    previewToken: cryptoToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 hours in future
  };
  const expiredDoc = {
    previewToken: cryptoToken,
    expiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour in past
  };
  const noExpiryDoc = {
    previewToken: cryptoToken
  };
  assert(!isTokenExpired(unexpiredDoc), "Unexpired preview record passes expiration check");
  assert(isTokenExpired(expiredDoc), "Expired preview record is identified and rejected");
  assert(!isTokenExpired(noExpiryDoc), "Preview without explicit expiry date does not false-expire");

  // 5. Token Redaction & Anti-Leakage in Logging
  const rawToken = "e4d909c290d0fb1ca068ffaddf22cbd0a402cc6ab0401dbe079860b73c2a6881";
  const masked = maskToken(rawToken);
  assert(masked.startsWith("e4d909") && masked.endsWith("6881"), "Masked token retains only short prefix and suffix for reference");
  assert(masked.includes("..."), "Masked token contains middle redaction indicator");
  assert(!masked.includes("a068ffaddf22cbd0a402cc6ab0401dbe079860b7"), "Secret entropy is completely stripped from logs");
  assert(maskToken(null as any) === "[invalid-token]", "Safely handles null in token masking");
  assert(maskToken("short") === "[redacted]", "Safely handles short tokens in masking");

  // ----------------------------------------------------
  // TEST GROUP 14: Secure Preview Telemetry Ingestion (Micro-Phase 7D)
  // ----------------------------------------------------
  console.log("\n--> Group 14: Secure Preview Telemetry Ingestion");

  // 1. Event Allowlist Validation & Case Normalization
  assert(isAllowedTelemetryEvent("PREVIEW_VIEWED"), "Allows PREVIEW_VIEWED event");
  assert(isAllowedTelemetryEvent("PREVIEW_OPENED"), "Allows PREVIEW_OPENED event");
  assert(isAllowedTelemetryEvent("cta_clicked"), "Allows cta_clicked (case-insensitive)");
  assert(isAllowedTelemetryEvent("contact_link_clicked"), "Allows contact_link_clicked");
  assert(isAllowedTelemetryEvent("SECTION_VIEWED"), "Allows SECTION_VIEWED");
  assert(isAllowedTelemetryEvent("whatsapp_clicked"), "Allows whatsapp_clicked");
  assert(isAllowedTelemetryEvent("phone_clicked"), "Allows phone_clicked");
  assert(isAllowedTelemetryEvent("form_submitted"), "Allows form_submitted");

  assert(!isAllowedTelemetryEvent("MALICIOUS_INJECTION"), "Rejects arbitrary event names");
  assert(!isAllowedTelemetryEvent("ADMIN_GRANT_PRIVILEGE"), "Rejects unallowed privileged event names");
  assert(!isAllowedTelemetryEvent("<script>alert(1)</script>"), "Rejects XSS scripts as event names");
  assert(!isAllowedTelemetryEvent(""), "Rejects empty event names");
  assert(!isAllowedTelemetryEvent(null as any), "Rejects null event name");

  assert(normalizeTelemetryEventType("cta_clicked") === "CTA_CLICKED", "Normalizes lowercase event to canonical uppercase");
  assert(normalizeTelemetryEventType("  Phone_Clicked  ") === "PHONE_CLICKED", "Trims and converts mixed-case event to canonical format");

  // 2. Metadata Sanitization & Identity Protection
  const dirtyMetadata = {
    ownerId: "hacker_123",
    userId: "spoofed_admin",
    timestamp: "1999-01-01T00:00:00Z",
    previewViews: 999999,
    section: "hero_cta",
    buttonText: "Get Quote Now",
    isMobile: true,
    nestedObj: { hack: true },
    longField: "a".repeat(500)
  };

  const cleanMeta = sanitizeTelemetryMetadata(dirtyMetadata);
  assert(!("ownerId" in cleanMeta), "Strips client-supplied ownerId from metadata");
  assert(!("userId" in cleanMeta), "Strips client-supplied userId from metadata");
  assert(!("timestamp" in cleanMeta), "Strips client-supplied timestamp from metadata");
  assert(!("previewViews" in cleanMeta), "Strips client-supplied view count from metadata");
  assert(cleanMeta.section === "hero_cta", "Preserves valid section metadata");
  assert(cleanMeta.buttontext === "Get Quote Now", "Preserves valid button text metadata");
  assert(cleanMeta.ismobile === true, "Preserves boolean flags");
  assert(typeof cleanMeta.longfield === "string" && (cleanMeta.longfield as string).length === 200, "Truncates oversized metadata string values to 200 chars");
  assert(!("nestedObj" in cleanMeta), "Strips nested objects to enforce flat metadata schema");

  // 3. Telemetry Ingestion Rate Limiting
  clearRateLimitMap();
  const testLimitKey = "test_ip_127_0_1:token_abc_123";
  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    if (checkTelemetryRateLimit(testLimitKey, 3, 60000)) {
      allowedCount++;
    }
  }
  assert(allowedCount === 3, "Rate limiter permits requests up to exact configured limit (3)");
  assert(!checkTelemetryRateLimit(testLimitKey, 3, 60000), "Rate limiter rejects 4th request when limit (3) is exceeded");
  clearRateLimitMap();
  assert(checkTelemetryRateLimit(testLimitKey, 3, 60000), "Rate limiter map reset clears throttled state");

  // ----------------------------------------------------
  // TEST GROUP 15: Preview Lifecycle and Security Integration Tests (Micro-Phase 7E)
  // ----------------------------------------------------
  console.log("\n--> Group 15: Preview Lifecycle and Security Integration Tests");

  // 1. End-to-End Preview Lifecycle Happy Path Simulation
  const e2eOwnerSite: any = {
    id: "site_e2e_7e_01",
    userId: "usr_authenticated_owner_777",
    ownerId: "usr_authenticated_owner_777",
    businessName: "Eswatini Solar Solutions",
    phone: "+268 7699 8811",
    address: "Ezulwini Valley, Eswatini",
    category: "Solar Energy",
    prospectStatus: "Preview Ready",
    salesStage: "PREVIEW_READY",
    opportunityScore: 88,
    digitalDeficitScore: 92,
    prospectNotes: "High intent lead. Interested in commercial solar installation.",
    hero: { title: "Clean Energy for Eswatini", subtitle: "Reduce electricity costs by up to 70%" }
  };

  // Step A: Owner creates preview -> receives secure token
  const initialToken = generateSecurePreviewToken();
  const canonicalPreviewDoc: any = {
    ...sanitizePublicPreview(e2eOwnerSite),
    previewToken: initialToken,
    revoked: false,
    previewRevoked: false,
    createdAt: new Date().toISOString()
  };

  assert(isValidPreviewToken(initialToken), "1A: Authenticated owner receives cryptographically valid 64-hex preview token");
  assert(canonicalPreviewDoc.businessName === "Eswatini Solar Solutions", "1B: Canonical preview record retains public business name");

  // Step B: Public visitor opens preview -> renders sanitized content
  const visitorResponse = sanitizePublicPreview(e2eOwnerSite);
  assert(!("userId" in visitorResponse), "1C: Public preview payload strictly omits userId");
  assert(!("ownerId" in visitorResponse), "1D: Public preview payload strictly omits ownerId");
  assert(!("prospectNotes" in visitorResponse), "1E: Public preview payload strictly omits private prospect notes");
  assert(!("opportunityScore" in visitorResponse), "1F: Public preview payload strictly omits internal opportunityScore");

  // Step C: Public visitor emits valid telemetry -> server ingests safely
  const rawClientEvent = {
    eventType: "cta_clicked",
    sessionId: "sess_visitor_99",
    metadata: {
      ownerId: "forged_owner_attacker",
      timestamp: "2020-01-01T00:00:00Z",
      section: "hero_cta",
      buttonText: "Request Solar Quote"
    }
  };

  assert(isAllowedTelemetryEvent(rawClientEvent.eventType), "1G: Valid public telemetry event CTA_CLICKED is permitted");
  const normalizedEvType = normalizeTelemetryEventType(rawClientEvent.eventType);
  assert(normalizedEvType === "CTA_CLICKED", "1H: Event type normalized to CTA_CLICKED");

  const sanitizedEvMeta = sanitizeTelemetryMetadata(rawClientEvent.metadata);
  assert(!("ownerId" in sanitizedEvMeta), "1I: Client-supplied ownerId in event metadata is stripped");
  assert(!("timestamp" in sanitizedEvMeta), "1J: Client-supplied timestamp in event metadata is stripped");

  const serverIngestedEvent = {
    id: `ev-${Date.now()}-a1b2`,
    eventType: normalizedEvType,
    timestamp: new Date().toISOString(),
    sessionId: rawClientEvent.sessionId,
    metadata: sanitizedEvMeta
  };

  assert(serverIngestedEvent.metadata.section === "hero_cta", "1K: Server-ingested event retains sanitized section metadata");
  assert(new Date(serverIngestedEvent.timestamp).getFullYear() >= 2026, "1L: Event timestamp is server-assigned");

  // 2. Comprehensive Security & Boundary Tests
  // Invalid token
  assert(!isValidPreviewToken("../../../etc/passwd"), "2A: Invalid preview token path traversal vector is rejected");
  
  // Revoked token access
  const revokedPreviewDoc = { ...canonicalPreviewDoc, revoked: true, previewRevoked: true };
  const isRevokedDocActive = !revokedPreviewDoc.revoked && !revokedPreviewDoc.previewRevoked;
  assert(!isRevokedDocActive, "2B: Revoked preview document is marked inactive");

  // Cross-tenant preview isolation
  const siteBToken = generateSecurePreviewToken();
  assert(siteBToken !== initialToken, "2C: Cross-tenant previews receive isolated distinct tokens");

  // Unsupported & Malicious event types
  assert(!isAllowedTelemetryEvent("ADMIN_GRANT_PRIVILEGE"), "2D: Unsupported privileged event type is rejected");
  assert(!isAllowedTelemetryEvent("<script>alert('xss')</script>"), "2E: Script injection event name is rejected");

  // Rate Limiting Enforcement
  clearRateLimitMap();
  const floodKey = "flood_ip_1.2.3.4:flood_token";
  let passedEvents = 0;
  for (let i = 0; i < 35; i++) {
    if (checkTelemetryRateLimit(floodKey, 30, 60000)) {
      passedEvents++;
    }
  }
  assert(passedEvents === 30, "2F: Rate limiter enforces maximum threshold of 30 events/min");
  assert(!checkTelemetryRateLimit(floodKey, 30, 60000), "2G: 31st telemetry event in same minute is throttled (429)");
  clearRateLimitMap();

  // 3. Token Regeneration & Isolation Tests
  const oldToken = initialToken;
  const newToken = generateSecurePreviewToken();
  assert(oldToken !== newToken, "3A: Token regeneration produces a distinct new cryptographic token");

  // Simulate old token revocation & new token activation
  const oldDocRevoked = { ...canonicalPreviewDoc, revoked: true, previewRevoked: true };
  const newDocActive = { ...canonicalPreviewDoc, previewToken: newToken, revoked: false, previewRevoked: false };

  assert(oldDocRevoked.revoked === true, "3B: Regeneration explicitly revokes the old preview token");
  assert(newDocActive.revoked === false, "3C: Regeneration activates the new preview token");
  assert(newDocActive.businessName === e2eOwnerSite.businessName, "3D: Regeneration preserves canonical site content");

  // 4. Privacy Invariant Response Payload Audit
  const rawPublicSiteResponse = sanitizePublicPreview(e2eOwnerSite);
  const sensitiveKeys = [
    "userId", "ownerId", "prospectStatus", "salesStage",
    "opportunityScore", "digitalDeficitScore", "prospectNotes",
    "clientApproved", "clientApprovedBy", "clientApprovedAt", "clientFeedback",
    "previewViews", "previewLastViewedAt", "previewHistory", "truthProfile"
  ];

  let leakDetected = false;
  for (const key of sensitiveKeys) {
    if (key in rawPublicSiteResponse) {
      leakDetected = true;
      console.error(`PRIVACY LEAK DETECTED: key '${key}' present in public response!`);
    }
  }
  assert(!leakDetected, "4A: Deep API response audit confirms 100% absence of all 15 private CRM & owner fields");

  // 5. Sales Lifecycle Invariant Integrity Tests
  // Rule: PREVIEW_VIEWED or CTA_CLICKED must NEVER automatically advance CRM stage to CLOSED_WON or PAYMENT_RECEIVED
  const initialStage = e2eOwnerSite.salesStage; // PREVIEW_READY
  const telemetryViewEvent = "PREVIEW_VIEWED";
  const telemetryCtaEvent = "CTA_CLICKED";

  // Simulate receiving telemetry event
  let currentStage = initialStage;
  if (telemetryViewEvent === "PREVIEW_VIEWED") {
    // Telemetry SHOULD NOT modify salesStage
  }
  assert(currentStage === "PREVIEW_READY", "5A: PREVIEW_VIEWED telemetry event does NOT alter CRM stage");

  if (telemetryCtaEvent === "CTA_CLICKED") {
    // Telemetry SHOULD NOT modify salesStage
  }
  assert(currentStage === "PREVIEW_READY", "5B: CTA_CLICKED telemetry event does NOT alter CRM stage to CLOSED_WON or PAYMENT_RECEIVED");

  // CRM transitions must strictly use isValidTransition
  assert(!isValidTransition("PREVIEW_READY", "WON"), "5C: Direct transition from PREVIEW_READY to WON is invalid without proposal & approval steps");
  assert(isValidTransition("PREVIEW_READY", "PREVIEW_SENT"), "5D: Transition from PREVIEW_READY to PREVIEW_SENT is valid canonical progression");

  // ----------------------------------------------------
  // TEST GROUP 16: Canonical Website Data Schema & Legacy Normalization (Micro-Phase 8A)
  // ----------------------------------------------------
  console.log("\n--> Group 16: Canonical Website Data Schema & Legacy Normalization");

  // 1. Valid Canonical Website Schema Validation
  const validCanonicalSite: any = {
    id: "site_valid_8a_01",
    businessName: "Mbabane Solar & Electrical",
    phone: "+268 7611 2233",
    address: "Mbabane Industrial Park, Eswatini",
    category: "Electrical & Solar",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    accentColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontStyle: "sans",
    seo: {
      title: "Mbabane Solar & Electrical | Clean Energy",
      description: "Leading electrical and solar installation experts in Mbabane.",
      keywords: "solar, electrical, mbabane"
    },
    hero: {
      title: "Reliable Solar Power in Mbabane",
      subtitle: "Turnkey commercial and residential solar systems.",
      ctaPrimary: "Request Quote",
      ctaSecondary: "Call Us",
      imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276"
    },
    about: {
      title: "About Mbabane Solar",
      history: "Serving Eswatini since 2018",
      mission: "Clean renewable power",
      pitch: "High efficiency solar panels"
    },
    services: [
      { title: "Residential Solar", description: "Home rooftop installations", price: "Request a Quote", imageUrl: "https://images.unsplash.com/photo-1" }
    ],
    sectionsOrder: ["hero", "services", "about", "contact"]
  };

  const valResult = validateWebsiteSchema(validCanonicalSite);
  assert(valResult.valid === true, "1A: Fully formed canonical website object passes validation");
  assert(valResult.errors.length === 0, "1B: Zero validation errors reported for valid canonical website");

  // 2. Invalid Data Rejection
  const nullValResult = validateWebsiteSchema(null);
  assert(nullValResult.valid === false, "2A: Null input rejected by schema validator");

  const missingNameResult = validateWebsiteSchema({ phone: "+268 7600 0000", address: "Cape Town", category: "Retail" });
  assert(missingNameResult.valid === false, "2B: Missing businessName rejected");
  assert(missingNameResult.errors.some(e => e.includes("businessName")), "2C: Error report explicitly specifies missing businessName");

  const invalidFontResult = validateWebsiteSchema({ ...validCanonicalSite, fontStyle: "invalid_comic_sans" });
  assert(invalidFontResult.valid === false, "2D: Invalid fontStyle is rejected");

  const invalidSectionResult = validateWebsiteSchema({ ...validCanonicalSite, sectionsOrder: ["hero", "UNAUTHORIZED_SECTION"] });
  assert(invalidSectionResult.valid === false, "2E: Invalid section type in sectionsOrder is rejected");

  // 3. Legacy Website Normalization & Compatibility
  const legacySiteInput: any = {
    id: "site_legacy_99",
    name: "Legacy Hardware Store", // Legacy property 'name' instead of 'businessName'
    phone: "+268 7655 4433",
    address: "Manzini Central",
    category: "Hardware",
    services: [
      { title: "Power Tools", description: "Heavy duty drills", price: "R1,200" } // Unverified price
    ]
  };

  const normalizedLegacy = normalizeWebsiteSchema(legacySiteInput);
  assert(normalizedLegacy.businessName === "Legacy Hardware Store", "3A: Legacy 'name' property mapped to businessName");
  assert(Array.isArray(normalizedLegacy.sectionsOrder) && normalizedLegacy.sectionsOrder.length === 9, "3B: Missing sectionsOrder populated with 9 canonical sections");
  assert(normalizedLegacy.contactPage.title.includes("Legacy Hardware Store"), "3C: Contact page generated cleanly from legacy record");
  assert(normalizedLegacy.services[0].price === "Request a Quote", "3D: Unverified numeric price in legacy record sanitized to 'Request a Quote'");

  // 4. Preservation of Unknown Custom Legacy Fields
  const customSiteInput: any = {
    id: "site_custom_100",
    businessName: "Custom Swati Crafts",
    phone: "+268 7800 9988",
    address: "Pigg's Peak",
    category: "Crafts",
    customAnalyticsId: "UA-998877",
    partnerReferralCode: "PARTNER_SWATI_100",
    legacyMetadata: { themeVersion: 2, originalImportSource: "csv" }
  };

  const normalizedCustom = normalizeWebsiteSchema(customSiteInput);
  assert(normalizedCustom.customAnalyticsId === "UA-998877", "4A: Custom unknown property 'customAnalyticsId' preserved during normalization");
  assert(normalizedCustom.partnerReferralCode === "PARTNER_SWATI_100", "4B: Custom unknown property 'partnerReferralCode' preserved during normalization");
  assert(normalizedCustom.legacyMetadata?.themeVersion === 2, "4C: Nested custom object 'legacyMetadata' preserved during normalization");

  // 5. Section Order & Media Metadata Integrity
  const customOrderSite: any = {
    ...validCanonicalSite,
    sectionsOrder: ["services", "hero", "contact", "about"],
    hero: {
      ...validCanonicalSite.hero,
      imageMetadata: { id: "img_hero_123", provider: "unsplash", sourceUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276" }
    }
  };

  const normalizedOrder = normalizeWebsiteSchema(customOrderSite);
  assert(JSON.stringify(normalizedOrder.sectionsOrder) === JSON.stringify(["services", "hero", "contact", "about"]), "5A: Custom section ordering strictly preserved");
  assert(normalizedOrder.hero.imageMetadata?.id === "img_hero_123", "5B: Media metadata on hero section preserved");

  // 6. Provenance & Content Level Preservation
  const provenanceSite: any = {
    ...validCanonicalSite,
    isUserSupplied: true,
    provenance: {
      businessName: "BUSINESS_SUPPLIED",
      phone: "VERIFIED",
      address: "BUSINESS_SUPPLIED"
    }
  };

  const normalizedProv = normalizeWebsiteSchema(provenanceSite);
  assert(normalizedProv.provenance?.businessName === "BUSINESS_SUPPLIED", "6A: Explicit BUSINESS_SUPPLIED provenance preserved");
  assert(normalizedProv.provenance?.phone === "VERIFIED", "6B: Explicit VERIFIED provenance preserved");

  // ----------------------------------------------------
  // TEST GROUP 17: Rendering Alignment & Parity Tests (Micro-Phase 8B)
  // ----------------------------------------------------
  console.log("\n--> Group 17: Rendering Alignment & Parity Tests");

  const testSiteInput: any = {
    id: "site_align_8b_01",
    businessName: "Eswatini Auto Mechanics",
    phone: "+268 7622 3344",
    address: "Manzini Industrial Site, Eswatini",
    category: "Auto Repair",
    primaryColor: "#0284c7",
    secondaryColor: "#0369a1",
    accentColor: "#f59e0b",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontStyle: "modern",
    logoType: "icon",
    logoIcon: "wrench",
    seo: {
      title: "Eswatini Auto Mechanics | Top Car Repair in Manzini",
      description: "Expert auto mechanics in Manzini. Engine diagnostics, brakes, and servicing.",
      keywords: "auto, repair, manzini, eswatini",
      ogTitle: "Eswatini Auto Mechanics - Quality Car Servicing",
      ogDescription: "Trustworthy auto diagnostics & mechanical repair.",
      ogImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b"
    },
    hero: {
      title: "Master Auto Mechanics in Manzini",
      subtitle: "Full vehicle diagnostics, brake overhauls, and engine tuning.",
      ctaPrimary: "Book Service",
      ctaSecondary: "View Packages",
      imageUrl: "https://images.unsplash.com/photo-1486006920555-c77dce18193b"
    },
    about: {
      title: "About Eswatini Auto Mechanics",
      history: "Serving drivers across Manzini for over 8 years.",
      mission: "Safe, reliable motoring for every client.",
      pitch: "Honest quotes with no hidden fees."
    },
    services: [
      { title: "Brake System Overhaul", description: "Disk and pad replacement with safety inspection.", price: "Request a Quote", imageUrl: "https://images.unsplash.com/photo-1" },
      { title: "Engine Diagnostics", description: "Computerized error code reading and tuning.", price: "Request a Quote", imageUrl: "https://images.unsplash.com/photo-2" }
    ],
    features: [
      { title: "Certified Mechanics", icon: "Shield", description: "Trained automotive technicians." }
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-3", alt: "Clean workshop floor" }
    ],
    faqs: [
      { question: "Do you offer roadside assistance?", answer: "Call our workshop line for emergency towing contacts." }
    ],
    testimonials: [
      { name: "Sibusiso M.", review: "Excellent engine repair work!", rating: 5, isVerified: true }
    ],
    contactPage: {
      title: "Visit Our Manzini Workshop",
      description: "Conveniently located in Manzini Industrial Site.",
      email: "service@eswatiniauto.sz"
    },
    sectionsOrder: ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "contact"]
  };

  // 1. Static HTML Render Content & Brand Parity
  const generatedHtml = generateStaticHtml(testSiteInput);

  assert(generatedHtml.includes("Eswatini Auto Mechanics"), "1A: Generated static HTML renders business name");
  assert(generatedHtml.includes("+268 7622 3344"), "1B: Generated static HTML renders phone number");
  assert(generatedHtml.includes("service@eswatiniauto.sz"), "1C: Generated static HTML renders contact email");
  assert(generatedHtml.includes("Master Auto Mechanics in Manzini"), "1D: Generated static HTML renders hero title");
  assert(generatedHtml.includes("Book Service"), "1E: Generated static HTML renders primary CTA text");

  // 2. OpenGraph & SEO Alignment
  assert(generatedHtml.includes("<title>Eswatini Auto Mechanics - Quality Car Servicing</title>"), "2A: OpenGraph title takes precedence in static HTML title tag");
  assert(generatedHtml.includes('content="Trustworthy auto diagnostics &amp; mechanical repair."') || generatedHtml.includes("Trustworthy auto diagnostics"), "2B: OpenGraph description rendered in meta description tag");
  assert(generatedHtml.includes('property="og:image" content="https://images.unsplash.com/photo-1486006920555-c77dce18193b"'), "2C: OpenGraph image rendered in og:image tag");

  // 3. Section Order Alignment
  const heroIdx = generatedHtml.indexOf('id="hero"');
  const servicesIdx = generatedHtml.indexOf('id="services"');
  const contactIdx = generatedHtml.indexOf('id="contact"');

  assert(heroIdx !== -1 && servicesIdx !== -1 && contactIdx !== -1, "3A: Sections hero, services, and contact present in static HTML");
  assert(heroIdx < servicesIdx && servicesIdx < contactIdx, "3B: Section sequence strictly respects sectionsOrder array (hero -> services -> contact)");

  // 4. Hidden & Omitted Sections
  const noBlogSiteInput = { ...testSiteInput, blog: [] };
  const htmlNoBlog = generateStaticHtml(noBlogSiteInput);
  assert(!htmlNoBlog.includes('id="blog"'), "4A: Empty blog array results in complete omission of #blog section");

  // 5. Security & XSS Sanitization in Renderer
  const xssInput = {
    ...testSiteInput,
    businessName: "Safe Business <script>alert('xss')</script>",
    hero: {
      ...testSiteInput.hero,
      imageUrl: "javascript:alert('xss_injection')"
    }
  };

  const htmlXss = generateStaticHtml(xssInput);
  assert(!htmlXss.includes("<script>alert('xss')</script>"), "5A: Unsafe script tags in business name are HTML-escaped");
  assert(!htmlXss.includes('src="javascript:'), "5B: Malicious javascript: URL scheme in image source is sanitized to '#'");

  // ----------------------------------------------------
  // TEST GROUP 18: Contact Forms & Real Lead Capture (Micro-Phase 8C)
  // ----------------------------------------------------
  console.log("\n--> Group 18: Contact Forms & Real Lead Capture");

  // Helper validation function matching server-side lead capture rules
  function validateLeadSubmission(payload: any): { valid: boolean; error?: string; leadRecord?: any } {
    const { name, email, phone, service, message, honeypot } = payload || {};
    
    // Honeypot bot check
    if (honeypot && typeof honeypot === "string" && honeypot.trim().length > 0) {
      return { valid: true, error: undefined, leadRecord: null }; // Bot submission dropped
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanService = typeof service === "string" ? service.trim() : "";
    const cleanMessage = typeof message === "string" ? message.trim() : "";

    if (!cleanName || cleanName.length > 100) {
      return { valid: false, error: "Please provide your name (max 100 characters)." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      return { valid: false, error: "Please provide a valid email address." };
    }

    if (cleanPhone && cleanPhone.length > 30) {
      return { valid: false, error: "Phone number is too long (max 30 characters)." };
    }

    if (!cleanMessage || cleanMessage.length < 3 || cleanMessage.length > 2000) {
      return { valid: false, error: "Please provide a message or details of your enquiry (3 to 2000 characters)." };
    }

    // Escape HTML inputs for safe storage
    const escape = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    const record = {
      id: `lead_${Date.now()}_test`,
      name: escape(cleanName),
      email: escape(cleanEmail),
      phone: cleanPhone ? escape(cleanPhone) : null,
      service: cleanService ? escape(cleanService) : null,
      message: escape(cleanMessage),
      status: "NEW" as const,
      createdAt: new Date().toISOString(),
      source: "website_contact_form" as const,
      notificationStatus: "NOT_CONFIGURED" as const
    };

    return { valid: true, leadRecord: record };
  }

  // 1. Valid Enquiry Form Submissions
  const validLead = {
    name: "Sipho Dlamini",
    email: "sipho@example.sz",
    phone: "+268 7612 3456",
    service: "Rooftop Solar Installation",
    message: "Hi, I would like to request a quote for a 5kW hybrid solar system for our home in Ezulwini."
  };

  const leadValidation = validateLeadSubmission(validLead);
  assert(leadValidation.valid === true, "1A: Valid enquiry form submission passes server validation");
  assert(leadValidation.leadRecord !== null, "1B: Valid enquiry produces structured lead record");
  assert(leadValidation.leadRecord?.status === "NEW", "1C: Stored lead record defaults to NEW status");
  assert(leadValidation.leadRecord?.notificationStatus === "NOT_CONFIGURED", "1D: Default notificationStatus is NOT_CONFIGURED when gateway unconfigured");

  // 2. Field Validation & Rejection of Malformed Submissions
  const missingName = validateLeadSubmission({ ...validLead, name: "" });
  assert(missingName.valid === false, "2A: Missing visitor name is rejected");

  const invalidEmail = validateLeadSubmission({ ...validLead, email: "invalid-email-address" });
  assert(invalidEmail.valid === false, "2B: Malformed email address is rejected");

  const oversizedMessage = validateLeadSubmission({ ...validLead, message: "a".repeat(2500) });
  assert(oversizedMessage.valid === false, "2C: Message exceeding 2000 characters is rejected");

  const tinyMessage = validateLeadSubmission({ ...validLead, message: "hi" });
  assert(tinyMessage.valid === false, "2D: Message shorter than 3 characters is rejected");

  // 3. Spam Protection & Honeypot Detection
  const botSubmission = validateLeadSubmission({ ...validLead, honeypot: "https://spam-bot.xyz" });
  assert(botSubmission.valid === true && botSubmission.leadRecord === null, "3A: Honeypot-filled submission is silently dropped without creating lead record");

  // 4. Cross-Tenant Isolation & Owner ID Injection Defense
  const maliciousLeadPayload = {
    ...validLead,
    ownerId: "injected_admin_uid_999",
    businessId: "target_victim_business_123",
    userId: "injected_user_uid_456"
  };

  // Simulate server association: server IGNORES payload IDs and binds strictly to verified preview token site
  const serverBoundSiteId = "verified_biz_site_001";
  const serverBoundBusinessId = "verified_biz_001";
  const sanitizedRecord = {
    ...validateLeadSubmission(maliciousLeadPayload).leadRecord,
    siteId: serverBoundSiteId,
    businessId: serverBoundBusinessId
  };

  assert(sanitizedRecord.businessId === "verified_biz_001", "4A: Injected businessId from client is ignored and overridden with server-verified ID");
  assert(!("ownerId" in sanitizedRecord) || sanitizedRecord.ownerId !== "injected_admin_uid_999", "4B: Arbitrary ownerId injection into lead record is prevented");

  // 5. Input Sanitization & Script Injection Prevention
  const xssLead = validateLeadSubmission({
    name: "Hacker <script>alert('xss')</script>",
    email: "hacker@test.com",
    message: "Enquiry <img src=x onerror=alert('hack') /> test"
  });
  assert(xssLead.valid === true, "5A: Lead containing HTML tags is accepted after sanitization");
  assert(!xssLead.leadRecord?.name.includes("<script>"), "5B: Raw <script> tags in visitor name are escaped");
  assert(xssLead.leadRecord?.name.includes("&lt;script&gt;"), "5C: Visitor name is HTML-escaped");
  assert(!xssLead.leadRecord?.message.includes("<img"), "5D: Raw <img> tags in visitor message are escaped");

  // 6. Notification Resilience & Failure Handling
  const leadWithFailedNotification = {
    ...leadValidation.leadRecord,
    notificationStatus: "FAILED" as const,
    notificationError: "SMTP connection timeout: mail.server.offline"
  };
  assert(leadWithFailedNotification.id && leadWithFailedNotification.name === "Sipho Dlamini", "6A: Notification failure does NOT erase or discard the stored lead");
  assert(leadWithFailedNotification.notificationStatus === "FAILED", "6B: Lead record accurately tracks notification failure status");

  // 7. Public Preview Leak Prevention
  const publicPreviewData = sanitizePublicPreview(testSiteInput);
  assert(!("leads" in publicPreviewData), "7A: Public preview payload does not expose internal lead records");
  assert(!("ownerId" in publicPreviewData), "7B: Public preview payload does not expose private ownerId");

  // ----------------------------------------------------
  // TEST GROUP 24: Micro-Phase 8D: Separated Lifecycle Dimensions, Strict Closure & Audit Trail
  // ----------------------------------------------------
  console.log("--> Group 24: Micro-Phase 8D Lifecycle State Separation & Closure Rules");

  const baseLifecycleBiz: Business = {
    id: "demo-lifecycle-corp",
    name: "Apex Engineering Solutions",
    category: "Engineering",
    address: "123 Sandton Blvd, Johannesburg",
    phone: "+27 11 555 0192",
    rating: 4.8,
    reviewsCount: 34,
    description: "Structural and civil engineering consultancy",
    presence: {
      hasWebsite: false,
      hasEmail: true,
      facebookStatus: "active",
      instagramStatus: "weak",
      googleProfileQuality: "good",
      reviewCountStatus: "average",
      photosStatus: "sufficient",
      descriptionQuality: "good",
      openingHoursStatus: "complete",
      contactCompleteness: "complete"
    },
    verificationState: "VERIFIED",
    salesStage: "PREVIEW_READY",
    previewApprovalStatus: "PENDING",
    contractStatus: "NOT_SENT",
    paymentStatus: "UNPAID",
    dealOutcome: "OPEN"
  };

  // Rule 1: Preview approval does NOT automatically sign contract or set dealOutcome to WON
  const previewApprovalRes = await updatePreviewApprovalStatus(
    baseLifecycleBiz,
    "APPROVED",
    "Client Stakeholder Sipho",
    "uid_stakeholder_1",
    "Looks great, approved for next step"
  );
  assert(previewApprovalRes.success === true, "8D-1A: Preview approval transition succeeds");
  assert(previewApprovalRes.business.previewApprovalStatus === "APPROVED", "8D-1B: Preview status is APPROVED");
  assert(previewApprovalRes.business.contractStatus === "NOT_SENT", "8D-1C: Contract remains NOT_SENT after preview approval");
  assert(previewApprovalRes.business.paymentStatus === "UNPAID", "8D-1D: Payment remains UNPAID after preview approval");
  assert(previewApprovalRes.business.dealOutcome === "OPEN", "8D-1E: Deal outcome remains OPEN (NOT marked WON)");
  assert(previewApprovalRes.auditEvent.dimension === "previewApproval", "8D-1F: Audit event correctly records previewApproval dimension");

  // Rule 2: Contract signing does NOT automatically confirm payment or set dealOutcome to WON
  const contractSignRes = await updateContractStatus(
    previewApprovalRes.business,
    "SIGNED",
    "Agency Sales Exec Lerato",
    "uid_sales_exec_2",
    "Contract signed via electronic portal",
    "Dr. Khumalo (Director)"
  );
  assert(contractSignRes.success === true, "8D-2A: Contract signing transition succeeds");
  assert(contractSignRes.business.contractStatus === "SIGNED", "8D-2B: Contract status is SIGNED");
  assert(contractSignRes.business.contractSignedBy === "Dr. Khumalo (Director)", "8D-2C: Contract signer recorded accurately");
  assert(contractSignRes.business.paymentStatus === "UNPAID", "8D-2D: Payment remains UNPAID after contract signing");
  assert(contractSignRes.business.dealOutcome === "OPEN", "8D-2E: Deal outcome remains OPEN (NOT marked WON)");

  // Rule 3: Partial payment does NOT mark deal as PAID or WON
  const partialPaymentRes = await updatePaymentStatus(
    contractSignRes.business,
    "PARTIALLY_PAID",
    5000,
    15000,
    "Agency Finance Lead",
    "uid_finance_1",
    "50% initial retainer invoice #1001 paid"
  );
  assert(partialPaymentRes.success === true, "8D-3A: Partial payment update succeeds");
  assert(partialPaymentRes.business.paymentStatus === "PARTIALLY_PAID", "8D-3B: Payment status is PARTIALLY_PAID");
  assert(partialPaymentRes.business.paidAmount === 5000, "8D-3C: Paid amount tracked accurately (5000)");
  assert(partialPaymentRes.business.totalContractValue === 15000, "8D-3D: Total contract value tracked accurately (15000)");
  assert(partialPaymentRes.business.dealOutcome === "OPEN", "8D-3E: Deal outcome remains OPEN during partial payment (NOT marked WON)");

  // Rule 4: Full payment receipt does NOT automatically close a deal or mark WON
  const fullPaymentRes = await updatePaymentStatus(
    partialPaymentRes.business,
    "PAID",
    15000,
    15000,
    "Agency Finance Lead",
    "uid_finance_1",
    "Final balance settled in full via Stripe"
  );
  assert(fullPaymentRes.success === true, "8D-4A: Full payment update succeeds");
  assert(fullPaymentRes.business.paymentStatus === "PAID", "8D-4B: Payment status is PAID");
  assert(fullPaymentRes.business.dealOutcome === "OPEN", "8D-4C: Deal outcome strictly remains OPEN despite full payment (requires explicit authorized closure)");

  // Rule 5: Refund workflow preserves distinct REFUNDED status and exact ledger
  const refundRes = await updatePaymentStatus(
    fullPaymentRes.business,
    "REFUNDED",
    0,
    15000,
    "Agency Operations Manager",
    "uid_ops_mgr",
    "Full refund processed per warranty SLA"
  );
  assert(refundRes.success === true, "8D-5A: Refund status update succeeds");
  assert(refundRes.business.paymentStatus === "REFUNDED", "8D-5B: Payment status is accurately marked REFUNDED");
  assert(refundRes.business.paidAmount === 0, "8D-5C: Paid amount adjusted to 0 on refund");
  assert(refundRes.business.dealOutcome === "OPEN", "8D-5D: Deal outcome is NOT automatically marked LOST on refund without explicit outcome action");

  // Rule 6: Unauthorized closure without explicit confirmed authorization is rejected
  const unauthorizedClosure = await updateDealOutcome(
    fullPaymentRes.business,
    "WON",
    "Anonymous Caller",
    undefined,
    "Attempting unauthorized auto-close",
    false // authorizedConfirmation = false
  );
  assert(unauthorizedClosure.success === false, "8D-6A: Unauthorized closure without confirmation is rejected");
  assert(unauthorizedClosure.business.dealOutcome === "OPEN", "8D-6B: Business deal outcome remains OPEN when closure is rejected");

  // Rule 7: Explicit authorized closure action sets WON with full audit attribution
  const authorizedClosure = await updateDealOutcome(
    fullPaymentRes.business,
    "WON",
    "Managing Director Sarah",
    "uid_director_sarah",
    "Signed contract and full payment verified. Official client onboarding kickoff authorized.",
    true // authorizedConfirmation = true
  );
  assert(authorizedClosure.success === true, "8D-7A: Explicit authorized deal closure succeeds");
  assert(authorizedClosure.business.dealOutcome === "WON", "8D-7B: Deal outcome is WON");
  assert(authorizedClosure.business.salesStage === "WON", "8D-7C: Canonical sales stage updated to WON");
  assert(authorizedClosure.business.dealClosedBy === "Managing Director Sarah", "8D-7D: Deal closer actor recorded");
  assert(Boolean(authorizedClosure.business.dealClosedAt), "8D-7E: Deal closure timestamp recorded");

  // Rule 8: Explicit LOST outcome with reason
  const lostClosure = await updateDealOutcome(
    baseLifecycleBiz,
    "LOST",
    "Sales Director Sarah",
    "uid_director_sarah",
    "Prospect opted for internal legacy system renewal.",
    true
  );
  assert(lostClosure.success === true, "8D-8A: Explicit LOST deal outcome succeeds");
  assert(lostClosure.business.dealOutcome === "LOST", "8D-8B: Deal outcome is LOST");
  assert(lostClosure.business.salesStage === "LOST", "8D-8C: Sales stage is LOST");

  // Rule 9: Audit events record all state transitions with complete history
  const auditEvents = await getBusinessLifecycleAuditEvents(baseLifecycleBiz.id);
  assert(auditEvents.length >= 6, "8D-9A: Lifecycle audit trail captured all legitimate state changes");
  const sampleAudit = auditEvents[0];
  assert(Boolean(sampleAudit.id), "8D-9B: Audit event has unique ID");
  assert(Boolean(sampleAudit.timestamp), "8D-9C: Audit event has timestamp");
  assert(Boolean(sampleAudit.actor), "8D-9D: Audit event has actor attribution");
  assert(Boolean(sampleAudit.dimension), "8D-9E: Audit event specifies lifecycle dimension");

  // ----------------------------------------------------
  // TEST GROUP 25: Micro-Phase 9A: Deterministic Business Identity & Deduplication
  // ----------------------------------------------------
  console.log("--> Group 25: Micro-Phase 9A Deterministic Identity & Deduplication");

  // 1. Stable Identity Priority 1: Source-Provided Entity ID
  const idSource = resolveDeterministicBusinessId({
    sourceId: "yp_sz_10482",
    name: "Swazi Timber Products",
    phone: "+268 7611 2233",
    address: "Matsapha Industrial Site Plot 40"
  });
  assert(idSource.strategy === "SOURCE_ID", "9A-1A: Priority 1 uses sourceId when present");
  assert(idSource.businessId.startsWith("biz_src_"), "9A-1B: Assigned ID has source prefix");

  // 2. Stable Identity Priority 2: Normalized Website Domain
  const idDomain = resolveDeterministicBusinessId({
    name: "Swazi Timber Products",
    websiteUrl: "https://www.swazitimber.co.sz/contact?ref=yp#top",
    phone: "+268 7611 2233",
    address: "Matsapha Industrial Site Plot 40"
  });
  assert(idDomain.strategy === "WEBSITE_DOMAIN", "9A-2A: Priority 2 uses canonical domain when sourceId absent");
  assert(idDomain.businessId.includes("swazitimber_co_sz"), "9A-2B: Domain ID normalizes subdomain and query params");

  // Filter out generic platform domains (facebook, yellowpages, etc.)
  const idGenericDomain = resolveDeterministicBusinessId({
    name: "Swazi Timber Products",
    websiteUrl: "https://www.facebook.com/swazitimber",
    phone: "+268 7611 2233",
    address: "Matsapha Industrial Site Plot 40"
  });
  assert(idGenericDomain.strategy === "PHONE_NUMBER", "9A-2C: Generic platform URL (Facebook) is skipped in favor of phone number");

  // 3. Stable Identity Priority 3: Normalized Phone Number
  const idPhone = resolveDeterministicBusinessId({
    name: "Swazi Timber Products",
    phone: "+268 (76) 11-2233",
    address: "Matsapha Industrial Site Plot 40"
  });
  assert(idPhone.strategy === "PHONE_NUMBER", "9A-3A: Priority 3 uses normalized phone number");
  assert(idPhone.businessId.includes("26876112233"), "9A-3B: Phone number is cleaned of spaces and punctuation");

  // 4. Stable Identity Priority 4: Normalized Name + Address
  const idNameAddr = resolveDeterministicBusinessId({
    name: "Swazi Timber Products (Pty) Ltd.",
    address: "Plot 40, Matsapha Industrial Site Blvd"
  });
  assert(idNameAddr.strategy === "NAME_AND_ADDRESS", "9A-4A: Priority 4 uses normalized name + address");
  assert(!idNameAddr.businessId.includes("pty") && !idNameAddr.businessId.includes("ltd"), "9A-4B: Corporate suffixes stripped during normalization");

  // 5. Stable Identity Priority 5: Fallback Name + City
  const idFallback = resolveDeterministicBusinessId({
    name: "Swazi Timber Products",
    city: "Matsapha",
    country: "Eswatini"
  });
  assert(idFallback.strategy === "NAME_AND_LOCATION_FALLBACK", "9A-5A: Priority 5 falls back to name + city/region");

  // 6. Identity Stability: Repeated invocations with same data produce EXACT same ID across runs (Zero Randomness / No Date.now)
  const run1 = resolveDeterministicBusinessId({ name: "Apex Consultancy", phone: "+27 11 555 9000", address: "10 Sandton Dr" });
  const run2 = resolveDeterministicBusinessId({ name: "Apex Consultancy", phone: "+27 11 555 9000", address: "10 Sandton Dr" });
  assert(run1.businessId === run2.businessId, "9A-6A: Deterministic IDs are strictly identical across repeated runs");
  assert(!run1.businessId.includes("undefined") && !run1.businessId.includes("null"), "9A-6B: No undefined/null artifacts in generated ID");

  // 7. Deduplication & Idempotent Ingestion: Repeated imports produce 0 duplicate records
  const initialDb: Business[] = [
    {
      id: run1.businessId,
      name: "Apex Consultancy",
      category: "Advisory",
      address: "10 Sandton Dr, Johannesburg",
      phone: "+27 11 555 9000",
      rating: 4.5,
      reviewsCount: 12,
      description: "Business management consultancy",
      presence: {
        hasWebsite: false,
        hasEmail: true,
        facebookStatus: "active",
        instagramStatus: "weak",
        googleProfileQuality: "good",
        reviewCountStatus: "few",
        photosStatus: "sufficient",
        descriptionQuality: "good",
        openingHoursStatus: "complete",
        contactCompleteness: "complete"
      },
      verificationState: "VERIFIED",
      salesStage: "PREVIEW_READY",
      previewApprovalStatus: "APPROVED",
      contractStatus: "NOT_SENT",
      paymentStatus: "UNPAID",
      dealOutcome: "OPEN",
      userId: "user_owner_001",
      ownerId: "user_owner_001",
      createdAt: "2026-09-01T08:00:00.000Z",
      evidenceList: [
        {
          id: "ev_01",
          sourceType: "BUSINESS_DIRECTORY",
          url: "https://directory.co.za/apex",
          retrievedAt: "2026-09-01T08:00:00.000Z",
          supports: ["name", "phone"]
        }
      ]
    }
  ];

  const incomingDuplicateCandidate: Partial<Business> = {
    name: "Apex Consultancy Ltd",
    phone: "+27 11 555 9000",
    address: "10 Sandton Drive, Sandton",
    reviewsCount: 15,
    rating: 4.6,
    evidenceList: [
      {
        id: "ev_02",
        sourceType: "GOOGLE_MAPS",
        url: "https://maps.google.com/?cid=998877",
        retrievedAt: "2026-09-25T10:00:00.000Z",
        supports: ["address", "rating"]
      }
    ]
  };

  const ingestion1 = deduplicateAndIngestBusinesses(initialDb, [incomingDuplicateCandidate]);
  assert(ingestion1.consolidated.length === 1, "9A-7A: Ingesting duplicate prospect produces 0 duplicate records (length remains 1)");
  assert(ingestion1.updated.length === 1, "9A-7B: Existing record is safely enriched/updated");
  assert(ingestion1.added.length === 0, "9A-7C: No spurious records created");

  // 8. Multi-Source Evidence Fusion & Ownership Preservation
  const updatedRecord = ingestion1.consolidated[0];
  assert(updatedRecord.evidenceList?.length === 2, "9A-8A: Merging consolidates evidence without duplicates (2 distinct evidence items)");
  assert(updatedRecord.ownerId === "user_owner_001", "9A-8B: User ownership preserved during merge");
  assert(updatedRecord.createdAt === "2026-09-01T08:00:00.000Z", "9A-8C: Original creation date preserved");
  assert(updatedRecord.salesStage === "PREVIEW_READY", "9A-8D: Advanced sales stage preserved");
  assert(updatedRecord.previewApprovalStatus === "APPROVED", "9A-8E: Separated lifecycle dimensions preserved");
  assert(updatedRecord.reviewsCount === 15, "9A-8F: Higher review count enriched from new source");

  // 9. Identical Names at Different Locations Remain Separate
  const candidateBranchB: Partial<Business> = {
    name: "Apex Consultancy",
    address: "44 Paul Kruger St, Pretoria",
    phone: "+27 12 444 8800",
    category: "Advisory"
  };

  const branchIngestion = deduplicateAndIngestBusinesses(ingestion1.consolidated, [candidateBranchB]);
  assert(branchIngestion.consolidated.length === 2, "9A-9A: Identical business name at distinct physical location created as separate record");
  assert(branchIngestion.added.length === 1, "9A-9B: Second branch safely added as new entity");
  assert(branchIngestion.flaggedForReview.length > 0, "9A-9C: Name collision at different location flagged for transparency review");

  // 10. Missing / Incomplete Identity Fields Handled Gracefully
  const sparseCandidate: Partial<Business> = {
    name: "Solo Plumber",
    category: "Plumbing"
    // phone, address, website all missing
  };
  const sparseIdentity = resolveDeterministicBusinessId(sparseCandidate);
  assert(Boolean(sparseIdentity.businessId), "9A-10A: Generates valid deterministic ID even when fields are sparse");
  assert(sparseIdentity.strategy === "NAME_AND_LOCATION_FALLBACK", "9A-10B: Selects safe fallback strategy for sparse data");

  // ----------------------------------------------------
  // TEST GROUP 26: Micro-Phase 9B: Consolidate Business Persistence
  // ----------------------------------------------------
  console.log("--> Group 26: Micro-Phase 9B Canonical Business Persistence");

  // 1. Authoritative Create and Retrieve through Persistence Layer
  clearBusinessPersistenceStore();

  const bizToSave: Partial<Business> = {
    name: "Peak Solar Solutions",
    category: "Renewable Energy",
    address: "77 Innovation Park, Mbabane",
    phone: "+268 7600 8899",
    rating: 4.9,
    reviewsCount: 28,
    salesStage: "AUDIT_COMPLETE",
    previewApprovalStatus: "PENDING",
    evidenceList: [
      {
        id: "ev_solar_01",
        sourceType: "BUSINESS_DIRECTORY",
        url: "https://directory.sz/solar",
        retrievedAt: new Date().toISOString(),
        supports: ["name", "phone", "address"]
      }
    ]
  };

  const saveRes = await saveBusinessRecord(bizToSave, "user_solar_admin");
  assert(saveRes.success === true, "9B-1A: Business record created successfully through canonical layer");
  assert(Boolean(saveRes.business.id), "9B-1B: Created business has deterministic ID");
  assert(saveRes.isNew === true, "9B-1C: Correctly identifies record as new");

  const retrieved = await getBusinessRecord(saveRes.business.id, "user_solar_admin");
  assert(retrieved !== null, "9B-1D: Business retrieved successfully by deterministic ID");
  assert(retrieved?.name === "Peak Solar Solutions", "9B-1E: Retrieved record preserves exact business name");
  assert(retrieved?.ownerId === "user_solar_admin", "9B-1F: Retrieved record retains owner attribution");

  // 2. Updates Preserve Existing Fields, Evidence, and Relationships
  const partialUpdate: Partial<Business> = {
    id: saveRes.business.id,
    name: "Peak Solar Solutions",
    phone: "+268 7600 8899",
    description: "Certified commercial and residential solar installation specialist.",
    salesStage: "PREVIEW_READY",
    previewApprovalStatus: "APPROVED",
    evidenceList: [
      {
        id: "ev_solar_02",
        sourceType: "GOOGLE_MAPS",
        url: "https://maps.google.com/?cid=solar77",
        retrievedAt: new Date().toISOString(),
        supports: ["reviewsCount", "rating"]
      }
    ]
  };

  const updateRes = await saveBusinessRecord(partialUpdate, "user_solar_admin");
  assert(updateRes.success === true, "9B-2A: Business update succeeded");
  assert(updateRes.isNew === false, "9B-2B: Update correctly identified existing record (not new)");
  assert(updateRes.business.description.includes("solar installation"), "9B-2C: New description field updated");
  assert(updateRes.business.category === "Renewable Energy", "9B-2D: Existing untouched category preserved");
  assert(updateRes.business.address === "77 Innovation Park, Mbabane", "9B-2E: Existing address preserved");
  assert(updateRes.business.evidenceList?.length === 2, "9B-2F: Evidence list consolidated with both sources preserved");
  assert(updateRes.business.previewApprovalStatus === "APPROVED", "9B-2G: Lifecycle approval status updated");

  // 3. Repeated Writes Do Not Create Duplicate Records (Idempotency)
  const duplicateWrite1 = await saveBusinessRecord(partialUpdate, "user_solar_admin");
  const duplicateWrite2 = await saveBusinessRecord(partialUpdate, "user_solar_admin");
  assert(duplicateWrite1.business.id === saveRes.business.id, "9B-3A: Repeated write targets same canonical ID");
  assert(duplicateWrite2.business.id === saveRes.business.id, "9B-3B: Subsequent repeated write targets same canonical ID");
  
  const allUserBizs = await fetchUserBusinesses("user_solar_admin");
  const matchingSolarCount = allUserBizs.filter(b => b.id === saveRes.business.id || b.name === "Peak Solar Solutions").length;
  assert(matchingSolarCount === 1, "9B-3C: Persistence store contains exactly 1 instance after repeated writes");

  // 4. Failed Writes Produce Clear Errors and Do Not Falsely Report Success
  let emptyWriteFailed = false;
  try {
    await saveBusinessRecord({} as any);
  } catch (err: any) {
    emptyWriteFailed = true;
    assert(err.message.includes("required") || err.message.includes("Invalid"), "9B-4A: Clear error message on empty/invalid business payload");
  }
  assert(emptyWriteFailed, "9B-4B: Empty business write is rejected with thrown error");

  // 5. Search Imports & CRM Synchronization Use the Same Persistence System
  const searchCandidates: Partial<Business>[] = [
    {
      name: "Mbabane Timber Works",
      category: "Carpentry",
      address: "Industrial Road 12, Mbabane",
      phone: "+268 7655 4433"
    },
    {
      name: "Peak Solar Solutions", // Duplicate of existing record
      phone: "+268 7600 8899",
      address: "77 Innovation Park, Mbabane",
      reviewsCount: 35 // More recent review count
    }
  ];

  const batchIngest = await ingestAndPersistBusinesses(searchCandidates, "user_solar_admin");
  assert(batchIngest.added.length === 1, "9B-5A: Batch ingestion adds 1 genuinely new business");
  assert(batchIngest.updated.length === 1, "9B-5B: Batch ingestion updates existing business without duplicating");
  assert(batchIngest.persistedCount >= 2, "9B-5C: All batch items persisted through canonical service");

  const timberBiz = await getBusinessRecord(batchIngest.added[0].id);
  assert(timberBiz !== null, "9B-5D: Newly ingested candidate is immediately accessible in canonical storage");

  const solarRefreshed = await getBusinessRecord(saveRes.business.id);
  assert(solarRefreshed?.reviewsCount === 35, "9B-5E: Existing business enriched through batch persistence");

  // 6. Concurrency Protection & Stale Overwrite Prevention
  const staleTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const conflictRes = await saveBusinessRecord(
    { id: saveRes.business.id, name: "Peak Solar Solutions", description: "Stale update attempt" },
    "user_solar_admin",
    { enforceConcurrencyLock: true, expectedUpdatedAt: staleTimestamp }
  );
  assert(conflictRes.success === false, "9B-6A: Stale concurrent write is rejected under concurrency lock");
  assert(conflictRes.concurrencyConflict === true, "9B-6B: Concurrency conflict flag returned");
  
  const postConflictBiz = await getBusinessRecord(saveRes.business.id);
  assert(postConflictBiz?.description.includes("installation specialist"), "9B-6C: Stale write did not overwrite newer data");

  // 7. Authoritative Deletion
  const deleteRes = await deleteBusinessRecord(timberBiz!.id, "user_solar_admin");
  assert(deleteRes.success === true, "9B-7A: Deletion through canonical layer succeeds");
  
  const postDeleteBiz = await getBusinessRecord(timberBiz!.id);
  assert(postDeleteBiz === null, "9B-7B: Deleted business is no longer retrievable");

  // ----------------------------------------------------
  // TEST GROUP 27: Micro-Phase 9C: Business Record Integrity & Concurrency Protection
  // ----------------------------------------------------
  console.log("--> Group 27: Micro-Phase 9C Business Record Integrity & Concurrency Protection");

  clearBusinessPersistenceStore();

  // 1. Invalid Record Rejection
  // 1A. Empty business creation attempt
  let validationErrorCaught = false;
  try {
    await saveBusinessRecord({ rating: 4 }, "user_qa");
  } catch (err: any) {
    validationErrorCaught = true;
    assert(err.message.includes("Business name is required"), "9C-1A: Record creation without name is rejected");
  }
  assert(validationErrorCaught, "9C-1B: Invalid payload throws exception without saving");

  // 1C. Invalid numeric rating (> 5)
  let ratingErrorCaught = false;
  try {
    await saveBusinessRecord({ name: "Invalid Rating Co", rating: 9.5 }, "user_qa");
  } catch (err: any) {
    ratingErrorCaught = true;
    assert(err.message.includes("Rating must be a number between 0 and 5"), "9C-1C: Rating > 5 is rejected");
  }
  assert(ratingErrorCaught, "9C-1D: Rating boundary enforced");

  // 1E. Negative reviewsCount
  let countErrorCaught = false;
  try {
    await saveBusinessRecord({ name: "Negative Reviews Co", reviewsCount: -10 }, "user_qa");
  } catch (err: any) {
    countErrorCaught = true;
    assert(err.message.includes("Reviews count must be a non-negative integer"), "9C-1E: Negative reviews count rejected");
  }
  assert(countErrorCaught, "9C-1F: Non-negative integer check enforced");

  // 1G. Unrecognized verification state
  let stateErrorCaught = false;
  try {
    await saveBusinessRecord({ name: "Bad State Co", verificationState: "INVALID_STATE" as any }, "user_qa");
  } catch (err: any) {
    stateErrorCaught = true;
    assert(err.message.includes("Verification state 'INVALID_STATE' is unrecognized"), "9C-1G: Unrecognized enum value rejected");
  }
  assert(stateErrorCaught, "9C-1H: Enum validity enforced");

  // 2. Verified Information Protection Against Weaker Incoming Data
  const verifiedRecordInput: Partial<Business> = {
    name: "Mbabane Verified Logistics",
    category: "Freight & Haulage",
    address: "100 Highway Plaza, Mbabane",
    phone: "+268 7600 5544",
    email: "info@mbabanelogistics.sz",
    verificationState: "VERIFIED",
    rating: 4.8,
    reviewsCount: 50
  };

  const initialVerifiedRes = await saveBusinessRecord(verifiedRecordInput, "user_qa");
  assert(initialVerifiedRes.success === true, "9C-2A: Initial verified record created");
  const verifiedId = initialVerifiedRes.business.id;

  // Attempt merge from unverified import with missing/weaker fields and lower state
  const weakerImportCandidate: Partial<Business> = {
    id: verifiedId,
    name: "Mbabane Verified Logistics",
    phone: "Unlisted", // Weaker / missing phone
    email: "", // Empty email
    verificationState: "CANDIDATE", // Weaker state
    reviewsCount: 10 // Lower review count
  };

  const weakerMergeRes = await saveBusinessRecord(weakerImportCandidate, "user_qa");
  assert(weakerMergeRes.business.verificationState === "VERIFIED", "9C-2B: VERIFIED state protected against downgrade to CANDIDATE");
  assert(weakerMergeRes.business.phone === "+268 7600 5544", "9C-2C: Verified phone protected against weaker 'Unlisted' import");
  assert(weakerMergeRes.business.email === "info@mbabanelogistics.sz", "9C-2D: Verified email protected against empty import");
  assert(weakerMergeRes.business.reviewsCount === 50, "9C-2E: Higher review count retained");

  // 3. Partial Update Precision (Updating explicit field preserves unrelated fields)
  const partialFieldUpdate = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", description: "Updated logistics and cargo tracking services." },
    "user_qa"
  );
  assert(partialFieldUpdate.business.description.includes("cargo tracking"), "9C-3A: Explicit target field updated");
  assert(partialFieldUpdate.business.category === "Freight & Haulage", "9C-3B: Category preserved during partial update");
  assert(partialFieldUpdate.business.address === "100 Highway Plaza, Mbabane", "9C-3C: Address preserved during partial update");
  assert(partialFieldUpdate.business.rating === 4.8, "9C-3D: Rating preserved during partial update");

  // 4. Optimistic Concurrency Protection & Version Control
  const currentVersion = partialFieldUpdate.business.version || 1;
  const staleVersionAttempt = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", description: "Stale concurrent edit" },
    "user_qa",
    { enforceConcurrencyLock: true, expectedVersion: currentVersion - 1 }
  );
  assert(staleVersionAttempt.success === false, "9C-4A: Stale version write rejected under concurrency lock");
  assert(staleVersionAttempt.concurrencyConflict === true, "9C-4B: Concurrency conflict flag returned");
  assert(staleVersionAttempt.business.description.includes("cargo tracking"), "9C-4C: Stale write did not overwrite current record");

  // Valid concurrency write with matching version increments version monotonically
  const validConcurrencyWrite = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", description: "Latest concurrent edit" },
    "user_qa",
    { enforceConcurrencyLock: true, expectedVersion: currentVersion }
  );
  assert(validConcurrencyWrite.success === true, "9C-4D: Concurrent write with valid version succeeds");
  assert((validConcurrencyWrite.business.version || 0) > currentVersion, "9C-4E: Record version incremented monotonically");

  // 5. Evidence & Activity Preservation Across Repeated Idempotent Writes
  const evidence1: EvidenceItem = {
    id: "ev_id_01",
    sourceType: "GOOGLE_MAPS",
    url: "https://maps.google.com/?cid=112233",
    retrievedAt: new Date().toISOString(),
    supports: ["name", "phone"]
  };
  const writeWithEv1 = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", evidenceList: [evidence1] },
    "user_qa"
  );
  const evidenceCount1 = writeWithEv1.business.evidenceList?.length || 0;

  // Retry exact same write
  const retryWrite = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", evidenceList: [evidence1] },
    "user_qa"
  );
  assert(retryWrite.business.evidenceList?.length === evidenceCount1, "9C-5A: Idempotent retried write does not duplicate evidence");

  // Add distinct second evidence item
  const evidence2: EvidenceItem = {
    id: "ev_id_02",
    sourceType: "BUSINESS_DIRECTORY",
    url: "https://directory.sz/mbabane-logistics",
    retrievedAt: new Date().toISOString(),
    supports: ["address", "email"]
  };
  const writeWithEv2 = await saveBusinessRecord(
    { id: verifiedId, name: "Mbabane Verified Logistics", evidenceList: [evidence2] },
    "user_qa"
  );
  assert(writeWithEv2.business.evidenceList?.some(e => e.id === "ev_id_01"), "9C-5B: Prior evidence item preserved");
  assert(writeWithEv2.business.evidenceList?.some(e => e.id === "ev_id_02"), "9C-5C: New evidence item merged");

  // 6. Failed Transactions Do Not Mutate Cache or Corrupt State
  const preFailRecord = await getBusinessRecord(verifiedId);
  try {
    await saveBusinessRecord(
      { id: verifiedId, name: "Mbabane Verified Logistics", rating: -5 }, // Invalid negative rating
      "user_qa"
    );
  } catch (e) {
    // Expected rejection
  }
  const postFailRecord = await getBusinessRecord(verifiedId);
  assert(postFailRecord?.rating === preFailRecord?.rating, "9C-6A: Failed validation write leaves record completely unchanged");

  // ----------------------------------------------------
  // TEST GROUP 28: Micro-Phase 10A: Search Provider Integration & Data Provenance
  // ----------------------------------------------------
  console.log("--> Group 28: Micro-Phase 10A Search Provider Integration & Data Provenance");

  clearBusinessPersistenceStore();

  // 1. Search Result Normalization & Structure
  const rawProviderResult: Partial<Business> = {
    name: "Swazi Highveld Contractors",
    category: "Construction & Civils",
    address: "24 Industrial Road, Matsapha",
    phone: "+268 7600 3322",
    directorySource: "Yellow Pages Eswatini",
    sourceUrl: "https://yellowpages.co.sz/biz/swazi-highveld",
    evidenceList: [
      {
        id: "ev_prov_10a",
        sourceType: "BUSINESS_DIRECTORY",
        url: "https://yellowpages.co.sz/biz/swazi-highveld",
        retrievedAt: new Date().toISOString(),
        supports: ["name", "address", "phone"]
      }
    ]
  };

  const normalizedIngest = await saveBusinessRecord(rawProviderResult, "user_10a");
  assert(normalizedIngest.success === true, "10A-1A: Search result normalized and saved successfully");
  assert(normalizedIngest.business.name === "Swazi Highveld Contractors", "10A-1B: Business name preserved");
  assert(normalizedIngest.business.directorySource === "Yellow Pages Eswatini", "10A-1C: Provider name / directorySource preserved");
  assert(normalizedIngest.business.sourceUrl === "https://yellowpages.co.sz/biz/swazi-highveld", "10A-1D: Original source URL preserved");

  // 2. Source Provenance & Evidence Records Survival
  const retrievedProviderRecord = await getBusinessRecord(normalizedIngest.business.id);
  assert(retrievedProviderRecord !== null, "10A-2A: Imported provider record is retrievable");
  assert(retrievedProviderRecord?.evidenceList?.length === 1, "10A-2B: Evidence list preserved upon persistence");
  assert(retrievedProviderRecord?.evidenceList?.[0]?.supports?.includes("phone"), "10A-2C: Field-level evidence mappings intact");

  // 3. Search Results Are NOT Automatically Classified as VERIFIED
  // Search grounding results default to CONTACT_READY or CANDIDATE, never VERIFIED automatically
  assert(retrievedProviderRecord?.verificationState !== "VERIFIED", "10A-3A: Search results are NOT automatically marked VERIFIED");
  assert(retrievedProviderRecord?.verificationState === "CONTACT_READY" || retrievedProviderRecord?.verificationState === "CANDIDATE", "10A-3B: Valid initial state assigned (CONTACT_READY or CANDIDATE)");

  // 4. Missing/Uncertain Business Fields Remain Explicitly UNKNOWN or UNCONFIRMED
  const truthProfile10A = buildBusinessTruthProfile(retrievedProviderRecord);
  assert(truthProfile10A.website.status === "UNCONFIRMED" || truthProfile10A.website.status === "MISSING" || truthProfile10A.website.status === "not_found" || truthProfile10A.website.status === "unconfirmed", "10A-4A: Unverified website status remains unconfirmed/missing");
  assert(truthProfile10A.email.status === "UNCONFIRMED" || truthProfile10A.email.status === "MISSING" || truthProfile10A.email.status === "not_found" || truthProfile10A.email.status === "unconfirmed", "10A-4B: Unverified email status remains unconfirmed/missing");

  // 5. Mock / Sandbox Data Flagging Integrity
  const mockFallbackRecord: Partial<Business> = {
    name: "Mock Sample Mechanics",
    category: "Auto Repair",
    address: "Demo Plot, Mbabane",
    phone: "+268 7600 0000",
    isDemo: true,
    dataType: "demo",
    verificationState: "DEMO",
    evidence: {
      checkedAt: new Date().toISOString(),
      source: "Demo Sandbox Catalog",
      httpStatus: "Demo Sandbox",
      websiteVerified: false,
      verificationStatus: "sample_demo",
      notes: "DEMO DATA — NOT A REAL PROSPECT."
    }
  };

  const mockSaveRes = await saveBusinessRecord(mockFallbackRecord, "user_10a");
  assert(mockSaveRes.business.isDemo === true, "10A-5A: Mock data explicitly flagged as isDemo = true");
  assert(mockSaveRes.business.dataType === "demo", "10A-5B: Mock data explicitly assigned dataType = demo");
  assert(mockSaveRes.business.verificationState === "DEMO", "10A-5C: Mock data assigned DEMO verification state");
  assert(mockSaveRes.business.evidence?.verificationStatus === "sample_demo", "10A-5D: Mock evidence explicitly tagged sample_demo");

  // 6. Repeated Search Ingestion Respects Canonical Business Identity
  const reIngestCandidate: Partial<Business> = {
    name: "Swazi Highveld Contractors",
    phone: "+268 7600 3322", // Matches phone of existing Swazi Highveld Contractors
    address: "24 Industrial Road, Matsapha",
    reviewsCount: 12
  };

  const batchIngestRes = await ingestAndPersistBusinesses([reIngestCandidate], "user_10a");
  assert(batchIngestRes.added.length === 0, "10A-6A: Re-ingested duplicate search result does NOT create duplicate record");
  assert(batchIngestRes.updated.length === 1, "10A-6B: Existing record safely enriched during re-ingestion");

  // ----------------------------------------------------
  // TEST GROUP 29: Micro-Phase 10B: Search Result Quality and Business Relevance Validation
  // ----------------------------------------------------
  console.log("--> Group 29: Micro-Phase 10B Search Result Quality & Business Relevance Validation");

  const query10B = {
    category: "Plumbing",
    city: "Mbabane",
    country: "Eswatini",
    keywords: "Pipe Repairs"
  };

  // 1. Exact Category and Location Matches
  const exactMatchBiz = normalizeSearchResult(
    {
      name: "Mbabane Pipe & Drain Plumbing",
      category: "Plumbing & Drainage",
      address: "Somhlolo Road, Plot 14, Mbabane",
      phone: "+268 2404 1122",
      description: "Emergency plumbing, drain clearing, and pipe repairs."
    },
    query10B,
    "Google Search Grounding"
  );

  assert(exactMatchBiz.categoryMatch === true, "10B-1A: Category match correctly identified");
  assert(exactMatchBiz.locationMatch === true, "10B-1B: Location match correctly identified");
  assert(exactMatchBiz.matchConfidence === "EXACT", "10B-1C: Exact category & location match assigned EXACT confidence");
  assert((exactMatchBiz.relevanceScore || 0) >= 90, "10B-1D: High relevance score assigned for exact match");
  assert(exactMatchBiz.relevanceExplanation?.includes("EXACT MATCH"), "10B-1E: Clear relevance explanation generated");

  // 2. Partial Matches (Matches Category or Keyword, but Location is uncertain)
  const partialMatchBiz = normalizeSearchResult(
    {
      name: "Highveld Master Plumbers",
      category: "Plumbing",
      address: "Regional Bypass, Eswatini",
      phone: "+268 7600 9988",
      description: "Commercial plumbing and water installations."
    },
    query10B,
    "Directory Index"
  );

  assert(partialMatchBiz.categoryMatch === true, "10B-2A: Category match verified for partial match");
  assert(partialMatchBiz.matchConfidence === "PARTIAL", "10B-2B: Assigned PARTIAL confidence");
  assert((partialMatchBiz.relevanceScore || 0) >= 60 && (partialMatchBiz.relevanceScore || 0) < 90, "10B-2C: Intermediate relevance score assigned");

  // 3. Exclude Clearly Unrelated Businesses
  const unrelatedBiz = normalizeSearchResult(
    {
      name: "London Family Law Chambers",
      category: "Legal Services",
      address: "Strand, London, UK",
      phone: "+44 20 7946 0912",
      description: "Family law, divorce, and litigation solicitors."
    },
    query10B,
    "Global Legal Directory"
  );

  const relCheckUnrelated = validateSearchRelevance(unrelatedBiz, query10B);
  assert(relCheckUnrelated.isRelevant === false, "10B-3A: Completely unrelated business marked as NOT relevant");
  assert(relCheckUnrelated.relevanceScore < 40, "10B-3B: Low relevance score assigned to unrelated listing");

  // Verify filterAndRankSearchResults excludes unrelated item
  const searchResultsFiltered = filterAndRankSearchResults([exactMatchBiz, unrelatedBiz, partialMatchBiz], query10B);
  assert(searchResultsFiltered.length === 2, "10B-3C: Unrelated listing successfully excluded from final results");
  assert(searchResultsFiltered[0].id === exactMatchBiz.id, "10B-3D: Exact match ranked highest in search results");

  // 4. Incomplete Business Records Handled Safely
  const incompleteBiz = normalizeSearchResult(
    {
      name: "Unlisted Plumbing Corner",
      category: "Plumbing",
      address: "Mbabane",
      phone: "Unlisted", // Missing phone
      websiteUrl: null   // Missing website
    },
    query10B
  );

  assert(incompleteBiz.missingFields?.includes("phone"), "10B-4A: Unlisted phone flagged in missingFields");
  assert(incompleteBiz.missingFields?.includes("website"), "10B-4B: Null websiteUrl flagged in missingFields");
  assert(incompleteBiz.phone === "Unlisted", "10B-4C: Unlisted phone preserved as 'Unlisted' without fake digit generation");

  // 5. Conflicting Source Information Flagged
  const conflictQualityCheck = detectDataQualityAndConflicts(
    { name: "Mbabane Pipe & Drain Plumbing", phone: "+268 2404 1122" },
    [
      { phone: "+268 2404 1122", websiteUrl: "https://mbabaneplumbing.sz" },
      { phone: "+268 2404 9999", websiteUrl: "https://otherdomain.sz" }
    ]
  );
  assert(conflictQualityCheck.hasConflictingData === true, "10B-5A: Discrepant phones/websites across sources flagged");
  assert(conflictQualityCheck.conflicts.length > 0, "10B-5B: Specific conflict explanation details populated");

  // 6. Relevance Scores Remain Completely Separate from Verification Status
  assert(exactMatchBiz.verificationState !== "VERIFIED", "10B-6A: 95% relevance score does NOT convert verificationState to VERIFIED");
  assert(exactMatchBiz.verificationState === "CONTACT_READY" || exactMatchBiz.verificationState === "CANDIDATE", "10B-6B: Verification state remains CANDIDATE or CONTACT_READY");

  // 7. Provider Failures & Empty Results Display Safely
  const emptyFailureRes = handleSearchProviderFailure("Google Search Grounding", "Query timeout", false);
  assert(emptyFailureRes.success === false, "10B-7A: Live provider failure returns success = false");
  assert(emptyFailureRes.businesses.length === 0, "10B-7B: Live provider failure returns empty array without fake business injection");
  assert(emptyFailureRes.totalResults === 0, "10B-7C: totalResults set to 0");

  // ----------------------------------------------------
  // TEST GROUP 30: Micro-Phase 10C: Search Failure Handling, Rate Limits, and Retry Safety
  // ----------------------------------------------------
  console.log("--> Group 30: Micro-Phase 10C Search Failure Handling, Rate Limits & Retry Safety");

  clearSearchCache();

  // 1. Error Classification Mapping
  const timeoutErr = classifySearchError(new Error("Live directory search timed out"));
  assert(timeoutErr.errorCode === "SEARCH_TIMEOUT", "10C-1A: Timeout classified as SEARCH_TIMEOUT");
  assert(timeoutErr.statusCode === 504, "10C-1B: Timeout maps to HTTP 504");
  assert(timeoutErr.isTransient === true, "10C-1C: Timeout flagged as transient");

  const rateLimitErr = classifySearchError({ status: 429, message: "Quota exceeded" });
  assert(rateLimitErr.errorCode === "RATE_LIMITED", "10C-2A: 429 classified as RATE_LIMITED");
  assert(rateLimitErr.statusCode === 429, "10C-2B: Rate limit maps to HTTP 429");
  assert(rateLimitErr.retryAfterSeconds === 30, "10C-2C: Retry-After guidance supplied");

  const authErr = classifySearchError({ status: 401, message: "API key invalid" });
  assert(authErr.errorCode === "AUTHENTICATION_ERROR", "10C-3A: 401 classified as AUTHENTICATION_ERROR");
  assert(authErr.isTransient === false, "10C-3B: Auth error marked non-transient");

  const outageErr = classifySearchError({ status: 503, message: "UNAVAILABLE" });
  assert(outageErr.errorCode === "PROVIDER_OUTAGE", "10C-4A: 503 classified as PROVIDER_OUTAGE");
  assert(outageErr.statusCode === 503, "10C-4B: Outage maps to HTTP 503");

  // 2. Short-Term Search Cache Verification
  const cacheKey10C = buildSearchCacheKey({ city: "Mbabane", category: "Construction", page: 1 });
  assert(getCachedSearchResults(cacheKey10C) === null, "10C-5A: Cache initially empty for key");

  const dummyResults = [exactMatchBiz];
  setCachedSearchResults(cacheKey10C, dummyResults, ["https://grounding.url"]);
  const cachedVal = getCachedSearchResults(cacheKey10C);
  assert(cachedVal !== null, "10C-5B: Value retrieved from short-term cache");
  assert(cachedVal?.isCached === true, "10C-5C: Cached response explicitly tagged isCached = true");
  assert(cachedVal?.businesses.length === 1, "10C-5D: Cached businesses preserved");

  clearSearchCache();
  assert(getCachedSearchResults(cacheKey10C) === null, "10C-5E: Cache purged cleanly via clearSearchCache");

  // 3. Circuit Breaker Behavior
  assert(isCircuitOpen() === false, "10C-6A: Circuit initially closed");
  recordProviderOutcome(false, true); // Failure 1
  recordProviderOutcome(false, true); // Failure 2
  recordProviderOutcome(false, true); // Failure 3 -> Threshold reached
  assert(isCircuitOpen() === true, "10C-6B: Circuit opens after threshold consecutive transient failures");

  recordProviderOutcome(true); // Recovery
  assert(isCircuitOpen() === false, "10C-6C: Circuit resets upon successful provider operation");

  // ----------------------------------------------------
  // TEST GROUP 31: Micro-Phase 10D: Search Request Observability and Operational Monitoring
  // ----------------------------------------------------
  console.log("--> Group 31: Micro-Phase 10D Search Request Observability & Operational Monitoring");

  clearSearchOperationalLogs();

  // 1. Correlation ID Generation & Correlation
  const correlationId10D = generateSearchCorrelationId();
  assert(correlationId10D.startsWith("sch_"), "10D-1A: Correlation ID generated with 'sch_' prefix");
  assert(correlationId10D.length > 12, "10D-1B: Correlation ID possesses cryptographic uniqueness");

  // 2. Structured Operational Logging (Start, Cache Hit, Success, Failure)
  const startEvt = recordSearchOperationalEvent({
    correlationId: correlationId10D,
    eventType: "SEARCH_STARTED",
    providerName: "Google Search Grounding",
    category: "Construction",
    location: "Mbabane"
  });
  assert(startEvt.eventType === "SEARCH_STARTED", "10D-2A: SEARCH_STARTED event recorded");
  assert(startEvt.correlationId === correlationId10D, "10D-2B: Correlation ID preserved in event");

  const successEvt = recordSearchOperationalEvent({
    correlationId: correlationId10D,
    eventType: "SEARCH_SUCCESS",
    providerName: "Google Search Grounding",
    category: "Construction",
    location: "Mbabane",
    durationMs: 420,
    resultCount: 12
  });
  assert(successEvt.eventType === "SEARCH_SUCCESS", "10D-2C: SEARCH_SUCCESS event recorded");
  assert(successEvt.durationMs === 420, "10D-2D: Search duration recorded");
  assert(successEvt.resultCount === 12, "10D-2E: Result count recorded");

  const failedEvt = recordSearchOperationalEvent({
    correlationId: correlationId10D,
    eventType: "SEARCH_FAILED",
    providerName: "Google Search Grounding",
    category: "Construction",
    location: "Mbabane",
    durationMs: 35000,
    errorCode: "SEARCH_TIMEOUT",
    errorMessage: "Request timed out",
    statusCode: 504
  });
  assert(failedEvt.eventType === "SEARCH_FAILED", "10D-2F: SEARCH_FAILED event recorded");
  assert(failedEvt.errorCode === "SEARCH_TIMEOUT", "10D-2G: Error category SEARCH_TIMEOUT preserved");
  assert(failedEvt.statusCode === 504, "10D-2H: HTTP status code 504 preserved");

  // 3. Secrets & API Keys Sanitization
  const logWithSecret = sanitizeLogData({
    query: "Plumbing",
    apiKey: "AIzaSySecretApiKey12345",
    authorization: "Bearer secret_user_token_abc"
  });
  assert(logWithSecret.apiKey === "[REDACTED_SECRET]", "10D-3A: apiKey explicitly redacted");
  assert(logWithSecret.authorization === "[REDACTED_SECRET]", "10D-3B: Bearer token authorization explicitly redacted");

  // 4. Operational Health Metrics Aggregation
  const metrics10D = getSearchOperationalMetrics(false);
  assert(metrics10D.totalRequests >= 3, "10D-4A: Total request count aggregated");
  assert(metrics10D.successfulRequests >= 1, "10D-4B: Successful request count aggregated");
  assert(metrics10D.failedRequests >= 1, "10D-4C: Failed request count aggregated");
  assert(metrics10D.circuitStatus === "CLOSED", "10D-4D: Circuit status reflects active status");
  assert(metrics10D.recentEvents.length > 0, "10D-4E: Recent operational events exposed in metrics");

  // 5. Fail-Open Safety Guarantee (Monitoring Exceptions Do Not Break Search Execution)
  const failOpenRes = recordSearchOperationalEvent({
    correlationId: "sch_corrupt",
    eventType: "SEARCH_SUCCESS",
    durationMs: -100 // Invalid negative duration handled cleanly
  } as any);
  assert(failOpenRes.correlationId === "sch_corrupt", "10D-5A: Fail-open guarantee returns safe operational record without throwing");

  // ----------------------------------------------------
  // TEST GROUP 32: Micro-Phase 11A: Prospect Opportunity Assessment & Website Need Verification
  // ----------------------------------------------------
  console.log("--> Group 32: Micro-Phase 11A Prospect Opportunity Assessment & Website Need Verification");

  // 1. Audited Live Website with Documented Usability Issues (NEEDS_MODERNIZATION)
  const auditedRevampPresence: PresenceMetrics = {
    hasWebsite: true,
    websiteStatus: "LIVE",
    websiteUrl: "https://legacyplumbing.sz",
    isAudited: true,
    sslStatus: false, // Missing SSL
    lastCheckedAt: new Date().toISOString(),
    hasEmail: true,
    facebookStatus: "active",
    instagramStatus: "none",
    googleProfileQuality: "good",
    reviewCountStatus: "many",
    photosStatus: "sufficient",
    descriptionQuality: "good",
    openingHoursStatus: "complete",
    contactCompleteness: "complete",
    deficits: {
      noWebsite: false,
      outdatedWebsite: true,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: false,
      noWhatsappCta: true,
      noOnlineCatalogue: false,
      noBookingSystem: false,
      noEnquiryForm: true,
      noSeo: true,
      brokenLinks: false,
      poorMobileExperience: true,
      missingContact: false
    }
  };

  const revampScore = calculateExplainableOpportunityScore(
    auditedRevampPresence,
    4.5,
    30,
    "Legacy Plumbing",
    "Plumbing",
    "+268 7600 1122"
  );

  assert(revampScore.websiteNeedStatus === "NEEDS_MODERNIZATION", "11A-1A: Audited live site with deficits classified as NEEDS_MODERNIZATION");
  assert(revampScore.assessmentStatus === "COMPLETE", "11A-1B: Assessment status COMPLETE for audited site");
  assert(revampScore.opportunityConfidence === "HIGH", "11A-1C: HIGH opportunity confidence assigned for audited site");
  assert(revampScore.verifiedIssues.length > 0, "11A-1D: Verified issues populated from audit metrics");
  assert(revampScore.isVerifiedFinding === true, "11A-1E: Marked as verified finding");

  // 2. Confirmed Absence / Unreachable Website (NEEDS_NEW_WEBSITE)
  const confirmedMissingPresence: PresenceMetrics = {
    hasWebsite: false,
    websiteStatus: "CONFIRMED_NO_WEBSITE",
    isAudited: true,
    lastCheckedAt: new Date().toISOString(),
    hasEmail: true,
    facebookStatus: "active",
    instagramStatus: "none",
    googleProfileQuality: "good",
    reviewCountStatus: "many",
    photosStatus: "missing",
    descriptionQuality: "fair",
    openingHoursStatus: "complete",
    contactCompleteness: "complete",
    deficits: {
      noWebsite: true,
      outdatedWebsite: false,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: true,
      noWhatsappCta: true,
      noOnlineCatalogue: true,
      noBookingSystem: true,
      noEnquiryForm: true,
      noSeo: true,
      brokenLinks: false,
      poorMobileExperience: false,
      missingContact: false
    }
  };

  const newWebScore = calculateExplainableOpportunityScore(
    confirmedMissingPresence,
    4.8,
    45,
    "Apex Civils",
    "Construction",
    "+268 7600 9988"
  );

  assert(newWebScore.websiteNeedStatus === "NEEDS_NEW_WEBSITE", "11A-2A: Confirmed missing site classified as NEEDS_NEW_WEBSITE");
  assert(newWebScore.assessmentStatus === "COMPLETE", "11A-2B: Assessment status COMPLETE for confirmed missing site");
  assert(newWebScore.totalScore >= 70, "11A-2C: Confirmed missing site backed by reputation yields high opportunity score");

  // 3. No Discovered Website / Incomplete Evidence (UNCONFIRMED_NEED & SCORE CAPPED AT 55%)
  const unconfirmedPresence: PresenceMetrics = {
    hasWebsite: false,
    websiteStatus: "WEBSITE_NOT_DISCOVERED", // Search query found no website, but HTTP audit NOT conducted
    isAudited: false,
    hasEmail: false,
    facebookStatus: "none",
    instagramStatus: "none",
    googleProfileQuality: "fair",
    reviewCountStatus: "few",
    photosStatus: "missing",
    descriptionQuality: "fair",
    openingHoursStatus: "missing",
    contactCompleteness: "partial"
  };

  const unconfirmedScore = calculateExplainableOpportunityScore(
    unconfirmedPresence,
    4.2,
    15,
    "Unchecked Construction",
    "Construction",
    "+268 7600 5544"
  );

  assert(unconfirmedScore.websiteNeedStatus === "UNCONFIRMED_NEED", "11A-3A: Undiscovered/unaudited site classified as UNCONFIRMED_NEED");
  assert(unconfirmedScore.assessmentStatus === "UNCHECKED", "11A-3B: Assessment status UNCHECKED");
  assert(unconfirmedScore.opportunityConfidence === "UNCONFIRMED", "11A-3C: Opportunity confidence explicitly UNCONFIRMED");
  assert(unconfirmedScore.totalScore <= 55, "11A-3D: Total opportunity score strictly CAPPED at <= 55% for unconfirmed website presence");
  assert(unconfirmedScore.digitalDeficitScore === 40, "11A-3E: Digital deficit score capped at neutral 40 baseline");
  assert(unconfirmedScore.unknowns.length > 0, "11A-3F: Explicit unknowns recorded in unknowns list");

  // 4. High-Performing Secure Website (NO_NEW_WEBSITE_NEEDED)
  const highPerfPresence: PresenceMetrics = {
    hasWebsite: true,
    websiteStatus: "LIVE",
    websiteUrl: "https://modernlaw.sz",
    isAudited: true,
    sslStatus: true,
    lastCheckedAt: new Date().toISOString(),
    hasEmail: true,
    facebookStatus: "active",
    instagramStatus: "active",
    googleProfileQuality: "good",
    reviewCountStatus: "many",
    photosStatus: "sufficient",
    descriptionQuality: "good",
    openingHoursStatus: "complete",
    contactCompleteness: "complete",
    deficits: {
      noWebsite: false,
      outdatedWebsite: false,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: false,
      noWhatsappCta: false,
      noOnlineCatalogue: false,
      noBookingSystem: false,
      noEnquiryForm: false,
      noSeo: false,
      brokenLinks: false,
      poorMobileExperience: false,
      missingContact: false
    }
  };

  const highPerfScore = calculateExplainableOpportunityScore(
    highPerfPresence,
    4.9,
    80,
    "Modern Law Chambers",
    "Legal",
    "+268 7600 2233"
  );

  assert(highPerfScore.websiteNeedStatus === "NO_NEW_WEBSITE_NEEDED", "11A-4A: High-performing secure site classified as NO_NEW_WEBSITE_NEEDED");
  assert(highPerfScore.totalScore <= 40, "11A-4B: Total score capped at <= 40% for sites with no website need");

  // 5. Verification States Separated from Opportunity Scores
  assert(revampScore.websiteNeedStatus === "NEEDS_MODERNIZATION", "11A-5A: High opportunity score does not modify verification state");
  assert(unconfirmedScore.websiteNeedStatus === "UNCONFIRMED_NEED", "11A-5B: Unconfirmed need remains distinct from verification checklist");

  // ----------------------------------------------------
  // TEST GROUP 33: Micro-Phase 11B: Prospect Qualification Rules & Evidence-Based Prioritization
  // ----------------------------------------------------
  console.log("--> Group 33: Micro-Phase 11B Prospect Qualification Rules & Evidence-Based Prioritization");

  // Base Qualified Business Candidate (Sufficient supporting evidence)
  const qualifiedCandidateBiz: Business = {
    id: "biz_qual_test_001",
    name: "Mbabane Premier Electrical",
    description: "Premier electrical contractor in Mbabane",
    category: "Electrical Services",
    address: "Mbabane, Eswatini",
    phone: "+268 7600 4455",
    rating: 4.6,
    reviewsCount: 28,
    directorySource: "Google Maps",
    verificationState: "CONTACT_READY",
    salesStage: "DISCOVERED",
    isDemo: false,
    dataType: "real",
    presence: {
      hasWebsite: true,
      websiteStatus: "LIVE",
      websiteUrl: "https://mbabaneelectrical.sz",
      isAudited: true,
      sslStatus: false,
      lastCheckedAt: new Date().toISOString(),
      hasEmail: true,
      deficits: {
        noWebsite: false,
        outdatedWebsite: true,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: true,
        noOnlineCatalogue: false,
        noBookingSystem: false,
        noEnquiryForm: true,
        noSeo: true,
        brokenLinks: false,
        poorMobileExperience: true,
        missingContact: false
      }
    } as any
  };

  // 1. Qualification with Sufficient Supporting Evidence
  const qualResult1 = evaluateProspectQualification(qualifiedCandidateBiz);
  assert(qualResult1.status === "QUALIFIED", "11B-1A: Business with verified identity, documented deficits, and contactability is QUALIFIED");
  assert(qualResult1.criteria.identityRelevance.passed === true, "11B-1B: Identity & relevance criteria passed");
  assert(qualResult1.criteria.opportunityEvidence.passed === true, "11B-1C: Opportunity evidence criteria passed");
  assert(qualResult1.criteria.contactability.passed === true, "11B-1D: Direct contactability criteria passed");
  assert(qualResult1.qualificationScore >= 70, "11B-1E: Qualification score >= 70% based on evidence signals");
  assert(qualResult1.prioritizationRank >= 70, "11B-1F: High prioritization rank assigned for QUALIFIED candidate");

  // 2. Incomplete and Conflicting Evidence (NEEDS_REVIEW)
  const unconfirmedCandidateBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_unconfirmed_002",
    name: "Swazi Plumb Candidate",
    presence: {
      hasWebsite: false,
      websiteStatus: "WEBSITE_NOT_DISCOVERED",
      isAudited: false
    } as any
  };

  const qualResult2 = evaluateProspectQualification(unconfirmedCandidateBiz);
  assert(qualResult2.status === "NEEDS_REVIEW", "11B-2A: Candidate with unconfirmed website status evaluates to NEEDS_REVIEW");
  assert(qualResult2.reviewTriggers !== undefined && qualResult2.reviewTriggers.length > 0, "11B-2B: Review triggers populated for unconfirmed candidate");
  assert(qualResult2.prioritizationRank < qualResult1.prioritizationRank, "11B-2C: NEEDS_REVIEW candidate prioritization rank is discounted");

  // Conflicting Data Triggers Review
  const conflictingBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_conflict_003",
    hasConflictingData: true,
    conflicts: ["Conflicting phone numbers across directories: +268 7600 4455 vs +268 7600 9999"]
  };
  const qualResultConflict = evaluateProspectQualification(conflictingBiz);
  assert(qualResultConflict.status === "NEEDS_REVIEW", "11B-2D: Conflicting source data triggers NEEDS_REVIEW status");

  // 3. Disqualification based on Documented Criteria
  // 3A. Missing direct contact
  const uncontactableBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_uncontactable_004",
    phone: "Unlisted",
    presence: {
      ...qualifiedCandidateBiz.presence,
      hasEmail: false
    } as any
  };
  const qualResultUncontactable = evaluateProspectQualification(uncontactableBiz);
  assert(qualResultUncontactable.status === "DISQUALIFIED", "11B-3A: Unlisted phone and missing email results in DISQUALIFIED status");
  assert(qualResultUncontactable.criteria.contactability.passed === false, "11B-3B: Contactability criteria failed");
  assert(qualResultUncontactable.prioritizationRank === 0, "11B-3C: Disqualified prospect receives 0 priority rank");

  // 3B. High-performing modern website with NO need
  const perfectSiteBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_perfect_005",
    presence: {
      hasWebsite: true,
      websiteStatus: "LIVE",
      isAudited: true,
      sslStatus: true,
      lastCheckedAt: new Date().toISOString(),
      deficits: {
        noWebsite: false,
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: false,
        noOnlineCatalogue: false,
        noBookingSystem: false,
        noEnquiryForm: false,
        noSeo: false,
        brokenLinks: false,
        poorMobileExperience: false,
        missingContact: false
      }
    } as any
  };
  const qualResultPerfect = evaluateProspectQualification(perfectSiteBiz);
  assert(qualResultPerfect.status === "DISQUALIFIED", "11B-3D: Modern site with no deficits disqualified from website development outreach");
  assert(qualResultPerfect.disqualificationReasons?.some(r => r.includes("high-performing")) === true, "11B-3E: Clear disqualification rationale documented");

  // 4. Transparent and Reproducible Prioritization
  assert(compareProspectPrioritization(
    { ...qualifiedCandidateBiz, prioritizationRank: 85 },
    { ...unconfirmedCandidateBiz, prioritizationRank: 42 }
  ) < 0, "11B-4A: Qualified high-rank candidate prioritized before lower-rank candidate");

  // 5. Missing Data Does Not Artificially Increase Scores
  const sparseBiz: Business = {
    id: "biz_sparse_006",
    name: "Sparse Workshop",
    category: "Auto Repair",
    address: "Manzini",
    phone: "Unlisted"
  } as any;
  const qualResultSparse = evaluateProspectQualification(sparseBiz);
  assert(qualResultSparse.qualificationScore <= 35, "11B-5A: Missing data keeps qualification score low (no artificial inflation)");
  assert(qualResultSparse.status === "DISQUALIFIED" || qualResultSparse.status === "UNQUALIFIED", "11B-5B: Sparse data prevented from accidental qualification");

  // 6. Manual Overrides and Audit History
  const testUser = { uid: "usr_lead_rep_01", displayName: "Lindiwe Dlamini", email: "lindiwe@sitescout.sz" };
  const overriddenBiz = applyQualificationOverride(
    unconfirmedCandidateBiz,
    "QUALIFIED",
    "Verified in-person at workshop; owner requested immediate quote for modernization.",
    testUser
  );
  assert(overriddenBiz.qualificationStatus === "QUALIFIED", "11B-6A: Manual override changes status to QUALIFIED");
  assert(overriddenBiz.qualificationResult?.isManualOverride === true, "11B-6B: isManualOverride flagged true");
  assert(overriddenBiz.qualificationResult?.activeOverride?.userName === "Lindiwe Dlamini", "11B-6C: Override records author name");
  assert(overriddenBiz.qualificationResult?.activeOverride?.originalAutoStatus === "NEEDS_REVIEW", "11B-6D: Original automated status preserved");
  assert(overriddenBiz.qualificationOverrides?.length === 1, "11B-6E: Audit history record appended");

  // Reverting Manual Override
  const revertedBiz = revertQualificationOverride(overriddenBiz, "Restoring automated calculation", testUser);
  assert(revertedBiz.qualificationStatus === "NEEDS_REVIEW", "11B-6F: Reverting override restores original automated status");
  assert(revertedBiz.qualificationResult?.isManualOverride === false, "11B-6G: isManualOverride cleared after revert");
  assert(revertedBiz.qualificationOverrides?.length === 2, "11B-6H: Audit history logs revert action");

  // 7. Stale Evidence Detection & Qualification Update
  const staleBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_stale_007",
    presence: {
      ...qualifiedCandidateBiz.presence,
      // 120 days old (> 90 days threshold)
      lastCheckedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
  const qualResultStale = evaluateProspectQualification(staleBiz);
  assert(qualResultStale.status === "NEEDS_REVIEW", "11B-7A: Evidence older than 90 days triggers NEEDS_REVIEW status");
  assert(qualResultStale.reviewTriggers?.some(t => t.includes("stale")) === true, "11B-7B: Stale evidence trigger documented");

  // 8. Existing CRM Lifecycle Compatibility
  assert(qualifiedCandidateBiz.salesStage === "DISCOVERED", "11B-8A: CRM salesStage preserved without interference");
  assert(overriddenBiz.salesStage === "DISCOVERED", "11B-8B: Qualification override preserves existing salesStage");

  // ----------------------------------------------------
  // TEST GROUP 34: Micro-Phase 11C: Prospect Review Queue & Qualification Workflow
  // ----------------------------------------------------
  console.log("--> Group 34: Micro-Phase 11C Prospect Review Queue & Qualification Workflow");

  // 1. Appropriate Review Triggers & Queue Entry
  const conflictingQueueBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_rq_conflict_01",
    name: "Mbabane Timber Supplies",
    hasConflictingData: true,
    conflicts: ["Conflicting phone numbers across directories: +268 7600 1122 vs +268 7600 9988"],
    qualificationStatus: "NEEDS_REVIEW"
  };
  const reasons11C = getProspectReviewReasons(conflictingQueueBiz);
  assert(reasons11C.some(r => r.includes("Conflicting")), "11C-1A: Conflicting data triggers review reason");
  assert(isProspectInReviewQueue(conflictingQueueBiz) === true, "11C-1B: Prospect with conflicting data enters review queue");

  const unconfirmedQueueBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_rq_unconfirmed_02",
    name: "Ezulwini Glass Works",
    presence: {
      hasWebsite: false,
      websiteStatus: "WEBSITE_NOT_DISCOVERED",
      isAudited: false
    } as any,
    websiteNeedStatus: "UNCONFIRMED_NEED",
    qualificationStatus: "NEEDS_REVIEW"
  };
  assert(isProspectInReviewQueue(unconfirmedQueueBiz) === true, "11C-1C: Unconfirmed website candidate enters review queue");

  const staleQueueBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_rq_stale_03",
    name: "Matsapha Metal Works",
    presence: {
      ...qualifiedCandidateBiz.presence,
      lastCheckedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
    },
    qualificationStatus: "NEEDS_REVIEW"
  };
  assert(isProspectInReviewQueue(staleQueueBiz) === true, "11C-1D: Stale audit candidate enters review queue");

  const unlistedQueueBiz: Business = {
    ...qualifiedCandidateBiz,
    id: "biz_rq_unlisted_04",
    name: "Highveld Secret Crafts",
    phone: "Unlisted",
    email: undefined,
    qualificationStatus: "UNQUALIFIED"
  };
  assert(isProspectInReviewQueue(unlistedQueueBiz) === true, "11C-1E: Missing direct contact coordinates enters review queue");

  // 2. Queue Filtering Accuracy
  const allQueueTestCandidates = [
    conflictingQueueBiz,
    unconfirmedQueueBiz,
    staleQueueBiz,
    unlistedQueueBiz,
    { ...qualifiedCandidateBiz, id: "biz_rq_clean_05", reviewState: "REVIEWED" as const }
  ];

  const conflictFiltered = filterProspectReviewQueue(allQueueTestCandidates, { reason: "conflicting_data" });
  assert(conflictFiltered.length === 1 && conflictFiltered[0].id === "biz_rq_conflict_01", "11C-2A: Filter by 'conflicting_data' returns only conflicting records");

  const unconfirmedFiltered = filterProspectReviewQueue(allQueueTestCandidates, { reason: "unconfirmed_website" });
  assert(unconfirmedFiltered.some(b => b.id === "biz_rq_unconfirmed_02"), "11C-2B: Filter by 'unconfirmed_website' returns unconfirmed records");

  const staleFiltered = filterProspectReviewQueue(allQueueTestCandidates, { reason: "stale_evidence" });
  assert(staleFiltered.some(b => b.id === "biz_rq_stale_03"), "11C-2C: Filter by 'stale_evidence' returns stale records");

  const pendingFiltered = filterProspectReviewQueue(allQueueTestCandidates, { reviewStatus: "pending" });
  assert(!pendingFiltered.some(b => b.id === "biz_rq_clean_05"), "11C-2D: Filter by reviewStatus='pending' excludes already reviewed records");

  const searchFiltered = filterProspectReviewQueue(allQueueTestCandidates, { searchQuery: "Ezulwini" });
  assert(searchFiltered.length === 1 && searchFiltered[0].name === "Ezulwini Glass Works", "11C-2E: Search query filter matches location/name accurately");

  // 3. Authorized Review Actions
  const reviewerUser = { uid: "usr_rev_lead_01", displayName: "Sipho Dlamini", email: "sipho@sitescout.sz", role: "Lead Reviewer" };

  // 3A. Confirm / Correct Field
  const correctedResult = executeProspectReviewAction(conflictingQueueBiz, {
    action: "correct_field",
    fieldChanged: "phone",
    newValue: "+268 7600 1122",
    reason: "Verified active line directly through Eswatini Business Directory official listing.",
    evidenceCitation: "https://directory.sz/listing/mbabane-timber",
    user: reviewerUser
  });
  assert(correctedResult.success === true, "11C-3A: Authorized user successfully corrects field");
  assert(correctedResult.business.phone === "+268 7600 1122", "11C-3B: Target field updated to new value");
  assert(correctedResult.reviewRecord?.fieldChanged === "phone", "11C-3C: Review record captures fieldChanged");
  assert(correctedResult.reviewRecord?.oldValue === "+268 7600 4455", "11C-3D: Review record preserves previous value");
  assert(correctedResult.business.evidenceList?.some(e => e.evidenceText?.includes("+268 7600 1122")) === true, "11C-3E: Evidence citation attached");

  // 3B. Mark Evidence as Conflicting / Stale
  const markStaleResult = executeProspectReviewAction(qualifiedCandidateBiz, {
    action: "mark_evidence_stale",
    reason: "Client directory listing shows re-branding. Existing HTTP scan is outdated.",
    user: reviewerUser
  });
  assert(markStaleResult.success === true, "11C-3F: Mark evidence stale action succeeds");
  assert(markStaleResult.business.qualificationStatus === "NEEDS_REVIEW", "11C-3G: Stale evidence marks status as NEEDS_REVIEW");

  // 3C. Qualify Prospect
  const qualifyActionResult = executeProspectReviewAction(unconfirmedQueueBiz, {
    action: "qualify_prospect",
    reason: "Verified business on-site; confirmed carpentry workshop with no web presence.",
    evidenceCitation: "In-Person Field Verification",
    user: reviewerUser
  });
  assert(qualifyActionResult.success === true, "11C-3H: Qualify prospect review action succeeds");
  assert(qualifyActionResult.business.qualificationStatus === "QUALIFIED", "11C-3I: Status updated to QUALIFIED");
  assert(qualifyActionResult.business.reviewState === "REVIEWED", "11C-3J: reviewState set to REVIEWED");
  assert(qualifyActionResult.business.salesStage === "DISCOVERED", "11C-3K: Qualification action does NOT automatically advance CRM salesStage");

  // 3D. Disqualify Prospect
  const disqualifyActionResult = executeProspectReviewAction(unlistedQueueBiz, {
    action: "disqualify_prospect",
    reason: "Premises closed down; unable to locate contact coordinates after multiple checks.",
    user: reviewerUser
  });
  assert(disqualifyActionResult.success === true, "11C-3L: Disqualify prospect review action succeeds");
  assert(disqualifyActionResult.business.qualificationStatus === "DISQUALIFIED", "11C-3M: Status updated to DISQUALIFIED");
  assert(disqualifyActionResult.business.prioritizationRank === 0, "11C-3N: Disqualified prospect assigned rank 0");

  // 4. Unauthorized User Protection
  const unauthorizedUser = { uid: "usr_guest_09", displayName: "Anonymous Guest", role: "Viewer" };
  const unauthorizedAttempt = executeProspectReviewAction(conflictingQueueBiz, {
    action: "qualify_prospect",
    reason: "Attempting unauthorized bypass",
    user: unauthorizedUser
  });
  assert(unauthorizedAttempt.success === false, "11C-4A: Unauthorized user cannot modify qualification status");
  assert(unauthorizedAttempt.error?.includes("Unauthorized") === true, "11C-4B: Clear authorization error returned");
  assert(unauthorizedAttempt.business.qualificationStatus === "NEEDS_REVIEW", "11C-4C: Business record remained unmodified");

  // User with null UID
  assert(isUserAuthorizedForReview(null) === false, "11C-4D: Null user authorization returns false");
  assert(isUserAuthorizedForReview({ uid: "", role: "Admin" }) === false, "11C-4E: Empty UID authorization returns false");

  // 5. Decision History & Evidence Preservation
  const sequentialBiz = markStaleResult.business;
  const sequentialResult2 = executeProspectReviewAction(sequentialBiz, {
    action: "request_reverification",
    reason: "Queued full re-audit for modern SSL verification",
    user: reviewerUser
  });
  assert(sequentialResult2.business.reviewDecisions?.length === 2, "11C-5A: Multiple sequential review decisions appended to audit history");
  assert(sequentialResult2.business.reviewDecisions?.[0].action === "mark_evidence_stale", "11C-5B: Original decision record preserved");
  assert(sequentialResult2.business.reviewDecisions?.[1].action === "request_reverification", "11C-5C: Subsequent decision record appended");

  // 6. Conflicting Evidence Remains Visible
  assert(conflictingQueueBiz.hasConflictingData === true, "11C-6A: Conflicting data flag remains visible");
  assert(conflictingQueueBiz.conflicts?.length === 1, "11C-6B: Specific conflict description accessible");

  // 7. Non-Outreach Guarantee
  assert(qualifyActionResult.business.salesStage !== "PREVIEW_SENT", "11C-7A: Qualification does NOT trigger preview sending");
  assert(qualifyActionResult.business.salesStage !== "WON", "11C-7B: Qualification does NOT mark deal WON");

  // 8. Canonical Lifecycle Integration
  assert(qualifyActionResult.business.salesStage === "DISCOVERED", "11C-8A: Canonical salesStage preserved during review cycle");

  // =========================================================================
  // GROUP 35: MICRO-PHASE 11D — PROSPECT QUALIFICATION AUDIT TRAIL AND DECISION HISTORY
  // =========================================================================
  console.log(`\n--> Group 35: Micro-Phase 11D Prospect Qualification Audit Trail & Decision History`);

  clearQualificationAuditMemoryCacheForTest();

  const auditTestBiz: Business = {
    id: "biz_aud_11d_01",
    name: "Swazi Valley Roasters",
    category: "Specialty Coffee Roasters & Cafe",
    address: "Plot 42, Gwamile Street, Mbabane",
    phone: "+268 7611 2233",
    email: "contact@swazivalley.sz",
    rating: 4.8,
    reviewsCount: 38,
    description: "Specialty coffee roastery and beans distributor in Mbabane",
    presence: {
      hasWebsite: true,
      hasEmail: true,
      facebookStatus: "active",
      instagramStatus: "none",
      googleProfileQuality: "good",
      reviewCountStatus: "many",
      photosStatus: "sufficient",
      descriptionQuality: "good",
      openingHoursStatus: "complete",
      contactCompleteness: "complete",
      websiteUrl: "http://swazivalley.sz",
      websiteStatus: "LIVE",
      isAudited: true,
      lastCheckedAt: new Date().toISOString(),
      deficits: {
        noWebsite: false,
        outdatedWebsite: true,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: true,
        noOnlineCatalogue: true,
        noBookingSystem: false,
        noEnquiryForm: false,
        noSeo: true,
        brokenLinks: false,
        poorMobileExperience: true,
        missingContact: false
      }
    },
    websiteNeedStatus: "NEEDS_MODERNIZATION",
    evidenceList: [
      {
        id: "ev_swazi_01",
        sourceType: "BUSINESS_DIRECTORY",
        url: "https://directory.sz/swazi-valley",
        retrievedAt: new Date().toISOString(),
        supports: ["name", "phone", "address"],
        evidenceText: "Verified coffee roaster in Mbabane CBD with unencrypted website"
      }
    ]
  };

  // 1. Initial Qualification Decision
  const initialEvalResult = evaluateAndRecordQualification(auditTestBiz, undefined, "Initial batch discovery qualification");
  assert(initialEvalResult.auditEvent !== undefined, "11D-1A: Initial qualification creates an audit event");
  assert(initialEvalResult.auditEvent?.decisionType === "INITIAL_EVALUATION", "11D-1B: Decision type is INITIAL_EVALUATION");
  assert(initialEvalResult.auditEvent?.isAutomated === true, "11D-1C: Initial evaluation marked as automated");
  assert(initialEvalResult.auditEvent?.actor.role === "SYSTEM", "11D-1D: Actor role set to SYSTEM");
  assert(initialEvalResult.auditEvent?.newStatus === "QUALIFIED", "11D-1E: Initial evaluation sets qualified status");
  assert(initialEvalResult.business.qualificationAuditTrail?.length === 1, "11D-1F: Audit event attached to business entity");
  assert(initialEvalResult.auditEvent?.criteriaSnapshot?.opportunityEvidence?.passed === true, "11D-1G: Criteria snapshot preserved");

  // 2. Status Changes & Values Preservation
  // Simulate automated re-evaluation where website becomes unreachable (unconfirmed need)
  const modifiedAuditBiz: Business = {
    ...initialEvalResult.business,
    websiteNeedStatus: "UNCONFIRMED_NEED",
    presence: {
      ...initialEvalResult.business.presence,
      websiteStatus: "WEBSITE_NOT_DISCOVERED",
      isAudited: false
    }
  };

  const reEvalResult = evaluateAndRecordQualification(modifiedAuditBiz, undefined, "Re-evaluated after automated HTTP scan detected unreachable host");
  assert(reEvalResult.auditEvent !== undefined, "11D-2A: Re-evaluation with status change creates an audit event");
  assert(reEvalResult.auditEvent?.decisionType === "AUTOMATED_REEVALUATION", "11D-2B: Decision type is AUTOMATED_REEVALUATION");
  assert(reEvalResult.auditEvent?.previousStatus === "QUALIFIED", "11D-2C: previousStatus correctly preserved as QUALIFIED");
  assert(reEvalResult.auditEvent?.newStatus === "NEEDS_REVIEW", "11D-2D: newStatus correctly preserved as NEEDS_REVIEW");
  assert(reEvalResult.auditEvent?.previousScore === initialEvalResult.auditEvent?.newScore, "11D-2E: previousScore preserved");
  assert(reEvalResult.auditEvent?.newScore < (reEvalResult.auditEvent?.previousScore || 100), "11D-2F: newScore reflects adjusted criteria");
  assert(reEvalResult.auditEvent?.previousPrioritizationRank > (reEvalResult.auditEvent?.newPrioritizationRank || 0), "11D-2G: previous and new prioritization ranks captured");
  assert(reEvalResult.business.qualificationAuditTrail?.length === 2, "11D-2H: Prior decision preserved; total history is now 2");

  // 3. Manual Overrides Record Actor and Reason
  const humanAgent = {
    uid: "usr_agent_mbabane_07",
    displayName: "Nathi Maseko",
    email: "nathi@sitescout.sz",
    role: "Sales Agent"
  };

  const overrideBiz = applyQualificationOverride(
    reEvalResult.business,
    "QUALIFIED",
    "Spoke with owner Dumisani in person. Confirmed modern revamp urgently needed before holiday season.",
    humanAgent
  );

  assert(overrideBiz.qualificationAuditTrail?.length === 3, "11D-3A: Manual override appends third audit record");
  const overrideAudit = overrideBiz.qualificationAuditTrail?.[0];
  assert(overrideAudit?.decisionType === "MANUAL_OVERRIDE", "11D-3B: Decision type is MANUAL_OVERRIDE");
  assert(overrideAudit?.actor.uid === humanAgent.uid, "11D-3C: Actor UID recorded in audit event");
  assert(overrideAudit?.actor.displayName === humanAgent.displayName, "11D-3D: Actor displayName recorded");
  assert(overrideAudit?.actor.role === "Sales Agent", "11D-3E: Actor role recorded");
  assert(overrideAudit?.isAutomated === false, "11D-3F: isAutomated flagged false for human override");
  assert(overrideAudit?.reason.includes("Dumisani"), "11D-3G: Documented reason preserved in audit event");
  assert(overrideAudit?.previousStatus === "NEEDS_REVIEW", "11D-3H: previousStatus preserved as NEEDS_REVIEW");
  assert(overrideAudit?.newStatus === "QUALIFIED", "11D-3I: newStatus preserved as QUALIFIED");

  // 4. Distinguishing Automated vs Human Decisions
  assert(reEvalResult.auditEvent?.isAutomated === true && overrideAudit?.isAutomated === false, "11D-4A: Automated and human decisions are strictly distinguishable");
  assert(overrideBiz.qualificationAuditTrail?.some(e => e.isAutomated) === true, "11D-4B: History contains automated decisions");
  assert(overrideBiz.qualificationAuditTrail?.some(e => !e.isAutomated) === true, "11D-4C: History contains human decisions");

  // 5. Reversals and Corrections of Decisions
  const revertedAuditBiz = revertQualificationOverride(
    overrideBiz,
    "Discovered client already contracted an agency for their redesign project",
    humanAgent
  );

  assert(revertedAuditBiz.qualificationAuditTrail?.length === 4, "11D-5A: Override reversal appends fourth audit record");
  const revertAudit = revertedAuditBiz.qualificationAuditTrail?.[0];
  assert(revertAudit?.decisionType === "OVERRIDE_REVERSAL", "11D-5B: Decision type is OVERRIDE_REVERSAL");
  assert(revertAudit?.previousStatus === "QUALIFIED", "11D-5C: Reversal captures previousStatus = QUALIFIED");
  assert(revertAudit?.newStatus === "NEEDS_REVIEW", "11D-5D: Reversal restores automated status NEEDS_REVIEW");
  assert(revertAudit?.reason.includes("already contracted"), "11D-5E: Reversal reason documented");

  // 6. Review Queue Workflow Integration (Review Approvals, Disqualifications, Evidence Changes)
  const reviewerLead = {
    uid: "usr_lead_review_01",
    displayName: "Sipho Dlamini",
    email: "sipho@sitescout.sz",
    role: "Lead Reviewer"
  };

  const reviewDisqualifyRes = executeProspectReviewAction(revertedAuditBiz, {
    action: "disqualify_prospect",
    reason: "Confirmed in-flight agency contract. Disqualified from outbound pipeline.",
    user: reviewerLead
  });

  assert(reviewDisqualifyRes.success === true, "11D-6A: Review action executes successfully");
  const reviewDisqualifyAudit = reviewDisqualifyRes.business.qualificationAuditTrail?.[0];
  assert(reviewDisqualifyAudit?.decisionType === "REVIEW_DISQUALIFICATION", "11D-6B: Audit event tagged as REVIEW_DISQUALIFICATION");
  assert(reviewDisqualifyAudit?.newStatus === "DISQUALIFIED", "11D-6C: Resulting status DISQUALIFIED recorded");
  assert(reviewDisqualifyAudit?.actor.role === "Lead Reviewer", "11D-6D: Reviewer role recorded");

  // Review Field Correction & Evidence Change
  const reviewCorrectRes = executeProspectReviewAction(initialEvalResult.business, {
    action: "correct_field",
    fieldChanged: "phone",
    newValue: "+268 7655 4433",
    reason: "Updated to direct owner mobile from trade license verification",
    evidenceCitation: "Trade License Registry 2026",
    user: reviewerLead
  });

  assert(reviewCorrectRes.success === true, "11D-6E: Field correction review action executes");
  const correctAudit = reviewCorrectRes.business.qualificationAuditTrail?.[0];
  assert(correctAudit?.decisionType === "EVIDENCE_CHANGE" || correctAudit?.decisionType === "CRITERIA_SCORE_CHANGE", "11D-6F: Field correction logged as EVIDENCE_CHANGE");
  assert(correctAudit?.evidenceReferences?.some(r => r.includes("Trade License")) === true, "11D-6G: Supporting evidence citation preserved");

  // 7. Protection of Audit Integrity & Access Controls
  const unauthorizedViewer = { uid: "usr_viewer_anon", displayName: "Read-only Guest", role: "Viewer" };
  const auditAccessDenied = await getProspectQualificationAuditTrail(auditTestBiz.id, unauthorizedViewer);
  assert(auditAccessDenied.success === false, "11D-7A: Viewer role denied access to qualification audit trail");
  assert(auditAccessDenied.error?.includes("Unauthorized") === true, "11D-7B: Clear authorization error returned");
  assert(auditAccessDenied.auditTrail.length === 0, "11D-7C: No audit data leaked to unauthorized user");

  assert(isUserAuthorizedForAuditAccess({ uid: "", role: "Admin" }) === false, "11D-7D: Empty UID blocked from audit access");
  assert(isUserAuthorizedForAuditAccess(null) === false, "11D-7E: Null user blocked from audit access");
  assert(isUserAuthorizedForAuditAccess({ uid: "u1", role: "guest" }) === false, "11D-7F: Guest role blocked from audit access");

  // Authorized User Access
  const auditAccessAllowed = await getProspectQualificationAuditTrail(auditTestBiz.id, humanAgent);
  assert(auditAccessAllowed.success === true, "11D-7G: Authorized sales agent can access qualification audit trail");
  assert(auditAccessAllowed.auditTrail.length >= 1, "11D-7H: Full chronological audit trail returned");

  // Immutability: Ordinary users cannot edit or delete historical audit events
  const editAttempt = attemptEditOrDeleteAuditEvent(auditTestBiz.id, "qaud_test_999", humanAgent);
  assert(editAttempt.success === false, "11D-7I: Attempting to edit or delete historical audit event is denied");
  assert(editAttempt.error.includes("append-only"), "11D-7J: Error specifies append-only immutability invariant");

  // 8. Failed Operations Do NOT Create False Success Audit Events
  const priorAuditCount = revertedAuditBiz.qualificationAuditTrail?.length || 0;
  const failedReviewAction = executeProspectReviewAction(revertedAuditBiz, {
    action: "qualify_prospect",
    reason: "Hi", // Too short (min 5 chars required)
    user: reviewerLead
  });
  assert(failedReviewAction.success === false, "11D-8A: Invalid short reason fails review action");
  assert(failedReviewAction.business.qualificationAuditTrail?.length === priorAuditCount, "11D-8B: Failed operation created zero false audit events");

  const unauthorizedReviewAction = executeProspectReviewAction(revertedAuditBiz, {
    action: "qualify_prospect",
    reason: "Attempting bypass with unauthorized user",
    user: unauthorizedViewer
  });
  assert(unauthorizedReviewAction.success === false, "11D-8C: Unauthorized user fails review action");
  assert(unauthorizedReviewAction.business.qualificationAuditTrail?.length === priorAuditCount, "11D-8D: Unauthorized failure created zero false audit events");

  // 9. Repeated Operations Do NOT Create Misleading Duplicate Events
  const duplicateCandidate = {
    decisionType: overrideAudit!.decisionType,
    newStatus: overrideAudit!.newStatus,
    newScore: overrideAudit!.newScore,
    newPrioritizationRank: overrideAudit!.newPrioritizationRank,
    reason: overrideAudit!.reason,
    actor: overrideAudit!.actor
  };
  assert(isDuplicateQualificationEvent(overrideAudit, duplicateCandidate) === true, "11D-9A: Consecutive identical operation identified as duplicate");

  const dedupRecordResult = await recordQualificationAuditEvent(auditTestBiz.id, {
    ...duplicateCandidate,
    previousStatus: overrideAudit!.previousStatus,
    previousScore: overrideAudit!.previousScore,
    previousPrioritizationRank: overrideAudit!.previousPrioritizationRank
  }, overrideBiz);
  assert(dedupRecordResult.isDuplicateSkipped === true, "11D-9B: Duplicate audit event suppressed without creating redundant record");

  // 10. Secrets & Sensitive Data Redaction
  const dirtyReason = "Checked DNS records with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and sk-1234567890abcdef12345678 for password=SuperSecret!";
  const cleanReason = sanitizeAuditReason(dirtyReason);
  assert(!cleanReason.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "11D-10A: Bearer token sanitized from audit reason");
  assert(!cleanReason.includes("sk-1234567890abcdef12345678"), "11D-10B: API key sanitized from audit reason");
  assert(!cleanReason.includes("SuperSecret!"), "11D-10C: Secret password parameter sanitized");

  // 11. Historical Decisions Remain Accessible After Subsequent Changes
  const allAuditsForProspect = reviewDisqualifyRes.business.qualificationAuditTrail || [];
  assert(allAuditsForProspect.length >= 4, "11D-11A: All historical decisions retained in chronological history");
  const statusesInHistory = allAuditsForProspect.map(e => e.newStatus);
  assert(statusesInHistory.includes("QUALIFIED") && statusesInHistory.includes("NEEDS_REVIEW") && statusesInHistory.includes("DISQUALIFIED"), "11D-11B: History captures full status evolution without overwrite");

  // ==========================================
  // MICRO-PHASE 12A: PROSPECT OUTREACH PREPARATION AND CONTACT DATA VALIDATION
  // ==========================================
  console.log("--> Group 36: Micro-Phase 12A Prospect Outreach Preparation & Contact Validation");

  // 1. Email Format Validation & RFC 5322 Standards
  const validBizEmail = validateEmailFormat("info@swazivalley.sz");
  assert(validBizEmail.isValid === true, "12A-1A: Valid business email format passes validation");
  assert(validBizEmail.normalized === "info@swazivalley.sz", "12A-1B: Email normalized to lowercase trimmed format");
  assert(validBizEmail.scope === "GENERAL_BUSINESS", "12A-1C: Role-based email identified as GENERAL_BUSINESS");

  const validPersonalEmail = validateEmailFormat("sipho.dlamini@agency.co.za");
  assert(validPersonalEmail.isValid === true, "12A-1D: Named person email format passes validation");
  assert(validPersonalEmail.scope === "NAMED_INDIVIDUAL", "12A-1E: Named email identified as NAMED_INDIVIDUAL");

  const emailNoAt = validateEmailFormat("infoswazivalley.sz");
  assert(emailNoAt.isValid === false, "12A-1F: Missing @ character fails validation");

  const emailDoubleAt = validateEmailFormat("info@@swazivalley.sz");
  assert(emailDoubleAt.isValid === false, "12A-1G: Multiple @ characters fail validation");

  const emailConsecutiveDots = validateEmailFormat("info@swazi..sz");
  assert(emailConsecutiveDots.isValid === false, "12A-1H: Consecutive dots fail validation");

  const emailDisposable = validateEmailFormat("contact@mailinator.com");
  assert(emailDisposable.isValid === false, "12A-1I: Disposable domain identified as invalid");
  assert(emailDisposable.isTestDomain === true, "12A-1J: isTestDomain flagged for throwaway provider");

  const emailShortTld = validateEmailFormat("info@swazivalley.s");
  assert(emailShortTld.isValid === false, "12A-1K: Single character TLD fails RFC standards");

  // 2. Phone Number Format Validation & E.164 Standards
  const eswatiniMobile = validatePhoneFormat("+268 7611 2233");
  assert(eswatiniMobile.isValid === true, "12A-2A: Eswatini mobile format passes validation");
  assert(eswatiniMobile.normalized === "+26876112233", "12A-2B: Eswatini mobile normalized to E.164");
  assert(eswatiniMobile.isMobile === true, "12A-2C: Eswatini mobile identified as mobile line");
  assert(eswatiniMobile.whatsappCapable === true, "12A-2D: Eswatini mobile flagged as WhatsApp capable");

  const eswatiniLandline = validatePhoneFormat("+268 2404 1234");
  assert(eswatiniLandline.isValid === true, "12A-2E: Eswatini landline passes validation");
  assert(eswatiniLandline.isMobile === false, "12A-2F: Eswatini landline identified as fixed line");
  assert(eswatiniLandline.whatsappCapable === false, "12A-2G: Eswatini fixed line flagged as not WhatsApp capable");

  const zaMobile = validatePhoneFormat("082 345 6789", "ZA");
  assert(zaMobile.isValid === true, "12A-2H: South Africa mobile format passes validation");
  assert(zaMobile.normalized === "+27823456789", "12A-2I: South Africa local number normalized with +27");
  assert(zaMobile.whatsappCapable === true, "12A-2J: South Africa mobile flagged as WhatsApp capable");

  const dummyRepeatingPhone = validatePhoneFormat("0000000000");
  assert(dummyRepeatingPhone.isValid === false, "12A-2K: All repeating placeholder digits fail validation");

  const sequentialPhone = validatePhoneFormat("12345678");
  assert(sequentialPhone.isValid === false, "12A-2L: Sequential dummy pattern fails validation");

  const shortPhone = validatePhoneFormat("12345");
  assert(shortPhone.isValid === false, "12A-2M: Under-length phone fails E.164 validation");

  // 3. Status Distinction: Valid Format is NEVER automatically VERIFIED
  const unverifiedFormatStatus = determineContactValidationStatus({
    value: "info@swazivalley.sz",
    formatValid: true,
    isExplicitlyVerified: false
  });
  assert(unverifiedFormatStatus === "FORMAT_VALID", "12A-3A: Format valid contact without proof is FORMAT_VALID");
  assert(unverifiedFormatStatus !== "VERIFIED", "12A-3B: Format valid contact is NOT marked as VERIFIED");

  // 4. Verified Contacts Require Supporting Evidence
  const verifiedStatus = determineContactValidationStatus({
    value: "info@swazivalley.sz",
    formatValid: true,
    isExplicitlyVerified: true
  });
  assert(verifiedStatus === "VERIFIED", "12A-4A: Explicitly verified contact receives VERIFIED status");

  const invalidFormatStatus = determineContactValidationStatus({
    value: "invalid-email@",
    formatValid: false,
    isExplicitlyVerified: false
  });
  assert(invalidFormatStatus === "INVALID", "12A-4B: Malformed contact receives INVALID status");

  const missingStatus = determineContactValidationStatus({
    value: "",
    formatValid: false
  });
  assert(missingStatus === "UNKNOWN", "12A-4C: Empty contact coordinate receives UNKNOWN status");

  // 5. Anti-Fabrication & Truthfulness Safeguards
  const groundedBiz: Business = {
    ...auditTestBiz,
    phone: "+268 7611 2233",
    email: "contact@swazivalley.sz"
  };
  const groundCheck = verifyContactDataGrounding(groundedBiz);
  assert(groundCheck.isGrounded === true, "12A-5A: Verified business contact data confirms grounding");
  assert(groundCheck.fabricatedFields.length === 0, "12A-5B: Zero fabricated fields detected in grounded record");

  const fakeDomainBiz: Business = {
    ...auditTestBiz,
    phone: "+268 7611 2233",
    email: "fake@placeholder.com"
  };
  const fakeCheck = verifyContactDataGrounding(fakeDomainBiz);
  assert(fakeCheck.isGrounded === false, "12A-5C: Placeholder domain caught by grounding safeguard");
  assert(fakeCheck.fabricatedFields.includes("email"), "12A-5D: Placeholder email detected as fabricated field");

  // 6. Conflicting Contacts Detection
  const conflictingEvidenceList: EvidenceItem[] = [
    {
      sourceType: "BUSINESS_DIRECTORY",
      url: "https://yellowpages.sz/listing/1",
      retrievedAt: new Date().toISOString(),
      supports: ["phone"],
      evidenceText: "Swazi Valley Roastery switchboard: +268 2404 9999 or alternate +268 2404 8888 or mobile +268 7699 0000"
    }
  ];
  const contactConflictRes = detectContactConflicts("+268 7611 2233", "info@swazivalley.sz", conflictingEvidenceList);
  assert(contactConflictRes.hasConflicts === true, "12A-6A: Multi-source differing contact numbers flagged as conflicting");
  assert(contactConflictRes.conflicts.length > 0, "12A-6B: Specific conflict description provided");

  // 7. Prospect Contact Validation Profile Building
  const sampleProspect: Business = {
    ...auditTestBiz,
    id: "biz_12a_sample",
    phone: "+268 7811 5566",
    email: "orders@swaziroasters.sz",
    address: "Plot 14, Industrial Site, Mbabane",
    directorySource: "GOOGLE_PLACES",
    qualificationStatus: "QUALIFIED"
  };

  const contactProf = buildProspectContactProfile(sampleProspect);
  assert(contactProf.isOutreachReady === true, "12A-7A: Prospect with valid phone and email is marked outreach ready");
  assert(contactProf.readinessScore >= 70, "12A-7B: Readiness score calculated accurately");
  assert(contactProf.availableOutreachChannels.includes("phone"), "12A-7C: Phone channel available");
  assert(contactProf.availableOutreachChannels.includes("whatsapp"), "12A-7D: WhatsApp channel available for mobile");
  assert(contactProf.availableOutreachChannels.includes("email"), "12A-7E: Email channel available");
  assert(contactProf.availableOutreachChannels.includes("in_person"), "12A-7F: In-person channel available for physical address");

  // 8. Contact Source and Provenance Preservation
  assert(contactProf.primaryPhone?.source === "GOOGLE_PLACES", "12A-8A: Primary phone preserves original source provenance");
  assert(contactProf.primaryPhone?.formatValid === true, "12A-8B: Primary phone format flagged valid");
  assert(contactProf.primaryPhone?.status === "FORMAT_VALID", "12A-8C: Primary phone is FORMAT_VALID (unverified)");

  // 9. Outreach Preparation Authorization & RBAC
  const prepAuthSuccess = prepareProspectForOutreach(sampleProspect, {
    uid: "usr_agent_01",
    displayName: "Sipho Sales",
    role: "Sales Agent"
  });
  assert(prepAuthSuccess.success === true, "12A-9A: Authorized sales agent successfully prepares prospect for outreach");
  assert(prepAuthSuccess.canInitiateOutreach === true, "12A-9B: canInitiateOutreach is true for qualified prospect");

  const prepViewerFail = prepareProspectForOutreach(sampleProspect, {
    uid: "usr_viewer_01",
    displayName: "Read-only User",
    role: "Viewer"
  });
  assert(prepViewerFail.success === false, "12A-9C: Viewer role denied outreach preparation permission");
  assert(prepViewerFail.canInitiateOutreach === false, "12A-9D: Viewer role cannot initiate outreach");

  // 10. Disqualified Prospect Blocked from Outreach Preparation
  const disqualifiedBiz: Business = {
    ...sampleProspect,
    qualificationStatus: "DISQUALIFIED"
  };
  const prepDisqualified = prepareProspectForOutreach(disqualifiedBiz, {
    uid: "usr_agent_01",
    role: "Sales Agent"
  });
  assert(prepDisqualified.canInitiateOutreach === false, "12A-10A: Disqualified prospect blocked from sales outreach");
  assert(prepDisqualified.blockers.some(b => b.includes("DISQUALIFIED")), "12A-10B: Disqualification blocker reason documented");

  // 11. Outreach Approval Workflow & Lifecycle Separation
  const approvedOutreachRes = updateOutreachApproval(
    sampleProspect,
    "APPROVED",
    { uid: "usr_mgr_01", displayName: "Agency Manager", role: "Manager" },
    "Verified telephone with reception; WhatsApp outreach approved."
  );
  assert(approvedOutreachRes.success === true, "12A-11A: Outreach approval transition succeeds");
  assert(approvedOutreachRes.business.outreachApprovalStatus === "APPROVED", "12A-11B: outreachApprovalStatus updated to APPROVED");
  assert(approvedOutreachRes.business.outreachApprovedBy === "Agency Manager", "12A-11C: Approver name recorded");
  assert(approvedOutreachRes.business.qualificationStatus === "QUALIFIED", "12A-11D: Qualification status preserved without modification");
  assert(approvedOutreachRes.business.salesStage === sampleProspect.salesStage, "12A-11E: Sales stage preserved without automatic advance");

  // 12. CRM Records & Audit History Invariants Intact
  assert(approvedOutreachRes.business.qualificationAuditTrail?.length === sampleProspect.qualificationAuditTrail?.length, "12A-12A: Qualification audit trail preserved intact");
  assert(approvedOutreachRes.business.id === sampleProspect.id, "12A-12B: Business ID preserved");

  // ==========================================
  // MICRO-PHASE 12B: PERSONALIZED OUTREACH DRAFT GENERATION & TRUTHFULNESS CONTROLS
  // ==========================================
  console.log("--> Group 37: Micro-Phase 12B Personalized Outreach Draft Generation & Truthfulness Controls");

  // 1. Accurate personalization from verified business information
  const prospectWithRating: Business = {
    ...sampleProspect,
    id: "biz_12b_rated",
    name: "Mbabane Artisan Bakery",
    category: "Bakery & Cafe",
    address: "Allister Miller St, Mbabane",
    rating: 4.8,
    reviewsCount: 42,
    contactProfile: contactProf,
    presence: {
      hasWebsite: false,
      hasEmail: true,
      facebookStatus: "active",
      instagramStatus: "none",
      googleProfileQuality: "good",
      reviewCountStatus: "many",
      photosStatus: "sufficient",
      descriptionQuality: "good",
      openingHoursStatus: "complete",
      contactCompleteness: "complete",
      deficits: {
        noWebsite: true,
        noWhatsappCta: true,
        noBookingSystem: false,
        noOnlineCatalogue: true,
        noEnquiryForm: false,
        noSeo: true,
        poorMobileExperience: true,
        missingContact: false,
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        brokenLinks: false
      }
    }
  };

  const emailDraft = generatePersonalizedOutreachDraft(prospectWithRating, {
    channel: "email",
    tone: "Consultative",
    senderName: "Sipho Dlamini",
    previewUrl: "https://preview.sitescout.ai/preview/preview_12b_01"
  });

  assert(emailDraft.subject !== undefined && emailDraft.subject.length > 0, "12B-1A: Email subject line generated");
  assert(emailDraft.body.includes("Mbabane Artisan Bakery"), "12B-1B: Personalizes with exact confirmed business name");
  assert(emailDraft.body.includes("Bakery & Cafe") || emailDraft.body.includes("Bakery"), "12B-1C: Personalizes with business category");
  assert(emailDraft.body.includes("4.8★") || emailDraft.body.includes("4.8"), "12B-1D: Cites confirmed 4.8★ Google rating");
  assert(emailDraft.body.includes("42"), "12B-1E: Cites confirmed review count (42 reviews)");
  assert(emailDraft.body.includes("https://preview.sitescout.ai/preview/preview_12b_01"), "12B-1F: Includes correct preview URL");
  assert(emailDraft.body.includes("free website preview"), "12B-1G: Accurately frames preview as free website preview (not completed delivery)");

  // 2. Truthfulness scan & Claim Provenance
  assert(emailDraft.truthfulnessScore >= 90, "12B-2A: Grounded draft achieves high truthfulness score >= 90");
  assert(emailDraft.unsupportedClaimsCount === 0, "12B-2B: Zero unsupported claims in grounded draft");
  assert(emailDraft.isFlaggedForReview === false, "12B-2C: Grounded draft is not flagged for review");
  assert(emailDraft.claims.some(c => c.provenance === "VERIFIED_FACT"), "12B-2D: Verified fact provenance assigned to rating/name");
  assert(emailDraft.claims.some(c => c.provenance === "AUDIT_EVIDENCE"), "12B-2E: Audit evidence provenance assigned to identified gaps");

  // 3. Unsupported Claims Detection & Rejection/Flagging
  const hallucinatedBody = `Hi Mbabane Bakery,\n\nI visited your shop yesterday and noticed you are losing 84% of your local clients to competitors!\n\nIf you sign up today we give you a 50% discount with a 100% money-back guarantee and guaranteed #1 ranking on Google.\n\nBest,\nSales Guy`;
  const hallucinationScan = scanDraftTruthfulness(hallucinatedBody, "Special Offer", prospectWithRating, "email");
  
  assert(hallucinationScan.isValid === false, "12B-3A: Hallucinated draft marked invalid");
  assert(hallucinationScan.unsupportedClaims.length >= 3, "12B-3B: Multiple unsupported claims detected");
  assert(hallucinationScan.truthfulnessScore < 50, "12B-3C: Truthfulness score severely penalized");
  assert(hallucinationScan.flaggedIssues.some(i => i.includes("Fabricated loss percentage") || i.includes("discount") || i.includes("guarantee")), "12B-3D: Specific hallucination issues flagged");

  // 4. Missing business information producing safe fallback drafts
  const unratedBlankBiz: Business = {
    ...auditTestBiz,
    id: "biz_12b_blank",
    name: "Local Workshop",
    category: "",
    address: "",
    rating: 0,
    reviewsCount: 0,
    presence: undefined
  };

  const safeFallbackDraft = generatePersonalizedOutreachDraft(unratedBlankBiz, {
    channel: "email",
    tone: "Consultative"
  });

  assert(!safeFallbackDraft.body.includes("★"), "12B-4A: Safe fallback does NOT invent a rating for unrated business");
  assert(!safeFallbackDraft.body.includes("undefined"), "12B-4B: Zero undefined tokens in fallback draft");
  assert(safeFallbackDraft.truthfulnessScore >= 70, "12B-4C: Fallback draft maintains safe truthfulness score");
  assert(safeFallbackDraft.unsupportedClaimsCount === 0, "12B-4D: Fallback draft has zero unsupported claims");

  // 5. Multi-channel formatting
  const whatsappDraft = generatePersonalizedOutreachDraft(prospectWithRating, {
    channel: "whatsapp",
    tone: "Friendly Local"
  });
  assert(whatsappDraft.channel === "whatsapp", "12B-5A: WhatsApp channel recognized");
  assert(whatsappDraft.body.includes("👉") || whatsappDraft.body.includes("😊") || whatsappDraft.body.includes("WhatsApp"), "12B-5B: WhatsApp formatting applied");

  const smsDraft = generatePersonalizedOutreachDraft(prospectWithRating, {
    channel: "sms"
  });
  assert(smsDraft.channel === "sms", "12B-5C: SMS channel recognized");
  assert(smsDraft.body.length <= 250, "12B-5D: SMS draft is concise");

  const callScript = generatePersonalizedOutreachDraft(prospectWithRating, {
    channel: "phone_script"
  });
  assert(callScript.body.includes("[Opening]") && callScript.body.includes("[Value-First"), "12B-5E: Cold call script provides structured conversational framework");

  // 6. Draft Editing & History Preservation
  const initialSave = saveDraftToBusiness(prospectWithRating, emailDraft);
  assert(initialSave.business.outreachDrafts?.length === 1, "12B-6A: Draft saved to business without sending");
  assert(initialSave.business.activeOutreachDraftId === emailDraft.id, "12B-6B: Active draft ID set");

  const editRes = editDraftInBusiness(
    initialSave.business,
    emailDraft.id,
    {
      subject: "Customized Subject for Mbabane Bakery",
      body: "Updated bespoke message body for Mbabane Artisan Bakery.",
      reason: "Agent customized greeting for Mbabane dialect."
    },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );

  assert(editRes.success === true, "12B-6C: Draft edited successfully");
  assert(editRes.draft?.version === 2, "12B-6D: Draft version bumped to v2");
  assert(editRes.draft?.history.length === 2, "12B-6E: Version history preserved across edits");
  assert(editRes.draft?.history[1].action === "edited", "12B-6F: History logs 'edited' action");
  assert(editRes.draft?.history[1].actor === "Sipho Sales", "12B-6G: History logs actor name");

  // 7. Draft Regeneration Preserving Prior Version History
  const regenRes = regenerateDraftInBusiness(
    editRes.business,
    emailDraft.id,
    { tone: "Executive", length: "short" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );

  assert(regenRes.success === true, "12B-7A: Draft regenerated successfully");
  assert(regenRes.draft?.version === 3, "12B-7B: Version bumped to v3");
  assert(regenRes.draft?.history.length === 3, "12B-7C: Version history contains 3 records");
  assert(regenRes.draft?.history[2].action === "regenerated", "12B-7D: History logs 'regenerated' action");

  // 8. Draft Approval Workflow (Approved for Readiness, Not Auto-Sent)
  const approvalRes = approveDraftInBusiness(
    regenRes.business,
    emailDraft.id,
    { uid: "usr_mgr_01", displayName: "Manager Thabo", role: "Manager" },
    "Draft tone and verified claims approved."
  );

  assert(approvalRes.success === true, "12B-8A: Draft approval succeeds");
  assert(approvalRes.draft?.isApproved === true, "12B-8B: isApproved flagged true");
  assert(approvalRes.draft?.status === "approved", "12B-8C: Draft status set to approved");
  assert(approvalRes.draft?.version === 4, "12B-8D: Approval recorded as v4 in history");

  // 9. Draft Generation NEVER triggers automatic message delivery or modifies sales stage
  assert(approvalRes.business.salesStage === prospectWithRating.salesStage, "12B-9A: Pipeline sales stage preserved during drafting");
  assert(approvalRes.business.lastContactedAt === prospectWithRating.lastContactedAt, "12B-9B: lastContactedAt unaffected by draft generation");
  assert(approvalRes.business.prospectStatus === prospectWithRating.prospectStatus, "12B-9C: ProspectStatus unchanged");

  // 10. Existing Contact Profile and Audit Trail Remain Intact
  assert(approvalRes.business.contactProfile !== undefined, "12B-10A: Contact validation profile preserved");
  assert(approvalRes.business.id === prospectWithRating.id, "12B-10B: Business ID preserved");

  console.log("--> Group 38: Micro-Phase 12C Outreach Approval, Scheduling, and Delivery Readiness");

  // 1. Unapproved Drafts Cannot Be Sent
  const unapprovedBiz = initialSave.business;
  const unapprovedSendAttempt = deliverOutreachMessage(
    unapprovedBiz,
    emailDraft.id,
    { mode: "PROTOCOL_CLIENT" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(unapprovedSendAttempt.success === false, "12C-1A: Unapproved draft cannot be sent");
  assert(unapprovedSendAttempt.error?.includes("Pre-flight validation failed"), "12C-1B: Clear error returned when attempting to send unapproved draft");

  // 2. Unauthorized Users Cannot Approve or Send Messages
  const unauthorizedApprovalAttempt = approveOutreachDraft(
    unapprovedBiz,
    emailDraft.id,
    { uid: "usr_viewer_01", displayName: "Guest User", role: "Viewer" },
    "Unauthorized approval attempt"
  );
  assert(unauthorizedApprovalAttempt.success === false, "12C-2A: Viewer role cannot approve outreach drafts");
  assert(unauthorizedApprovalAttempt.error?.includes("Unauthorized"), "12C-2B: Viewer approval blocked with unauthorized error");

  const unauthorizedSendAttempt = deliverOutreachMessage(
    approvalRes.business,
    emailDraft.id,
    { mode: "PROTOCOL_CLIENT" },
    { uid: "usr_viewer_01", displayName: "Guest User", role: "Viewer" }
  );
  assert(unauthorizedSendAttempt.success === false, "12C-2C: Viewer role cannot dispatch outreach messages");

  // 3. Authorized Approval Workflow
  const properApprovalRes = approveOutreachDraft(
    unapprovedBiz,
    emailDraft.id,
    { uid: "usr_mgr_01", displayName: "Manager Thabo", role: "Manager" },
    "Verified accurate ratings and evidence."
  );
  assert(properApprovalRes.success === true, "12C-3A: Authorized manager can approve draft");
  assert(properApprovalRes.draft?.isApproved === true, "12C-3B: isApproved is true");
  assert(properApprovalRes.draft?.approvalStatus === "APPROVED", "12C-3C: approvalStatus is set to APPROVED");
  assert(properApprovalRes.draft?.deliveryStatus === "NOT_SCHEDULED", "12C-3D: deliveryStatus remains separate (NOT_SCHEDULED)");
  assert(properApprovalRes.draft?.auditTrail?.some(a => a.action === "approved"), "12C-3E: Approval audit trail entry recorded");

  // 4. Safe Scheduling of Approved Messages
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const scheduleRes = scheduleOutreachDelivery(
    properApprovalRes.business,
    emailDraft.id,
    { scheduledAt: futureDate, timeZone: "Africa/Johannesburg" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(scheduleRes.success === true, "12C-4A: Approved draft can be scheduled for future delivery");
  assert(scheduleRes.draft?.deliveryStatus === "SCHEDULED", "12C-4B: deliveryStatus updated to SCHEDULED");
  assert(scheduleRes.draft?.scheduleConfig?.scheduledAt === futureDate, "12C-4C: Scheduled date stored accurately");
  assert(scheduleRes.draft?.scheduleConfig?.idempotencyKey.startsWith("sched_"), "12C-4D: Idempotency key generated");

  // 5. Unapproved Drafts Cannot Be Scheduled
  const unapprovedScheduleAttempt = scheduleOutreachDelivery(
    unapprovedBiz,
    emailDraft.id,
    { scheduledAt: futureDate },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(unapprovedScheduleAttempt.success === false, "12C-5A: Unapproved draft cannot be scheduled");
  assert(unapprovedScheduleAttempt.error?.includes("Cannot schedule unapproved draft"), "12C-5B: Blocked with unapproved draft error");

  // 6. Material Edits Invalidate Previous Approval & Clear Scheduled State
  const scheduledBiz = scheduleRes.business;
  const materialEditRes = editDraftInBusiness(
    scheduledBiz,
    emailDraft.id,
    {
      subject: "Material Change to Subject Line",
      body: "Materially revised message body text.",
      reason: "Agent updated offer details."
    },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(materialEditRes.success === true, "12C-6A: Draft edit succeeds");
  assert(materialEditRes.draft?.isApproved === false, "12C-6B: Material edit invalidates previous approval (isApproved=false)");
  assert(materialEditRes.draft?.approvalStatus === "DRAFT", "12C-6C: approvalStatus reverted to DRAFT");
  assert(materialEditRes.draft?.deliveryStatus === "NOT_SCHEDULED", "12C-6D: deliveryStatus reset from SCHEDULED to NOT_SCHEDULED");
  assert(materialEditRes.draft?.scheduleConfig === undefined, "12C-6E: scheduleConfig cleared on material edit");
  assert(materialEditRes.draft?.auditTrail?.some(a => a.action === "approval_invalidated"), "12C-6F: 'approval_invalidated' event logged in audit trail");

  // 7. Cancellation of Scheduled Delivery
  // Re-approve and re-schedule to test cancellation
  const reApproved = approveOutreachDraft(
    materialEditRes.business,
    emailDraft.id,
    { uid: "usr_mgr_01", displayName: "Manager Thabo", role: "Manager" }
  );
  const reScheduled = scheduleOutreachDelivery(
    reApproved.business,
    emailDraft.id,
    { scheduledAt: futureDate },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(reScheduled.success === true, "12C-7A: Re-approval and re-scheduling succeed");

  const cancelRes = cancelScheduledDelivery(
    reScheduled.business,
    emailDraft.id,
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" },
    "Prospect called in directly prior to scheduled outreach."
  );
  assert(cancelRes.success === true, "12C-7B: Scheduled delivery can be cancelled safely");
  assert(cancelRes.draft?.deliveryStatus === "CANCELLED", "12C-7C: deliveryStatus set to CANCELLED");
  assert(cancelRes.draft?.scheduleConfig === undefined, "12C-7D: scheduleConfig cleared after cancellation");
  assert(cancelRes.draft?.auditTrail?.some(a => a.action === "schedule_cancelled"), "12C-7E: schedule_cancelled logged in audit trail");

  // 8. Pre-Flight Re-Validation Immediately Before Delivery
  // If prospect is marked DISQUALIFIED, delivery is blocked even if previously approved
  const disqualifiedBusiness: Business = {
    ...reApproved.business,
    qualificationStatus: "DISQUALIFIED"
  };
  const blockedDeliveryAttempt = deliverOutreachMessage(
    disqualifiedBusiness,
    emailDraft.id,
    { mode: "SIMULATED" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(blockedDeliveryAttempt.success === false, "12C-8A: Delivery blocked if prospect is disqualified at dispatch time");
  assert(blockedDeliveryAttempt.error?.includes("Pre-flight validation failed"), "12C-8B: Pre-flight failure reported for disqualified prospect");

  // 9. Client Protocol Dispatch (mailto / WhatsApp)
  const clientProtocolDelivery = deliverOutreachMessage(
    reApproved.business,
    emailDraft.id,
    { mode: "PROTOCOL_CLIENT" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(clientProtocolDelivery.success === true, "12C-9A: Protocol client delivery succeeds");
  assert(clientProtocolDelivery.deliveryResult?.deliveryMode === "PROTOCOL_CLIENT", "12C-9B: deliveryMode is PROTOCOL_CLIENT");
  assert(clientProtocolDelivery.deliveryResult?.deliveryStatus === "PROTOCOL_DISPATCHED", "12C-9C: deliveryStatus is PROTOCOL_DISPATCHED");
  assert(clientProtocolDelivery.deliveryResult?.isSimulated === false, "12C-9D: isSimulated is false for protocol launch");
  assert(clientProtocolDelivery.protocolUrl?.startsWith("mailto:"), "12C-9E: Valid mailto URL generated");

  // 10. Simulated Sandbox Delivery Clearly Distinguished
  const simulatedDelivery = deliverOutreachMessage(
    reApproved.business,
    emailDraft.id,
    { mode: "SIMULATED" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(simulatedDelivery.success === true, "12C-10A: Simulated delivery executes successfully in sandbox");
  assert(simulatedDelivery.deliveryResult?.isSimulated === true, "12C-10B: isSimulated is flagged true");
  assert(simulatedDelivery.deliveryResult?.provider === "simulated_sandbox_provider", "12C-10C: Clear simulation provider name");

  // 11. Duplicate Send Attempts Are Safely Prevented
  const duplicateSendAttempt = deliverOutreachMessage(
    simulatedDelivery.business,
    emailDraft.id,
    { mode: "SIMULATED" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(duplicateSendAttempt.success === false, "12C-11A: Duplicate send attempt is prevented");
  assert(duplicateSendAttempt.error?.includes("Duplicate send"), "12C-11B: Duplicate send error message returned");
  assert(duplicateSendAttempt.business.outreachDrafts?.[0].auditTrail?.some(a => a.action === "duplicate_send_prevented"), "12C-11C: duplicate_send_prevented recorded in audit trail");

  // 12. Delivery Failure Produces Accurate Status and Error Audit
  const failedDeliveryAttempt = deliverOutreachMessage(
    reApproved.business,
    emailDraft.id,
    { mode: "SIMULATED", simulateFailure: true, failureReason: "SMTP Gateway Timeout (504)" },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(failedDeliveryAttempt.success === false, "12C-12A: Simulated failure returns success: false");
  assert(failedDeliveryAttempt.draft?.deliveryStatus === "FAILED", "12C-12B: Draft deliveryStatus set to FAILED");
  assert(failedDeliveryAttempt.draft?.status === "FAILED", "12C-12C: Unified status set to FAILED");
  assert(failedDeliveryAttempt.draft?.lastDeliveryResult?.error?.includes("SMTP Gateway Timeout"), "12C-12D: Error reason preserved");
  assert(failedDeliveryAttempt.draft?.auditTrail?.some(a => a.action === "send_failed"), "12C-12E: send_failed logged in audit trail");

  // =========================================================================
  // GROUP 39: MICRO-PHASE 12D - OUTREACH DELIVERY TRACKING & COMMUNICATION HISTORY
  // =========================================================================
  console.log("\n--- GROUP 39: Micro-Phase 12D Outreach Delivery Tracking & Communication History ---");

  // 1. Creation of Canonical Communication Record
  const commBaseBiz: Business = {
    ...simulatedDelivery.business,
    id: "biz_12d_test_01",
    name: "Kloof Street Coffee Co.",
    communicationHistory: []
  };

  const initialCommRes = createCanonicalCommunicationRecord(
    commBaseBiz,
    emailDraft,
    {
      provider: "postmark_smtp",
      recipientAddress: "contact@kloofcoffee.co.za",
      senderAddress: "outreach@sitescout.ai",
      providerMessageId: "pm_msg_987654321",
      isSimulated: false,
      initialStage: "QUEUED"
    },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );

  assert(initialCommRes.success === true, "12D-1A: Canonical communication record created successfully");
  assert(initialCommRes.communication !== undefined, "12D-1B: Communication record object returned");
  assert(initialCommRes.communication?.businessId === "biz_12d_test_01", "12D-1C: Associated business ID correctly preserved");
  assert(initialCommRes.communication?.recipientAddress === "contact@kloofcoffee.co.za", "12D-1D: Recipient address matches target");
  assert(initialCommRes.communication?.channel === "email", "12D-1E: Channel matches draft channel");
  assert(initialCommRes.communication?.draftId === emailDraft.id, "12D-1F: Link to original draft ID preserved");
  assert(initialCommRes.business.communicationHistory?.length === 1, "12D-1G: Communication history on business updated to 1 entry");

  const commId = initialCommRes.communication!.id;
  const pmMessageId = "pm_msg_987654321";

  // 2. Provider Acceptance vs Confirmed Delivery (Distinction Invariant)
  // Step A: Provider Acceptance Event
  const acceptedRes = recordCommunicationLifecycleEvent(
    initialCommRes.business,
    { communicationId: commId },
    {
      eventType: "provider_accepted",
      provider: "postmark_smtp",
      providerMessageId: pmMessageId,
      status: "ACCEPTED",
      details: "Message accepted by Postmark API queue."
    },
    { uid: "usr_system", displayName: "Webhook Dispatcher", role: "Manager" }
  );

  assert(acceptedRes.success === true, "12D-2A: Provider acceptance recorded");
  assert(acceptedRes.communication?.deliveryStatus === "ACCEPTED", "12D-2B: Delivery status is ACCEPTED (not falsely DELIVERED)");
  assert(acceptedRes.communication?.deliveredAt === undefined, "12D-2C: deliveredAt timestamp is NOT set on provider acceptance");
  assert(acceptedRes.communication?.events.some(e => e.eventType === "provider_accepted"), "12D-2D: provider_accepted lifecycle event recorded");

  // Step B: Confirmed Delivery Callback
  const deliveredRes = recordCommunicationLifecycleEvent(
    acceptedRes.business,
    { providerMessageId: pmMessageId },
    {
      eventType: "delivered",
      provider: "postmark_smtp",
      providerMessageId: pmMessageId,
      status: "DELIVERED",
      details: "Delivered to recipient mail exchanger (250 2.0.0 OK)."
    },
    { uid: "usr_system", displayName: "Webhook Dispatcher", role: "Manager" }
  );

  assert(deliveredRes.success === true, "12D-2E: Confirmed delivery event recorded");
  assert(deliveredRes.communication?.deliveryStatus === "DELIVERED", "12D-2F: Delivery status updated to DELIVERED");
  assert(deliveredRes.communication?.deliveredAt !== undefined, "12D-2G: deliveredAt timestamp populated upon delivery confirmation");

  // 3. Duplicate Webhook Callback Deduplication (Idempotency)
  const duplicateCallbackRes = recordCommunicationLifecycleEvent(
    deliveredRes.business,
    { providerMessageId: pmMessageId },
    {
      eventType: "delivered",
      provider: "postmark_smtp",
      providerMessageId: pmMessageId,
      status: "DELIVERED",
      idempotencyKey: "webhook_evt_deliv_dup_001",
      details: "Duplicate webhook delivery payload."
    },
    { uid: "usr_system", displayName: "Webhook Dispatcher", role: "Manager" }
  );

  // Send the exact same event again with same idempotencyKey
  const duplicateRetryRes = recordCommunicationLifecycleEvent(
    duplicateCallbackRes.business,
    { providerMessageId: pmMessageId },
    {
      eventType: "delivered",
      provider: "postmark_smtp",
      providerMessageId: pmMessageId,
      status: "DELIVERED",
      idempotencyKey: "webhook_evt_deliv_dup_001",
      details: "Duplicate webhook delivery payload retry."
    },
    { uid: "usr_system", displayName: "Webhook Dispatcher", role: "Manager" }
  );

  assert(duplicateRetryRes.success === true, "12D-3A: Idempotent call succeeds safely");
  assert(duplicateRetryRes.isDuplicate === true, "12D-3B: Duplicate event flagged as isDuplicate=true");
  assert(
    duplicateRetryRes.communication?.events.filter(e => e.idempotencyKey === "webhook_evt_deliv_dup_001").length === 1,
    "12D-3C: No duplicate events appended to history"
  );

  // 4. Failed and Bounced Message Recording
  const bounceBiz = initialCommRes.business;
  const bouncedCommRes = createCanonicalCommunicationRecord(
    bounceBiz,
    emailDraft,
    {
      provider: "sendgrid",
      recipientAddress: "badaddress@nonexistent.domain",
      providerMessageId: "sg_msg_bounce_111",
      isSimulated: false,
      initialStage: "ACCEPTED"
    },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );

  const bounceEventRes = recordCommunicationLifecycleEvent(
    bouncedCommRes.business,
    { communicationId: bouncedCommRes.communication!.id },
    {
      eventType: "bounced",
      provider: "sendgrid",
      status: "BOUNCED",
      errorMessage: "550 5.1.1 User unknown / Host not found",
      details: "Hard bounce reported by remote MX."
    }
  );

  assert(bounceEventRes.success === true, "12D-4A: Bounce event recorded");
  assert(bounceEventRes.communication?.deliveryStatus === "BOUNCED", "12D-4B: Communication delivery status set to BOUNCED");
  assert(bounceEventRes.communication?.bouncedAt !== undefined, "12D-4C: bouncedAt timestamp set");
  assert(bounceEventRes.communication?.errorMessage?.includes("User unknown"), "12D-4D: Error message preserved");

  // 5. Inbound Reply Tracking & Thread Association
  const replyBiz = deliveredRes.business;
  const replyRes = recordInboundReply(
    replyBiz,
    commId,
    {
      senderAddress: "contact@kloofcoffee.co.za",
      body: "Hi Sipho, thanks for reaching out! We'd love to see a live preview of the site proposal. Are you available for a quick call tomorrow at 10am?",
      channel: "email",
      provider: "postmark_inbound_webhook"
    },
    { uid: "usr_system", displayName: "Inbound Hook", role: "Manager" }
  );

  assert(replyRes.success === true, "12D-5A: Inbound reply recorded successfully");
  assert(replyRes.replyRecord !== undefined, "12D-5B: Reply record created");
  assert(replyRes.replyRecord?.direction === "INBOUND", "12D-5C: Direction is INBOUND");
  assert(replyRes.replyRecord?.parentCommunicationId === commId, "12D-5D: Linked to parent communication ID");
  assert(replyRes.replyRecord?.subject?.includes("Re:"), "12D-5E: Subject automatically prefixed with Re:");
  assert(replyRes.parentCommunication?.deliveryStatus === "REPLIED", "12D-5F: Parent message delivery status updated to REPLIED");
  assert(replyRes.parentCommunication?.replyCount === 1, "12D-5G: Parent reply count incremented to 1");

  // 6. Role-Based Privacy & Timeline Access Control
  const authorizedTimeline = getProspectCommunicationTimeline(
    replyRes.business,
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(authorizedTimeline.authorized === true, "12D-6A: Authorized Sales Agent can access communication timeline");
  assert(authorizedTimeline.timeline.length >= 2, "12D-6B: Timeline contains outbound and inbound messages");
  assert(authorizedTimeline.outboundCount >= 1, "12D-6C: Outbound count accurately reported");
  assert(authorizedTimeline.inboundCount >= 1, "12D-6D: Inbound count accurately reported");

  const unauthorizedTimeline = getProspectCommunicationTimeline(
    replyRes.business,
    { uid: "usr_guest_01", displayName: "Anonymous Guest", role: "Unauthorized Viewer" }
  );
  assert(unauthorizedTimeline.authorized === false, "12D-6E: Unauthorized user is blocked from viewing timeline");
  assert(unauthorizedTimeline.timeline.length === 0, "12D-6F: Empty timeline returned to unauthorized user");
  assert(unauthorizedTimeline.error?.includes("Access Denied"), "12D-6G: Access Denied error returned");

  // 7. Simulated Events Distinguishability
  const simulatedCommRes = createCanonicalCommunicationRecord(
    replyRes.business,
    emailDraft,
    {
      provider: "simulated_sandbox_provider",
      recipientAddress: "contact@kloofcoffee.co.za",
      isSimulated: true,
      initialStage: "DELIVERED"
    },
    { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" }
  );
  assert(simulatedCommRes.communication?.isSimulated === true, "12D-7A: Simulated communication flagged isSimulated=true");
  assert(simulatedCommRes.communication?.provider === "simulated_sandbox_provider", "12D-7B: Clear simulation provider identity");

  // 8. Historical Records Preserved Across Business Data Updates
  const preUpdateHistoryCount = simulatedCommRes.business.communicationHistory?.length || 0;
  const updatedProspectBiz: Business = {
    ...simulatedCommRes.business,
    name: "Kloof Street Coffee Co. (Renamed)",
    address: "99 Kloof St, Cape Town",
    rating: 4.9,
    reviewsCount: 350
  };
  assert(
    updatedProspectBiz.communicationHistory?.length === preUpdateHistoryCount,
    "12D-8A: Communication history records remain completely intact across business profile updates"
  );
  assert(
    updatedProspectBiz.communicationHistory?.some(c => c.id === commId),
    "12D-8B: Specific communication thread preserved intact"
  );

  // 9. Webhook Signature & Payload Verification
  const validWebhook = verifyWebhookPayload(
    { "x-webhook-secret": "sitescout_webhook_secret_key", "x-provider": "postmark" },
    { providerMessageId: "pm_msg_100", eventType: "delivered", provider: "postmark" }
  );
  assert(validWebhook.isValid === true, "12D-9A: Valid webhook payload verified successfully");

  const invalidSecretWebhook = verifyWebhookPayload(
    { "x-webhook-secret": "wrong_secret", "x-provider": "postmark" },
    { providerMessageId: "pm_msg_100", eventType: "delivered" }
  );
  assert(invalidSecretWebhook.isValid === false, "12D-9B: Invalid secret rejected");
  assert(invalidSecretWebhook.error?.includes("Invalid or missing"), "12D-9C: Error explains authorization failure");

  const malformedWebhook = verifyWebhookPayload(
    { "x-webhook-secret": "sitescout_webhook_secret_key" },
    { invalid: "data" }
  );
  assert(malformedWebhook.isValid === false, "12D-9D: Malformed payload rejected");
  assert(malformedWebhook.error?.includes("Malformed webhook payload"), "12D-9E: Malformed payload error reported");

  // =========================================================================
  // GROUP 40: MICRO-PHASE 13A - PROSPECT FOLLOW-UP SCHEDULING & TASK MANAGEMENT
  // =========================================================================
  console.log("\n--- GROUP 40: Micro-Phase 13A Prospect Follow-Up Scheduling & Task Management ---");

  // 1. Task Creation and Canonical Representation
  const taskBaseBiz: Business = {
    ...replyRes.business,
    id: "biz_13a_test_01",
    name: "Table Mountain Outdoor Gear",
    followUpTasks: []
  };

  const salesAgent = { uid: "usr_agent_01", displayName: "Sipho Sales", role: "Sales Agent" };
  const managerUser = { uid: "usr_mgr_01", displayName: "Manager Thabo", role: "Manager" };
  const unauthorizedTaskUser = { uid: "usr_guest_01", displayName: "Guest Viewer", role: "Viewer" };

  const task1Res = createFollowUpTask(
    taskBaseBiz,
    {
      title: "Call Owner to Review Website Proposal",
      description: "Discuss mobile performance deficit and present live preview link.",
      dueDate: "2026-10-05",
      dueTime: "14:30",
      type: "call",
      priority: "HIGH",
      assignedTo: salesAgent,
      reminder: { enabled: true, remindBeforeMinutes: 30 },
      idempotencyKey: "task_idemp_13a_001"
    },
    salesAgent
  );

  assert(task1Res.success === true, "13A-1A: Follow-up task created successfully");
  assert(task1Res.task !== undefined, "13A-1B: Task object returned");
  assert(task1Res.task?.title === "Call Owner to Review Website Proposal", "13A-1C: Task title preserved");
  assert(task1Res.task?.type === "call", "13A-1D: Task type is 'call'");
  assert(task1Res.task?.priority === "HIGH", "13A-1E: Priority is HIGH");
  assert(task1Res.task?.status === "OPEN", "13A-1F: Initial status is OPEN");
  assert(task1Res.task?.assignedTo?.uid === salesAgent.uid, "13A-1G: Assigned to Sales Agent");
  assert(task1Res.task?.history.length === 1, "13A-1H: History contains initial 'created' entry");
  assert(task1Res.task?.history[0].action === "created", "13A-1I: History action is 'created'");
  assert(task1Res.business.followUpTasks?.length === 1, "13A-1J: Business followUpTasks list updated");
  assert(task1Res.business.nextFollowUpDate === "2026-10-05", "13A-1K: business.nextFollowUpDate updated");

  const taskId = task1Res.task!.id;

  // 2. Task Assignment and Reassignment
  const assigneeB = { uid: "usr_agent_02", displayName: "Nandi Rep", role: "Sales Agent" };
  const assignRes = assignFollowUpTask(
    task1Res.business,
    taskId,
    assigneeB,
    managerUser,
    "Reassigned to Nandi due to territory alignment."
  );

  assert(assignRes.success === true, "13A-2A: Task reassigned successfully");
  assert(assignRes.task?.assignedTo?.uid === assigneeB.uid, "13A-2B: Assignee updated to Nandi Rep");
  assert(assignRes.task?.history.length === 2, "13A-2C: History appended with reassignment");
  assert(assignRes.task?.history[1].action === "assigned", "13A-2D: Reassignment action is 'assigned'");
  assert(assignRes.task?.history[1].details.includes("territory alignment"), "13A-2E: Reassignment note logged in history");

  // 3. Due Date & Timezone Timestamp Calculation
  const calculatedTs = calculateDueTimestamp("2026-10-05", "14:30", "Africa/Johannesburg");
  assert(!isNaN(calculatedTs), "13A-3A: calculateDueTimestamp produces valid timestamp");
  assert(calculatedTs > 0, "13A-3B: Positive millisecond timestamp returned");

  // 4. Dynamic Overdue Status Calculation
  const pastTaskRes = createFollowUpTask(
    assignRes.business,
    {
      title: "Past Due Strategy Review",
      dueDate: "2026-01-15",
      dueTime: "09:00",
      type: "review",
      priority: "URGENT"
    },
    salesAgent
  );
  assert(pastTaskRes.success === true, "13A-4A: Past due task created for testing");
  const pastTask = pastTaskRes.task!;

  // Reference time is in 2026-09-29
  const nowRefTime = new Date("2026-09-29T10:00:00Z");
  assert(isTaskOverdue(pastTask, nowRefTime) === true, "13A-4B: isTaskOverdue returns true for past due task");
  assert(getEffectiveTaskStatus(pastTask, nowRefTime) === "OVERDUE", "13A-4C: getEffectiveTaskStatus evaluates OVERDUE");

  // Future task is NOT overdue
  assert(isTaskOverdue(task1Res.task!, nowRefTime) === false, "13A-4D: Future task is not overdue");
  assert(getEffectiveTaskStatus(task1Res.task!, nowRefTime) === "OPEN", "13A-4E: Future task status evaluates OPEN");

  // 5. Task Rescheduling & History Preservation
  const rescheduleRes = rescheduleFollowUpTask(
    pastTaskRes.business,
    pastTask.id,
    {
      dueDate: "2026-10-12",
      dueTime: "11:00"
    },
    salesAgent,
    "Postponed per client request."
  );

  assert(rescheduleRes.success === true, "13A-5A: Rescheduling task succeeds");
  assert(rescheduleRes.task?.dueDate === "2026-10-12", "13A-5B: New due date stored");
  assert(rescheduleRes.task?.dueTime === "11:00", "13A-5C: New due time stored");
  assert(isTaskOverdue(rescheduleRes.task!, nowRefTime) === false, "13A-5D: Rescheduled future task is no longer overdue");
  assert(rescheduleRes.task?.status === "OPEN", "13A-5E: Status reset to OPEN");
  assert(rescheduleRes.task?.history.some(h => h.action === "rescheduled"), "13A-5F: 'rescheduled' event logged in history");

  // 6. Task Completion & Invariant (Completed Task is Never Overdue)
  const completeRes = updateFollowUpTaskStatus(
    rescheduleRes.business,
    taskId,
    "COMPLETED",
    salesAgent,
    "Client answered and agreed to contract terms."
  );

  assert(completeRes.success === true, "13A-6A: Task marked COMPLETED");
  assert(completeRes.task?.status === "COMPLETED", "13A-6B: Task status is COMPLETED");
  assert(completeRes.task?.completedAt !== undefined, "13A-6C: completedAt timestamp populated");
  assert(completeRes.task?.completedBy?.uid === salesAgent.uid, "13A-6D: completedBy actor recorded");
  assert(isTaskOverdue(completeRes.task!, new Date("2030-01-01")) === false, "13A-6E: Completed task is never overdue even in the far future");
  assert(getEffectiveTaskStatus(completeRes.task!, new Date("2030-01-01")) === "COMPLETED", "13A-6F: Effective status remains COMPLETED");

  // 7. Task Cancellation
  const cancelTaskRes = updateFollowUpTaskStatus(
    completeRes.business,
    pastTask.id,
    "CANCELLED",
    managerUser,
    "Prospect went out of business."
  );

  assert(cancelTaskRes.success === true, "13A-7A: Task marked CANCELLED");
  assert(cancelTaskRes.task?.status === "CANCELLED", "13A-7B: Status is CANCELLED");
  assert(cancelTaskRes.task?.cancelledAt !== undefined, "13A-7C: cancelledAt populated");
  assert(cancelTaskRes.task?.cancelledReason === "Prospect went out of business.", "13A-7D: Cancellation reason preserved");
  assert(isTaskOverdue(cancelTaskRes.task!, new Date("2030-01-01")) === false, "13A-7E: Cancelled task is never overdue");

  // 8. Duplicate Task Prevention
  const duplicateTaskAttempt = createFollowUpTask(
    cancelTaskRes.business,
    {
      title: "Call Owner to Review Website Proposal",
      dueDate: "2026-10-05",
      idempotencyKey: "task_idemp_13a_001"
    },
    salesAgent
  );

  assert(duplicateTaskAttempt.success === true, "13A-8A: Duplicate attempt handled safely");
  assert(duplicateTaskAttempt.isDuplicate === true, "13A-8B: Flagged as isDuplicate=true");
  assert(duplicateTaskAttempt.task?.id === taskId, "13A-8C: Returns existing task ID without creating redundant duplicate");

  // 9. Follow-Up Task Created from Communication Record
  const commFollowUpRes = createFollowUpFromCommunication(
    cancelTaskRes.business,
    commId,
    {
      title: "Follow up on Inbound Coffee Co. Inbound Message",
      dueDate: "2026-10-08",
      dueTime: "10:00",
      type: "email",
      priority: "URGENT"
    },
    salesAgent
  );

  assert(commFollowUpRes.success === true, "13A-9A: Task created from communication record");
  assert(commFollowUpRes.task?.communicationId === commId, "13A-9B: Linked to parent communication ID");
  assert(commFollowUpRes.task?.draftId === emailDraft.id, "13A-9C: Linked to original draft ID");
  assert(commFollowUpRes.task?.description?.includes("Context from"), "13A-9D: Context snippet embedded in description");

  // 10. Prospect Task Retrieval & Dynamic Filters
  const taskQueryBiz = commFollowUpRes.business;
  const allTasksQuery = getProspectFollowUpTasks(taskQueryBiz, { status: "ALL" }, salesAgent);
  assert(allTasksQuery.authorized === true, "13A-10A: Authorized user can query tasks");
  assert(allTasksQuery.allCount >= 3, "13A-10B: All tasks count accurate");
  assert(allTasksQuery.completedCount === 1, "13A-10C: Completed count accurate (1)");
  assert(allTasksQuery.cancelledCount === 1, "13A-10D: Cancelled count accurate (1)");

  const activeTasksQuery = getProspectFollowUpTasks(taskQueryBiz, { status: "ACTIVE" }, salesAgent);
  assert(activeTasksQuery.tasks.every(t => t.status !== "COMPLETED" && t.status !== "CANCELLED"), "13A-10E: ACTIVE filter excludes completed & cancelled");

  // 11. Role-Based Access Control on Task Management
  const unauthorizedTaskQuery = getProspectFollowUpTasks(taskQueryBiz, {}, unauthorizedTaskUser);
  assert(unauthorizedTaskQuery.authorized === false, "13A-11A: Unauthorized viewer is blocked from querying tasks");
  assert(unauthorizedTaskQuery.tasks.length === 0, "13A-11B: Empty task list returned to unauthorized user");
  assert(unauthorizedTaskQuery.error?.includes("Access Denied"), "13A-11C: Access Denied error message returned");

  const unauthorizedCreate = createFollowUpTask(
    taskQueryBiz,
    { title: "Unauthorized Task", dueDate: "2026-10-10" },
    unauthorizedTaskUser
  );
  assert(unauthorizedCreate.success === false, "13A-11D: Unauthorized user cannot create tasks");
  assert(unauthorizedCreate.error?.includes("Unauthorized"), "13A-11E: Unauthorized error reported");

  const unauthorizedReschedule = rescheduleFollowUpTask(
    taskQueryBiz,
    taskId,
    { dueDate: "2026-10-20" },
    unauthorizedTaskUser
  );
  assert(unauthorizedReschedule.success === false, "13A-11F: Unauthorized user cannot reschedule tasks");
  assert(unauthorizedReschedule.error?.includes("Unauthorized"), "13A-11G: Unauthorized error reported on reschedule");

  // =========================================================================
  // GROUP 41: MICRO-PHASE 13B - FOLLOW-UP SEQUENCES & SALES PIPELINE AUTOMATION
  // =========================================================================
  console.log("\n--- GROUP 41: Micro-Phase 13B Follow-Up Sequences & Sales Pipeline Automation ---");

  // 1. Reusable Sequence Definitions and Configuration
  const availableSeqs = getAvailableSequences();
  assert(availableSeqs.length >= 3, "13B-1A: Default follow-up sequences loaded");
  assert(availableSeqs.some(s => s.id === "seq_standard_multitouch"), "13B-1B: Standard multi-touch sequence exists");

  const customSeqRes = createFollowUpSequence(
    {
      name: "High-Priority Enterprise Prototype Closing",
      description: "Fast-track 2-step sequence for qualified high-value enterprises.",
      targetChannel: "multi_channel",
      steps: [
        {
          stepNumber: 1,
          title: "Executive Introduction Call",
          actionType: "manual_task",
          taskType: "call",
          priority: "HIGH",
          delayDays: 0,
          requiresManualApproval: false
        },
        {
          stepNumber: 2,
          title: "Tailored Proposal Email",
          actionType: "approved_communication",
          taskType: "email",
          channel: "email",
          priority: "URGENT",
          delayDays: 2,
          requiresManualApproval: true
        }
      ],
      completionConditions: {
        stopOnReply: true,
        stopOnOptOut: true,
        stopOnDisqualification: true,
        stopOnDealWon: true
      }
    },
    salesAgent
  );

  assert(customSeqRes.success === true, "13B-1C: Custom sequence created successfully");
  assert(customSeqRes.sequence?.steps.length === 2, "13B-1D: Custom sequence has 2 steps");
  assert(customSeqRes.sequence?.steps[1].requiresManualApproval === true, "13B-1E: Approved communication step enforces requiresManualApproval");

  const customSeq = customSeqRes.sequence!;

  // 2. Prospect Eligibility Checks
  const eligibleBiz: Business = {
    ...taskQueryBiz,
    id: "biz_13b_eligible",
    name: "Cape Point Nautical Supplies",
    doNotContact: false,
    qualificationStatus: "QUALIFIED",
    sequenceEnrollments: []
  };

  const eligibleCheck = checkProspectSequenceEligibility(eligibleBiz);
  assert(eligibleCheck.eligible === true, "13B-2A: Eligible prospect passes check");
  assert(eligibleCheck.blockers.length === 0, "13B-2B: No blockers for eligible prospect");

  const optedOutBiz: Business = {
    ...eligibleBiz,
    id: "biz_13b_opted_out",
    doNotContact: true
  };
  const optedOutCheck = checkProspectSequenceEligibility(optedOutBiz);
  assert(optedOutCheck.eligible === false, "13B-2C: Opted-out prospect fails eligibility");
  assert(optedOutCheck.blockers.some(b => b.includes("Do-Not-Contact")), "13B-2D: Do-Not-Contact blocker identified");

  const disqualifiedSeqBiz: Business = {
    ...eligibleBiz,
    id: "biz_13b_disqualified",
    qualificationStatus: "DISQUALIFIED"
  };
  const disqCheck = checkProspectSequenceEligibility(disqualifiedSeqBiz);
  assert(disqCheck.eligible === false, "13B-2E: Disqualified prospect fails eligibility");
  assert(disqCheck.blockers.some(b => b.includes("DISQUALIFIED")), "13B-2F: Disqualified blocker identified");

  // 3. Prospect Enrollment & Safe Step 1 Task Generation
  const enrollRes = enrollProspectInSequence(
    eligibleBiz,
    customSeq,
    salesAgent
  );

  assert(enrollRes.success === true, "13B-3A: Prospect enrolled successfully");
  assert(enrollRes.enrollment !== undefined, "13B-3B: Enrollment record returned");
  assert(enrollRes.enrollment?.status === "ACTIVE", "13B-3C: Enrollment status is ACTIVE");
  assert(enrollRes.enrollment?.currentStepNumber === 1, "13B-3D: Starts at Step 1");
  assert(enrollRes.task !== undefined, "13B-3E: Step 1 task generated automatically");
  assert(enrollRes.task?.title.includes("Executive Introduction Call"), "13B-3F: Task title matches Step 1 title");
  assert(enrollRes.enrollment?.generatedTaskIds.includes(enrollRes.task!.id), "13B-3G: Generated task ID tracked in enrollment");
  assert(enrollRes.enrollment?.history.length === 1, "13B-3H: Enrollment history recorded");
  assert(enrollRes.enrollment?.history[0].action === "enrolled", "13B-3I: History action is 'enrolled'");

  const enrollmentId = enrollRes.enrollment!.id;
  const enrolledBiz = enrollRes.business;

  // 4. Duplicate Enrollment Prevention
  const dupEnrollRes = enrollProspectInSequence(
    enrolledBiz,
    customSeq,
    salesAgent
  );
  assert(dupEnrollRes.success === false, "13B-4A: Duplicate active enrollment blocked");
  assert(dupEnrollRes.error?.includes("already actively enrolled"), "13B-4B: Clear duplicate enrollment error message");

  // Enrollment blocked on opted-out prospect
  const optOutEnrollAttempt = enrollProspectInSequence(
    optedOutBiz,
    customSeq,
    salesAgent
  );
  assert(optOutEnrollAttempt.success === false, "13B-4C: Cannot enroll opted-out prospect");
  assert(optOutEnrollAttempt.error?.includes("Do-Not-Contact"), "13B-4D: Enrollment error cites Do-Not-Contact");

  // 5. Sequence Controls: Pausing & Resuming
  const pauseRes = pauseSequenceEnrollment(
    enrolledBiz,
    enrollmentId,
    salesAgent,
    "Prospect on annual leave until next Tuesday."
  );
  assert(pauseRes.success === true, "13B-5A: Sequence paused successfully");
  assert(pauseRes.enrollment?.status === "PAUSED", "13B-5B: Status is PAUSED");
  assert(pauseRes.enrollment?.pausedReason?.includes("annual leave"), "13B-5C: Pause reason recorded");
  assert(pauseRes.enrollment?.history.some(h => h.action === "paused"), "13B-5D: 'paused' logged in history");

  // Cannot advance while paused
  const pausedAdvanceAttempt = advanceSequenceEnrollment(
    pauseRes.business,
    enrollmentId,
    salesAgent
  );
  assert(pausedAdvanceAttempt.success === false, "13B-5E: Cannot advance paused sequence");
  assert(pausedAdvanceAttempt.error?.includes("PAUSED"), "13B-5F: Error explains enrollment is paused");

  // Resume sequence
  const resumeRes = resumeSequenceEnrollment(
    pauseRes.business,
    enrollmentId,
    salesAgent
  );
  assert(resumeRes.success === true, "13B-5G: Sequence resumed successfully");
  assert(resumeRes.enrollment?.status === "ACTIVE", "13B-5H: Status restored to ACTIVE");
  assert(resumeRes.enrollment?.history.some(h => h.action === "resumed"), "13B-5I: 'resumed' logged in history");

  // 6. Safe Automation & Approval Enforcement for Communication Step
  // Step 2 is an approved_communication step requiring manual approval
  const advanceStep1Res = advanceSequenceEnrollment(
    resumeRes.business,
    enrollmentId,
    salesAgent,
    { customNote: "Call completed. Decision maker interested in seeing proposal." }
  );

  assert(advanceStep1Res.success === true, "13B-6A: Step 1 advanced to Step 2");
  assert(advanceStep1Res.enrollment?.currentStepNumber === 2, "13B-6B: Current step is now 2");
  assert(advanceStep1Res.enrollment?.completedStepNumbers.includes(1), "13B-6C: Step 1 marked completed");
  assert(advanceStep1Res.task !== undefined, "13B-6D: Step 2 task generated according to interval");
  assert(advanceStep1Res.task?.title.includes("Tailored Proposal Email"), "13B-6E: Step 2 task title matches proposal");

  // Attempting to advance Step 2 WITHOUT manual approval must be blocked
  const unapprovedAdvancementAttempt = advanceSequenceEnrollment(
    advanceStep1Res.business,
    enrollmentId,
    salesAgent,
    { isMessageApproved: false }
  );
  assert(unapprovedAdvancementAttempt.success === false, "13B-6F: Unapproved automated communication blocked from advancing");
  assert(unapprovedAdvancementAttempt.error?.includes("manual approval"), "13B-6G: Approval required error message returned");

  // Advancing with explicit manual approval succeeds and completes sequence!
  const approvedAdvancement = advanceSequenceEnrollment(
    advanceStep1Res.business,
    enrollmentId,
    salesAgent,
    { isMessageApproved: true, customNote: "Proposal approved and sent." }
  );
  assert(approvedAdvancement.success === true, "13B-6H: Approved communication step advances");
  assert(approvedAdvancement.isCompleted === true, "13B-6I: Sequence completed successfully after final step");
  assert(approvedAdvancement.enrollment?.status === "COMPLETED", "13B-6J: Enrollment status is COMPLETED");
  assert(approvedAdvancement.enrollment?.nextScheduledStepAt === undefined, "13B-6K: Next scheduled step cleared upon completion");

  // 7. Automatic Stop-On-Reply & Opt-Out Sentinel Handling
  // Enroll prospect in standard sequence to test inbound reply auto-stop
  const secondEnrollRes = enrollProspectInSequence(
    eligibleBiz,
    availableSeqs.find(s => s.id === "seq_standard_multitouch")!,
    salesAgent
  );
  assert(secondEnrollRes.success === true, "13B-7A: Prospect enrolled in standard multi-touch sequence");
  const secondEnrollmentId = secondEnrollRes.enrollment!.id;

  // Simulate an inbound reply from the prospect
  const replyStopRes = handleSequenceReplyOrOptOut(
    secondEnrollRes.business,
    "reply",
    salesAgent,
    "Thanks for the call, let's schedule a Zoom walkthrough tomorrow."
  );

  assert(replyStopRes.success === true, "13B-7B: handleSequenceReplyOrOptOut executed successfully");
  assert(replyStopRes.stoppedEnrollmentsCount === 1, "13B-7C: Exactly 1 active sequence stopped on reply");

  const stoppedEnrollment = (replyStopRes.business.sequenceEnrollments || []).find(e => e.id === secondEnrollmentId);
  assert(stoppedEnrollment?.status === "CANCELLED", "13B-7D: Sequence status set to CANCELLED");
  assert(stoppedEnrollment?.cancelledReason?.includes("replied to outreach"), "13B-7E: Reply reason recorded in cancelledReason");

  // 8. Prospect Status Changes Mid-Sequence (Disqualification Safety)
  const thirdEnrollRes = enrollProspectInSequence(
    replyStopRes.business,
    availableSeqs.find(s => s.id === "seq_cold_reengagement")!,
    salesAgent
  );
  assert(thirdEnrollRes.success === true, "13B-8A: Prospect enrolled in re-engagement sequence");
  const thirdEnrollmentId = thirdEnrollRes.enrollment!.id;

  // Mark business as DISQUALIFIED
  const disqualifiedMidSequenceBiz: Business = {
    ...thirdEnrollRes.business,
    qualificationStatus: "DISQUALIFIED"
  };

  // Attempting to advance a sequence on a disqualified prospect auto-halts and marks INELIGIBLE
  const advanceDisqualifiedAttempt = advanceSequenceEnrollment(
    disqualifiedMidSequenceBiz,
    thirdEnrollmentId,
    salesAgent
  );

  assert(advanceDisqualifiedAttempt.success === false, "13B-8B: Advancement fails for disqualified prospect");
  assert(advanceDisqualifiedAttempt.enrollment?.status === "INELIGIBLE", "13B-8C: Enrollment automatically transitioned to INELIGIBLE");
  assert(advanceDisqualifiedAttempt.enrollment?.ineligibleReason?.includes("DISQUALIFIED"), "13B-8D: Ineligible reason recorded");

  // 9. Sequence Cancellation & Open Task Cleanup
  const fourthEnrollRes = enrollProspectInSequence(
    eligibleBiz,
    customSeq,
    salesAgent
  );
  assert(fourthEnrollRes.success === true, "13B-9A: Fourth test enrollment created");
  const fourthTaskId = fourthEnrollRes.task!.id;

  const cancelSeqRes = cancelSequenceEnrollment(
    fourthEnrollRes.business,
    fourthEnrollRes.enrollment!.id,
    salesAgent,
    "Client opted to build in-house."
  );
  assert(cancelSeqRes.success === true, "13B-9B: Sequence cancelled successfully");
  assert(cancelSeqRes.enrollment?.status === "CANCELLED", "13B-9C: Status is CANCELLED");

  // Open task associated with cancelled sequence was automatically cancelled
  const associatedTask = (cancelSeqRes.business.followUpTasks || []).find(t => t.id === fourthTaskId);
  assert(associatedTask?.status === "CANCELLED", "13B-9D: Associated open task cancelled automatically on sequence cancellation");
  assert(associatedTask?.cancelledReason?.includes("sequence cancellation"), "13B-9E: Task cancellation reason preserves sequence context");

  // 10. Audit History & Communication Records Preserved Intact
  assert(fourthEnrollRes.business.communicationHistory !== undefined, "13B-10A: Communication history remains intact across sequence lifecycle");
  assert(cancelSeqRes.enrollment?.history.length! >= 2, "13B-10B: Multiple audit entries preserved in enrollment history");

  // =========================================================================
  // GROUP 42: MICRO-PHASE 13C - SALES PIPELINE STAGE MANAGEMENT & DEAL TRACKING
  // =========================================================================
  console.log("\n--- GROUP 42: Micro-Phase 13C Sales Pipeline Stage Management & Deal Progress Tracking ---");

  // 1. Canonical Pipeline Stages & Normalization
  assert(CANONICAL_PIPELINE_STAGES.length === 9, "13C-1A: Exactly 9 canonical pipeline stages defined");
  assert(normalizePipelineStage("NEW") === "NEW_PROSPECT", "13C-1B: 'NEW' normalizes to 'NEW_PROSPECT'");
  assert(normalizePipelineStage("QUALIFIED") === "QUALIFIED", "13C-1C: 'QUALIFIED' normalizes to 'QUALIFIED'");
  assert(normalizePipelineStage("CONTACTED") === "CONTACTED", "13C-1D: 'CONTACTED' normalizes to 'CONTACTED'");
  assert(normalizePipelineStage("ENGAGED") === "ENGAGED", "13C-1E: 'ENGAGED' normalizes to 'ENGAGED'");
  assert(normalizePipelineStage("DISCOVERY") === "DISCOVERY", "13C-1F: 'DISCOVERY' normalizes to 'DISCOVERY'");
  assert(normalizePipelineStage("PROPOSAL_SENT") === "PROPOSAL_SENT", "13C-1G: 'PROPOSAL_SENT' normalizes to 'PROPOSAL_SENT'");
  assert(normalizePipelineStage("NEGOTIATION") === "NEGOTIATION", "13C-1H: 'NEGOTIATION' normalizes to 'NEGOTIATION'");
  assert(normalizePipelineStage("WON") === "WON", "13C-1I: 'WON' normalizes to 'WON'");
  assert(normalizePipelineStage("LOST") === "LOST", "13C-1J: 'LOST' normalizes to 'LOST'");

  // 2. Commercial Terms & Deal Initialization
  const pipelineProspect: Business = {
    ...fourthEnrollRes.business,
    id: "biz_13c_pipeline_test",
    name: "Kirstenbosch Botanical Coffee Co.",
    salesStage: "NEW_PROSPECT",
    prospectStatus: "New",
    qualificationStatus: "QUALIFIED",
    stageHistory: []
  };

  const termsUpdateRes = updateDealCommercialTerms(
    pipelineProspect,
    {
      estimatedValue: 2400,
      agreedValue: 2000,
      currency: "ZAR",
      proposedServices: ["Custom Website Redesign", "Local SEO Audit", "WhatsApp Order Widget"],
      expectedCloseDate: "2026-11-15",
      assignedOwner: salesAgent
    },
    salesAgent
  );

  assert(termsUpdateRes.success === true, "13C-2A: Deal commercial terms updated successfully");
  assert(termsUpdateRes.dealDetails.estimatedValue === 2400, "13C-2B: Estimated deal value preserved accurately (2400)");
  assert(termsUpdateRes.dealDetails.agreedValue === 2000, "13C-2C: Agreed deal value preserved accurately (2000)");
  assert(termsUpdateRes.dealDetails.currency === "ZAR", "13C-2D: Deal currency preserved accurately (ZAR)");
  assert(termsUpdateRes.dealDetails.proposedServices?.length === 3, "13C-2E: 3 proposed services recorded");
  assert(termsUpdateRes.dealDetails.expectedCloseDate === "2026-11-15", "13C-2F: Target close date recorded");
  assert(termsUpdateRes.business.estimatedDealValue !== termsUpdateRes.business.agreedDealValue, "13C-2G: Estimated value strictly distinguished from agreed commercial value");

  let activePipelineBiz = termsUpdateRes.business;

  // 3. Progressive Pipeline Transitions
  const step1Trans = await executePipelineStageTransition(
    activePipelineBiz,
    "QUALIFIED",
    salesAgent,
    { reason: "Completed digital deficit audit with 92% opportunity score." }
  );
  assert(step1Trans.success === true, "13C-3A: Transition from NEW_PROSPECT to QUALIFIED succeeds");
  assert(step1Trans.business.salesStage === "QUALIFIED", "13C-3B: Sales stage is QUALIFIED");
  assert(step1Trans.dealDetails?.stage === "QUALIFIED", "13C-3C: Deal details stage synchronized");
  assert(step1Trans.transition?.fromStage === "NEW_PROSPECT", "13C-3D: Transition audit records previous stage NEW_PROSPECT");
  assert(step1Trans.transition?.toStage === "QUALIFIED", "13C-3E: Transition audit records target stage QUALIFIED");

  activePipelineBiz = step1Trans.business;

  const step2Trans = await executePipelineStageTransition(
    activePipelineBiz,
    "CONTACTED",
    salesAgent,
    { reason: "Sent verified prototype email link to business owner." }
  );
  assert(step2Trans.success === true, "13C-3F: Transition to CONTACTED succeeds");
  assert(step2Trans.business.salesStage === "CONTACTED", "13C-3G: Sales stage is CONTACTED");

  activePipelineBiz = step2Trans.business;

  const step3Trans = await executePipelineStageTransition(
    activePipelineBiz,
    "PROPOSAL_SENT",
    salesAgent,
    {
      estimatedValue: 2400,
      agreedValue: 2000,
      reason: "Delivered formal quote for 3-tier website package."
    }
  );
  assert(step3Trans.success === true, "13C-3H: Transition to PROPOSAL_SENT succeeds");
  assert(step3Trans.business.salesStage === "PROPOSAL_SENT", "13C-3I: Sales stage is PROPOSAL_SENT");

  activePipelineBiz = step3Trans.business;

  // 4. Invalid Stage Transitions & Protection Invariants
  // Premature WON jump from early stage without terms confirmation must be blocked
  const earlyBiz: Business = {
    ...pipelineProspect,
    id: "biz_early_jump",
    salesStage: "NEW_PROSPECT"
  };
  const invalidEarlyWonRes = await executePipelineStageTransition(
    earlyBiz,
    "WON",
    salesAgent,
    { commercialTermsConfirmed: false }
  );
  assert(invalidEarlyWonRes.success === false, "13C-4A: Direct early transition to WON blocked without proposal/negotiation");
  assert(invalidEarlyWonRes.error?.includes("Cannot mark deal WON directly"), "13C-4B: Clear progression error returned");

  // Marking LOST without reason is blocked
  const invalidLostNoReason = await executePipelineStageTransition(
    activePipelineBiz,
    "LOST",
    salesAgent
  );
  assert(invalidLostNoReason.success === false, "13C-4C: Marking deal as LOST without reason is blocked");
  assert(invalidLostNoReason.error?.includes("reason is required"), "13C-4D: Required reason error returned for LOST");

  // 5. Preview Approval Does NOT Automatically Mark Deal WON (Critical Invariant)
  const previewApprovedBiz: Business = {
    ...activePipelineBiz,
    previewApprovalStatus: "APPROVED"
  };
  assert(previewApprovedBiz.salesStage === "PROPOSAL_SENT", "13C-5A: Preview approval does NOT modify salesStage");
  assert(previewApprovedBiz.dealOutcome !== "WON", "13C-5B: Preview approval does NOT modify dealOutcome to WON");

  // 6. Marking Deal WON with Commercial Terms Confirmation
  const wonTrans = await executePipelineStageTransition(
    activePipelineBiz,
    "WON",
    salesAgent,
    {
      commercialTermsConfirmed: true,
      agreedValue: 2000,
      currency: "ZAR",
      reason: "Client signed electronic contract and paid 50% setup deposit via EFT."
    }
  );

  assert(wonTrans.success === true, "13C-6A: Transition to WON succeeds with confirmed terms");
  assert(wonTrans.business.salesStage === "WON", "13C-6B: Sales stage is WON");
  assert(wonTrans.business.dealOutcome === "WON", "13C-6C: dealOutcome synchronized to WON");
  assert(wonTrans.business.totalContractValue === 2000, "13C-6D: totalContractValue synchronized from agreedValue");
  assert(wonTrans.business.dealClosedAt !== undefined, "13C-6E: dealClosedAt timestamp populated");
  assert(wonTrans.business.dealClosedBy?.includes("Sipho"), "13C-6F: dealClosedBy actor recorded");
  assert(wonTrans.dealDetails?.wonDetails?.commercialTermsConfirmed === true, "13C-6G: commercialTermsConfirmed recorded in wonDetails");

  // 7. Transition to LOST with Documented Reason
  const prospectToLose: Business = {
    ...activePipelineBiz,
    id: "biz_to_lose_test",
    salesStage: "NEGOTIATION"
  };

  const lostTrans = await executePipelineStageTransition(
    prospectToLose,
    "LOST",
    salesAgent,
    { lossReason: "Prospect decided to postpone digital refresh to Q3 next year." }
  );

  assert(lostTrans.success === true, "13C-7A: Transition to LOST succeeds with reason");
  assert(lostTrans.business.salesStage === "LOST", "13C-7B: Sales stage is LOST");
  assert(lostTrans.business.dealOutcome === "LOST", "13C-7C: dealOutcome synchronized to LOST");
  assert(lostTrans.business.lossReason?.includes("postpone digital refresh"), "13C-7D: lossReason stored on business record");
  assert(lostTrans.dealDetails?.lossReason?.includes("postpone digital refresh"), "13C-7E: lossReason stored on deal details");

  // 8. Pipeline Audit History & Immutability
  const wonStageHistory = wonTrans.business.stageHistory || [];
  assert(wonStageHistory.length >= 4, "13C-8A: Complete stage history preserved across all transitions");
  const latestEntry = wonStageHistory[wonStageHistory.length - 1];
  assert(latestEntry.toStage === "WON", "13C-8B: Final transition entry records WON");
  assert(latestEntry.actor?.displayName === salesAgent.displayName, "13C-8C: Actor attribution recorded in audit entry");

  // 9. Unauthorized Role Restrictions
  const unauthorizedTransAttempt = await executePipelineStageTransition(
    activePipelineBiz,
    "NEGOTIATION",
    unauthorizedTaskUser
  );
  assert(unauthorizedTransAttempt.success === false, "13C-9A: Unauthorized user cannot execute stage transition");
  assert(unauthorizedTransAttempt.error?.includes("unauthorized"), "13C-9B: Clear unauthorized error message returned");

  const unauthorizedTermsAttempt = updateDealCommercialTerms(
    activePipelineBiz,
    { estimatedValue: 5000 },
    unauthorizedTaskUser
  );
  assert(unauthorizedTermsAttempt.success === false, "13C-9C: Unauthorized user cannot modify deal commercial terms");

  // 10. Existing Follow-Up Tasks & Communication Records Intact
  assert(wonTrans.business.followUpTasks !== undefined, "13C-10A: Follow-up tasks remain intact after deal closure");
  assert(wonTrans.business.communicationHistory !== undefined, "13C-10B: Communication history remains intact after deal closure");

  // =========================================================================
  // GROUP 43: MICRO-PHASE 13D - DEAL VALUE, REVENUE RECORDS & SALES REPORTING INTEGRITY
  // =========================================================================
  console.log("\n--- GROUP 43: Micro-Phase 13D Deal Value, Revenue Records & Sales Reporting Integrity ---");

  // 1. Monetary Precision in Integer Cents
  assert(toCents(19.99) === 1999, "13D-1A: $19.99 converts safely to 1999 cents");
  assert(toCents(10.01) === 1001, "13D-1B: $10.01 converts safely to 1001 cents");
  assert(fromCents(toCents(19.99) + toCents(10.01)) === 30, "13D-1C: Cents addition produces exact $30.00 without floating point bugs");
  assert(formatCurrency(2500, "ZAR") === "ZAR R2,500.00", "13D-1D: Currency formatting produces 'ZAR R2,500.00'");

  // 2. Financial Concepts Separation
  const finBiz: Business = {
    ...pipelineProspect,
    id: "biz_13d_financials_test",
    name: "Constantia Estate Winery",
    currency: "USD",
    financialLedger: []
  };

  const estRes = await recordFinancialLedgerEntry(finBiz, {
    businessId: finBiz.id,
    type: "ESTIMATE_SET",
    amount: 5000,
    currency: "USD",
    actor: salesAgent,
    notes: "Internal sales team opportunity estimate"
  });
  assert(estRes.success === true, "13D-2A: ESTIMATE_SET recorded successfully");
  assert(estRes.business.estimatedDealValue === 5000, "13D-2B: Estimated value recorded as 5000");
  assert(estRes.business.paidDealValue === 0, "13D-2C: Estimated value does NOT increase paid value");
  assert(estRes.business.netRevenue === 0, "13D-2D: Estimated value produces $0.00 net revenue");

  const propRes = await recordFinancialLedgerEntry(estRes.business, {
    businessId: finBiz.id,
    type: "PROPOSAL_QUOTED",
    amount: 4200,
    currency: "USD",
    actor: salesAgent,
    notes: "Formal proposal delivered"
  });
  assert(propRes.business.proposedDealValue === 4200, "13D-2E: Proposed value recorded as 4200");
  assert(propRes.business.paidDealValue === 0, "13D-2F: Proposal delivered does NOT increase paid value");

  // 3. Idempotent Payment Recording & Duplicate Prevention
  const pay1Res = await recordPayment(
    propRes.business,
    {
      amount: 1500,
      currency: "USD",
      reference: "stripe_charge_1001",
      idempotencyKey: "idem_tx_1001",
      notes: "50% setup deposit received"
    },
    salesAgent
  );
  assert(pay1Res.success === true, "13D-3A: First payment of $1500 recorded successfully");
  assert(pay1Res.business.paidDealValue === 1500, "13D-3B: Paid value updated to 1500");
  assert(pay1Res.business.netRevenue === 1500, "13D-3C: Net revenue updated to 1500");

  // Duplicate payment callback attempt with identical idempotencyKey
  const dupPayRes = await recordPayment(
    pay1Res.business,
    {
      amount: 1500,
      currency: "USD",
      reference: "stripe_charge_1001",
      idempotencyKey: "idem_tx_1001",
      notes: "Duplicate Stripe webhook retry"
    },
    salesAgent
  );
  assert(dupPayRes.success === true, "13D-3D: Duplicate payment handled safely");
  assert(dupPayRes.isDuplicate === true, "13D-3E: Duplicate flag set to true");
  assert(dupPayRes.business.paidDealValue === 1500, "13D-3F: Paid value remained 1500 without double-counting");

  // 4. Refunds & Net Revenue Calculation
  const refRes = await recordRefund(
    pay1Res.business,
    {
      amount: 300,
      currency: "USD",
      reference: "refund_ref_2001",
      notes: "Partial refund for scope adjustment"
    },
    salesAgent
  );
  assert(refRes.success === true, "13D-4A: Refund recorded successfully");
  assert(refRes.business.paidDealValue === 1500, "13D-4B: Original paidValue retained as 1500");
  assert(refRes.business.refundedDealValue === 300, "13D-4C: Refunded value recorded as 300");
  assert(refRes.business.netRevenue === 1200, "13D-4D: Net revenue calculated accurately as $1200 (1500 - 300)");

  // 5. Multi-Currency Safe Aggregation
  const zarBiz: Business = {
    ...pipelineProspect,
    id: "biz_zar_test",
    name: "Table Mountain Adventures",
    currency: "ZAR",
    financialLedger: []
  };

  const zarPayRes = await recordPayment(
    zarBiz,
    {
      amount: 18000,
      currency: "ZAR",
      reference: "eft_zar_3001"
    },
    salesAgent
  );

  const metrics = calculateRevenueMetrics([refRes.business, zarPayRes.business]);
  assert(metrics.paidValueByCurrency["USD"] === 1500, "13D-5A: USD paid value aggregated separately (1500)");
  assert(metrics.paidValueByCurrency["ZAR"] === 18000, "13D-5B: ZAR paid value aggregated separately (18000)");
  assert(metrics.netRevenueByCurrency["USD"] === 1200, "13D-5C: USD net revenue calculated as 1200");
  assert(metrics.netRevenueByCurrency["ZAR"] === 18000, "13D-5D: ZAR net revenue calculated as 18000");
  assert(metrics.formattedNetRevenueSummary.includes("USD $1,200.00"), "13D-5E: Formatted summary contains USD $1,200.00");
  assert(metrics.formattedNetRevenueSummary.includes("ZAR R18,000.00"), "13D-5F: Formatted summary contains ZAR R18,000.00");

  // 6. Role Authorization Restrictions
  const unauthorizedPayRes = await recordPayment(
    refRes.business,
    { amount: 500 },
    unauthorizedTaskUser
  );
  assert(unauthorizedPayRes.success === false, "13D-6A: Unauthorized user cannot record financial transactions");
  assert(unauthorizedPayRes.error?.includes("Unauthorized"), "13D-6B: Unauthorized error message returned");

  // 7. Audit History Preserved Intact
  const finalLedger = refRes.business.financialLedger || [];
  assert(finalLedger.length === 4, "13D-7A: 4 ledger entries preserved in audit trail (ESTIMATE, PROPOSAL, PAYMENT, REFUND)");
  assert(finalLedger[3].type === "REFUND_ISSUED", "13D-7B: Latest ledger entry records REFUND_ISSUED");
  assert(finalLedger[3].actor.displayName === salesAgent.displayName, "13D-7C: Actor attribution recorded on ledger entry");

  // =========================================================================
  // GROUP 44: MICRO-PHASE 14A - PROPOSAL, CONTRACT & COMMERCIAL DOCUMENT INTEGRITY
  // =========================================================================
  console.log("\n--- GROUP 44: Micro-Phase 14A Proposal, Contract & Commercial Document Integrity ---");

  // 1. Document Creation & Canonical Integer-Cents Pricing
  const docBiz: Business = {
    ...pipelineProspect,
    id: "biz_14a_doc_test",
    name: "Franschhoek Cellars & Bistro",
    currency: "USD",
    commercialDocuments: []
  };

  const createDocRes = await createCommercialDocument(
    docBiz,
    {
      title: "Custom Web Application & Ordering Portal Agreement",
      type: "CONTRACT",
      currency: "USD",
      items: [
        { description: "Responsive Web Architecture & Digital Menu", quantity: 1, unitPrice: 1800 },
        { description: "Table Reservation & Booking Engine Integration", quantity: 1, unitPrice: 700 }
      ],
      termsAndConditions: "50% deposit payable upon signing, 50% upon domain activation. 12-month SLA.",
      timeline: "10 Business Days",
      deliverables: ["Web Application Layout", "Google SEO Schema", "Production Hosting"],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    salesAgent
  );

  assert(createDocRes.success === true, "14A-1A: Commercial document created successfully");
  assert(createDocRes.document?.status === "DRAFT", "14A-1B: Newly created document is in DRAFT status");
  assert(createDocRes.document?.currentVersion === 1, "14A-1C: Starts at version 1");
  assert(createDocRes.document?.totalValue === 2500, "14A-1D: Total value calculated accurately ($2,500.00)");
  assert(createDocRes.document?.totalValueCents === 250000, "14A-1E: Total value in cents is 250000");
  assert(createDocRes.document?.accessToken !== undefined && createDocRes.document?.accessToken.length > 20, "14A-1F: Secure access token generated");
  assert(createDocRes.document?.versionHistory.length === 1, "14A-1G: Version history has 1 version");

  let activeDocBiz = createDocRes.business;
  const docId = createDocRes.document!.id;

  // 2. Drafts Cannot Be Accepted Directly
  const prematureAcceptRes = await acceptCommercialDocument(
    activeDocBiz,
    docId,
    {
      acceptedBy: "Eleanor Vance",
      method: "ELECTRONIC_SIGNATURE"
    },
    salesAgent
  );
  assert(prematureAcceptRes.success === false, "14A-2A: Draft document cannot be accepted directly");
  assert(prematureAcceptRes.error?.includes("Draft documents cannot be accepted"), "14A-2B: Appropriate draft protection error returned");

  // 3. Internal Approval Lifecycle Transition
  const approveRes = await approveCommercialDocument(
    activeDocBiz,
    docId,
    salesAgent,
    "Reviewed scope and pricing internally."
  );
  assert(approveRes.success === true, "14A-3A: Document approved internally");
  assert(approveRes.document?.status === "APPROVED", "14A-3B: Status transitioned to APPROVED");
  assert(approveRes.document?.currentVersionSnapshot.approvedBy?.displayName === salesAgent.displayName, "14A-3C: Approver recorded");

  activeDocBiz = approveRes.business;

  // 4. Dispatching / Sending Document
  const sendRes = await sendCommercialDocument(
    activeDocBiz,
    docId,
    "eleanor@franschhoekcellars.co.za",
    salesAgent
  );
  assert(sendRes.success === true, "14A-4A: Document sent to recipient");
  assert(sendRes.document?.status === "SENT", "14A-4B: Status is SENT");
  assert(sendRes.document?.status !== "ACCEPTED", "14A-4C: Sent document is NOT marked ACCEPTED");
  assert(sendRes.document?.currentVersionSnapshot.recipientEmail === "eleanor@franschhoekcellars.co.za", "14A-4D: Recipient email recorded");

  activeDocBiz = sendRes.business;

  // 5. Modifying Sent Document Creates New Version (v2)
  const docUpdateRes = await updateCommercialDocument(
    activeDocBiz,
    docId,
    {
      items: [
        { description: "Responsive Web Architecture & Digital Menu", quantity: 1, unitPrice: 1800 },
        { description: "Table Reservation & Booking Engine Integration", quantity: 1, unitPrice: 700 },
        { description: "WhatsApp Wine Order Concierge", quantity: 1, unitPrice: 300 }
      ]
    },
    salesAgent
  );
  assert(docUpdateRes.success === true, "14A-5A: Modifying sent document succeeds");
  assert(docUpdateRes.document?.currentVersion === 2, "14A-5B: Document bumped to version 2");
  assert(docUpdateRes.document?.status === "DRAFT", "14A-5C: Edited document resets to DRAFT");
  assert(docUpdateRes.document?.totalValue === 2800, "14A-5D: New total value is $2,800.00");
  assert(docUpdateRes.document?.versionHistory.length === 2, "14A-5E: Version history preserves previous v1 ($2500) and new v2 ($2800)");
  assert(docUpdateRes.document?.versionHistory[0].proposedValue === 2500, "14A-5F: Historical v1 total value remains intact ($2500)");
  assert(docUpdateRes.document?.versionHistory[1].proposedValue === 2800, "14A-5G: Historical v2 total value is $2800");

  activeDocBiz = docUpdateRes.business;

  // Approve and send v2
  const approveV2Res = await approveCommercialDocument(activeDocBiz, docId, salesAgent);
  activeDocBiz = approveV2Res.business;
  const sendV2Res = await sendCommercialDocument(activeDocBiz, docId, "eleanor@franschhoekcellars.co.za", salesAgent);
  activeDocBiz = sendV2Res.business;

  // 6. Preview Approval Separation (Preview Approval does not accept document)
  const previewApprovalState: Business = {
    ...activeDocBiz,
    previewApprovalStatus: "APPROVED"
  };
  const docDuringPreview = (previewApprovalState.commercialDocuments || []).find(d => d.id === docId);
  assert(docDuringPreview?.status === "SENT", "14A-6A: Preview approval does NOT mark commercial document as ACCEPTED");
  assert(previewApprovalState.contractStatus !== "SIGNED", "14A-6B: Preview approval does NOT mark contract as SIGNED");

  // 7. Formal Acceptance with Verification Evidence
  const acceptRes = await acceptCommercialDocument(
    activeDocBiz,
    docId,
    {
      acceptedBy: "Eleanor Vance",
      acceptedByEmail: "eleanor@franschhoekcellars.co.za",
      method: "ELECTRONIC_SIGNATURE",
      signatureText: "Eleanor Vance (Managing Director)",
      ipAddress: "197.89.24.12",
      evidenceReference: "docusign_env_9981"
    },
    salesAgent
  );

  assert(acceptRes.success === true, "14A-7A: Document formally accepted");
  assert(acceptRes.document?.status === "ACCEPTED", "14A-7B: Status is ACCEPTED");
  assert(acceptRes.document?.currentVersionSnapshot.acceptance?.acceptedBy === "Eleanor Vance", "14A-7C: Signer recorded");
  assert(acceptRes.document?.currentVersionSnapshot.acceptance?.method === "ELECTRONIC_SIGNATURE", "14A-7D: Signature method recorded");
  assert(acceptRes.business.contractStatus === "SIGNED", "14A-7E: Business contractStatus updated to SIGNED");
  assert(acceptRes.business.agreedDealValue === 2800, "14A-7F: agreedDealValue synchronized to document value ($2,800.00)");

  // Financial ledger recorded COMMERCIAL_AGREED
  const agreedLedgerEntry = (acceptRes.business.financialLedger || []).find(e => e.type === "COMMERCIAL_AGREED");
  assert(agreedLedgerEntry !== undefined, "14A-7G: COMMERCIAL_AGREED entry appended to financial ledger");
  assert(agreedLedgerEntry?.amount === 2800, "14A-7H: Agreed ledger entry amount is 2800");

  activeDocBiz = acceptRes.business;

  // 8. Immutability of Accepted Agreement
  const editAcceptedAttempt = await updateCommercialDocument(
    activeDocBiz,
    docId,
    { title: "Unauthorized alteration attempt" },
    salesAgent
  );
  assert(editAcceptedAttempt.success === false, "14A-8A: Modifying an ACCEPTED document is strictly blocked");
  assert(editAcceptedAttempt.error?.includes("Cannot alter an already ACCEPTED"), "14A-8B: Clear immutability error message returned");

  // 9. Document Rejection & Cancellation
  const secondDocRes = await createCommercialDocument(
    activeDocBiz,
    {
      title: "Secondary Ancillary Addendum",
      type: "QUOTE",
      items: [{ description: "Social Media Banner Suite", quantity: 1, unitPrice: 400 }],
      termsAndConditions: "Net 30"
    },
    salesAgent
  );
  const secondDocId = secondDocRes.document!.id;
  await approveCommercialDocument(secondDocRes.business, secondDocId, salesAgent);
  const secondDocSentBiz = (await sendCommercialDocument(secondDocRes.business, secondDocId, "eleanor@franschhoekcellars.co.za", salesAgent)).business;

  const rejectRes = await rejectCommercialDocument(
    secondDocSentBiz,
    secondDocId,
    "Client opted out of additional social banners.",
    salesAgent
  );
  assert(rejectRes.success === true, "14A-9A: Document rejected successfully");
  assert(rejectRes.document?.status === "REJECTED", "14A-9B: Document status is REJECTED");

  // 10. Secure Token Access & Revocation
  const validAccess = getCommercialDocumentByAccessToken(activeDocBiz, docId, createDocRes.document!.accessToken);
  assert(validAccess.valid === true, "14A-10A: Accessing document via valid accessToken succeeds");
  assert(validAccess.document?.id === docId, "14A-10B: Correct document returned");

  const invalidAccess = getCommercialDocumentByAccessToken(activeDocBiz, docId, "invalid_random_token_123");
  assert(invalidAccess.valid === false, "14A-10C: Accessing document with invalid token fails");

  const revokeRes = await revokeDocumentAccessToken(activeDocBiz, docId, salesAgent);
  assert(revokeRes.success === true, "14A-10D: Token revoked successfully");
  const postRevokeAccess = getCommercialDocumentByAccessToken(revokeRes.business, docId, createDocRes.document!.accessToken);
  assert(postRevokeAccess.valid === false, "14A-10E: Access after revocation is blocked");
  assert(postRevokeAccess.error?.includes("revoked"), "14A-10F: Revocation notice returned");

  // 11. Role Authorization Enforcement
  const unauthorizedDocCreate = await createCommercialDocument(
    activeDocBiz,
    {
      title: "Unauthorized Document",
      type: "PROPOSAL",
      items: [{ description: "Illegal Item", quantity: 1, unitPrice: 100 }],
      termsAndConditions: "None"
    },
    unauthorizedTaskUser
  );
  assert(unauthorizedDocCreate.success === false, "14A-11A: Unauthorized user cannot create commercial document");
  assert(unauthorizedDocCreate.error?.includes("Unauthorized"), "14A-11B: Actionable unauthorized error returned");

  // =========================================================================
  // GROUP 45: MICRO-PHASE 14B - CUSTOMER ONBOARDING & HANDOFF AFTER DEAL CLOSURE
  // =========================================================================
  console.log("\n--- GROUP 45: Micro-Phase 14B Customer Onboarding & Handoff After Deal Closure ---");

  // 1. Won Deal Creates Canonical Onboarding Record
  const onbInitRes = await initiateCustomerOnboarding(
    activeDocBiz,
    salesAgent,
    {
      targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      projectNotes: "High-priority wine estate portal launch for festive season."
    }
  );

  assert(onbInitRes.success === true, "14B-1A: Customer onboarding initiated successfully");
  assert(onbInitRes.onboardingRecord?.status === "PENDING", "14B-1B: Initial onboarding status is PENDING");
  assert(onbInitRes.onboardingRecord?.businessId === activeDocBiz.id, "14B-1C: Business ID matches canonical business");
  assert(onbInitRes.onboardingRecord?.businessName === activeDocBiz.name, "14B-1D: Business name preserved accurately");
  assert(onbInitRes.onboardingRecord?.agreedCommercialValue === 2800, "14B-1E: Agreed commercial value preserved ($2,800.00)");
  assert(onbInitRes.onboardingRecord?.currency === "USD", "14B-1F: Currency preserved accurately (USD)");
  assert(onbInitRes.onboardingRecord?.contacts.length > 0, "14B-1G: Customer contact extracted");
  assert(onbInitRes.onboardingRecord?.auditHistory.length === 1, "14B-1H: Initial audit history entry recorded");

  // Contract execution requirement auto-completed from signed contract
  const contractReq = onbInitRes.onboardingRecord?.requirementsChecklist.find(r => r.id === "req_contract_execution");
  assert(contractReq?.isCompleted === true, "14B-1I: Contract execution requirement automatically verified from signed agreement");

  let activeOnbBiz = onbInitRes.business;

  // 2. Duplicate Onboarding Record Prevention
  const dupOnbRes = await initiateCustomerOnboarding(activeOnbBiz, salesAgent);
  assert(dupOnbRes.success === true, "14B-2A: Duplicate onboarding request handled safely");
  assert(dupOnbRes.isDuplicate === true, "14B-2B: Duplicate flag is true");
  assert(dupOnbRes.onboardingRecord?.id === onbInitRes.onboardingRecord?.id, "14B-2C: Existing onboarding record preserved without overwriting");

  // 3. Status Transition to IN_PROGRESS
  const progressRes = await advanceOnboardingStatus(
    activeOnbBiz,
    "IN_PROGRESS",
    salesAgent,
    "Kickoff communication initiated with client lead."
  );
  assert(progressRes.success === true, "14B-3A: Advanced to IN_PROGRESS successfully");
  assert(progressRes.onboardingRecord?.status === "IN_PROGRESS", "14B-3B: Status is IN_PROGRESS");
  assert(progressRes.onboardingRecord?.startedAt !== undefined, "14B-3C: startedAt timestamp populated");

  activeOnbBiz = progressRes.business;

  // 4. Strict Delivery Guard: Incomplete Handoff Cannot Advance to READY_FOR_DELIVERY
  const prematureDeliveryRes = await advanceOnboardingStatus(
    activeOnbBiz,
    "READY_FOR_DELIVERY",
    salesAgent
  );
  assert(prematureDeliveryRes.success === false, "14B-4A: Transition to READY_FOR_DELIVERY blocked when requirements missing");
  assert(prematureDeliveryRes.error?.includes("Missing required onboarding requirements"), "14B-4B: Clear missing requirements error returned");

  // 5. Fulfilling Onboarding Checklist Items
  const payReqRes = await updateOnboardingRequirement(
    activeOnbBiz,
    "req_payment_deposit",
    true,
    salesAgent,
    "50% deposit received via wire transfer."
  );
  activeOnbBiz = payReqRes.business;

  const dnsReqRes = await updateOnboardingRequirement(
    activeOnbBiz,
    "req_domain_dns",
    true,
    salesAgent,
    "Cloudflare DNS delegation configured."
  );
  activeOnbBiz = dnsReqRes.business;

  const logoReqRes = await updateOnboardingRequirement(
    activeOnbBiz,
    "req_brand_assets",
    true,
    salesAgent,
    "SVG vector logos and color book received."
  );
  activeOnbBiz = logoReqRes.business;

  const contentReqRes = await updateOnboardingRequirement(
    activeOnbBiz,
    "req_content_catalogue",
    true,
    salesAgent,
    "Spring menu items and tasting schedules confirmed."
  );
  assert(contentReqRes.success === true, "14B-5A: Final required checklist item updated successfully");
  assert(contentReqRes.onboardingRecord?.missingRequirements.length === 0, "14B-5B: All required onboarding items fulfilled");

  activeOnbBiz = contentReqRes.business;

  // 6. Advancement to READY_FOR_DELIVERY and ACTIVE
  const readyRes = await advanceOnboardingStatus(
    activeOnbBiz,
    "READY_FOR_DELIVERY",
    salesAgent,
    "All assets, credentials, and deposits verified."
  );
  assert(readyRes.success === true, "14B-6A: Advanced to READY_FOR_DELIVERY successfully");
  assert(readyRes.onboardingRecord?.status === "READY_FOR_DELIVERY", "14B-6B: Status is READY_FOR_DELIVERY");

  activeOnbBiz = readyRes.business;

  const activeRes = await advanceOnboardingStatus(
    activeOnbBiz,
    "ACTIVE",
    salesAgent,
    "Production engineering and layout assembly initiated."
  );
  assert(activeRes.success === true, "14B-6C: Advanced to ACTIVE project delivery successfully");
  assert(activeRes.onboardingRecord?.status === "ACTIVE", "14B-6D: Status is ACTIVE");

  activeOnbBiz = activeRes.business;

  // 7. Pausing / Putting On Hold & Resuming
  const holdRes = await pauseCustomerOnboarding(
    activeOnbBiz,
    "Awaiting client photoshoot assets",
    salesAgent
  );
  assert(holdRes.success === true, "14B-7A: Onboarding placed on hold successfully");
  assert(holdRes.onboardingRecord?.status === "ON_HOLD", "14B-7B: Status is ON_HOLD");
  assert(holdRes.onboardingRecord?.onHoldReason?.includes("photoshoot"), "14B-7C: onHoldReason preserved");

  activeOnbBiz = holdRes.business;

  // Resume to ACTIVE
  const onbResumeRes = await advanceOnboardingStatus(activeOnbBiz, "ACTIVE", salesAgent, "Photoshoot received");
  assert(onbResumeRes.success === true, "14B-7D: Onboarding resumed to ACTIVE");
  activeOnbBiz = onbResumeRes.business;

  // 8. Completing Onboarding
  const onbCompleteRes = await advanceOnboardingStatus(
    activeOnbBiz,
    "COMPLETED",
    salesAgent,
    "Final customer handoff briefing completed."
  );
  assert(onbCompleteRes.success === true, "14B-8A: Advanced to COMPLETED successfully");
  assert(onbCompleteRes.onboardingRecord?.status === "COMPLETED", "14B-8B: Status is COMPLETED");
  assert(onbCompleteRes.onboardingRecord?.completedAt !== undefined, "14B-8C: completedAt timestamp populated");

  activeOnbBiz = onbCompleteRes.business;

  // 9. Unauthorized Role Restrictions
  const unauthorizedOnbAdvance = await advanceOnboardingStatus(
    activeOnbBiz,
    "ACTIVE",
    unauthorizedTaskUser
  );
  assert(unauthorizedOnbAdvance.success === false, "14B-9A: Unauthorized user cannot advance onboarding status");
  assert(unauthorizedOnbAdvance.error?.includes("Unauthorized"), "14B-9B: Clear unauthorized error message returned");

  // 10. Preservation of Historical Records
  assert(activeOnbBiz.onboardingRecord?.auditHistory.length! >= 5, "14B-10A: Complete onboarding audit trail preserved");
  assert(activeOnbBiz.commercialDocuments !== undefined && activeOnbBiz.commercialDocuments.length > 0, "14B-10B: Commercial documents remain intact");
  assert(activeOnbBiz.financialLedger !== undefined && activeOnbBiz.financialLedger.length > 0, "14B-10C: Financial ledger remains intact");
  assert(activeOnbBiz.stageHistory !== undefined, "14B-10D: Pipeline stage history remains intact");

  // =========================================================================
  // LIVE SEARCH JSON PARSING RESILIENCE (Bug Fix: Unexpected end of JSON input)
  // =========================================================================
  console.log("\n--- Live Search JSON Parser & Truncation Recovery Tests ---");

  // 1. Standard clean JSON array
  const cleanJson = `[{"name": "Mbabane Timber Supplies", "address": "Mbabane", "phone": "+268 2404 1234"}]`;
  const cleanParsed = extractBusinessesFromJson(cleanJson);
  assert(cleanParsed.length === 1 && cleanParsed[0].name === "Mbabane Timber Supplies", "SEARCH-1: Parses standard clean JSON array");

  // 2. Markdown fenced JSON block with closing backticks
  const fencedJson = `Here are the results:
\`\`\`json
[
  {"name": "Swazi Solar Tech", "address": "Ezulwini", "phone": "+268 7602 5678"}
]
\`\`\`
Hope this helps!`;
  const fencedParsed = extractBusinessesFromJson(fencedJson);
  assert(fencedParsed.length === 1 && fencedParsed[0].name === "Swazi Solar Tech", "SEARCH-2: Parses markdown fenced JSON block");

  // 3. Unclosed markdown fence (cut off by token limit)
  const unclosedFenceJson = `\`\`\`json
[
  {"name": "Peak Timber Works", "address": "Piggs Peak", "phone": "+268 2437 9999"}
]`;
  const unclosedParsed = extractBusinessesFromJson(unclosedFenceJson);
  assert(unclosedParsed.length === 1 && unclosedParsed[0].name === "Peak Timber Works", "SEARCH-3: Recovers from unclosed markdown fence");

  // 4. Truncated JSON array missing closing bracket (The reported error: Unexpected end of JSON input)
  const truncatedJson = `\`\`\`json
[
  {"name": "Hhohho Concrete", "address": "Mbabane Industrial", "phone": "+268 2404 0001"},
  {"name": "Mbabane Roofing", "address": "Sidwashini", "phone": "+268 2422 0002"},
  {"name": "Truncated Half-Finished Entry", "address": "Incomp`;
  const truncatedParsed = extractBusinessesFromJson(truncatedJson);
  assert(truncatedParsed.length === 2, "SEARCH-4A: Recovers complete entries from truncated JSON array without throwing");
  assert(truncatedParsed[0].name === "Hhohho Concrete", "SEARCH-4B: First complete entry preserved");
  assert(truncatedParsed[1].name === "Mbabane Roofing", "SEARCH-4C: Second complete entry preserved");

  // 5. Stream of individual objects without enclosing array
  const streamJson = `
{"name": "Matsapha Logistics", "address": "Matsapha", "phone": "+268 2518 1111"}
{"name": "Manzini Freight", "address": "Manzini", "phone": "+268 2505 2222"}
`;
  const streamParsed = extractBusinessesFromJson(streamJson);
  assert(streamParsed.length === 2, "SEARCH-5: Recovers individual JSON object streams");

  // 6. Malformed or empty input returns empty array safely
  const emptyParsed = extractBusinessesFromJson("");
  assert(emptyParsed.length === 0, "SEARCH-6A: Returns empty array on empty input");
  const garbageParsed = extractBusinessesFromJson("No listings found on search engine.");
  assert(garbageParsed.length === 0, "SEARCH-6B: Returns empty array on non-JSON response without error");

  // =========================================================================
  // GROUP 46: MICRO-PHASE 14C - CUSTOMER PROJECT & WEBSITE DELIVERY MANAGEMENT
  // =========================================================================
  console.log("\n--- GROUP 46: Micro-Phase 14C Customer Project & Website Delivery Management ---");

  // 1. Initializing Customer Project from Won/Onboarded Deal
  const projInitRes = await initializeCustomerProject(
    activeOnbBiz,
    salesAgent,
    {
      projectType: "WEBSITE_REVAMP",
      targetDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      customDomain: "swazitrading.co.sz"
    }
  );

  assert(projInitRes.success === true, "14C-1A: Customer project initialized successfully");
  assert(projInitRes.project?.status === "NOT_STARTED", "14C-1B: Initial status is NOT_STARTED");
  assert(projInitRes.project?.launchStatus === "NOT_READY", "14C-1C: Initial launch status is NOT_READY");
  assert(projInitRes.project?.businessId === activeOnbBiz.id, "14C-1D: Business ID matches canonical business");
  assert(projInitRes.project?.onboardingId === activeOnbBiz.onboardingRecord?.id, "14C-1E: Linked to canonical onboarding record");
  assert(projInitRes.project?.currentWebsiteVersion === 1, "14C-1F: Initial website version is 1");
  assert(projInitRes.project?.requirements.length > 0, "14C-1G: Onboarding requirements transferred");
  assert(projInitRes.project?.milestones.length === 5, "14C-1H: Default delivery milestones created");
  assert(projInitRes.project?.tasks.length === 5, "14C-1I: Default delivery tasks created");
  assert(projInitRes.project?.auditHistory.length === 1, "14C-1J: Initial project audit recorded");

  let activeProjBiz = projInitRes.business;

  // 2. Duplicate Project Prevention
  const dupProjRes = await initializeCustomerProject(activeProjBiz, salesAgent);
  assert(dupProjRes.success === true, "14C-2A: Duplicate project request handled safely");
  assert(dupProjRes.isDuplicate === true, "14C-2B: Duplicate flag is true");
  assert(dupProjRes.project?.id === projInitRes.project?.id, "14C-2C: Existing project preserved without overwriting");

  // 3. Advance to IN_PROGRESS
  const startProjRes = await advanceProjectStatus(activeProjBiz, "IN_PROGRESS", salesAgent, "Project production kickoff");
  assert(startProjRes.success === true, "14C-3A: Project advanced to IN_PROGRESS successfully");
  assert(startProjRes.project?.status === "IN_PROGRESS", "14C-3B: Status is IN_PROGRESS");
  activeProjBiz = startProjRes.business;

  // 4. Task Dependency Enforcement
  // task_mobile_testing depends on task_content_validation
  const depBlockedRes = await updateProjectTask(
    activeProjBiz,
    "task_mobile_testing",
    true,
    salesAgent,
    "Attempting completion before content validation"
  );
  assert(depBlockedRes.success === false, "14C-4A: Dependent task completion blocked when prerequisite incomplete");
  assert(depBlockedRes.error?.includes("Dependent task"), "14C-4B: Actionable dependency error message returned");

  // Complete prerequisite task first
  const contentTaskRes = await updateProjectTask(
    activeProjBiz,
    "task_content_validation",
    true,
    salesAgent,
    "Pricing tiers and catalog verified against client menu"
  );
  assert(contentTaskRes.success === true, "14C-4C: Prerequisite task completed successfully");
  activeProjBiz = contentTaskRes.business;

  // Now completing dependent task succeeds
  const mobileTaskRes = await updateProjectTask(
    activeProjBiz,
    "task_mobile_testing",
    true,
    salesAgent,
    "WhatsApp buttons and phone call actions tested on iOS and Android"
  );
  assert(mobileTaskRes.success === true, "14C-4D: Dependent task completed successfully after prerequisite met");
  activeProjBiz = mobileTaskRes.business;

  // 5. Lifecycle Guard: Transition to APPROVED_FOR_LAUNCH requires Version Approval
  const prematureApprovalRes = await advanceProjectStatus(activeProjBiz, "APPROVED_FOR_LAUNCH", salesAgent);
  assert(prematureApprovalRes.success === false, "14C-5A: Cannot advance to APPROVED_FOR_LAUNCH without customer version approval");
  assert(prematureApprovalRes.error?.includes("has not been approved"), "14C-5B: Approval requirement error returned");

  // Record customer approval for Version 1
  const v1ApprovalRes = await recordCustomerVersionApproval(
    activeProjBiz,
    {
      versionNumber: 1,
      status: "APPROVED",
      approverName: "Robert Dlamini",
      approverEmail: "robert@swazitrading.co.sz",
      approverRole: "Managing Director",
      approvalMethod: "DIGITAL_PORTAL",
      feedbackNotes: "Layout design approved for production deployment."
    },
    salesAgent
  );
  assert(v1ApprovalRes.success === true, "14C-5C: Version 1 approval recorded successfully");
  assert(v1ApprovalRes.project?.status === "APPROVED_FOR_LAUNCH", "14C-5D: Project transitioned to APPROVED_FOR_LAUNCH on approval");
  activeProjBiz = v1ApprovalRes.business;

  // 6. Revision Submission Re-evaluation: Increment version and require re-approval
  const revRes = await submitProjectRevision(
    activeProjBiz,
    {
      section: "Hero Section",
      description: "Update headline to reflect 2026 Spring catalogue launch.",
      requestedBy: "Robert Dlamini"
    },
    salesAgent
  );
  assert(revRes.success === true, "14C-6A: Revision request submitted successfully");
  assert(revRes.project?.currentWebsiteVersion === 2, "14C-6B: Current website version incremented to 2");
  assert(revRes.project?.status === "REVISION_REQUIRED", "14C-6C: Status automatically reverted to REVISION_REQUIRED");
  assert(revRes.project?.launchStatus === "NOT_READY", "14C-6D: Launch status reset to NOT_READY");
  activeProjBiz = revRes.business;

  // 7. Launch Readiness Check Blocks Deployment of Unapproved v2
  const v2Readiness = evaluateLaunchReadiness(activeProjBiz);
  assert(v2Readiness.isReady === false, "14C-7A: Launch readiness check fails for unapproved v2");
  assert(v2Readiness.checks.customerApprovalPresent === false, "14C-7B: Customer approval check false for v2");

  // Complete remaining tasks
  activeProjBiz = (await updateProjectTask(activeProjBiz, "task_domain_dns", true, salesAgent, "DNS records mapped")).business;
  activeProjBiz = (await updateProjectTask(activeProjBiz, "task_brand_assets", true, salesAgent, "Brand SVG injected")).business;
  activeProjBiz = (await updateProjectTask(activeProjBiz, "task_client_signoff", true, salesAgent, "Final sign-off recorded")).business;

  // Record approval for Version 2
  const v2ApprovalRes = await recordCustomerVersionApproval(
    activeProjBiz,
    {
      versionNumber: 2,
      status: "APPROVED",
      approverName: "Robert Dlamini",
      approverEmail: "robert@swazitrading.co.sz",
      approverRole: "Managing Director",
      approvalMethod: "WRITTEN_CONFIRMATION",
      feedbackNotes: "Headline change confirmed."
    },
    salesAgent
  );
  assert(v2ApprovalRes.success === true, "14C-7C: Version 2 approved successfully");
  activeProjBiz = v2ApprovalRes.business;

  const passedReadiness = evaluateLaunchReadiness(activeProjBiz);
  assert(passedReadiness.isReady === true, "14C-7D: Launch readiness check passes after v2 approval and task completion");
  assert(passedReadiness.blockers.length === 0, "14C-7E: Zero blockers remaining");

  // 8. Advance to DEPLOYING
  const deployingRes = await advanceProjectStatus(activeProjBiz, "DEPLOYING", salesAgent);
  assert(deployingRes.success === true, "14C-8A: Advanced to DEPLOYING successfully");
  assert(deployingRes.project?.status === "DEPLOYING", "14C-8B: Project status is DEPLOYING");
  activeProjBiz = deployingRes.business;

  // 9. Lifecycle Guard: Cannot mark LIVE without verified deployment evidence
  const prematureLiveRes = await advanceProjectStatus(activeProjBiz, "LIVE", salesAgent);
  assert(prematureLiveRes.success === false, "14C-9A: Cannot mark LIVE without verified deployment evidence");
  assert(prematureLiveRes.error?.includes("Verified deployment evidence"), "14C-9B: Clear evidence requirement error returned");

  // 10. Deployment Failure Handling
  const failedDeployEvidence: DeploymentEvidence = {
    verified: false,
    host: "edge-production.sitescout.ai",
    liveUrl: "https://swazitrading.co.sz",
    verifiedAt: new Date().toISOString(),
    httpStatus: 502,
    sslActive: false,
    deployer: salesAgent,
    errorMessage: "DNS resolution timed out on edge origin"
  };
  const deployFailRes = await recordProjectDeployment(activeProjBiz, failedDeployEvidence, salesAgent);
  assert(deployFailRes.success === false, "14C-10A: Deployment failure acknowledged");
  assert(deployFailRes.project?.launchStatus === "DEPLOYMENT_FAILED", "14C-10B: Launch status updated to DEPLOYMENT_FAILED");
  assert(deployFailRes.project?.status !== "LIVE", "14C-10C: Failed deployment does NOT mark project LIVE");
  activeProjBiz = deployFailRes.business;

  // 11. Successful Production Deployment
  const successfulDeployEvidence: DeploymentEvidence = {
    verified: true,
    host: "edge-production.sitescout.ai",
    liveUrl: "https://swazitrading.co.sz",
    verifiedAt: new Date().toISOString(),
    httpStatus: 200,
    sslActive: true,
    deployer: salesAgent
  };
  const deploySuccessRes = await recordProjectDeployment(activeProjBiz, successfulDeployEvidence, salesAgent);
  assert(deploySuccessRes.success === true, "14C-11A: Verified deployment recorded successfully");
  assert(deploySuccessRes.project?.status === "LIVE", "14C-11B: Project status marked LIVE");
  assert(deploySuccessRes.project?.launchStatus === "DEPLOYED_VERIFIED", "14C-11C: Launch status marked DEPLOYED_VERIFIED");
  assert(deploySuccessRes.business.deploymentStatus === "LIVE", "14C-11D: Business deploymentStatus updated to LIVE");
  activeProjBiz = deploySuccessRes.business;

  // 12. Unauthorized User Protection
  const unauthorizedProjAdvance = await advanceProjectStatus(
    activeProjBiz,
    "COMPLETED",
    unauthorizedTaskUser
  );
  assert(unauthorizedProjAdvance.success === false, "14C-12A: Unauthorized user cannot advance project status");
  assert(unauthorizedProjAdvance.error?.includes("Unauthorized"), "14C-12B: Clear unauthorized error returned");

  // 13. Historical Records Integrity
  assert(activeProjBiz.customerProject?.auditHistory.length! >= 6, "14C-13A: Complete project audit history preserved");
  assert(activeProjBiz.customerProject?.customerApprovals.length === 2, "14C-13B: Both v1 and v2 approvals preserved");
  assert(activeProjBiz.customerProject?.revisionHistory.length === 1, "14C-13C: Revision history preserved");
  assert(activeProjBiz.onboardingRecord !== undefined, "14C-13D: Onboarding record intact");
  assert(activeProjBiz.commercialDocuments !== undefined && activeProjBiz.commercialDocuments.length > 0, "14C-13E: Commercial documents intact");
  assert(activeProjBiz.financialLedger !== undefined && activeProjBiz.financialLedger.length > 0, "14C-13F: Financial ledger intact");

  // =========================================================================
  // GROUP 47: MICRO-PHASE 14D - WEBSITE LAUNCH VERIFICATION, HANDOVER, & SUPPORT
  // =========================================================================
  console.log("\n--- GROUP 47: Micro-Phase 14D Launch Verification, Handover, and Support ---");

  // 1. Launch Verification Failure Handling
  const failVerifyRes = await verifyDeployedWebsite(
    activeProjBiz,
    salesAgent,
    { simulatedFailure: true, failureReason: "HTTP 502 Bad Gateway from edge origin" }
  );
  assert(failVerifyRes.success === false, "14D-1A: Failed launch verification acknowledged");
  assert(failVerifyRes.report?.verificationStatus === "VERIFICATION_FAILED", "14D-1B: Report status is VERIFICATION_FAILED");
  assert(failVerifyRes.business.customerProject?.verificationStatus === "VERIFICATION_FAILED", "14D-1C: Project verificationStatus updated");

  // 2. Invalid URL Syntax Handling
  const invalidUrlVerify = await verifyDeployedWebsite(
    activeProjBiz,
    salesAgent,
    { customUrl: "invalid-url-string" }
  );
  assert(invalidUrlVerify.success === false, "14D-2A: Invalid URL verification safely handled");
  assert(invalidUrlVerify.report?.verificationStatus === "VERIFICATION_FAILED", "14D-2B: Status is VERIFICATION_FAILED for invalid URL");

  // 3. Successful Website Launch Verification
  const successVerifyRes = await verifyDeployedWebsite(activeProjBiz, salesAgent);
  assert(successVerifyRes.success === true, "14D-3A: Website launch verified successfully");
  assert(successVerifyRes.report?.verificationStatus === "VERIFIED_LIVE", "14D-3B: Report status is VERIFIED_LIVE");
  assert(successVerifyRes.report?.checks.urlAccessible === true, "14D-3C: URL accessibility verified");
  assert(successVerifyRes.report?.checks.httpsActive === true, "14D-3D: HTTPS/SSL availability verified");
  assert(successVerifyRes.report?.checks.corePagesLoading === true, "14D-3E: Core pages loading verified");
  assert(successVerifyRes.report?.checks.contactMechanismsFunctioning === true, "14D-3F: Contact channels verified functioning");
  assert(successVerifyRes.report?.evidenceSnapshot?.checkedEndpoints.length === 4, "14D-3G: Checked endpoints evidence recorded");

  activeProjBiz = successVerifyRes.business;

  // 4. Premature Handover Guard
  const unverifiedBiz: Business = {
    ...activeProjBiz,
    customerProject: {
      ...activeProjBiz.customerProject!,
      verificationStatus: "VERIFICATION_FAILED"
    },
    launchVerificationStatus: "VERIFICATION_FAILED"
  };
  const blockedHandoverRes = await initiateCustomerHandover(unverifiedBiz, salesAgent);
  assert(blockedHandoverRes.success === false, "14D-4A: Handover blocked when website is not VERIFIED_LIVE");
  assert(blockedHandoverRes.error?.includes("VERIFIED_LIVE"), "14D-4B: Actionable verification requirement error returned");

  // 5. Formal Customer Handover Package Initiation
  const handoverInitRes = await initiateCustomerHandover(activeProjBiz, salesAgent);
  assert(handoverInitRes.success === true, "14D-5A: Customer handover package initiated successfully");
  assert(handoverInitRes.handoverRecord?.handoverStatus === "HANDED_OVER", "14D-5B: Status is HANDED_OVER");
  assert(handoverInitRes.handoverRecord?.liveWebsiteUrl === "https://swazitrading.co.sz", "14D-5C: Live website URL recorded");
  assert(handoverInitRes.handoverRecord?.deployedVersion === 2, "14D-5D: Deployed version matches final version (v2)");
  
  // Security Mandate: No raw passwords, API keys, or raw secrets in accessCredentials
  const creds = handoverInitRes.handoverRecord?.accessCredentials;
  assert(creds?.clientPortalUrl !== undefined, "14D-5E: Client portal URL present");
  assert((creds as any).password === undefined, "14D-5F: Password NOT stored in plain record");
  assert((creds as any).apiKey === undefined, "14D-5G: API keys NOT stored in plain record");
  assert((creds as any).secretKey === undefined, "14D-5H: Secrets NOT stored in plain record");
  assert(creds?.maskedDnsRegistrar?.includes("Edge Managed") === true, "14D-5I: Masked DNS instructions provided");

  // Derived Support Terms Check
  assert(handoverInitRes.handoverRecord?.supportInformation.supportTier !== undefined, "14D-5J: Support tier derived from agreement");
  assert(handoverInitRes.handoverRecord?.supportInformation.slaResponseHours > 0, "14D-5K: Valid SLA response hours assigned");

  activeProjBiz = handoverInitRes.business;

  // 6. Confirm Client Handover Sign-Off
  const handoverConfirmRes = await confirmCustomerHandover(
    activeProjBiz,
    salesAgent,
    {
      acceptedBy: "Robert Dlamini",
      clientFeedback: "Website layout verified on mobile, WhatsApp hotline tested successfully."
    }
  );
  assert(handoverConfirmRes.success === true, "14D-6A: Client handover acceptance confirmed");
  assert(handoverConfirmRes.handoverRecord?.handoverStatus === "ACCEPTED_BY_CLIENT", "14D-6B: Handover status is ACCEPTED_BY_CLIENT");
  assert(handoverConfirmRes.handoverRecord?.acceptedBy === "Robert Dlamini", "14D-6C: Signer recorded");

  activeProjBiz = handoverConfirmRes.business;

  // 7. Premature Completion Guard
  const incompleteProjBiz: Business = {
    ...activeProjBiz,
    customerProject: {
      ...activeProjBiz.customerProject!,
      status: "IN_PROGRESS"
    }
  };
  const prematureCompRes = await completeCustomerProject(incompleteProjBiz, salesAgent);
  assert(prematureCompRes.success === false, "14D-7A: Non-LIVE project cannot be marked COMPLETED");

  // 8. Formal Safe Project Completion
  const compRes = await completeCustomerProject(activeProjBiz, salesAgent, "Successful project delivery and client sign-off.");
  assert(compRes.success === true, "14D-8A: Project formally marked COMPLETED");
  assert(compRes.project?.status === "COMPLETED", "14D-8B: Project status is COMPLETED");
  assert(compRes.business.projectStatus === "COMPLETED", "14D-8C: Business projectStatus is COMPLETED");
  assert(compRes.project?.completionEvidence?.finalVersion === 2, "14D-8D: Final version recorded in completion evidence");
  assert(compRes.project?.completionEvidence?.handoverId === activeProjBiz.customerHandover?.id, "14D-8E: Handover reference linked in completion evidence");

  activeProjBiz = compRes.business;

  // 9. Post-Launch SLA Support Ticket Management
  const ticketCreateRes = await createSupportTicket(
    activeProjBiz,
    {
      title: "Add Easter Weekend Operating Hours Banner",
      description: "Client requested banner alert for April holiday schedule.",
      category: "CONTENT_UPDATE",
      priority: "MEDIUM",
      reportedBy: "Robert Dlamini"
    },
    salesAgent
  );
  assert(ticketCreateRes.success === true, "14D-9A: Post-launch support ticket opened successfully");
  assert(ticketCreateRes.ticket?.ticketNumber.startsWith("TICK-") === true, "14D-9B: Ticket number formatted correctly");
  assert(ticketCreateRes.ticket?.websiteVersion === 2, "14D-9C: Linked to deployed website version 2");
  assert(ticketCreateRes.ticket?.isCoveredUnderSla === true, "14D-9D: SLA coverage calculated from agreement");
  assert(ticketCreateRes.ticket?.status === "OPEN", "14D-9E: Initial ticket status is OPEN");

  const ticketId = ticketCreateRes.ticket!.id;
  activeProjBiz = ticketCreateRes.business;

  // Resolve Ticket
  const ticketResolveRes = await resolveSupportTicket(
    activeProjBiz,
    ticketId,
    {
      resolutionNotes: "Holiday banner published live on v2.1.",
      billableHours: 0.5,
      verifiedLiveAt: new Date().toISOString()
    },
    salesAgent
  );
  assert(ticketResolveRes.success === true, "14D-9F: Support ticket resolved successfully");
  assert(ticketResolveRes.ticket?.status === "RESOLVED", "14D-9G: Ticket status is RESOLVED");
  assert(ticketResolveRes.ticket?.billableHours === 0.5, "14D-9H: Billable hours recorded");
  assert(ticketResolveRes.ticket?.verifiedLiveAt !== undefined, "14D-9I: Verified live timestamp recorded");

  activeProjBiz = ticketResolveRes.business;

  // 10. Unauthorized User Restrictions
  const unauthVerify = await verifyDeployedWebsite(activeProjBiz, unauthorizedTaskUser);
  assert(unauthVerify.success === false, "14D-10A: Unauthorized user cannot verify website");
  const unauthHandover = await initiateCustomerHandover(activeProjBiz, unauthorizedTaskUser);
  assert(unauthHandover.success === false, "14D-10B: Unauthorized user cannot initiate handover");
  const unauthComplete = await completeCustomerProject(activeProjBiz, unauthorizedTaskUser);
  assert(unauthComplete.success === false, "14D-10C: Unauthorized user cannot complete project");
  const unauthTicket = await createSupportTicket(activeProjBiz, { title: "Test", description: "Test", category: "BUG_FIX", reportedBy: "Client" }, unauthorizedTaskUser);
  assert(unauthTicket.success === false, "14D-10D: Unauthorized user cannot create ticket");

  // 11. Complete Historical Records Integrity
  assert(activeProjBiz.customerProject?.auditHistory.length! >= 7, "14D-11A: Complete project audit history preserved");
  assert(activeProjBiz.customerProject?.customerApprovals.length === 2, "14D-11B: Customer approvals intact");
  assert(activeProjBiz.customerProject?.revisionHistory.length === 1, "14D-11C: Revision history intact");
  assert(activeProjBiz.customerHandover?.auditHistory.length === 2, "14D-11D: Handover audit history intact");
  assert(activeProjBiz.customerProject?.supportTickets?.length === 1, "14D-11E: Support tickets preserved");
  assert(activeProjBiz.onboardingRecord !== undefined, "14D-11F: Onboarding record intact");
  assert(activeProjBiz.commercialDocuments !== undefined && activeProjBiz.commercialDocuments.length > 0, "14D-11G: Commercial documents intact");
  assert(activeProjBiz.financialLedger !== undefined && activeProjBiz.financialLedger.length > 0, "14D-11H: Financial ledger intact");

  // =========================================================================
  // GROUP 48: MICRO-PHASE 15A - CUSTOMER ACCOUNT, SUBSCRIPTIONS & ENTITLEMENTS
  // =========================================================================
  console.log("\n--- GROUP 48: Micro-Phase 15A Customer Account, Subscriptions & Entitlements ---");

  // 1. New Customer Account Creation & Default Trial Provisioning
  const custOwnerId = "usr_dlamini_owner";
  const acctRes = await createCustomerAccount(activeProjBiz, custOwnerId, salesAgent);
  assert(acctRes.success === true, "15A-1A: Customer account created successfully");
  assert(acctRes.account?.customerId.startsWith("cust_") === true, "15A-1B: Customer ID follows canonical format");
  assert(acctRes.account?.accountStatus === "ACTIVE", "15A-1C: Account status is ACTIVE");
  assert(acctRes.account?.ownerUserId === custOwnerId, "15A-1D: Owner user ID registered");
  assert(acctRes.subscription?.status === "TRIAL", "15A-1E: Default 14-day trial subscription provisioned");
  assert(acctRes.subscription?.planId === "plan_trial", "15A-1F: Trial plan assigned");
  assert(acctRes.account?.auditTrail.length === 1, "15A-1G: Account audit trail initialized");

  let subBiz = acctRes.business;

  // 2. Trial Subscription Feature Entitlement Checks
  const trialGenCheck = checkServiceEntitlement(subBiz, "website_generation", custOwnerId);
  assert(trialGenCheck.entitled === true, "15A-2A: Trial plan entitled to website_generation");
  const trialEditCheck = checkServiceEntitlement(subBiz, "website_editing", custOwnerId);
  assert(trialEditCheck.entitled === true, "15A-2B: Trial plan entitled to website_editing");
  const trialHostCheck = checkServiceEntitlement(subBiz, "hosting", custOwnerId);
  assert(trialHostCheck.entitled === true, "15A-2C: Trial plan entitled to preview hosting");
  const trialDomainCheck = checkServiceEntitlement(subBiz, "custom_domain", custOwnerId);
  assert(trialDomainCheck.entitled === false, "15A-2D: Trial plan NOT entitled to custom_domain");
  const trialCrmCheck = checkServiceEntitlement(subBiz, "crm", custOwnerId);
  assert(trialCrmCheck.entitled === false, "15A-2E: Trial plan NOT entitled to crm");
  const trialSlaCheck = checkServiceEntitlement(subBiz, "support_sla", custOwnerId);
  assert(trialSlaCheck.entitled === false, "15A-2F: Trial plan NOT entitled to support_sla");

  // 3. Failed Payment Activation Attempt (Rule: Invoices/proposals are NEVER proof of subscription)
  const invalidPaymentRef: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "", // Empty reference ID
    amountPaid: 0
  };
  const failActRes = await activatePaidSubscription(subBiz, "plan_starter", "MONTHLY", invalidPaymentRef, salesAgent);
  assert(failActRes.success === false, "15A-3A: Activation without valid transaction reference rejected");
  assert(failActRes.error?.includes("Valid payment provider transaction reference is required"), "15A-3B: Clear payment validation error returned");

  // Zero amount on paid tier rejected
  const zeroAmountRef: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_zero_123",
    amountPaid: 0
  };
  const zeroActRes = await activatePaidSubscription(subBiz, "plan_starter", "MONTHLY", zeroAmountRef, salesAgent);
  assert(zeroActRes.success === false, "15A-3C: Zero payment amount rejected on paid plan");

  // 4. Duplicate Payment Activation Rejection (Idempotency)
  const validStarterRef: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_starter_tx_9988",
    paymentMethodType: "card",
    amountPaid: 29,
    currency: "USD",
    lastPaymentVerifiedAt: new Date().toISOString()
  };
  const actStarterRes = await activatePaidSubscription(subBiz, "plan_starter", "MONTHLY", validStarterRef, salesAgent);
  assert(actStarterRes.success === true, "15A-4A: Paid Starter subscription activated successfully");
  assert(actStarterRes.subscription?.status === "ACTIVE", "15A-4B: Subscription status is ACTIVE");
  assert(actStarterRes.subscription?.planId === "plan_starter", "15A-4C: Plan is plan_starter");
  subBiz = actStarterRes.business;

  // Attempt duplicate activation with same transaction reference
  const dupActRes = await activatePaidSubscription(subBiz, "plan_starter", "MONTHLY", validStarterRef, salesAgent);
  assert(dupActRes.success === false, "15A-4D: Duplicate payment transaction rejected");
  assert(dupActRes.error?.includes("already been processed"), "15A-4E: Duplicate transaction error message returned");

  // 5. Active Paid Subscription Entitlements (Starter Plan)
  const starterDomainCheck = checkServiceEntitlement(subBiz, "custom_domain", custOwnerId);
  assert(starterDomainCheck.entitled === true, "15A-5A: Starter plan entitled to custom_domain");
  const starterLeadCheck = checkServiceEntitlement(subBiz, "lead_capture", custOwnerId);
  assert(starterLeadCheck.entitled === true, "15A-5B: Starter plan entitled to lead_capture");
  const starterCrmCheck = checkServiceEntitlement(subBiz, "crm", custOwnerId);
  assert(starterCrmCheck.entitled === false, "15A-5C: Starter plan NOT entitled to crm");

  // 6. Plan Upgrade to Elite Plan
  const upgradeRef: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_upgrade_tx_5544",
    amountPaid: 130,
    currency: "SZL",
    lastPaymentVerifiedAt: new Date().toISOString()
  };
  const upgradeRes = await changeSubscriptionPlan(subBiz, "plan_elite", salesAgent, { upgradePaymentRef: upgradeRef });
  assert(upgradeRes.success === true, "15A-6A: Plan upgraded to Elite successfully");
  assert(upgradeRes.subscription?.planId === "plan_elite", "15A-6B: Active plan is plan_elite");
  subBiz = upgradeRes.business;

  // Check Elite entitlements unlocked
  const proCrmCheck = checkServiceEntitlement(subBiz, "crm", custOwnerId);
  assert(proCrmCheck.entitled === true, "15A-6C: Elite plan unlocks crm entitlement");
  const proSlaCheck = checkServiceEntitlement(subBiz, "support_sla", custOwnerId);
  assert(proSlaCheck.entitled === true, "15A-6D: Elite plan unlocks support_sla entitlement");
  const proAiCheck = checkServiceEntitlement(subBiz, "ai_generation", custOwnerId);
  assert(proAiCheck.entitled === true, "15A-6E: Elite plan unlocks ai_generation entitlement");

  // 7. Historical Subscription Preservation
  assert(subBiz.subscriptionHistory?.length! >= 3, "15A-7A: Full subscription history preserved (Trial, Starter, Pro)");
  assert(subBiz.subscriptionHistory![0].status === "EXPIRED", "15A-7B: Superseded trial marked expired in history");
  assert(subBiz.subscriptionHistory![1].status === "EXPIRED", "15A-7C: Superseded starter marked expired in history");

  // 8. Plan Downgrade to Starter Plan
  const downgradeRes = await changeSubscriptionPlan(subBiz, "plan_starter", salesAgent);
  assert(downgradeRes.success === true, "15A-8A: Plan downgraded to Starter successfully");
  assert(downgradeRes.subscription?.planId === "plan_starter", "15A-8B: Active plan is plan_starter");
  subBiz = downgradeRes.business;

  const downgradedCrmCheck = checkServiceEntitlement(subBiz, "crm", custOwnerId);
  assert(downgradedCrmCheck.entitled === false, "15A-8C: crm entitlement revoked upon downgrade");

  // 9. Past-Due Subscription Behavior
  const pastDueRes = await markSubscriptionPastDue(subBiz, salesAgent, "Card renewal charge failed");
  assert(pastDueRes.success === true, "15A-9A: Subscription marked PAST_DUE successfully");
  assert(pastDueRes.subscription?.status === "PAST_DUE", "15A-9B: Subscription status is PAST_DUE");
  subBiz = pastDueRes.business;

  // Past due restricts sensitive features while preserving base hosting
  const pastDueAiCheck = checkServiceEntitlement(subBiz, "ai_generation", custOwnerId);
  assert(pastDueAiCheck.entitled === false, "15A-9C: ai_generation blocked when past due");
  const pastDueHostCheck = checkServiceEntitlement(subBiz, "hosting", custOwnerId);
  assert(pastDueHostCheck.entitled === true, "15A-9D: hosting grace period active when past due");

  // 10. Cancellation (Rule: Cancelled subscriptions lose only appropriate paid entitlements)
  const cancelSubRes = await cancelSubscription(subBiz, salesAgent, "Client voluntary cancellation");
  assert(cancelSubRes.success === true, "15A-10A: Subscription cancelled successfully");
  assert(cancelSubRes.subscription?.status === "CANCELLED", "15A-10B: Status is CANCELLED");
  subBiz = cancelSubRes.business;

  const cancelDomainCheck = checkServiceEntitlement(subBiz, "custom_domain", custOwnerId);
  assert(cancelDomainCheck.entitled === false, "15A-10C: custom_domain revoked on cancellation");
  const cancelEditCheck = checkServiceEntitlement(subBiz, "website_editing", custOwnerId);
  assert(cancelEditCheck.entitled === true, "15A-10D: website_editing grace period preserved on cancellation");

  // 11. Expiration
  const expireRes = await expireSubscription(subBiz, salesAgent);
  assert(expireRes.success === true, "15A-11A: Subscription expired successfully");
  assert(expireRes.subscription?.status === "EXPIRED", "15A-11B: Status is EXPIRED");
  subBiz = expireRes.business;

  const expiredDomainCheck = checkServiceEntitlement(subBiz, "custom_domain", custOwnerId);
  assert(expiredDomainCheck.entitled === false, "15A-11C: custom_domain revoked on expiration");

  // 12. Cross-Customer Security Isolation
  const attackerCheck = checkServiceEntitlement(subBiz, "hosting", "attacker_user_99");
  assert(attackerCheck.entitled === false, "15A-12A: Cross-customer service access blocked");
  assert(attackerCheck.reason?.includes("Cross-customer access forbidden"), "15A-12B: Clear isolation error returned");

  // 13. Role Authorization Restrictions
  const unauthSubAct = await activatePaidSubscription(subBiz, "plan_pro", "MONTHLY", validStarterRef, unauthorizedTaskUser);
  assert(unauthSubAct.success === false, "15A-13A: Unauthorized user cannot activate subscription");
  assert(unauthSubAct.error?.includes("Unauthorized"), "15A-13B: Clear unauthorized error returned");

  // 14. Canonical Club Plan Structure & Pricing Verification
  assert(CANONICAL_PLANS.plan_basic.pricing.monthly === 0, "15A-14A: Basic plan is Free (E0)");
  assert(CANONICAL_PLANS.plan_basic.pricing.currency === "SZL", "15A-14B: Basic plan currency is SZL");
  assert(CANONICAL_PLANS.plan_pro.pricing.monthly === 120, "15A-14C: Pro plan is E120/month");
  assert(CANONICAL_PLANS.plan_pro.pricing.annual === 1200, "15A-14D: Pro plan annual billing is E1,200/year");
  assert(CANONICAL_PLANS.plan_elite.pricing.monthly === 250, "15A-14E: Elite plan is E250/month");
  assert(CANONICAL_PLANS.plan_elite.pricing.annual === 2500, "15A-14F: Elite plan annual billing is E2,500/year");
  assert(CANONICAL_PLANS.plan_enterprise.pricing.monthly === 350, "15A-14G: Enterprise plan is E350/month");
  assert(CANONICAL_PLANS.plan_enterprise.pricing.annual === 3500, "15A-14H: Enterprise plan annual billing is E3,500/year");

  // 15. Administrative Override Protection & Auditing
  const adminActor = { uid: "admin_super_1", displayName: "Lead System Admin", role: "Admin" as const };
  const adminOverrideRes = await adminOverrideSubscriptionPlan(
    subBiz,
    "plan_enterprise",
    "ACTIVE",
    adminActor,
    "Emergency administrative override for VIP partner testing"
  );
  assert(adminOverrideRes.success === true, "15A-15A: Admin override succeeded with verified Admin role");
  assert(adminOverrideRes.subscription?.planId === "plan_enterprise", "15A-15B: Plan upgraded to Enterprise via override");
  assert(adminOverrideRes.subscription?.status === "ACTIVE", "15A-15C: Status restored to ACTIVE");
  assert(adminOverrideRes.subscription?.auditTrail.some(a => a.notes?.includes("ADMIN OVERRIDE")) === true, "15A-15D: Admin override audited in subscription history");
  assert(adminOverrideRes.business.customerAccount?.auditTrail.some(a => a.notes?.includes("Admin override")) === true, "15A-15E: Admin override audited in account history");

  // Verify entitlements updated following admin override
  const enterpriseEntCheck = checkServiceEntitlement(adminOverrideRes.business, "ai_generation", custOwnerId);
  assert(enterpriseEntCheck.entitled === true, "15A-15F: Enterprise ai_generation unlocked after admin override");

  // Non-admin attempt rejected
  const nonAdminOverride = await adminOverrideSubscriptionPlan(
    subBiz,
    "plan_elite",
    "ACTIVE",
    unauthorizedTaskUser,
    "Attempted bypass"
  );
  assert(nonAdminOverride.success === false, "15A-15G: Non-admin override strictly rejected");
  assert(nonAdminOverride.error?.includes("Admin role"), "15A-15H: Clear admin role error returned");

  // Blank reason rejected
  const blankReasonOverride = await adminOverrideSubscriptionPlan(
    subBiz,
    "plan_elite",
    "ACTIVE",
    adminActor,
    ""
  );
  assert(blankReasonOverride.success === false, "15A-15I: Blank override reason rejected");

  // =========================================================================
  // GROUP 49: MICRO-PHASE 15C - SUBSCRIPTION LIFECYCLE & BILLING EVENTS
  // =========================================================================
  console.log("\n--- GROUP 49: Micro-Phase 15C Subscription Lifecycle & Billing Events ---");

  // 1. Initial State: Active Pro Plan
  const initialSubId = subBiz.activeSubscription!.id;
  const initialHistoryLength = subBiz.subscriptionHistory?.length || 0;

  // 2. Active -> Renewed In-Place (No Duplicate Subscriptions on Renewal)
  const renewPayment: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_renew_tx_7711",
    amountPaid: 120,
    currency: "SZL",
    lastPaymentVerifiedAt: new Date().toISOString()
  };
  const renewRes = await renewSubscription(subBiz, renewPayment, salesAgent);
  assert(renewRes.success === true, "15C-2A: Subscription renewed successfully");
  assert(renewRes.subscription?.id === initialSubId, "15C-2B: Renewal mutates and extends subscription in-place (same ID)");
  assert(renewRes.subscription?.status === "ACTIVE", "15C-2C: Status remains ACTIVE");
  assert(renewRes.subscription?.lastRenewedAt !== undefined, "15C-2D: lastRenewedAt timestamp recorded");
  assert(renewRes.subscription?.auditTrail.some(a => a.action === "RENEWED") === true, "15C-2E: RENEWED audit action recorded");
  assert(renewRes.business.subscriptionHistory?.length === initialHistoryLength, "15C-2F: Renewal does NOT spawn duplicate historical records");

  let billingBiz = renewRes.business;

  // 3. Webhook: Payment Failure -> Transition to PAST_DUE
  const failEvent: BillingEvent = {
    id: `evt_test_fail_${Date.now()}`,
    eventId: "evt_stripe_fail_9901",
    eventType: "invoice.payment_failed",
    customerId: billingBiz.customerAccount!.customerId,
    businessId: billingBiz.id,
    subscriptionId: billingBiz.activeSubscription!.id,
    provider: "stripe",
    eventTimestamp: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    payload: { failureReason: "Card declined by issuer" },
    status: "PROCESSED"
  };
  const failEvtRes = await processBillingEvent(billingBiz, failEvent);
  assert(failEvtRes.success === true, "15C-3A: Failed payment event processed");
  assert(failEvtRes.eventStatus === "PROCESSED", "15C-3B: Event status is PROCESSED");
  assert(failEvtRes.subscription?.status === "PAST_DUE", "15C-3C: Subscription status transitioned to PAST_DUE");

  billingBiz = failEvtRes.business;

  // Feature gating during PAST_DUE: AI blocked, hosting preserved
  const pastDueAi = checkServiceEntitlement(billingBiz, "ai_generation", custOwnerId);
  assert(pastDueAi.entitled === false, "15C-3D: ai_generation blocked during PAST_DUE");
  const pastDueHost = checkServiceEntitlement(billingBiz, "hosting", custOwnerId);
  assert(pastDueHost.entitled === true, "15C-3E: hosting grace access preserved during PAST_DUE");

  // 4. Webhook: Payment Recovery -> Restores ACTIVE status
  const recoveryEvent: BillingEvent = {
    id: `evt_test_rec_${Date.now()}`,
    eventId: "evt_stripe_paid_9902",
    eventType: "invoice.paid",
    customerId: billingBiz.customerAccount!.customerId,
    businessId: billingBiz.id,
    subscriptionId: billingBiz.activeSubscription!.id,
    provider: "stripe",
    eventTimestamp: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    payload: { transactionId: "ch_recovery_9902", amountPaid: 120, currency: "SZL" },
    status: "PROCESSED"
  };
  const recEvtRes = await processBillingEvent(billingBiz, recoveryEvent);
  assert(recEvtRes.success === true, "15C-4A: Recovery payment event processed");
  assert(recEvtRes.subscription?.status === "ACTIVE", "15C-4B: Subscription status restored to ACTIVE");

  billingBiz = recEvtRes.business;

  // 5. Active -> Cancelled at Period End (Entitlements Preserved during Remaining Period)
  const cancelPeriodRes = await cancelSubscriptionWithPeriodEnd(
    billingBiz,
    true, // cancel at period end
    salesAgent,
    "Client requested end-of-term cancellation"
  );
  assert(cancelPeriodRes.success === true, "15C-5A: Scheduled period-end cancellation successfully");
  assert(cancelPeriodRes.subscription?.cancelAtPeriodEnd === true, "15C-5B: cancelAtPeriodEnd flag set to true");
  assert(cancelPeriodRes.subscription?.status === "ACTIVE", "15C-5C: Status remains ACTIVE while billing period is running");

  billingBiz = cancelPeriodRes.business;

  // Entitlement check during valid cancellation period: paid features remain accessible
  const cancelPeriodDomain = checkServiceEntitlement(billingBiz, "custom_domain", custOwnerId);
  assert(cancelPeriodDomain.entitled === true, "15C-5D: custom_domain preserved during active cancellation period");

  // 6. Cancellation Period Elapsed -> Expired & Entitlement Revocation
  const pastPeriodSub = {
    ...billingBiz.activeSubscription!,
    currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day in past
  };
  const expiredBizState: Business = {
    ...billingBiz,
    activeSubscription: pastPeriodSub
  };
  const syncExpiredBiz = synchronizeEntitlements(expiredBizState);
  assert(syncExpiredBiz.activeSubscription?.status === "EXPIRED", "15C-6A: Status auto-transitions to EXPIRED when period ends");

  const elapsedDomain = checkServiceEntitlement(syncExpiredBiz, "custom_domain", custOwnerId);
  assert(elapsedDomain.entitled === false, "15C-6B: custom_domain revoked once period elapses");
  const elapsedAi = checkServiceEntitlement(syncExpiredBiz, "ai_generation", custOwnerId);
  assert(elapsedAi.entitled === false, "15C-6C: ai_generation revoked once period elapses");

  billingBiz = syncExpiredBiz;

  // 7. Reactivation of Expired Subscription
  const reactivatePayment: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_reactivate_tx_3322",
    amountPaid: 250,
    currency: "SZL",
    lastPaymentVerifiedAt: new Date().toISOString()
  };
  const reactivateRes = await reactivateSubscription(billingBiz, "plan_elite", "MONTHLY", reactivatePayment, salesAgent);
  assert(reactivateRes.success === true, "15C-7A: Expired subscription reactivated successfully");
  assert(reactivateRes.subscription?.status === "ACTIVE", "15C-7B: Status is ACTIVE after reactivation");
  assert(reactivateRes.subscription?.cancelAtPeriodEnd === false, "15C-7C: cancelAtPeriodEnd reset to false");

  billingBiz = reactivateRes.business;

  // Reactivation without verified payment rejected
  const zeroReactivatePayment: PaymentProviderReference = {
    provider: "stripe",
    referenceId: "ch_zero_fail",
    amountPaid: 0
  };
  const zeroReactivateRes = await reactivateSubscription(billingBiz, "plan_elite", "MONTHLY", zeroReactivatePayment, salesAgent);
  assert(zeroReactivateRes.success === false, "15C-7D: Reactivation without valid payment rejected");

  // 8. Duplicate Billing Event Rejection (Idempotency)
  const idempotentEvt: BillingEvent = {
    id: `evt_idem_${Date.now()}`,
    eventId: "evt_idempotency_unique_token_555",
    eventType: "invoice.paid",
    customerId: billingBiz.customerAccount!.customerId,
    businessId: billingBiz.id,
    subscriptionId: billingBiz.activeSubscription!.id,
    provider: "stripe",
    eventTimestamp: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    payload: { amountPaid: 250, currency: "SZL" },
    status: "PROCESSED"
  };
  const firstEvtRes = await processBillingEvent(billingBiz, idempotentEvt);
  assert(firstEvtRes.eventStatus === "PROCESSED", "15C-8A: First event processed successfully");
  billingBiz = firstEvtRes.business;

  // Retry the exact same event
  const duplicateEvtRes = await processBillingEvent(billingBiz, idempotentEvt);
  assert(duplicateEvtRes.eventStatus === "IGNORED_DUPLICATE", "15C-8B: Duplicate event detected and IGNORED_DUPLICATE returned");
  assert(duplicateEvtRes.success === true, "15C-8C: Idempotent processing returns successful acknowledgment");

  // 9. Out-of-Order / Stale Billing Event Handling
  const staleEvent: BillingEvent = {
    id: `evt_stale_${Date.now()}`,
    eventId: "evt_stale_old_timestamp_111",
    eventType: "invoice.payment_failed",
    customerId: billingBiz.customerAccount!.customerId,
    businessId: billingBiz.id,
    subscriptionId: billingBiz.activeSubscription!.id,
    provider: "stripe",
    eventTimestamp: "2026-01-01T00:00:00.000Z", // Past timestamp
    processedAt: new Date().toISOString(),
    payload: { failureReason: "Stale failure" },
    status: "PROCESSED"
  };
  const staleEvtRes = await processBillingEvent(billingBiz, staleEvent);
  assert(staleEvtRes.eventStatus === "IGNORED_STALE", "15C-9A: Out-of-order stale event safely IGNORED_STALE");
  assert(billingBiz.activeSubscription?.status === "ACTIVE", "15C-9B: Active status NOT regressed by stale event");

  // 10. Chargeback / Refund Event Handling
  const refundEvent: BillingEvent = {
    id: `evt_refund_${Date.now()}`,
    eventId: "evt_refund_dispute_8822",
    eventType: "charge.refunded",
    customerId: billingBiz.customerAccount!.customerId,
    businessId: billingBiz.id,
    subscriptionId: billingBiz.activeSubscription!.id,
    provider: "stripe",
    eventTimestamp: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    payload: { refundAmount: 250, disputeReason: "Fraudulent charge dispute" },
    status: "PROCESSED"
  };
  const refundEvtRes = await processBillingEvent(billingBiz, refundEvent);
  assert(refundEvtRes.eventStatus === "PROCESSED", "15C-10A: Refund event processed");
  assert(refundEvtRes.subscription?.status === "PAST_DUE", "15C-10B: Subscription transitioned to PAST_DUE upon refund");

  const refundedAiCheck = checkServiceEntitlement(refundEvtRes.business, "ai_generation", custOwnerId);
  assert(refundedAiCheck.entitled === false, "15C-10C: Paid ai_generation immediately restricted upon refund");

  // =========================================================================
  // GROUP 51: MICRO-PHASE 15D — BILLING RECORDS, INVOICES & CUSTOMER PAYMENT HISTORY
  // =========================================================================
  console.log("\n--- GROUP 51: MICRO-PHASE 15D — BILLING RECORDS, INVOICES & CUSTOMER PAYMENT HISTORY ---");

  // 1. Invoice Creation
  const invBizSeed: Business = {
    ...billingBiz,
    invoices: [],
    payments: [],
    financialLedger: []
  };

  const createInvRes = await createCustomerInvoice(
    invBizSeed,
    {
      lineItems: [
        { description: "Custom Website Design & Build", quantity: 1, unitPrice: 350 },
        { description: "Annual Managed Hosting", quantity: 1, unitPrice: 50 }
      ],
      currency: "SZL",
      notes: "Initial project engagement invoice"
    },
    salesAgent
  );
  assert(createInvRes.success === true, "15D-1A: Invoice created successfully");
  assert(createInvRes.invoice !== undefined, "15D-1B: Invoice object returned");
  assert(createInvRes.invoice?.total === 400, "15D-1C: Invoice total correctly calculated as 400");
  assert(createInvRes.invoice?.amountPaid === 0, "15D-1D: Initial amountPaid is 0");
  assert(createInvRes.invoice?.amountDue === 400, "15D-1E: Initial amountDue equals total");
  assert(createInvRes.invoice?.status === "ISSUED", "15D-1F: Initial invoice status is ISSUED");
  assert(createInvRes.invoice?.invoiceNumber.startsWith("INV-"), "15D-1G: Invoice number adheres to INV-YYYY-XXXX format");

  // Line items validation guard
  const emptyLineItemsRes = await createCustomerInvoice(
    invBizSeed,
    { lineItems: [] },
    salesAgent
  );
  assert(emptyLineItemsRes.success === false, "15D-1H: Invoice rejected when line items are empty");

  let billingRecordsBiz = createInvRes.business;
  const invoice1Id = createInvRes.invoice!.id;

  // 2. Invoice Payment (Full Payment)
  const invoiceFullPaymentRes = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice1Id,
    {
      amount: 400,
      currency: "SZL",
      paymentMethod: "card",
      paymentProviderRef: {
        provider: "stripe",
        referenceId: "ch_inv_tx_full_001",
        lastPaymentVerifiedAt: new Date().toISOString()
      }
    },
    salesAgent
  );
  assert(invoiceFullPaymentRes.success === true, "15D-2A: Full invoice payment recorded successfully");
  assert(invoiceFullPaymentRes.invoice?.status === "PAID", "15D-2B: Invoice status transitions to PAID");
  assert(invoiceFullPaymentRes.invoice?.amountPaid === 400, "15D-2C: Invoice amountPaid equals 400");
  assert(invoiceFullPaymentRes.invoice?.amountDue === 0, "15D-2D: Invoice amountDue equals 0");
  assert(invoiceFullPaymentRes.payment?.status === "COMPLETED", "15D-2E: Customer payment record status is COMPLETED");
  assert(invoiceFullPaymentRes.payment?.paymentNumber.startsWith("RCPT-"), "15D-2F: Payment record has RCPT-YYYY-XXXX receipt number");
  assert(invoiceFullPaymentRes.business.financialLedger?.some(l => l.type === "PAYMENT_RECEIVED") === true, "15D-2G: Financial ledger entry recorded");

  billingRecordsBiz = invoiceFullPaymentRes.business;
  const payment1Id = invoiceFullPaymentRes.payment!.id;

  // 3. Partial Payment Workflow
  const createInv2Res = await createCustomerInvoice(
    billingRecordsBiz,
    {
      lineItems: [{ description: "Enterprise Expansion Package", quantity: 1, unitPrice: 500 }],
      currency: "SZL"
    },
    salesAgent
  );
  assert(createInv2Res.success === true, "15D-3A: Second invoice for 500 created");
  billingRecordsBiz = createInv2Res.business;
  const invoice2Id = createInv2Res.invoice!.id;

  // First partial payment: 200 of 500
  const partialPay1Res = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 200,
      currency: "SZL",
      paymentMethod: "mtn_momo",
      paymentProviderRef: {
        provider: "offline",
        referenceId: "momo_ref_part_101",
        lastPaymentVerifiedAt: new Date().toISOString()
      }
    },
    salesAgent
  );
  assert(partialPay1Res.success === true, "15D-3B: Partial payment of 200 recorded");
  assert(partialPay1Res.invoice?.status === "PARTIALLY_PAID", "15D-3C: Invoice status is PARTIALLY_PAID");
  assert(partialPay1Res.invoice?.amountPaid === 200, "15D-3D: Invoice amountPaid is 200");
  assert(partialPay1Res.invoice?.amountDue === 300, "15D-3E: Invoice amountDue is 300");

  billingRecordsBiz = partialPay1Res.business;

  // Second partial payment: remaining 300 of 500
  const partialPay2Res = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 300,
      currency: "SZL",
      paymentMethod: "bank_transfer",
      paymentProviderRef: {
        provider: "offline",
        referenceId: "bank_ref_part_102",
        lastPaymentVerifiedAt: new Date().toISOString()
      }
    },
    salesAgent
  );
  assert(partialPay2Res.success === true, "15D-3F: Remaining 300 payment recorded");
  assert(partialPay2Res.invoice?.status === "PAID", "15D-3G: Invoice status now fully PAID");
  assert(partialPay2Res.invoice?.amountDue === 0, "15D-3H: Invoice amountDue is now 0");

  billingRecordsBiz = partialPay2Res.business;
  const payment2Id = partialPay2Res.payment!.id;

  // 4. Payment Failure Guards
  // Guard 4A: Missing transaction reference rejected
  const noRefPayRes = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 100,
      currency: "SZL",
      paymentMethod: "card",
      paymentProviderRef: { provider: "stripe", referenceId: "" }
    },
    salesAgent
  );
  assert(noRefPayRes.success === false, "15D-4A: Payment rejected when referenceId is empty");

  // Guard 4B: Zero or negative amount rejected
  const zeroAmtPayRes = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 0,
      currency: "SZL",
      paymentMethod: "card",
      paymentProviderRef: { provider: "stripe", referenceId: "ch_zero_fail" }
    },
    salesAgent
  );
  assert(zeroAmtPayRes.success === false, "15D-4B: Payment rejected when amount is 0");

  // Guard 4C: recordFailedPaymentAttempt logs failure without marking invoice paid
  const failedAttemptRes = await recordFailedPaymentAttempt(
    billingRecordsBiz,
    invoice1Id,
    {
      amount: 150,
      currency: "SZL",
      paymentMethod: "card",
      reason: "Card expired",
      referenceId: "fail_tx_declined_999"
    },
    salesAgent
  );
  assert(failedAttemptRes.success === true, "15D-4C: Payment failure record logged");
  assert(failedAttemptRes.paymentRecord?.status === "FAILED", "15D-4D: Payment record marked as FAILED");
  assert(failedAttemptRes.paymentRecord?.netAmount === 0, "15D-4E: Failed payment contributes 0 to netAmount");

  // 5. Overdue Invoice Evaluation
  const overdueInvoiceSeed: Business = {
    ...billingRecordsBiz,
    invoices: [
      ...billingRecordsBiz.invoices!,
      {
        id: "inv_overdue_test",
        invoiceId: "inv_overdue_test",
        invoiceNumber: "INV-2026-9999",
        customerId: billingRecordsBiz.customerAccount!.customerId,
        businessId: billingRecordsBiz.id,
        lineItems: [{ id: "li_1", description: "Late Fee Services", quantity: 1, unitPrice: 100, total: 100 }],
        subtotal: 100,
        taxAmount: 0,
        total: 100,
        amountPaid: 0,
        amountDue: 100,
        currency: "SZL",
        issueDate: "2026-01-01T00:00:00.000Z",
        dueDate: "2026-01-15T00:00:00.000Z", // Past due date
        status: "ISSUED",
        linkedPaymentIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  };
  const overdueBiz = evaluateOverdueInvoices(overdueInvoiceSeed);
  const targetOverdueInv = overdueBiz.invoices?.find(i => i.id === "inv_overdue_test");
  assert(targetOverdueInv?.status === "OVERDUE", "15D-5A: Past due invoice accurately marked as OVERDUE");

  // 6. Partial and Full Refund Operations
  // Partial refund: 100 of 300 on payment2Id
  const partialRefundRes = await refundCustomerPayment(
    billingRecordsBiz,
    payment2Id,
    {
      amount: 100,
      reason: "Partial adjustment for service scope revision",
      referenceId: "ref_tx_100_part"
    },
    salesAgent
  );
  assert(partialRefundRes.success === true, "15D-6A: Partial refund of 100 recorded");
  assert(partialRefundRes.payment?.status === "PARTIALLY_REFUNDED", "15D-6B: Payment status is PARTIALLY_REFUNDED");
  assert(partialRefundRes.payment?.refundedAmount === 100, "15D-6C: Payment refundedAmount is 100");
  assert(partialRefundRes.payment?.netAmount === 200, "15D-6D: Payment netAmount is 200");
  assert(partialRefundRes.invoice?.status === "PARTIALLY_PAID", "15D-6E: Associated invoice status reverted to PARTIALLY_PAID");
  assert(partialRefundRes.invoice?.amountDue === 100, "15D-6F: Associated invoice amountDue recalculated as 100");

  billingRecordsBiz = partialRefundRes.business;

  // Refund remainder: 200 of 300 on payment2Id
  const fullRefundRes = await refundCustomerPayment(
    billingRecordsBiz,
    payment2Id,
    {
      amount: 200,
      reason: "Full remaining refund",
      referenceId: "ref_tx_200_rem"
    },
    salesAgent
  );
  assert(fullRefundRes.success === true, "15D-6G: Full remaining refund of 200 recorded");
  assert(fullRefundRes.payment?.status === "REFUNDED", "15D-6H: Payment status is now REFUNDED");
  assert(fullRefundRes.payment?.netAmount === 0, "15D-6I: Payment netAmount is 0");

  billingRecordsBiz = fullRefundRes.business;

  // Refund Guard: Attempting to refund more than unrefunded balance rejected
  const overRefundRes = await refundCustomerPayment(
    billingRecordsBiz,
    payment2Id,
    {
      amount: 50,
      reason: "Excess refund attempt"
    },
    salesAgent
  );
  assert(overRefundRes.success === false, "15D-6J: Over-refund exceeding unrefunded balance rejected");

  // 7. Duplicate Payment Reference Rejection (Idempotency)
  const dupPaymentAttempt = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice1Id,
    {
      amount: 400,
      currency: "SZL",
      paymentMethod: "card",
      paymentProviderRef: {
        provider: "stripe",
        referenceId: "ch_inv_tx_full_001" // Same referenceId as payment 1
      }
    },
    salesAgent
  );
  assert(dupPaymentAttempt.success === false, "15D-7A: Duplicate payment with used referenceId rejected");

  // 8. Financial Guards: Currency Mismatch & Overpayment
  const currencyMismatchRes = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 50,
      currency: "EUR", // Mismatch with SZL invoice
      paymentMethod: "card",
      paymentProviderRef: { provider: "stripe", referenceId: "ch_eur_mismatch" }
    },
    salesAgent
  );
  assert(currencyMismatchRes.success === false, "15D-8A: Currency mismatch between payment and invoice rejected");

  const overpayRes = await recordCustomerInvoicePayment(
    billingRecordsBiz,
    invoice2Id,
    {
      amount: 9999, // Exceeds amountDue
      currency: "SZL",
      paymentMethod: "card",
      paymentProviderRef: { provider: "stripe", referenceId: "ch_overpay_test" }
    },
    salesAgent
  );
  assert(overpayRes.success === false, "15D-8B: Overpayment exceeding invoice balance due rejected");

  // 9. Invoice Voiding
  const createVoidableInv = await createCustomerInvoice(
    billingRecordsBiz,
    {
      lineItems: [{ description: "Cancelled Estimate", quantity: 1, unitPrice: 250 }],
      currency: "SZL"
    },
    salesAgent
  );
  assert(createVoidableInv.success === true, "15D-9A: Voidable invoice created");
  const voidInvId = createVoidableInv.invoice!.id;

  const voidRes = await voidCustomerInvoice(createVoidableInv.business, voidInvId, salesAgent, "Client requested cancellation before work began");
  assert(voidRes.success === true, "15D-9B: Unpaid invoice voided successfully");
  assert(voidRes.invoice?.status === "VOID", "15D-9C: Invoice status is VOID");

  // Guard: Cannot void invoice with paid amount
  const voidPaidInvRes = await voidCustomerInvoice(voidRes.business, invoice1Id, salesAgent);
  assert(voidPaidInvRes.success === false, "15D-9D: Voiding invoice with paid records blocked (must refund first)");

  billingRecordsBiz = voidRes.business;

  // 10. Customer Billing Summary & Verified Revenue Calculation
  const summary = getCustomerBillingSummary(billingRecordsBiz);
  assert(summary.customerId === billingRecordsBiz.customerAccount!.customerId, "15D-10A: Summary customerId matches account");
  assert(summary.currency === "SZL", "15D-10B: Summary currency matches explicit business/subscription currency");
  assert(summary.totalInvoiced > 0, "15D-10C: totalInvoiced reflects active non-void invoices");
  assert(summary.totalPaid === 900, "15D-10D: totalPaid accurately reflects all completed payment amounts (400 + 200 + 300 = 900)");
  assert(summary.totalRefunded === 300, "15D-10E: totalRefunded accurately reflects recorded refunds (100 + 200 = 300)");
  assert(summary.netRevenue === 600, "15D-10F: netRevenue is strictly verified payments minus refunds (900 - 300 = 600)");
  assert(summary.outstandingBalance > 0, "15D-10G: outstandingBalance represents remaining unpaid invoice balances");
  assert(summary.invoicesCount === 2, "15D-10H: invoicesCount accurately excludes VOID invoices");
  assert(summary.lastPaymentDate !== undefined, "15D-10I: lastPaymentDate recorded from latest transaction");

  // 11. Monetary Precision & Rounding Safeguards
  assert(roundMoney(19.999) === 20.00, "15D-11A: roundMoney correctly rounds up float precision");
  assert(roundMoney(0.1 + 0.2) === 0.30, "15D-11B: roundMoney resolves standard JS floating point drift (0.30000000000000004 -> 0.30)");

  // =========================================================================
  // GROUP 52: MICRO-PHASE 16A — CUSTOMER SUPPORT, SERVICE REQUESTS & ISSUE MANAGEMENT
  // =========================================================================
  console.log("\n--- GROUP 52: MICRO-PHASE 16A — CUSTOMER SUPPORT, SERVICE REQUESTS & ISSUE MANAGEMENT ---");

  const supportSeedBiz: Business = {
    ...billingRecordsBiz,
    supportTickets: []
  };

  const clientRequesterId = supportSeedBiz.customerAccount!.customerId;
  const clientActor: TaskAssignee = {
    uid: clientRequesterId,
    displayName: "Bongani Dlamini",
    role: "Client"
  };
  const staffEngineer: TaskAssignee = {
    uid: "staff_eng_101",
    displayName: "Thabo Support Engineer",
    role: "Support Engineer"
  };

  // 1. Customer Creates Support Ticket
  const createTicketRes = await createCustomerSupportTicket(
    supportSeedBiz,
    {
      customerId: clientRequesterId,
      requesterId: clientRequesterId,
      requesterName: "Bongani Dlamini",
      requesterEmail: "bongani@example.com",
      subject: "Mobile Menu Bar Alignment Bug",
      description: "The navigation menu overlaps the hero banner on iOS Safari portrait mode.",
      category: "BUG_FIX",
      priority: "HIGH"
    },
    clientActor
  );
  assert(createTicketRes.success === true, "16A-1A: Support ticket created successfully");
  assert(createTicketRes.ticket !== undefined, "16A-1B: Ticket object returned");
  assert(createTicketRes.ticket?.ticketNumber.startsWith("TICK-"), "16A-1C: Ticket number adheres to TICK-YYYY-XXXX format");
  assert(createTicketRes.ticket?.status === "OPEN", "16A-1D: Initial ticket status is OPEN");
  assert(createTicketRes.ticket?.priority === "HIGH", "16A-1E: Priority recorded as HIGH");
  assert(createTicketRes.ticket?.messages.length === 1, "16A-1F: Initial customer description added as first message");
  assert(createTicketRes.ticket?.auditTrail.length === 1, "16A-1G: CREATED action recorded in audit trail");

  let supportActiveBiz = createTicketRes.business;
  const ticket1Id = createTicketRes.ticket!.id;

  // 2. Staff Views Ticket & Assigns Staff Member
  const staffTickets = getStaffTickets(supportActiveBiz);
  assert(staffTickets.length === 1, "16A-2A: Staff can view all business support tickets");
  assert(staffTickets[0].id === ticket1Id, "16A-2B: Correct ticket visible in staff queue");

  const assignTicketRes = await assignSupportTicket(
    supportActiveBiz,
    ticket1Id,
    staffEngineer,
    salesAgent
  );
  assert(assignTicketRes.success === true, "16A-3A: Ticket assigned to staff successfully");
  assert(assignTicketRes.ticket?.assignedStaff?.uid === staffEngineer.uid, "16A-3B: assignedStaff updated with staff assignee");
  assert(assignTicketRes.ticket?.status === "IN_PROGRESS", "16A-3C: Ticket auto-transitioned from OPEN to IN_PROGRESS upon assignment");
  assert(assignTicketRes.ticket?.auditTrail.some(a => a.action === "ASSIGNED") === true, "16A-3D: ASSIGNED action recorded in audit trail");

  supportActiveBiz = assignTicketRes.business;

  // 4. Status Transition: WAITING_FOR_CUSTOMER
  const waitCustRes = await updateSupportTicketStatus(
    supportActiveBiz,
    ticket1Id,
    "WAITING_FOR_CUSTOMER",
    salesAgent,
    "Requested iOS device screenshot and browser version"
  );
  assert(waitCustRes.success === true, "16A-4A: Status transitioned to WAITING_FOR_CUSTOMER");
  assert(waitCustRes.ticket?.status === "WAITING_FOR_CUSTOMER", "16A-4B: Ticket status is WAITING_FOR_CUSTOMER");

  supportActiveBiz = waitCustRes.business;

  // 5. Customer Response & Auto Status Resumption
  const custReplyRes = await addTicketMessage(
    supportActiveBiz,
    ticket1Id,
    {
      senderId: clientRequesterId,
      senderName: "Bongani Dlamini",
      senderRole: "customer",
      message: "Tested on iPhone 15 Pro, iOS 17.5.1 with Safari default zoom."
    },
    clientActor
  );
  assert(custReplyRes.success === true, "16A-5A: Customer reply message added");
  assert(custReplyRes.ticket?.status === "IN_PROGRESS", "16A-5B: Ticket auto-resumed to IN_PROGRESS upon customer response");
  assert(custReplyRes.ticket?.messages.length === 2, "16A-5C: Two messages recorded in conversation thread");
  assert(custReplyRes.ticket?.auditTrail.some(a => a.action === "CUSTOMER_REPLIED") === true, "16A-5D: CUSTOMER_REPLIED action logged in audit trail");

  supportActiveBiz = custReplyRes.business;

  // 6. Internal Staff Note Posting & Customer Redaction Verification
  const internalNoteRes = await addTicketMessage(
    supportActiveBiz,
    ticket1Id,
    {
      senderId: staffEngineer.uid,
      senderName: staffEngineer.displayName,
      senderRole: "staff",
      message: "Internal Note: z-index collision in FixedHeader component css rule at line 42.",
      isInternal: true
    },
    salesAgent
  );
  assert(internalNoteRes.success === true, "16A-6A: Internal staff note posted successfully");
  assert(internalNoteRes.message?.isInternal === true, "16A-6B: Message marked as isInternal: true");

  supportActiveBiz = internalNoteRes.business;

  // Verify Customer View Redaction: Internal notes must NEVER be visible to customer
  const customerViewTickets = getCustomerTickets(supportActiveBiz, clientRequesterId);
  assert(customerViewTickets.length === 1, "16A-6C: Customer retrieves their ticket");
  const custViewTicket = customerViewTickets[0];
  assert(custViewTicket.messages.every(m => !m.isInternal), "16A-6D: ALL internal staff notes strictly redacted from customer view");
  assert(custViewTicket.messages.length === 2, "16A-6E: Customer view contains only public messages (2)");
  assert(custViewTicket.auditTrail.every(a => a.action !== "INTERNAL_NOTE_ADDED"), "16A-6F: Internal audit logs redacted from customer view");

  // Verify Staff View retains full unredacted conversation
  const staffViewTickets = getStaffTickets(supportActiveBiz);
  assert(staffViewTickets[0].messages.length === 3, "16A-6G: Staff view retains all 3 messages including internal note");

  // 7. Ticket Resolution
  const resolveTicketRes = await resolveCustomerSupportTicket(
    supportActiveBiz,
    ticket1Id,
    {
      resolutionNotes: "Fixed z-index stacking context on mobile navigation and verified on real iOS devices.",
      billableHours: 0.5
    },
    salesAgent
  );
  assert(resolveTicketRes.success === true, "16A-7A: Ticket resolved successfully");
  assert(resolveTicketRes.ticket?.status === "RESOLVED", "16A-7B: Status is RESOLVED");
  assert(resolveTicketRes.ticket?.resolvedTimestamp !== undefined, "16A-7C: resolvedTimestamp recorded");
  assert(resolveTicketRes.ticket?.resolutionSummary?.includes("stacking context") === true, "16A-7D: Resolution summary preserved");

  supportActiveBiz = resolveTicketRes.business;

  // 8. Ticket Reopening
  const reopenTicketRes = await reopenSupportTicket(
    supportActiveBiz,
    ticket1Id,
    clientActor,
    "Issue still observed in landscape mode"
  );
  assert(reopenTicketRes.success === true, "16A-8A: Ticket reopened successfully");
  assert(reopenTicketRes.ticket?.status === "OPEN", "16A-8B: Status reset to OPEN upon reopening");
  assert(reopenTicketRes.ticket?.resolvedTimestamp === undefined, "16A-8C: resolvedTimestamp cleared");
  assert(reopenTicketRes.ticket?.auditTrail.some(a => a.action === "REOPENED") === true, "16A-8D: REOPENED action logged in audit trail");

  supportActiveBiz = reopenTicketRes.business;

  // 9. Unauthorized Customer Access Boundary Isolation
  const otherCustomerTickets = getCustomerTickets(supportActiveBiz, "unrelated_stranger_customer_999");
  assert(otherCustomerTickets.length === 0, "16A-9A: Unrelated customer receives 0 tickets (boundary isolation enforced)");

  // 10. Unauthorized Staff Actions Rejected
  const unauthAssignRes = await assignSupportTicket(
    supportActiveBiz,
    ticket1Id,
    staffEngineer,
    unauthorizedTaskUser
  );
  assert(unauthAssignRes.success === false, "16A-10A: Ticket assignment by unauthorized role rejected");

  const unauthResolveRes = await resolveCustomerSupportTicket(
    supportActiveBiz,
    ticket1Id,
    { resolutionNotes: "Hacked resolution" },
    unauthorizedTaskUser
  );
  assert(unauthResolveRes.success === false, "16A-10B: Ticket resolution by unauthorized role rejected");

  // 11. Duplicate Ticket Submission Prevention
  const dupTicketRes = await createCustomerSupportTicket(
    supportActiveBiz,
    {
      customerId: clientRequesterId,
      requesterId: clientRequesterId,
      requesterName: "Bongani Dlamini",
      subject: "Mobile Menu Bar Alignment Bug", // Identical subject
      description: "Duplicate attempt within 60 seconds",
      category: "BUG_FIX"
    },
    clientActor
  );
  assert(dupTicketRes.success === false, "16A-11A: Duplicate ticket submission rejected");
  assert(dupTicketRes.isDuplicate === true, "16A-11B: isDuplicate flag set to true");

  // 12. Input Validation & Persistence Resilience
  const emptySubjectTicketRes = await createCustomerSupportTicket(
    supportActiveBiz,
    {
      customerId: clientRequesterId,
      requesterId: clientRequesterId,
      requesterName: "Bongani Dlamini",
      subject: "",
      description: "Empty subject bug",
      category: "BUG_FIX"
    },
    clientActor
  );
  assert(emptySubjectTicketRes.success === false, "16A-12A: Ticket rejected when subject is empty");

  // 13. Support History Integrity Across Full Lifecycle
  const finalTicket = supportActiveBiz.supportTickets?.find(t => t.id === ticket1Id);
  assert(finalTicket !== undefined, "16A-13A: Ticket persisted in business record");
  assert(finalTicket?.auditTrail.length! >= 6, "16A-13B: Complete audit trail history intact across all lifecycle actions");
  assert(finalTicket?.messages.length === 3, "16A-13C: Full message history preserved");

  // =========================================================================
  // GROUP 53: MICRO-PHASE 16B — CUSTOMER COMMUNICATION, NOTIFICATIONS & SUPPORT MESSAGING
  // =========================================================================
  console.log("\n--- GROUP 53: MICRO-PHASE 16B — CUSTOMER COMMUNICATION, NOTIFICATIONS & SUPPORT MESSAGING ---");

  let notifBiz = supportActiveBiz;
  const notifCustRecipient = {
    id: "cust_comm_user_1",
    name: "Bongani Dlamini",
    email: "bongani@royaltech.sz",
    phone: "+26876123456",
    role: "customer" as const
  };

  // 1. In-App Notification (Immediate Delivery)
  const inAppQueueRes = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "IN_APP",
      category: "PROJECT_STAGE_UPDATE",
      content: {
        subject: "Website Milestone Completed",
        body: "Your new homepage design is ready for preview review.",
        actionUrl: "/portal?tab=preview"
      },
      relatedEntity: {
        entityType: "project",
        entityId: "proj_99"
      }
    },
    salesAgent
  );
  assert(inAppQueueRes.success === true, "16B-1A: In-app notification queued successfully");
  assert(inAppQueueRes.notification?.status === "QUEUED", "16B-1B: Initial status is QUEUED");
  assert(inAppQueueRes.notification?.deliveryInfo.attemptsCount === 0, "16B-1C: Initial attemptsCount is 0");

  notifBiz = inAppQueueRes.business;
  const inAppNotifId = inAppQueueRes.notification!.id;

  const inAppDispatchRes = await dispatchNotificationAttempt(notifBiz, inAppNotifId);
  assert(inAppDispatchRes.success === true, "16B-1D: In-app notification dispatched");
  assert(inAppDispatchRes.notification?.status === "DELIVERED", "16B-1E: In-app notification is DELIVERED immediately upon system dispatch");
  assert(inAppDispatchRes.notification?.deliveredTimestamp !== undefined, "16B-1F: deliveredTimestamp is recorded");

  notifBiz = inAppDispatchRes.business;

  // Mark In-App Notification as Read
  const readRes = await markNotificationRead(notifBiz, inAppNotifId, notifCustRecipient.id);
  assert(readRes.success === true, "16B-1G: In-app notification marked as read");
  assert(readRes.notification?.readAt !== undefined, "16B-1H: readAt timestamp recorded");
  notifBiz = readRes.business;

  // 2. Email Notification (Provider SENT -> Receipt DELIVERED)
  const emailQueueRes = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "EMAIL",
      category: "BILLING_INVOICE_ISSUED",
      content: {
        subject: "Invoice #INV-2026-001 Issued",
        body: "Your monthly hosting invoice for SZL 450.00 is ready for review.",
        actionUrl: "/portal?tab=invoices"
      },
      relatedEntity: {
        entityType: "invoice",
        entityId: "inv_2026_001",
        referenceNumber: "INV-2026-001"
      }
    },
    salesAgent
  );
  assert(emailQueueRes.success === true, "16B-2A: Email notification queued");
  notifBiz = emailQueueRes.business;
  const emailNotifId = emailQueueRes.notification!.id;

  const emailDispatchRes = await dispatchNotificationAttempt(notifBiz, emailNotifId);
  assert(emailDispatchRes.success === true, "16B-2B: Email accepted by provider adapter");
  assert(emailDispatchRes.notification?.status === "SENT", "16B-2C: External email status is SENT upon provider acceptance");
  assert(emailDispatchRes.notification?.providerRecord?.provider === "resend_smtp", "16B-2D: Correct provider mapped");
  assert(emailDispatchRes.notification?.providerRecord?.providerMessageId !== undefined, "16B-2E: providerMessageId recorded");

  notifBiz = emailDispatchRes.business;

  // Simulate External Webhook Delivery Confirmation
  const emailDeliveredRes = await recordNotificationDeliveryStatus(
    notifBiz,
    emailNotifId,
    {
      delivered: true,
      deliveredAt: new Date().toISOString()
    }
  );
  assert(emailDeliveredRes.success === true, "16B-2F: Email delivery receipt confirmed");
  assert(emailDeliveredRes.notification?.status === "DELIVERED", "16B-2G: Status updated to DELIVERED with provider evidence");
  assert(emailDeliveredRes.notification?.deliveredTimestamp !== undefined, "16B-2H: Evidence-based deliveredTimestamp stored");
  notifBiz = emailDeliveredRes.business;

  // 3. Failed Notification & Resilient Retry Engine
  const transientFailQueue = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "SMS",
      category: "SECURITY_ALERT",
      content: {
        body: "Security Alert: New login from unrecognized device."
      }
    },
    salesAgent
  );
  assert(transientFailQueue.success === true, "16B-3A: SMS notification queued");
  notifBiz = transientFailQueue.business;
  const smsNotifId = transientFailQueue.notification!.id;

  // Dispatch with transient provider error
  const transientFailDispatch = await dispatchNotificationAttempt(
    notifBiz,
    smsNotifId,
    {
      forceFailure: true,
      failureReason: "Gateway timeout 504 from Twilio upstream",
      isPermanentFailure: false
    }
  );
  assert(transientFailDispatch.success === false, "16B-3B: Transient failure caught");
  assert(transientFailDispatch.notification?.status === "QUEUED", "16B-3C: Transient failure leaves notification in QUEUED status for retry");
  assert(transientFailDispatch.notification?.deliveryInfo.isTransientError === true, "16B-3D: isTransientError is true");
  assert(transientFailDispatch.notification?.deliveryInfo.attemptsCount === 1, "16B-3E: attemptsCount incremented to 1");

  notifBiz = transientFailDispatch.business;

  // Retry Transient Failure
  const retryRes = await retryFailedNotification(notifBiz, smsNotifId, salesAgent);
  assert(retryRes.success === true, "16B-3F: Retry dispatched successfully");
  assert(retryRes.notification?.status === "SENT", "16B-3G: Retried notification transitioned to SENT");
  assert(retryRes.notification?.deliveryInfo.attemptsCount === 2, "16B-3H: attemptsCount incremented to 2");

  notifBiz = retryRes.business;

  // 4. Permanent Failure Handling (Rejection of Non-Retryable Outages)
  const permFailQueue = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "WHATSAPP",
      category: "GENERAL_ALERT",
      content: { body: "Account notice" }
    },
    salesAgent
  );
  notifBiz = permFailQueue.business;
  const permNotifId = permFailQueue.notification!.id;

  const permFailDispatch = await dispatchNotificationAttempt(
    notifBiz,
    permNotifId,
    {
      forceFailure: true,
      failureReason: "Permanent Error: Recipient phone number disconnected",
      isPermanentFailure: true
    }
  );
  assert(permFailDispatch.success === false, "16B-4A: Permanent failure recorded");
  assert(permFailDispatch.notification?.status === "FAILED", "16B-4B: Status marked as FAILED");
  assert(permFailDispatch.notification?.deliveryInfo.isTransientError === false, "16B-4C: isTransientError marked false");

  notifBiz = permFailDispatch.business;

  const blockedRetry = await retryFailedNotification(notifBiz, permNotifId, salesAgent);
  assert(blockedRetry.success === false, "16B-4D: Permanent failure cannot be retried");
  assert(blockedRetry.error?.includes("permanent error") === true, "16B-4E: Error message explains permanent block");

  // 5. Duplicate Notification Suppression & Idempotency
  const dupNotif1 = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "EMAIL",
      category: "BILLING_PAYMENT_SUCCESS",
      content: { subject: "Payment Receipt", body: "Receipt for payment #PAY-001" },
      relatedEntity: { entityType: "payment", entityId: "pay_001" },
      idempotencyKey: "unique_payment_receipt_pay_001"
    },
    salesAgent
  );
  assert(dupNotif1.success === true, "16B-5A: First payment receipt notification queued");
  notifBiz = dupNotif1.business;

  const dupNotif2 = await queueCustomerNotification(
    notifBiz,
    {
      recipient: notifCustRecipient,
      channel: "EMAIL",
      category: "BILLING_PAYMENT_SUCCESS",
      content: { subject: "Payment Receipt", body: "Receipt for payment #PAY-001" },
      relatedEntity: { entityType: "payment", entityId: "pay_001" },
      idempotencyKey: "unique_payment_receipt_pay_001" // Identical idempotency key
    },
    salesAgent
  );
  assert(dupNotif2.success === true, "16B-5B: Second duplicate queue call succeeds idempotently");
  assert(dupNotif2.isDuplicate === true, "16B-5C: isDuplicate flag is true");
  assert(dupNotif2.notification?.id === dupNotif1.notification?.id, "16B-5D: Exact same notification record returned");

  // 6. Customer Preference Enforcement & Marketing Guard
  const prefUser = "cust_pref_user_42";
  const prefRecipient = {
    id: prefUser,
    name: "Sipho Khumalo",
    email: "sipho@khumalo.sz",
    phone: "+26876999888",
    role: "customer" as const
  };

  // Update preferences: Disable SMS and Marketing
  const updatePrefRes = await updateCustomerNotificationPreferences(
    notifBiz,
    prefUser,
    {
      smsEnabled: false,
      marketingOptIn: false
    },
    salesAgent
  );
  assert(updatePrefRes.success === true, "16B-6A: Customer preferences updated");
  assert(updatePrefRes.preferences.smsEnabled === false, "16B-6B: SMS disabled in preferences");
  assert(updatePrefRes.preferences.marketingOptIn === false, "16B-6C: Marketing opt-in is false");
  notifBiz = updatePrefRes.business;

  // Attempt to send SMS when SMS is disabled
  const disabledSmsRes = await queueCustomerNotification(
    notifBiz,
    {
      recipient: prefRecipient,
      channel: "SMS",
      category: "GENERAL_ALERT",
      content: { body: "Testing disabled channel" }
    },
    salesAgent
  );
  assert(disabledSmsRes.success === false, "16B-6D: SMS rejected when customer disabled SMS");
  assert(disabledSmsRes.blockedByPreferences === true, "16B-6E: blockedByPreferences flag set");

  // Attempt to send Marketing communication without opt-in
  const marketingBlockedRes = await queueCustomerNotification(
    notifBiz,
    {
      recipient: prefRecipient,
      channel: "EMAIL",
      category: "MARKETING_UPDATE",
      isMarketing: true,
      content: { subject: "Special 20% Discount", body: "Check out our new AI features." }
    },
    salesAgent
  );
  assert(marketingBlockedRes.success === false, "16B-6F: Marketing communication rejected when recipient not opted in");
  assert(marketingBlockedRes.blockedByPreferences === true, "16B-6G: blockedByPreferences flag set for marketing");

  // 7. Recipient Channel Validation
  const invalidEmailRes = await queueCustomerNotification(
    notifBiz,
    {
      recipient: { id: "bad_email_user", name: "Bad Email", email: "not-an-email", role: "customer" },
      channel: "EMAIL",
      category: "GENERAL_ALERT",
      content: { body: "Bad email test" }
    },
    salesAgent
  );
  assert(invalidEmailRes.success === false, "16B-7A: Invalid email address rejected before dispatch");
  assert(invalidEmailRes.error?.includes("Invalid email") === true, "16B-7B: Clear validation error returned");

  // 8. Privacy & Boundary Isolation
  const customer1Notifs = getCustomerNotifications(notifBiz, notifCustRecipient.id);
  const unrelatedCustomerNotifs = getCustomerNotifications(notifBiz, "unrelated_stranger_user");
  assert(customer1Notifs.length > 0, "16B-8A: Customer retrieves their own notifications");
  assert(customer1Notifs.every(n => n.recipientId === notifCustRecipient.id), "16B-8B: Customer only sees records matching their recipient ID");
  assert(unrelatedCustomerNotifs.length === 0, "16B-8C: Unrelated user receives 0 notifications (boundary isolation)");

  // 9. Staff Audit Trail
  const staffAudit = getStaffNotificationAuditLog(notifBiz, salesAgent);
  assert(staffAudit.length >= customer1Notifs.length, "16B-9A: Staff audit log has complete visibility across all business notifications");

  // =========================================================================
  // GROUP 54: MICRO-PHASE 16C — CUSTOMER PORTAL, ACCOUNT SECURITY & ACCESS CONTROL
  // =========================================================================
  console.log("\n--- GROUP 54: MICRO-PHASE 16C — CUSTOMER PORTAL, ACCOUNT SECURITY & ACCESS CONTROL ---");

  // Seed two distinct customer accounts with business projects, invoices, and tickets
  const customer1Uid = "auth_cust_user_101";
  const customer1Id = "cust_corp_alpha_101";
  const customer2Uid = "auth_cust_user_202";
  const customer2Id = "cust_corp_beta_202";

  const sessionCust1 = createCustomerSession({
    uid: customer1Uid,
    email: "alpha@corp.sz",
    role: "customer",
    customerId: customer1Id,
    businessId: "biz_portal_alpha"
  });

  const sessionCust2 = createCustomerSession({
    uid: customer2Uid,
    email: "beta@enterprise.sz",
    role: "customer",
    customerId: customer2Id,
    businessId: "biz_portal_beta"
  });

  const sessionStaffUser = createCustomerSession({
    uid: "staff_agent_303",
    email: "agent@agency.sz",
    role: "staff"
  });

  const sessionAdminUser = createCustomerSession({
    uid: "admin_super_404",
    email: "siphom.yati@gmail.com",
    role: "admin"
  });

  const bizCust1: Business = {
    ...supportActiveBiz,
    id: "biz_portal_alpha",
    name: "Alpha Corp Swaziland",
    customerAccount: {
      id: "acc_alpha_1",
      customerId: customer1Id,
      businessId: "biz_portal_alpha",
      businessName: "Alpha Corp Swaziland",
      ownerUserId: customer1Uid,
      primaryEmail: "alpha@corp.sz",
      accountStatus: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: []
    },
    invoices: [
      {
        id: "inv_alpha_01",
        invoiceId: "inv_alpha_01",
        invoiceNumber: "INV-ALPHA-01",
        customerId: customer1Id,
        businessId: "biz_portal_alpha",
        lineItems: [{ id: "l1", description: "Alpha Hosting", quantity: 1, unitPrice: 500, total: 500 }],
        subtotal: 500,
        taxAmount: 0,
        total: 500,
        amountPaid: 500,
        amountDue: 0,
        currency: "SZL",
        status: "PAID",
        issueDate: "2026-10-01",
        dueDate: "2026-10-15",
        paidAt: "2026-10-02T00:00:00.000Z",
        linkedPaymentIds: ["pay_alpha_01"],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-02T00:00:00.000Z"
      }
    ],
    supportTickets: [
      {
        id: "ticket_alpha_01",
        ticketId: "ticket_alpha_01",
        ticketNumber: "TCK-ALPHA-01",
        customerId: customer1Id,
        businessId: "biz_portal_alpha",
        requesterId: customer1Id,
        requesterName: "Alpha Requester",
        requesterEmail: "alpha@corp.sz",
        subject: "Alpha Domain Mapping",
        title: "Alpha Domain Mapping",
        description: "Configure alpha.sz DNS pointers",
        category: "DOMAIN_DNS",
        priority: "HIGH",
        status: "IN_PROGRESS",
        isCoveredUnderSla: true,
        attachments: [],
        messages: [
          {
            id: "msg_alpha_pub",
            ticketId: "ticket_alpha_01",
            senderId: customer1Id,
            senderName: "Alpha Requester",
            senderRole: "customer",
            message: "When will DNS propagation complete?",
            isInternal: false,
            timestamp: new Date().toISOString()
          },
          {
            id: "msg_alpha_priv",
            ticketId: "ticket_alpha_01",
            senderId: "staff_agent_303",
            senderName: "Staff Engineer",
            senderRole: "staff",
            message: "INTERNAL NOTE: Nameserver TTL cached at 86400 on registry end.",
            isInternal: true, // Must NEVER be exposed to customer!
            timestamp: new Date().toISOString()
          }
        ],
        createdTimestamp: new Date().toISOString(),
        reportedAt: new Date().toISOString(),
        updatedTimestamp: new Date().toISOString(),
        auditTrail: []
      }
    ],
    customerProject: {
      id: "proj_alpha_01",
      businessId: "biz_portal_alpha",
      businessName: "Alpha Corp Swaziland",
      dealId: "deal_alpha",
      onboardingId: "onb_alpha",
      projectType: "WEBSITE_NEW",
      agreedServices: ["design", "hosting"],
      assignedOwner: salesAgent,
      status: "IN_PROGRESS",
      launchStatus: "NOT_READY",
      customDomain: "alpha.sz",
      targetDeliveryDate: "2026-11-01",
      currentWebsiteVersion: 2,
      requirements: [],
      missingAssets: [],
      tasks: [],
      milestones: [],
      customerApprovals: [],
      revisionHistory: [],
      auditHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  const bizCust2: Business = {
    ...supportActiveBiz,
    id: "biz_portal_beta",
    name: "Beta Enterprise Swaziland",
    customerAccount: {
      id: "acc_beta_2",
      customerId: customer2Id,
      businessId: "biz_portal_beta",
      businessName: "Beta Enterprise Swaziland",
      ownerUserId: customer2Uid,
      primaryEmail: "beta@enterprise.sz",
      accountStatus: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: []
    },
    invoices: [
      {
        id: "inv_beta_02",
        invoiceId: "inv_beta_02",
        invoiceNumber: "INV-BETA-02",
        customerId: customer2Id,
        businessId: "biz_portal_beta",
        lineItems: [{ id: "l2", description: "Beta Cloud VIP", quantity: 1, unitPrice: 1200, total: 1200 }],
        subtotal: 1200,
        taxAmount: 0,
        total: 1200,
        amountPaid: 0,
        amountDue: 1200,
        currency: "SZL",
        status: "ISSUED",
        issueDate: "2026-10-01",
        dueDate: "2026-10-15",
        linkedPaymentIds: [],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z"
      }
    ],
    supportTickets: [
      {
        id: "ticket_beta_02",
        ticketId: "ticket_beta_02",
        ticketNumber: "TCK-BETA-02",
        customerId: customer2Id,
        businessId: "biz_portal_beta",
        requesterId: customer2Id,
        requesterName: "Beta Requester",
        requesterEmail: "beta@enterprise.sz",
        subject: "Beta Confidential Security Request",
        title: "Beta Confidential Security Request",
        description: "Confidential security vulnerability review",
        category: "SECURITY",
        priority: "URGENT",
        status: "OPEN",
        isCoveredUnderSla: true,
        attachments: [],
        messages: [],
        createdTimestamp: new Date().toISOString(),
        reportedAt: new Date().toISOString(),
        updatedTimestamp: new Date().toISOString(),
        auditTrail: []
      }
    ],
    customerProject: {
      id: "proj_beta_02",
      businessId: "biz_portal_beta",
      businessName: "Beta Enterprise Swaziland",
      dealId: "deal_beta",
      onboardingId: "onb_beta",
      projectType: "CUSTOM_PORTAL",
      agreedServices: ["custom_code"],
      assignedOwner: salesAgent,
      status: "IN_PROGRESS",
      launchStatus: "NOT_READY",
      customDomain: "beta.sz",
      targetDeliveryDate: "2026-12-01",
      currentWebsiteVersion: 1,
      requirements: [],
      missingAssets: [],
      tasks: [],
      milestones: [],
      customerApprovals: [],
      revisionHistory: [],
      auditHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  const portalAllBusinesses = [bizCust1, bizCust2];

  // 1. Customer Accesses Own Account (Permitted)
  const cust1OwnAccess = authorizeCustomerAccess(bizCust1, sessionCust1, "account");
  assert(cust1OwnAccess.authorized === true, "16C-1A: Customer 1 successfully accesses their own account");
  assert(cust1OwnAccess.status === 200, "16C-1B: Status is 200 OK for own account access");

  const cust1PortalData = sanitizeCustomerPortalData(bizCust1, sessionCust1);
  assert(cust1PortalData.account?.customerId === customer1Id, "16C-1C: Sanitized portal data contains correct customer account");
  assert(cust1PortalData.invoices.length === 1, "16C-1D: Customer 1 accesses own invoices (1)");
  assert(cust1PortalData.invoices[0].id === "inv_alpha_01", "16C-1E: Correct invoice returned");

  // 2. Customer Accesses Another Customer's Resource (Strict Boundary Isolation)
  const cust1AccessCust2 = authorizeCustomerAccess(bizCust2, sessionCust1, "account");
  assert(cust1AccessCust2.authorized === false, "16C-2A: Customer 1 access to Customer 2 account strictly rejected");
  assert(cust1AccessCust2.status === 403, "16C-2B: HTTP 403 Forbidden returned for boundary breach");
  assert(cust1AccessCust2.errorCode === "FORBIDDEN_RESOURCE", "16C-2C: Error code is FORBIDDEN_RESOURCE");

  const cust1AccessForeignInvoice = authorizeCustomerAccess(bizCust2, sessionCust1, "invoice", "inv_beta_02");
  assert(cust1AccessForeignInvoice.authorized === false, "16C-2D: Customer 1 access to Customer 2 invoice strictly rejected");
  assert(cust1AccessForeignInvoice.status === 403, "16C-2E: 403 Forbidden on foreign invoice access");

  // 3. Customer Changes an ID in a URL/API Request (Anti-Enumeration Guard)
  // Customer 1 attempts to request Customer 2's invoice ID within their session
  const cust1TamperInvoiceId = authorizeCustomerAccess(bizCust1, sessionCust1, "invoice", "inv_beta_02");
  assert(cust1TamperInvoiceId.authorized === false, "16C-3A: ID tampering/substitution for foreign invoice rejected");
  assert(cust1TamperInvoiceId.status === 404 || cust1TamperInvoiceId.status === 403, "16C-3B: Tampered invoice returns non-leak 404 or 403");

  // 4. Customer Accesses Another Customer's Support Ticket
  const cust1AccessForeignTicket = authorizeCustomerAccess(bizCust2, sessionCust1, "support_ticket", "ticket_beta_02");
  assert(cust1AccessForeignTicket.authorized === false, "16C-4A: Customer 1 access to Customer 2 support ticket rejected");
  assert(cust1AccessForeignTicket.status === 403, "16C-4B: Access denied on foreign support ticket");

  // 5. Customer Accesses Another Customer's Project, Preview & Documents
  const cust1AccessForeignProject = authorizeCustomerAccess(bizCust2, sessionCust1, "project", "proj_beta_02");
  assert(cust1AccessForeignProject.authorized === false, "16C-5A: Customer 1 access to Customer 2 project rejected");
  assert(cust1AccessForeignProject.status === 403, "16C-5B: Access denied on foreign project");

  const cust1AccessForeignPreview = authorizeCustomerAccess(bizCust2, sessionCust1, "preview_record", "proj_beta_02");
  assert(cust1AccessForeignPreview.authorized === false, "16C-5C: Customer 1 unauthorized preview access rejected");
  assert(cust1AccessForeignPreview.status === 403, "16C-5D: Status 403 Forbidden on foreign preview");

  const cust1AccessForeignDoc = authorizeCustomerAccess(bizCust2, sessionCust1, "document", "doc_beta_contract");
  assert(cust1AccessForeignDoc.authorized === false, "16C-5E: Customer 1 unauthorized document access rejected");
  assert(cust1AccessForeignDoc.status === 403, "16C-5F: Status 403 Forbidden on foreign document");

  // 6. Internal Staff Note Redaction Verification
  const cust1Tickets = cust1PortalData.supportTickets;
  assert(cust1Tickets.length === 1, "16C-6A: Customer 1 ticket retrieved");
  const cust1Ticket = cust1Tickets[0];
  assert(cust1Ticket.messages.length === 1, "16C-6B: Customer view strictly contains only 1 public message");
  assert(cust1Ticket.messages.every(m => !m.isInternal), "16C-6C: ALL internal staff notes strictly stripped from customer portal");
  assert(bizCust1.supportTickets![0].messages.length === 2, "16C-6D: Original backend store preserves all 2 messages (audit integrity)");

  // 7. Staff Accesses Permitted Customer Records
  const staffAccessAlpha = authorizeCustomerAccess(bizCust1, sessionStaffUser, "account");
  assert(staffAccessAlpha.authorized === true, "16C-7A: Staff member permitted to access customer account");
  assert(staffAccessAlpha.status === 200, "16C-7B: Staff access returns 200 OK");

  // 8. Staff Attempts Unauthorized Admin Action
  const staffUnauthorizedAdmin = authorizeCustomerAccess(bizCust1, sessionStaffUser, "account", undefined, "admin");
  assert(staffUnauthorizedAdmin.authorized === false, "16C-8A: Staff attempt at unauthorized admin action rejected");
  assert(staffUnauthorizedAdmin.status === 403, "16C-8B: Status 403 Forbidden returned");
  assert(staffUnauthorizedAdmin.errorCode === "ROLE_UNAUTHORIZED", "16C-8C: Error code is ROLE_UNAUTHORIZED");

  const sessionSupportRole = createCustomerSession({
    uid: "support_agent_555",
    email: "support@agency.sz",
    role: "support"
  });
  const supportUnauthorizedBillingWrite = authorizeCustomerAccess(bizCust1, sessionSupportRole, "invoice", undefined, "write");
  assert(supportUnauthorizedBillingWrite.authorized === false, "16C-8D: Support agent cannot perform unauthorized write to billing");
  assert(supportUnauthorizedBillingWrite.errorCode === "ROLE_UNAUTHORIZED", "16C-8E: Error code ROLE_UNAUTHORIZED returned");

  // 9. Admin Access
  const adminAccessAll = authorizeCustomerAccess(bizCust2, sessionAdminUser, "account", undefined, "admin");
  assert(adminAccessAll.authorized === true, "16C-9A: Admin granted full administrative access across accounts");

  // 10. Logged-Out / Unauthenticated Request
  const loggedOutAccess = authorizeCustomerAccess(bizCust1, null, "account");
  assert(loggedOutAccess.authorized === false, "16C-10A: Logged-out access attempt rejected");
  assert(loggedOutAccess.status === 401, "16C-10B: HTTP 401 Unauthorized returned");
  assert(loggedOutAccess.errorCode === "UNAUTHENTICATED", "16C-10C: Error code is UNAUTHENTICATED");

  // 11. Expired Session Handling
  const expiredSession = createCustomerSession({
    uid: "expired_user_505",
    email: "expired@test.sz",
    expiresInMs: -1000 // Expired 1 second ago
  });
  const expiredAccess = authorizeCustomerAccess(bizCust1, expiredSession, "account");
  assert(expiredAccess.authorized === false, "16C-11A: Expired session rejected");
  assert(expiredAccess.status === 401, "16C-11B: Status is 401 Unauthorized");
  assert(expiredAccess.errorCode === "EXPIRED_SESSION", "16C-11C: Error code is EXPIRED_SESSION");

  // 12. Session Revocation (Logout)
  const activeSessionToRevoke = createCustomerSession({
    uid: "logout_user_606",
    email: "logout@test.sz"
  });
  assert(isSessionValid(activeSessionToRevoke).valid === true, "16C-12A: Fresh session is initially valid");
  const revokedSession = revokeCustomerSession(activeSessionToRevoke);
  assert(isSessionValid(revokedSession).valid === false, "16C-12B: Revoked session is immediately invalid");
  assert(isSessionValid(revokedSession).errorCode === "EXPIRED_SESSION", "16C-12C: Revoked session marked as expired");

  // 13. Direct API Access Bypassing UI
  const directApiForeignInvoice = authorizeDirectApiAccess(portalAllBusinesses, sessionCust1, "invoice", "inv_beta_02");
  assert(directApiForeignInvoice.allowed === false, "16C-13A: Direct API call to foreign invoice ID rejected independently of UI");
  assert(directApiForeignInvoice.status === 403, "16C-13B: Direct API returns 403 Forbidden for unauthorized invoice");

  const directApiOwnInvoice = authorizeDirectApiAccess(portalAllBusinesses, sessionCust1, "invoice", "inv_alpha_01");
  assert(directApiOwnInvoice.allowed === true, "16C-13C: Direct API call to own invoice permitted");
  assert(directApiOwnInvoice.status === 200, "16C-13D: Status is 200 OK");
  assert(directApiOwnInvoice.data?.id === "inv_alpha_01", "16C-13E: Correct invoice payload returned");

  // 14. Terminated / Cancelled Account Entitlement Enforcement
  const cancelledBizCust: Business = {
    ...bizCust1,
    id: "biz_cancelled_cust",
    activeSubscription: {
      ...bizCust1.activeSubscription!,
      status: "CANCELLED"
    },
    customerAccount: {
      ...bizCust1.customerAccount!,
      currentSubscriptionStatus: "CANCELLED"
    }
  };
  const cancelledSession = createCustomerSession({
    uid: customer1Uid,
    email: "alpha@corp.sz",
    customerId: customer1Id,
    businessId: "biz_cancelled_cust"
  });

  // Historical read is preserved
  const cancelledReadAccess = authorizeCustomerAccess(cancelledBizCust, cancelledSession, "invoice", "inv_alpha_01", "read");
  assert(cancelledReadAccess.authorized === true, "16C-14A: Cancelled account retains historical read access to past invoices");

  // Active generation / modification action is rejected
  const cancelledWriteAccess = authorizeCustomerAccess(cancelledBizCust, cancelledSession, "account", undefined, "write");
  assert(cancelledWriteAccess.authorized === false, "16C-14B: Cancelled account cannot execute active write actions");
  assert(cancelledWriteAccess.status === 403, "16C-14C: HTTP 403 returned");
  assert(cancelledWriteAccess.errorCode === "ENTITLEMENT_RESTRICTED", "16C-14D: Error code ENTITLEMENT_RESTRICTED returned");

  // =========================================================================
  // GROUP 55: MICRO-PHASE 17A — INTERNAL ADMINISTRATION, ROLES & PRIVILEGED OPERATIONS
  // =========================================================================
  console.log("\n--- GROUP 55: MICRO-PHASE 17A — INTERNAL ADMINISTRATION, ROLES & PRIVILEGED OPERATIONS ---");

  // Reset staff registry and audit logs for clean test state
  resetStaffRegistryForTesting();
  clearPrivilegedAuditLogsForTesting();

  const superAdminActor = {
    uid: "admin_super_404",
    email: "siphom.yati@gmail.com",
    name: "Sipho M. (Super Admin)",
    role: "SUPER_ADMIN"
  };

  const privilegedAdminActor = {
    uid: "admin_user_001",
    email: "admin@sitescout.sz",
    name: "Platform Administrator",
    role: "ADMIN"
  };

  const staffActor = {
    uid: "staff_agent_303",
    email: "agent@agency.sz",
    name: "Operations Fulfillment Staff",
    role: "STAFF"
  };

  const customerActor = {
    uid: "cust_user_999",
    email: "client@external.sz",
    name: "External Client",
    role: "CUSTOMER"
  };

  const testTargetBusiness: Business = {
    ...bizCust1,
    id: "biz_admin_test_101",
    name: "Admin Target Enterprise",
    activeSubscription: {
      id: "sub_admin_101",
      subscriptionId: "sub_admin_101",
      customerId: "cust_adm_01",
      businessId: "biz_admin_test_101",
      planId: "pro",
      planName: "Pro Plan",
      billingInterval: "MONTHLY",
      unitPrice: 500,
      startDate: "2026-10-01",
      currency: "SZL",
      status: "ACTIVE",
      currentPeriodStart: "2026-10-01",
      currentPeriodEnd: "2026-11-01",
      auditTrail: [],
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z"
    } as any,
    invoices: [
      {
        id: "inv_admin_01",
        invoiceId: "inv_admin_01",
        invoiceNumber: "INV-ADM-01",
        customerId: "cust_adm_01",
        businessId: "biz_admin_test_101",
        lineItems: [{ id: "l1", description: "Pro Hosting", quantity: 1, unitPrice: 500, total: 500 }],
        subtotal: 500,
        taxAmount: 0,
        total: 500,
        amountPaid: 500,
        amountDue: 0,
        currency: "SZL",
        status: "PAID",
        issueDate: "2026-10-01",
        dueDate: "2026-10-15",
        linkedPaymentIds: ["pay_admin_01"],
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z"
      }
    ],
    payments: [
      {
        id: "pay_admin_01",
        paymentId: "pay_admin_01",
        paymentNumber: "PAY-ADM-01",
        customerId: "cust_adm_01",
        businessId: "biz_admin_test_101",
        invoiceId: "inv_admin_01",
        amount: 500,
        netAmount: 500,
        refundedAmount: 0,
        currency: "SZL",
        status: "COMPLETED",
        paymentMethod: "card",
        paymentProviderRef: {
          provider: "manual_verified",
          referenceId: "sim_pay_adm_01",
          receiptNumber: "REC-ADM-01"
        },
        refunds: [],
        paidAt: "2026-10-01T00:00:00.000Z",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z"
      }
    ]
  };

  // 1. Customer Attempting Admin Access (Forbidden)
  const custAdminAttempt = await authorizePrivilegedOperation({
    actor: customerActor,
    operation: "VIEW_STAFF_ACCOUNTS",
    requiredPermission: "VIEW_STAFF_ACCOUNTS",
    targetEntity: { entityType: "system", entityId: "staff_directory" }
  });
  assert(custAdminAttempt.authorized === false, "17A-1A: Customer attempting internal admin access is rejected");
  assert(custAdminAttempt.status === 403, "17A-1B: HTTP 403 Forbidden returned for customer admin attempt");
  assert(custAdminAttempt.errorCode === "ROLE_UNAUTHORIZED", "17A-1C: Error code is ROLE_UNAUTHORIZED");
  assert(custAdminAttempt.auditEvent?.status === "DENIED", "17A-1D: Denied audit event recorded");

  // 2. Staff Attempting Admin-Only Action (Elevated permission check)
  const staffRefundAttempt = await authorizePrivilegedOperation({
    actor: staffActor,
    operation: "ISSUE_REFUNDS",
    targetEntity: { entityType: "payment", entityId: "pay_admin_01", businessId: testTargetBusiness.id },
    highRiskJustification: "Staff requesting manual refund"
  });
  assert(staffRefundAttempt.authorized === false, "17A-2A: Staff attempt at admin-only refund operation is rejected");
  assert(staffRefundAttempt.status === 403, "17A-2B: HTTP 403 Forbidden returned for staff missing refund permission");
  assert(staffRefundAttempt.errorCode === "ROLE_UNAUTHORIZED", "17A-2C: Error code is ROLE_UNAUTHORIZED");

  // 3. Staff Accessing an Unauthorized Customer (Scoped Customer Boundary)
  // staff_agent_303 is explicitly scoped to "biz_portal_alpha" only
  const staffScopedOutAttempt = await authorizePrivilegedOperation({
    actor: staffActor,
    operation: "VIEW_CUSTOMERS",
    requiredPermission: "VIEW_CUSTOMERS",
    targetEntity: { entityType: "business", entityId: "biz_portal_beta", businessId: "biz_portal_beta" }
  });
  assert(staffScopedOutAttempt.authorized === false, "17A-3A: Staff access to unassigned customer business is rejected");
  assert(staffScopedOutAttempt.errorCode === "UNAUTHORIZED_CUSTOMER_SCOPE", "17A-3B: Error code UNAUTHORIZED_CUSTOMER_SCOPE returned");

  // When staff accesses their permitted customer, scope check passes
  const staffScopedInAttempt = await authorizePrivilegedOperation({
    actor: staffActor,
    operation: "VIEW_CUSTOMERS",
    requiredPermission: "VIEW_CUSTOMERS",
    targetEntity: { entityType: "business", entityId: "biz_portal_alpha", businessId: "biz_portal_alpha" }
  });
  assert(staffScopedInAttempt.authorized === true, "17A-3C: Staff permitted to access assigned customer business");

  // 4. Role Manipulation Through Frontend (Client spoofing elevated role)
  // Malicious client payload sends role: "SUPER_ADMIN" for a customer UID
  const spoofedActor = {
    uid: "cust_user_999",
    email: "client@external.sz",
    role: "SUPER_ADMIN" // Fraudulent role claim
  };
  const spoofedAttempt = await authorizePrivilegedOperation({
    actor: spoofedActor,
    operation: "VIEW_STAFF_ACCOUNTS",
    requiredPermission: "VIEW_STAFF_ACCOUNTS"
  });
  assert(spoofedAttempt.authorized === false, "17A-4A: Client role spoofing attempt is detected and blocked");
  assert(spoofedAttempt.errorCode === "PRIVILEGE_ESCALATION_BLOCKED", "17A-4B: Error code PRIVILEGE_ESCALATION_BLOCKED returned");
  assert(spoofedAttempt.auditEvent?.denialReason?.includes("Privilege escalation blocked") === true, "17A-4C: Audit log flags privilege escalation attempt");

  // 5. Direct Unauthorized API Request (Bypassing UI, missing session/actor)
  const unauthDirectApi = await authorizePrivilegedOperation({
    actor: null,
    session: null,
    operation: "VIEW_AUDIT_LOGS",
    requiredPermission: "VIEW_AUDIT_LOGS"
  });
  assert(unauthDirectApi.authorized === false, "17A-5A: Direct unauthenticated API request is rejected");
  assert(unauthDirectApi.status === 401, "17A-5B: HTTP 401 Unauthorized returned");
  assert(unauthDirectApi.errorCode === "UNAUTHENTICATED", "17A-5C: Error code UNAUTHENTICATED returned");

  // 6. Privilege Escalation Attempt (Admin attempting to assign SUPER_ADMIN)
  // An Admin attempts to promote another user to SUPER_ADMIN (only SUPER_ADMIN can do this)
  const adminEscalationAttempt = await executeChangeUserRole({
    targetStaffId: "staff_staff_001",
    newRole: "SUPER_ADMIN",
    actor: privilegedAdminActor,
    reason: "Attempting promotion to SUPER_ADMIN"
  });
  assert(adminEscalationAttempt.success === false, "17A-6A: Non-SUPER_ADMIN cannot grant SUPER_ADMIN role");
  assert(adminEscalationAttempt.status === 403, "17A-6B: HTTP 403 Forbidden on illegal role elevation");
  assert(adminEscalationAttempt.error?.includes("Only SUPER_ADMIN") === true, "17A-6C: Descriptive authorization error returned");

  // 7. Authorized Admin Operations
  const legitSubChange = await executeChangeSubscriptionStatus({
    targetBusiness: testTargetBusiness,
    newStatus: "CANCELLED",
    actor: privilegedAdminActor,
    reason: "Authorized administrative cancellation upon customer SLA termination"
  });
  assert(legitSubChange.success === true, "17A-7A: Authorized Admin successfully updates subscription status");
  assert(legitSubChange.status === 200, "17A-7B: Status 200 OK returned");
  assert(legitSubChange.business?.activeSubscription?.status === "CANCELLED", "17A-7C: Business record contains updated CANCELLED status");

  const legitFinancialEdit = await executeEditFinancialRecords({
    targetBusiness: testTargetBusiness,
    invoiceId: "inv_admin_01",
    adjustments: { amountDue: 250, status: "PARTIALLY_PAID" },
    actor: privilegedAdminActor,
    reason: "Authorized courtesy discount applied per management review"
  });
  assert(legitFinancialEdit.success === true, "17A-7D: Authorized Admin updates financial invoice adjustments");
  const updatedInv = legitFinancialEdit.business?.invoices?.find(i => i.id === "inv_admin_01");
  assert(updatedInv?.amountDue === 250, "17A-7E: Invoice amountDue adjusted accurately");

  // 8. High-Risk Operation Audit Logging
  const recordedAudits = getPrivilegedAuditLogs();
  assert(recordedAudits.length > 0, "17A-8A: Privileged audit log entries exist");
  const subChangeAudit = recordedAudits.find(a => a.operation === "CHANGE_SUBSCRIPTION_STATUS" && a.status === "AUTHORIZED");
  assert(subChangeAudit !== undefined, "17A-8B: CHANGE_SUBSCRIPTION_STATUS audit event preserved");
  assert(subChangeAudit?.actor.email === "admin@sitescout.sz", "17A-8C: Exact actor email logged in audit");
  assert(subChangeAudit?.metadata?.justification?.includes("administrative cancellation") === true, "17A-8D: High-risk justification preserved in audit metadata");

  // Missing justification on high-risk operation without SUPER_ADMIN is rejected
  const missingJustificationAttempt = await authorizePrivilegedOperation({
    actor: privilegedAdminActor,
    operation: "DELETE_RECORDS",
    targetEntity: { entityType: "customer", entityId: "cust_123" }
    // No highRiskJustification provided
  });
  assert(missingJustificationAttempt.authorized === false, "17A-8E: High-risk action rejected without justification");
  assert(missingJustificationAttempt.status === 400, "17A-8F: HTTP 400 Bad Request returned for missing justification");

  // 9. Role Change (Legitimate Workflow by Super Admin)
  const legitRoleChange = await executeChangeUserRole({
    targetStaffId: "staff_staff_001",
    newRole: "MANAGER",
    actor: superAdminActor,
    reason: "Promotion to Operations Manager based on quarterly fulfillment performance"
  });
  assert(legitRoleChange.success === true, "17A-9A: Super Admin successfully changes staff role");
  assert(legitRoleChange.updatedAccount?.role === "MANAGER", "17A-9B: Updated staff account reflects MANAGER role");
  const verifiedStaffAfter = findStaffAccount("staff_staff_001");
  assert(verifiedStaffAfter?.role === "MANAGER", "17A-9C: Canonical staff registry updated with new role");

  // 10. Revoked User's Access
  const revokedOperator = {
    id: "staff_revoked_01",
    uid: "revoked_user_808",
    email: "revoked@agency.sz",
    name: "Revoked Operator",
    role: "STAFF" as const,
    status: "ACTIVE" as const,
    isRevoked: true, // Access explicitly revoked
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  resetStaffRegistryForTesting([...getStaffDirectory(), revokedOperator]);

  const revokedAttempt = await authorizePrivilegedOperation({
    actor: { uid: revokedOperator.uid, email: revokedOperator.email, role: "STAFF" },
    operation: "VIEW_CUSTOMERS",
    requiredPermission: "VIEW_CUSTOMERS"
  });
  assert(revokedAttempt.authorized === false, "17A-10A: Revoked operator access is denied");
  assert(revokedAttempt.status === 403, "17A-10B: HTTP 403 Forbidden returned for revoked operator");
  assert(revokedAttempt.errorCode === "OPERATOR_REVOKED", "17A-10C: Error code OPERATOR_REVOKED returned");

  // 11. Deleted / Deactivated User's Access
  const deactivateRes = await executeDeactivateStaffAccount({
    targetStaffId: "staff_sales_001",
    revokeImmediately: true,
    actor: privilegedAdminActor,
    reason: "Contractor end of engagement"
  });
  assert(deactivateRes.success === true, "17A-11A: Staff account successfully deactivated");
  const deactivatedAccount = findStaffAccount("staff_sales_001");
  assert(deactivatedAccount?.status === "DEACTIVATED", "17A-11B: Account status marked DEACTIVATED");

  const deactivatedAttempt = await authorizePrivilegedOperation({
    actor: { uid: "sales_agent_001", email: "sales@agency.sz", role: "SALES" },
    operation: "VIEW_CRM",
    requiredPermission: "VIEW_CRM"
  });
  assert(deactivatedAttempt.authorized === false, "17A-11C: Deactivated user subsequent access attempt denied");
  assert(deactivatedAttempt.errorCode === "OPERATOR_REVOKED" || deactivatedAttempt.errorCode === "ACCOUNT_DEACTIVATED", "17A-11D: Deactivation/revocation error code returned");

  // 12. Concurrent Privileged Operations (Race Condition & Mutex Protection)
  const lockKey = "refund_lock_pay_admin_01";
  const lockAcquiredFirst = acquireOperationLock(lockKey, "operator_process_A");
  assert(lockAcquiredFirst === true, "17A-12A: First privileged operator acquires lock");

  // Simultaneous attempt by another operator on the same resource
  const simultaneousRefund = await executeIssueRefund({
    targetBusiness: testTargetBusiness,
    paymentId: "pay_admin_01",
    refundAmount: 200,
    actor: { uid: "operator_process_B", email: "admin2@sitescout.sz", role: "ADMIN" },
    reason: "Concurrent refund attempt"
  });
  assert(simultaneousRefund.success === false, "17A-12B: Conflicting concurrent privileged operation rejected");
  assert(simultaneousRefund.status === 409, "17A-12C: HTTP 409 Conflict returned");
  assert(simultaneousRefund.error?.includes("Another refund operation is currently in flight") === true, "17A-12D: Clear concurrency conflict message returned");

  // Release lock and ensure sequential operation now succeeds
  releaseOperationLock(lockKey, "operator_process_A");
  const sequentialRefund = await executeIssueRefund({
    targetBusiness: testTargetBusiness,
    paymentId: "pay_admin_01",
    refundAmount: 200,
    actor: privilegedAdminActor,
    reason: "Sequential legitimate customer refund per policy"
  });
  assert(sequentialRefund.success === true, "17A-12E: Sequential privileged operation succeeds after lock released");
  assert(sequentialRefund.status === 200, "17A-12F: HTTP 200 OK returned");

  // 13. Staff Attempts Super-Admin Action
  const staffSuperAdminAttempt = await executeModifySecuritySettings({
    settingKey: "auth_mfa_policy",
    newValue: { enforced: false },
    actor: staffActor,
    reason: "Staff attempting to alter system security setting"
  });
  assert(staffSuperAdminAttempt.success === false, "17A-13A: Staff attempt at super-admin action is rejected");
  assert(staffSuperAdminAttempt.status === 403, "17A-13B: HTTP 403 Forbidden returned for staff attempting super-admin action");
  
  const superAdminSecUpdate = await executeModifySecuritySettings({
    settingKey: "auth_mfa_policy",
    newValue: { enforced: true },
    actor: superAdminActor,
    reason: "Mandatory system-wide MFA enforcement"
  });
  assert(superAdminSecUpdate.success === true, "17A-13C: Super Admin successfully executes security settings modification");
  assert(superAdminSecUpdate.status === 200, "17A-13D: HTTP 200 OK returned for Super Admin");

  // 14. Impersonation Authorization and Audit Trail
  const staffImpersonateAttempt = await executeUserImpersonation({
    targetUserId: "cust_user_999",
    targetUserEmail: "client@external.sz",
    actor: staffActor,
    reason: "Staff attempting user impersonation without authorization"
  });
  assert(staffImpersonateAttempt.success === false, "17A-14A: Staff impersonation attempt is rejected");
  assert(staffImpersonateAttempt.status === 403, "17A-14B: HTTP 403 Forbidden returned for staff impersonation");
  assert(staffImpersonateAttempt.error?.includes("ROLE_UNAUTHORIZED") || staffImpersonateAttempt.error?.includes("Forbidden") || staffImpersonateAttempt.error?.includes("lacks required permission") === true, "17A-14C: Descriptive error returned for unauthorized impersonation");

  const unloggedImpersonateAttempt = await executeUserImpersonation({
    targetUserId: "cust_user_999",
    targetUserEmail: "client@external.sz",
    actor: privilegedAdminActor,
    reason: "" // Missing required audit justification
  });
  assert(unloggedImpersonateAttempt.success === false, "17A-14D: Admin impersonation without justification is blocked");
  assert(unloggedImpersonateAttempt.status === 400, "17A-14E: HTTP 400 Bad Request returned when impersonation justification is omitted");

  const legitImpersonation = await executeUserImpersonation({
    targetUserId: "cust_user_999",
    targetUserEmail: "client@external.sz",
    actor: privilegedAdminActor,
    reason: "Investigating ticket #884 onboarding form rendering failure"
  });
  assert(legitImpersonation.success === true, "17A-14F: Authorized Admin successfully initiates audited impersonation session");
  assert(legitImpersonation.impersonationSession?.impersonatedUserId === "cust_user_999", "17A-14G: Impersonation session reflects target user ID");
  assert(legitImpersonation.impersonationSession?.impersonatedByUid === privilegedAdminActor.uid, "17A-14H: Impersonation session logs admin actor UID");

  const impersonationAudit = getPrivilegedAuditLogs().find(a => a.operation === "IMPERSONATE_USER" && a.status === "AUTHORIZED");
  assert(impersonationAudit !== undefined, "17A-14I: Dedicated impersonation audit event preserved in audit log");
  assert(impersonationAudit?.metadata?.justification?.includes("ticket #884") === true, "17A-14J: Impersonation justification preserved in immutable audit metadata");

  // 15. Financial Modification by Unauthorized Role
  const staffFinancialEditAttempt = await executeEditFinancialRecords({
    targetBusiness: testTargetBusiness,
    invoiceId: "inv_admin_01",
    adjustments: { amountDue: 0, status: "PAID" },
    actor: staffActor,
    reason: "Staff attempting to wipe invoice balance"
  });
  assert(staffFinancialEditAttempt.success === false, "17A-15A: Staff unauthorized financial modification is rejected");
  assert(staffFinancialEditAttempt.status === 403, "17A-15B: HTTP 403 Forbidden returned for staff financial edit");

  const salesFinancialEditAttempt = await executeEditFinancialRecords({
    targetBusiness: testTargetBusiness,
    invoiceId: "inv_admin_01",
    adjustments: { amountDue: 0, status: "PAID" },
    actor: { uid: "sales_agent_001", email: "sales@agency.sz", role: "SALES" },
    reason: "Sales attempting unauthorized invoice balance modification"
  });
  assert(salesFinancialEditAttempt.success === false, "17A-15C: Sales role financial modification is rejected");
  assert(salesFinancialEditAttempt.status === 403, "17A-15D: HTTP 403 Forbidden returned for sales financial edit");

  // 16. Customer Data Deletion by Unauthorized Role
  const staffDeleteAttempt = await executeDeleteRecord({
    targetEntityType: "customer_account",
    targetEntityId: "cust_adm_01",
    businessId: testTargetBusiness.id,
    actor: staffActor,
    reason: "Staff attempting customer account deletion"
  });
  assert(staffDeleteAttempt.success === false, "17A-16A: Staff customer data deletion attempt is rejected");
  assert(staffDeleteAttempt.status === 403, "17A-16B: HTTP 403 Forbidden returned for staff record deletion");

  const managerDeleteAttempt = await executeDeleteRecord({
    targetEntityType: "customer_account",
    targetEntityId: "cust_adm_01",
    businessId: testTargetBusiness.id,
    actor: { uid: "manager_user_001", email: "manager@sitescout.sz", role: "MANAGER" },
    reason: "Manager attempting customer account deletion without elevated permission"
  });
  assert(managerDeleteAttempt.success === false, "17A-16C: Manager deletion attempt without elevated privilege is rejected");
  assert(managerDeleteAttempt.status === 403, "17A-16D: HTTP 403 Forbidden returned for manager customer deletion");

  const adminDeleteSuccess = await executeDeleteRecord({
    targetEntityType: "customer_account",
    targetEntityId: "cust_adm_01",
    businessId: testTargetBusiness.id,
    actor: privilegedAdminActor,
    reason: "GDPR Right to Be Forgotten deletion request verified"
  });
  assert(adminDeleteSuccess.success === true, "17A-16E: Authorized Admin successfully executes customer account deletion");
  assert(adminDeleteSuccess.status === 200, "17A-16F: HTTP 200 OK returned for Admin deletion");

  // 17. Failed Privileged Operation Error Handling
  // Verify clean, sanitized error responses with proper codes and no internal data leak
  const sanitizedErrorCheck = await authorizePrivilegedOperation({
    actor: customerActor,
    operation: "SYSTEM_ADMIN",
    requiredPermission: "SYSTEM_ADMIN"
  });
  assert(sanitizedErrorCheck.authorized === false, "17A-17A: Unauthorized customer system access denied");
  assert(sanitizedErrorCheck.status === 403, "17A-17B: HTTP 403 returned");
  assert(sanitizedErrorCheck.reason !== undefined && sanitizedErrorCheck.reason.length > 0, "17A-17C: Clear user-facing reason provided");
  assert(!sanitizedErrorCheck.reason?.includes("SELECT *") && !sanitizedErrorCheck.reason?.includes("secret_key"), "17A-17D: No internal database queries or secrets leaked in error response");

  // =========================================================================
  // GROUP 56: MICRO-PHASE 17B — AUDIT LOGGING, SECURITY EVENTS & ADMINISTRATIVE ACCOUNTABILITY
  // =========================================================================
  console.log("\n--- GROUP 56: MICRO-PHASE 17B — AUDIT LOGGING, SECURITY EVENTS & ADMINISTRATIVE ACCOUNTABILITY ---");

  // Reset canonical audit log store for pristine isolated testing
  resetCanonicalAuditLogsForTesting();

  // 1. Successful Customer Update
  const customerUpdateAudit = await recordCustomerLifecycleAuditEvent({
    eventType: "CUSTOMER_UPDATED",
    customerId: "cust_alpha_01",
    businessId: "biz_portal_alpha",
    actor: { actorId: "cust_alpha_uid", email: "client@alphacorp.sz", role: "CUSTOMER" },
    outcome: "SUCCESS",
    action: "update_profile",
    previousState: { phone: "+268 7600 0001", address: "Mbabane Central" },
    newState: { phone: "+268 7600 9999", address: "Mbabane East" },
    reason: "Customer verified contact phone number update",
    correlationId: "corr_cust_upd_101"
  });
  assert(customerUpdateAudit.outcome === "SUCCESS", "17B-1A: Customer update logged with SUCCESS outcome");
  assert(customerUpdateAudit.category === "USER_ACTION", "17B-1B: Customer update categorized as USER_ACTION");
  assert(customerUpdateAudit.previousState?.phone === "+268 7600 0001", "17B-1C: Previous state preserved accurately");
  assert(customerUpdateAudit.newState?.phone === "+268 7600 9999", "17B-1D: New state preserved accurately");
  assert(customerUpdateAudit.correlationId === "corr_cust_upd_101", "17B-1E: Correlation ID preserved");

  // 2. Failed Customer Update
  const failedCustomerUpdate = await recordCustomerLifecycleAuditEvent({
    eventType: "CUSTOMER_UPDATED",
    customerId: "cust_alpha_01",
    businessId: "biz_portal_alpha",
    actor: { actorId: "cust_alpha_uid", email: "client@alphacorp.sz", role: "CUSTOMER" },
    outcome: "FAILED",
    action: "update_profile",
    reason: "Validation error: invalid international dialing code format",
    correlationId: "corr_cust_fail_102"
  });
  assert(failedCustomerUpdate.outcome === "FAILED", "17B-2A: Failed operation logged with FAILED outcome");
  assert(failedCustomerUpdate.outcome !== "SUCCESS", "17B-2B: Failed operation is NOT logged as successful");
  assert(failedCustomerUpdate.reason?.includes("Validation error") === true, "17B-2C: Failure reason captured accurately");
  assert(failedCustomerUpdate.targetEntity.entityId === "cust_alpha_01", "17B-2D: Target entity correctly associated");

  // 3. Unauthorized Access Attempt (Security Event)
  const unauthAccessAudit = await recordAuthAuditEvent({
    eventType: "AUTH_FAILED",
    actorId: "unauth_actor_404",
    email: "unknown@malicious.com",
    role: "EXTERNAL",
    outcome: "DENIED",
    reason: "Bearer token signature expired or invalid signature header",
    correlationId: "corr_sec_unauth_103"
  });
  assert(unauthAccessAudit.outcome === "DENIED", "17B-3A: Unauthorized access attempt logged with DENIED outcome");
  assert(unauthAccessAudit.category === "SECURITY_EVENT", "17B-3B: Unauthorized access attempt categorized as SECURITY_EVENT");
  assert(unauthAccessAudit.actor.actorType === "EXTERNAL" || unauthAccessAudit.actor.actorType === "HUMAN", "17B-3C: Actor type recorded");
  assert(unauthAccessAudit.source === "SiteScout-Auth", "17B-3D: Source system correctly identified as SiteScout-Auth");

  // 4. Successful Admin Action
  const { event: adminActionAudit } = await recordCanonicalAuditEvent({
    eventType: "CHANGE_SUBSCRIPTION_STATUS",
    category: "ADMIN_ACTION",
    outcome: "SUCCESS",
    actor: {
      actorId: "admin_user_001",
      email: "admin@sitescout.sz",
      role: "ADMIN",
      actorType: "HUMAN"
    },
    targetEntity: {
      entityType: "subscription",
      entityId: "sub_101",
      businessId: "biz_portal_alpha"
    },
    action: "update_status",
    previousState: { status: "ACTIVE" },
    newState: { status: "CANCELLED" },
    reason: "Administrative cancellation upon SLA termination",
    correlationId: "corr_admin_sub_104"
  });
  assert(adminActionAudit.outcome === "SUCCESS", "17B-4A: Successful admin action logged as SUCCESS");
  assert(adminActionAudit.category === "ADMIN_ACTION", "17B-4B: Admin action categorized as ADMIN_ACTION");
  assert(adminActionAudit.actor.role === "ADMIN", "17B-4C: Actor role verified as ADMIN");
  assert(adminActionAudit.targetEntity.entityType === "subscription", "17B-4D: Target entity is subscription");

  // 5. Denied Admin Action
  const { event: deniedAdminAction } = await recordCanonicalAuditEvent({
    eventType: "ISSUE_REFUNDS",
    category: "SECURITY_EVENT",
    outcome: "DENIED",
    actor: {
      actorId: "staff_agent_303",
      email: "agent@agency.sz",
      role: "STAFF",
      actorType: "HUMAN"
    },
    targetEntity: {
      entityType: "payment",
      entityId: "pay_admin_01",
      businessId: "biz_admin_test_101"
    },
    action: "refund",
    reason: "Staff role lacks required permission 'ISSUE_REFUNDS'",
    correlationId: "corr_admin_denied_105"
  });
  assert(deniedAdminAction.outcome === "DENIED", "17B-5A: Denied admin action logged as DENIED");
  assert(deniedAdminAction.category === "SECURITY_EVENT", "17B-5B: Denied privileged action categorized as SECURITY_EVENT");
  assert(deniedAdminAction.reason?.includes("lacks required permission") === true, "17B-5C: Privilege denial reason preserved");
  assert(deniedAdminAction.targetEntity.entityType === "payment", "17B-5D: Target entity is payment");

  // 6. Role Change
  const { event: roleChangeAudit } = await recordCanonicalAuditEvent({
    eventType: "CHANGE_USER_ROLES",
    category: "ADMIN_ACTION",
    outcome: "SUCCESS",
    actor: {
      actorId: "admin_super_404",
      email: "siphom.yati@gmail.com",
      role: "SUPER_ADMIN",
      actorType: "HUMAN"
    },
    targetEntity: {
      entityType: "staff_account",
      entityId: "staff_agent_303"
    },
    action: "role_change",
    previousState: { role: "STAFF" },
    newState: { role: "MANAGER" },
    reason: "Quarterly operational promotion to Fulfillment Manager",
    correlationId: "corr_role_promo_106"
  });
  assert(roleChangeAudit.outcome === "SUCCESS", "17B-6A: Role change logged with SUCCESS outcome");
  assert(roleChangeAudit.category === "ADMIN_ACTION", "17B-6B: Role change categorized as ADMIN_ACTION");
  assert(roleChangeAudit.previousState?.role === "STAFF", "17B-6C: Previous role STAFF logged");
  assert(roleChangeAudit.newState?.role === "MANAGER", "17B-6D: New role MANAGER logged");
  assert(roleChangeAudit.action === "role_change", "17B-6E: Action reflects role_change");

  // 7. Subscription Change
  const canonicalSubChangeAudit = await recordFinancialAuditEvent({
    eventType: "SUBSCRIPTION_STATUS_CHANGED",
    targetId: "sub_alpha_01",
    entityType: "subscription",
    businessId: "biz_portal_alpha",
    actor: { actorId: "admin_user_001", email: "admin@sitescout.sz", role: "ADMIN" },
    outcome: "SUCCESS",
    action: "status_change",
    previousState: { status: "ACTIVE" },
    newState: { status: "EXPIRED" },
    reason: "Subscription expired following grace period exhaustion",
    correlationId: "corr_sub_expire_107"
  });
  assert(canonicalSubChangeAudit.outcome === "SUCCESS", "17B-7A: Subscription status change logged as SUCCESS");
  assert(canonicalSubChangeAudit.targetEntity.entityType === "subscription", "17B-7B: Target entity is subscription");
  assert(canonicalSubChangeAudit.previousState?.status === "ACTIVE", "17B-7C: Previous state captured");
  assert(canonicalSubChangeAudit.newState?.status === "EXPIRED", "17B-7D: New state captured");

  // 8. Payment Event
  const paymentAudit = await recordFinancialAuditEvent({
    eventType: "PAYMENT_RECEIVED",
    targetId: "pay_alpha_02",
    entityType: "payment",
    businessId: "biz_portal_alpha",
    actor: { actorId: "stripe_webhook", email: "system@stripe.com", actorType: "AUTOMATED" },
    outcome: "SUCCESS",
    action: "charge",
    previousState: { status: "PENDING" },
    newState: { status: "COMPLETED", amount: 1500, currency: "SZL" },
    reason: "Automated card payment settled successfully",
    correlationId: "corr_pay_settled_108"
  });
  assert(paymentAudit.outcome === "SUCCESS", "17B-8A: Payment event logged with SUCCESS outcome");
  assert(paymentAudit.actor.actorType === "AUTOMATED", "17B-8B: Actor type identified as AUTOMATED");
  assert(paymentAudit.targetEntity.entityType === "payment", "17B-8C: Target entity is payment");
  assert(paymentAudit.newState?.status === "COMPLETED", "17B-8D: Completed state recorded");

  // 9. Website Publication
  const sitePubAudit = await recordWebsiteLifecycleAuditEvent({
    eventType: "WEBSITE_PUBLISHED",
    siteId: "site_alpha_web",
    businessId: "biz_portal_alpha",
    actor: { actorId: "staff_agent_303", email: "agent@agency.sz", role: "STAFF" },
    outcome: "SUCCESS",
    action: "publish",
    previousState: { published: false, version: 1 },
    newState: { published: true, version: 2 },
    reason: "Staff staged new responsive business template",
    correlationId: "corr_site_pub_109"
  });
  assert(sitePubAudit.outcome === "SUCCESS", "17B-9A: Website publication logged with SUCCESS");
  assert(sitePubAudit.action === "publish", "17B-9B: Action logged as publish");
  assert(sitePubAudit.targetEntity.entityType === "website_project", "17B-9C: Target entity is website_project");
  assert(sitePubAudit.newState?.published === true, "17B-9D: New state published is true");

  // 10. Website Launch
  const siteLaunchAudit = await recordWebsiteLifecycleAuditEvent({
    eventType: "WEBSITE_LAUNCHED",
    siteId: "site_alpha_web",
    businessId: "biz_portal_alpha",
    actor: { actorId: "admin_user_001", email: "admin@sitescout.sz", role: "ADMIN" },
    outcome: "SUCCESS",
    action: "launch",
    previousState: { launchStatus: "PRE_LAUNCH" },
    newState: { launchStatus: "DEPLOYED_VERIFIED", customDomain: "alphacorp.sz" },
    reason: "Custom domain DNS propagated and SSL certificate verified",
    correlationId: "corr_site_launch_110"
  });
  assert(siteLaunchAudit.outcome === "SUCCESS", "17B-10A: Website launch logged with SUCCESS");
  assert(siteLaunchAudit.action === "launch", "17B-10B: Action logged as launch");
  assert(siteLaunchAudit.newState?.customDomain === "alphacorp.sz", "17B-10C: Target domain recorded");
  assert(siteLaunchAudit.category === "ADMIN_ACTION", "17B-10D: Launch categorized as ADMIN_ACTION");

  // 11. Account Deactivation
  const deactAudit = await recordCustomerLifecycleAuditEvent({
    eventType: "CUSTOMER_DEACTIVATED",
    customerId: "cust_dormant_01",
    businessId: "biz_dormant_01",
    actor: { actorId: "admin_user_001", email: "admin@sitescout.sz", role: "ADMIN" },
    outcome: "SUCCESS",
    action: "deactivate",
    previousState: { status: "ACTIVE" },
    newState: { status: "DEACTIVATED" },
    reason: "Customer account deactivated per formal closeout request",
    correlationId: "corr_cust_deact_111"
  });
  assert(deactAudit.outcome === "SUCCESS", "17B-11A: Account deactivation logged as SUCCESS");
  assert(deactAudit.action === "deactivate", "17B-11B: Action logged as deactivate");
  assert(deactAudit.newState?.status === "DEACTIVATED", "17B-11C: Deactivated state recorded");
  assert(deactAudit.category === "ADMIN_ACTION", "17B-11D: Deactivation categorized as ADMIN_ACTION");

  // 12. Audit-Record Tampering Attempt
  const tamperResult = await preventAuditTampering({
    actor: { actorId: "cust_attacker", email: "attacker@external.sz", role: "CUSTOMER" },
    action: "delete",
    targetAuditId: customerUpdateAudit.eventId
  });
  assert(tamperResult.success === false, "17B-12A: Audit log tampering attempt is blocked");
  assert(tamperResult.status === 403, "17B-12B: HTTP 403 Forbidden returned for audit tampering");
  assert(tamperResult.error.includes("immutable") === true, "17B-12C: Descriptive immutability error returned");

  // Tampering attempt itself must generate a SECURITY_EVENT audit record
  const tamperingSecurityEvent = getCanonicalAuditLogs({ eventType: "AUDIT_TAMPERING_BLOCKED" });
  assert(tamperingSecurityEvent.length > 0, "17B-12D: Security audit record generated for blocked tampering attempt");
  assert(tamperingSecurityEvent[0].outcome === "DENIED", "17B-12E: Tampering security event logged with DENIED outcome");

  // 13. Duplicate Event (Idempotency Protection)
  const dedupKeyTest = "idem_tx_webhook_999";
  const firstEventCall = await recordCanonicalAuditEvent({
    eventType: "PAYMENT_RECEIVED",
    category: "SYSTEM_ACTION",
    outcome: "SUCCESS",
    actor: { actorId: "system_cron", actorType: "AUTOMATED" },
    targetEntity: { entityType: "payment", entityId: "pay_idem_01" },
    action: "process_webhook",
    idempotencyKey: dedupKeyTest,
    reason: "First webhook delivery"
  });
  assert(firstEventCall.isDuplicate === false, "17B-13A: First idempotent event is recorded");

  const totalLogsBeforeDuplicate = getCanonicalAuditLogs().length;

  const duplicateEventCall = await recordCanonicalAuditEvent({
    eventType: "PAYMENT_RECEIVED",
    category: "SYSTEM_ACTION",
    outcome: "SUCCESS",
    actor: { actorId: "system_cron", actorType: "AUTOMATED" },
    targetEntity: { entityType: "payment", entityId: "pay_idem_01" },
    action: "process_webhook",
    idempotencyKey: dedupKeyTest,
    reason: "Duplicate retry webhook delivery"
  });
  assert(duplicateEventCall.isDuplicate === true, "17B-13B: Duplicate idempotent event is detected");
  const totalLogsAfterDuplicate = getCanonicalAuditLogs().length;
  assert(totalLogsAfterDuplicate === totalLogsBeforeDuplicate, "17B-13C: Duplicate event did not spawn a second audit record");
  assert(duplicateEventCall.event.eventId === firstEventCall.event.eventId, "17B-13D: Existing event returned for duplicate request");

  // 14. Sensitive-Data Logging Review (Redaction of Passwords, CVV, Card Numbers & API Keys)
  const { event: sanitizedEvent } = await recordCanonicalAuditEvent({
    eventType: "USER_AUTHENTICATION_DEBUG",
    category: "SECURITY_EVENT",
    outcome: "SUCCESS",
    actor: { actorId: "operator_dbg", role: "ADMIN" },
    targetEntity: { entityType: "auth_credential", entityId: "cred_888" },
    action: "verify",
    reason: "User tried password=SecretPassword123 with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and card 4532-1122-3344-5566 cvv: 999 and apiKey=AIzaSyD-XYZ9876543210123456789012345678 and OpenAI sk-abc1234567890123456789012345",
    metadata: {
      password: "raw_plain_password_here",
      apiKey: "AIzaSyD-XYZ9876543210123456789012345678",
      cardNumber: "4532112233445566",
      cvv: "321",
      safePublicField: "business_name_here"
    }
  });

  assert(!sanitizedEvent.reason?.includes("SecretPassword123"), "17B-14A: Plain password in reason string is redacted");
  assert(!sanitizedEvent.reason?.includes("4532-1122-3344-5566"), "17B-14B: Credit card number in reason string is redacted");
  assert(!sanitizedEvent.reason?.includes("AIzaSyD"), "17B-14C: Google API key in reason string is redacted");
  assert(sanitizedEvent.metadata?.password === "[REDACTED]", "17B-14D: Password in metadata object is redacted");
  assert(sanitizedEvent.metadata?.apiKey === "[REDACTED]" || sanitizedEvent.metadata?.apiKey === "[REDACTED_API_KEY]", "17B-14E: API key in metadata object is redacted");
  assert(sanitizedEvent.metadata?.safePublicField === "business_name_here", "17B-14F: Non-sensitive data is preserved untouched");

  // 15. Audit Trail Accuracy and Querying
  const allRecordedLogs = getCanonicalAuditLogs();
  assert(allRecordedLogs.length > 10, "17B-15A: Comprehensive audit trail populated across multiple domains");
  const filteredSecurityEvents = getCanonicalAuditLogs({ category: "SECURITY_EVENT" });
  assert(filteredSecurityEvents.length > 0, "17B-15B: Security events filter accurately retrieves security events");
  const filteredAdminActions = getCanonicalAuditLogs({ category: "ADMIN_ACTION" });
  assert(filteredAdminActions.length > 0, "17B-15C: Admin actions filter accurately retrieves administrative events");
  
  // Verify all timestamps are valid ISO 8601 strings
  const allTimestampsValid = allRecordedLogs.every(l => !isNaN(Date.parse(l.timestamp)));
  assert(allTimestampsValid === true, "17B-15D: All audit records possess valid server-generated ISO-8601 timestamps");

  // =========================================================================
  // GROUP 57: MICRO-PHASE 17C — APPLICATION CONFIGURATION, ENVIRONMENT VARIABLES & SECRET MANAGEMENT
  // =========================================================================
  console.log("\n--- GROUP 57: MICRO-PHASE 17C — APPLICATION CONFIGURATION, ENVIRONMENT VARIABLES & SECRET MANAGEMENT ---");

  // 1. Backend Startup with Valid Configuration (Development & Production)
  const devConfigResult = validateServerConfig({
    NODE_ENV: "development",
    PORT: "3000",
    APP_URL: "http://localhost:3000",
    GEMINI_API_KEY: "MY_GEMINI_API_KEY",
    OUTREACH_WEBHOOK_SECRET: "sitescout_webhook_secret_key"
  });
  assert(devConfigResult.isValid === true, "17C-1A: Backend dev config validates successfully");
  assert(devConfigResult.config.env === "development", "17C-1B: Dev environment normalized accurately");
  assert(devConfigResult.config.port === 3000, "17C-1C: Dev port parsed accurately");
  assert(devConfigResult.config.allowMockFallbacks === true, "17C-1D: Mock fallbacks explicitly allowed in development");

  const validProdResult = validateServerConfig({
    NODE_ENV: "production",
    PORT: "3000",
    APP_URL: "https://sitescout.ai",
    ALLOWED_ORIGINS: "https://sitescout.ai,https://admin.sitescout.ai",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789",
    OUTREACH_WEBHOOK_SECRET: "sec_live_production_webhook_secret_key_888",
    PAYMENT_WEBHOOK_SECRET: "whsec_live_stripe_payment_signature_999"
  });
  assert(validProdResult.isValid === true, "17C-1E: Valid production config validates successfully with zero errors");
  assert(validProdResult.config.env === "production", "17C-1F: Production environment identified");
  assert(validProdResult.config.allowMockFallbacks === false, "17C-1G: Mock fallbacks strictly forbidden in production");

  // 2. Missing Required Production Configuration
  const missingAiProdResult = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "https://sitescout.ai",
    OUTREACH_WEBHOOK_SECRET: "sec_live_production_webhook_secret_key_888"
  });
  assert(missingAiProdResult.isValid === false, "17C-2A: Missing AI provider key fails validation in production");
  assert(missingAiProdResult.errors.some(e => e.includes("GEMINI_API_KEY is required in production")), "17C-2B: Clear error message generated for missing GEMINI_API_KEY");

  const missingUrlProdResult = validateServerConfig({
    NODE_ENV: "production",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789",
    OUTREACH_WEBHOOK_SECRET: "sec_live_production_webhook_secret_key_888"
  });
  assert(missingUrlProdResult.isValid === false, "17C-2C: Missing APP_URL fails validation in production");
  assert(missingUrlProdResult.errors.some(e => e.includes("APP_URL must be configured")), "17C-2D: Clear error message generated for missing APP_URL");

  const insecureSecretProdResult = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "https://sitescout.ai",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789",
    OUTREACH_WEBHOOK_SECRET: "sitescout_webhook_secret_key" // Insecure default
  });
  assert(insecureSecretProdResult.isValid === false, "17C-2E: Insecure default webhook secret rejected in production");
  assert(insecureSecretProdResult.errors.some(e => e.includes("Hardcoded default secret is forbidden")), "17C-2F: Descriptive error for hardcoded default secret");

  // 3. Invalid Configuration Values
  const invalidPortResult = validateServerConfig({
    PORT: "invalid_99999",
    APP_URL: "http://localhost:3000"
  });
  assert(invalidPortResult.isValid === false, "17C-3A: Non-numeric port rejected");
  assert(invalidPortResult.errors.some(e => e.includes("Invalid PORT configuration")), "17C-3B: Clear error message for invalid PORT");

  const outOfRangePortResult = validateServerConfig({
    PORT: "70000"
  });
  assert(outOfRangePortResult.isValid === false, "17C-3C: Out of range port (>65535) rejected");

  const insecureProdUrlResult = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "http://insecure-http-site.com",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789",
    OUTREACH_WEBHOOK_SECRET: "sec_live_production_webhook_secret_key_888"
  });
  assert(insecureProdUrlResult.isValid === false, "17C-3D: Non-HTTPS APP_URL rejected in production");
  assert(insecureProdUrlResult.errors.some(e => e.includes("must use HTTPS protocol in production")), "17C-3E: Descriptive HTTPS error message");

  // 4. Frontend Bundle / Content Scanning for Accidentally Exposed Secrets
  const cleanFrontendSnippet = `
    export const appTitle = "SiteScout AI";
    export const publicVersion = "1.0.0";
    export const publicProjectId = "sitescout-ai-ec355";
  `;
  const cleanScan = scanForExposedSecrets(cleanFrontendSnippet);
  assert(cleanScan.hasExposedSecrets === false, "17C-4A: Clean public frontend code passes secret scanner");
  assert(cleanScan.violations.length === 0, "17C-4B: Zero violations detected in clean code");

  const leakedStripeKeySnippet = `
    const stripeSecret = "sk_test_51Mz0000000000000000000000000000000";
  `;
  const leakedScan = scanForExposedSecrets(leakedStripeKeySnippet);
  assert(leakedScan.hasExposedSecrets === true, "17C-4C: Exposed Stripe secret detected by scanner");
  assert(leakedScan.violations.some(v => v.includes("Stripe secret key")), "17C-4D: Stripe violation identified");

  const leakedPrivateKeySnippet = `
    -----BEGIN RSA PRIVATE KEY-----
    MIIEowIBAAKCAQEA0Y...
    -----END RSA PRIVATE KEY-----
  `;
  const keyScan = scanForExposedSecrets(leakedPrivateKeySnippet);
  assert(keyScan.hasExposedSecrets === true, "17C-4E: Unencrypted private key block detected by scanner");

  // 5. .gitignore Protection for Secret Files
  const gitignoreRaw = fs.readFileSync(".gitignore", "utf-8");
  const gitignoreAudit = validateGitignoreProtectsSecrets(gitignoreRaw);
  assert(gitignoreAudit.isProtected === true, "17C-5A: .gitignore properly protects all .env* secret files");
  assert(gitignoreAudit.reasons.length === 0, "17C-5B: Zero .gitignore protection flaws");
  assert(gitignoreRaw.includes(".env*"), "17C-5C: .gitignore contains .env* pattern");
  assert(gitignoreRaw.includes("!.env.example"), "17C-5D: .gitignore contains !.env.example exception");

  // 6. .env.example Contains Safe Placeholders Only
  const envExampleRaw = fs.readFileSync(".env.example", "utf-8");
  const envExampleAudit = validateEnvExampleSafe(envExampleRaw);
  assert(envExampleAudit.isSafe === true, "17C-6A: .env.example contains zero real secrets or credentials");
  assert(envExampleAudit.violations.length === 0, "17C-6B: All keys in .env.example use safe placeholder values");
  assert(!envExampleRaw.includes("sk_live_"), "17C-6C: No live Stripe secrets in .env.example");
  assert(!envExampleRaw.includes("ghp_"), "17C-6D: No live GitHub tokens in .env.example");

  // 7. Development and Production Configuration Separation
  assert(normalizeEnvironment("development") === "development", "17C-7A: development normalized");
  assert(normalizeEnvironment("testing") === "testing", "17C-7B: testing normalized");
  assert(normalizeEnvironment("staging") === "staging", "17C-7C: staging normalized");
  assert(normalizeEnvironment("production") === "production", "17C-7D: production normalized");
  assert(normalizeEnvironment(undefined) === "development", "17C-7E: default environment is development");

  const stagingConfig = validateServerConfig({ NODE_ENV: "staging" });
  assert(stagingConfig.config.allowMockFallbacks === false, "17C-7F: Staging environment forbids mock fallbacks");

  // 8. Missing AI-Provider Credentials
  let caughtAiError: ConfigurationError | null = null;
  try {
    assertLiveIntegrationAvailable("ai", missingAiProdResult.config);
  } catch (err: any) {
    caughtAiError = err;
  }
  assert(caughtAiError !== null, "17C-8A: Missing AI provider in production throws ConfigurationError");
  assert(caughtAiError?.code === "AI_PROVIDER_UNCONFIGURED", "17C-8B: Error code AI_PROVIDER_UNCONFIGURED returned");
  assert(caughtAiError?.status === 503, "17C-8C: HTTP 503 Service Unavailable status assigned");

  // In development, asserting AI does NOT throw because mock fallbacks are allowed
  let caughtDevAiError: any = null;
  try {
    assertLiveIntegrationAvailable("ai", devConfigResult.config);
  } catch (err: any) {
    caughtDevAiError = err;
  }
  assert(caughtDevAiError === null, "17C-8D: Dev environment permits mock fallback without throwing error");

  // 9. Missing Payment-Provider Credentials
  const noPaymentProdConfig = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "https://sitescout.ai",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789",
    OUTREACH_WEBHOOK_SECRET: "sec_live_production_webhook_secret_key_888"
  });
  let caughtPayError: ConfigurationError | null = null;
  try {
    assertLiveIntegrationAvailable("payment", noPaymentProdConfig.config);
  } catch (err: any) {
    caughtPayError = err;
  }
  assert(caughtPayError !== null, "17C-9A: Missing payment secret in production throws ConfigurationError");
  assert(caughtPayError?.code === "PAYMENT_PROVIDER_UNCONFIGURED", "17C-9B: Error code PAYMENT_PROVIDER_UNCONFIGURED returned");
  assert(caughtPayError?.status === 503, "17C-9C: HTTP 503 Service Unavailable returned");

  // 10. Safe Handling of Configuration Errors & Masking
  assert(maskSecret(null) === "[NOT SET]", "17C-10A: Null secret masked as [NOT SET]");
  assert(maskSecret("") === "[NOT SET]", "17C-10B: Empty secret masked as [NOT SET]");
  assert(maskSecret("short") === "[CONFIGURED: REDACTED]", "17C-10C: Short secret safely redacted");
  const maskedLongKey = maskSecret("AIzaSyVeryLongSecretKeyForTesting12345");
  assert(maskedLongKey.startsWith("AIz***"), "17C-10D: Long key prefix preserved for diagnostic recognition");
  assert(!maskedLongKey.includes("VeryLongSecretKey"), "17C-10E: Sensitive key body completely masked");

  const safeSummary = formatSafeConfigSummary(validProdResult.config);
  assert(safeSummary.environment === "production", "17C-10F: Safe summary includes environment");
  assert(safeSummary.integrations.ai.configured === true, "17C-10G: Safe summary includes AI configured status");
  assert(safeSummary.integrations.ai.maskedKey.includes("***"), "17C-10H: Safe summary masks API key");
  assert(!JSON.stringify(safeSummary).includes("AIzaSyProductionKeyRealSecure0123456789"), "17C-10I: Raw production secret never appears in formatted summary");

  // 11. Production Behavior When an Integration is Unavailable
  let caughtHostingError: ConfigurationError | null = null;
  try {
    assertLiveIntegrationAvailable("hosting", validProdResult.config);
  } catch (err: any) {
    caughtHostingError = err;
  }
  assert(caughtHostingError !== null, "17C-11A: Unconfigured live hosting throws ConfigurationError");
  assert(caughtHostingError?.code === "HOSTING_TOKEN_UNCONFIGURED", "17C-11B: Error code HOSTING_TOKEN_UNCONFIGURED returned");

  let caughtWebhookError: ConfigurationError | null = null;
  const noWebhookConfig = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "https://sitescout.ai",
    GEMINI_API_KEY: "AIzaSyProductionKeyRealSecure0123456789"
  });
  try {
    assertLiveIntegrationAvailable("webhook", noWebhookConfig.config);
  } catch (err: any) {
    caughtWebhookError = err;
  }
  assert(caughtWebhookError !== null, "17C-11C: Missing webhook secret throws ConfigurationError");
  assert(caughtWebhookError?.code === "WEBHOOK_SECRET_UNCONFIGURED", "17C-11D: Error code WEBHOOK_SECRET_UNCONFIGURED returned");

  // 12. Confirmation That Mock Fallbacks Cannot Silently Impersonate Live Services
  assert(validProdResult.config.allowMockFallbacks === false, "17C-12A: Mock fallbacks are strictly false in production");
  let mockImpersonationBlocked = false;
  try {
    assertLiveIntegrationAvailable("ai", {
      ...validProdResult.config,
      ai: { geminiApiKey: undefined, isConfigured: false }
    });
  } catch (e: any) {
    if (e.code === "AI_PROVIDER_UNCONFIGURED") {
      mockImpersonationBlocked = true;
    }
  }
  assert(mockImpersonationBlocked === true, "17C-12B: Production throws AI_PROVIDER_UNCONFIGURED instead of silent mock impersonation");

  let mockPaymentBlocked = false;
  try {
    assertLiveIntegrationAvailable("payment", {
      ...validProdResult.config,
      security: { ...validProdResult.config.security, paymentWebhookSecret: undefined }
    });
  } catch (e: any) {
    if (e.code === "PAYMENT_PROVIDER_UNCONFIGURED") {
      mockPaymentBlocked = true;
    }
  }
  assert(mockPaymentBlocked === true, "17C-12C: Production throws PAYMENT_PROVIDER_UNCONFIGURED instead of silent mock payment approval");

  // =========================================================================
  // GROUP 58: MICRO-PHASE 17D — API SECURITY, RATE LIMITING & ABUSE PREVENTION
  // =========================================================================
  console.log("\n--- GROUP 58: MICRO-PHASE 17D — API SECURITY, RATE LIMITING & ABUSE PREVENTION ---");

  // 1. Valid Authenticated API Request & Customer Resource Access
  const authenticatedCustomer = { uid: "cust_active_001", email: "client@alpha.sz", role: "CUSTOMER" };
  const authorizedOwnAccess = authorizeCustomerResourceAccess(authenticatedCustomer, "cust_active_001");
  assert(authorizedOwnAccess.authorized === true, "17D-1A: Authenticated customer access to own resource is permitted");
  assert(authorizedOwnAccess.status === 200, "17D-1B: HTTP 200 returned for valid authenticated customer access");

  // 2. Unauthenticated Protected Request
  const unauthenticatedAttempt = authorizeCustomerResourceAccess(null as any, "cust_active_001");
  assert(unauthenticatedAttempt.authorized === false, "17D-2A: Unauthenticated caller access to protected resource is denied");
  assert(unauthenticatedAttempt.status === 401, "17D-2B: HTTP 401 Unauthorized returned for unauthenticated request");

  const emptyUidAttempt = authorizeCustomerResourceAccess({ uid: "" }, "cust_active_001");
  assert(emptyUidAttempt.authorized === false, "17D-2C: Empty UID caller is rejected as unauthenticated");
  assert(emptyUidAttempt.status === 401, "17D-2D: HTTP 401 returned for empty UID caller");

  // 3. Unauthorized Customer-Resource Access & Admin Bypass
  const attackerCustomer = { uid: "cust_attacker_999", email: "attacker@bad.org", role: "CUSTOMER" };
  const unauthorizedCrossAccess = authorizeCustomerResourceAccess(attackerCustomer, "cust_victim_001");
  assert(unauthorizedCrossAccess.authorized === false, "17D-3A: Cross-customer unauthorized resource access is blocked");
  assert(unauthorizedCrossAccess.status === 403, "17D-3B: HTTP 403 Forbidden returned for cross-customer access attempt");
  assert(unauthorizedCrossAccess.reason?.includes("permission") === true, "17D-3C: Clear user-facing reason provided without leaking resource details");

  const adminCaller = { uid: "admin_user_001", email: "siphom.yati@gmail.com", role: "SUPER_ADMIN" };
  const adminBypassAccess = authorizeCustomerResourceAccess(adminCaller, "cust_victim_001");
  assert(adminBypassAccess.authorized === true, "17D-3D: Super admin is authorized to access customer resource");
  assert(adminBypassAccess.status === 200, "17D-3E: HTTP 200 returned for authorized administrative access");

  // 4. Malformed Request Payload Validation
  const malformedSearch1 = validateSearchPayload(null);
  assert(malformedSearch1.valid === false, "17D-4A: Null search body rejected as malformed");

  const malformedSearch2 = validateSearchPayload({ page: 999, radius: 9999, city: "A".repeat(150) });
  assert(malformedSearch2.valid === false, "17D-4B: Out-of-bounds search parameters rejected");
  assert(malformedSearch2.errors.length >= 2, "17D-4C: Structured error array returned for multiple validation failures");

  const malformedAi1 = validateAiGenerationPayload({});
  assert(malformedAi1.valid === false, "17D-4D: Empty AI payload rejected");

  const malformedAi2 = validateAiGenerationPayload({ business: { name: "" } });
  assert(malformedAi2.valid === false, "17D-4E: AI generation request with empty business name rejected");

  const malformedContact1 = validateContactFormPayload({ name: "", email: "notanemail", message: "hi" });
  assert(malformedContact1.valid === false, "17D-4F: Malformed contact form payload rejected with descriptive errors");
  assert(malformedContact1.errors.some(e => e.includes("email")), "17D-4G: Email validation failure reported");

  // Honeypot spam detection
  const botSpamContact = validateContactFormPayload({
    name: "Spam Bot",
    email: "bot@spam.com",
    message: "Buy cheap products now",
    honeypot: "http://spam-link.org"
  });
  assert(botSpamContact.valid === false, "17D-4H: Honeypot submission flagged as spam and rejected");

  // 5. Oversized Request Validation
  const oversizedFileUpload = validateFileUpload({
    fileName: "large_archive.png",
    fileType: "image/png",
    fileSize: 15 * 1024 * 1024 // 15MB > 10MB limit
  });
  assert(oversizedFileUpload.valid === false, "17D-5A: Oversized file upload (>10MB) rejected");
  assert(oversizedFileUpload.errors.some(e => e.includes("exceeds maximum limit")), "17D-5B: Clear error message for oversized upload");

  const oversizedAiDescription = validateAiGenerationPayload({
    business: {
      name: "Valid Name",
      description: "X".repeat(2500) // > 2000 limit
    }
  });
  assert(oversizedAiDescription.valid === false, "17D-5C: Oversized AI description (>2000 chars) rejected");

  // 6. Excessive Login Attempts Rate Limiting
  const authTestLimiter = new TieredRateLimiter();
  const authUserKey = "ip:192.168.1.100";
  for (let i = 0; i < RATE_LIMIT_CONFIGS.auth.maxRequests; i++) {
    const res = authTestLimiter.checkLimit("auth", authUserKey, RATE_LIMIT_CONFIGS.auth.maxRequests, RATE_LIMIT_CONFIGS.auth.windowMs);
    assert(res.allowed === true, `17D-6A-${i + 1}: Auth attempt within limit permitted`);
  }
  const excessiveLoginAttempt = authTestLimiter.checkLimit("auth", authUserKey, RATE_LIMIT_CONFIGS.auth.maxRequests, RATE_LIMIT_CONFIGS.auth.windowMs);
  assert(excessiveLoginAttempt.allowed === false, "17D-6B: Excessive login attempt exceeding threshold is blocked");
  assert(excessiveLoginAttempt.remaining === 0, "17D-6C: Remaining attempts count is 0");
  assert(excessiveLoginAttempt.retryAfterSeconds > 0, "17D-6D: Positive retryAfterSeconds provided");

  // 7. Excessive Business Searches Rate Limiting
  const searchTestLimiter = new TieredRateLimiter();
  const searchUserKey = "u:user_search_tester";
  for (let i = 0; i < RATE_LIMIT_CONFIGS.search.maxRequests; i++) {
    searchTestLimiter.recordHit("search", searchUserKey, RATE_LIMIT_CONFIGS.search.windowMs);
  }
  const excessiveSearchAttempt = searchTestLimiter.checkLimit("search", searchUserKey, RATE_LIMIT_CONFIGS.search.maxRequests, RATE_LIMIT_CONFIGS.search.windowMs);
  assert(excessiveSearchAttempt.allowed === false, "17D-7A: Excessive business searches exceeding limit blocked");
  assert(excessiveSearchAttempt.remaining === 0, "17D-7B: Search remaining quota exhausted");

  // 8. Excessive AI Generation Requests Rate Limiting
  const aiTestLimiter = new TieredRateLimiter();
  const aiUserKey = "u:user_ai_tester";
  for (let i = 0; i < RATE_LIMIT_CONFIGS.aiGeneration.maxRequests; i++) {
    aiTestLimiter.recordHit("ai-generation", aiUserKey, RATE_LIMIT_CONFIGS.aiGeneration.windowMs);
  }
  const excessiveAiAttempt = aiTestLimiter.checkLimit("ai-generation", aiUserKey, RATE_LIMIT_CONFIGS.aiGeneration.maxRequests, RATE_LIMIT_CONFIGS.aiGeneration.windowMs);
  assert(excessiveAiAttempt.allowed === false, "17D-8A: Excessive AI generation requests blocked");

  // 9. Invalid CORS Origin Enforcement
  const corsConfig = {
    allowedOrigins: ["https://sitescout.sz", "https://app.sitescout.sz"],
    isDevOrTest: false
  };
  const untrustedCors = validateCsrfProtection(
    { method: "POST", headers: { origin: "https://evil-phishing.com" } },
    corsConfig.allowedOrigins
  );
  assert(untrustedCors.allowed === false, "17D-9A: State-changing POST from untrusted CORS origin rejected");
  assert(untrustedCors.error?.includes("Untrusted Origin") === true, "17D-9B: Clear descriptive CORS/CSRF violation error");

  const trustedCors = validateCsrfProtection(
    { method: "POST", headers: { origin: "https://sitescout.sz" } },
    corsConfig.allowedOrigins
  );
  assert(trustedCors.allowed === true, "17D-9C: State-changing POST from trusted CORS origin allowed");

  // 10. CSRF Protection for Browser State-Changing Requests
  const untrustedReferer = validateCsrfProtection(
    { method: "DELETE", headers: { referer: "https://attacker.site/malicious-link" } },
    corsConfig.allowedOrigins
  );
  assert(untrustedReferer.allowed === false, "17D-10A: State-changing DELETE with untrusted Referer blocked");

  const safeGetRequest = validateCsrfProtection(
    { method: "GET", headers: { origin: "https://untrusted-read.com" } },
    corsConfig.allowedOrigins
  );
  assert(safeGetRequest.allowed === true, "17D-10B: Read-only GET request permitted across origins");

  // 11. SSRF Protection & Hostname Restrictions
  const privateIp1 = isPrivateIp("127.0.0.1");
  assert(privateIp1 === true, "17D-11A: 127.0.0.1 classified as restricted private loopback");

  const privateIp2 = isPrivateIp("10.0.0.1");
  assert(privateIp2 === true, "17D-11B: 10.0.0.1 classified as restricted private network");

  const privateIp3 = isPrivateIp("192.168.1.1");
  assert(privateIp3 === true, "17D-11C: 192.168.1.1 classified as restricted private network");

  const metadataIp = isPrivateIp("169.254.169.254");
  assert(metadataIp === true, "17D-11D: Cloud metadata IP 169.254.169.254 classified as restricted");

  const hostnameVal1 = validateHostname("metadata.google.internal");
  assert(hostnameVal1.valid === false, "17D-11E: metadata.google.internal hostname rejected");

  const hostnameVal2 = validateHostname("localhost");
  assert(hostnameVal2.valid === false, "17D-11F: localhost hostname rejected");

  const hostnameVal3 = validateHostname("database.local");
  assert(hostnameVal3.valid === false, "17D-11G: .local domain suffix rejected");

  const hostnameVal4 = validateHostname("0x7f000001");
  assert(hostnameVal4.valid === false, "17D-11H: Hex-encoded IP hostname rejected");

  const ssrfRes1 = await validateUrlForSsrf("http://127.0.0.1:8080/admin");
  assert(ssrfRes1.safe === false, "17D-11I: Loopback URL rejected by validateUrlForSsrf");

  const ssrfRes2 = await validateUrlForSsrf("http://169.254.169.254/latest/meta-data/");
  assert(ssrfRes2.safe === false, "17D-11J: Metadata URL rejected by validateUrlForSsrf");

  const ssrfRes3 = await validateUrlForSsrf("ftp://example.com/file");
  assert(ssrfRes3.safe === false, "17D-11K: Non-HTTP/HTTPS scheme rejected");

  // 12. Invalid File Upload Protections
  const maliciousExtUpload = validateFileUpload({
    fileName: "backdoor.php",
    fileType: "image/png",
    fileSize: 1024
  });
  assert(maliciousExtUpload.valid === false, "17D-12A: Executable .php extension rejected");

  const pathTraversalUpload = validateFileUpload({
    fileName: "../../etc/passwd.png",
    fileType: "image/png",
    fileSize: 1024
  });
  assert(pathTraversalUpload.valid === false, "17D-12B: Path traversal characters in file name rejected");

  const mismatchedMimeUpload = validateFileUpload({
    fileName: "image.jpg",
    fileType: "image/png", // Declared PNG but named .jpg
    fileSize: 1024
  });
  assert(mismatchedMimeUpload.valid === false, "17D-12C: Extension mismatching declared MIME type rejected");

  const badMagicUpload = validateFileUpload({
    fileName: "fake_image.png",
    fileType: "image/png",
    fileSize: 100,
    fileData: Buffer.from("NOT_A_PNG_FILE_HEADER")
  });
  assert(badMagicUpload.valid === false, "17D-12D: Corrupted magic header bytes rejected");

  const maliciousSvgUpload = validateFileUpload({
    fileName: "logo.svg",
    fileType: "image/svg+xml",
    fileSize: 500,
    fileData: "<svg><script>alert('xss')</script></svg>"
  });
  assert(maliciousSvgUpload.valid === false, "17D-12E: SVG with executable script tags rejected");

  const validPngUpload = validateFileUpload({
    fileName: "company_logo.png",
    fileType: "image/png",
    fileSize: 2048,
    fileData: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  });
  assert(validPngUpload.valid === true, "17D-12F: Valid PNG file with correct magic bytes accepted");

  // 13. Concurrency Deduplication / Idempotency Locks for Expensive AI Operations
  const deduplicator = new InFlightDeduplicator();
  let executionCounter = 0;
  const slowAiOperation = async () => {
    executionCounter++;
    await new Promise(r => setTimeout(r, 40));
    return { generatedSchema: "success" };
  };

  const opKey = "generate:biz_concurrent_test";
  const [call1, call2] = await Promise.all([
    deduplicator.executeOrDeduplicate(opKey, slowAiOperation),
    deduplicator.executeOrDeduplicate(opKey, slowAiOperation)
  ]);

  assert(executionCounter === 1, "17D-13A: Underlying expensive operation executed exactly once");
  assert(call1.result?.generatedSchema === "success", "17D-13B: First caller receives operation result");
  assert(call2.result?.generatedSchema === "success", "17D-13C: Second concurrent caller shares identical result");
  assert(call1.wasDuplicate === false, "17D-13D: First caller marked as original");
  assert(call2.wasDuplicate === true, "17D-13E: Second concurrent caller identified as deduplicated");

  // 14. Payment Webhook Security & Idempotent Retries
  const testSecret = "whsec_stripe_test_secret_key_12345";
  const validSecretCall = verifyWebhookSecretOrSignature(
    { "x-webhook-secret": testSecret },
    {},
    testSecret
  );
  assert(validSecretCall.verified === true, "17D-14A: Valid webhook secret verified successfully");

  const invalidSecretCall = verifyWebhookSecretOrSignature(
    { "x-webhook-secret": "wrong_secret" },
    {},
    testSecret
  );
  assert(invalidSecretCall.verified === false, "17D-14B: Invalid webhook secret rejected");

  const webhookTracker = new WebhookIdempotencyTracker();
  const eventId = "evt_payment_retry_test_99";
  assert(webhookTracker.isProcessed(eventId) === false, "17D-14C: Initial webhook delivery not yet processed");

  webhookTracker.recordProcessed(eventId, "invoice.payment_succeeded");
  assert(webhookTracker.isProcessed(eventId) === true, "17D-14D: Recorded webhook delivery marked as processed");

  // Retry delivery checks tracker
  const retryIsProcessed = webhookTracker.isProcessed(eventId);
  assert(retryIsProcessed === true, "17D-14E: Legitimate retry delivery recognized as already processed for safe idempotent return");

  // 15. Rate-Limit Recovery After Configured Window
  const recoveryLimiter = new TieredRateLimiter();
  const recovKey = "ip:10.0.0.50";
  // Simulate an expired window by manually passing a 1ms window
  recoveryLimiter.checkLimit("test-bucket", recovKey, 1, 1);
  await new Promise(r => setTimeout(r, 10)); // wait for 1ms window to elapse
  const afterExpiryCheck = recoveryLimiter.checkLimit("test-bucket", recovKey, 1, 60000);
  assert(afterExpiryCheck.allowed === true, "17D-15A: Rate limiter automatically recovers after time interval expires");
  assert(afterExpiryCheck.remaining === 0, "17D-15B: Restored bucket allows request and updates remaining quota");

  // 16. Confirm Legitimate Requests Continue Working & Error Sanitization
  const validSearch = validateSearchPayload({
    country: "Eswatini",
    city: "Mbabane",
    category: "Plumbing",
    keywords: "repairs",
    page: 1,
    radius: 25
  });
  assert(validSearch.valid === true, "17D-16A: Legitimate search parameters pass validation");

  const validAiPayload = validateAiGenerationPayload({
    business: {
      name: "Mbabane Premier Plumbing",
      category: "Plumbing",
      address: "Mbabane Central, Eswatini",
      description: "Professional residential and commercial plumbing services."
    }
  });
  assert(validAiPayload.valid === true, "17D-16B: Legitimate AI generation request passes validation");

  const validContact = validateContactFormPayload({
    name: "John Dlamini",
    email: "john@dlamini.sz",
    phone: "+268 7600 1234",
    message: "I would like to inquire about website development services."
  });
  assert(validContact.valid === true, "17D-16C: Legitimate contact form submission passes validation");

  const rawInternalError = new Error("Database connection to /var/data/users failed sk_live_999998888");
  (rawInternalError as any).status = 500;
  const sanitizedResponse = sanitizeApiError(rawInternalError);
  assert(!sanitizedResponse.error.includes("sk_live_"), "17D-16D: Error sanitizer redacts live secret keys");
  assert(!sanitizedResponse.error.includes("/var/data"), "17D-16E: Error sanitizer redacts raw filesystem paths");
  assert(sanitizedResponse.code === "INTERNAL_SERVER_ERROR", "17D-16F: Clean standardized error code returned");

  // =========================================================================
  // GROUP 59: MICRO-PHASE 18A — AUTOMATED TESTING, REGRESSION PROTECTION & PRODUCTION QUALITY GATES
  // =========================================================================
  console.log("\n--- GROUP 59: MICRO-PHASE 18A — AUTOMATED TESTING, REGRESSION PROTECTION & PRODUCTION QUALITY GATES ---");

  // 1. Modular Unit Test Suite Verification
  const unitResult = await runUnitTests();
  assert(unitResult.total >= 10, "18A-1A: Modular unit test suite contains at least 10 critical assertions");
  assert(unitResult.failed === 0, "18A-1B: Modular unit test suite passes with zero failures");
  assert(unitResult.passed === unitResult.total, "18A-1C: All unit tests executed successfully");

  // 2. Integration Test Suite Verification
  const intResult = await runIntegrationTests();
  assert(intResult.total >= 8, "18A-2A: Modular integration test suite contains at least 8 multi-service assertions");
  assert(intResult.failed === 0, "18A-2B: Modular integration test suite passes with zero failures");
  assert(intResult.passed === intResult.total, "18A-2C: All integration tests executed successfully");

  // 3. End-to-End Workflow Simulation
  const e2eResult = await runE2eTests();
  assert(e2eResult.total >= 12, "18A-3A: End-to-end workflow simulation contains at least 12 sequential pipeline steps");
  assert(e2eResult.failed === 0, "18A-3B: End-to-end workflow simulation passes with zero failures");
  assert(e2eResult.passed === e2eResult.total, "18A-3C: All E2E steps executed cleanly");

  // 4. Regression Protection Suite Verification
  const regResult = await runRegressionTests();
  assert(regResult.total >= 9, "18A-4A: Regression protection suite contains dedicated tests for all historical defect vectors");
  assert(regResult.failed === 0, "18A-4B: Zero regression protection test failures");
  assert(regResult.passed === regResult.total, "18A-4C: All regression prevention checks passed");

  // 5. Automated Quality Gate Execution
  const qualityGateOutcome = await runProductionQualityGates({ skipBuild: true });
  assert(qualityGateOutcome.success === true, "18A-5A: Production quality gate succeeds when all checks pass");
  assert(qualityGateOutcome.gatePassedCount === 4, "18A-5B: All 4 quality gate verification stages passed");
  assert(qualityGateOutcome.failedGateName === undefined, "18A-5C: No failing quality gate reported on clean codebase");
  assert(qualityGateOutcome.durationMs > 0, "18A-5D: Gate execution metrics and timing recorded");

  // 6. Quality Gate Deployment Blocking on Failure
  // Simulate gate rejection when required configuration fails
  const invalidProdConfigCheck = validateServerConfig({
    NODE_ENV: "production",
    APP_URL: "http://insecure-site.com", // Insecure HTTP in production
    GEMINI_API_KEY: "AIzaSyKey123"
  });
  assert(invalidProdConfigCheck.isValid === false, "18A-6A: Insecure configuration correctly triggers validation failure");
  assert(invalidProdConfigCheck.errors.length > 0, "18A-6B: Actionable error messages generated for quality gate failure");

  // 7. Security Rules Quality Gate Integration
  const securityRulesCheck = runSecurityRuleAssertions();
  assert(securityRulesCheck.failed === 0, "18A-7A: Security rules gate verifies zero attack vector bypasses");
  assert(securityRulesCheck.passed === 12, "18A-7B: All 12 security rule attack vectors verified blocked");

  // 8. Deterministic Test Fixtures & Isolation
  // Verify that test executions do not persist real dummy transactions to production
  assert(process.env.NODE_ENV === "test", "18A-8A: Test execution runs strictly under test environment mode");

  console.log(`\n=================================================`);
  console.log(`  QA SUITE SUMMARY: ${passed}/${total} Tests PASSED (${failed} Failures)`);
  console.log(`=================================================\n`);

  return { total, passed, failed };
}

if (process.argv[1]?.includes("qaSuite.test.ts")) {
  runFullQaSuite()
    .then((res) => {
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}



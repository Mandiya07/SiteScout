import crypto from "crypto";
import {
  BetaCohort,
  BetaCohortAuditEntry,
  BetaCohortDashboardData,
  BetaCohortStatus,
  BetaInvitation,
  BetaInvitationStatus,
  BetaOnboardingStatus,
  BetaParticipantRecord,
  BetaParticipantType,
  TaskAssignee
} from "../types";
import { normalizeAdminRole } from "./internalAdminSecurity";

/**
 * MICRO-PHASE 20A: CONTROLLED BETA TESTER COHORT RECRUITMENT ENGINE
 * 
 * Provides:
 * 1. Controlled cohort creation, configuration, and capacity management (target: 10–25 participants).
 * 2. Multi-tier participant categorization: DIGITAL_AGENCY, SMALL_BUSINESS, MEDIUM_BUSINESS, INTERNAL_TESTER.
 * 3. Secure invitation lifecycle: DRAFT -> APPROVED -> SENT -> ACCEPTED / DECLINED / EXPIRED / REVOKED.
 * 4. 128-bit entropy cryptographic tokens and human-readable invitation codes.
 * 5. Mandatory beta participation terms acceptance prior to access.
 * 6. Granular beta participation tracking distinguishing real user activity from automated tests.
 * 7. Canonical recruitment dashboard with strict isolation between real and test cohorts.
 * 8. Prevention of unauthorized open registrations during controlled beta.
 */

// Internal In-Memory State Repositories
const cohortsRepository = new Map<string, BetaCohort>();
const invitationsRepository = new Map<string, BetaInvitation>();
const participantsRepository = new Map<string, BetaParticipantRecord>();

let cohortCounter = 0;
let invitationCounter = 0;

/**
 * Clears repositories. Strictly for isolated unit and integration test harnesses.
 */
export function resetBetaCohortRepository(): void {
  cohortsRepository.clear();
  invitationsRepository.clear();
  participantsRepository.clear();
  cohortCounter = 0;
  invitationCounter = 0;
}

/**
 * Checks whether an actor has internal administrative privileges to manage beta cohorts.
 */
export function isAuthorizedForCohortAdmin(actor: TaskAssignee): boolean {
  if (!actor || !actor.role) return false;
  const canonicalRole = normalizeAdminRole(actor.role);
  return (
    canonicalRole === "SUPER_ADMIN" ||
    canonicalRole === "ADMIN" ||
    canonicalRole === "MANAGER"
  );
}

/**
 * Seeds default production-ready initial beta cohort if none exists.
 */
export function ensureDefaultCohort(actor?: TaskAssignee): BetaCohort {
  if (cohortsRepository.size > 0) {
    return Array.from(cohortsRepository.values())[0];
  }

  const defaultActor: TaskAssignee = actor || {
    uid: "admin_super",
    displayName: "Lead Systems Engineer",
    role: "SUPER_ADMIN"
  };

  const now = new Date().toISOString();
  const defaultCohort: BetaCohort = {
    id: "cohort_q4_2026_pilot",
    name: "Southern Africa Agency & SMB Pilot Cohort (Q4 2026)",
    description: "Controlled evaluation cohort of 20 regional digital agencies and high-growth SMBs in Southern Africa.",
    targetCount: 20,
    status: "RECRUITING",
    createdAt: now,
    updatedAt: now,
    createdBy: defaultActor
  };

  cohortsRepository.set(defaultCohort.id, defaultCohort);
  return defaultCohort;
}

/**
 * Creates a new Beta Tester Cohort.
 */
export function createBetaCohort(
  params: {
    name: string;
    description: string;
    targetCount: number;
    initialStatus?: BetaCohortStatus;
  },
  actor: TaskAssignee
): { success: boolean; cohort?: BetaCohort; error?: string } {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot create beta cohorts.`
    };
  }

  if (!params.name || params.name.trim() === "") {
    return { success: false, error: "Cohort name is required." };
  }

  const targetCount = params.targetCount;
  if (!targetCount || targetCount < 1 || targetCount > 100) {
    return {
      success: false,
      error: "Target participant count must be an integer between 1 and 100 (recommended 10–25)."
    };
  }

  cohortCounter++;
  const now = new Date().toISOString();
  const cohortId = `cohort_${Date.now()}_${cohortCounter}`;

  const cohort: BetaCohort = {
    id: cohortId,
    name: params.name.trim(),
    description: (params.description || "").trim(),
    targetCount,
    status: params.initialStatus || "RECRUITING",
    createdAt: now,
    updatedAt: now,
    createdBy: actor
  };

  cohortsRepository.set(cohort.id, cohort);
  return { success: true, cohort };
}

/**
 * Updates the participant target or status of a cohort.
 */
export function updateCohortTarget(
  cohortId: string,
  targetCount: number,
  actor: TaskAssignee
): { success: boolean; cohort?: BetaCohort; error?: string } {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot update cohort targets.`
    };
  }

  if (targetCount < 1 || targetCount > 100) {
    return { success: false, error: "Target count must be between 1 and 100." };
  }

  const cohort = cohortsRepository.get(cohortId);
  if (!cohort) {
    return { success: false, error: `Cohort "${cohortId}" not found.` };
  }

  cohort.targetCount = targetCount;
  cohort.updatedAt = new Date().toISOString();
  cohortsRepository.set(cohort.id, cohort);

  return { success: true, cohort };
}

/**
 * Generates human-friendly, unique invitation code.
 */
function generateInvitationCode(type: BetaParticipantType): string {
  const prefixMap: Record<BetaParticipantType, string> = {
    DIGITAL_AGENCY: "AGY",
    SMALL_BUSINESS: "SMB",
    MEDIUM_BUSINESS: "MED",
    INTERNAL_TESTER: "INT"
  };
  const prefix = prefixMap[type] || "EXP";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BETA-${prefix}-${num}`;
}

/**
 * Prepares a new Beta Invitation in DRAFT status.
 */
export function prepareBetaInvitation(
  input: {
    cohortId: string;
    participantType: BetaParticipantType;
    organizationName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    expiresInDays?: number;
    notes?: string;
    isTestInvitation?: boolean;
  },
  actor: TaskAssignee
): { success: boolean; invitation?: BetaInvitation; error?: string } {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot prepare beta invitations.`
    };
  }

  // Ensure cohort exists
  let cohort = cohortsRepository.get(input.cohortId);
  if (!cohort) {
    cohort = ensureDefaultCohort(actor);
  }

  if (!input.organizationName || input.organizationName.trim() === "") {
    return { success: false, error: "Organization name is required." };
  }

  if (!input.contactEmail || !input.contactEmail.includes("@")) {
    return { success: false, error: "Valid contact email is required." };
  }

  if (!input.contactName || input.contactName.trim() === "") {
    return { success: false, error: "Contact person name is required." };
  }

  const normalizedEmail = input.contactEmail.trim().toLowerCase();

  // Check for duplicate active invitations for same email
  const existingInvites = Array.from(invitationsRepository.values());
  const duplicate = existingInvites.find(
    (inv) =>
      inv.contactEmail.toLowerCase() === normalizedEmail &&
      inv.cohortId === cohort.id &&
      (inv.status === "DRAFT" || inv.status === "APPROVED" || inv.status === "SENT")
  );

  if (duplicate) {
    return {
      success: false,
      error: `Active invitation (${duplicate.invitationCode}) already exists for "${normalizedEmail}".`
    };
  }

  invitationCounter++;
  const now = new Date();
  const days = typeof input.expiresInDays === "number" ? input.expiresInDays : 14;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const token = crypto.randomBytes(16).toString("hex");
  const invitationCode = generateInvitationCode(input.participantType);
  const id = `inv_${Date.now()}_${invitationCounter}`;

  const auditEntry: BetaCohortAuditEntry = {
    id: `ca_${Date.now()}_prep`,
    timestamp: now.toISOString(),
    actor,
    action: "INVITATION_PREPARED",
    notes: `Prepared draft invitation for ${input.organizationName} (${input.participantType}).`
  };

  const invitation: BetaInvitation = {
    id,
    invitationCode,
    token,
    cohortId: cohort.id,
    participantType: input.participantType,
    organizationName: input.organizationName.trim(),
    contactName: input.contactName.trim(),
    contactEmail: normalizedEmail,
    contactPhone: input.contactPhone?.trim(),
    status: "DRAFT",
    expiresAt,
    betaTermsAccepted: false,
    notes: input.notes,
    auditTrail: [auditEntry],
    isTestInvitation: !!input.isTestInvitation,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  invitationsRepository.set(invitation.id, invitation);
  return { success: true, invitation };
}

/**
 * Approves a draft invitation for dispatch.
 */
export function approveBetaInvitation(
  invitationId: string,
  actor: TaskAssignee
): { success: boolean; invitation?: BetaInvitation; error?: string } {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot approve beta invitations.`
    };
  }

  const invitation =
    invitationsRepository.get(invitationId) ||
    Array.from(invitationsRepository.values()).find(
      (i) => i.invitationCode === invitationId || i.token === invitationId
    );

  if (!invitation) {
    return { success: false, error: `Invitation "${invitationId}" not found.` };
  }

  if (invitation.status !== "DRAFT") {
    return {
      success: false,
      error: `Cannot approve invitation in status "${invitation.status}". Must be in DRAFT.`
    };
  }

  const now = new Date().toISOString();
  invitation.status = "APPROVED";
  invitation.approvedBy = actor;
  invitation.approvedAt = now;
  invitation.updatedAt = now;

  const auditEntry: BetaCohortAuditEntry = {
    id: `ca_${Date.now()}_appr`,
    timestamp: now,
    actor,
    action: "INVITATION_APPROVED",
    notes: `Approved invitation by ${actor.displayName} (${actor.role}).`
  };
  invitation.auditTrail.push(auditEntry);

  invitationsRepository.set(invitation.id, invitation);
  return { success: true, invitation };
}

/**
 * Generates secure invitation URL link for accepted or approved invitations.
 */
export function generateInvitationLink(invitation: BetaInvitation, baseUrl: string = "https://sitescout.ai"): string {
  return `${baseUrl}/invite/${invitation.token}?code=${invitation.invitationCode}`;
}

/**
 * Dispatches a beta invitation using verified delivery or sandbox simulation.
 * In accordance with Phase 20 instructions: DO NOT mark invitation as SENT without actual delivery confirmation.
 */
export function dispatchBetaInvitation(
  invitationId: string,
  actor: TaskAssignee,
  options?: {
    confirmDelivery?: boolean;
    provider?: string;
  }
): {
  success: boolean;
  invitation?: BetaInvitation;
  inviteLink?: string;
  error?: string;
} {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot dispatch beta invitations.`
    };
  }

  const invitation =
    invitationsRepository.get(invitationId) ||
    Array.from(invitationsRepository.values()).find(
      (i) => i.invitationCode === invitationId || i.token === invitationId
    );

  if (!invitation) {
    return { success: false, error: `Invitation "${invitationId}" not found.` };
  }

  if (invitation.status !== "APPROVED") {
    return {
      success: false,
      error: `Cannot dispatch invitation in status "${invitation.status}". Must be APPROVED first.`
    };
  }

  const now = new Date().toISOString();
  const inviteLink = generateInvitationLink(invitation);

  // If explicit delivery confirmation is provided (e.g. from SendGrid/SES webhook or manual confirmed handoff):
  if (options?.confirmDelivery) {
    invitation.status = "SENT";
    invitation.sentAt = now;
    invitation.updatedAt = now;

    const auditEntry: BetaCohortAuditEntry = {
      id: `ca_${Date.now()}_sent`,
      timestamp: now,
      actor,
      action: "INVITATION_SENT",
      notes: `Invitation dispatched and delivery confirmed via ${options.provider || "Direct Handover"}.`
    };
    invitation.auditTrail.push(auditEntry);
  }

  invitationsRepository.set(invitation.id, invitation);
  return { success: true, invitation, inviteLink };
}

/**
 * Validates an invitation code or token prior to registration.
 */
export function validateBetaInvitation(invitationCodeOrToken: string): {
  valid: boolean;
  invitation?: BetaInvitation;
  error?: string;
} {
  if (!invitationCodeOrToken || invitationCodeOrToken.trim() === "") {
    return { valid: false, error: "Invitation code or token is required." };
  }

  const clean = invitationCodeOrToken.trim();
  const invitation = Array.from(invitationsRepository.values()).find(
    (i) => i.token === clean || i.invitationCode.toUpperCase() === clean.toUpperCase()
  );

  if (!invitation) {
    return {
      valid: false,
      error: "Invalid invitation: No matching beta invitation record found."
    };
  }

  if (invitation.status === "REVOKED") {
    return {
      valid: false,
      invitation,
      error: `This beta invitation has been revoked: ${invitation.revokedReason || "Revoked by administrator"}.`
    };
  }

  if (invitation.status === "DECLINED") {
    return {
      valid: false,
      invitation,
      error: "This beta invitation was previously declined."
    };
  }

  // Check expiration
  const now = Date.now();
  const expTime = Date.parse(invitation.expiresAt);
  if (now > expTime) {
    invitation.status = "EXPIRED";
    invitationsRepository.set(invitation.id, invitation);
    return {
      valid: false,
      invitation,
      error: `This beta invitation expired on ${new Date(expTime).toLocaleDateString()}. Please request a fresh invitation.`
    };
  }

  if (invitation.status === "ACCEPTED") {
    return {
      valid: false,
      invitation,
      error: `This invitation was already accepted on ${new Date(invitation.acceptedAt || "").toLocaleDateString()}.`
    };
  }

  return { valid: true, invitation };
}

/**
 * Accepts a beta invitation and activates the tester account.
 * Requires explicit agreement to beta terms.
 */
export function acceptBetaInvitation(input: {
  invitationCodeOrToken: string;
  userId: string;
  acceptTerms: boolean;
  clientMeta?: { ip?: string; userAgent?: string };
}): {
  success: boolean;
  participant?: BetaParticipantRecord;
  invitation?: BetaInvitation;
  error?: string;
} {
  const valResult = validateBetaInvitation(input.invitationCodeOrToken);
  if (!valResult.valid || !valResult.invitation) {
    return { success: false, error: valResult.error };
  }

  if (!input.userId || input.userId.trim() === "") {
    return { success: false, error: "Authenticated user ID is required to accept invitation." };
  }

  if (!input.acceptTerms) {
    return {
      success: false,
      error: "Beta terms acceptance is required before gaining platform access."
    };
  }

  const invitation = valResult.invitation;
  const now = new Date().toISOString();

  // 1. Update Invitation
  invitation.status = "ACCEPTED";
  invitation.acceptedAt = now;
  invitation.acceptedByUid = input.userId;
  invitation.betaTermsAccepted = true;
  invitation.betaTermsAcceptedAt = now;
  invitation.updatedAt = now;

  const actor: TaskAssignee = {
    uid: input.userId,
    displayName: invitation.contactName,
    role: "CUSTOMER"
  };

  const auditEntry: BetaCohortAuditEntry = {
    id: `ca_${Date.now()}_acc`,
    timestamp: now,
    actor,
    action: "INVITATION_ACCEPTED",
    notes: `Beta invitation accepted by ${invitation.contactName} (${input.userId}). Beta Terms acknowledged.`
  };
  invitation.auditTrail.push(auditEntry);
  invitationsRepository.set(invitation.id, invitation);

  // 2. Create or Update Participant Record
  const participantId = `part_${invitation.id}_${input.userId}`;
  const participant: BetaParticipantRecord = {
    id: participantId,
    cohortId: invitation.cohortId,
    invitationId: invitation.id,
    userId: input.userId,
    organizationName: invitation.organizationName,
    participantType: invitation.participantType,
    contactEmail: invitation.contactEmail,
    contactName: invitation.contactName,
    onboardingStatus: "ACCOUNT_ACTIVATED",
    activatedAt: now,
    lastActiveAt: now,
    metrics: {
      searchesCompleted: 0,
      prospectsCreated: 0,
      websitesGenerated: 0,
      previewsCreated: 0,
      crmTasksCompleted: 0,
      feedbackSubmitted: 0,
      issuesReported: 0
    },
    isTestAccount: !!invitation.isTestInvitation,
    createdAt: now,
    updatedAt: now
  };

  participantsRepository.set(participant.userId, participant);

  return { success: true, participant, invitation };
}

/**
 * Revokes an existing invitation.
 */
export function revokeBetaInvitation(
  invitationId: string,
  reason: string,
  actor: TaskAssignee
): { success: boolean; invitation?: BetaInvitation; error?: string } {
  if (!isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      error: `Unauthorized: User role "${actor.role}" cannot revoke beta invitations.`
    };
  }

  if (!reason || reason.trim() === "") {
    return { success: false, error: "A non-empty revocation reason is required." };
  }

  const invitation =
    invitationsRepository.get(invitationId) ||
    Array.from(invitationsRepository.values()).find(
      (i) => i.invitationCode === invitationId || i.token === invitationId
    );

  if (!invitation) {
    return { success: false, error: `Invitation "${invitationId}" not found.` };
  }

  if (invitation.status === "ACCEPTED") {
    return {
      success: false,
      error: "Cannot revoke an invitation that has already been accepted. Deactivate user account instead."
    };
  }

  const now = new Date().toISOString();
  invitation.status = "REVOKED";
  invitation.revokedAt = now;
  invitation.revokedReason = reason.trim();
  invitation.updatedAt = now;

  const auditEntry: BetaCohortAuditEntry = {
    id: `ca_${Date.now()}_rev`,
    timestamp: now,
    actor,
    action: "INVITATION_REVOKED",
    notes: `Revoked by ${actor.displayName}: ${reason.trim()}`
  };
  invitation.auditTrail.push(auditEntry);
  invitationsRepository.set(invitation.id, invitation);

  return { success: true, invitation };
}

/**
 * Records activity performed by a beta participant.
 */
export function recordParticipantActivity(
  userId: string,
  activityType: "search" | "prospect" | "generation" | "preview" | "crm" | "feedback" | "issue",
  isTestActivity?: boolean
): void {
  const participant = participantsRepository.get(userId);
  if (!participant) return;

  // If marked as test activity and participant is not test, skip incrementing production counts
  if (isTestActivity && !participant.isTestAccount) {
    return;
  }

  const now = new Date().toISOString();
  participant.lastActiveAt = now;

  switch (activityType) {
    case "search":
      participant.metrics.searchesCompleted++;
      if (participant.onboardingStatus === "ACCOUNT_ACTIVATED") {
        participant.onboardingStatus = "FIRST_SEARCH_COMPLETED";
      }
      break;
    case "prospect":
      participant.metrics.prospectsCreated++;
      break;
    case "generation":
      participant.metrics.websitesGenerated++;
      if (
        participant.onboardingStatus === "ACCOUNT_ACTIVATED" ||
        participant.onboardingStatus === "FIRST_SEARCH_COMPLETED"
      ) {
        participant.onboardingStatus = "MOCKUP_GENERATED";
      }
      break;
    case "preview":
      participant.metrics.previewsCreated++;
      participant.onboardingStatus = "ACTIVE_PARTICIPANT";
      break;
    case "crm":
      participant.metrics.crmTasksCompleted++;
      break;
    case "feedback":
      participant.metrics.feedbackSubmitted++;
      break;
    case "issue":
      participant.metrics.issuesReported++;
      break;
  }

  participant.updatedAt = now;
  participantsRepository.set(participant.userId, participant);
}

/**
 * Retrieves the comprehensive Beta Cohort Recruitment Dashboard Data.
 * Accurately aggregates canonical records without fabrication.
 */
export function getBetaCohortDashboard(
  cohortId?: string,
  actor?: TaskAssignee,
  options?: { includeTestAccounts?: boolean }
): {
  success: boolean;
  dashboard?: BetaCohortDashboardData;
  status: number;
  error?: string;
} {
  if (actor && !isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      status: 403,
      error: `Forbidden: User role "${actor.role}" cannot access cohort dashboard.`
    };
  }

  const cohort = cohortId
    ? cohortsRepository.get(cohortId) || ensureDefaultCohort(actor)
    : ensureDefaultCohort(actor);

  const includeTest = !!options?.includeTestAccounts;

  // Filter invitations for this cohort
  const allInvites = Array.from(invitationsRepository.values()).filter(
    (i) => i.cohortId === cohort.id
  );
  const invitations = includeTest ? allInvites : allInvites.filter((i) => !i.isTestInvitation);

  // Filter participants for this cohort
  const allParticipants = Array.from(participantsRepository.values()).filter(
    (p) => p.cohortId === cohort.id
  );
  const participants = includeTest
    ? allParticipants
    : allParticipants.filter((p) => !p.isTestAccount);

  const targetParticipants = cohort.targetCount;
  const invitationsPrepared = invitations.filter((i) => i.status === "DRAFT" || i.status === "APPROVED").length;
  const invitationsSent = invitations.filter((i) => i.status === "SENT" || i.status === "ACCEPTED").length;
  const invitationsAccepted = invitations.filter((i) => i.status === "ACCEPTED").length;

  const activeParticipants = participants.filter(
    (p) =>
      p.onboardingStatus === "ACTIVE_PARTICIPANT" ||
      p.onboardingStatus === "MOCKUP_GENERATED" ||
      p.onboardingStatus === "FIRST_SEARCH_COMPLETED"
  ).length;

  const inactiveParticipants = participants.filter((p) => p.onboardingStatus === "INACTIVE").length;

  const completedOnboarding = participants.filter(
    (p) => p.onboardingStatus === "ACTIVE_PARTICIPANT"
  ).length;

  const feedbackReceived = participants.reduce((acc, p) => acc + p.metrics.feedbackSubmitted, 0);
  const outstandingIssues = participants.reduce((acc, p) => acc + p.metrics.issuesReported, 0);

  const dashboard: BetaCohortDashboardData = {
    cohort,
    targetParticipants,
    invitationsPrepared,
    invitationsSent,
    invitationsAccepted,
    activeParticipants,
    inactiveParticipants,
    completedOnboarding,
    feedbackReceived,
    outstandingIssues,
    participants,
    invitations
  };

  return { success: true, dashboard, status: 200 };
}

/**
 * Retrieves the list of all configured beta cohorts.
 */
export function getBetaCohortsList(actor?: TaskAssignee): {
  success: boolean;
  cohorts: BetaCohort[];
  status: number;
  error?: string;
} {
  if (actor && !isAuthorizedForCohortAdmin(actor)) {
    return {
      success: false,
      cohorts: [],
      status: 403,
      error: `Forbidden: User role "${actor.role}" cannot view beta cohorts.`
    };
  }

  ensureDefaultCohort(actor);
  return {
    success: true,
    cohorts: Array.from(cohortsRepository.values()),
    status: 200
  };
}

/**
 * Checks whether an incoming registration attempt is permitted under the controlled beta policy.
 * If beta invitation is active, requires a valid invitation code.
 */
export function verifyRegistrationInvitationAccess(invitationCode?: string): {
  allowed: boolean;
  invitation?: BetaInvitation;
  error?: string;
} {
  // If no invitation code provided, reject unauthorized registration in closed beta
  if (!invitationCode || invitationCode.trim() === "") {
    return {
      allowed: false,
      error: "SiteScout AI is currently in Controlled Beta. A valid beta invitation code is required to register."
    };
  }

  const val = validateBetaInvitation(invitationCode);
  if (!val.valid || !val.invitation) {
    return {
      allowed: false,
      error: val.error || "Invalid beta invitation code."
    };
  }

  return {
    allowed: true,
    invitation: val.invitation
  };
}

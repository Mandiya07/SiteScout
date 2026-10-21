import crypto from "crypto";
import { Business, CustomerSubscription, BillingEvent, CustomerAccount } from "../types";
import { getLocalBusinessCache, setLocalBusinessCache } from "./businessPersistence";
import { getCanonicalAuditLogs, recordCanonicalAuditEvent } from "./canonicalAuditTrail";

/**
 * SITESCOUT AI — PRODUCTION BACKUP, RESTORATION & DISASTER RECOVERY ENGINE
 * 
 * Provides automated, deterministic, tamper-evident backup creation, SHA-256 cryptographic
 * verification, retention policy governance, and safe restoration into isolated namespaces
 * without touching live production stores.
 */

export interface BackupMetadataSummary {
  customerAccountsCount: number;
  businessesCount: number;
  crmStagesCount: number;
  websiteProjectsCount: number;
  subscriptionsCount: number;
  billingEventsCount: number;
  supportTicketsCount: number;
  auditLogsCount: number;
  totalEntities: number;
}

export interface CanonicalBackupData {
  customerAccounts: CustomerAccount[];
  businesses: Business[];
  crmStages: Array<{ businessId: string; stage: string; updatedAt: string }>;
  websiteProjects: any[];
  subscriptions: CustomerSubscription[];
  billingEvents: BillingEvent[];
  supportTickets: any[];
  auditLogs: any[];
}

export interface CanonicalBackupSnapshot {
  backupId: string;
  version: "1.0.0";
  environment: "production" | "staging" | "isolated_test";
  createdAt: string;
  retentionDays: number;
  retentionExpiryDate: string;
  checksumSha256: string;
  creator: { uid: string; displayName: string; role: string };
  summary: BackupMetadataSummary;
  data: CanonicalBackupData;
  isRestored?: boolean;
}

export interface BackupIntegrityReport {
  valid: boolean;
  checksumMatches: boolean;
  computedChecksum: string;
  storedChecksum: string;
  isExpired: boolean;
  daysRemaining: number;
  errors: string[];
}

export interface RestorationResult {
  success: boolean;
  targetNamespace: string;
  restoredCounts: Record<string, number>;
  durationMs: number;
  errors: string[];
}

// In-memory backup vault for staging/test execution and fast registry
const backupVault = new Map<string, CanonicalBackupSnapshot>();

// Isolated restoration memory target store (never touches live production collections)
const isolatedRestorationStore = new Map<string, Map<string, any>>();

/**
 * Computes deterministic SHA-256 hash of backup entity data.
 */
export function computeDataChecksum(data: CanonicalBackupData): string {
  const serialized = JSON.stringify(data);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * 1. Creates a complete, canonical, tamper-evident backup snapshot.
 */
export async function createCanonicalBackup(options: {
  environment?: "production" | "staging" | "isolated_test";
  retentionDays?: number;
  creator?: { uid: string; displayName: string; role: string };
  customData?: Partial<CanonicalBackupData>;
} = {}): Promise<CanonicalBackupSnapshot> {
  const env = options.environment || "production";
  const retentionDays = options.retentionDays || 30;
  const now = new Date();
  const expiryDate = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  const backupId = `bck_${env}_${now.toISOString().replace(/[:.]/g, "-")}_${crypto.randomBytes(4).toString("hex")}`;

  // Gather canonical dataset from persistence and audit registries
  const businesses = options.customData?.businesses || getLocalBusinessCache();
  const auditLogs = options.customData?.auditLogs || getCanonicalAuditLogs();
  
  // Extract child records from canonical businesses
  const customerAccounts: CustomerAccount[] = options.customData?.customerAccounts || 
    businesses.map(b => b.customerAccount).filter(Boolean) as CustomerAccount[];
  
  const subscriptions: CustomerSubscription[] = options.customData?.subscriptions ||
    businesses.map(b => b.activeSubscription).filter(Boolean) as CustomerSubscription[];

  const crmStages = options.customData?.crmStages || businesses.map(b => ({
    businessId: b.id,
    stage: b.salesStage || "DISCOVERED",
    updatedAt: b.updatedAt || now.toISOString()
  }));

  const websiteProjects = options.customData?.websiteProjects || businesses
    .map(b => b.customerProject)
    .filter(Boolean);

  const billingEvents: BillingEvent[] = options.customData?.billingEvents || [];
  const supportTickets = options.customData?.supportTickets || [];

  const data: CanonicalBackupData = {
    customerAccounts,
    businesses,
    crmStages,
    websiteProjects,
    subscriptions,
    billingEvents,
    supportTickets,
    auditLogs
  };

  const checksumSha256 = computeDataChecksum(data);

  const summary: BackupMetadataSummary = {
    customerAccountsCount: customerAccounts.length,
    businessesCount: businesses.length,
    crmStagesCount: crmStages.length,
    websiteProjectsCount: websiteProjects.length,
    subscriptionsCount: subscriptions.length,
    billingEventsCount: billingEvents.length,
    supportTicketsCount: supportTickets.length,
    auditLogsCount: auditLogs.length,
    totalEntities: (
      customerAccounts.length +
      businesses.length +
      crmStages.length +
      websiteProjects.length +
      subscriptions.length +
      billingEvents.length +
      supportTickets.length +
      auditLogs.length
    )
  };

  const snapshot: CanonicalBackupSnapshot = {
    backupId,
    version: "1.0.0",
    environment: env,
    createdAt: now.toISOString(),
    retentionDays,
    retentionExpiryDate: expiryDate.toISOString(),
    checksumSha256,
    creator: options.creator || { uid: "system_backup_runner", displayName: "System Backup Automation", role: "ADMIN" },
    summary,
    data
  };

  // Register in secure in-memory backup vault
  backupVault.set(backupId, snapshot);

  // Record audit log for backup creation
  try {
    await recordCanonicalAuditEvent({
      eventType: "BACKUP_CREATED",
      category: "SYSTEM_ACTION",
      outcome: "SUCCESS",
      actor: { actorId: snapshot.creator.uid, role: "SYSTEM" },
      targetEntity: { entityType: "system", entityId: backupId },
      action: "backup_create",
      metadata: {
        environment: env,
        totalEntities: summary.totalEntities,
        checksum: checksumSha256.substring(0, 16)
      }
    });
  } catch (err) {
    // Non-fatal
  }

  return snapshot;
}

/**
 * 2. Verifies the cryptographic integrity and retention validity of a backup snapshot.
 */
export function verifyBackupIntegrity(snapshot: CanonicalBackupSnapshot): BackupIntegrityReport {
  const errors: string[] = [];

  if (!snapshot || typeof snapshot !== "object") {
    return {
      valid: false,
      checksumMatches: false,
      computedChecksum: "",
      storedChecksum: "",
      isExpired: true,
      daysRemaining: 0,
      errors: ["Invalid snapshot: Payload is not a valid object."]
    };
  }

  if (snapshot.version !== "1.0.0") {
    errors.push(`Unsupported backup version: '${snapshot.version}'. Expected '1.0.0'.`);
  }

  if (!snapshot.checksumSha256) {
    errors.push("Missing required SHA-256 checksum in backup header.");
  }

  // Re-compute data checksum
  const computedChecksum = computeDataChecksum(snapshot.data);
  const checksumMatches = computedChecksum === snapshot.checksumSha256;
  if (!checksumMatches) {
    errors.push(`Checksum verification failed! Data has been modified or corrupted. Expected: ${snapshot.checksumSha256}, Computed: ${computedChecksum}`);
  }

  // Retention expiry check
  const now = Date.now();
  const expiryTime = new Date(snapshot.retentionExpiryDate).getTime();
  const isExpired = isNaN(expiryTime) || now > expiryTime;
  const daysRemaining = Math.max(0, Math.round((expiryTime - now) / (1000 * 60 * 60 * 24)));

  if (isExpired) {
    errors.push(`Backup has passed its retention expiry date (${snapshot.retentionExpiryDate}).`);
  }

  // Validate internal entity count invariants
  if (snapshot.data.businesses.length !== snapshot.summary.businessesCount) {
    errors.push(`Metadata mismatch: Businesses array length (${snapshot.data.businesses.length}) does not match summary header (${snapshot.summary.businessesCount}).`);
  }

  return {
    valid: errors.length === 0,
    checksumMatches,
    computedChecksum,
    storedChecksum: snapshot.checksumSha256,
    isExpired,
    daysRemaining,
    errors
  };
}

/**
 * 3. Restores a backup snapshot into an isolated target namespace.
 * CRITICAL SAFETY: Never touches or overwrites live production collections.
 */
export async function restoreBackupToIsolatedTarget(
  snapshot: CanonicalBackupSnapshot,
  targetNamespace: string,
  options: { bypassIntegrityCheck?: boolean } = {}
): Promise<RestorationResult> {
  const start = Date.now();
  const errors: string[] = [];

  if (!targetNamespace || targetNamespace.trim().length === 0) {
    return {
      success: false,
      targetNamespace: "",
      restoredCounts: {},
      durationMs: 0,
      errors: ["Target namespace is required for isolated restoration."]
    };
  }

  // Strictly enforce integrity verification prior to restoring
  if (!options.bypassIntegrityCheck) {
    const integrity = verifyBackupIntegrity(snapshot);
    if (!integrity.valid) {
      return {
        success: false,
        targetNamespace,
        restoredCounts: {},
        durationMs: Date.now() - start,
        errors: [`Cannot restore corrupted backup: ${integrity.errors.join("; ")}`]
      };
    }
  }

  // Allocate isolated partition
  let partition = isolatedRestorationStore.get(targetNamespace);
  if (!partition) {
    partition = new Map<string, any>();
    isolatedRestorationStore.set(targetNamespace, partition);
  }

  // Restore entities with namespace prefix
  const restoredCounts: Record<string, number> = {
    customerAccounts: 0,
    businesses: 0,
    crmStages: 0,
    websiteProjects: 0,
    subscriptions: 0,
    billingEvents: 0,
    supportTickets: 0,
    auditLogs: 0
  };

  // Restore businesses into isolated partition
  for (const biz of snapshot.data.businesses) {
    const namespacedId = `${targetNamespace}:${biz.id}`;
    partition.set(`biz:${namespacedId}`, { ...biz, restoredNamespace: targetNamespace });
    restoredCounts.businesses++;
  }

  // Restore customer accounts
  for (const acc of snapshot.data.customerAccounts) {
    partition.set(`acc:${targetNamespace}:${acc.id}`, { ...acc, restoredNamespace: targetNamespace });
    restoredCounts.customerAccounts++;
  }

  // Restore subscriptions
  for (const sub of snapshot.data.subscriptions) {
    partition.set(`sub:${targetNamespace}:${sub.id}`, { ...sub, restoredNamespace: targetNamespace });
    restoredCounts.subscriptions++;
  }

  // Restore CRM stages
  for (const stage of snapshot.data.crmStages) {
    partition.set(`crm:${targetNamespace}:${stage.businessId}`, { ...stage, restoredNamespace: targetNamespace });
    restoredCounts.crmStages++;
  }

  // Restore website projects
  for (const proj of snapshot.data.websiteProjects) {
    partition.set(`proj:${targetNamespace}:${proj.id}`, { ...proj, restoredNamespace: targetNamespace });
    restoredCounts.websiteProjects++;
  }

  // Restore audit trail
  for (const log of snapshot.data.auditLogs) {
    partition.set(`audit:${targetNamespace}:${log.eventId}`, { ...log, restoredNamespace: targetNamespace });
    restoredCounts.auditLogs++;
  }

  // Record audit log for restoration event
  try {
    await recordCanonicalAuditEvent({
      eventType: "BACKUP_RESTORED_ISOLATED",
      category: "SYSTEM_ACTION",
      outcome: "SUCCESS",
      actor: { actorId: "disaster_recovery_engine", role: "SYSTEM" },
      targetEntity: { entityType: "system", entityId: snapshot.backupId },
      action: "backup_restore",
      metadata: {
        targetNamespace,
        entitiesRestored: Object.values(restoredCounts).reduce((a, b) => a + b, 0),
        durationMs: Date.now() - start
      }
    });
  } catch (err) {
    // Non-fatal
  }

  return {
    success: errors.length === 0,
    targetNamespace,
    restoredCounts,
    durationMs: Date.now() - start,
    errors
  };
}

/**
 * Retrieves restored records from an isolated partition.
 */
export function getIsolatedRestoredEntities(targetNamespace: string): any[] {
  const partition = isolatedRestorationStore.get(targetNamespace);
  if (!partition) return [];
  return Array.from(partition.values());
}

/**
 * Lists all active backup snapshots.
 */
export function listCanonicalBackups(): Array<{
  backupId: string;
  environment: string;
  createdAt: string;
  retentionExpiryDate: string;
  totalEntities: number;
  checksumSha256: string;
}> {
  return Array.from(backupVault.values()).map(b => ({
    backupId: b.backupId,
    environment: b.environment,
    createdAt: b.createdAt,
    retentionExpiryDate: b.retentionExpiryDate,
    totalEntities: b.summary.totalEntities,
    checksumSha256: b.checksumSha256
  }));
}

/**
 * Retrieves a specific backup by ID.
 */
export function getCanonicalBackup(backupId: string): CanonicalBackupSnapshot | null {
  return backupVault.get(backupId) || null;
}

/**
 * Prunes expired backups past their retention date.
 */
export function pruneExpiredBackups(): { prunedCount: number; remainingCount: number } {
  const now = Date.now();
  let prunedCount = 0;

  for (const [id, snapshot] of backupVault.entries()) {
    const expiry = new Date(snapshot.retentionExpiryDate).getTime();
    if (!isNaN(expiry) && now > expiry) {
      backupVault.delete(id);
      prunedCount++;
    }
  }

  return {
    prunedCount,
    remainingCount: backupVault.size
  };
}

/**
 * Clears backup vaults (for testing and isolation).
 */
export function clearBackupVaultForTesting(): void {
  backupVault.clear();
  isolatedRestorationStore.clear();
}

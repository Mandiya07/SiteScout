# SiteScout AI — Production Deployment, Backup & Disaster Recovery Runbook

**Document Version:** 1.0.0  
**Target Environment:** Cloud Run (Node.js/Express) + Vite React SPA + Firebase Firestore / Auth  
**Effective Date:** October 2026  
**Security Classification:** Highly Confidential — Engineering & Operations  

---

## 1. Executive Summary & Recovery Objectives

This document establishes the operational procedures for production deployment, automated monitoring, scheduled backups, and disaster recovery (DR) for SiteScout AI.

### Target Recovery Metrics (SLA)
- **Recovery Point Objective (RPO):** < 1 hour (Automated snapshot backups with SHA-256 checksums).
- **Recovery Time Objective (RTO):** < 15 minutes (Container rollback & isolated restore).
- **Zero Live Overwrite Mandate:** Restorations during tests or partial recovery MUST target isolated namespaces (`isolated_restore_<timestamp>`) and verify data integrity before promoting to live stores.

---

## 2. Safe Production Deployment Workflow

Production releases follow an audited, automated 8-stage gate system:

```
[Quality Gates (5/5)]
         ↓
[Production Build (Vite + Esbuild)]
         ↓
[Staging Deployment (Isolated Preview)]
         ↓
[Staging Smoke Tests (Liveness, Readiness, Latency)]
         ↓
[Explicit Human / Admin Approval Gate]
         ↓
[Production Zero-Downtime Rollout]
         ↓
[Post-Deployment Verification]
         ↓
[COMPLETED] (or [AUTOMATED ROLLBACK] if SLA fails)
```

### Pre-Deployment Quality Checklist
1. All 5 Production Quality Gates must pass (`npm run gate:check`):
   - Gate 1: Type safety (`npx tsc --noEmit`)
   - Gate 2: Secret hygiene & configuration audit
   - Gate 3: Firestore security rules (12/12 attack vectors blocked)
   - Gate 4: 100% of Unit, Integration, E2E, Regression, and Performance test suites
   - Gate 5: Production build bundle verification (`dist/` clean)
2. No real API keys or credentials present in Git history or client bundle.
3. Explicit administrative sign-off recorded in deployment audit trail.

---

## 3. Disaster Recovery Procedures by Incident Scenario

### Scenario 1: Failed Deployment
**Symptoms:** New container fails health check (`/api/health`), 5xx spike, or elevated error rates (> 1%).
**Immediate Mitigation:**
1. Execute instantaneous container version rollback:
   ```bash
   # Cloud Run rollback command
   gcloud run services update-traffic sitescout-ai --to-revisions=PREVIOUS_STABLE_REVISION=100
   ```
2. Trigger in-app rollback tracking via `triggerDeploymentRollback(deploymentId, "SLA error rate spike")`.
3. Verify previous stable revision is serving traffic via `/api/health`.

### Scenario 2: Database Outage (Firestore / Cloud Connectivity)
**Symptoms:** Firestore operations time out; `/api/health/ready` returns 503.
**Immediate Mitigation:**
1. The platform automatically engages local in-memory & browser storage caching (`getLocalBusinessCache`), ensuring active users can view and edit drafts without crashing.
2. In-flight writes are queued into local recovery store.
3. Once cloud connectivity resumes, reconcile cached local records with remote collections via `fetchUserBusinesses(userId)`.

### Scenario 3: Corrupted Data / Accidental Mutation
**Symptoms:** Compromised business entity records, bad batch update, or accidental deletion.
**Immediate Mitigation:**
1. Retrieve the latest verified canonical backup snapshot via `GET /api/admin/backups`.
2. Run integrity check: `verifyBackupIntegrity(snapshot)`.
3. Restore into isolated validation partition:
   ```typescript
   await restoreBackupToIsolatedTarget(snapshot, "emergency_reconciliation_target");
   ```
4. Verify entity counts and inspect diffs against live records.
5. Re-ingest reconciled businesses via `ingestAndPersistBusinesses(reconciledList)`.

### Scenario 4: Hosting / Cloud Run Regional Outage
**Symptoms:** Complete loss of primary Cloud Run region (`europe-west2`).
**Immediate Mitigation:**
1. Deploy pre-built container image to secondary region (`us-central1` or `europe-west1`):
   ```bash
   gcloud run deploy sitescout-ai --image=gcr.io/PROJECT_ID/sitescout-ai:latest --region=europe-west1
   ```
2. Update Cloud DNS / Global Load Balancer to route traffic to active secondary region.
3. Verify TLS certificates and HTTPS redirect.

### Scenario 5: Lost or Corrupted Configuration
**Symptoms:** Server fails to boot due to missing environment variables.
**Immediate Mitigation:**
1. Validate environment against audited `.env.example`:
   ```bash
   npm run gate:check
   ```
2. Inject required variables (`APP_URL`, `GEMINI_API_KEY`, `OUTREACH_WEBHOOK_SECRET`) from Google Secret Manager or secure vault.
3. Restart server process (`npm run start`).

### Scenario 6: Compromised Credentials
**Symptoms:** Suspected API key leak or unauthorized webhook signature.
**Immediate Mitigation:**
1. **Immediate Revocation:** Revoke compromised key in Google Cloud Console / Gemini AI Studio.
2. Generate fresh key and update Cloud Run environment secrets:
   ```bash
   gcloud secrets versions add gemini-api-key --data-file=new_key.txt
   ```
3. Invalidate all active customer session tokens via server token epoch increment.
4. Review canonical audit logs (`getCanonicalAuditLogs({ eventType: "UNAUTHORIZED_ACCESS" })`) for breach scope analysis.

### Scenario 7: Failed Background Processing / Queue Blockage
**Symptoms:** Webhook delivery or outreach message stuck in retry loop.
**Immediate Mitigation:**
1. Webhooks enforce exponential backoff capped at 3 attempts.
2. Failing jobs automatically transition to `DEAD_LETTER` queue.
3. Inspect dead-letter payloads:
   - Identify if provider returned 4xx (permanent client error) vs 5xx (transient).
   - Once upstream provider resolves, trigger manual replay from dead-letter queue.

---

## 4. Backup Governance & Retention Schedule

| Entity | Backup Frequency | Storage Location | Retention Window | Encryption |
|---|---|---|---|---|
| **Customer Accounts** | Daily snapshot | Secure Cloud Storage | 90 days | AES-256 + SHA-256 Checksum |
| **Prospect & Business Records** | Daily snapshot | Secure Cloud Storage | 90 days | AES-256 + SHA-256 Checksum |
| **CRM Stages & Proposals** | Daily snapshot | Secure Cloud Storage | 90 days | AES-256 + SHA-256 Checksum |
| **Website Projects & Versions**| Continuous on save | Versioned Firestore | Indefinite | Google Managed Keys |
| **Subscriptions & Billing Events**| Event-driven | Audit Collection | 7 years (Tax/Legal) | AES-256 |
| **Canonical Audit Logs** | Append-only | Immutable Firestore | 1 year | Tamper-evident hash chain |

### Backup Verification Command
Admins can verify backup integrity and test isolated restoration at any time via authenticated CLI or API:
```bash
# Automated backup integrity & dry-run restore test
npm run test:recovery
```

---

## 5. Production Health Monitoring Endpoints

All monitoring probes are publicly queryable by container orchestrators and strictly redact sensitive credentials:

- `GET /api/health`: Comprehensive system status, uptime, environment, and DB status.
- `GET /api/health/live`: Lightweight liveness probe for Kubernetes / Cloud Run.
- `GET /api/health/ready`: Readiness probe indicating whether application is ready to accept traffic.
- `GET /api/health/perf`: In-process latency percentiles (p50, p95), heap usage, and RSS memory.

import assert from "assert";
import { isPrivateIp, validateHostname, validateUrlForSsrf } from "../../server/ssrfGuard";
import {
  verifyWebhookSecretOrSignature,
  validateFileUpload,
  validateContactFormPayload,
  InFlightDeduplicator,
  WebhookIdempotencyTracker,
  sanitizeApiError
} from "../lib/apiSecurity";
import {
  validateServerConfig,
  scanForExposedSecrets,
  assertLiveIntegrationAvailable,
  ConfigurationError
} from "../lib/appConfig";
import { recordCanonicalAuditEvent, resetCanonicalAuditLogsForTesting } from "../lib/canonicalAuditTrail";
import { createCustomerSession, authorizeCustomerAccess } from "../lib/customerPortalAccess";

export async function runRegressionTests(): Promise<{ passed: number; failed: number; total: number }> {
  console.log("=== RUNNING REGRESSION PROTECTION SUITE ===");
  let passed = 0;
  let failed = 0;
  let total = 0;

  function regTest(id: string, description: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            passed++;
            console.log(`  ✓ [REGRESSION PASS ${id}] ${description}`);
          })
          .catch((err: any) => {
            failed++;
            console.error(`  ✗ [REGRESSION FAIL ${id}] ${description}: ${err.message || err}`);
          });
      } else {
        passed++;
        console.log(`  ✓ [REGRESSION PASS ${id}] ${description}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  ✗ [REGRESSION FAIL ${id}] ${description}: ${err.message || err}`);
    }
  }

  // REGRESSION 1: timingSafeEqual Length Mismatch
  await regTest("REG-01", "verifyWebhookSecretOrSignature handles mismatched secret lengths without RangeError exception", () => {
    const configuredSecret = "whsec_live_abcdef1234567890";
    const shortHeader = "short";
    const longHeader = "whsec_live_abcdef1234567890_very_long_attacker_string_here";

    // Should return { verified: false } rather than throwing uncaught RangeError
    const shortRes = verifyWebhookSecretOrSignature({ "x-webhook-secret": shortHeader }, {}, configuredSecret);
    assert.strictEqual(shortRes.verified, false);

    const longRes = verifyWebhookSecretOrSignature({ "x-webhook-secret": longHeader }, {}, configuredSecret);
    assert.strictEqual(longRes.verified, false);
  });

  // REGRESSION 2: File Upload Extension Parsing & Case Sensitivity
  await regTest("REG-02", "validateFileUpload safely handles filenames without extension or mixed casing", () => {
    // Filename without dot
    const noExt = validateFileUpload({ fileName: "photo_without_ext", fileType: "image/png", fileSize: 1000 });
    assert.strictEqual(noExt.valid, false, "Filename without extension must be safely rejected without substring error");

    // Mixed casing
    const upperExt = validateFileUpload({ fileName: "AVATAR.PNG", fileType: "image/png", fileSize: 1000 });
    assert.strictEqual(upperExt.valid, true, "Uppercase extension should be matched case-insensitively");
  });

  // REGRESSION 3: Secret Leakage in Error Sanitizer & Audit Trail
  await regTest("REG-03", "sanitizeApiError and audit logger redact sensitive keys and database file paths", async () => {
    resetCanonicalAuditLogsForTesting();

    const leakedErr = new Error("Failed to connect to /opt/secrets/private.key using sk_live_abc1234567890");
    const sanitized = sanitizeApiError(leakedErr);
    assert.strictEqual(sanitized.error.includes("sk_live_"), false, "Stripe secret must be redacted");
    assert.strictEqual(sanitized.error.includes("/opt/secrets"), false, "Filesystem path must be sanitized");

    const { event } = await recordCanonicalAuditEvent({
      eventType: "USER_AUTHENTICATION_DEBUG",
      category: "SECURITY_EVENT",
      outcome: "SUCCESS",
      actor: { actorId: "dbg_user", role: "ADMIN" },
      targetEntity: { entityType: "auth_credential", entityId: "cred_888" },
      action: "test_redaction",
      reason: "User tried password=SecretKey123 with Bearer eyJhbGciOi and OpenAI sk-abc1234567890",
      metadata: { apiKey: "AIzaSySecretTestKey1234567890" }
    });
    assert.strictEqual(event.reason?.includes("SecretKey123"), false);
    assert.strictEqual(event.metadata?.apiKey, "[REDACTED]");
  });

  // REGRESSION 4: Mock Impersonation in Production Forbidden
  await regTest("REG-04", "Production environment strictly forbids mock fallbacks from impersonating live integrations", () => {
    const prodConfig = validateServerConfig({
      NODE_ENV: "production",
      APP_URL: "https://sitescout.ai",
      GEMINI_API_KEY: "AIzaSyProdKey123",
      OUTREACH_WEBHOOK_SECRET: "whsec_real_secret_001"
    });
    assert.strictEqual(prodConfig.config.allowMockFallbacks, false);

    let caughtError: ConfigurationError | null = null;
    try {
      assertLiveIntegrationAvailable("payment", {
        ...prodConfig.config,
        security: { ...prodConfig.config.security, paymentWebhookSecret: undefined }
      });
    } catch (err: any) {
      caughtError = err;
    }
    assert.ok(caughtError !== null, "Missing payment secret in production must throw error");
    assert.strictEqual(caughtError?.code, "PAYMENT_PROVIDER_UNCONFIGURED");
    assert.strictEqual(caughtError?.status, 503);
  });

  // REGRESSION 5: SSRF Bypasses via IPv4/IPv6 & Metadata
  await regTest("REG-05", "SSRF guard blocks cloud metadata hostnames, IPv6 loopback, and hex-encoded IPs", async () => {
    assert.strictEqual(isPrivateIp("127.0.0.1"), true);
    assert.strictEqual(isPrivateIp("::1"), true);
    assert.strictEqual(isPrivateIp("169.254.169.254"), true);

    const metaHost = validateHostname("metadata.google.internal");
    assert.strictEqual(metaHost.valid, false);

    const hexHost = validateHostname("0x7f000001");
    assert.strictEqual(hexHost.valid, false);

    const ssrfMeta = await validateUrlForSsrf("http://169.254.169.254/computeMetadata/v1/");
    assert.strictEqual(ssrfMeta.safe, false);
  });

  // REGRESSION 6: In-Flight Concurrency Deduplication Locks
  await regTest("REG-06", "InFlightDeduplicator executes expensive async task once under concurrent requests", async () => {
    const dedupe = new InFlightDeduplicator();
    let counter = 0;
    const task = async () => {
      counter++;
      await new Promise(r => setTimeout(r, 25));
      return { output: "done" };
    };

    const [r1, r2] = await Promise.all([
      dedupe.executeOrDeduplicate("key_dedupe_01", task),
      dedupe.executeOrDeduplicate("key_dedupe_01", task)
    ]);
    assert.strictEqual(counter, 1, "Underlying operation must run exactly once");
    assert.strictEqual(r1.result?.output, "done");
    assert.strictEqual(r2.result?.output, "done");
    assert.strictEqual(r2.wasDuplicate, true);
  });

  // REGRESSION 7: Webhook Idempotency Replay Protection
  await regTest("REG-07", "WebhookIdempotencyTracker prevents duplicate billing execution on webhook retries", () => {
    const tracker = new WebhookIdempotencyTracker();
    const evtId = "evt_stripe_payment_replayed_007";
    assert.strictEqual(tracker.isProcessed(evtId), false, "Fresh event should not be marked processed");

    tracker.recordProcessed(evtId, "payment.succeeded");
    assert.strictEqual(tracker.isProcessed(evtId), true, "Subsequent retry must be identified as processed");
  });

  // REGRESSION 8: Customer Multi-Tenant Boundary Isolation
  await regTest("REG-08", "Cross-tenant customer requests are blocked with HTTP 403", () => {
    const session = createCustomerSession({ uid: "user_tenant_1", email: "t1@domain.sz", role: "CUSTOMER" });
    const foreignBusiness = {
      id: "biz_tenant_2",
      name: "Tenant 2 Corp",
      customerAccount: { customerId: "user_tenant_2" }
    };
    const access = authorizeCustomerAccess(foreignBusiness as any, session, "account");
    assert.strictEqual(access.authorized, false);
    assert.strictEqual(access.status, 403);
  });

  // REGRESSION 9: Lead Capture Honeypot Bot Rejection
  await regTest("REG-09", "validateContactFormPayload identifies bot honeypots without CRM pollution", () => {
    const botSubmission = {
      name: "Automated Bot",
      email: "bot@seo-traffic.xyz",
      message: "Boost website ranking 1000%",
      honeypot: "filled_by_bot"
    };
    const val = validateContactFormPayload(botSubmission);
    assert.strictEqual(val.valid, false);
    assert.ok(val.errors.some(e => e.includes("Spam")));
  });

  console.log(`=== REGRESSION SUITE SUMMARY: ${passed}/${total} PASSED (${failed} FAILED) ===\n`);
  return { passed, failed, total };
}

if (process.argv[1]?.includes("regressions.test.ts")) {
  runRegressionTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

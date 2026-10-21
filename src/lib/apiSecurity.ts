/**
 * MICRO-PHASE 17D: SHARED API SECURITY & RATE LIMITING SUITE
 * 
 * Shared interfaces, validation routines, in-flight deduplication, and
 * client-accessible rate limiting utilities for SiteScout AI.
 */

export {
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
} from "../../server/apiSecurity";

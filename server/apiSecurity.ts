import express from "express";
import crypto from "crypto";

/**
 * MICRO-PHASE 17D: API SECURITY, RATE LIMITING & ABUSE PREVENTION
 * 
 * Centralized, production-grade security engine for SiteScout AI APIs.
 * Enforces:
 * 1. Security Headers (nosniff, sameorigin/CSP, xss protection, hsts, referrer policy)
 * 2. Explicit Trusted CORS & CSRF state-changing request protection
 * 3. Cost-Aware & Tiered Rate Limiting (Account/UID & IP-based with automated recovery)
 * 4. Input & Request Payload Validation (bounds, types, sanitization)
 * 5. File Upload Verification (size, MIME allowlist, extension validation, magic bytes)
 * 6. In-Flight Concurrency Deduplication / Idempotency Locks for expensive AI operations
 * 7. Server-Side Customer Resource Authorization
 * 8. Payment Webhook Signature Verification, Generous Rate Limits & Idempotent Retries
 * 9. Leak-Free Standardized Error Sanitization
 */

// =========================================================================
// 1. SECURITY HEADERS
// =========================================================================

export function applySecurityHeaders(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent UI redressing / Clickjacking (permits same origin iframe for previewing)
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Legacy XSS filter activation
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HSTS in production or staging HTTPS environments
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (isHttps || process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Permissions-Policy (restrict sensitive client hardware)
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Content-Security-Policy (allows safe inline styles, fonts, images, scripts, frame ancestors)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "img-src 'self' data: https: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
    "connect-src 'self' https: wss:; " +
    "frame-ancestors 'self' https://*.google.com https://*.run.app; " +
    "base-uri 'self';"
  );

  next();
}

// =========================================================================
// 2. CORS & CSRF STATE-CHANGING REQUEST PROTECTION
// =========================================================================

export interface CorsConfig {
  allowedOrigins: string[];
  isDevOrTest: boolean;
}

export function isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean {
  if (!origin) return true; // Non-browser / same-origin requests
  if (config.isDevOrTest) return true; // Permissive for local dev / testing harness
  return config.allowedOrigins.includes(origin);
}

export function configureCorsAndCsrf(config: CorsConfig) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;

    if (origin) {
      if (isOriginAllowed(origin, config)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Webhook-Secret, X-API-Key, X-Correlation-ID, X-Requested-With, stripe-signature"
        );
      } else {
        // Untrusted cross-origin request
        const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];
        if (stateChangingMethods.includes(req.method.toUpperCase())) {
          console.warn(`[Security Alert] CSRF/CORS blocked state-changing ${req.method} from untrusted origin: ${origin}`);
          return res.status(403).json({
            error: "Forbidden: Untrusted cross-origin request blocked by security policy.",
            code: "CORS_ORIGIN_NOT_ALLOWED"
          });
        }
      }
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  };
}

export function validateCsrfProtection(
  req: { method: string; headers: Record<string, string | undefined> },
  allowedOrigins: string[]
): { allowed: boolean; error?: string } {
  const method = req.method.toUpperCase();
  const stateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  if (!stateChanging) return { allowed: true };

  const origin = req.headers.origin || req.headers.Origin;
  if (!origin) {
    // If no Origin, verify Referer if present
    const referer = req.headers.referer || req.headers.Referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const refOrigin = refUrl.origin;
        if (!allowedOrigins.includes(refOrigin)) {
          return { allowed: false, error: "CSRF check failed: Referer origin not allowed." };
        }
      } catch {
        return { allowed: false, error: "CSRF check failed: Invalid Referer header." };
      }
    }
    return { allowed: true };
  }

  if (!allowedOrigins.includes(origin)) {
    return { allowed: false, error: `CSRF check failed: Untrusted Origin '${origin}'.` };
  }

  return { allowed: true };
}

// =========================================================================
// 3. TIERED & COST-AWARE RATE LIMITING ENGINE
// =========================================================================

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class TieredRateLimiter {
  private buckets = new Map<string, Map<string, RateLimitEntry>>();

  public checkLimit(
    bucketName: string,
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds: number } {
    if (!this.buckets.has(bucketName)) {
      this.buckets.set(bucketName, new Map<string, RateLimitEntry>());
    }
    const bucket = this.buckets.get(bucketName)!;
    const now = Date.now();
    const existing = bucket.get(key);

    // If no existing record or window elapsed -> reset
    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowMs;
      bucket.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      };
    }

    // If within window and count exceeds limit
    if (existing.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterSeconds
      };
    }

    // Increment count
    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - existing.count),
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000)
    };
  }

  public recordHit(bucketName: string, key: string, windowMs: number): void {
    if (!this.buckets.has(bucketName)) {
      this.buckets.set(bucketName, new Map<string, RateLimitEntry>());
    }
    const bucket = this.buckets.get(bucketName)!;
    const now = Date.now();
    const existing = bucket.get(key);
    if (!existing || now >= existing.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      existing.count += 1;
    }
  }

  public resetBucket(bucketName: string): void {
    if (this.buckets.has(bucketName)) {
      this.buckets.get(bucketName)!.clear();
    }
  }

  public resetAll(): void {
    this.buckets.clear();
  }

  public getBucketKeys(bucketName: string): string[] {
    const bucket = this.buckets.get(bucketName);
    return bucket ? Array.from(bucket.keys()) : [];
  }

  public createMiddleware(
    bucketName: string,
    maxRequests: number,
    windowMs: number
  ) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authUser = (req as any).user?.uid;
      const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
      const ipStr = Array.isArray(ip) ? ip[0] : String(ip);
      const key = authUser ? `u:${authUser}` : `ip:${ipStr}`;

      const result = this.checkLimit(bucketName, key, maxRequests, windowMs);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfterSeconds);
        console.warn(`[RateLimit] Exceeded '${bucketName}' limit (${maxRequests}/${windowMs}ms) for ${key}`);
        return res.status(429).json({
          error: `Rate limit exceeded for this operation (${bucketName}). Please wait ${result.retryAfterSeconds}s before retrying.`,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: result.retryAfterSeconds,
          resetAt: new Date(result.resetAt).toISOString()
        });
      }

      next();
    };
  }
}

// Canonical Shared Singleton Rate Limiter
export const globalRateLimiter = new TieredRateLimiter();

// Defined Rate Limit Configurations (Micro-Phase 17D)
export const RATE_LIMIT_CONFIGS = {
  auth: { maxRequests: 10, windowMs: 5 * 60 * 1000 },             // 10 attempts / 5m
  search: { maxRequests: 40, windowMs: 5 * 60 * 1000 },           // 40 searches / 5m
  aiGeneration: { maxRequests: 25, windowMs: 5 * 60 * 1000 },     // 25 AI queries / 5m
  websiteGeneration: { maxRequests: 15, windowMs: 5 * 60 * 1000 },// 15 full sites / 5m
  publicPreview: { maxRequests: 60, windowMs: 60 * 1000 },        // 60 views / 1m
  contactForm: { maxRequests: 5, windowMs: 10 * 60 * 1000 },      // 5 submissions / 10m
  fileUpload: { maxRequests: 10, windowMs: 5 * 60 * 1000 },       // 10 uploads / 5m
  adminOperations: { maxRequests: 30, windowMs: 5 * 60 * 1000 },  // 30 admin ops / 5m
  webhooks: { maxRequests: 120, windowMs: 5 * 60 * 1000 }         // 120 webhooks / 5m (generous)
};

// =========================================================================
// 4. INPUT & PAYLOAD VALIDATION HELPERS
// =========================================================================

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

export function validatePayloadSize(maxBytes: number = 2 * 1024 * 1024) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: `Payload Too Large: Request size (${contentLength} bytes) exceeds limit of ${maxBytes} bytes.`,
        code: "PAYLOAD_TOO_LARGE"
      });
    }
    next();
  };
}

export function validateSearchPayload(body: any): ValidationOutcome {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."] };
  }

  const { city, country, keywords, category, page, radius } = body;

  if (city !== undefined && (typeof city !== "string" || city.length > 100)) {
    errors.push("City must be a string with maximum 100 characters.");
  }
  if (country !== undefined && (typeof country !== "string" || country.length > 100)) {
    errors.push("Country must be a string with maximum 100 characters.");
  }
  if (category !== undefined && (typeof category !== "string" || category.length > 100)) {
    errors.push("Category must be a string with maximum 100 characters.");
  }
  if (keywords !== undefined && (typeof keywords !== "string" || keywords.length > 250)) {
    errors.push("Keywords must be a string with maximum 250 characters.");
  }
  if (page !== undefined && (!Number.isInteger(page) || page < 1 || page > 100)) {
    errors.push("Page must be an integer between 1 and 100.");
  }
  if (radius !== undefined) {
    const numRadius = Number(radius);
    if (isNaN(numRadius) || numRadius < 1 || numRadius > 500) {
      errors.push("Radius must be a number between 1 and 500 km.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAiGenerationPayload(body: any): ValidationOutcome {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."] };
  }

  const { business } = body;
  if (!business || typeof business !== "object") {
    errors.push("A valid 'business' object is required for generation.");
    return { valid: false, errors };
  }

  if (!business.name || typeof business.name !== "string" || business.name.trim().length === 0) {
    errors.push("Business name is required and cannot be empty.");
  } else if (business.name.length > 200) {
    errors.push("Business name cannot exceed 200 characters.");
  }

  if (business.category && (typeof business.category !== "string" || business.category.length > 100)) {
    errors.push("Business category cannot exceed 100 characters.");
  }

  if (business.address && (typeof business.address !== "string" || business.address.length > 300)) {
    errors.push("Business address cannot exceed 300 characters.");
  }

  if (business.description && (typeof business.description !== "string" || business.description.length > 2000)) {
    errors.push("Business description cannot exceed 2000 characters.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateContactFormPayload(body: any): ValidationOutcome {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."] };
  }

  const { name, email, phone, message, honeypot } = body;

  if (honeypot && typeof honeypot === "string" && honeypot.trim().length > 0) {
    // Bot honeypot detected
    return { valid: false, errors: ["Spam verification failed."] };
  }

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    errors.push("Name is required and must not exceed 100 characters.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email) || email.length > 100) {
    errors.push("A valid email address is required (maximum 100 characters).");
  }

  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string" || phone.length > 30) {
      errors.push("Phone number must not exceed 30 characters.");
    }
  }

  if (!message || typeof message !== "string" || message.trim().length < 3 || message.length > 2000) {
    errors.push("Message must be between 3 and 2000 characters.");
  }

  return { valid: errors.length === 0, errors };
}

// =========================================================================
// 5. FILE UPLOAD SECURITY (MIME, EXTENSION, MAGIC BYTES & SIZE LIMIT)
// =========================================================================

export const ALLOWED_FILE_TYPES: Record<string, { extensions: string[]; magicHeader?: number[] }> = {
  "image/png": {
    extensions: [".png"],
    magicHeader: [0x89, 0x50, 0x4E, 0x47] // \x89PNG
  },
  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    magicHeader: [0xFF, 0xD8, 0xFF] // \xFF\xD8\xFF
  },
  "image/webp": {
    extensions: [".webp"],
    magicHeader: [0x52, 0x49, 0x46, 0x46] // RIFF
  },
  "image/svg+xml": {
    extensions: [".svg"]
  },
  "application/pdf": {
    extensions: [".pdf"],
    magicHeader: [0x25, 0x50, 0x44, 0x46] // %PDF
  },
  "text/csv": {
    extensions: [".csv"]
  }
};

export const FORBIDDEN_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".js", ".mjs", ".ts",
  ".html", ".htm", ".xhtml", ".py", ".rb", ".jar", ".vbs", ".dll", ".so",
  ".asp", ".aspx", ".jsp", ".cgi", ".pl"
];

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateFileUpload(upload: {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string | Buffer;
}): ValidationOutcome {
  const errors: string[] = [];

  if (!upload || typeof upload !== "object") {
    return { valid: false, errors: ["Missing file upload data."] };
  }

  const { fileName = "", fileType = "", fileSize = 0, fileData } = upload;

  // 1. File size check
  if (typeof fileSize !== "number" || fileSize <= 0) {
    errors.push("Invalid file size specified.");
  } else if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
    errors.push(`File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.`);
  }

  // 2. File name validation & traversal protection
  if (!fileName || typeof fileName !== "string") {
    errors.push("File name is required.");
  } else {
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      errors.push("Path traversal characters in file name are strictly prohibited.");
    }

    const lowerName = fileName.toLowerCase();
    const hasForbiddenExt = FORBIDDEN_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    if (hasForbiddenExt) {
      errors.push("Executable, script, and HTML file extensions are prohibited.");
    }
  }

  // 3. MIME type check
  const allowedConfig = ALLOWED_FILE_TYPES[fileType];
  if (!allowedConfig) {
    errors.push(`File type '${fileType}' is not supported. Permitted types: PNG, JPEG, WebP, SVG, PDF, CSV.`);
  } else {
    const lastDot = fileName.lastIndexOf(".");
    const ext = lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : "";
    if (!allowedConfig.extensions.includes(ext)) {
      errors.push(`File extension '${ext}' does not match declared MIME type '${fileType}'.`);
    }
  }

  // 4. Magic byte inspection if data is provided
  if (fileData && allowedConfig && allowedConfig.magicHeader) {
    let buffer: Buffer;
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (typeof fileData === "string") {
      const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.alloc(0);
    }

    if (buffer.length < allowedConfig.magicHeader.length) {
      errors.push("File content is too small or truncated.");
    } else {
      const matches = allowedConfig.magicHeader.every((byte, idx) => buffer[idx] === byte);
      if (!matches) {
        errors.push("File content header (magic bytes) does not match declared file type.");
      }
    }
  }

  // 5. SVG content safety scan
  if (fileType === "image/svg+xml" && fileData) {
    const text = (Buffer.isBuffer(fileData) ? fileData.toString("utf-8") : String(fileData)).toLowerCase();
    if (text.includes("<script") || text.includes("javascript:") || text.includes("onload=") || text.includes("onerror=")) {
      errors.push("SVG contains malicious executable script tags or inline handlers.");
    }
  }

  return { valid: errors.length === 0, errors };
}

// =========================================================================
// 6. IN-FLIGHT CONCURRENCY DEDUPLICATION (IDEMPOTENCY LOCKS)
// =========================================================================

export class InFlightDeduplicator {
  private activeLocks = new Map<string, { startedAt: number; promise?: Promise<any> }>();

  public acquireLock(operationKey: string, ttlMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.activeLocks.get(operationKey);
    if (existing) {
      if (now - existing.startedAt < ttlMs) {
        return false; // Still active
      }
      this.activeLocks.delete(operationKey); // Expired stale lock
    }
    this.activeLocks.set(operationKey, { startedAt: now });
    return true;
  }

  public releaseLock(operationKey: string): void {
    this.activeLocks.delete(operationKey);
  }

  public isLocked(operationKey: string): boolean {
    const existing = this.activeLocks.get(operationKey);
    if (!existing) return false;
    if (Date.now() - existing.startedAt > 60000) {
      this.activeLocks.delete(operationKey);
      return false;
    }
    return true;
  }

  public async executeOrDeduplicate<T>(
    operationKey: string,
    operationFn: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<{ result?: T; wasDuplicate: boolean; error?: string }> {
    const existing = this.activeLocks.get(operationKey);
    const now = Date.now();

    if (existing && existing.promise && now - existing.startedAt < ttlMs) {
      // Return the in-flight execution promise rather than starting a duplicate!
      try {
        const result = await existing.promise;
        return { result, wasDuplicate: true };
      } catch (err: any) {
        return { wasDuplicate: true, error: err.message || String(err) };
      }
    }

    const promise = operationFn();
    this.activeLocks.set(operationKey, { startedAt: now, promise });

    try {
      const result = await promise;
      return { result, wasDuplicate: false };
    } finally {
      this.releaseLock(operationKey);
    }
  }

  public clear(): void {
    this.activeLocks.clear();
  }
}

export const globalInFlightDeduplicator = new InFlightDeduplicator();

// =========================================================================
// 7. CUSTOMER RESOURCE AUTHORIZATION
// =========================================================================

export function authorizeCustomerResourceAccess(
  caller: { uid: string; email?: string; role?: string },
  resourceOwnerId?: string,
  resourceCustomerId?: string
): { authorized: boolean; status: number; reason?: string } {
  if (!caller || !caller.uid) {
    return { authorized: false, status: 401, reason: "Authentication required." };
  }

  // Admin access bypass
  const isAdmin =
    caller.email === "siphom.yati@gmail.com" ||
    caller.role === "admin" ||
    caller.role === "Admin" ||
    caller.role === "SUPER_ADMIN";

  if (isAdmin) {
    return { authorized: true, status: 200 };
  }

  // Caller owns the resource via UID
  if (resourceOwnerId && caller.uid === resourceOwnerId) {
    return { authorized: true, status: 200 };
  }

  // Caller owns the resource via customerId
  if (resourceCustomerId && caller.uid === resourceCustomerId) {
    return { authorized: true, status: 200 };
  }

  return {
    authorized: false,
    status: 403,
    reason: "Forbidden: You do not have permission to access or modify this customer resource."
  };
}

// =========================================================================
// 8. PAYMENT WEBHOOK SECURITY & IDEMPOTENT RETRIES
// =========================================================================

export class WebhookIdempotencyTracker {
  private processedEvents = new Map<string, { timestamp: number; payloadSummary: string }>();

  public isProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  public recordProcessed(eventId: string, payloadSummary: string = ""): void {
    this.processedEvents.set(eventId, { timestamp: Date.now(), payloadSummary });
  }

  public clear(): void {
    this.processedEvents.clear();
  }
}

export const globalWebhookTracker = new WebhookIdempotencyTracker();

export function verifyWebhookSecretOrSignature(
  headers: Record<string, string | string[] | undefined>,
  payload: any,
  configuredSecret?: string
): { verified: boolean; error?: string } {
  // If no webhook secret is configured in dev/testing, permit
  if (!configuredSecret) {
    return { verified: true };
  }

  const webhookSecretHeader = headers["x-webhook-secret"] || headers["X-Webhook-Secret"];
  const stripeSignatureHeader = headers["stripe-signature"] || headers["Stripe-Signature"];

  // Direct secret match
  if (webhookSecretHeader) {
    const provided = Array.isArray(webhookSecretHeader) ? webhookSecretHeader[0] : webhookSecretHeader;
    const bufProvided = Buffer.from(provided);
    const bufExpected = Buffer.from(configuredSecret);
    if (bufProvided.length === bufExpected.length && crypto.timingSafeEqual(bufProvided, bufExpected)) {
      return { verified: true };
    }
  }

  // Stripe signature verification (if payload and signature provided)
  if (stripeSignatureHeader && typeof payload === "string") {
    try {
      const sig = Array.isArray(stripeSignatureHeader) ? stripeSignatureHeader[0] : stripeSignatureHeader;
      const elements = sig.split(",");
      const timestamp = elements.find(e => e.startsWith("t="))?.slice(2);
      const v1 = elements.find(e => e.startsWith("v1="))?.slice(3);

      if (timestamp && v1) {
        const signedPayload = `${timestamp}.${payload}`;
        const expectedSig = crypto
          .createHmac("sha256", configuredSecret)
          .update(signedPayload)
          .digest("hex");

        const bufV1 = Buffer.from(v1);
        const bufExpectedSig = Buffer.from(expectedSig);
        if (bufV1.length === bufExpectedSig.length && crypto.timingSafeEqual(bufV1, bufExpectedSig)) {
          return { verified: true };
        }
      }
    } catch {
      return { verified: false, error: "Stripe signature validation failed." };
    }
  }

  return { verified: false, error: "Invalid webhook signature or missing authentication secret." };
}

// =========================================================================
// 9. LEAK-FREE ERROR SANITIZATION
// =========================================================================

export function sanitizeApiError(
  error: any,
  correlationId?: string
): { error: string; code: string; correlationId?: string; status: number } {
  const status = typeof error?.status === "number" ? error.status : 500;
  let message = "An internal server error occurred.";
  let code = "INTERNAL_SERVER_ERROR";

  if (error?.code === "RATE_LIMIT_EXCEEDED") {
    message = error.message || "Rate limit exceeded.";
    code = "RATE_LIMIT_EXCEEDED";
  } else if (error?.code === "PAYLOAD_TOO_LARGE") {
    message = error.message || "Payload too large.";
    code = "PAYLOAD_TOO_LARGE";
  } else if (status === 400 || error?.name === "ValidationError") {
    message = error.message || "Invalid request parameters.";
    code = "BAD_REQUEST";
  } else if (status === 401) {
    message = error.message || "Authentication required.";
    code = "UNAUTHORIZED";
  } else if (status === 403) {
    message = error.message || "Access denied.";
    code = "FORBIDDEN";
  } else if (status === 404) {
    message = error.message || "Resource not found.";
    code = "NOT_FOUND";
  }

  // Filter out raw file paths, stack traces, and database internals
  message = message
    .replace(/\/[\w.-]+(\/[\w.-]+)+/g, "[sanitized-path]")
    .replace(/(AIza|sk_live|whsec_)[a-zA-Z0-9_-]+/g, "[redacted-key]");

  return { error: message, code, correlationId, status };
}

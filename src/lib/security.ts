import { GeneratedSite } from "../types";

/**
 * Generates a cryptographically secure, unpredictable, 64-hex-character token
 * (256 bits of cryptographic entropy) for public previews and share links.
 * Strictly avoids Math.random() and fails safely if secure randomness is unavailable.
 */
export function generateSecurePreviewToken(bytes: number = 32): string {
  // 1. Browser or Modern Node globalThis.crypto
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const buffer = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // 2. Safe Node.js crypto module fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    if (nodeCrypto && typeof nodeCrypto.randomBytes === "function") {
      return nodeCrypto.randomBytes(bytes).toString("hex");
    }
  } catch {
    // Not running in Node.js or require disallowed
  }

  // Strictly fail safely rather than falling back to weak pseudo-random generation
  throw new Error("Cryptographically secure random number generator is unavailable. Token generation aborted.");
}

/**
 * Validates whether a given string is a securely formed preview token or UUID.
 * Strictly prevents path traversal, injection characters, or malformed queries.
 */
export function isValidPreviewToken(token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  // Strictly alphanumeric, hyphens, and underscores between 16 and 64 characters
  return /^[a-zA-Z0-9_-]{16,64}$/.test(token);
}

/**
 * Validates that a token meets cryptographic hex standards (48-64 hex chars).
 */
export function isCryptographicToken(token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  return /^[a-f0-9]{48,64}$/i.test(token);
}

/**
 * Checks whether a preview record has an expiration timestamp and is past expiry.
 */
export function isTokenExpired(previewData?: { expiresAt?: string | null; [key: string]: any }): boolean {
  if (!previewData?.expiresAt) return false;
  const expiryTime = new Date(previewData.expiresAt).getTime();
  if (isNaN(expiryTime)) return false;
  return Date.now() > expiryTime;
}

/**
 * Redacts a preview token for safe logging without exposing sensitive secret entropy.
 * Example: 'a1b2c3d4...9z8y' -> 'a1b2c3...9z8y'
 */
export function maskToken(token?: string): string {
  if (!token || typeof token !== "string") return "[invalid-token]";
  if (token.length <= 8) return "[redacted]";
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

/**
 * Strips all private internal business information, user IDs, private CRM notes,
 * internal sales status, and proprietary scoring details before publishing
 * or presenting a website prototype to public clients.
 */
export function sanitizePublicPreview(site: GeneratedSite): Record<string, any> {
  return {
    id: site.id,
    previewToken: site.previewToken || site.id,
    businessName: site.businessName || "",
    phone: site.phone || "",
    address: site.address || "",
    category: site.category || "",
    primaryColor: site.primaryColor || "#4f46e5",
    secondaryColor: site.secondaryColor || "#0284c7",
    accentColor: site.accentColor || "#10b981",
    backgroundColor: site.backgroundColor || "#ffffff",
    textColor: site.textColor || "#0f172a",
    fontStyle: site.fontStyle || "sans",
    seo: site.seo ? {
      title: site.seo.title || "",
      description: site.seo.description || "",
      keywords: site.seo.keywords || ""
    } : null,
    hero: site.hero ? {
      title: site.hero.title || "",
      subtitle: site.hero.subtitle || "",
      ctaPrimary: site.hero.ctaPrimary || "Get in Touch",
      ctaSecondary: site.hero.ctaSecondary || "",
      imageUrl: site.hero.imageUrl || "",
      photographer: site.hero.photographer || "",
      photographerUrl: site.hero.photographerUrl || "",
      license: site.hero.license || ""
    } : null,
    about: site.about ? {
      title: site.about.title || "",
      history: site.about.history || "",
      mission: site.about.mission || "",
      pitch: site.about.pitch || "",
      imageUrl: site.about.imageUrl || ""
    } : null,
    services: Array.isArray(site.services) ? site.services.map((s) => ({
      title: s.title || "",
      description: s.description || "",
      price: s.price || "",
      imageUrl: s.imageUrl || ""
    })) : [],
    features: Array.isArray(site.features) ? site.features.map((f) => ({
      title: f.title || "",
      description: f.description || "",
      icon: f.icon || ""
    })) : [],
    gallery: Array.isArray(site.gallery) ? site.gallery.map((g) => ({
      url: g.url || "",
      alt: g.alt || "",
      photographer: g.photographer || "",
      photographerUrl: g.photographerUrl || "",
      license: g.license || ""
    })) : [],
    faqs: Array.isArray(site.faqs) ? site.faqs.map((q) => ({
      question: q.question || "",
      answer: q.answer || ""
    })) : [],
    testimonials: Array.isArray(site.testimonials) ? site.testimonials.map((t) => ({
      name: t.name || "",
      review: t.review || "",
      rating: typeof t.rating === "number" ? Math.max(0, Math.min(5, t.rating)) : 0,
      isVerified: t.isVerified === true
    })) : [],
    blog: Array.isArray(site.blog) ? site.blog.map((b) => ({
      title: b.title || "",
      summary: b.summary || "",
      category: b.category || ""
    })) : [],
    whatsappMessage: site.whatsappMessage || "",
    contactPage: site.contactPage ? {
      title: site.contactPage.title || "",
      description: site.contactPage.description || "",
      email: site.contactPage.email || ""
    } : null,
    privacyPolicy: site.privacyPolicy || "",
    termsOfService: site.termsOfService || "",
    notFoundPage: site.notFoundPage || null,
    logoUrl: site.logoUrl || "",
    logoType: site.logoType || "text",
    logoIcon: site.logoIcon || "",
    sectionsOrder: site.sectionsOrder || []
    // CRITICAL SECURITY BOUNDARY:
    // userId, ownerId, clientApproved, clientApprovedBy, clientApprovedAt, clientFeedback,
    // previewViews, previewLastViewedAt, previewHistory, truthProfile, presence, deficits,
    // opportunityScore, prospectStatus, salesStage, evidence, and internal notes MUST NEVER BE EXPOSED.
  };
}

/**
 * Explicit allowlist of permissible public telemetry event types.
 */
export const ALLOWED_TELEMETRY_EVENTS = [
  "PREVIEW_VIEWED",
  "PREVIEW_OPENED",
  "CTA_CLICKED",
  "CONTACT_LINK_CLICKED",
  "SECTION_VIEWED",
  "WHATSAPP_CLICKED",
  "PHONE_CLICKED",
  "EMAIL_CLICKED",
  "FORM_SUBMITTED"
] as const;

export type AllowedTelemetryEvent = typeof ALLOWED_TELEMETRY_EVENTS[number];

/**
 * Validates whether an event type is included in the explicitly allowed public telemetry allowlist.
 * Case-insensitive match against canonical allowed events.
 */
export function isAllowedTelemetryEvent(eventType?: string): boolean {
  if (!eventType || typeof eventType !== "string") return false;
  const normalized = eventType.trim().toUpperCase();
  return (ALLOWED_TELEMETRY_EVENTS as readonly string[]).includes(normalized);
}

/**
 * Normalizes an event type string to uppercase canonical format if allowed.
 */
export function normalizeTelemetryEventType(eventType: string): string {
  if (!isAllowedTelemetryEvent(eventType)) {
    throw new Error(`Invalid telemetry event type: ${eventType}`);
  }
  return eventType.trim().toUpperCase();
}

/**
 * Sanitizes and normalizes incoming telemetry event metadata.
 * Strips client-supplied owner IDs, user IDs, timestamps, and view counts.
 * Restricts key count (max 10) and field lengths (max 200 chars).
 */
export function sanitizeTelemetryMetadata(metadata: any): Record<string, string | number | boolean> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const forbiddenKeys = [
    "ownerid",
    "userid",
    "timestamp",
    "createdat",
    "id",
    "previewviews",
    "views",
    "viewscount"
  ];
  const sanitized: Record<string, string | number | boolean> = {};
  const entries = Object.entries(metadata).slice(0, 10);

  for (const [key, value] of entries) {
    const cleanKey = key.trim().toLowerCase().slice(0, 50);
    if (!cleanKey || forbiddenKeys.includes(cleanKey)) continue;

    if (typeof value === "string") {
      sanitized[cleanKey] = value.trim().slice(0, 200);
    } else if (typeof value === "number") {
      if (isFinite(value)) sanitized[cleanKey] = value;
    } else if (typeof value === "boolean") {
      sanitized[cleanKey] = value;
    }
  }

  return sanitized;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

/**
 * Server-side memory rate limiter for preview telemetry ingestion.
 * Tracks request count per key (e.g. `${ip}:${token}`) over a sliding window.
 * Returns true if under limit, false if limit exceeded.
 */
export function checkTelemetryRateLimit(key: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * Clears the telemetry rate limit map (used for test isolation).
 */
export function clearRateLimitMap(): void {
  rateLimitMap.clear();
}


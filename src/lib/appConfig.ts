/**
 * MICRO-PHASE 17C: APPLICATION CONFIGURATION, ENVIRONMENT VARIABLES & SECRET MANAGEMENT
 * 
 * Centralized, validated application configuration module.
 * - Environment separation: Development, Testing, Staging, Production
 * - Strict secret management: Server-side only, masked logging, zero client exposure
 * - Production safety: Fails safely when required configuration is missing
 * - Mock/fallback guards: Forbids mock fallbacks from silently impersonating live services in production
 */

export type AppEnvironment = "development" | "testing" | "staging" | "production";

export interface ServerConfig {
  env: AppEnvironment;
  port: number;
  publicAppUrl: string;
  allowedOrigins: string[];

  // AI Provider (Gemini)
  ai: {
    geminiApiKey?: string;
    isConfigured: boolean;
  };

  // Webhooks & Signing Secrets
  security: {
    outreachWebhookSecret?: string;
    paymentWebhookSecret?: string;
    isWebhookSecretConfigured: boolean;
  };

  // Third-party Hosting (Vercel)
  vercel: {
    apiToken?: string;
    isConfigured: boolean;
  };

  // Firebase Public Client Config
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    firestoreDatabaseId: string;
    isConfigured: boolean;
  };

  // Fallback Policy
  allowMockFallbacks: boolean;
}

export interface ConfigValidationResult {
  config: ServerConfig;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Normalizes environment identifier into canonical AppEnvironment.
 */
export function normalizeEnvironment(envStr?: string): AppEnvironment {
  if (!envStr) return "development";
  const clean = envStr.trim().toLowerCase();
  if (clean === "production" || clean === "prod") return "production";
  if (clean === "staging" || clean === "stage") return "staging";
  if (clean === "test" || clean === "testing") return "testing";
  return "development";
}

/**
 * Safely masks secret strings for diagnostic logging and telemetry without leaking credential contents.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== "string" || secret.trim() === "") {
    return "[NOT SET]";
  }
  const clean = secret.trim();
  if (clean.length <= 6) {
    return "[CONFIGURED: REDACTED]";
  }
  const prefix = clean.substring(0, 3);
  const suffix = clean.substring(clean.length - 3);
  return `${prefix}***${suffix} (${clean.length} chars)`;
}

/**
 * Parses and validates allowed CORS origins list.
 */
export function parseAllowedOrigins(originsStr?: string, env: AppEnvironment = "development"): string[] {
  if (!originsStr || originsStr.trim() === "") {
    if (env === "production") {
      return [];
    }
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  return originsStr
    .split(",")
    .map(o => o.trim())
    .filter(o => o.length > 0);
}

/**
 * Validates raw environment variable dictionary against strict environment rules.
 */
export function validateServerConfig(envVars: Record<string, string | undefined>): ConfigValidationResult {
  const env = normalizeEnvironment(envVars.NODE_ENV);
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Port validation
  let port = 3000;
  if (envVars.PORT) {
    const parsed = parseInt(envVars.PORT, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
      errors.push(`Invalid PORT configuration: '${envVars.PORT}'. Must be an integer between 1 and 65535.`);
    } else {
      port = parsed;
    }
  }

  // 2. Public App URL validation
  const rawAppUrl = envVars.APP_URL || envVars.PUBLIC_APP_URL || "";
  let publicAppUrl = rawAppUrl.trim();
  const isPlaceholderUrl = publicAppUrl === "MY_APP_URL" || publicAppUrl === "https://example.com";

  if (env === "production") {
    if (!publicAppUrl || isPlaceholderUrl) {
      errors.push("Production configuration error: APP_URL must be configured with a live public URL.");
    } else if (!publicAppUrl.startsWith("https://")) {
      errors.push(`Production configuration error: APP_URL must use HTTPS protocol in production (got '${publicAppUrl}').`);
    }
  } else if (!publicAppUrl || isPlaceholderUrl) {
    publicAppUrl = `http://localhost:${port}`;
    warnings.push(`APP_URL not specified; defaulting to local development URL '${publicAppUrl}'.`);
  }

  // 3. Allowed Origins
  const allowedOrigins = parseAllowedOrigins(envVars.ALLOWED_ORIGINS, env);
  if (env === "production" && allowedOrigins.length === 0) {
    // If not explicitly set in production, inherit the origin of the APP_URL
    try {
      if (publicAppUrl && !isPlaceholderUrl) {
        const u = new URL(publicAppUrl);
        allowedOrigins.push(u.origin);
      } else {
        warnings.push("ALLOWED_ORIGINS is empty in production. Cross-origin requests will be restricted.");
      }
    } catch (e) {
      warnings.push("Unable to derive origin from APP_URL. ALLOWED_ORIGINS is empty.");
    }
  }

  // 4. Gemini AI Configuration & Fallback Policy
  const rawGeminiKey = envVars.GEMINI_API_KEY?.trim();
  const isGeminiPlaceholder = !rawGeminiKey || rawGeminiKey === "MY_GEMINI_API_KEY" || rawGeminiKey === "MOCK_KEY";
  const isAiConfigured = !isGeminiPlaceholder;

  if (env === "production") {
    if (!isAiConfigured) {
      errors.push("Production configuration error: GEMINI_API_KEY is required in production. Simulated AI mock fallback is forbidden in production.");
    }
  } else if (!isAiConfigured) {
    warnings.push("GEMINI_API_KEY is not configured. Local mock fallback responses will be used for development/testing.");
  }

  // 5. Security & Webhooks
  const rawOutreachSecret = envVars.OUTREACH_WEBHOOK_SECRET?.trim();
  const isInsecureDefaultSecret = rawOutreachSecret === "sitescout_webhook_secret_key";
  const isWebhookSecretConfigured = !!(rawOutreachSecret && !isInsecureDefaultSecret);

  if (env === "production") {
    if (!rawOutreachSecret || isInsecureDefaultSecret) {
      errors.push("Production security error: OUTREACH_WEBHOOK_SECRET must be set to a private secure key. Hardcoded default secret is forbidden in production.");
    }
  } else if (!rawOutreachSecret || isInsecureDefaultSecret) {
    warnings.push("OUTREACH_WEBHOOK_SECRET is using development fallback. Must be replaced before production deployment.");
  }

  const rawPaymentSecret = envVars.PAYMENT_WEBHOOK_SECRET?.trim();

  // 6. Vercel Hosting Token (Optional integration)
  const rawVercelToken = envVars.VERCEL_API_TOKEN?.trim();
  const isVercelConfigured = !!(rawVercelToken && rawVercelToken.length > 5);

  // 7. Firebase Public Configuration
  const rawFbApiKey = envVars.VITE_FIREBASE_API_KEY?.trim();
  const rawFbProjectId = envVars.VITE_FIREBASE_PROJECT_ID?.trim() || "sitescout-ai-ec355";
  const rawFbAuthDomain = envVars.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const isFirebaseConfigured = !!(rawFbProjectId && (rawFbApiKey || rawFbAuthDomain));

  // 8. Mock & Fallback Policy
  // Allowed strictly in development and testing; forbidden in production and staging
  const allowMockFallbacks = env === "development" || env === "testing";

  const config: ServerConfig = {
    env,
    port,
    publicAppUrl,
    allowedOrigins,
    ai: {
      geminiApiKey: isAiConfigured ? rawGeminiKey : undefined,
      isConfigured: isAiConfigured
    },
    security: {
      outreachWebhookSecret: rawOutreachSecret,
      paymentWebhookSecret: rawPaymentSecret,
      isWebhookSecretConfigured
    },
    vercel: {
      apiToken: isVercelConfigured ? rawVercelToken : undefined,
      isConfigured: isVercelConfigured
    },
    firebase: {
      apiKey: rawFbApiKey,
      authDomain: rawFbAuthDomain,
      projectId: rawFbProjectId,
      storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
      messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
      appId: envVars.VITE_FIREBASE_APP_ID?.trim(),
      firestoreDatabaseId: "(default)",
      isConfigured: isFirebaseConfigured
    },
    allowMockFallbacks
  };

  return {
    config,
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Returns a completely sanitized version of configuration safe for logging and admin diagnostics.
 * Absolutely NO raw secrets, passwords, or API keys are exposed.
 */
export function formatSafeConfigSummary(config: ServerConfig): Record<string, any> {
  return {
    environment: config.env,
    port: config.port,
    publicAppUrl: config.publicAppUrl,
    allowedOrigins: config.allowedOrigins,
    integrations: {
      ai: {
        configured: config.ai.isConfigured,
        maskedKey: maskSecret(config.ai.geminiApiKey)
      },
      webhooks: {
        outreachConfigured: config.security.isWebhookSecretConfigured,
        paymentConfigured: !!config.security.paymentWebhookSecret,
        maskedSecret: maskSecret(config.security.outreachWebhookSecret)
      },
      hostingVercel: {
        configured: config.vercel.isConfigured,
        maskedToken: maskSecret(config.vercel.apiToken)
      },
      firebase: {
        configured: config.firebase.isConfigured,
        projectId: config.firebase.projectId || "[UNSET]",
        authDomain: config.firebase.authDomain || "[UNSET]"
      }
    },
    policies: {
      allowMockFallbacks: config.allowMockFallbacks
    }
  };
}

export class ConfigurationError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string = "CONFIGURATION_ERROR", status: number = 503) {
    super(message);
    this.name = "ConfigurationError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Asserts that a live integration is available and configured.
 * Strictly prevents mock fallbacks from silently impersonating live services in production.
 */
export function assertLiveIntegrationAvailable(
  integration: "ai" | "payment" | "hosting" | "webhook",
  config: ServerConfig
): void {
  if (integration === "ai") {
    if (!config.ai.isConfigured) {
      if (!config.allowMockFallbacks) {
        throw new ConfigurationError(
          "AI provider (Gemini) is not configured in production. Mock fallbacks are forbidden in production.",
          "AI_PROVIDER_UNCONFIGURED",
          503
        );
      }
    }
  }

  if (integration === "webhook") {
    if (!config.security.isWebhookSecretConfigured) {
      if (!config.allowMockFallbacks) {
        throw new ConfigurationError(
          "Webhook endpoint authentication secret is not configured in production.",
          "WEBHOOK_SECRET_UNCONFIGURED",
          503
        );
      }
    }
  }

  if (integration === "hosting") {
    if (!config.vercel.isConfigured) {
      throw new ConfigurationError(
        "Vercel live deployment token is not configured.",
        "HOSTING_TOKEN_UNCONFIGURED",
        400
      );
    }
  }

  if (integration === "payment") {
    if (!config.security.paymentWebhookSecret && !config.allowMockFallbacks) {
      throw new ConfigurationError(
        "Payment provider credentials not configured in production. Mock payment confirmations are forbidden.",
        "PAYMENT_PROVIDER_UNCONFIGURED",
        503
      );
    }
  }
}

/**
 * Scans strings or bundle contents for inadvertently committed private credentials.
 */
export function scanForExposedSecrets(content: string): { hasExposedSecrets: boolean; violations: string[] } {
  const violations: string[] = [];

  // Private key block
  if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
    violations.push("Found unencrypted private key block");
  }

  // High entropy AWS/Stripe/Vercel/OpenAI secret keys
  if (/sk_(live|test)_[0-9a-zA-Z]{24,}/.test(content)) {
    violations.push("Found exposed Stripe secret key");
  }

  if (/ghp_[0-9a-zA-Z]{36}/.test(content)) {
    violations.push("Found exposed GitHub personal access token");
  }

  return {
    hasExposedSecrets: violations.length > 0,
    violations
  };
}

/**
 * Validates that .gitignore properly excludes all .env files and preserves .env.example
 */
export function validateGitignoreProtectsSecrets(gitignoreContent: string): { isProtected: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lines = gitignoreContent.split("\n").map(l => l.trim());

  const hasEnvWildcard = lines.some(l => l === ".env*" || l === ".env" || l === ".env.local");
  const preservesExample = lines.some(l => l === "!.env.example");

  if (!hasEnvWildcard) {
    reasons.push("Missing .env* wildcard exclusion in .gitignore");
  }
  if (!preservesExample) {
    reasons.push("Missing !.env.example exception rule in .gitignore");
  }

  return {
    isProtected: reasons.length === 0,
    reasons
  };
}

/**
 * Validates that .env.example contains only safe placeholders and zero real production secrets.
 */
export function validateEnvExampleSafe(envExampleContent: string): { isSafe: boolean; violations: string[] } {
  const violations: string[] = [];
  const lines = envExampleContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...rest] = trimmed.split("=");
    const val = rest.join("=").trim();

    // Check for real secret patterns
    const secretScan = scanForExposedSecrets(val);
    if (secretScan.hasExposedSecrets) {
      violations.push(`Key '${key}' contains real secret: ${secretScan.violations.join(", ")}`);
    }

    // Check if key is a secret key but value is not a placeholder
    const isSecretKey = /(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/i.test(key);
    if (isSecretKey && val.length > 0) {
      const isPlaceholder = /(your_|example|placeholder|mock|change_me|insert_|my_)/i.test(val) || val === "";
      if (!isPlaceholder && !val.includes("your_")) {
        violations.push(`Key '${key}' appears to contain non-placeholder value '${maskSecret(val)}'`);
      }
    }
  }

  return {
    isSafe: violations.length === 0,
    violations
  };
}


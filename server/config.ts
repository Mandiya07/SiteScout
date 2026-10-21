import dotenv from "dotenv";
import { 
  validateServerConfig, 
  formatSafeConfigSummary, 
  ServerConfig, 
  ConfigValidationResult,
  assertLiveIntegrationAvailable,
  ConfigurationError,
  scanForExposedSecrets,
  validateGitignoreProtectsSecrets,
  validateEnvExampleSafe,
  normalizeEnvironment
} from "../src/lib/appConfig";

dotenv.config();

let cachedValidation: ConfigValidationResult | null = null;

export function initializeServerConfig(): ConfigValidationResult {
  if (!cachedValidation) {
    cachedValidation = validateServerConfig(process.env);

    if (cachedValidation.warnings.length > 0) {
      console.log(`[Config Notice] Environment: ${cachedValidation.config.env}`);
      for (const warn of cachedValidation.warnings) {
        console.log(`  ⚠ ${warn}`);
      }
    }

    if (!cachedValidation.isValid) {
      console.error(`[Config Critical Error] Configuration validation failed for environment '${cachedValidation.config.env}':`);
      for (const err of cachedValidation.errors) {
        console.error(`  ✖ ${err}`);
      }
      if (cachedValidation.config.env === "production") {
        console.error("[Config Safety Halt] Server cannot safely start in production with invalid configuration.");
      }
    } else {
      console.log(`[Config Initialized] Successfully loaded and validated configuration for '${cachedValidation.config.env}'`);
    }
  }
  return cachedValidation;
}

export function getServerConfig(): ServerConfig {
  if (!cachedValidation) {
    initializeServerConfig();
  }
  return cachedValidation!.config;
}

export { 
  validateServerConfig, 
  formatSafeConfigSummary, 
  assertLiveIntegrationAvailable, 
  ConfigurationError,
  scanForExposedSecrets,
  validateGitignoreProtectsSecrets,
  validateEnvExampleSafe,
  normalizeEnvironment
};

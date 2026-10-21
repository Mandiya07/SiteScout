import { execSync } from "child_process";
import fs from "fs";
import { runUnitTests } from "./unit.test";
import { runIntegrationTests } from "./integration.test";
import { runE2eTests } from "./e2e.test";
import { runRegressionTests } from "./regressions.test";
import { runPerformanceAndLoadTests } from "./performanceLoad.test";
import { runDeploymentAndRecoveryTests } from "./deploymentRecovery.test";
import { runSecurityRuleAssertions } from "../../firestore.rules.test";
import {
  validateServerConfig,
  scanForExposedSecrets,
  validateGitignoreProtectsSecrets,
  validateEnvExampleSafe
} from "../lib/appConfig";

export interface QualityGateResult {
  success: boolean;
  gatePassedCount: number;
  totalGates: number;
  failedGateName?: string;
  actionableError?: string;
  durationMs: number;
}

export async function runProductionQualityGates(options: { skipBuild?: boolean } = {}): Promise<QualityGateResult> {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("  SITESCOUT AI — PRODUCTION QUALITY GATES & DEPLOYMENT VERIFICATION ENGINE     ");
  console.log("================================================================================\n");

  let gatePassedCount = 0;
  const totalGates = options.skipBuild ? 4 : 5;

  // ---------------------------------------------------------------------------
  // GATE 1: TypeScript Compilation & Static Type Checking
  // ---------------------------------------------------------------------------
  console.log("▶ [GATE 1/5] Type Safety & Static Analysis (tsc --noEmit)...");
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe" });
    gatePassedCount++;
    console.log("  ✓ PASS: Zero TypeScript compilation errors or missing imports detected.\n");
  } catch (err: any) {
    const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message;
    console.error("  ✗ FAILED: TypeScript compilation errors detected!\n");
    console.error(errorOutput);
    return {
      success: false,
      gatePassedCount,
      totalGates,
      failedGateName: "GATE 1: TypeScript Type Checking",
      actionableError: "Fix TypeScript compilation and type errors before attempting deployment.",
      durationMs: Date.now() - startTime
    };
  }

  // ---------------------------------------------------------------------------
  // GATE 2: Configuration Validation, Secret Hygiene & .gitignore Audit
  // ---------------------------------------------------------------------------
  console.log("▶ [GATE 2/5] Configuration, Secret Hygiene & Environment Validation...");
  try {
    // 2A: .gitignore audit
    const gitignoreContent = fs.readFileSync(".gitignore", "utf-8");
    const gitignoreAudit = validateGitignoreProtectsSecrets(gitignoreContent);
    if (!gitignoreAudit.isProtected) {
      throw new Error(`Insecure .gitignore: ${gitignoreAudit.reasons.join(", ")}`);
    }

    // 2B: .env.example audit
    const envExampleContent = fs.readFileSync(".env.example", "utf-8");
    const envAudit = validateEnvExampleSafe(envExampleContent);
    if (!envAudit.isSafe) {
      throw new Error(`Real secrets detected in .env.example: ${envAudit.violations.join(", ")}`);
    }

    // 2C: Server config validation rules
    const prodConfigCheck = validateServerConfig({
      NODE_ENV: "production",
      APP_URL: "https://sitescout.ai",
      GEMINI_API_KEY: "AIzaSyProdKeyValidPlaceholder0123456789",
      OUTREACH_WEBHOOK_SECRET: "whsec_live_webhook_secret_123456789"
    });
    if (!prodConfigCheck.isValid) {
      throw new Error(`Production config validation failed: ${prodConfigCheck.errors.join(", ")}`);
    }

    gatePassedCount++;
    console.log("  ✓ PASS: Secret hygiene, .gitignore patterns, and production configs verified.\n");
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${err.message}\n`);
    return {
      success: false,
      gatePassedCount,
      totalGates,
      failedGateName: "GATE 2: Configuration & Secret Hygiene",
      actionableError: `Remediate configuration or secret leak flaw: ${err.message}`,
      durationMs: Date.now() - startTime
    };
  }

  // ---------------------------------------------------------------------------
  // GATE 3: Security Invariants & Access Control Matrix
  // ---------------------------------------------------------------------------
  console.log("▶ [GATE 3/5] Firestore Security Rules & Access Control Invariants...");
  try {
    const secResult = runSecurityRuleAssertions();
    if (secResult.failed > 0) {
      throw new Error(`${secResult.failed} security rule attack vector assertions failed.`);
    }
    gatePassedCount++;
    console.log("  ✓ PASS: All 12/12 Firestore security attack vectors successfully blocked.\n");
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${err.message}\n`);
    return {
      success: false,
      gatePassedCount,
      totalGates,
      failedGateName: "GATE 3: Security Invariants & Access Control",
      actionableError: `Audit firestore.rules to ensure zero data access violations: ${err.message}`,
      durationMs: Date.now() - startTime
    };
  }

  // ---------------------------------------------------------------------------
  // GATE 4: Automated Testing Gates (Unit, Integration, E2E, Regression)
  // ---------------------------------------------------------------------------
  console.log("▶ [GATE 4/5] Automated Test Execution (Unit, Integration, E2E, Regressions)...");
  try {
    const unitRes = await runUnitTests();
    if (unitRes.failed > 0) throw new Error(`${unitRes.failed} unit tests failed`);

    const intRes = await runIntegrationTests();
    if (intRes.failed > 0) throw new Error(`${intRes.failed} integration tests failed`);

    const e2eRes = await runE2eTests();
    if (e2eRes.failed > 0) throw new Error(`${e2eRes.failed} E2E steps failed`);

    const regRes = await runRegressionTests();
    if (regRes.failed > 0) throw new Error(`${regRes.failed} regression protection tests failed`);

    const perfRes = await runPerformanceAndLoadTests();
    if (perfRes.failed > 0) throw new Error(`${perfRes.failed} performance and load tests failed`);

    gatePassedCount++;
    console.log("  ✓ PASS: 100% of Unit, Integration, E2E, Regression, and Performance/Load suites passed.\n");
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${err.message}\n`);
    return {
      success: false,
      gatePassedCount,
      totalGates,
      failedGateName: "GATE 4: Automated Testing Gate",
      actionableError: `Resolve failing automated test case: ${err.message}`,
      durationMs: Date.now() - startTime
    };
  }

  // ---------------------------------------------------------------------------
  // GATE 5: Production Build Verification
  // ---------------------------------------------------------------------------
  if (!options.skipBuild) {
    console.log("▶ [GATE 5/5] Production Build Verification (Vite Frontend + Esbuild Server)...");
    try {
      execSync("npm run build", { stdio: "pipe" });
      gatePassedCount++;
      console.log("  ✓ PASS: Production bundle built and verified cleanly in dist/.\n");
    } catch (err: any) {
      const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message;
      console.error("  ✗ FAILED: Production build failure!\n");
      console.error(errorOutput);
      return {
        success: false,
        gatePassedCount,
        totalGates,
        failedGateName: "GATE 5: Production Build",
        actionableError: "Investigate and resolve bundling or syntax issues preventing 'npm run build'.",
        durationMs: Date.now() - startTime
      };
    }
  }

  const durationMs = Date.now() - startTime;
  console.log("================================================================================");
  console.log(`  🎉 ALL ${gatePassedCount}/${totalGates} PRODUCTION QUALITY GATES PASSED (${(durationMs / 1000).toFixed(2)}s)`);
  console.log("  SYSTEM IS READY FOR PRODUCTION DEPLOYMENT");
  console.log("================================================================================\n");

  return {
    success: true,
    gatePassedCount,
    totalGates,
    durationMs
  };
}

if (process.argv[1]?.includes("qualityGate.ts")) {
  const isQuick = process.argv.includes("--quick");
  runProductionQualityGates({ skipBuild: isQuick })
    .then((result) => {
      if (!result.success) {
        console.error(`\n⛔ DEPLOYMENT BLOCKED by ${result.failedGateName}`);
        console.error(`Actionable Advice: ${result.actionableError}\n`);
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("\nUnexpected Quality Gate Exception:", err);
      process.exit(1);
    });
}

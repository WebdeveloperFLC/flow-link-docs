#!/usr/bin/env node
/**
 * HR Payroll AI Auto-Test Runner
 * Runs engine vectors, module contract, RBAC, attendance + optional live DB smoke.
 * Exit 0 only when all suites pass (pre-UAT gate — target 95%+ issue elimination).
 */
import { spawnSync } from "child_process";

console.log("\n═══ HR Payroll AI Auto-Test ═══\n");

const vitest = spawnSync(
  "npx",
  ["vitest", "run", "qa/hr-payroll", "--reporter=verbose"],
  { stdio: "inherit", shell: true, cwd: process.cwd() },
);

const ok = vitest.status === 0;
console.log(`\nPre-UAT gate: ${ok ? "✓ PASS — safe to proceed to human UAT" : "✗ FAIL — fix before UAT"}\n`);
console.log(
  "Optional live DB: HR_INTEGRATION_TEST=1 (use .env URL; add SUPABASE_SERVICE_ROLE_KEY for TV02 checks)\n",
);
process.exit(ok ? 0 : 1);

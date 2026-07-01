#!/usr/bin/env node
/**
 * Phase 3 F3.4 gate — apply migrations (optional) + run SQL verification + unit tests.
 *
 * Local Supabase (Docker):
 *   npx supabase start
 *   npx supabase db reset   # applies all migrations including Step 0 + F3.4
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node scripts/commission-phase3-f34-verify.mjs
 *
 * Remote (Lovable / linked project):
 *   export SUPABASE_ACCESS_TOKEN=sbp_...
 *   npx supabase link --project-ref auofttkyosgjhxcbhscw
 *   npx supabase db push
 *   DATABASE_URL=<pooler-url-from-dashboard> node scripts/commission-phase3-f34-verify.mjs
 *
 * Unit tests only (no DB):
 *   node scripts/commission-phase3-f34-verify.mjs --unit-only
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SQL_FILE = path.join(ROOT, "supabase/tests/commission_phase3_f34_verification.sql");

const unitOnly = process.argv.includes("--unit-only");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: ROOT, ...opts });
  return r.status === 0;
}

function header(title) {
  console.log(`\n═══ ${title} ═══\n`);
}

header("Commission Phase 3 — F3.4 verification gate");

const unitOk = run("npx", [
  "vitest",
  "run",
  "src/institutions/lib/commissionRuleResolver.test.ts",
  "src/institutions/lib/commissionEligibilityEvaluator.test.ts",
  "src/institutions/lib/commissionReceiptRules.test.ts",
  "--reporter=verbose",
]);

if (!unitOk) {
  console.error("\n✗ Unit regression FAILED — stop before F3.3.\n");
  process.exit(1);
}
console.log("\n✓ Unit regression PASSED (14 tests)\n");

if (unitOnly) {
  console.log("Unit-only mode — skipping SQL verification.\n");
  process.exit(0);
}

const dbUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(`✗ SQL verification SKIPPED — set DATABASE_URL (or SUPABASE_DB_URL).

Prerequisites missing on this machine:
  • Docker Desktop (for npx supabase start), OR
  • DATABASE_URL to project Postgres, OR
  • SUPABASE_ACCESS_TOKEN + npx supabase db push (remote)

See docs/commission/PHASE3_F34_DISCREPANCY_REPORT.md (ENV-001).
`);
  process.exit(2);
}

if (!fs.existsSync(SQL_FILE)) {
  console.error(`✗ Missing ${SQL_FILE}`);
  process.exit(1);
}

header("SQL verification (F3.4 acceptance)");
const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", SQL_FILE], {
  stdio: "inherit",
  cwd: ROOT,
});

if (psql.status !== 0) {
  console.error("\n✗ SQL verification FAILED — do not start F3.3.\n");
  process.exit(1);
}

console.log("\n✓ SQL verification PASSED\n");
console.log("Next: run manual Phase 1 / 2A / 2B UAT scripts under tightened RLS.\n");
process.exit(0);

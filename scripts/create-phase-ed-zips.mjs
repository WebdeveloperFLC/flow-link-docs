#!/usr/bin/env node
/**
 * Create Phase E + D review bundles (same pattern as phase-a/b/c).
 * Usage: node scripts/create-phase-ed-zips.mjs
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

const phaseEFiles = [
  "supabase/migrations/20260718120050_test_attempts.sql",
  "src/lib/profile/testAttempts.ts",
  "src/lib/profile/testAttemptFormRules.ts",
  "src/lib/profile/testAttemptSummary.ts",
  "src/lib/profile/testAttemptCompletion.ts",
  "src/components/profile/ProfileTestsPanel.tsx",
  "src/components/profile/TestAttemptForm.tsx",
  "src/components/profile/TestAttemptList.tsx",
  "src/components/clients/UnifiedProfileCard.tsx",
  "src/lib/profile/summarizeProfile.ts",
  "src/lib/profile/profileCompletion.ts",
  "docs/guides/PHASE_E_UAT.md",
  "review-bundles/phase-e/PHASE_E_EXECUTIVE_SUMMARY.md",
  "review-bundles/phase-e/FILES_CHANGED.md",
  "review-bundles/phase-e/TEST_RESULTS.md",
  "review-bundles/phase-e/UAT_CHECKLIST.md",
];

const phaseDFiles = [
  "src/components/leads/LeadProfileDetailsEditor.tsx",
  "src/components/leads/LeadDocumentPlaceholder.tsx",
  "src/components/leads/LeadBackgroundDetailsDialog.tsx",
  "src/lib/leadBackgroundProfileBridge.ts",
  "src/components/profile/LinkedDocumentsPanel.tsx",
  "docs/guides/PHASE_D_UAT.md",
  "review-bundles/phase-d/PHASE_D_EXECUTIVE_SUMMARY.md",
  "review-bundles/phase-d/FILES_CHANGED.md",
  "review-bundles/phase-d/TEST_RESULTS.md",
  "review-bundles/phase-d/UAT_CHECKLIST.md",
];

function stage(files, stagingDir) {
  rmSync(stagingDir, { recursive: true, force: true });
  for (const f of files) {
    const dest = join(stagingDir, f);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(root, f), dest);
  }
}

function zipReviewBundle(subdir, outName) {
  execSync(`cd "${root}" && zip -r "${outName}" "review-bundles/${subdir}/"`, { stdio: "inherit" });
}

zipReviewBundle("phase-e", "phase-e-review-bundle.zip");
zipReviewBundle("phase-d", "phase-d-review-bundle.zip");

// Source code snapshots
stage(phaseEFiles, join(root, ".zip-staging-e"));
execSync(`cd "${join(root, ".zip-staging-e")}" && zip -r "${join(root, "phase-e-source-code.zip")}" .`, {
  stdio: "inherit",
});

stage(phaseDFiles, join(root, ".zip-staging-d"));
execSync(`cd "${join(root, ".zip-staging-d")}" && zip -r "${join(root, "phase-d-source-code.zip")}" .`, {
  stdio: "inherit",
});

// Combined E+D for one download
execSync(
  `cd "${root}" && zip -r phase-ed-review-bundle.zip review-bundles/phase-e review-bundles/phase-d docs/guides/PHASE_E_UAT.md docs/guides/PHASE_D_UAT.md`,
  { stdio: "inherit" },
);

console.log("Created:");
console.log("  phase-e-review-bundle.zip");
console.log("  phase-d-review-bundle.zip");
console.log("  phase-e-source-code.zip");
console.log("  phase-d-source-code.zip");
console.log("  phase-ed-review-bundle.zip");

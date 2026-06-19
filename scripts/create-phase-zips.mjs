#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

const b5Files = [
  "src/App.tsx",
  "src/components/clients/UnifiedProfileCard.tsx",
  "src/components/clients/UnifiedProfileCard.client360.test.tsx",
  "src/components/profile/Client360ExecutivePanel.tsx",
  "src/components/profile/ProfileTabNav.test.tsx",
  "src/components/profile/ProfileTabNav.tsx",
  "src/components/profile/index.ts",
  "src/hooks/profile/useProfileEditor.ts",
  "src/lib/profile/client360Sections.ts",
  "src/lib/profile/client360Sections.test.ts",
  "src/lib/profile/mockProfileViewModel.ts",
  "src/lib/profile/toEditState.ts",
  "src/lib/profile/types.ts",
  "src/pages/dev/ProfilePreviewDevPage.tsx",
  "scripts/capture-phase-b5-screenshots.mjs",
  "review-bundles/phase-b5/PHASE_B5_EXECUTIVE_SUMMARY.md",
  "review-bundles/phase-b5/02_DEEP_LINK_AUDIT.md",
  "review-bundles/phase-b5/03_PROFILE_TAB_NAV_AUDIT.md",
  "review-bundles/phase-b5/04_TEST_RESULTS.md",
  "review-bundles/phase-b5/05_FILES_CHANGED.md",
  "review-bundles/phase-b5/06_PRODUCTION_IMPACT_AUDIT.md",
];

const cExtra = [
  "src/pages/ClientDetail.tsx",
  "review-bundles/phase-c/PHASE_C_EXECUTIVE_SUMMARY.md",
  "review-bundles/phase-c/FILES_CHANGED.md",
  "review-bundles/phase-c/FIELD_PRESERVATION_AUDIT.md",
  "review-bundles/phase-c/DOCUMENT_REF_INTEGRITY_AUDIT.md",
  "review-bundles/phase-c/MODULE_ISOLATION_AUDIT.md",
  "review-bundles/phase-c/PRODUCTION_IMPACT_AUDIT.md",
  "review-bundles/phase-c/UAT_CHECKLIST.md",
  "review-bundles/phase-c/TEST_RESULTS.md",
];

function stage(files, stagingDir) {
  rmSync(stagingDir, { recursive: true, force: true });
  for (const f of files) {
    const dest = join(stagingDir, f);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(root, f), dest);
  }
}

function zip(dir, outZip) {
  execSync(`cd "${dir}" && zip -r "${outZip}" .`, { stdio: "inherit" });
}

stage(b5Files, join(root, ".zip-staging-b5"));
zip(join(root, ".zip-staging-b5"), join(root, "phase-b5-source-code.zip"));

stage([...b5Files, ...cExtra], join(root, ".zip-staging-c"));
zip(join(root, ".zip-staging-c"), join(root, "PHASE_C_SOURCE_CODE.zip"));

execSync(`cd "${root}" && zip -r phase-b5-verification-bundle.zip review-bundles/phase-b5/`, { stdio: "inherit" });
execSync(`cd "${root}" && zip -r PHASE_C_REVIEW_BUNDLE.zip review-bundles/phase-c/`, { stdio: "inherit" });

console.log("Created: phase-b5-verification-bundle.zip, phase-b5-source-code.zip, PHASE_C_REVIEW_BUNDLE.zip, PHASE_C_SOURCE_CODE.zip");

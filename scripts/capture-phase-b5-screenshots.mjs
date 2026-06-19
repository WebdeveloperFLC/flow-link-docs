#!/usr/bin/env node
/**
 * Capture Phase B.5 verification screenshots from /dev/profile-preview.
 * Usage: node scripts/capture-phase-b5-screenshots.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../review-bundles/phase-b5/01_SCREENSHOTS");
const BASE = process.argv[2] ?? "http://127.0.0.1:5173";

const shots = [
  { file: "01_unified_profile_view.png", url: `${BASE}/dev/profile-preview?tab=identity&mode=view` },
  { file: "02_identity_edit.png", url: `${BASE}/dev/profile-preview?tab=identity&mode=edit` },
  { file: "03_tests_edit.png", url: `${BASE}/dev/profile-preview?tab=tests&mode=edit` },
  { file: "04_education_linked_docs.png", url: `${BASE}/dev/profile-preview?tab=education&mode=edit&openLink=1` },
  { file: "05_services_block.png", url: `${BASE}/dev/profile-preview?tab=identity&mode=view` },
  { file: "06_six_pills_client360.png", url: `${BASE}/dev/profile-preview?tab=client360&mode=view` },
  { file: "07_client360_registry.png", url: `${BASE}/dev/profile-preview?tab=client360&mode=view` },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const shot of shots) {
  await page.goto(shot.url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="unified-profile-card"]', { timeout: 60000 });

  const url = new URL(shot.url);
  const tab = url.searchParams.get("tab") ?? "identity";
  const mode = url.searchParams.get("mode") ?? "view";
  const openLink = url.searchParams.get("openLink") === "1";

  await page.click(`[data-testid="profile-tab-${tab}"]`);
  if (mode === "edit" && tab !== "client360") {
    await page.getByRole("button", { name: /edit/i }).click();
  }
  if (openLink && tab === "education") {
    await page.getByRole("button", { name: /^link/i }).first().click();
  }

  const outPath = path.join(OUT, shot.file);
  if (shot.file === "05_services_block.png") {
    await page.waitForSelector('[data-testid="profile-services-block"]', { timeout: 30000 });
    await page.locator('[data-testid="profile-services-block"]').screenshot({ path: outPath });
  } else if (shot.file === "06_six_pills_client360.png") {
    await page.waitForSelector('[data-testid="profile-tab-nav"]', { timeout: 30000 });
    await page.locator('[data-testid="profile-tab-nav"]').screenshot({ path: outPath });
  } else if (shot.file === "07_client360_registry.png") {
    await page.waitForSelector('[data-testid="profile-section-client360"]', { timeout: 30000 });
    await page.locator('[data-testid="profile-section-client360"]').screenshot({ path: outPath });
  } else if (shot.file === "04_education_linked_docs.png") {
    await page.waitForSelector('[data-testid="profile-section-education"]', { timeout: 30000 });
    await page.locator('[data-testid="profile-section-education"]').screenshot({ path: outPath });
  } else if (shot.file === "03_tests_edit.png") {
    await page.waitForSelector('[data-testid="profile-section-tests"]', { timeout: 30000 });
    await page.locator('[data-testid="profile-section-tests"]').screenshot({ path: outPath });
  } else {
    await page.locator('[data-testid="unified-profile-card"]').screenshot({ path: outPath });
  }
  console.log(`✓ ${shot.file}`);
}

await browser.close();
console.log(`Screenshots saved to ${OUT}`);

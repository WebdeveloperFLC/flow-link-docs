import { defineConfig, devices } from "@playwright/test";

// FLC CMS — Playwright E2E config. Runs against a SEEDED staging/preview DB.
// Auth state per role is captured once (global setup) and reused per project.
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["html", { outputFolder: "qa-report/playwright-html" }],
    ["json", { outputFile: "qa-report/playwright.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "counselor", use: { ...devices["Desktop Chrome"], storageState: ".auth/counselor.json" } },
    { name: "branch", use: { ...devices["Desktop Chrome"], storageState: ".auth/branch.json" } },
    { name: "finance", use: { ...devices["Desktop Chrome"], storageState: ".auth/finance.json" } },
    { name: "executive", use: { ...devices["Desktop Chrome"], storageState: ".auth/executive.json" } },
    {
      name: "mobile-counselor",
      use: { ...devices["Pixel 7"], storageState: ".auth/counselor.json" },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
});

/**
 * Captures role auth states + optional test-data seed for E2E.
 * Requires E2E_BASE_URL and demo credentials in env (see docs/INCENTIVE_CMS_PHASE1_DEPLOY.md).
 */
export default async function globalSetup() {
  if (!process.env.E2E_BASE_URL) {
    console.warn("[e2e] E2E_BASE_URL unset — golden lifecycle specs are skipped at runtime.");
    return;
  }
  // TODO: login per role → write .auth/*.json; invoke qa/generators apply() on staging only.
}

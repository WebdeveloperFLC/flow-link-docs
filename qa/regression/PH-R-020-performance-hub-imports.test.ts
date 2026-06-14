import { describe, expect, it } from "vitest";

/**
 * PH-R-020 — Performance Hub modules must load without ReferenceError.
 * Catches missing lucide-react imports (e.g. Users is not defined) that
 * Vite build skips but crash the app at runtime.
 */
const performanceModules = import.meta.glob([
  "/src/components/performance/*.tsx",
  "/src/pages/Performance*.tsx",
]);

describe("PH-R-020 performance hub module imports", () => {
  it("discovers performance hub modules", () => {
    expect(Object.keys(performanceModules).length).toBeGreaterThan(20);
  });

  for (const [path, loader] of Object.entries(performanceModules)) {
    it(`loads ${path} without ReferenceError`, async () => {
      await expect(loader()).resolves.toBeDefined();
    });
  }
});

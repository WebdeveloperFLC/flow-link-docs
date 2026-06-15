import { describe, expect, it } from "vitest";

/**
 * SL-R-002 — Service Library UI modules must load without ReferenceError.
 * Catches missing lucide-react imports (e.g. Wallet is not defined).
 */
const serviceLibraryModules = import.meta.glob([
  "/src/components/service-library/**/*.tsx",
  "/src/pages/ServiceLibrary.tsx",
  "/src/pages/ServiceLibraryAdmin.tsx",
]);

describe("SL-R-002 service library module imports", () => {
  it("discovers service library modules", () => {
    expect(Object.keys(serviceLibraryModules).length).toBeGreaterThan(15);
  });

  for (const [path, loader] of Object.entries(serviceLibraryModules)) {
    it(`loads ${path} without ReferenceError`, async () => {
      await expect(loader()).resolves.toBeDefined();
    });
  }
});

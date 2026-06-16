import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CRM-R-001 — Client/lead service labels must use useServiceLabelMap or resolveServiceLabelSync,
 * not naive catalogueItemCode → service_name maps (fails for variant UUID codes).
 */
const SURFACES = [
  "src/components/clients/ClientServicesCard.tsx",
  "src/components/clients/SelectedServicesPanel.tsx",
  "src/components/leads/TabSelectedServices.tsx",
  "src/components/clients/ClientServiceSwitcher.tsx",
];

describe("CRM-R-001 service label resolution", () => {
  for (const rel of SURFACES) {
    it(`${rel} uses canonical label resolution`, () => {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      const usesCanonical =
        src.includes("useServiceLabelMap") ||
        src.includes("resolveServiceLabelSync") ||
        src.includes("labelByCode");
      expect(usesCanonical, `${rel} must use useServiceLabelMap or resolveServiceLabelSync`).toBe(true);

      const naiveMap = /useMemo\(\(\)\s*=>\s*\{[\s\S]*catalogueItemCode\(item\),\s*item\.service_name/;
      expect(naiveMap.test(src), `${rel} must not build naive catalogue-only label map`).toBe(false);
    });
  }
});

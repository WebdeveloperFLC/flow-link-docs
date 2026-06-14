import { describe, expect, it } from "vitest";
import {
  CONFIGURATION_TILES,
  INVOICE_COMMERCIAL_CONTROLS,
  configurationCmsKpis,
} from "./configurationCmsLogic";

describe("configurationCmsLogic", () => {
  it("defines eight configuration tiles", () => {
    expect(CONFIGURATION_TILES).toHaveLength(8);
    expect(CONFIGURATION_TILES.every((t) => t.to.startsWith("/"))).toBe(true);
  });

  it("builds KPI counts", () => {
    const kpis = configurationCmsKpis();
    expect(kpis.configAreas).toBe(8);
    expect(kpis.invoiceRules).toBe(INVOICE_COMMERCIAL_CONTROLS.filter((r) => r.enabled).length);
  });
});

import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_API_ROWS,
  ARCHITECTURE_TABLES,
  architectureCmsKpis,
  methodBadgeClass,
} from "./architectureCmsLogic";

describe("architectureCmsLogic", () => {
  it("lists core tables and API rows", () => {
    expect(ARCHITECTURE_TABLES.length).toBeGreaterThan(10);
    expect(ARCHITECTURE_API_ROWS.length).toBeGreaterThan(10);
  });

  it("builds KPI counts", () => {
    const kpis = architectureCmsKpis();
    expect(kpis.tables).toBe(ARCHITECTURE_TABLES.length);
    expect(kpis.rpcFunctions).toBeGreaterThan(0);
  });

  it("styles HTTP methods", () => {
    expect(methodBadgeClass("GET")).toContain("sky");
    expect(methodBadgeClass("POST")).toContain("emerald");
  });
});

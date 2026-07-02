import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CRM-R-013 — Dashboard Total Clients must load for admin/counselor (executive mode "full"),
 * not only telecaller (mode "summary").
 */
describe("CRM-R-013 dashboard client count", () => {
  it("fetchDashboardExecutiveData counts clients for all needAdmissions modes", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/dashboard/lib/fetchDashboardData.ts"),
      "utf8",
    );
    expect(src).not.toMatch(
      /needAdmissions\s*&&\s*mode\s*===\s*"summary"\s*\n\s*\?\s*supabase\.from\("clients"\)/,
    );
    expect(src).toMatch(
      /needAdmissions\s*\n\s*\?\s*supabase\.from\("clients"\)\.select\("\*", \{ count: "exact", head: true \}\)/,
    );
  });
});

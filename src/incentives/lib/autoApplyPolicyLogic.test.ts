import { describe, expect, it } from "vitest";
import { mergeAutoApplyRows, parseCrmHealth, POLICY_LABELS } from "./autoApplyPolicyLogic";

describe("autoApplyPolicyLogic", () => {
  it("merges DB rows with defaults", () => {
    const rows = mergeAutoApplyRows([
      { entity_type: "service", policy: "require_opt_in" },
      { entity_type: "country", policy: "auto_include" },
    ]);
    expect(rows.find((r) => r.entityType === "service")?.policy).toBe("require_opt_in");
    expect(rows).toHaveLength(5);
  });

  it("labels policies", () => {
    expect(POLICY_LABELS.inherit_parent).toBe("Inherit parent rules");
  });

  it("parses CRM health JSON", () => {
    const health = parseCrmHealth({
      sync_status: "ok",
      entities: [{ key: "clients", label: "Clients", count: 10 }],
      checks: [{ key: "master_data", label: "Master data sync", status: "ok" }],
    });
    expect(health.entities[0].count).toBe(10);
    expect(health.syncStatus).toBe("ok");
  });
});

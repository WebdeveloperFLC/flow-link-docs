import { describe, expect, it } from "vitest";
import { diffRecordFields, formatFieldChanges, formatActivityAction } from "@/lib/clientActivityLog";

describe("clientActivityLog helpers", () => {
  it("diffRecordFields detects changes", () => {
    const changes = diffRecordFields(
      { email: "a@b.com", phone: "123" },
      { email: "c@d.com", phone: "123" },
      ["email", "phone"],
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("email");
  });

  it("formatFieldChanges builds prev/new blocks", () => {
    const { previousValue, newValue } = formatFieldChanges([
      { field: "email", previous: "old@test.com", next: "new@test.com" },
    ]);
    expect(previousValue).toContain("email: old@test.com");
    expect(newValue).toContain("email: new@test.com");
  });

  it("formatActivityAction humanizes action keys", () => {
    expect(formatActivityAction("lead_converted")).toBe("Lead Converted");
    expect(formatActivityAction("internal_sub_status_changed")).toBe("Internal Sub Status Changed");
  });
});

describe("resolveClientDetailTab staging removal", () => {
  it("redirects legacy staging URLs to overview", async () => {
    const { resolveClientDetailTab } = await import("@/components/clients/ClientDetailTabNav");
    expect(resolveClientDetailTab("staging")).toBe("overview");
    expect(resolveClientDetailTab("setup")).toBe("overview");
  });
});

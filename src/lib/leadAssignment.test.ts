import { describe, expect, it } from "vitest";
import { isActiveProfile, mergePrimaryUserOptions } from "@/lib/leadAssignment";

describe("leadAssignment", () => {
  it("treats null/empty status as active", () => {
    expect(isActiveProfile(null)).toBe(true);
    expect(isActiveProfile("active")).toBe(true);
    expect(isActiveProfile("inactive")).toBe(false);
  });

  it("keeps current assignee in options when outside branch/dept filter", () => {
    const merged = mergePrimaryUserOptions(
      [{ id: "a", name: "Alice" }],
      "b",
      "Bob",
    );
    expect(merged.map((o) => o.id)).toEqual(["b", "a"]);
    expect(merged[0].name).toBe("Bob");
  });

  it("does not duplicate selected user in eligible list", () => {
    const merged = mergePrimaryUserOptions(
      [{ id: "a", name: "Alice" }],
      "a",
      "Alice",
    );
    expect(merged).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  auditSlabGroups,
  isDuplicateSlab,
  nextSlabMin,
  validateNewSlab,
} from "./incentiveSlabValidation";

const base = {
  source_type: "service_revenue",
  metric: "net_revenue",
  service_filter: null as string | null,
  rate_type: "percent",
  rate_value: 5,
};

describe("validateNewSlab", () => {
  it("requires first slab to start at 0", () => {
    const r = validateNewSlab([], { ...base, min_threshold: 100, max_threshold: 200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/start at min 0/);
  });

  it("requires max > min", () => {
    const r = validateNewSlab([], { ...base, min_threshold: 0, max_threshold: 0 });
    expect(r.ok).toBe(false);
  });

  it("requires continuous next min", () => {
    const existing = [{ ...base, min_threshold: 0, max_threshold: 100 }];
    const r = validateNewSlab(existing, { ...base, min_threshold: 400, max_threshold: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Gap not allowed/);
  });

  it("accepts continuous chain", () => {
    const existing = [{ ...base, min_threshold: 0, max_threshold: 100 }];
    const r = validateNewSlab(existing, { ...base, min_threshold: 100, max_threshold: 200, rate_value: 9 });
    expect(r.ok).toBe(true);
  });

  it("rejects duplicate", () => {
    const existing = [{ ...base, min_threshold: 0, max_threshold: 100 }];
    const r = validateNewSlab(existing, { ...base, min_threshold: 0, max_threshold: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Duplicate/);
  });

  it("blocks append after open-ended slab", () => {
    const existing = [{ ...base, min_threshold: 0, max_threshold: null }];
    const r = validateNewSlab(existing, { ...base, min_threshold: 100, max_threshold: 200 });
    expect(r.ok).toBe(false);
  });
});

describe("nextSlabMin", () => {
  it("returns 0 for empty group", () => {
    expect(nextSlabMin([], base)).toBe(0);
  });

  it("returns last max for continuous chain", () => {
    const existing = [
      { ...base, min_threshold: 0, max_threshold: 100 },
      { ...base, min_threshold: 100, max_threshold: 200 },
    ];
    expect(nextSlabMin(existing, base)).toBe(200);
  });
});

describe("isDuplicateSlab", () => {
  it("treats blank service filter as same group", () => {
    const a = { ...base, min_threshold: 0, max_threshold: 100, service_filter: null };
    const b = { ...base, min_threshold: 0, max_threshold: 100, service_filter: "" };
    expect(isDuplicateSlab(a, b)).toBe(true);
  });
});

describe("auditSlabGroups", () => {
  it("flags gap in existing data", () => {
    const issues = auditSlabGroups([
      { ...base, min_threshold: 0, max_threshold: 100 },
      { ...base, min_threshold: 400, max_threshold: 500 },
    ]);
    expect(issues.some((i) => i.message.includes("Gap"))).toBe(true);
  });
});

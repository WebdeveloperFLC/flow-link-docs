import { describe, expect, it } from "vitest";
import {
  gridRowsToSlabTable,
  slabTableToGridRows,
  suggestNextSlabRow,
  validateLateSlabGrid,
} from "@/hr-payroll/lib/lateSlabGrid";
import { DEFAULT_LATE_SLAB_TABLE } from "@/hr-payroll/lib/leavePolicy";

describe("lateSlabGrid", () => {
  it("converts stored JSON to grid rows and back", () => {
    const stored = [
      { max: 3, deduction: 1 },
      { max: 6, deduction: 1.5 },
      { max: 9, deduction: 2 },
    ];
    const grid = slabTableToGridRows(stored);
    expect(grid).toEqual([
      { from: 1, to: 3, deduction: 1 },
      { from: 4, to: 6, deduction: 1.5 },
      { from: 7, to: 9, deduction: 2 },
    ]);
    expect(gridRowsToSlabTable(grid)).toEqual(stored);
  });

  it("loads default company policy into grid", () => {
    const grid = slabTableToGridRows(DEFAULT_LATE_SLAB_TABLE);
    expect(grid[0]).toEqual({ from: 1, to: 3, deduction: 1.0 });
    expect(grid[grid.length - 1]).toEqual({ from: 25, to: 27, deduction: 5.0 });
  });

  it("blocks overlapping and invalid ranges", () => {
    expect(validateLateSlabGrid([{ from: 1, to: 3, deduction: 1 }])).toEqual({ ok: true });
    const overlap = validateLateSlabGrid([
      { from: 1, to: 3, deduction: 1 },
      { from: 3, to: 6, deduction: 1.5 },
    ]);
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) {
      expect(overlap.errors.some((e) => e.includes("overlap"))).toBe(true);
    }
    const badDed = validateLateSlabGrid([{ from: 4, to: 6, deduction: 0 }]);
    expect(badDed.ok).toBe(false);
    const badFromTo = validateLateSlabGrid([{ from: 6, to: 4, deduction: 1 }]);
    expect(badFromTo.ok).toBe(false);
  });

  it("suggests next consecutive slab row", () => {
    expect(suggestNextSlabRow([{ from: 1, to: 3, deduction: 1 }])).toEqual({
      from: 4,
      to: 6,
      deduction: 1.5,
    });
  });
});

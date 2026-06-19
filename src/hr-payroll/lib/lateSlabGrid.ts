/** UI-only helpers: grid editor ↔ stored slab_table JSON. No payroll calculation logic. */

export type LateSlabGridRow = { from: number; to: number; deduction: number };
export type LateSlabStoredRow = { max: number; deduction: number };

export function formatSlabRange(row: Pick<LateSlabGridRow, "from" | "to">): string {
  return `${row.from}–${row.to}`;
}

export function formatSlabLabel(row: LateSlabGridRow): string {
  return `${formatSlabRange(row)} (${row.deduction}d)`;
}

export function sortGridRows(rows: LateSlabGridRow[]): LateSlabGridRow[] {
  return [...rows].sort((a, b) => a.from - b.from || a.to - b.to);
}

export function slabTableToGridRows(slabs: LateSlabStoredRow[]): LateSlabGridRow[] {
  const sorted = [...slabs].sort((a, b) => a.max - b.max);
  let prev = 0;
  return sorted.map((row) => {
    const from = prev + 1;
    prev = row.max;
    return { from, to: row.max, deduction: row.deduction };
  });
}

export function gridRowsToSlabTable(rows: LateSlabGridRow[]): LateSlabStoredRow[] {
  return sortGridRows(rows).map((r) => ({ max: r.to, deduction: r.deduction }));
}

export function suggestNextSlabRow(rows: LateSlabGridRow[]): LateSlabGridRow {
  if (rows.length === 0) return { from: 1, to: 3, deduction: 1 };
  const sorted = sortGridRows(rows);
  const last = sorted[sorted.length - 1]!;
  const from = last.to + 1;
  return { from, to: from + 2, deduction: last.deduction + 0.5 };
}

export function validateLateSlabGrid(
  rows: LateSlabGridRow[],
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("At least one late deduction slab is required.");
    return { ok: false, errors };
  }

  const sorted = sortGridRows(rows);
  const seen = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    const label = formatSlabRange(row);

    if (!Number.isFinite(row.from) || !Number.isFinite(row.to) || !Number.isFinite(row.deduction)) {
      errors.push(`Row ${label}: all values must be numeric.`);
      continue;
    }
    if (row.from > row.to) {
      errors.push(`Row ${label}: From must be less than or equal to To.`);
    }
    if (row.deduction <= 0) {
      errors.push(`Row ${label}: Deduction must be greater than 0.`);
    }
    if (seen.has(label)) {
      errors.push(`Duplicate range ${label}.`);
    }
    seen.add(label);

    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (row.from <= prev.to) {
        errors.push(
          `Range ${label} overlaps with ${formatSlabRange(prev)} (ranges must not overlap).`,
        );
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

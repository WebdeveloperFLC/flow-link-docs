/**
 * Slab range validation — continuous tiers, no gaps, no duplicates.
 */

export type SlabLike = {
  source_type: string;
  metric: string;
  service_filter?: string | null;
  rate_type: string;
  min_threshold: number;
  max_threshold: number | null;
  rate_value: number;
};

export function normalizeServiceFilter(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t || null;
}

export function slabGroupKey(s: Pick<SlabLike, "source_type" | "metric" | "service_filter">): string {
  return `${s.source_type}|${s.metric}|${normalizeServiceFilter(s.service_filter) ?? ""}`;
}

export function isDuplicateSlab(a: SlabLike, b: SlabLike): boolean {
  return (
    slabGroupKey(a) === slabGroupKey(b) &&
    a.min_threshold === b.min_threshold &&
    (a.max_threshold ?? null) === (b.max_threshold ?? null) &&
    a.rate_type === b.rate_type &&
    a.rate_value === b.rate_value
  );
}

export function slabsInGroup(all: SlabLike[], input: Pick<SlabLike, "source_type" | "metric" | "service_filter">): SlabLike[] {
  const key = slabGroupKey(input);
  return all.filter((s) => slabGroupKey(s) === key).sort((a, b) => a.min_threshold - b.min_threshold);
}

/** Min for the next slab in a continuous chain (0 if none yet). null = blocked (∞ tail exists). */
export function nextSlabMin(all: SlabLike[], input: Pick<SlabLike, "source_type" | "metric" | "service_filter">): number | null {
  const group = slabsInGroup(all, input);
  if (group.length === 0) return 0;
  const last = group[group.length - 1];
  if (last.max_threshold == null) return null;
  return last.max_threshold;
}

export function validateNewSlab(existing: SlabLike[], input: SlabLike): { ok: true } | { ok: false; error: string } {
  const { min_threshold: min, max_threshold: max } = input;

  if (!Number.isFinite(min) || min < 0) {
    return { ok: false, error: "Min threshold must be 0 or greater." };
  }
  if (max != null && (!Number.isFinite(max) || max <= min)) {
    return { ok: false, error: "Max must be greater than min (or leave blank for open-ended top tier)." };
  }
  if (!Number.isFinite(input.rate_value)) {
    return { ok: false, error: "Rate value is required." };
  }

  for (const e of existing) {
    if (isDuplicateSlab(e, input)) {
      return { ok: false, error: "Duplicate slab — same source, metric, service, range, and rate already exists." };
    }
  }

  const group = slabsInGroup(existing, input);

  if (group.length === 0) {
    if (min !== 0) {
      return { ok: false, error: "First slab in a chain must start at min 0." };
    }
    return { ok: true };
  }

  const last = group[group.length - 1];
  if (last.max_threshold == null) {
    return {
      ok: false,
      error: "An open-ended slab (∞) already exists for this source/metric. Set its max or delete it before adding another.",
    };
  }

  if (min !== last.max_threshold) {
    if (min > last.max_threshold) {
      return {
        ok: false,
        error: `Gap not allowed: previous slab ends at ${last.max_threshold}, but min is ${min}. Set min to ${last.max_threshold} for a continuous range.`,
      };
    }
    return {
      ok: false,
      error: `Range overlap: min ${min} falls inside an existing slab. Next min must be ${last.max_threshold}.`,
    };
  }

  return { ok: true };
}

export type SlabGroupIssue = { group: string; message: string };

/** Audit saved slabs for gaps, overlaps, or invalid min/max within each group. */
export function auditSlabGroups(slabs: SlabLike[]): SlabGroupIssue[] {
  const byGroup = new Map<string, SlabLike[]>();
  for (const s of slabs) {
    const k = slabGroupKey(s);
    const list = byGroup.get(k) ?? [];
    list.push(s);
    byGroup.set(k, list);
  }

  const issues: SlabGroupIssue[] = [];
  for (const [group, rows] of byGroup) {
    const sorted = [...rows].sort((a, b) => a.min_threshold - b.min_threshold);
    if (sorted.length && sorted[0].min_threshold !== 0) {
      issues.push({ group, message: `Chain should start at 0 (starts at ${sorted[0].min_threshold}).` });
    }
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.max_threshold != null && s.max_threshold <= s.min_threshold) {
        issues.push({ group, message: `Invalid range ${s.min_threshold}–${s.max_threshold} (max must exceed min).` });
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        if (prev.max_threshold == null) {
          issues.push({ group, message: "Open-ended slab (∞) is not the last tier." });
        } else if (s.min_threshold !== prev.max_threshold) {
          if (s.min_threshold > prev.max_threshold) {
            issues.push({
              group,
              message: `Gap ${prev.max_threshold + 1}–${s.min_threshold - 1} between ${prev.min_threshold}–${prev.max_threshold} and ${s.min_threshold}–${s.max_threshold ?? "∞"}.`,
            });
          } else {
            issues.push({ group, message: `Overlap between tiers at ${s.min_threshold}.` });
          }
        }
      }
    }
    const open = sorted.filter((s) => s.max_threshold == null);
    if (open.length > 1) {
      issues.push({ group, message: "Only one open-ended (∞) slab allowed per chain." });
    }
  }
  return issues;
}

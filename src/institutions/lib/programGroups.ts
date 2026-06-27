import type { UpiCourseStaging } from "../types/upi";

/** Stable UI grouping key — uses existing dedup_hash when present. */
export function programGroupKey(row: UpiCourseStaging): string {
  const hash = row.dedup_hash?.trim();
  if (hash) return hash;
  return `row:${row.id}`;
}

export type ProgramGroupSummary = {
  key: string;
  title: string;
  levelId: string | null;
  levelLabel: string;
  offeringCount: number;
  pendingCount: number;
  publishedCount: number;
};

export function buildProgramGroups(
  rows: UpiCourseStaging[],
  levelName: (id: string | null) => string,
): ProgramGroupSummary[] {
  const map = new Map<string, UpiCourseStaging[]>();
  for (const r of rows) {
    const key = programGroupKey(r);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([key, groupRows]) => {
      const primary = groupRows.reduce((best, r) => {
        if (!best) return r;
        if (r.review_status === "published" && best.review_status !== "published") return r;
        return (r.course_title?.length ?? 0) > (best.course_title?.length ?? 0) ? r : best;
      }, groupRows[0] as UpiCourseStaging | undefined);

      const title = primary?.course_title?.trim() || "Untitled program";
      const levelId = primary?.program_level_id ?? null;

      return {
        key,
        title,
        levelId,
        levelLabel: levelName(levelId),
        offeringCount: groupRows.length,
        pendingCount: groupRows.filter((r) => r.review_status === "pending_review").length,
        publishedCount: groupRows.filter((r) => r.review_status === "published").length,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function filterRowsByProgramGroup(
  rows: UpiCourseStaging[],
  groupKey: string | null,
): UpiCourseStaging[] {
  if (!groupKey || groupKey === "all") return rows;
  return rows.filter((r) => programGroupKey(r) === groupKey);
}

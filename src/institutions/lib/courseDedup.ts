/** Shared course dedup key logic — must stay in sync with upi-upsert-courses edge function. */

export function canonicalCourseTitle(title: string, level?: string): string {
  let s = String(title || "").trim();
  s = s.replace(/\s*@\s*[A-Za-z][\w\s.&'-]+$/, "");
  if (level) {
    const lvl = String(level).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`\\s*\\(\\s*${lvl}\\s*\\)\\s*$`, "i"), "");
  }
  s = s.replace(
    /\s*\((Bachelor|Master|Diploma|Certificate|PhD|Doctorate|Doctoral|Graduate Certificate|Postgraduate)\s*\)\s*$/i,
    "",
  );
  s = s.replace(/\s{2,}/g, " ").trim().toLowerCase();
  return s;
}

export function resolveCourseDedupLevel(
  metadata: Record<string, unknown> | null | undefined,
  programLevelName?: string | null,
): string {
  const fromMeta = String(metadata?.program_level ?? "").trim();
  if (fromMeta) return fromMeta;
  return String(programLevelName ?? "").trim();
}

/** Split user or imported campus text into distinct campus names. */
export function parseCampusList(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return [...new Set(value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function campusNamesFromRow(row: {
  campus_name?: string | null;
  metadata?: Record<string, unknown> | null;
}): string[] {
  const fromMeta = row.metadata?.campus_names;
  if (Array.isArray(fromMeta) && fromMeta.length) {
    return [...new Set(fromMeta.map(String).map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }
  return parseCampusList(row.campus_name);
}

export function formatCampusDisplay(row: {
  campus_name?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const names = campusNamesFromRow(row);
  return names.length ? names.join(", ") : "—";
}

export function rowMatchesCampus(
  row: { campus_name?: string | null; metadata?: Record<string, unknown> | null },
  campus: string,
): boolean {
  return campusNamesFromRow(row).includes(campus);
}

export function normalizeCampusFields(
  campusInput: string | null | undefined,
  metadata: Record<string, unknown>,
): { campus_name: string | null; metadata: Record<string, unknown> } {
  const campuses = parseCampusList(campusInput);
  return {
    campus_name: campuses.length ? campuses.join(", ") : null,
    metadata: { ...metadata, campus_names: campuses },
  };
}

export function mergeCampusLists(...sources: (string | null | undefined | string[])[]): string[] {
  const set = new Set<string>();
  for (const source of sources) {
    if (Array.isArray(source)) {
      source.forEach((c) => {
        const t = String(c).trim();
        if (t) set.add(t);
      });
    } else {
      parseCampusList(source).forEach((c) => set.add(c));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Dedup by institution + canonical title + level (campuses merged onto one row). */
export function buildCourseDedupKey(input: {
  institution_id?: string | null;
  course_title?: string | null;
  program_level_id?: string | null;
  program_level?: string | null;
  /** @deprecated Ignored — campuses are not part of the dedup key. */
  campus_name?: string | null;
}): string {
  const levelRaw = String(input.program_level ?? "");
  const levelText = levelRaw.toLowerCase().trim();
  const titleKey = canonicalCourseTitle(String(input.course_title ?? ""), levelRaw);
  return `${input.institution_id ?? ""}||${titleKey}||${input.program_level_id ?? ""}||${levelText}`;
}

export async function computeCourseDedupHash(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

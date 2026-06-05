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

export function buildCourseDedupKey(input: {
  institution_id?: string | null;
  course_title?: string | null;
  program_level_id?: string | null;
  program_level?: string | null;
  campus_name?: string | null;
}): string {
  const levelText = String(input.program_level ?? "").toLowerCase().trim();
  const titleKey = canonicalCourseTitle(String(input.course_title ?? ""), levelText);
  const campusKey = String(input.campus_name ?? "").toLowerCase().trim();
  return `${input.institution_id ?? ""}||${titleKey}||${input.program_level_id ?? ""}||${levelText}||${campusKey}`;
}

export async function computeCourseDedupHash(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

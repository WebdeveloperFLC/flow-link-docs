import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function countryMatches(pref: string, country: string): boolean {
  const a = pref.toLowerCase().trim();
  const b = country.toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const aliases: Record<string, string[]> = {
    uk: ["united kingdom", "great britain", "england"],
    usa: ["united states", "us", "america"],
    uae: ["dubai", "united arab emirates"],
  };
  for (const [key, vals] of Object.entries(aliases)) {
    if ((a.includes(key) || vals.some((v) => a.includes(v)))
      && (b.includes(key) || vals.some((v) => b.includes(v)))) {
      return true;
    }
  }
  return false;
}

function compactMetadata(meta: Record<string, unknown> | null): string {
  if (!meta || typeof meta !== "object") return "";
  const parts: string[] = [];

  const push = (label: string, val: unknown) => {
    if (val == null || val === "") return;
    if (typeof val === "string") parts.push(`${label}: ${val.slice(0, 400)}`);
    else if (Array.isArray(val)) {
      const text = val.slice(0, 6).map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          return [o.title, o.label, o.value, o.criterion, o.a, o.description].filter(Boolean).join(" — ");
        }
        return "";
      }).filter(Boolean).join("; ");
      if (text) parts.push(`${label}: ${text.slice(0, 600)}`);
    }
  };

  push("Service", meta.displayName || meta.shortDescription);
  push("About", meta.about);
  push("Eligibility", meta.eligibility);
  push("FAQ", meta.faq);
  push("KPIs", meta.kpis);
  push("Policy alert", meta.policyAlert);
  push("Alert", meta.alert);
  push("Red flags", meta.redFlags);

  return parts.join("\n").slice(0, 3500);
}

export async function fetchServiceLibraryContext(
  admin: SupabaseClient,
  country?: string | null,
  level?: string | null,
): Promise<string> {
  const { data: rows } = await admin
    .from("service_library")
    .select(`
      id, service, sub_service,
      academy_metadata,
      quick_guide_what_to_do,
      quick_guide_common_mistakes,
      quick_guide_important_reminders,
      checklist_text,
      service_library_countries ( country )
    `)
    .eq("is_active", true)
    .limit(40);

  if (!rows?.length) return "No structured service library content loaded yet.";

  const countryPref = (country || "").trim();
  const levelPref = (level || "").toLowerCase();

  const scored = rows.map((row: Record<string, unknown>) => {
    const countries = (row.service_library_countries as { country: string }[] | null) ?? [];
    let score = 0;
    if (countryPref) {
      if (countries.some((c) => countryMatches(countryPref, c.country))) score += 10;
      const svc = `${row.service} ${row.sub_service}`.toLowerCase();
      if (countryMatches(countryPref, svc)) score += 5;
    }
    if (levelPref) {
      const svc = `${row.service} ${row.sub_service}`.toLowerCase();
      if (levelPref.includes("post") && svc.includes("student")) score += 3;
      if (levelPref.includes("under") && svc.includes("student")) score += 3;
      if (levelPref.includes("work") && (svc.includes("work") || svc.includes("visa"))) score += 3;
      // FL menu intake service labels
      if (levelPref.includes("student") && svc.includes("student")) score += 6;
      if ((levelPref.includes("visitor") || levelPref.includes("tourist")) && (svc.includes("visitor") || svc.includes("tourist"))) score += 6;
      if ((levelPref.includes("spouse") || levelPref.includes("dependent")) && (svc.includes("spouse") || svc.includes("dependent"))) score += 6;
      if ((levelPref.includes("permanent") || /\bpr\b/.test(levelPref)) && (svc.includes("pr") || svc.includes("permanent"))) score += 6;
      if (levelPref.includes("super") && svc.includes("super")) score += 6;
      if ((levelPref.includes("pgwp") || levelPref.includes("extension") || levelPref.includes("status"))
        && (svc.includes("pgwp") || svc.includes("extension") || svc.includes("permit"))) score += 6;
      if (levelPref.includes("coaching") && (svc.includes("ielts") || svc.includes("coaching") || svc.includes("test"))) score += 4;
      if (levelPref.includes("ielts") && svc.includes("ielts")) score += 5;
      if (levelPref.includes("pte") && svc.includes("pte")) score += 5;
    }
    const meta = row.academy_metadata as Record<string, unknown> | null;
    if (meta && Object.keys(meta).length > 2) score += 2;
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 3);
  const pick = top.length ? top : scored.slice(0, 2);

  const blocks = pick.map(({ row }) => {
    const meta = compactMetadata(row.academy_metadata as Record<string, unknown> | null);
    const quick = [
      row.quick_guide_what_to_do,
      row.quick_guide_common_mistakes,
      row.quick_guide_important_reminders,
      row.checklist_text,
    ].filter(Boolean).join("\n");
    const header = `${row.service} — ${row.sub_service}`;
    return [header, meta, quick ? `Quick guide: ${String(quick).slice(0, 800)}` : ""]
      .filter(Boolean)
      .join("\n");
  });

  return blocks.join("\n\n---\n\n").slice(0, 8000) || "General study abroad counseling — verify fees and rules on official sites.";
}

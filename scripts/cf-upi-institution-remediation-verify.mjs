/**
 * Verify CF ↔ UPI institution shell remediation (20261002130000).
 * Usage: node scripts/cf-upi-institution-remediation-verify.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function envVal(key) {
  const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const REMEDIATED_CF_IDS = [
  "7bb5cb3e-ee6f-4915-8a5d-4d8c95e9e275",
  "51f5d567-0260-4516-a541-8cdf99ad4afd",
  "2fd72b9a-4c04-467a-bc88-d05b3bc92e73",
  "98a72c77-690d-4e82-9712-67c0a3d1c373",
  "9b5b825a-19f9-4301-b6e9-2a43896babea",
  "4f11e1d4-71ec-4897-b460-1e7b2bc880a4",
  "5c8357fb-730a-4fd7-bfe2-149c7116d4f5",
  "c522ffcb-554f-4be5-b140-23dc55f4a0c5",
  "9c18bc58-7aa2-4c9d-8717-3595c18332d1",
  "c5696b8a-3b31-4b52-934f-ba1ceb2c19bc",
  "80ce19e5-de72-4ff4-9c3a-ec6cded61264",
  "5cf24a98-fd70-4916-8fbe-e03d59343ebb",
];

const sb = createClient(envVal("VITE_SUPABASE_URL"), envVal("VITE_SUPABASE_PUBLISHABLE_KEY"));

const { data: stats } = await sb.rpc("fn_cf_upi_linkage_dashboard_stats");
const { data: unis } = await sb
  .from("cf_universities")
  .select("id,name,country_code,upi_institution_id")
  .order("name");

const remediated = (unis ?? []).filter((u) => REMEDIATED_CF_IDS.includes(u.id));
const unlinked = (unis ?? []).filter((u) => !u.upi_institution_id);
const linked = (unis ?? []).filter((u) => u.upi_institution_id);

const report = {
  generated_at: new Date().toISOString(),
  linkage_dashboard: stats,
  totals: {
    cf_total: unis?.length ?? 0,
    linked: linked.length,
    unlinked: unlinked.length,
    mark_final_eligible_pct: stats?.mark_final_eligible_pct ?? null,
  },
  remediated_cf: remediated.map((u) => ({
    cf_id: u.id,
    cf_name: u.name,
    linked: !!u.upi_institution_id,
    upi_institution_id: u.upi_institution_id,
  })),
  still_unlinked: unlinked.map((u) => ({ id: u.id, name: u.name })),
  pass:
    remediated.every((u) => u.upi_institution_id) &&
    remediated.length === REMEDIATED_CF_IDS.length,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

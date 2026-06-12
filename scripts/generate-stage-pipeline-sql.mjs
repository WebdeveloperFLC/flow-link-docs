#!/usr/bin/env node
/**
 * Seed stage_pipelines + pipeline_stages for Service Library auto-assignment.
 *
 *   node scripts/generate-stage-pipeline-sql.mjs
 */
import fs from "fs";
import path from "path";
import { buildStagePipelineDefinitions } from "./lib/stage-pipeline-registry.mjs";

const OUT = path.join(process.cwd(), "supabase/migrations/20260617100000_seed_stage_pipelines.sql");

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function upsertStageLines(st) {
  const key = sqlStr(st.key);
  const label = sqlStr(st.label);
  const clientLabel = sqlStr(st.client_label);
  const color = sqlStr(st.color);
  const notify = st.notify ? "true" : "false";
  const clientVisible = st.client_visible === false ? "false" : "true";
  return [
    `  UPDATE public.pipeline_stages SET`,
    `    label = ${label},`,
    `    client_label = ${clientLabel},`,
    `    sort_order = ${st.sort},`,
    `    color = ${color},`,
    `    notify_client = ${notify},`,
    `    is_client_visible = ${clientVisible}`,
    `  WHERE pipeline_id = pid AND key = ${key};`,
    `  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)`,
    `  SELECT pid, ${key}, ${label}, ${clientLabel}, ${st.sort}, ${color}, ${notify}, ${clientVisible}`,
    `  WHERE NOT EXISTS (`,
    `    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = ${key}`,
    `  );`,
  ];
}

const pipelines = buildStagePipelineDefinitions();
const lines = [
  "-- Stage pipelines for Service Library auto-assignment (keyword match on name + service_category).",
  "-- Upserts on (country, service_category). Stages upsert by key — never deletes (client_stage_history FK).",
  "-- Regenerate: node scripts/generate-stage-pipeline-sql.mjs",
  "",
];

for (const p of pipelines) {
  lines.push(`-- ${p.country} · ${p.name} · ${p.service_category}`);
  lines.push("DO $$");
  lines.push("DECLARE");
  lines.push("  pid uuid;");
  lines.push("BEGIN");
  lines.push("  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)");
  lines.push(
    `  VALUES ('${p.id}'::uuid, ${sqlStr(p.name)}, ${sqlStr(p.country)}, ${sqlStr(p.service_category)}, true, ${sqlStr(p.description)})`,
  );
  lines.push("  ON CONFLICT (country, service_category) DO UPDATE SET");
  lines.push("    name = EXCLUDED.name,");
  lines.push("    is_active = EXCLUDED.is_active,");
  lines.push("    description = EXCLUDED.description,");
  lines.push("    updated_at = now()");
  lines.push("  RETURNING id INTO pid;");
  lines.push("");
  for (const st of p.stages) {
    lines.push(...upsertStageLines(st));
  }
  lines.push("END $$;");
  lines.push("");
}

fs.writeFileSync(OUT, lines.join("\n"));
console.log(`Wrote ${pipelines.length} pipelines → ${OUT}`);

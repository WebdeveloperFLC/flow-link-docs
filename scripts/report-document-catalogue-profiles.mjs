#!/usr/bin/env node
/**
 * Phase B pre-seed deliverable — profile-based catalogue design.
 * Does NOT modify document_types or service JSON.
 *
 *   node scripts/report-document-catalogue-profiles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { listServiceFiles } from "./lib/build-checklist-from-service.mjs";
import {
  EXISTING_CATALOGUE,
  PROPOSED_CATALOGUE,
  FINAL_CATALOGUE,
  FAMILY_MERGES,
  SERVICE_PROFILES,
  PROFILE_EXCEPTIONS,
  SUGGESTION_RULES,
  resolveServiceProfile,
  defaultsForService,
  catalogueStats,
} from "./lib/document-service-profiles.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content/service-library");
const OUT = path.join(ROOT, "docs/guides/DOCUMENT_CATALOGUE_AND_PROFILES.md");

const CONFIDENCE_UI = {
  high: "Auto-add to **Suggested Documents** section",
  medium: "Show **recommendation banner** for counselor review",
  low: "Informational only — counselor decides manually; **never** auto-create upload rows",
};

function confidenceLabel(c) {
  return c.toUpperCase();
}

function buildServiceInheritanceTable() {
  /** @type {Map<string, Array<object>>} */
  const byProfile = new Map();
  for (const file of listServiceFiles()) {
    const slug = file.replace(".json", "");
    const meta = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
    const profileId = resolveServiceProfile(slug);
    const { documents, source } = defaultsForService(slug, meta);
    const profile = SERVICE_PROFILES[profileId];
    const baseCodes = new Set(profile.default_documents.map((d) => d.code));
    const exceptions = documents.filter((d) => !baseCodes.has(d.code)).map((d) => d.code);

    if (!byProfile.has(profileId)) byProfile.set(profileId, []);
    byProfile.get(profileId).push({
      slug,
      displayName: meta.displayName ?? slug,
      source,
      exception_codes: exceptions,
      all_codes: documents.map((d) => d.code),
    });
  }
  return byProfile;
}

function renderProfileSection(profileId) {
  const profile = SERVICE_PROFILES[profileId];
  const rules = SUGGESTION_RULES.filter(
    (r) => r.scope === profileId || (profile.suggestion_rules ?? []).includes(r.rule_id),
  );
  const profileRules = SUGGESTION_RULES.filter((r) => profile.suggestion_rules?.includes(r.rule_id));
  const exceptions = PROFILE_EXCEPTIONS[profileId] ?? [];

  const lines = [];
  lines.push(`### ${profile.label} (\`${profileId}\`)`, "");
  lines.push("#### Default documents", "");
  lines.push("| Code | Mandatory | Status | Label |");
  lines.push("|------|-----------|--------|-------|");
  for (const d of profile.default_documents) {
    const cat = EXISTING_CATALOGUE[d.code] ?? PROPOSED_CATALOGUE[d.code];
    const status = EXISTING_CATALOGUE[d.code] ? "existing" : "proposed";
    lines.push(`| \`${d.code}\` | ${d.mandatory ? "yes" : "no"} | ${status} | ${cat?.label ?? d.code} |`);
  }

  if (exceptions.length > 0) {
    lines.push("", "#### Profile exceptions (country / slug)", "");
    lines.push("| Match pattern | Adds |");
    lines.push("|---------------|------|");
    for (const ex of exceptions) {
      const adds = ex.add.map((a) => `\`${a.code}\`${a.mandatory ? " (req)" : ""}`).join(", ");
      lines.push(`| ${ex.label} | ${adds} |`);
    }
  }

  lines.push("", "#### Required document families", "");
  lines.push(profile.required_families.map((f) => `- \`${f}\``).join("\n"));

  lines.push("", "#### Suggestion rules", "");
  lines.push("| Rule | Trigger | Suggest | Confidence | Behavior |");
  lines.push("|------|---------|---------|------------|----------|");
  for (const r of profileRules) {
    lines.push(
      `| ${r.rule_id} | ${r.trigger ?? `${r.profile_field} = ${r.condition}`} | ${r.suggest.map((c) => `\`${c}\``).join(", ")} | **${confidenceLabel(r.confidence)}** | ${CONFIDENCE_UI[r.confidence]} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function buildMarkdown() {
  const stats = catalogueStats();
  const byProfile = buildServiceInheritanceTable();
  const lines = [];

  const push = (...a) => lines.push(...a);

  push(
    "# Document Catalogue & Service Profiles — Phase B Pre-Seed Design",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "> **Status:** Review required before Phase B seeding.",
    "> **No DB changes. No fleet conversion. Canada Spouse pilot remains the only converted service.**",
    "",
    "## Approved architecture (locked)",
    "",
    "| System | Role | Creates upload rows? |",
    "|--------|------|---------------------|",
    "| **Documents Tab** | Uploadable documents only | Yes (defaults + suggestions + manual) |",
    "| **Document Binder** | Counselor guidance & file prep reference | **Never** |",
    "| **Checklist** | Workflow & QA verification | **Never** |",
    "| **Eligibility** | Assessment criteria | **Never** |",
    "| **Red Flags** | Risk indicators | **Never** |",
    "| **Compliance** | Compliance guidance | **Never** |",
    "",
    "### Document layers",
    "",
    "1. **Layer 1 — Default documents** — from service profile (+ exceptions)",
    "2. **Layer 2 — Suggested documents** — profile rules with confidence levels",
    "3. **Layer 3 — Manual documents** — counselor picker from `document_types` only",
    "",
    "### Catalogue design principle",
    "",
    "**Document families, not wording variants.** One code per real upload category.",
    "Counselors upload specific files (wedding photos, bank statements) within the family.",
    "",
    "---",
    "",
    "## 1. Final proposed `document_types` catalogue",
    "",
    `**Estimated final size: ${stats.final_count} codes** (${stats.existing_count} existing + ${stats.proposed_new_count} new).`,
    `**${stats.variants_merged} variant labels merged** into canonical families (Section 2).`,
    "",
    `### 1.1 Existing codes (seeded today — ${stats.existing_count})`,
    "",
    "| Code | Label | Family |",
    "|------|-------|--------|",
  );

  for (const [code, meta] of Object.entries(EXISTING_CATALOGUE).sort(([a], [b]) => a.localeCompare(b))) {
    push(`| \`${code}\` | ${meta.label} | ${meta.family} |`);
  }

  push("", `### 1.2 Proposed new codes (Phase B seed — ${stats.proposed_new_count})`, "");
  push("| Code | Label | Family | Rationale |");
  push("|------|-------|--------|-----------|");
  for (const [code, meta] of Object.entries(PROPOSED_CATALOGUE).sort(([a], [b]) => a.localeCompare(b))) {
    push(`| \`${code}\` | ${meta.label} | ${meta.family} | ${meta.reason ?? "—"} |`);
  }

  push("", "### 1.3 Fallback & manual-only", "");
  push("- `other` — manual-add fallback only; **never** in default or suggested sets");

  push("", "---", "", "## 2. Family merges applied", "");
  push("The following variants **must not** be seeded as separate `document_types`:", "");

  for (const merge of FAMILY_MERGES) {
    push(`### ${merge.keep ? `\`${merge.keep}\`` : "Deferred"}`, "");
    push(`- **Drop:** ${merge.drop.map((c) => `\`${c}\``).join(", ")}`);
    if (merge.keep) push(`- **Keep:** \`${merge.keep}\``);
    push(`- **Rationale:** ${merge.rationale}`);
    if (merge.action) push(`- **Action:** ${merge.action}`);
    push("");
  }

  push("---", "", "## 3. Suggestion confidence levels", "");
  push("| Level | Behavior |");
  push("|-------|----------|");
  for (const [level, behavior] of Object.entries(CONFIDENCE_UI)) {
    push(`| **${level.toUpperCase()}** | ${behavior} |`);
  }

  push("", "### 3.1 Global suggestion rules", "");
  push("| Rule | Field | Condition | Suggest | Confidence |");
  push("|------|-------|-----------|---------|------------|");
  for (const r of SUGGESTION_RULES.filter((x) => x.scope === "global")) {
    push(
      `| ${r.rule_id} | \`${r.profile_field}\` | ${r.condition} | ${r.suggest.map((c) => `\`${c}\``).join(", ")} | **${confidenceLabel(r.confidence)}** |`,
    );
  }

  push("", "---", "", "## 4. Service profiles (master templates)", "");
  push(
    "Individual services **inherit** from one profile and add **exceptions only**.",
    "131 services map to 7 profiles — not 131 independent document definitions.",
    "",
  );

  for (const profileId of Object.keys(SERVICE_PROFILES)) {
    push(renderProfileSection(profileId));
  }

  push("---", "", "## 5. Service inheritance map", "");
  push("| Profile | Services | With exceptions |");
  push("|---------|----------|-----------------|");

  for (const [profileId, services] of [...byProfile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const withEx = services.filter((s) => s.exception_codes.length > 0 || s.source === "document_manifest").length;
    push(`| ${SERVICE_PROFILES[profileId].label} | ${services.length} | ${withEx} |`);
  }

  push("", "### 5.1 Reference inheritance examples", "");
  const examples = [
    { slug: "Australia-Student-Visa", label: "Australia Student Visa" },
    { slug: "uk-student-visa", label: "UK Student Visa" },
    { slug: "germany-student-visa", label: "Germany Student Visa" },
    { slug: "canada-spouse-dependent-visitor", label: "Canada Spouse Dependent Visitor (pilot)" },
  ];

  for (const ex of examples) {
    const file = `${ex.slug}.json`;
    const fp = path.join(CONTENT_DIR, file);
    if (!fs.existsSync(fp)) continue;
    const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
    const { profile, documents, source } = defaultsForService(ex.slug, meta);
    const base = SERVICE_PROFILES[profile].default_documents.map((d) => d.code);
    const added = documents.map((d) => d.code).filter((c) => !base.includes(c));

    push(`#### ${ex.label}`, "");
    push(`- **Profile:** \`${profile}\``);
    push(`- **Source:** ${source}`);
    push(`- **Inherits:** ${base.map((c) => `\`${c}\``).join(", ")}`);
    if (added.length) push(`- **Adds:** ${added.map((c) => `\`${c}\``).join(", ")}`);
    push(`- **Effective defaults:** ${documents.map((d) => `\`${d.code}\``).join(", ")}`);
    push("");
  }

  push("---", "", "## 6. Catalogue size summary", "");
  push("| Metric | Count |");
  push("|--------|-------|");
  push(`| Existing codes (today) | ${stats.existing_count} |`);
  push(`| Proposed new codes (Phase B) | ${stats.proposed_new_count} |`);
  push(`| **Final catalogue size** | **${stats.final_count}** |`);
  push(`| Variant labels merged (not seeded) | ${stats.variants_merged} |`);
  push(`| Previous Phase A estimate (before merges) | ~44 |`);
  push(`| Reduction from family-merge policy | ~${44 - stats.final_count} codes avoided |`);

  push("", "---", "", "## 7. Pilot note (Canada Spouse Dependent Visitor)", "");
  push(
    "Pilot `document_manifest[]` still maps `relationship_evidence` → `photograph` and `principal_status` → `other`.",
    "Phase C will align manifest to profile after catalogue seed:",
    "",
    "- `relationship_evidence` → `relationship_proof`",
    "- `principal_status_document` → `principal_status_document`",
    "",
    "**Fleet conversion remains blocked** until pilot UAT + this design approved.",
  );

  push("", "---", "", "## 8. Next steps (blocked until approval)", "");
  push("1. **Review** final catalogue (Section 1) and family merges (Section 2)");
  push("2. **Review** 7 service profiles and confidence-level rules (Sections 3–4)");
  push("3. **Approve** Phase B seed migration for **15 proposed codes only**");
  push("4. **Complete** Canada Spouse pilot UAT on new case");
  push("5. **Phase C** — align pilot manifest + roll `document_manifest[]` via profile inheritance");
  push("", "**No seeding, no fleet conversion until sign-off.**");

  return lines.join("\n");
}

const md = buildMarkdown();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);

const stats = catalogueStats();
console.log(`Report written: ${OUT}`);
console.log(`Final catalogue size: ${stats.final_count} (${stats.existing_count} existing + ${stats.proposed_new_count} new)`);
console.log(`Variants merged: ${stats.variants_merged}`);

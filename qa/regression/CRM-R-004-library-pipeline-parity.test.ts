import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPipelineBackedLibraryId } from "@/lib/service-library/pipelineBackedLibraryIds";
import { LIBRARY_PIPELINE_SEED_SLUG } from "@/lib/stagePipelineLibrarySlug";

/**
 * CRM-R-004 — Service Library (primary) drives staging: every visa picker row must
 * have a deterministic library_id → pipeline slug; staging resolves via library_id.
 */
describe("CRM-R-004 library → pipeline parity", () => {
  it("fetchAllServiceCatalogue filters to pipeline-backed visa library rows", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/leads.ts"), "utf8");
    expect(src).toContain("isPipelineBackedLibraryId");
    expect(src).toMatch(/visa_immigration[\s\S]*isPipelineBackedLibraryId\(r\.id\)/);
    expect(src).toContain("formatServiceLibraryLabel");
    expect(src).not.toContain("service_name: v.picker_label");
    expect(src).toContain("pickCanonicalVariantFees");
  });

  it("resolvePipelineForServiceLibrary rejects unknown library ids before fuzzy match", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/stagePipelines.ts"), "utf8");
    expect(src).toContain("library_id");
    expect(src).toMatch(/!LIBRARY_PIPELINE_SEED_SLUG\[params\.libraryId\]/);
  });

  it("migration adds stage_pipelines.library_id backfill", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260718120013_stage_pipelines_library_id.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS library_id");
    expect(sql).toContain("uk-student-visa");
    expect(sql).toContain("b2000001-0001-4000-8000-000000000021");
  });

  it("academy visa nav only shows pipeline-backed services", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/service-library/academyNav.ts"),
      "utf8",
    );
    expect(src).toContain("isPipelineBackedLibraryId(m.id)");
  });

  it("migration syncs stage_pipelines.name from service_library", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260718120014_stage_pipelines_sync_library_names.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("academy_metadata->>'displayName'");
    expect(sql).toContain("sp.library_id = lib.id");
  });

  it("Stage pipelines UI shows Service Library labels when linked", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/masters/StagePipelinesSection.tsx"),
      "utf8",
    );
    expect(src).toContain("formatServiceLibraryLabel");
    expect(src).toContain("pipelineDisplayName");
    expect(src).not.toMatch(/font-medium">\{p\.name\}/);
  });

  it("non-backed library id has no slug (e.g. admission-only rows)", () => {
    expect(isPipelineBackedLibraryId("00000000-0000-4000-8000-000000000099")).toBe(false);
    expect(LIBRARY_PIPELINE_SEED_SLUG["b2000001-0001-4000-8000-000000000021"]).toBe(
      "uk-student-visa",
    );
  });
});

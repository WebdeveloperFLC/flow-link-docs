import { describe, expect, it } from "vitest";
import {
  LIBRARY_PIPELINE_SEED_SLUG,
  PIPELINE_BACKED_LIBRARY_IDS,
} from "@/lib/stagePipelineLibrarySlug";
import { isPipelineBackedLibraryId } from "@/lib/service-library/pipelineBackedLibraryIds";

/** United Kingdom — must match Stage Pipeline (5 visa services). */
const UK_LIBRARY_IDS = [
  "b2000001-0001-4000-8000-000000000021", // student
  "b2000001-0001-4000-8000-000000000022", // visitor
  "b2000001-0001-4000-8000-000000000023", // spouse
  "b2000001-0001-4000-8000-000000000024", // skilled worker
  "b2000001-0001-4000-8000-000000000025", // graduate route
] as const;

describe("pipeline library parity", () => {
  it("maps every backed id to a pipeline slug", () => {
    expect(PIPELINE_BACKED_LIBRARY_IDS.size).toBeGreaterThan(90);
    for (const id of PIPELINE_BACKED_LIBRARY_IDS) {
      expect(LIBRARY_PIPELINE_SEED_SLUG[id], `missing slug for ${id}`).toBeTruthy();
    }
  });

  it("UK has five pipeline-backed visa services", () => {
    for (const id of UK_LIBRARY_IDS) {
      expect(isPipelineBackedLibraryId(id)).toBe(true);
      expect(LIBRARY_PIPELINE_SEED_SLUG[id]).toMatch(/^uk-/);
    }
  });

  it("slug map keys match backed id set", () => {
    const idsFromMap = new Set(Object.keys(LIBRARY_PIPELINE_SEED_SLUG));
    expect(idsFromMap.size).toBe(PIPELINE_BACKED_LIBRARY_IDS.size);
    for (const id of PIPELINE_BACKED_LIBRARY_IDS) {
      expect(idsFromMap.has(id)).toBe(true);
    }
  });
});

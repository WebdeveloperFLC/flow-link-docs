import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  buildWorkflowTemplateFromManifest,
  validateDocumentManifest,
} from "../../../scripts/lib/document-manifest.mjs";
import { isValidMasterItemCode } from "../../../scripts/lib/document-master-codes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PILOT = "canada-spouse-dependent-visitor";

describe("document_manifest pilot", () => {
  it("validates pilot manifest and produces document-only template items", () => {
    const jsonPath = path.join(ROOT, "content/service-library", `${PILOT}.json`);
    const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const manifest = validateDocumentManifest(meta.document_manifest, PILOT);

    expect(manifest.length).toBeGreaterThan(0);
    for (const row of manifest) {
      expect(isValidMasterItemCode(row.master_item_code)).toBe(true);
    }

    const template = buildWorkflowTemplateFromManifest({
      slug: PILOT,
      displayName: meta.displayName,
      libraryId: "b2000001-0001-4000-8000-000000000020",
      country: "Canada",
      manifest,
    });

    const documents = template.items.filter((i) => i.requirement_kind === "document");
    const milestones = template.items.filter((i) => i.requirement_kind === "milestone");

    expect(documents).toHaveLength(manifest.length);
    expect(milestones.length).toBe(4);
    expect(documents.every((d) => d.master_item_code)).toBe(true);
    expect(template.version).toBe(2);
  });
});

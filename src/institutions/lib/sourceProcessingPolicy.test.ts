import { describe, expect, it } from "vitest";
import {
  canSyncNow,
  defaultProcessingPolicy,
  readProcessingPolicy,
  shouldIncludeInSyncAll,
} from "./sourceProcessingPolicy";

describe("sourceProcessingPolicy", () => {
  it("defaults website URLs to reference only", () => {
    expect(defaultProcessingPolicy({ source_type: "website_url", url: "https://x.edu", metadata: {} })).toBe(
      "reference_only",
    );
  });

  it("defaults document-linked sources to ai extract once", () => {
    expect(
      defaultProcessingPolicy({ source_type: "program_sheet", document_id: "doc-1", metadata: {} }),
    ).toBe("ai_extract_once");
  });

  it("blocks sync for reference only", () => {
    const source = {
      source_type: "listing_page",
      url: "https://x.edu/programs",
      metadata: { processing_policy: "reference_only" },
    };
    expect(canSyncNow(source as any)).toBe(false);
    expect(shouldIncludeInSyncAll(source as any)).toBe(false);
  });

  it("allows manual sync policy", () => {
    const source = {
      source_type: "listing_page",
      url: "https://x.edu/programs",
      metadata: { processing_policy: "manual_sync" },
    };
    expect(canSyncNow(source as any)).toBe(true);
  });

  it("blocks second sync for ai extract once after completion", () => {
    const source = {
      source_type: "program_sheet",
      document_id: "d1",
      last_synced_at: "2026-01-01T00:00:00Z",
      metadata: { processing_policy: "ai_extract_once" },
    };
    expect(canSyncNow(source as any)).toBe(false);
  });

  it("reads stored policy from metadata", () => {
    expect(
      readProcessingPolicy({
        source_type: "website_url",
        metadata: { processing_policy: "manual_sync" },
      } as any),
    ).toBe("manual_sync");
  });
});

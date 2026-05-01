import { describe, expect, it } from "vitest";
import { looksLikeBinderName, shouldFallbackToPageRanges, type BinderSegment } from "@/lib/binderSplit";

describe("binder split safeguards", () => {
  it("forces a full applicant binder segment into page review", () => {
    const segments: BinderSegment[] = [{ start_page: 1, end_page: 23, type: "Passport", confidence: 0.95 }];
    expect(looksLikeBinderName("Applicant Binder.pdf")).toBe(true);
    expect(shouldFallbackToPageRanges("Applicant Binder.pdf", 23, segments)).toBe(true);
  });

  it("does not force-split a normal multi-page individual document", () => {
    const segments: BinderSegment[] = [{ start_page: 1, end_page: 12, type: "Academic Transcripts", confidence: 0.9 }];
    expect(looksLikeBinderName("Academic Transcripts.pdf")).toBe(false);
    expect(shouldFallbackToPageRanges("Academic Transcripts.pdf", 12, segments)).toBe(false);
  });
});
import { describe, expect, it } from "vitest";
import { inferGuideSlugFromStandalone, resolveTemplateGuideUrl } from "./resolveTemplateGuideUrl";

describe("resolveTemplateGuideUrl", () => {
  it("uses short root URL for canada visitor visa free guide", () => {
    expect(
      resolveTemplateGuideUrl({
        standaloneFile: "canada-visitor-visa-free-guide.html",
        fileUrl: "#download-free-guide",
      }),
    ).toBe("/canada-visitor-visa-free-guide.html");
  });

  it("infers slug when guideSlug is missing", () => {
    expect(
      resolveTemplateGuideUrl({
        standaloneFile: "canada-visitor-visa-free-guide.html",
      }),
    ).toBe("/canada-visitor-visa-free-guide.html");
  });

  it("prefers explicit guideSlug for nested downloads path", () => {
    expect(
      resolveTemplateGuideUrl(
        { standaloneFile: "custom-checklist.html" },
        "canada-visitor-visa",
      ),
    ).toBe("/content/service-library/canada-visitor-visa/downloads/custom-checklist.html");
  });
});

describe("inferGuideSlugFromStandalone", () => {
  it("parses visitor visa free guide filename", () => {
    expect(inferGuideSlugFromStandalone("canada-visitor-visa-free-guide.html")).toBe(
      "canada-visitor-visa",
    );
  });
});

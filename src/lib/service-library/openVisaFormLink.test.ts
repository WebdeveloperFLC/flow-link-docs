import { describe, expect, it } from "vitest";
import {
  isExternalVisaFormUrl,
  isVisaFormPlaceholderPath,
  matchOfficialVisaFormPath,
  normalizeVisaFormCode,
} from "@/lib/service-library/openVisaFormLink";

describe("openVisaFormLink helpers", () => {
  it("detects external and placeholder paths", () => {
    expect(isExternalVisaFormUrl("https://www.canada.ca/content/dam/ircc/imm1294e.pdf")).toBe(true);
    expect(isExternalVisaFormUrl("Canada/Study Visa/IMM_1294_placeholder.pdf")).toBe(false);
    expect(isVisaFormPlaceholderPath("Canada/Study Visa/IMM_1294_placeholder.pdf")).toBe(true);
  });

  it("matches official form paths by normalized code", () => {
    const rows = [
      {
        form_code: "IMM 1294",
        file_path: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm1294e.pdf",
      },
      {
        form_code: "IMM 5645",
        file_path: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5645e.pdf",
      },
    ];
    expect(normalizeVisaFormCode("imm 1294")).toBe("IMM 1294");
    expect(matchOfficialVisaFormPath("IMM 1294", rows)).toBe(rows[0]!.file_path);
    expect(matchOfficialVisaFormPath("IMM 5645", rows)).toBe(rows[1]!.file_path);
    expect(matchOfficialVisaFormPath("IMM 5707", rows)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { buildAcademyNav } from "@/lib/service-library/academyNav";
import type { Master } from "@/lib/serviceLibrary";

function coachingRow(
  id: string,
  service: string,
  sub_service: string,
  extra?: Partial<Master>,
): Master {
  return {
    id,
    service_category: "coaching_services",
    service,
    sub_service,
    quick_guide_what_to_do: null,
    quick_guide_common_mistakes: null,
    quick_guide_escalation_rules: null,
    quick_guide_important_reminders: null,
    checklist_text: null,
    cost_summary_html: null,
    internal_sop_html: null,
    process_flow: null,
    display_order: 1,
    is_active: true,
    ...extra,
  };
}

const baseOpts = {
  categoryFilter: "coaching" as const,
  countryFilter: "ALL",
  coachingFamily: null,
  coachingVariant: null,
  search: "",
  statusFilter: "all" as const,
};

describe("buildAcademyNav coaching grouping", () => {
  it("collapses French level rows under French Language family", () => {
    const masters = [
      coachingRow("f1", "French Language A1", "French Language"),
      coachingRow("f2", "French Language A2", "French Language"),
      coachingRow("f3", "French Language B1", "French Language"),
    ];

    const { group } = buildAcademyNav(masters, baseOpts);

    expect(group?.step).toBe("coaching_families");
    expect(group?.coachingFamilies).toHaveLength(1);
    expect(group?.coachingFamilies?.[0]).toMatchObject({
      key: "French Language",
      label: "French Language",
      count: 3,
    });
  });

  it("collapses German variants under German Language family", () => {
    const masters = [
      coachingRow("g1", "German A2 Regular (with books)", "European Languages"),
      coachingRow("g2", "German B1 Regular (with books)", "European Languages"),
    ];

    const { group } = buildAcademyNav(masters, baseOpts);

    expect(group?.coachingFamilies).toHaveLength(1);
    expect(group?.coachingFamilies?.[0]).toMatchObject({
      key: "German Language",
      count: 2,
    });
  });

  it("lists French variants when family is selected", () => {
    const masters = [
      coachingRow("f1", "French Language A1", "French Language"),
      coachingRow("f2", "French Language A2", "French Language"),
      coachingRow("f3", "French Language", "European Languages"),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "French Language",
    });

    expect(group?.step).toBe("services");
    expect(group?.items).toHaveLength(2);
    expect(group?.items?.map((i) => i.label)).toEqual(
      expect.arrayContaining(["French Language A1", "French Language A2"]),
    );
  });

  it("shows IELTS format step when general and academic variants exist", () => {
    const masters = [
      coachingRow("i1", "IELTS", "Academic Regular (with books)"),
      coachingRow("i2", "IELTS", "General Regular (with books)"),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "IELTS",
    });

    expect(group?.step).toBe("coaching_variants");
    expect(group?.coachingVariants?.map((v) => v.key)).toEqual(
      expect.arrayContaining(["academic", "general"]),
    );
  });

  it("lists CELPIP General when CELPIP family is selected (not filtered by format)", () => {
    const masters = [
      coachingRow("c1", "CELPIP General", "English Proficiency", {
        academy_metadata: { displayName: "CELPIP General", reviewStatus: "active" },
      }),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "CELPIP",
    });

    expect(group?.step).toBe("services");
    expect(group?.items).toHaveLength(1);
    expect(group?.items?.[0].label).toBe("CELPIP General");
  });

  it("lists PTE Academic when PTE family is selected", () => {
    const masters = [
      coachingRow("p1", "PTE Academic", "English Proficiency", {
        academy_metadata: { displayName: "PTE Academic", reviewStatus: "active" },
      }),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "PTE",
    });

    expect(group?.step).toBe("services");
    expect(group?.items).toHaveLength(1);
  });

  it("lists French General / Custom without format filtering", () => {
    const masters = [
      coachingRow("f1", "French Language (General / Custom)", "French Language"),
      coachingRow("f2", "French Language A1", "French Language"),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "French Language",
    });

    expect(group?.step).toBe("services");
    expect(group?.items?.map((i) => i.label)).toEqual(
      expect.arrayContaining(["French Language (General / Custom)", "French Language A1"]),
    );
  });

  it("filters inverted IELTS rows by format", () => {
    const masters = [
      coachingRow("i1", "IELTS Academic Regular (with books)", "IELTS"),
      coachingRow("i2", "IELTS General Regular (with books)", "IELTS"),
    ];

    const { group } = buildAcademyNav(masters, {
      ...baseOpts,
      coachingFamily: "IELTS",
      coachingVariant: "academic",
    });

    expect(group?.step).toBe("services");
    expect(group?.items).toHaveLength(1);
    expect(group?.items?.[0].label).toContain("Academic");
  });
});

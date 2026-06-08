import { describe, expect, it } from "vitest";
import {
  groupCatalogueItems,
  resolveCoachingFamilyKey,
  resolveCoachingVariantLabel,
} from "@/lib/leads/servicePickerGroups";

describe("resolveCoachingFamilyKey", () => {
  it("groups canonical IELTS rows under IELTS", () => {
    expect(resolveCoachingFamilyKey("IELTS", "Academic Regular (with books)")).toBe("IELTS");
  });

  it("groups inverted IELTS rows under IELTS", () => {
    expect(
      resolveCoachingFamilyKey("IELTS Academic Regular (with books)", "IELTS"),
    ).toBe("IELTS");
  });

  it("groups French level rows under French Language", () => {
    expect(resolveCoachingFamilyKey("French Language A1", "French Language")).toBe(
      "French Language",
    );
    expect(resolveCoachingFamilyKey("French Language", "European Languages")).toBe(
      "French Language",
    );
  });

  it("groups German variants under German Language", () => {
    expect(resolveCoachingFamilyKey("German A2 Regular (with books)", "European Languages")).toBe(
      "German Language",
    );
  });

  it("groups bucketed English tests by service name", () => {
    expect(resolveCoachingFamilyKey("PTE Academic", "English Proficiency")).toBe("PTE");
    expect(resolveCoachingFamilyKey("GRE", "Graduate Admissions")).toBe("GRE");
  });
});

describe("resolveCoachingVariantLabel", () => {
  it("uses sub_service for canonical rows", () => {
    expect(resolveCoachingVariantLabel("IELTS", "Academic Regular (with books)", null)).toBe(
      "Academic Regular (with books)",
    );
  });

  it("uses service field for inverted rows", () => {
    expect(
      resolveCoachingVariantLabel("IELTS Academic Regular (with books)", "IELTS", null),
    ).toBe("IELTS Academic Regular (with books)");
  });
});

describe("groupCatalogueItems", () => {
  it("collapses coaching variants into parent families", () => {
    const items = [
      {
        id: "1",
        service_name: "IELTS Academic Regular (with books)",
        group_key: "IELTS",
        group_label: "IELTS",
        display_order: 1,
      },
      {
        id: "2",
        service_name: "IELTS General Regular (with books)",
        group_key: "IELTS",
        group_label: "IELTS",
        display_order: 2,
      },
      {
        id: "3",
        service_name: "French Language A1",
        group_key: "French Language",
        group_label: "French Language",
        display_order: 3,
      },
      {
        id: "4",
        service_name: "French Language A2",
        group_key: "French Language",
        group_label: "French Language",
        display_order: 4,
      },
    ];

    const groups = groupCatalogueItems(items, "coaching_services");
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "IELTS")?.items).toHaveLength(2);
    expect(groups.find((g) => g.key === "French Language")?.items).toHaveLength(2);
  });
});

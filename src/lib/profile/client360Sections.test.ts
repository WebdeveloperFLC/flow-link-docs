import { describe, expect, it } from "vitest";
import { CLIENT_DETAIL_TABS } from "@/components/clients/ClientDetailTabNav";
import { CLIENT_360_SECTIONS } from "@/lib/profile/client360Sections";

const CRM_TAB_IDS = new Set(CLIENT_DETAIL_TABS.map((t) => t.id));

describe("client360Sections deep-link audit", () => {
  it("every detailTabId maps to an existing CLIENT_DETAIL_TABS id", () => {
    for (const section of CLIENT_360_SECTIONS) {
      expect(section.detailTabId, `${section.id} detailTabId`).toBeDefined();
      expect(CRM_TAB_IDS.has(section.detailTabId!), `${section.id} → ${section.detailTabId}`).toBe(true);
    }
  });

  it("services maps to client-services not commercial", () => {
    const services = CLIENT_360_SECTIONS.find((s) => s.id === "services");
    expect(services?.detailTabId).toBe("client-services");
  });

  it("comms maps to communications", () => {
    const comms = CLIENT_360_SECTIONS.find((s) => s.id === "comms");
    expect(comms?.detailTabId).toBe("communications");
  });

  it("activity maps to activity-log", () => {
    const activity = CLIENT_360_SECTIONS.find((s) => s.id === "activity");
    expect(activity?.detailTabId).toBe("activity-log");
  });

  it("payments maps to commercial", () => {
    const payments = CLIENT_360_SECTIONS.find((s) => s.id === "payments");
    expect(payments?.detailTabId).toBe("commercial");
  });
});

import { describe, expect, it } from "vitest";
import {
  isPathInWorkspace,
  isWorkspaceSubLinkVisible,
  isWorkspaceVisible,
  visiblePerformanceWorkspaceSidebar,
  visibleWorkspaceSubLinks,
} from "./performanceWorkspaceNav";

const adminCtx = {
  isAdmin: true,
  hasRole: () => true,
};

const counselorCtx = {
  isAdmin: false,
  hasRole: (roles: readonly string[]) => roles.includes("counselor"),
};

const managerCtx = {
  isAdmin: false,
  hasRole: (roles: readonly string[]) => roles.includes("manager"),
};

describe("performanceWorkspaceNav", () => {
  it("maps paths to workspaces without overlap gaps", () => {
    expect(isPathInWorkspace("/performance", "dashboard")).toBe(true);
    expect(isPathInWorkspace("/performance/admin", "dashboard")).toBe(true);
    expect(isPathInWorkspace("/performance/admin/unclassified", "teams-performance")).toBe(true);
    expect(isPathInWorkspace("/performance/wallets", "discounts-wallets")).toBe(true);
    expect(isPathInWorkspace("/performance/offers/library", "offers-promotions")).toBe(true);
    expect(isPathInWorkspace("/incentives/payouts", "incentives-payouts")).toBe(true);
    expect(isPathInWorkspace("/performance/configuration", "administration")).toBe(true);
  });

  it("shows counselors dashboard and discounts only in sidebar", () => {
    const items = visiblePerformanceWorkspaceSidebar(counselorCtx);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("dashboard");
    expect(ids).toContain("discounts-wallets");
    expect(ids).toContain("offers-promotions");
    expect(ids).not.toContain("incentives-payouts");
    expect(ids).not.toContain("teams-performance");
  });

  it("shows managers broader workspace set", () => {
    const items = visiblePerformanceWorkspaceSidebar(managerCtx);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("teams-performance");
    expect(ids).toContain("analytics-reports");
    expect(ids).toContain("administration");
  });

  it("filters counselor sub-links in discounts workspace", () => {
    const links = visibleWorkspaceSubLinks("discounts-wallets", counselorCtx);
    const labels = links.map((l) => l.label);
    expect(labels).toContain("Give discount");
    expect(labels).not.toContain("Branch pool");
    expect(labels).not.toContain("Wallet policy");
  });

  it("hides admin-only incentive ops from managers", () => {
    const links = visibleWorkspaceSubLinks("incentives-payouts", managerCtx);
    const labels = links.map((l) => l.label);
    expect(labels).toContain("Ledger & liability");
    expect(labels).toContain("Approvals");
    expect(labels).not.toContain("Payout desk");
    expect(labels).not.toContain("Simulator");
  });

  it("respects admin-only sub-link gates", () => {
    expect(
      isWorkspaceSubLinkVisible(
        { to: "/incentives/payouts", label: "Payout desk", icon: {} as never, adminOnly: true },
        managerCtx,
      ),
    ).toBe(false);
    expect(
      isWorkspaceSubLinkVisible(
        { to: "/incentives/payouts", label: "Payout desk", icon: {} as never, adminOnly: true },
        adminCtx,
      ),
    ).toBe(true);
  });

  it("finance workspace visible to directors not counselors", () => {
    expect(isWorkspaceVisible("finance-profitability", counselorCtx)).toBe(false);
    expect(
      isWorkspaceVisible("finance-profitability", {
        isAdmin: false,
        hasRole: (roles) => roles.includes("director"),
      }),
    ).toBe(true);
  });
});

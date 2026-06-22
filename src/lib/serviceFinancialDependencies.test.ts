import { describe, expect, it } from "vitest";
import {
  financialDependencySummary,
  nonFinancialDependencySummary,
  parseServiceFinancialDependencies,
  serviceMatchKeys,
  type ServiceFinancialDependencies,
} from "./serviceFinancialDependencies";
import type { ServiceCatalogueItem } from "@/lib/leads";

const sampleCatalogue: ServiceCatalogueItem[] = [
  {
    id: "lib-uuid-1",
    service_code: "lib-uuid-1::Canada",
    service_name: "Study Visa Canada",
    sub_category: "Study Visa",
    category: "visa",
  } as ServiceCatalogueItem,
];

describe("serviceFinancialDependencies", () => {
  it("serviceMatchKeys includes stored code and parsed library id", () => {
    const keys = serviceMatchKeys("lib-uuid-1::Canada::variant", sampleCatalogue);
    expect(keys).toContain("lib-uuid-1::Canada::variant");
    expect(keys).toContain("lib-uuid-1");
  });

  it("parseServiceFinancialDependencies maps RPC payload", () => {
    const parsed = parseServiceFinancialDependencies({
      service_code: "abc",
      match_keys: ["abc"],
      has_financial_data: true,
      can_archive_directly: false,
      block_removal: true,
      financial: {
        has_data: true,
        invoices: { count: 2, invoice_ids: ["inv-1"] },
        payments: { count: 1, amount_total: 5000 },
        allocations: { count: 3, amount_total: 4500 },
        receipts: { count: 1 },
        refunds: { count: 0 },
        adjustments: { count: 0 },
        discounts: { count: 1 },
        wallet_usage: { count: 0 },
        accounting_journals: { count: 0 },
        trust_entries: { count: 0 },
      },
      non_financial: {
        documents: { count: 4 },
        tasks: { count: 1 },
        forms: { count: 2 },
        notes: { count: 0 },
      },
    });

    expect(parsed?.has_financial_data).toBe(true);
    expect(parsed?.financial.invoices.count).toBe(2);
    expect(parsed?.financial.discounts.count).toBe(1);
    expect(parsed?.non_financial.documents.count).toBe(4);
  });

  it("financialDependencySummary lists non-zero counts", () => {
    const deps: ServiceFinancialDependencies = {
      service_code: "x",
      match_keys: ["x"],
      has_financial_data: true,
      can_archive_directly: false,
      block_removal: true,
      financial: {
        has_data: true,
        invoices: { count: 1 },
        payments: { count: 2 },
        allocations: { count: 1, amount_total: 1000 },
        receipts: { count: 0 },
        refunds: { count: 0 },
        adjustments: { count: 0 },
        discounts: { count: 0 },
        wallet_usage: { count: 0 },
        accounting_journals: { count: 0 },
        trust_entries: { count: 0 },
      },
      non_financial: {
        documents: { count: 0 },
        tasks: { count: 0 },
        forms: { count: 0 },
        notes: { count: 0 },
      },
    };

    const lines = financialDependencySummary(deps);
    expect(lines.some((l) => l.includes("invoice"))).toBe(true);
    expect(lines.some((l) => l.includes("payment"))).toBe(true);
    expect(lines.some((l) => l.includes("allocation"))).toBe(true);
  });

  it("nonFinancialDependencySummary lists linked records", () => {
    const deps: ServiceFinancialDependencies = {
      service_code: "x",
      match_keys: ["x"],
      has_financial_data: false,
      can_archive_directly: true,
      block_removal: false,
      financial: {
        has_data: false,
        invoices: { count: 0 },
        payments: { count: 0 },
        allocations: { count: 0 },
        receipts: { count: 0 },
        refunds: { count: 0 },
        adjustments: { count: 0 },
        discounts: { count: 0 },
        wallet_usage: { count: 0 },
        accounting_journals: { count: 0 },
        trust_entries: { count: 0 },
      },
      non_financial: {
        documents: { count: 3 },
        tasks: { count: 1 },
        forms: { count: 0 },
        notes: { count: 2 },
      },
    };

    const lines = nonFinancialDependencySummary(deps);
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toMatch(/document/);
    expect(lines.join(" ")).toMatch(/task/);
    expect(lines.join(" ")).toMatch(/note/);
  });
});

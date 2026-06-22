import { describe, expect, it } from "vitest";
import {
  financialDependencySummary,
  nonFinancialDependencySummary,
  parseServiceFinancialDependencies,
  preFinancialDraftSummary,
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

  it("parseServiceFinancialDependencies maps pre_financial tier", () => {
    const parsed = parseServiceFinancialDependencies({
      service_code: "abc",
      match_keys: ["abc"],
      tier: "pre_financial",
      has_financial_data: false,
      can_archive_directly: true,
      block_removal: false,
      can_cleanup_drafts: true,
      financial: {
        has_data: false,
        invoices: { count: 1 },
        draft_invoices: { count: 1, invoice_ids: ["inv-1"] },
        issued_invoices: { count: 0 },
        payments: { count: 0 },
        allocations: { count: 0 },
        receipts: { count: 0 },
        refunds: { count: 0 },
        adjustments: { count: 0 },
        discounts: { count: 1 },
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
    });

    expect(parsed?.tier).toBe("pre_financial");
    expect(parsed?.block_removal).toBe(false);
    expect(parsed?.can_cleanup_drafts).toBe(true);
    expect(parsed?.financial.draft_invoices.count).toBe(1);
    expect(parsed?.financial.discounts.count).toBe(1);
  });

  it("parseServiceFinancialDependencies maps financial tier", () => {
    const parsed = parseServiceFinancialDependencies({
      service_code: "abc",
      match_keys: ["abc"],
      tier: "financial",
      has_financial_data: true,
      can_archive_directly: false,
      block_removal: true,
      can_cleanup_drafts: false,
      financial: {
        has_data: true,
        invoices: { count: 1 },
        draft_invoices: { count: 0 },
        issued_invoices: { count: 1, invoice_ids: ["inv-2"] },
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
        documents: { count: 0 },
        tasks: { count: 0 },
        forms: { count: 0 },
        notes: { count: 0 },
      },
    });

    expect(parsed?.tier).toBe("financial");
    expect(parsed?.block_removal).toBe(true);
  });

  it("preFinancialDraftSummary describes draft cleanup", () => {
    const deps: ServiceFinancialDependencies = {
      service_code: "x",
      match_keys: ["x"],
      tier: "pre_financial",
      has_financial_data: false,
      can_archive_directly: true,
      block_removal: false,
      can_cleanup_drafts: true,
      financial: {
        has_data: false,
        invoices: { count: 2 },
        draft_invoices: { count: 2 },
        issued_invoices: { count: 0 },
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
        documents: { count: 0 },
        tasks: { count: 0 },
        forms: { count: 0 },
        notes: { count: 0 },
      },
    };

    expect(preFinancialDraftSummary(deps)).toMatch(/2 draft invoices will be cancelled/);
  });

  it("financialDependencySummary lists issued invoices not drafts alone", () => {
    const deps: ServiceFinancialDependencies = {
      service_code: "x",
      match_keys: ["x"],
      tier: "financial",
      has_financial_data: true,
      can_archive_directly: false,
      block_removal: true,
      can_cleanup_drafts: false,
      financial: {
        has_data: true,
        invoices: { count: 1 },
        draft_invoices: { count: 0 },
        issued_invoices: { count: 1 },
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
        documents: { count: 0 },
        tasks: { count: 0 },
        forms: { count: 0 },
        notes: { count: 0 },
      },
    };

    const lines = financialDependencySummary(deps);
    expect(lines.some((l) => l.includes("issued"))).toBe(true);
  });

  it("nonFinancialDependencySummary lists linked records", () => {
    const deps: ServiceFinancialDependencies = {
      service_code: "x",
      match_keys: ["x"],
      tier: "pre_financial",
      has_financial_data: false,
      can_archive_directly: true,
      block_removal: false,
      can_cleanup_drafts: false,
      financial: {
        has_data: false,
        invoices: { count: 0 },
        draft_invoices: { count: 0 },
        issued_invoices: { count: 0 },
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
  });
});

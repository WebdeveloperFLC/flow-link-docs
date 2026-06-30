import { describe, expect, it } from "vitest";
import {
  consultancyAmountsFromFeeItems,
  consultancyAmountsFromPickerVariant,
  formatConsultancyKpiFromStored,
  isConsultancyCostItem,
  isConsultancyCostSection,
  shouldConvertInrViaCurrencyMaster,
} from "./crmPricingRules";
import { convertOfficialFigureToInr } from "./officialFigureFx";

describe("crmPricingRules", () => {
  it("identifies consultancy cost sections", () => {
    expect(isConsultancyCostSection({ id: "flc", label: "Future Link professional fee" })).toBe(true);
    expect(isConsultancyCostSection({ id: "govt", label: "Government fees" })).toBe(false);
  });

  it("never applies Currency Master to consultancy items", () => {
    expect(
      shouldConvertInrViaCurrencyMaster(
        { id: "flc", label: "Future Link professional fee" },
        { label: "FLC fee", official: false, inr: "auto" },
      ),
    ).toBe(false);
    expect(
      shouldConvertInrViaCurrencyMaster(
        { id: "govt", label: "Government fees" },
        { label: "TRV fee", official: true, inr: "auto" },
      ),
    ).toBe(true);
  });

  it("reads independent currency amounts from fee items without conversion", () => {
    const amounts = consultancyAmountsFromFeeItems([
      { fee_label: "Consultancy fee (INR)", amount: "7,080", currency: "INR" },
      { fee_label: "Consultancy fee (CAD)", amount: "105", currency: "CAD" },
    ]);
    expect(amounts.INR).toBe(7080);
    expect(amounts.CAD).toBe(105);
    expect(formatConsultancyKpiFromStored(amounts).value).toBe("₹7,080");
  });

  it("reads picker variant amounts independently", () => {
    const amounts = consultancyAmountsFromPickerVariant({ fee_inr: 7080, fee_cad: 105 });
    expect(amounts.INR).toBe(7080);
    expect(amounts.CAD).toBe(105);
  });

  it("flags consultancy line items by label", () => {
    expect(isConsultancyCostItem({ label: "Future Link consultancy fee", official: false })).toBe(true);
    expect(isConsultancyCostItem({ label: "TRV application fee", official: true })).toBe(false);
  });
});

describe("officialFigureFx", () => {
  it("converts official foreign amounts to INR via Currency Master snapshot only", () => {
    const snap = { INR: 1, CAD: 68 };
    expect(convertOfficialFigureToInr(100, "CAD", snap)).toBe(6800);
    expect(convertOfficialFigureToInr(5000, "INR", snap)).toBe(5000);
  });
});

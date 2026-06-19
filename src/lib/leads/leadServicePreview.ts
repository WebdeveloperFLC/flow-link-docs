/** Service codes shown in Lead Preview "Custom Combo" row (mirrors Custom Combo tab scope). */
export function buildLeadCustomComboCodes(lead: {
  coaching_services?: string[] | null;
  visa_services?: string[] | null;
  allied_services?: string[] | null;
  travel_financial_services?: string[] | null;
}): string[] {
  return [
    ...(lead.coaching_services ?? []),
    ...(lead.visa_services ?? []),
    ...(lead.allied_services ?? []),
    ...(lead.travel_financial_services ?? []),
  ];
}

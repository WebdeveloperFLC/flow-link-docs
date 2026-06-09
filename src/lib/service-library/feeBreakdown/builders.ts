import type { GovtFeeBreakdownItem, GovtFeeBreakdownSource } from "./types";

const DISCLAIMER =
  "Official government and VAC charges only. Verify current amounts on the authority website before quoting clients. INR equivalents use an internal FX snapshot for counselor reference — not a client quote.";

export function fee(
  id: string,
  label: string,
  opts: {
    applicable?: boolean;
    amount?: number | null;
    currency: string;
    unit?: GovtFeeBreakdownItem["unit"];
    notes?: string;
  },
): GovtFeeBreakdownItem {
  const applicable = opts.applicable !== false;
  return {
    id,
    label,
    applicable,
    amount: applicable ? (opts.amount ?? null) : null,
    currency: opts.currency,
    unit: opts.unit,
    notes: opts.notes,
  };
}

export function na(id: string, label: string, notes?: string): GovtFeeBreakdownItem {
  return fee(id, label, { applicable: false, currency: "—", notes });
}

export function breakdown(
  libraryId: string,
  title: string,
  nativeCurrency: string,
  sourceUrl: string,
  lastVerified: string,
  items: GovtFeeBreakdownItem[],
  disclaimer = DISCLAIMER,
): GovtFeeBreakdownSource {
  return { libraryId, title, nativeCurrency, lastVerified, sourceUrl, disclaimer, items };
}

/** Schengen short-stay Type C (adult €90, child 6–12 €45). */
export function schengenVisitor(
  libraryId: string,
  country: string,
  vfsNote: string,
): GovtFeeBreakdownSource {
  return breakdown(
    libraryId,
    `${country} – Schengen Visitor Visa (Type C)`,
    "EUR",
    "https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/eu-citizenship-and-free-movement/eu-visa-policy_en",
    "Jun 2026",
    [
      fee("visa_application", "Schengen visa application fee (adult)", {
        amount: 90,
        currency: "EUR",
        unit: "per applicant",
        notes: "Short-stay Type C · standard tariff for adults",
      }),
      fee("dependent_child", "Schengen visa fee (child aged 6–12)", {
        amount: 45,
        currency: "EUR",
        unit: "per dependent child",
        notes: "Children under 6 are exempt from visa fee",
      }),
      na("dependent_adult", "Dependent / spouse fee (separate application)", "Each traveller files own Schengen application"),
      na("landing_rprf", "Landing / residence fee", "Not applicable for short-stay Schengen"),
      na("biometrics", "Biometrics fee (government)", "Included in visa fee for Schengen; no separate govt biometrics charge"),
      fee("vfs_service", "VFS / TLS / embassy service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: vfsNote,
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable for Schengen visitor"),
      na("sevis", "SEVIS fee", "US student system only"),
      na("priority_service", "Priority processing", "Not offered on standard Schengen visitor route"),
    ],
  );
}

/** National long-stay student D visa — €75 govt fee typical for EU missions. */
export function schengenStudent(
  libraryId: string,
  country: string,
  vfsNote: string,
  extraNotes?: string,
): GovtFeeBreakdownSource {
  return breakdown(
    libraryId,
    `${country} – Student Visa (National D)`,
    "EUR",
    "https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/eu-citizenship-and-free-movement/eu-visa-policy_en",
    "Jun 2026",
    [
      fee("visa_application", "National D visa / residence permit application fee", {
        amount: 75,
        currency: "EUR",
        unit: "per applicant",
        notes: extraNotes ?? "Long-stay student route · verify mission-specific fee",
      }),
      na("dependent_adult", "Spouse / partner visa fee", "Dependants apply separately if accompanying"),
      na("dependent_child", "Dependent child fee", "Separate application per dependant if required"),
      na("landing_rprf", "Landing fee", "Not applicable — residence permit issued in destination country"),
      na("biometrics", "Biometrics (government)", "Usually included in visa / permit fee"),
      fee("vfs_service", "VFS / TLS / embassy service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: vfsNote,
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable — proof of insurance required instead"),
      na("sevis", "SEVIS fee", "US only"),
      fee("other", "Blocked account / proof of funds", {
        amount: null,
        currency: "EUR",
        unit: "varies",
        notes: "Not a government fee — financial prerequisite for many EU student visas",
      }),
    ],
  );
}

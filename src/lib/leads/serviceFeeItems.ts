export type LibraryFeePair = { inr: number | null; cad: number | null };

export type LibraryGovtNative = { amount: number; currency: string };

export type LibraryGovtFee = LibraryFeePair & {
  native: LibraryGovtNative | null;
};

export type FeeItemRow = {
  library_id: string;
  fee_label: string;
  amount: string | null;
  currency: string | null;
  country: string | null;
};

function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[£€$,\s]/g, "").replace(/\+.*/, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseCurrencySymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u.includes("GBP") || raw.includes("£")) return "GBP";
  if (u.includes("EUR") || raw.includes("€")) return "EUR";
  if (u.includes("AUD")) return "AUD";
  if (u.includes("NZD")) return "NZD";
  if (u.includes("USD")) return "USD";
  if (u.includes("CAD")) return "CAD";
  if (u.includes("INR") || raw.includes("₹")) return "INR";
  return null;
}

function upsertPair(map: Map<string, LibraryFeePair>, libraryId: string, currency: string, amount: number) {
  const cur = map.get(libraryId) ?? { inr: null, cad: null };
  if (currency === "CAD") cur.cad = amount;
  else if (currency === "INR") cur.inr = amount;
  map.set(libraryId, cur);
}

function upsertNative(map: Map<string, LibraryGovtNative>, libraryId: string, currency: string, amount: number) {
  if (!map.has(libraryId)) {
    map.set(libraryId, { amount, currency });
  }
}

/** Aggregate consultancy / government fee rows per library_id from service_library_fee_items. */
export function buildLibraryFeeMaps(rows: FeeItemRow[]): {
  consultancy: Map<string, LibraryFeePair>;
  government: Map<string, LibraryGovtFee>;
} {
  const consultancy = new Map<string, LibraryFeePair>();
  const govtPairs = new Map<string, LibraryFeePair>();
  const govtNative = new Map<string, LibraryGovtNative>();

  for (const row of rows) {
    const label = row.fee_label.toLowerCase();
    const amount = parseAmount(row.amount);
    if (amount == null) continue;

    const currency =
      (row.currency ?? "").toUpperCase() ||
      parseCurrencySymbol(row.amount) ||
      "INR";

    if (/government|govt|ircc/.test(label)) {
      upsertPair(govtPairs, row.library_id, currency, amount);
      upsertNative(govtNative, row.library_id, currency, amount);
    } else if (/consultancy|consult|service fee|our fee/.test(label)) {
      upsertPair(consultancy, row.library_id, currency, amount);
    }
  }

  const government = new Map<string, LibraryGovtFee>();
  for (const [libraryId, pair] of govtPairs) {
    government.set(libraryId, { ...pair, native: govtNative.get(libraryId) ?? null });
  }

  return { consultancy, government };
}

export function pickFeePair(
  map: Map<string, LibraryFeePair>,
  libraryId: string,
  override?: { inr?: number | null; cad?: number | null },
): LibraryFeePair {
  if (override?.inr != null || override?.cad != null) {
    return {
      inr: override.inr ?? map.get(libraryId)?.inr ?? null,
      cad: override.cad ?? map.get(libraryId)?.cad ?? null,
    };
  }
  return map.get(libraryId) ?? { inr: null, cad: null };
}

export function pickGovtFee(
  map: Map<string, LibraryGovtFee>,
  libraryId: string,
  override?: {
    inr?: number | null;
    cad?: number | null;
    amount?: number | null;
    currency?: string | null;
  },
): LibraryGovtFee {
  const base = map.get(libraryId) ?? { inr: null, cad: null, native: null };
  if (override?.amount != null && override.currency) {
    return {
      inr: override.inr ?? base.inr,
      cad: override.cad ?? base.cad,
      native: { amount: override.amount, currency: override.currency },
    };
  }
  if (override?.inr != null || override?.cad != null) {
    return {
      inr: override.inr ?? base.inr,
      cad: override.cad ?? base.cad,
      native: base.native,
    };
  }
  return base;
}

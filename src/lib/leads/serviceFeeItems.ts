export type LibraryFeePair = { inr: number | null; cad: number | null };

export type FeeItemRow = {
  library_id: string;
  fee_label: string;
  amount: string | null;
  currency: string | null;
  country: string | null;
};

function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function upsertPair(map: Map<string, LibraryFeePair>, libraryId: string, currency: string, amount: number) {
  const cur = map.get(libraryId) ?? { inr: null, cad: null };
  if (currency === "CAD") cur.cad = amount;
  else cur.inr = amount;
  map.set(libraryId, cur);
}

/** Aggregate consultancy / government fee rows per library_id from service_library_fee_items. */
export function buildLibraryFeeMaps(rows: FeeItemRow[]): {
  consultancy: Map<string, LibraryFeePair>;
  government: Map<string, LibraryFeePair>;
} {
  const consultancy = new Map<string, LibraryFeePair>();
  const government = new Map<string, LibraryFeePair>();

  for (const row of rows) {
    const label = row.fee_label.toLowerCase();
    const amount = parseAmount(row.amount);
    if (amount == null) continue;

    const currency = (row.currency ?? "INR").toUpperCase();
    if (/government|govt|ircc/.test(label)) {
      upsertPair(government, row.library_id, currency, amount);
    } else if (/consultancy|consult|service fee|our fee/.test(label)) {
      upsertPair(consultancy, row.library_id, currency, amount);
    }
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

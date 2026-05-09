/** Minimal country -> ITU dialing code map (no leading +).
 *  Used to auto-suggest the dial-code for a client phone based on the
 *  address / nationality on file. Editable in the UI. */

const MAP: Record<string, string> = {
  india: "91", in: "91",
  "united states": "1", usa: "1", us: "1", america: "1",
  canada: "1", ca: "1",
  "united kingdom": "44", uk: "44", britain: "44", england: "44", gb: "44",
  australia: "61", au: "61",
  "new zealand": "64", nz: "64",
  germany: "49", de: "49",
  france: "33", fr: "33",
  ireland: "353", ie: "353",
  singapore: "65", sg: "65",
  uae: "971", "united arab emirates": "971", ae: "971",
  "saudi arabia": "966", sa: "966",
  qatar: "974", qa: "974",
  kuwait: "965", kw: "965",
  oman: "968", om: "968",
  bahrain: "973", bh: "973",
  pakistan: "92", pk: "92",
  bangladesh: "880", bd: "880",
  "sri lanka": "94", lk: "94",
  nepal: "977", np: "977",
  china: "86", cn: "86",
  japan: "81", jp: "81",
  "south korea": "82", kr: "82", korea: "82",
  malaysia: "60", my: "60",
  philippines: "63", ph: "63",
  indonesia: "62", id: "62",
  thailand: "66", th: "66",
  vietnam: "84", vn: "84",
  italy: "39", it: "39",
  spain: "34", es: "34",
  netherlands: "31", nl: "31",
  switzerland: "41", ch: "41",
  sweden: "46", se: "46",
  norway: "47", no: "47",
  denmark: "45", dk: "45",
  finland: "358", fi: "358",
  poland: "48", pl: "48",
  portugal: "351", pt: "351",
  brazil: "55", br: "55",
  mexico: "52", mx: "52",
  argentina: "54", ar: "54",
  "south africa": "27", za: "27",
  nigeria: "234", ng: "234",
  kenya: "254", ke: "254",
  egypt: "20", eg: "20",
  turkey: "90", tr: "90",
  russia: "7", ru: "7",
  ukraine: "380", ua: "380",
};

export function dialCodeFor(country?: string | null): string {
  if (!country) return "";
  const k = country.trim().toLowerCase();
  return MAP[k] ?? "";
}

/** Combine country code + raw phone -> digits-only E.164-ish string (no +). */
export function joinPhone(countryCode?: string | null, phone?: string | null): string {
  const cc = String(countryCode ?? "").replace(/\D/g, "");
  const p = String(phone ?? "").replace(/\D/g, "");
  if (!p) return "";
  // If phone already starts with the country code, don't double up.
  if (cc && p.startsWith(cc)) return p;
  return cc ? `${cc}${p}` : p;
}
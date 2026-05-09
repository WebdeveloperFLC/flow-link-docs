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

/** Curated list for country -> dial code dropdowns (de-duplicated, sorted). */
export const COUNTRY_OPTIONS: { name: string; code: string }[] = [
  { name: "India", code: "91" },
  { name: "United States", code: "1" },
  { name: "Canada", code: "1" },
  { name: "United Kingdom", code: "44" },
  { name: "Australia", code: "61" },
  { name: "New Zealand", code: "64" },
  { name: "Ireland", code: "353" },
  { name: "Germany", code: "49" },
  { name: "France", code: "33" },
  { name: "Italy", code: "39" },
  { name: "Spain", code: "34" },
  { name: "Netherlands", code: "31" },
  { name: "Switzerland", code: "41" },
  { name: "Sweden", code: "46" },
  { name: "Norway", code: "47" },
  { name: "Denmark", code: "45" },
  { name: "Finland", code: "358" },
  { name: "Poland", code: "48" },
  { name: "Portugal", code: "351" },
  { name: "Singapore", code: "65" },
  { name: "United Arab Emirates", code: "971" },
  { name: "Saudi Arabia", code: "966" },
  { name: "Qatar", code: "974" },
  { name: "Kuwait", code: "965" },
  { name: "Oman", code: "968" },
  { name: "Bahrain", code: "973" },
  { name: "Pakistan", code: "92" },
  { name: "Bangladesh", code: "880" },
  { name: "Sri Lanka", code: "94" },
  { name: "Nepal", code: "977" },
  { name: "China", code: "86" },
  { name: "Japan", code: "81" },
  { name: "South Korea", code: "82" },
  { name: "Malaysia", code: "60" },
  { name: "Philippines", code: "63" },
  { name: "Indonesia", code: "62" },
  { name: "Thailand", code: "66" },
  { name: "Vietnam", code: "84" },
  { name: "Brazil", code: "55" },
  { name: "Mexico", code: "52" },
  { name: "Argentina", code: "54" },
  { name: "South Africa", code: "27" },
  { name: "Nigeria", code: "234" },
  { name: "Kenya", code: "254" },
  { name: "Egypt", code: "20" },
  { name: "Turkey", code: "90" },
  { name: "Russia", code: "7" },
  { name: "Ukraine", code: "380" },
].sort((a, b) => a.name.localeCompare(b.name));
export function normalizePhoneE164(raw: string, defaultCountryCode = "91"): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `${defaultCountryCode}${digits.slice(1)}`;
  return digits;
}

export function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length <= 10) return d;
  return `+${d}`;
}

/** Build E.164-ish digits from lead phone + country code fields. */
export function leadPhoneToE164(
  phone?: string | null,
  phoneCountryCode?: string | null,
  defaultCountryCode = "91",
): string {
  const local = (phone || "").replace(/\D/g, "");
  if (!local) return "";
  if (local.length > 10) return local;
  const code = (phoneCountryCode || "").replace(/\D/g, "") || defaultCountryCode;
  return `${code}${local}`;
}

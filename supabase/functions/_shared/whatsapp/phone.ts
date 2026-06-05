/** Strip to digits; prepend default country code when local 10-digit number. */
export function normalizePhoneE164(raw: string, defaultCountryCode = "91"): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `${defaultCountryCode}${digits.slice(1)}`;
  return digits;
}

export function phoneSuffix(digits: string, len = 10): string {
  const d = digits.replace(/\D/g, "");
  return d.length <= len ? d : d.slice(-len);
}

export function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  if (!da || !db) return false;
  if (da === db) return true;
  return phoneSuffix(da) === phoneSuffix(db);
}

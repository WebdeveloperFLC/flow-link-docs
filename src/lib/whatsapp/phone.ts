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

/** Masking helpers for telecaller-restricted contact details */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const clean = phone.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  const tail = clean.slice(-4);
  return clean.slice(0, 2) + "X".repeat(Math.max(2, clean.length - 6)) + tail;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(4, Math.max(2, local.length - 2)));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export function applyContactMask(opts: { phone?: string | null; email?: string | null; mask: boolean }) {
  if (!opts.mask) return { phone: opts.phone ?? "", email: opts.email ?? "" };
  return { phone: maskPhone(opts.phone), email: maskEmail(opts.email) };
}
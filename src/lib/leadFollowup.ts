export const LEAD_FOLLOWUP_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
] as const;

export type LeadFollowupChannel = (typeof LEAD_FOLLOWUP_CHANNELS)[number]["value"];

export function followupChannelLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return LEAD_FOLLOWUP_CHANNELS.find((c) => c.value === value)?.label ?? value;
}

/** Format ISO timestamp for `<input type="datetime-local" />`. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatFollowupDue(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function followupDueState(iso: string | null | undefined): "none" | "upcoming" | "due" | "overdue" {
  if (!iso) return "none";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "none";
  const now = Date.now();
  if (t < now - 60_000) return "overdue";
  if (t <= now + 15 * 60_000) return "due";
  return "upcoming";
}

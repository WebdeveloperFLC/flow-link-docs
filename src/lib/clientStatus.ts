import type { MasterItem } from "@/lib/masters";

/** Whether this status label is shown on the client portal (Masters toggle). Defaults true. */
export function clientStatusShowToClient(item: MasterItem): boolean {
  const v = item.metadata?.show_to_client;
  if (typeof v === "boolean") return v;
  return true;
}

export function resolveClientStatusLabel(
  code: string | null | undefined,
  items: MasterItem[],
): string {
  if (!code?.trim()) return "—";
  const hit = items.find((i) => i.code === code || i.label.toLowerCase() === code.toLowerCase());
  return hit?.label ?? code.replace(/_/g, " ");
}

export function resolveClientStatusCode(
  value: string | null | undefined,
  items: MasterItem[],
): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  const byCode = items.find((i) => i.code === v);
  if (byCode) return byCode.code;
  const byLabel = items.find((i) => i.label.toLowerCase() === v.toLowerCase());
  return byLabel?.code ?? v;
}

export function portalClientStatusLabel(
  statusCode: string | null | undefined,
  items: MasterItem[],
): string | null {
  if (!statusCode?.trim()) return null;
  const item = items.find((i) => i.code === statusCode);
  if (!item || !clientStatusShowToClient(item)) return null;
  return item.label;
}

/** Detect when a client wants a human counselor (skip AI counseling). */

export function clientRequestsCounselor(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  const lower = t.toLowerCase();

  if (/^(counselor|counsellor|human|connect counselor|call me|speak to counselor)$/i.test(lower)) {
    return true;
  }

  return /(talk to|speak to|connect me|need a|want a|call me|chat with).*(counselor|counsellor|human|person|someone|advisor|adviser|team)/i.test(t)
    || /(counselor|counsellor|human).*(please|now|chahiye|se baat)/i.test(t)
    || /counselor se baat|counsellor se baat|real person|live agent/i.test(lower);
}

export function counselingBeforeAssignEnabled(aiMode: string): boolean {
  const v = (Deno.env.get("WHATSAPP_COUNSELING_BEFORE_ASSIGN") || "").toLowerCase();
  if (v === "false" || v === "0" || v === "off") return false;
  if (v === "true" || v === "1" || v === "on") return true;
  return aiMode === "gemini" || aiMode === "gemini_dev" || aiMode === "production";
}

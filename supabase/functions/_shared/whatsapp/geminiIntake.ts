import type { IntakeData } from "./rulesIntake.ts";
import { nextRulesReply } from "./rulesIntake.ts";
import { callGeminiJson, geminiKeysAvailable } from "./geminiClient.ts";

const INTAKE_SYSTEM = `You are the Future Link Consultants WhatsApp helpline assistant.
Collect intake in order: country of interest → study level (undergraduate/postgraduate/work visa/other) → branch or city preference → full name → confirmation (YES).

While collecting details:
- If the client asks a question, give a brief helpful answer (1 sentence) then ask the next intake question.
- Keep replies short and WhatsApp-friendly (1-2 sentences).
- One question at a time.
- When all fields are collected, summarize and ask them to reply YES to confirm.
- When the client confirms with YES, set confirmed true.

Reply ONLY with valid JSON (no markdown):
{
  "intake": {
    "step": "country"|"level"|"branch"|"name"|"confirm"|"done",
    "country": "...",
    "level": "...",
    "branch_preference": "...",
    "full_name": "..."
  },
  "replies": ["message to send on WhatsApp"],
  "confirmed": false
}`;

export async function nextGeminiReply(
  intake: IntakeData,
  userText: string,
): Promise<{ intake: IntakeData; replies: string[]; confirmed: boolean }> {
  if (!geminiKeysAvailable()) {
    return nextRulesReply(intake, userText);
  }

  try {
    const parsed = await callGeminiJson<{
      intake?: IntakeData;
      replies?: string[];
      confirmed?: boolean;
    }>(
      INTAKE_SYSTEM,
      `Current intake JSON: ${JSON.stringify(intake)}\nClient message: ${userText}`,
      0.2,
    );

    if (!parsed) return nextRulesReply(intake, userText);

    return {
      intake: { ...intake, ...(parsed.intake || {}) },
      replies: Array.isArray(parsed.replies) ? parsed.replies.map(String).filter(Boolean) : [],
      confirmed: !!parsed.confirmed,
    };
  } catch (e) {
    console.warn("[geminiIntake] fallback to rules:", e);
    return nextRulesReply(intake, userText);
  }
}

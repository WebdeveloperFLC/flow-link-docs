import type { IntakeData } from "./rulesIntake.ts";
import { intakeReadyToConfirm, isIntakeYesConfirm, nextRulesReply } from "./rulesIntake.ts";
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

    let nextIntake: IntakeData = { ...intake, ...(parsed.intake || {}) };
    let replies = Array.isArray(parsed.replies) ? parsed.replies.map(String).filter(Boolean) : [];
    let confirmed = !!parsed.confirmed;

    // Gemini often omits confirmed:true or replies[] on YES — enforce locally
    if (!confirmed && isIntakeYesConfirm(userText) && intakeReadyToConfirm(nextIntake)) {
      confirmed = true;
      nextIntake.step = "done";
    }

    if (replies.length === 0) {
      const rules = nextRulesReply(nextIntake, userText);
      if (confirmed || rules.confirmed) {
        confirmed = true;
        nextIntake = { ...rules.intake, ...nextIntake, step: "done" };
        replies = rules.replies.length
          ? rules.replies
          : ["Thank you! Your details are recorded."];
      } else {
        return rules;
      }
    }

    return { intake: nextIntake, replies, confirmed };
  } catch (e) {
    console.warn("[geminiIntake] fallback to rules:", e);
    return nextRulesReply(intake, userText);
  }
}

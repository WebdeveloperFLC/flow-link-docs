import type { IntakeData } from "./rulesIntake.ts";
import { nextRulesReply } from "./rulesIntake.ts";

const INTAKE_SYSTEM = `You are the Future Link WhatsApp helpline intake assistant.
Collect: country of interest, study level (undergraduate/postgraduate/work visa/other), full name.
When the client confirms with YES, set confirmed true.

Reply ONLY with valid JSON (no markdown):
{
  "intake": { "step": "country"|"level"|"name"|"confirm"|"done", "country": "...", "level": "...", "full_name": "..." },
  "replies": ["message to send on WhatsApp"],
  "confirmed": false
}

Keep replies short (1-2 sentences). One question at a time.`;

export async function nextGeminiReply(
  intake: IntakeData,
  userText: string,
): Promise<{ intake: IntakeData; replies: string[]; confirmed: boolean }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey) {
    return nextRulesReply(intake, userText);
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: INTAKE_SYSTEM },
          {
            role: "user",
            content: `Current intake JSON: ${JSON.stringify(intake)}\nClient message: ${userText}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.warn("[geminiIntake] gateway error:", res.status);
      return nextRulesReply(intake, userText);
    }

    const json = await res.json();
    const content = String(json?.choices?.[0]?.message?.content || "").trim();
    const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) as {
      intake?: IntakeData;
      replies?: string[];
      confirmed?: boolean;
    };

    return {
      intake: { ...intake, ...(parsed.intake || {}) },
      replies: Array.isArray(parsed.replies) ? parsed.replies.map(String) : [],
      confirmed: !!parsed.confirmed,
    };
  } catch (e) {
    console.warn("[geminiIntake] fallback to rules:", e);
    return nextRulesReply(intake, userText);
  }
}

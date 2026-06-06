import type { IntakeData } from "./rulesIntake.ts";
import { nextRulesReply } from "./rulesIntake.ts";

const INTAKE_SYSTEM = `You are the Future Link WhatsApp helpline intake assistant.
Collect in order: country of interest, study level (undergraduate/postgraduate/work visa/other), branch or city preference, full name.
When the client confirms with YES, set confirmed true.

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
}

Keep replies short (1-2 sentences). One question at a time.`;

async function callGeminiGateway(
  apiKey: string,
  intake: IntakeData,
  userText: string,
): Promise<Response> {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
}

async function callGeminiDirect(
  apiKey: string,
  intake: IntakeData,
  userText: string,
): Promise<Response> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${INTAKE_SYSTEM}\n\nCurrent intake JSON: ${JSON.stringify(intake)}\nClient message: ${userText}`,
        }],
      }],
      generationConfig: { temperature: 0.2 },
    }),
  });
}

function parseGeminiContent(raw: string): {
  intake?: IntakeData;
  replies?: string[];
  confirmed?: boolean;
} {
  const content = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(content);
}

export async function nextGeminiReply(
  intake: IntakeData,
  userText: string,
): Promise<{ intake: IntakeData; replies: string[]; confirmed: boolean }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!lovableKey && !geminiKey) {
    return nextRulesReply(intake, userText);
  }

  try {
    let content = "";
    if (geminiKey) {
      const res = await callGeminiDirect(geminiKey, intake, userText);
      if (!res.ok) {
        console.warn("[geminiIntake] direct API error:", res.status);
        if (lovableKey) {
          const fallback = await callGeminiGateway(lovableKey, intake, userText);
          if (!fallback.ok) return nextRulesReply(intake, userText);
          const json = await fallback.json();
          content = String(json?.choices?.[0]?.message?.content || "").trim();
        } else {
          return nextRulesReply(intake, userText);
        }
      } else {
        const json = await res.json();
        content = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      }
    } else {
      const res = await callGeminiGateway(lovableKey!, intake, userText);
      if (!res.ok) {
        console.warn("[geminiIntake] gateway error:", res.status);
        return nextRulesReply(intake, userText);
      }
      const json = await res.json();
      content = String(json?.choices?.[0]?.message?.content || "").trim();
    }

    const parsed = parseGeminiContent(content);
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

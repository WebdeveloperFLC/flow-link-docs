import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callGeminiJson } from "./geminiClient.ts";
import { clientRequestsCounselor } from "./counselingHandoff.ts";
import { fetchServiceLibraryContext } from "./serviceLibraryContext.ts";
import type { IntakeData } from "./rulesIntake.ts";

const COUNSELING_SYSTEM = `You are the Future Link Consultants WhatsApp study-abroad counselor AI.
Answer the client's questions using ONLY the knowledge base below. Be helpful, accurate, and concise.

Rules:
- WhatsApp-friendly: 2-4 short sentences per reply (max 2 messages in replies array).
- Cover documents, eligibility, fees, timelines, process steps, and next actions when relevant.
- If the knowledge base lacks detail, say a counselor will confirm specifics — do not invent visa rules or fees.
- Never promise visa approval. Encourage official sources for final rules.
- If the client wants a human counselor, set request_handoff true.
- Stay in counseling mode; do not re-collect intake fields unless they send RESTART.

Reply ONLY with valid JSON (no markdown):
{
  "replies": ["message to send on WhatsApp"],
  "request_handoff": false
}`;

function fallbackCounselingReply(intake: IntakeData, userText: string): string[] {
  const country = intake.country || "your destination";
  const level = intake.level || "your program";
  if (clientRequestsCounselor(userText)) {
    return ["Connecting you with a Future Link counselor now. Please wait a moment."];
  }
  return [
    `Thanks for your question about ${country} (${level}). `
    + "Typical next steps: confirm eligibility, shortlist institutions, prepare documents (passport, academics, funds proof), and apply for the visa/study permit. "
    + "Ask about documents, fees, or timelines — or reply *COUNSELOR* to speak with our team.",
  ];
}

export async function nextGeminiCounseling(
  admin: SupabaseClient,
  intake: IntakeData,
  userText: string,
  recentMessages?: { direction: string; body: string }[],
): Promise<{ replies: string[]; requestHandoff: boolean }> {
  if (clientRequestsCounselor(userText)) {
    return {
      replies: ["Sure — I'm connecting you with a Future Link counselor who will continue on this chat shortly."],
      requestHandoff: true,
    };
  }

  const context = await fetchServiceLibraryContext(admin, intake.country, intake.level).catch((e) => {
    console.warn("[geminiCounseling] service library:", e);
    return "Service library temporarily unavailable.";
  });
  const history = (recentMessages ?? [])
    .slice(-6)
    .map((m) => `${m.direction === "inbound" ? "Client" : "Assistant"}: ${m.body}`)
    .join("\n");

  const userContent = [
    `Client profile: ${JSON.stringify(intake)}`,
    `Knowledge base:\n${context}`,
    history ? `Recent chat:\n${history}` : "",
    `Client message: ${userText}`,
  ].filter(Boolean).join("\n\n");

  const parsed = await callGeminiJson<{ replies?: string[]; request_handoff?: boolean }>(
    COUNSELING_SYSTEM,
    userContent,
    0.35,
  );

  if (!parsed) {
    return { replies: fallbackCounselingReply(intake, userText), requestHandoff: false };
  }

  const replies = Array.isArray(parsed.replies)
    ? parsed.replies.map(String).filter(Boolean).slice(0, 2)
    : fallbackCounselingReply(intake, userText);

  return {
    replies: replies.length ? replies : fallbackCounselingReply(intake, userText),
    requestHandoff: !!parsed.request_handoff || clientRequestsCounselor(userText),
  };
}

export function counselingWelcomeMessage(intake: IntakeData): string {
  const name = intake.full_name?.split(/\s+/)[0] || "there";
  const country = intake.country || "your destination";
  const level = intake.level || "your study plans";
  return `Thank you, ${name}! Your details are saved. I can help with ${country} ${level} — documents, fees, timelines, and eligibility. What would you like to know? Reply *COUNSELOR* anytime to connect with our team.`;
}

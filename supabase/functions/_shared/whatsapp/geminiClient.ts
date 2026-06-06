/** Shared Gemini HTTP helpers for WhatsApp AI modules. */

export function geminiKeysAvailable(): boolean {
  return !!(Deno.env.get("GEMINI_API_KEY")?.trim() || Deno.env.get("LOVABLE_API_KEY")?.trim());
}

export function isGeminiAiMode(mode: string): boolean {
  return mode === "gemini" || mode === "gemini_dev" || mode === "production";
}

export async function callGeminiGateway(
  apiKey: string,
  system: string,
  userContent: string,
  temperature = 0.3,
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
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature,
    }),
  });
}

export async function callGeminiDirect(
  apiKey: string,
  system: string,
  userContent: string,
  temperature = 0.3,
): Promise<Response> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${system}\n\n${userContent}` }],
      }],
      generationConfig: { temperature },
    }),
  });
}

export async function callGeminiJson<T>(
  system: string,
  userContent: string,
  temperature = 0.3,
): Promise<T | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!lovableKey && !geminiKey) return null;

  let content = "";
  try {
    if (geminiKey) {
      const res = await callGeminiDirect(geminiKey, system, userContent, temperature);
      if (!res.ok) {
        console.warn("[geminiClient] direct API error:", res.status);
        if (lovableKey) {
          const fallback = await callGeminiGateway(lovableKey, system, userContent, temperature);
          if (!fallback.ok) return null;
          const json = await fallback.json();
          content = String(json?.choices?.[0]?.message?.content || "").trim();
        } else {
          return null;
        }
      } else {
        const json = await res.json();
        content = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      }
    } else {
      const res = await callGeminiGateway(lovableKey!, system, userContent, temperature);
      if (!res.ok) {
        console.warn("[geminiClient] gateway error:", res.status);
        return null;
      }
      const json = await res.json();
      content = String(json?.choices?.[0]?.message?.content || "").trim();
    }

    const cleaned = content.trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.warn("[geminiClient] parse error:", e);
    return null;
  }
}

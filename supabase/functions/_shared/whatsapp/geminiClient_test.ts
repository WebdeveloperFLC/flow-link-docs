import { assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isGeminiAiMode, geminiKeysAvailable } from "./geminiClient.ts";

Deno.test("isGeminiAiMode", () => {
  assert(isGeminiAiMode("gemini"));
  assert(isGeminiAiMode("gemini_dev"));
  assert(isGeminiAiMode("production"));
  assertFalse(isGeminiAiMode("rules"));
  assertFalse(isGeminiAiMode("off"));
  assertFalse(isGeminiAiMode(""));
});

Deno.test("geminiKeysAvailable reflects env", () => {
  const origLov = Deno.env.get("LOVABLE_API_KEY");
  const origGem = Deno.env.get("GEMINI_API_KEY");
  try {
    Deno.env.delete("LOVABLE_API_KEY");
    Deno.env.delete("GEMINI_API_KEY");
    assertFalse(geminiKeysAvailable());
    Deno.env.set("LOVABLE_API_KEY", "x");
    assert(geminiKeysAvailable());
    Deno.env.delete("LOVABLE_API_KEY");
    Deno.env.set("GEMINI_API_KEY", "y");
    assert(geminiKeysAvailable());
  } finally {
    if (origLov) Deno.env.set("LOVABLE_API_KEY", origLov); else Deno.env.delete("LOVABLE_API_KEY");
    if (origGem) Deno.env.set("GEMINI_API_KEY", origGem); else Deno.env.delete("GEMINI_API_KEY");
  }
});
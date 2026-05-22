import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_HINTS: Record<string, string> = {
  cinematic: "cinematic film look, shallow depth of field, golden hour lighting, gentle camera movement, 35mm film grain",
  documentary: "documentary handheld feel, natural lighting, candid expressions, realistic",
  festive: "warm festive lighting, cozy indoor Christmas atmosphere, soft bokeh, joyful mood",
  editorial: "editorial magazine cinematography, refined color grading, elegant composition",
};

type Provider = "google-veo-3-fast" | "google-veo-3-lite" | "replicate-minimax" | "pollinations";
type GenResult = { bytes: Uint8Array; provider: Provider } | null;

async function generateWithGoogle(model: string, provider: Provider, prompt: string, aspect: string, duration: number): Promise<GenResult> {
  const key = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!key) return null;
  try {
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { aspectRatio: aspect, personGeneration: "allow_all" },
        }),
      },
    );
    if (!startRes.ok) {
      const t = await startRes.text();
      console.warn(`Google ${model} start failed:`, startRes.status, t.slice(0, 300));
      return null;
    }
    let op = await startRes.json();
    const opName: string | undefined = op?.name;
    if (!opName) return null;

    const deadline = Date.now() + 110_000;
    while (!op?.done) {
      if (Date.now() > deadline) { console.warn("Google Veo timeout"); return null; }
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${key}`,
      );
      if (!pollRes.ok) { console.warn("Veo poll failed", pollRes.status); return null; }
      op = await pollRes.json();
    }

    if (op?.error) { console.warn("Veo op error:", JSON.stringify(op.error).slice(0, 300)); return null; }

    const resp = op?.response;
    const videos = resp?.generateVideoResponse?.generatedSamples
      ?? resp?.generatedSamples
      ?? resp?.generateVideoResponse?.generatedVideos
      ?? resp?.generatedVideos
      ?? [];
    const first = Array.isArray(videos) ? videos[0] : undefined;
    const fileUri: string | undefined = first?.video?.uri ?? first?.uri ?? first?.video?.fileUri;
    const inlineB64: string | undefined = first?.video?.bytesBase64Encoded ?? first?.bytesBase64Encoded;

    if (inlineB64) {
      const bin = atob(inlineB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { bytes, provider };
    }
    if (fileUri) {
      const sep = fileUri.includes("?") ? "&" : "?";
      const dl = await fetch(`${fileUri}${sep}key=${key}`);
      if (!dl.ok) { console.warn("Veo download failed", dl.status); return null; }
      return { bytes: new Uint8Array(await dl.arrayBuffer()), provider };
    }
    console.warn("Veo: no video in response", JSON.stringify(resp).slice(0, 300));
    return null;
  } catch (e) {
    console.warn("Google Veo exception:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function generateWithPollinations(prompt: string): Promise<GenResult> {
  try {
    // Pollinations text-to-video (free, no key). Endpoint returns mp4 directly.
    const url = `https://text.pollinations.ai/video/${encodeURIComponent(prompt)}?model=veo&nologo=true`;
    const res = await fetch(url, { headers: { Accept: "video/mp4" } });
    if (!res.ok) { console.warn("Pollinations failed", res.status); return null; }
    const ct = res.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!ct.startsWith("video/") || bytes.byteLength < 10_000) {
      console.warn("Pollinations returned non-video", ct, bytes.byteLength);
      return null;
    }
    return { bytes, provider: "pollinations" };
  } catch (e) {
    console.warn("Pollinations exception:", e instanceof Error ? e.message : e);
    return null;
  }
}

function outputUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.find((item): item is string => typeof item === "string");
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    return [obj.url, obj.uri, obj.file, obj.video].find((item): item is string => typeof item === "string");
  }
  return undefined;
}

async function generateWithReplicate(prompt: string): Promise<GenResult> {
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) return null;
  try {
    const startRes = await fetch("https://api.replicate.com/v1/models/minimax/video-01/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=5",
      },
      body: JSON.stringify({ input: { prompt, prompt_optimizer: true } }),
    });
    if (!startRes.ok) {
      const t = await startRes.text();
      console.warn("Replicate Minimax start failed:", startRes.status, t.slice(0, 300));
      return null;
    }

    let prediction = await startRes.json();
    const deadline = Date.now() + 130_000;
    while (!["succeeded", "failed", "canceled"].includes(prediction?.status)) {
      if (Date.now() > deadline) { console.warn("Replicate Minimax timeout"); return null; }
      await new Promise((r) => setTimeout(r, 4000));
      const pollUrl = prediction?.urls?.get;
      if (!pollUrl) return null;
      const pollRes = await fetch(pollUrl, { headers: { Authorization: `Token ${token}` } });
      if (!pollRes.ok) { console.warn("Replicate Minimax poll failed", pollRes.status); return null; }
      prediction = await pollRes.json();
    }

    if (prediction?.status !== "succeeded") {
      console.warn("Replicate Minimax prediction failed:", prediction?.error ?? prediction?.status);
      return null;
    }

    const url = outputUrl(prediction?.output);
    if (!url) { console.warn("Replicate Minimax: no output URL"); return null; }
    const videoRes = await fetch(url);
    if (!videoRes.ok) { console.warn("Replicate Minimax download failed", videoRes.status); return null; }
    return { bytes: new Uint8Array(await videoRes.arrayBuffer()), provider: "replicate-minimax" };
  } catch (e) {
    console.warn("Replicate Minimax exception:", e instanceof Error ? e.message : e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supaUser.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const concept = String(body?.concept ?? "").trim();
    const style = String(body?.style ?? "cinematic");
    const aspect = (["16:9", "9:16", "1:1"] as const).includes(body?.aspect) ? body.aspect : "16:9";
    const duration = body?.duration === 10 ? 10 : 5;

    if (!concept) {
      return new Response(JSON.stringify({ error: "Concept is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleHint = STYLE_HINTS[style] ?? STYLE_HINTS.cinematic;
    const prompt = `${concept}. ${styleHint}. Smooth natural motion, no on-screen text, no watermarks.`;

    // Try Google Veo 3 Fast → free Google lite fallback → Replicate backup → Pollinations last resort.
    let result = await generateWithGoogle("veo-3.0-fast-generate-001", "google-veo-3-fast", prompt, aspect, duration);
    if (!result) result = await generateWithGoogle("veo-3.1-lite-generate-preview", "google-veo-3-lite", prompt, aspect, duration);
    if (!result) result = await generateWithReplicate(prompt);
    if (!result) result = await generateWithPollinations(prompt);
    if (!result) {
      return new Response(JSON.stringify({
        error: "Video generation is temporarily unavailable. Google AI Studio quota is exhausted and backup providers did not return a video. Try again after the daily reset, update GOOGLE_AI_API_KEY with a key that has quota, or enable billing for higher limits.",
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const buf = result.bytes;
    const provider = result.provider;

    const path = `ai/video/${user.id}/${crypto.randomUUID()}.mp4`;
    const up = await supabase.storage.from("dsh-media").upload(path, buf, {
      contentType: "video/mp4", upsert: false,
    });
    if (up.error) {
      return new Response(JSON.stringify({ error: `Upload failed: ${up.error.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: gen } = await supabase.from("dsh_ai_generations").insert({
      user_id: user.id,
      kind: "video",
      brief: { concept, style, aspect, duration, provider },
      prompt,
      image_paths: [path],
      model: provider === "google-veo-3-fast"
        ? "google/veo-3.0-fast"
        : provider === "google-veo-3-lite" ? "google/veo-3.1-lite"
          : provider === "replicate-minimax" ? "replicate/minimax-video-01" : "pollinations/veo",
    }).select("id").single();

    return new Response(JSON.stringify({ ok: true, generation_id: gen?.id ?? null, path, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dsh-ai-generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN is not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const startingFrame: string | undefined = typeof body?.starting_frame_data_url === "string" && body.starting_frame_data_url.startsWith("data:")
      ? body.starting_frame_data_url : undefined;

    if (!concept) {
      return new Response(JSON.stringify({ error: "Concept is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleHint = STYLE_HINTS[style] ?? STYLE_HINTS.cinematic;
    const prompt = `${concept}. ${styleHint}. Smooth natural motion, no on-screen text, no watermarks.`;

    // Kling v1.6 standard text/image-to-video on Replicate
    const model = "kwaivgi/kling-v1.6-standard";
    const input: Record<string, unknown> = {
      prompt,
      duration,
      aspect_ratio: aspect,
      cfg_scale: 0.5,
      negative_prompt: "blurry, distorted faces, extra limbs, text, watermark, logo",
    };
    if (startingFrame) input.start_image = startingFrame;

    // Create prediction with wait preference (up to 60s of synchronous wait)
    const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
    });
    if (!createRes.ok) {
      const t = await createRes.text();
      if (createRes.status === 401) {
        return new Response(JSON.stringify({ error: "Replicate token invalid. Update REPLICATE_API_TOKEN." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (createRes.status === 402 || /insufficient|credit|billing/i.test(t)) {
        return new Response(JSON.stringify({ error: "Replicate credits exhausted. Add billing at replicate.com/account/billing." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Replicate error ${createRes.status}: ${t.slice(0, 300)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pred = await createRes.json();
    const getUrl: string = pred.urls?.get;

    // Poll until terminal state
    const deadline = Date.now() + 110_000;
    while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
      if (Date.now() > deadline) {
        return new Response(JSON.stringify({ error: "Video generation timed out. Try again." }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } });
      if (!pollRes.ok) break;
      pred = await pollRes.json();
    }

    if (pred.status !== "succeeded") {
      return new Response(JSON.stringify({ error: `Generation ${pred.status}: ${pred.error ?? "unknown error"}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const output = pred.output;
    const videoUrl: string | undefined = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : undefined);
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Replicate returned no video URL" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download mp4 and upload to storage
    const dl = await fetch(videoUrl);
    if (!dl.ok) {
      return new Response(JSON.stringify({ error: `Failed to download generated video (${dl.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = new Uint8Array(await dl.arrayBuffer());
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
      brief: { concept, style, aspect, duration, has_start_frame: !!startingFrame },
      prompt,
      image_paths: [path],
      model: `replicate/${model}`,
    }).select("id").single();

    return new Response(JSON.stringify({ ok: true, generation_id: gen?.id ?? null, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dsh-ai-generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
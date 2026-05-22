import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_DEFAULT_BASE = `Brand palette: navy #0F2A5F, accent yellow #FFC72C, accent red #E11D2A. Modern, clean, high-energy education marketing poster aesthetic similar to Indian study-abroad consultancies. Use a real young Indian student photo (smiling, holding books/backpack) with a recognizable landmark of the destination country behind. Bold display typography. Yellow brushstroke highlight bars under key phrases. Crisp icons for highlights.`;

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return { blob: new Blob([bin], { type: mime }), ext, mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supaUser.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const {
      institution_name, country, service, intake, highlights, tone = "energetic",
      language = "English", format = "portrait", variations = 1, custom_instructions = "",
      use_brand = true, quality = "premium",
      references = [],
    } = body ?? {};

    // gpt-image-1 supported sizes: 1024x1024, 1024x1536, 1536x1024
    const size = format === "square" ? "1024x1024"
               : format === "story" ? "1024x1536"
               : "1024x1536";
    const openaiQuality = quality === "premium" ? "high" : "medium";

    const refs: { data_url: string; role: string }[] = Array.isArray(references)
      ? references.filter((r: any) => r && typeof r.data_url === "string" && r.data_url.startsWith("data:image/"))
      : [];
    const hasBrandLogo = refs.some((r) => r.role === "logo");
    const hasInstitutionLogo = refs.some((r) => r.role === "institution_logo");
    const hasBlueprint = refs.some((r) => r.role === "blueprint");

    const logoRules: string[] = [];
    if (use_brand) {
      if (hasBrandLogo) {
        logoRules.push(`The Future Link Consultants logo is provided as a reference image and MUST be placed VERBATIM in the TOP-LEFT corner at ~18% of poster width. Do NOT redraw, recolor, re-letter or restyle it.`);
      } else {
        logoRules.push(`Do NOT draw, invent, redraw or imagine any Future Link Consultants logo, wordmark, badge or graduation-cap icon. Leave the top-left area clean.`);
      }
    }
    if (hasInstitutionLogo) {
      logoRules.push(`The institution logo is provided as a reference image and MUST be placed VERBATIM in the TOP-RIGHT corner at ~14% of poster width. Do NOT redraw, recolor, re-letter, add an "OFFICIAL LOGO" caption, or invent a crest/shield.`);
    } else if (hasBlueprint) {
      logoRules.push(`A BLUEPRINT reference is attached — preserve the institution wordmark, logo, crest, building and color scheme EXACTLY as shown in that reference. Do NOT invent a different logo, but DO faithfully reproduce the institution branding visible in the blueprint.`);
    } else {
      logoRules.push(`Do NOT draw, invent or imagine ANY university / institution / college logo, crest, shield, monogram, "OFFICIAL LOGO" badge, or wordmark — even if the institution name appears in the body text. Leave the top-right area clean.`);
    }

    const brandBlock = use_brand ? BRAND_DEFAULT_BASE : "";

    const cPhone = (body?.contact_phone || "").toString().trim();
    const cEmail = (body?.contact_email || "").toString().trim();
    const cSite  = (body?.contact_website || "").toString().trim();
    const cCta   = (body?.cta || "").toString().trim();
    const contactLines: string[] = [];
    if (cPhone) contactLines.push(`Phone: ${cPhone}`);
    if (cEmail) contactLines.push(`Email: ${cEmail}`);
    if (cSite)  contactLines.push(`Website: ${cSite}`);
    const contactBlock = (contactLines.length || cCta)
      ? `CONTACT FOOTER — render EXACTLY and ONLY these values, verbatim, in the bottom band:
${contactLines.map((l) => "  • " + l).join("\n")}${cCta ? `\n  • Call-to-action banner: "${cCta}"` : ""}
Do NOT invent, modify, mask, abbreviate or add any other phone numbers, emails, websites, social handles, or addresses. No placeholders like "XXXXXXXXXX", "info@example.com", "www.example.com" or lorem ipsum. If a line above is missing, OMIT it entirely.`
      : `CONTACT FOOTER — leave the bottom band clean. Do NOT invent any phone numbers, emails, websites, social handles or placeholders. You may include a generic line: "Contact your Future Link counsellor".`;

    const refHintLines: string[] = refs.map((r, i) => {
      const n = i + 1;
      switch (r.role) {
        case "logo":
          return `Reference image #${n}: FUTURE LINK LOGO — place VERBATIM in the TOP-LEFT corner at ~18% poster width. Preserve exact glyphs, colors and aspect ratio.`;
        case "institution_logo":
          return `Reference image #${n}: INSTITUTION LOGO — place VERBATIM in the TOP-RIGHT corner at ~14% poster width. Preserve exact glyphs, colors and aspect ratio. Do NOT add an "OFFICIAL LOGO" caption.`;
        case "layout":
          return `Reference image #${n}: LAYOUT — mirror its overall composition and grid; refresh copy per the Brief but KEEP any visible institution wordmark, logo and landmark photography from this reference.`;
        case "blueprint":
          return `Reference image #${n}: BLUEPRINT — use as the master template. Preserve VERBATIM the institution name, official wordmark/logo, building/landmark photography, color scheme, DLI/identifier lines, and section structure. Only refresh: intake date, highlights bullets, and the contact footer per the Brief above.`;
        case "subject":
          return `Reference image #${n}: SUBJECT — feature this person / landmark / building in the hero area.`;
        case "style":
        default:
          return `Reference image #${n}: STYLE — match its palette, typography vibe, and overall feel. Do NOT copy its text or exact composition.`;
      }
    });

    const prompt = `Design a ${size} promotional flyer for a study-abroad consultancy.
${brandBlock}
Institution: ${institution_name || "—"}
Country: ${country || "—"}
Service / category: ${service || "Study Abroad"}
Intake: ${intake || "—"}
Key highlights (must appear as bullet points with icons): ${highlights || "—"}
Tone: ${tone}. Language for all text on the poster: ${language}.
${custom_instructions ? `Extra instructions: ${custom_instructions}` : ""}

LOGO RULES (strict):
- ${logoRules.join("\n- ")}

${contactBlock}
${refHintLines.length ? "\nReferences attached:\n- " + refHintLines.join("\n- ") : ""}
Render at maximum detail. Sharp, kerning-perfect typography. Photoreal subject with realistic skin texture and natural lighting. No watermarks. No placeholder lorem ipsum. All text must be spelled correctly and legible.`;

    // Cap variations for cost/latency
    const n = Math.max(1, Math.min(2, Number(variations) || 1));
    const image_paths: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < n; i++) {
      let aiRes: Response;
      if (refs.length) {
        // Use images/edits endpoint (multipart) — accepts up to 16 reference images
        const form = new FormData();
        form.append("model", "gpt-image-1");
        form.append("prompt", prompt);
        form.append("size", size);
        form.append("quality", openaiQuality);
        form.append("n", "1");
        refs.slice(0, 16).forEach((r, idx) => {
          const parsed = dataUrlToBlob(r.data_url);
          if (parsed) form.append("image[]", parsed.blob, `ref-${idx}.${parsed.ext}`);
        });
        aiRes = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
      } else {
        aiRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt,
            size,
            quality: openaiQuality,
            n: 1,
          }),
        });
      }

      if (!aiRes.ok) {
        const t = await aiRes.text();
        if (aiRes.status === 429) {
          return new Response(JSON.stringify({ error: "OpenAI rate limit hit, try again shortly", details: t.slice(0, 400) }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiRes.status === 401) {
          return new Response(JSON.stringify({ error: "OpenAI rejected the API key (401). Check OPENAI_API_KEY." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (t.includes("insufficient_quota") || t.includes("billing") || t.includes("hard_limit") || t.includes("quota")) {
          return new Response(JSON.stringify({ error: "OpenAI account has no remaining credits. Falling back to Gemini Premium if available.", details: t.slice(0, 400) }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        errors.push(`variant ${i + 1}: ${aiRes.status} ${t.slice(0, 300)}`);
        continue;
      }

      const json = await aiRes.json();
      const b64: string | undefined = json?.data?.[0]?.b64_json;
      if (!b64) { errors.push(`variant ${i + 1}: no image returned`); continue; }
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `ai/${user.id}/${crypto.randomUUID()}.png`;
      const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, bin, { contentType: "image/png", upsert: false });
      if (upErr) { errors.push(`variant ${i + 1} upload: ${upErr.message}`); continue; }
      image_paths.push(path);
    }

    let generation_id: string | null = null;
    if (image_paths.length) {
      const { data: gen, error: genErr } = await supabase.from("dsh_ai_generations").insert({
        user_id: user.id, kind: "poster", brief: body, prompt, image_paths, model: "openai/gpt-image-1",
      }).select("id").single();
      if (genErr) console.error("save gen err", genErr);
      generation_id = gen?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: image_paths.length > 0, generation_id, image_paths, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: image_paths.length ? 200 : 500,
    });
  } catch (e) {
    console.error("dsh-ai-generate-poster-openai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import flcLogo from "@/assets/flc-logo.png";

export type RefRole = "style" | "layout" | "blueprint" | "subject" | "logo" | "institution_logo" | "edit_base";

export interface RefImage {
  data_url: string;
  role: RefRole;
  source: "upload" | "library";
  asset_id?: string;
  name?: string;
}

export interface BrandAsset {
  id: string;
  kind: "logo" | "reference";
  title: string;
  tags: string[];
  storage_path: string;
  institution_id: string | null;
  country: string | null;
  is_default_brand: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface PosterBrief {
  institution_name: string;
  country: string;
  service: string;
  intake: string;
  highlights: string;
  tone: string;
  language: string;
  format: "portrait" | "square" | "story";
  variations: number;
  custom_instructions: string;
  use_brand: boolean;
  model?: string;
  quality?: "standard" | "premium" | "premium_openai";
  references?: RefImage[];
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  cta?: string;
}

export interface RecentGeneration {
  id: string;
  kind: string;
  prompt: string | null;
  image_paths: string[];
  model: string | null;
  created_at: string;
  brief: any;
}

export interface CopyPack {
  instagram_caption?: string;
  whatsapp_broadcast?: string;
  facebook_post?: string;
  linkedin_post?: string;
  email_subject?: string;
  email_body?: string;
  sms?: string;
  reel_script?: string;
  counselor_talking_points?: string;
}

export function usePromoStudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readFunctionError(error: any, fallback: string) {
    const ctx = error?.context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json();
        return body?.error || body?.message || fallback;
      } catch {
        try { return await ctx.clone().text(); } catch { return fallback; }
      }
    }
    return ctx?.body?.error || ctx?.error || error?.message || fallback;
  }

  function isOpenAiBillingLimit(message: string) {
    return /billing|quota|credit|402|hard limit|insufficient/i.test(message);
  }

  async function generatePoster(brief: PosterBrief) {
    setLoading(true); setError(null);
    try {
      const refs = (brief.references || []).filter((r) => r.data_url);
      const editBase = refs.find((r) => r.role === "edit_base");
      // Route to edit-image when the user wants direct edits on a reference
      if (editBase) {
        const others = refs.filter((r) => r !== editBase);
        const instruction = buildEditInstruction(brief, others);
        const out = await editImageInternal(
          [editBase.data_url, ...others.map((r) => r.data_url)],
          instruction,
        );
        return { generation_id: out.generation_id, image_paths: [out.image_path], errors: [] };
      }
      const payload = {
        ...brief,
        references: refs.map(({ data_url, role }) => ({ data_url, role })),
      };
      const fnName = brief.quality === "premium_openai"
        ? "dsh-ai-generate-poster-openai"
        : "dsh-ai-generate-poster";
      const { data, error } = await supabase.functions.invoke(fnName, { body: payload });
      if (error) {
        const ctxMsg = await readFunctionError(error, "Generation failed");
        if (brief.quality === "premium_openai" && isOpenAiBillingLimit(ctxMsg)) {
          const fallbackPayload = { ...payload, quality: "premium" };
          const fallback = await supabase.functions.invoke("dsh-ai-generate-poster", { body: fallbackPayload });
          if (fallback.error) {
            throw new Error(await readFunctionError(fallback.error, ctxMsg));
          }
          if (!fallback.data?.ok) throw new Error(fallback.data?.error || fallback.data?.errors?.join("; ") || ctxMsg);
          return {
            ...(fallback.data as { generation_id: string; image_paths: string[]; errors: string[] }),
            errors: ["OpenAI credits are exhausted, so Gemini Premium was used instead.", ...((fallback.data as any)?.errors || [])],
          };
        }
        throw new Error(ctxMsg || "Generation failed");
      }
      if (!data?.ok) throw new Error(data?.error || data?.errors?.join("; ") || "Generation failed");
      return data as { generation_id: string; image_paths: string[]; errors: string[] };
    } catch (e: any) {
      setError(e?.message ?? "Failed"); throw e;
    } finally { setLoading(false); }
  }

  async function generateCopy(brief: Omit<PosterBrief, "format" | "variations" | "use_brand">) {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("dsh-ai-generate-copy", { body: brief });
      if (error) {
        const ctxMsg = (error as any)?.context?.body?.error || (error as any)?.context?.error;
        throw new Error(ctxMsg || error.message || "Copy generation failed");
      }
      return data as { generation_id: string; pack: CopyPack };
    } catch (e: any) {
      setError(e?.message ?? "Failed"); throw e;
    } finally { setLoading(false); }
  }

  async function generateStockImages(args: {
    concept: string;
    style?: "photoreal" | "cinematic" | "editorial" | "illustration";
    aspect?: "landscape" | "portrait" | "square" | "story";
    variations?: number;
    quality?: "fast" | "premium";
  }) {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("dsh-ai-generate-stock", { body: args });
      if (error) {
        const ctxMsg = await readFunctionError(error, "Stock generation failed");
        throw new Error(ctxMsg);
      }
      if (!data?.ok) throw new Error(data?.error || "Stock generation failed");
      return data as { generation_id: string; image_paths: string[]; errors: string[] };
    } catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
  }

  /** Upload a client-recorded video clip to storage and log a generation row. */
  async function uploadVideoClip(args: { blob: Blob; brief: any; source_path?: string | null }) {
    setLoading(true); setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("Not signed in");
      const ext = args.blob.type.includes("mp4") ? "mp4" : "webm";
      const path = `ai/video/${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("dsh-media").upload(path, args.blob, {
        contentType: args.blob.type || "video/webm",
        upsert: false,
      });
      if (up.error) throw up.error;
      const { data: gen } = await supabase.from("dsh_ai_generations").insert({
        user_id: user.id,
        kind: "video",
        brief: args.brief,
        prompt: args.brief?.concept ?? null,
        image_paths: [path],
        model: "client/ken-burns-canvas",
      }).select("id").single();
      return { generation_id: gen?.id ?? null, path };
    } catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
  }

  /** Generate a real text-to-video clip via Replicate (server-side). */
  async function generateVideoFromConcept(args: {
    concept: string;
    style?: "cinematic" | "documentary" | "festive" | "editorial";
    aspect?: "16:9" | "9:16" | "1:1";
    duration?: 5 | 10;
    starting_frame_data_url?: string;
  }) {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("dsh-ai-generate-video", { body: args });
      if (error) {
        const msg = await readFunctionError(error, "Video generation failed");
        throw new Error(msg);
      }
      if (!data?.ok) throw new Error(data?.error || "Video generation failed");
      return data as { generation_id: string | null; path: string; provider?: "google-veo-3-fast" | "google-veo-2" | "pollinations" };
    } catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
  }

  async function editImageInternal(image_data_urls: string | string[], instruction: string) {
    const arr = Array.isArray(image_data_urls) ? image_data_urls : [image_data_urls];
    const { data, error } = await supabase.functions.invoke("dsh-ai-edit-image", {
      body: { image_data_urls: arr, image_data_url: arr[0], instruction },
    });
    if (error) {
      const ctxMsg = (error as any)?.context?.body?.error || (error as any)?.context?.error;
      throw new Error(ctxMsg || error.message || "Edit failed");
    }
    if (!data?.ok) throw new Error(data?.error || "Edit failed");
    return data as { generation_id: string; image_path: string };
  }
  async function editImage(image_data_url: string, instruction: string, model?: string) {
    setLoading(true); setError(null);
    try { return await editImageInternalWithModel(image_data_url, instruction, model); }
    catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
  }

  async function editImageInternalWithModel(image_data_urls: string | string[], instruction: string, model?: string) {
    const arr = Array.isArray(image_data_urls) ? image_data_urls : [image_data_urls];
    const { data, error } = await supabase.functions.invoke("dsh-ai-edit-image", {
      body: { image_data_urls: arr, image_data_url: arr[0], instruction, model },
    });
    if (error) {
      const ctxMsg = (error as any)?.context?.body?.error || (error as any)?.context?.error;
      throw new Error(ctxMsg || error.message || "Edit failed");
    }
    if (!data?.ok) throw new Error(data?.error || "Edit failed");
    return data as { generation_id: string; image_path: string };
  }

  /** Re-edit a stored image by storage path (downloads, re-encodes, calls edit). */
  async function enhanceStored(storage_path: string, instruction?: string) {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.storage.from("dsh-media").download(storage_path);
      if (error) throw error;
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(r.error);
        r.readAsDataURL(data);
      });
      const inst = instruction || "Upscale and sharpen this poster. Preserve every text glyph, logo, layout, colors and composition EXACTLY. Improve photo realism of subjects, refine typography edges, remove compression artifacts. Do not add or remove any element.";
      return await editImageInternalWithModel(dataUrl, inst, "google/gemini-3-pro-image-preview");
    } catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
  }

  /** Programmatic download — fetches blob and triggers save dialog without navigating away. */
  async function downloadAsset(url: string, filename: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 1500);
    } catch (e: any) {
      throw new Error(e?.message ?? "Download failed");
    }
  }

  async function listRecentGenerations(limit = 20): Promise<RecentGeneration[]> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return [];
    const { data, error } = await supabase
      .from("dsh_ai_generations")
      .select("id,kind,prompt,image_paths,model,created_at,brief")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as any[]) as RecentGeneration[];
  }


  // Read an image File into a (resized) clean data URL.
  async function fileToDataUrl(file: File, maxEdge = 1536): Promise<string> {
    const raw: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    // Resize via canvas to keep payload small
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(raw);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    });
  }

  async function getSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from("dsh-media").createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }

  async function saveToHub(args: {
    storage_path: string;
    title: string;
    content_type: string; // poster, reel, social, document
    content_scope: "common" | "country" | "institution" | "service_category";
    country?: string;
    institution_id?: string;
    service_master_key?: string;
    branch_id?: string;
    campaign?: string;
    description?: string;
  }) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("dsh_media" as any).insert({
      title: args.title,
      description: args.description ?? "AI-generated promotional material.",
      campaign_name: args.campaign ?? null,
      content_type: args.content_type,
      content_scope: args.content_scope,
      content_owner_department: "marketing",
      source_type: "upload",
      upload_source: "upload",
      storage_path: args.storage_path,
      file_name: args.storage_path.split("/").pop(),
      mime_type: "image/png",
      country_name: args.country || null,
      institution_id: args.institution_id || null,
      service_master_key: args.service_master_key || null,
      branch_id: args.branch_id || null,
      visible_to_all_branches: true,
      uploaded_by: auth?.user?.id ?? null,
    });
    if (error) throw error;
  }

  // ---------- Brand Library ----------

  async function listBrandAssets(kind?: "logo" | "reference"): Promise<BrandAsset[]> {
    let q = supabase.from("dsh_brand_assets" as any).select("*").order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    return (data as any[]) as BrandAsset[];
  }

  async function uploadBrandAsset(args: {
    file: File;
    kind: "logo" | "reference";
    title: string;
    tags?: string[];
    is_default_brand?: boolean;
  }): Promise<BrandAsset> {
    const { data: auth } = await supabase.auth.getUser();
    const ext = (args.file.name.split(".").pop() || "png").toLowerCase();
    const folder = args.kind === "logo" ? "brand/logos" : "brand/refs";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("dsh-media").upload(path, args.file, {
      contentType: args.file.type || "image/png",
      upsert: false,
    });
    if (up.error) throw up.error;
    if (args.is_default_brand && args.kind === "logo") {
      await supabase.from("dsh_brand_assets" as any)
        .update({ is_default_brand: false })
        .eq("kind", "logo").eq("is_default_brand", true);
    }
    const { data, error } = await supabase.from("dsh_brand_assets" as any).insert({
      kind: args.kind,
      title: args.title,
      tags: args.tags || [],
      storage_path: path,
      is_default_brand: !!args.is_default_brand,
      uploaded_by: auth?.user?.id ?? null,
    }).select("*").single();
    if (error) throw error;
    return data as any as BrandAsset;
  }

  async function deleteBrandAsset(asset: BrandAsset) {
    await supabase.storage.from("dsh-media").remove([asset.storage_path]).catch(() => {});
    const { error } = await supabase.from("dsh_brand_assets" as any).delete().eq("id", asset.id);
    if (error) throw error;
  }

  /** Delete an entire generation row and all its storage files. */
  async function deleteGeneration(id: string, paths: string[]) {
    if (paths?.length) {
      await supabase.storage.from("dsh-media").remove(paths).catch(() => {});
    }
    const { error } = await supabase.from("dsh_ai_generations").delete().eq("id", id);
    if (error) throw error;
  }

  /** Delete a single generated image; prunes/strips matching dsh_ai_generations rows. */
  async function deleteGeneratedImage(path: string) {
    await supabase.storage.from("dsh-media").remove([path]).catch(() => {});
    const { data } = await supabase
      .from("dsh_ai_generations")
      .select("id,image_paths")
      .contains("image_paths", [path] as any);
    for (const row of (data as any[]) ?? []) {
      const next = (row.image_paths as string[]).filter((p) => p !== path);
      if (next.length === 0) {
        await supabase.from("dsh_ai_generations").delete().eq("id", row.id);
      } else {
        await supabase.from("dsh_ai_generations").update({ image_paths: next }).eq("id", row.id);
      }
    }
  }

  async function setDefaultLogo(assetId: string) {
    await supabase.from("dsh_brand_assets" as any)
      .update({ is_default_brand: false })
      .eq("kind", "logo").eq("is_default_brand", true);
    const { error } = await supabase.from("dsh_brand_assets" as any)
      .update({ is_default_brand: true })
      .eq("id", assetId);
    if (error) throw error;
  }

  /** Idempotently seed the bundled Future Link logo if no default logo exists yet. */
  async function ensureDefaultLogo(): Promise<BrandAsset | null> {
    const existing = await listBrandAssets("logo");
    const def = existing.find((a) => a.is_default_brand);
    if (def) return def;
    try {
      const res = await fetch(flcLogo);
      const blob = await res.blob();
      const file = new File([blob], "flc-logo.png", { type: blob.type || "image/png" });
      return await uploadBrandAsset({
        file,
        kind: "logo",
        title: "Future Link Consultants",
        tags: ["default", "future-link"],
        is_default_brand: true,
      });
    } catch (e) {
      console.warn("ensureDefaultLogo failed", e);
      return null;
    }
  }

  async function brandAssetToDataUrl(asset: BrandAsset): Promise<string> {
    const { data, error } = await supabase.storage.from("dsh-media").download(asset.storage_path);
    if (error) throw error;
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(data);
    });
  }

  return {
    loading, error,
    generatePoster, generateCopy, editImage, enhanceStored, downloadAsset, listRecentGenerations,
    getSignedUrl, saveToHub, fileToDataUrl,
    listBrandAssets, uploadBrandAsset, deleteBrandAsset, setDefaultLogo, ensureDefaultLogo, brandAssetToDataUrl,
    deleteGeneration, deleteGeneratedImage,
    generateStockImages, uploadVideoClip,
    generateVideoFromConcept,
  };
}

function buildEditInstruction(brief: PosterBrief, refs: RefImage[]): string {
  const base = brief.custom_instructions?.trim()
    || `Update the attached flyer. Institution: ${brief.institution_name}. Country: ${brief.country}. Intake: ${brief.intake}. Highlights: ${brief.highlights}. Keep the existing layout and theme.`;
  if (!refs.length) return base;
  const notes = refs.map((r, i) => {
    const n = i + 2; // first image is the edit base
    if (r.role === "logo") return `Image #${n} is the FUTURE LINK LOGO — place it VERBATIM (do not redraw, recolor, re-letter) in the TOP-LEFT corner at about 18% of poster width.`;
    if (r.role === "institution_logo") return `Image #${n} is the INSTITUTION LOGO — place it VERBATIM (do not redraw, recolor, re-letter, add an "OFFICIAL LOGO" badge, or invent a crest) in the TOP-RIGHT corner at about 14% of poster width.`;
    if (r.role === "style") return `Image #${n} is a STYLE reference — match its palette/typography vibe.`;
    if (r.role === "layout") return `Image #${n} is a LAYOUT reference — mirror its composition; refresh copy per the brief but KEEP any visible institution wordmark, logo or landmark photo.`;
    if (r.role === "blueprint") return `Image #${n} is a BLUEPRINT — use as master template. Preserve VERBATIM the institution name, official wordmark/logo, building/landmark photography, color scheme, DLI/identifier lines, and section structure. Only refresh intake date, highlights, and the contact footer.`;
    if (r.role === "subject") return `Image #${n} is a SUBJECT reference — feature this person/landmark.`;
    return `Image #${n} is a reference.`;
  }).join(" ");
  return `${base}\n\n${notes}`;
}
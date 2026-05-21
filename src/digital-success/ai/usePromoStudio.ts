import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  reference_image_data_url?: string;
  reference_mode?: "match" | "inspire" | "edit";
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

  async function generatePoster(brief: PosterBrief) {
    setLoading(true); setError(null);
    try {
      // Route to edit-image when the user wants direct edits on the reference
      if (brief.reference_mode === "edit" && brief.reference_image_data_url) {
        const instruction = brief.custom_instructions?.trim()
          || `Update the attached flyer. Institution: ${brief.institution_name}. Country: ${brief.country}. Intake: ${brief.intake}. Highlights: ${brief.highlights}. Keep the existing layout and theme.`;
        const out = await editImageInternal(brief.reference_image_data_url, instruction);
        return { generation_id: out.generation_id, image_paths: [out.image_path], errors: [] };
      }
      const { data, error } = await supabase.functions.invoke("dsh-ai-generate-poster", { body: brief });
      if (error) {
        const ctxMsg = (error as any)?.context?.body?.error || (error as any)?.context?.error;
        throw new Error(ctxMsg || error.message || "Generation failed");
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

  async function editImageInternal(image_data_url: string, instruction: string) {
    const { data, error } = await supabase.functions.invoke("dsh-ai-edit-image", { body: { image_data_url, instruction } });
    if (error) {
      const ctxMsg = (error as any)?.context?.body?.error || (error as any)?.context?.error;
      throw new Error(ctxMsg || error.message || "Edit failed");
    }
    if (!data?.ok) throw new Error(data?.error || "Edit failed");
    return data as { generation_id: string; image_path: string };
  }
  async function editImage(image_data_url: string, instruction: string) {
    setLoading(true); setError(null);
    try { return await editImageInternal(image_data_url, instruction); }
    catch (e: any) { setError(e?.message ?? "Failed"); throw e; }
    finally { setLoading(false); }
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

  return { loading, error, generatePoster, generateCopy, editImage, getSignedUrl, saveToHub, fileToDataUrl };
}
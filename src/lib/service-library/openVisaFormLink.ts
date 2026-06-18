import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VisaFormLinkInput = {
  filePath: string;
  title?: string;
  mimeType?: string | null;
  storageBucket?: "service-library-files" | "visa-forms";
};

export function isExternalVisaFormUrl(path: string): boolean {
  return /^https?:\/\//i.test(path.trim());
}

export function isSpecimenVisaFormPath(path: string): boolean {
  return path.trim().startsWith("/specimens/");
}

export function isVisaFormPlaceholderPath(path: string): boolean {
  return /_placeholder\.pdf$/i.test(path.trim());
}

/** Open an official visa form URL, specimen path, or signed storage object. */
export async function openVisaFormLink(input: VisaFormLinkInput): Promise<boolean> {
  const path = input.filePath?.trim();
  if (!path) {
    toast.error("Form link is missing");
    return false;
  }

  if (isExternalVisaFormUrl(path)) {
    window.open(path, "_blank", "noopener,noreferrer");
    return true;
  }

  if (isSpecimenVisaFormPath(path)) {
    window.open(`${window.location.origin}${path}`, "_blank", "noopener,noreferrer");
    return true;
  }

  const bucket = input.storageBucket ?? "service-library-files";
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    toast.error(`Could not open ${input.title ?? "form"}`);
    return false;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  return true;
}

export function normalizeVisaFormCode(code: string | null | undefined): string {
  return (code ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Match a Forms Library row to an official Service Library link by form code. */
export function matchOfficialVisaFormPath(
  formCode: string | null | undefined,
  officialRows: Array<{ form_code: string | null; file_path: string }>,
): string | null {
  const want = normalizeVisaFormCode(formCode);
  if (!want) return null;
  const exact = officialRows.find((r) => normalizeVisaFormCode(r.form_code) === want);
  if (exact?.file_path) return exact.file_path;
  const fuzzy = officialRows.find((r) => {
    const code = normalizeVisaFormCode(r.form_code);
    return code && (want.includes(code) || code.includes(want));
  });
  return fuzzy?.file_path ?? null;
}

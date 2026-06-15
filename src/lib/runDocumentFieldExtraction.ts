import { supabase } from "@/integrations/supabase/client";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { enqueueExtraction } from "@/lib/extractionQueue";
import { filterExtractedForSection } from "@/lib/sections";
import { AUTO_EXTRACT_MAX_PAGES, autoExtractSkipReason, shouldAutoExtractProfileFields } from "@/lib/extractionConfig";
import { getPdfPageCount, isPdfFile } from "@/lib/binderSplit";

async function resolvePageCount(file: File): Promise<number> {
  if (file.type.startsWith("image/")) return 1;
  if (isPdfFile(file)) {
    try {
      return await getPdfPageCount(file);
    } catch {
      return AUTO_EXTRACT_MAX_PAGES + 1;
    }
  }
  return 1;
}

/** OCR + AI field extraction after upload. Best-effort — never throws. Skips multi-page and non-whitelist types. */
export async function runDocumentFieldExtraction(opts: {
  clientId: string;
  documentId: string;
  file: File;
  documentType: string;
  customType?: string | null;
  fileName: string;
  personId?: string | null;
  classifyConfidence?: number;
  classifySource?: string | null;
  sectionKey?: string | null;
  onFieldsWritten?: () => void;
}): Promise<{ written: number; skipped?: boolean; skipReason?: string }> {
  const {
    clientId,
    documentId,
    file,
    documentType,
    customType = null,
    fileName,
    personId = null,
    classifyConfidence = 0,
    classifySource = null,
    sectionKey = null,
    onFieldsWritten,
  } = opts;

  const pageCount = await resolvePageCount(file);
  if (!shouldAutoExtractProfileFields(documentType, customType, pageCount)) {
    const skipReason = autoExtractSkipReason(documentType, customType, pageCount) ?? "not eligible";
    console.debug("[extraction] skipped", { fileName, documentType, pageCount, skipReason });
    return { written: 0, skipped: true, skipReason };
  }

  void enqueueExtraction({
    documentId,
    clientId,
    personId,
    docTypeDetected: documentType,
    classifyConfidence,
    source: classifySource,
  });

  const isPdf = isPdfFile(file);
  const isImage = file.type.startsWith("image/");

  try {
    const snippet = isPdf ? await extractFirstPageText(file, 12000, AUTO_EXTRACT_MAX_PAGES) : "";
    const imageDataUrls: string[] = isPdf
      ? await renderPdfPagesToJpegDataUrls(file, AUTO_EXTRACT_MAX_PAGES)
      : isImage
        ? [await imageFileToJpegDataUrl(file)].filter(Boolean)
        : [];

    const { data } = await supabase.functions.invoke("extract-document-data", {
      body: {
        document_id: documentId,
        document_type: documentType,
        custom_type: customType,
        file_name: fileName,
        snippet,
        image_data_urls: imageDataUrls,
      },
    });

    const rawFields = (data?.fields ?? {}) as Record<string, string | number | null>;
    const fields = sectionKey ? filterExtractedForSection(sectionKey, rawFields) : rawFields;

    if (Object.keys(fields).length > 0) {
      const { written } = await mergeExtractedFields(clientId, documentId, fileName, fields, documentType, customType);
      if (written.length > 0) {
        onFieldsWritten?.();
      }
      return { written: written.length };
    }
  } catch (e) {
    console.warn("runDocumentFieldExtraction failed:", e);
  }

  try {
    const pageImages: string[] = isPdf
      ? await renderPdfPagesToJpegDataUrls(file, AUTO_EXTRACT_MAX_PAGES)
      : isImage
        ? [await imageFileToJpegDataUrl(file)].filter(Boolean)
        : [];
    const embeddedText = isPdf ? await extractFirstPageText(file, 8000, AUTO_EXTRACT_MAX_PAGES) : "";
    if (pageImages.length > 0 || embeddedText) {
      await supabase.functions.invoke("verify-document", {
        body: {
          document_id: documentId,
          doc_type: documentType,
          page_image_data_urls: pageImages,
          embedded_text: embeddedText,
          ocr_text: "",
        },
      });
    }
  } catch (e) {
    console.warn("verify-document failed:", e);
  }

  return { written: 0 };
}

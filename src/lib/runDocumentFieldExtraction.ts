import { supabase } from "@/integrations/supabase/client";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { enqueueExtraction } from "@/lib/extractionQueue";
import { filterExtractedForSection } from "@/lib/sections";

/** OCR + AI field extraction after upload. Best-effort — never throws. */
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
}): Promise<{ written: number }> {
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

  void enqueueExtraction({
    documentId,
    clientId,
    personId,
    docTypeDetected: documentType,
    classifyConfidence,
    source: classifySource,
  });

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  try {
    const snippet = isPdf ? await extractFirstPageText(file, 28000, 8) : "";
    const imageDataUrls: string[] = isPdf
      ? await renderPdfPagesToJpegDataUrls(file, 6)
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
    const fields = sectionKey
      ? filterExtractedForSection(sectionKey, rawFields)
      : rawFields;

    if (Object.keys(fields).length > 0) {
      const { written } = await mergeExtractedFields(
        clientId,
        documentId,
        fileName,
        fields,
        documentType,
        customType,
      );
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
      ? await renderPdfPagesToJpegDataUrls(file, 4)
      : isImage
        ? [await imageFileToJpegDataUrl(file)].filter(Boolean)
        : [];
    const embeddedText = isPdf ? await extractFirstPageText(file, 12000, 4) : "";
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

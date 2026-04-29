import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { extractFirstPageText } from "@/lib/extractFirstPageText";

export interface Classification {
  type: string;       // one of DOCUMENT_TYPES, or "Other"
  customType?: string; // when type === "Other"
  confidence: number; // 0..1
  source: "filename" | "ai" | "fallback";
}

const HEURISTICS: { type: string; rx: RegExp; conf: number }[] = [
  { type: "Passport", rx: /passport|^pp[_\s-]?\d|_pp_/i, conf: 0.95 },
  { type: "Birth Certificate", rx: /birth[_\s-]?cert|\bbc\b|nativity/i, conf: 0.92 },
  { type: "IELTS / Language Test", rx: /ielts|toefl|pte|duolingo|trf|language[_\s-]?test/i, conf: 0.95 },
  { type: "Academic Transcripts", rx: /transcript|marksheet|mark[_\s-]?sheet|gradesheet|degree|diploma|consolidated/i, conf: 0.9 },
  { type: "Offer Letter", rx: /offer|loa|letter[_\s-]?of[_\s-]?accept|admission/i, conf: 0.92 },
  { type: "GIC Certificate", rx: /\bgic\b|guaranteed[_\s-]?investment/i, conf: 0.95 },
  { type: "Tuition Fee Receipt", rx: /tuition|fee[_\s-]?receipt|fees[_\s-]?paid/i, conf: 0.92 },
  { type: "Financial Documents", rx: /bank[_\s-]?statement|statement[_\s-]?of[_\s-]?account|salary|payslip|itr|income[_\s-]?tax|fixed[_\s-]?deposit|\bfd\b/i, conf: 0.88 },
  { type: "Medical Report", rx: /medical|imm1017|emed|panel[_\s-]?phys/i, conf: 0.92 },
  { type: "SOP", rx: /\bsop\b|statement[_\s-]?of[_\s-]?purpose|personal[_\s-]?statement/i, conf: 0.95 },
  { type: "Resume", rx: /resume|\bcv\b|curriculum/i, conf: 0.9 },
  { type: "Visa Forms", rx: /imm\d{4}|visa[_\s-]?form|application[_\s-]?form/i, conf: 0.88 },
  { type: "Photograph", rx: /^photo|passport[_\s-]?photo|headshot|\.jpe?g$/i, conf: 0.6 },
];

export function classifyByFilename(name: string): Classification | null {
  for (const h of HEURISTICS) {
    if (h.rx.test(name)) return { type: h.type, confidence: h.conf, source: "filename" };
  }
  return null;
}

export async function classifyDocument(file: File, candidateTypes?: string[]): Promise<Classification> {
  // 1) filename heuristic
  const fn = classifyByFilename(file.name);
  if (fn && fn.confidence >= 0.85) return fn;

  // 2) AI classify (use first-page text for PDFs)
  try {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    let snippet = "";
    if (isPdf) snippet = await extractFirstPageText(file, 1500);

    const allowed = Array.from(new Set([...DOCUMENT_TYPES, ...(candidateTypes ?? [])]));
    const { data, error } = await supabase.functions.invoke("classify-document", {
      body: {
        filename: file.name,
        snippet,
        is_image: file.type.startsWith("image/"),
        size_bytes: file.size,
        allowed_types: allowed,
      },
    });
    if (error) throw error;
    const type = typeof data?.type === "string" && allowed.includes(data.type) ? data.type : "Other";
    const confidence = typeof data?.confidence === "number" ? Math.min(1, Math.max(0, data.confidence)) : 0.4;
    return {
      type,
      customType: type === "Other" ? (data?.suggested_label as string | undefined) : undefined,
      confidence,
      source: "ai",
    };
  } catch {
    return fn ?? { type: "Other", confidence: 0.1, source: "fallback" };
  }
}
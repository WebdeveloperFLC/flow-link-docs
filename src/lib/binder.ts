import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

interface DocItem {
  name: string;
  mandatory: boolean;
  notes?: string;
}

interface DocRow {
  id: string;
  document_type: string;
  custom_type: string | null;
  file_name: string;
  storage_path: string;
  version: number;
}

interface BinderInput {
  clientName: string;
  applicationId: string;
  country: string;
  applicationType: string;
  templateName: string;
  items: DocItem[];
  documents: DocRow[];
  groupLabel?: string;
}

export async function generateBinder(input: BinderInput): Promise<Uint8Array> {
  const { clientName, applicationId, country, applicationType, templateName, items, documents, groupLabel } = input;

  const finalPdf = await PDFDocument.create();
  const helv = await finalPdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);

  // ---- Cover page ----
  const cover = finalPdf.addPage([595, 842]);
  cover.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: rgb(0.06, 0.20, 0.55) });
  cover.drawText("FUTURE LINK", { x: 50, y: 800, size: 22, font: helvBold, color: rgb(1,1,1) });
  cover.drawText("Document Management System", { x: 50, y: 775, size: 11, font: helv, color: rgb(0.85,0.90,1) });

  cover.drawText(groupLabel ? `${groupLabel.toUpperCase()} BINDER` : "FINAL DOCUMENT BINDER", {
    x: 50, y: 680, size: 18, font: helvBold, color: rgb(0.06,0.20,0.55),
  });
  cover.drawLine({ start: {x:50,y:670}, end:{x:545,y:670}, thickness: 2, color: rgb(0.83,0.13,0.18) });

  const meta: [string, string][] = [
    ["Client Name", clientName],
    ["Application ID", applicationId],
    ["Country", country],
    ["Application Type", applicationType],
    ["Workflow Template", templateName],
    ["Generated On", new Date().toLocaleString()],
  ];
  let y = 620;
  for (const [k, v] of meta) {
    cover.drawText(k.toUpperCase(), { x: 50, y, size: 9, font: helvBold, color: rgb(0.45,0.45,0.45) });
    cover.drawText(v, { x: 50, y: y - 14, size: 13, font: helv, color: rgb(0.05,0.05,0.05) });
    y -= 42;
  }

  cover.drawText("CONFIDENTIAL — For submission purposes only", {
    x: 50, y: 60, size: 9, font: helv, color: rgb(0.5,0.5,0.5),
  });

  // ---- Resolve docs in template order ----
  const byType = new Map<string, DocRow>();
  for (const d of documents) {
    const key = (d.document_type === "Other" ? d.custom_type : d.document_type) || d.document_type;
    // keep highest version
    const ex = byType.get(key);
    if (!ex || d.version > ex.version) byType.set(key, d);
  }

  const ordered: { item: DocItem; doc: DocRow | undefined; index: number }[] = items.map((item, i) => ({
    item, doc: byType.get(item.name), index: i + 1,
  }));

  // ---- Table of contents ----
  const toc = finalPdf.addPage([595, 842]);
  toc.drawText("TABLE OF CONTENTS", { x: 50, y: 790, size: 16, font: helvBold, color: rgb(0.06,0.20,0.55) });
  toc.drawLine({ start:{x:50,y:780}, end:{x:545,y:780}, thickness: 1, color: rgb(0.83,0.13,0.18) });
  let ty = 750;
  ordered.forEach(({ item, doc }, i) => {
    if (ty < 60) return;
    const status = doc ? "✓ Included" : (item.mandatory ? "✗ MISSING" : "— Optional");
    const color = doc ? rgb(0.1,0.5,0.2) : (item.mandatory ? rgb(0.83,0.13,0.18) : rgb(0.5,0.5,0.5));
    toc.drawText(`${String(i+1).padStart(2,"0")}.  ${item.name}${item.mandatory ? "  *" : ""}`, {
      x: 50, y: ty, size: 11, font: helv, color: rgb(0.05,0.05,0.05),
    });
    toc.drawText(status, { x: 440, y: ty, size: 10, font: helvBold, color });
    ty -= 22;
  });
  toc.drawText("* = Mandatory document", { x: 50, y: 40, size: 9, font: helv, color: rgb(0.5,0.5,0.5) });

  // ---- Append each document ----
  for (const { item, doc, index } of ordered) {
    // Section divider
    const sep = finalPdf.addPage([595, 842]);
    sep.drawRectangle({ x: 0, y: 380, width: 595, height: 80, color: rgb(0.96,0.97,1) });
    sep.drawText(`SECTION ${index}`, { x: 50, y: 430, size: 10, font: helvBold, color: rgb(0.83,0.13,0.18) });
    sep.drawText(item.name, { x: 50, y: 405, size: 22, font: helvBold, color: rgb(0.06,0.20,0.55) });
    if (item.notes) {
      sep.drawText(`Note: ${item.notes}`, { x: 50, y: 360, size: 10, font: helv, color: rgb(0.4,0.4,0.4) });
    }

    if (!doc) {
      sep.drawText(item.mandatory ? "⚠ MANDATORY DOCUMENT NOT YET UPLOADED" : "Optional document — not provided", {
        x: 50, y: 320, size: 12, font: helvBold,
        color: item.mandatory ? rgb(0.83,0.13,0.18) : rgb(0.5,0.5,0.5),
      });
      continue;
    }

    try {
      const { data, error } = await supabase.storage.from("client-documents").download(doc.storage_path);
      if (error || !data) throw error;
      const bytes = new Uint8Array(await data.arrayBuffer());
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await finalPdf.copyPages(src, src.getPageIndices());
      pages.forEach((p) => finalPdf.addPage(p));
    } catch (e) {
      const err = finalPdf.addPage([595, 842]);
      err.drawText(`Failed to embed: ${doc.file_name}`, { x: 50, y: 780, size: 12, font: helvBold, color: rgb(0.83,0.13,0.18) });
    }
  }

  return await finalPdf.save();
}
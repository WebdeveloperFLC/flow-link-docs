import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

const SAMPLE = "first_name,last_name,email,phone,notes\nJane,Doe,jane@example.com,+1 555 0100,Sample row\nJohn,Smith,,+91 9876543210,Another sample\n";

const HEADER_MAP: Record<string, string> = {
  first_name: "first_name", firstname: "first_name", "first name": "first_name", fname: "first_name",
  last_name: "last_name", lastname: "last_name", "last name": "last_name", surname: "last_name", lname: "last_name",
  email: "email", "email address": "email", "e-mail": "email",
  phone: "phone", mobile: "phone", contact: "phone", "phone number": "phone", "mobile number": "phone",
  notes: "notes", note: "notes", remarks: "notes", remark: "notes", comments: "notes",
};

type Raw = Record<string, unknown>;

function normalizeRow(row: Raw): { first_name: string; last_name: string; email: string; phone: string; notes: string } {
  const out: Record<string, string> = { first_name: "", last_name: "", email: "", phone: "", notes: "" };
  const extras: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (v == null) continue;
    const value = String(v).trim();
    if (!value) continue;
    const key = k.toString().trim().toLowerCase();
    const mapped = HEADER_MAP[key];
    if (mapped) {
      out[mapped] = out[mapped] ? `${out[mapped]} ${value}` : value;
    } else {
      extras.push(`${k}: ${value}`);
    }
  }
  if (extras.length) out.notes = [out.notes, ...extras].filter(Boolean).join("\n");
  return out as never;
}

async function parseFile(file: File): Promise<Raw[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<Raw>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err),
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Raw>(sheet, { defval: "" });
}

export function ImportColdLeadsDialog({ open, onOpenChange, onImported }: Props) {
  const [busy, setBusy] = useState(false);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cold_leads_sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const raw = await parseFile(file);
      const normalized = raw.map(normalizeRow);

      // Build filtered set + tally missing
      let missing = 0;
      const candidates = normalized.filter((r) => {
        const hasName = r.first_name || r.last_name;
        const hasContact = r.email || r.phone;
        if (!hasName || !hasContact) { missing++; return false; }
        return true;
      });

      // Dedupe against existing leads
      const emails = candidates.map((r) => r.email.toLowerCase()).filter(Boolean);
      const phones = candidates.map((r) => r.phone.replace(/\D/g, "")).filter(Boolean);
      const existingEmails = new Set<string>();
      const existingPhones = new Set<string>();
      if (emails.length || phones.length) {
        const { data } = await supabase.from("leads").select("email,phone");
        (data ?? []).forEach((row: { email?: string | null; phone?: string | null }) => {
          if (row.email) existingEmails.add(row.email.toLowerCase());
          if (row.phone) existingPhones.add(String(row.phone).replace(/\D/g, ""));
        });
      }

      let dups = 0;
      const seenEmail = new Set<string>();
      const seenPhone = new Set<string>();
      const toInsert = candidates.filter((r) => {
        const e = r.email.toLowerCase();
        const p = r.phone.replace(/\D/g, "");
        const isDup = (e && (existingEmails.has(e) || seenEmail.has(e))) ||
                      (p && (existingPhones.has(p) || seenPhone.has(p)));
        if (isDup) { dups++; return false; }
        if (e) seenEmail.add(e);
        if (p) seenPhone.add(p);
        return true;
      });

      let imported = 0;
      if (toInsert.length) {
        const payload = toInsert.map((r) => ({
          first_name: r.first_name || "(unknown)",
          last_name: r.last_name || "(unknown)",
          email: r.email || null,
          phone: r.phone || null,
          notes: r.notes || null,
          is_cold_pool: true,
          lead_type: "cold" as const,
          lead_temperature: "cold" as const,
        }));
        const { data, error } = await supabase.from("leads").insert(payload as never).select("id");
        if (error) throw error;
        imported = data?.length ?? 0;
      }

      toast.success(`${imported} imported, ${dups} skipped (duplicates), ${missing} skipped (missing required fields)`);
      onImported?.();
      onOpenChange(false);
    } catch (e) {
      console.error("[import cold leads]", e);
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import cold leads</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file. Rows missing both name AND a contact method are skipped. Duplicates (matching email or phone) are skipped.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Button variant="outline" size="sm" onClick={downloadSample} className="w-full">
            <Download className="h-4 w-4 mr-2" /> Download sample CSV
          </Button>
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 cursor-pointer hover:bg-muted/50 transition">
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">Click to upload CSV or Excel</span>
            <span className="text-xs text-muted-foreground mt-1">.csv, .xlsx, .xls</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Recognized columns: first_name, last_name, email, phone, notes. Extra columns will be folded into notes.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{busy ? "Importing…" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

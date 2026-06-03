import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCsv, importRows, type PreviewRow, type DedupeAction, type ImportResult } from "@/lib/leadImport";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { Loader2, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

const SAMPLE_HEADERS = ["full_name","phone","email","country","service","academics","ielts","status","assigned_telecaller","assigned_counselor","campaign","notes"];
const SAMPLE_ROWS = [
  ["Aman Verma","+919876543210","aman@example.com","Canada","Student Visa (SDS)","B.Tech CSE 2023","7.0","hot","tc1@example.com","co1@example.com","Spring2026","Wants Sept intake"],
  ["Priya Singh","+919812345678","priya@example.com","UK","Student Visa","BBA 2022","6.5","warm","tc2@example.com","","Spring2026","Budget 25L"],
  ["Rahul Mehta","+919900112233","","Australia","Tourist Visa","","","cold","","","","Family trip Dec"],
];

function downloadSampleCsv() {
  const csv = [SAMPLE_HEADERS.join(","), ...SAMPLE_ROWS.map((r) => r.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g,'""')}"` : c).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "leads_sample.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function downloadSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([SAMPLE_HEADERS, ...SAMPLE_ROWS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "leads_sample.xlsx");
}

export function ImportLeadsDialog({ open, onOpenChange, campaigns, onDone }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaigns: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [action, setAction] = useState<DedupeAction>("skip");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum 5MB allowed.");
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isCsv = file.type === "text/csv" || lowerName.endsWith(".csv");
    if (!isCsv) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(file.type) && !lowerName.endsWith(".xlsx")) {
        toast.error("Invalid file type. Please upload an .xlsx file only.");
        return;
      }
    }
    setBusy(true); setResult(null);
    try {
      const r = await parseCsv(file);
      setRows(r);
      if (!r.length) toast.error("No rows detected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse CSV");
    } finally { setBusy(false); }
  };

  const valid = rows.filter((r) => !r._errors.length).length;
  const dups = rows.filter((r) => r._duplicate).length;

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await importRows(rows, action, campaignId || null);
      setResult(res);
      toast.success(`Imported: ${res.created} new, ${res.updated} updated, ${res.skipped} skipped, ${res.failed} failed`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>Import telecaller leads (CSV / Excel)</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
              <Download className="size-4 mr-1.5" />Sample CSV
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSampleXlsx}>
              <Download className="size-4 mr-1.5" />Sample Excel
            </Button>
          </div>
          {!rows.length && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
              <Label htmlFor="csv-file" className="cursor-pointer text-sm">
                <span className="text-primary font-medium">Click to upload</span> a CSV or Excel file
              </Label>
              <Input id="csv-file" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden"
                     onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <div className="text-xs text-muted-foreground mt-2">
                CSV or Excel (.xlsx). Required: phone, full name. Optional: email, country, service, academics, ielts, status, assigned_telecaller (email), assigned_counselor (email), notes
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Campaign</Label>
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Duplicate action</Label>
                  <Select value={action} onValueChange={(v) => setAction(v as DedupeAction)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="update">Update existing</SelectItem>
                      <SelectItem value="merge">Merge notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 text-sm">
                  <Badge variant="secondary">{rows.length} rows</Badge>
                  <StatusBadge variant="success" className="border">{valid} valid</StatusBadge>
                  {dups > 0 && <StatusBadge variant="warning" className="border">{dups} dup</StatusBadge>}
                </div>
              </div>

              <div className="border rounded max-h-72 overflow-auto">
                <table className="text-xs w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r._row} className={r._errors.length ? "bg-destructive/10" : r._duplicate ? "bg-warning/10" : ""}>
                        <td className="p-2 font-mono">{r._row}</td>
                        <td className="p-2">{r.full_name}</td>
                        <td className="p-2 font-mono">{r.phone}</td>
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.status} {r._duplicate && <Badge variant="outline" className="ml-1 text-[10px]">dup</Badge>}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-[180px]">{r._errors.join(", ") || r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result && (
                <div className="border rounded p-3 text-sm bg-muted/30 space-y-1">
                  <div>Created: <b>{result.created}</b> · Updated: <b>{result.updated}</b> · Skipped: <b>{result.skipped}</b> · Failed: <b>{result.failed}</b></div>
                  {result.errors.slice(0, 5).map((er) => <div key={er.row} className="text-xs text-destructive">Row {er.row}: {er.error}</div>)}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {rows.length > 0 && <Button variant="ghost" onClick={() => { setRows([]); setResult(null); }}>Reset</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {rows.length > 0 && <Button onClick={runImport} disabled={busy || !valid}>
            {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Import {valid} rows
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { fetchReportRows, rowsToCsv, downloadFile, type ReportType } from "../lib/reportingApi";
import { useAuth } from "@/contexts/AuthContext";
import { useCalendarScope } from "../lib/permissions";

const REPORTS: { value: ReportType; label: string }[] = [
  { value: "appointments", label: "Appointment Report" },
  { value: "user_performance", label: "User Performance Report" },
  { value: "meeting_types", label: "Meeting Type Report" },
  { value: "cancellations", label: "Cancellation Report" },
  { value: "no_shows", label: "No-Show Report" },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const scope = useCalendarScope();
  const [type, setType] = useState<ReportType>("appointments");
  const [days, setDays] = useState(30);
  const [preview, setPreview] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const rows = await fetchReportRows(type, {
        days,
        userIdScope: scope === "user" ? user!.id : null,
      });
      setPreview(rows);
      toast.success(`${rows.length} rows loaded`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally { setLoading(false); }
  };

  const exportCsv = () => {
    if (!preview.length) return;
    downloadFile(`${type}_${Date.now()}.csv`, rowsToCsv(preview));
  };

  const exportJson = () => {
    if (!preview.length) return;
    downloadFile(`${type}_${Date.now()}.json`, JSON.stringify(preview, null, 2), "application/json");
  };

  const cols = preview[0] ? Object.keys(preview[0]) : [];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Reports</h1>

        <Card>
          <CardHeader><CardTitle className="text-sm">Build report</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-xs mb-1 text-muted-foreground">Report</div>
              <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs mb-1 text-muted-foreground">Range</div>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last 365 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={run} disabled={loading}>{loading ? "Loading…" : "Run"}</Button>
            <Button variant="outline" onClick={exportCsv} disabled={!preview.length}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={exportJson} disabled={!preview.length}>
              <Download className="h-4 w-4 mr-2" /> JSON
            </Button>
          </CardContent>
        </Card>

        {preview.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Preview ({preview.length})</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {cols.map((c) => <th key={c} className="text-left p-2 font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b">
                      {cols.map((c) => <td key={c} className="p-2">{String(r[c] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
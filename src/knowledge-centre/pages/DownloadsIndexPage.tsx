import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { listDownloads } from "@/knowledge-centre/repositories/kcRepo";
import { DownloadsSectionPanel } from "@/knowledge-centre/components/DownloadsSectionPanel";
import type { KcDownloadType } from "@/knowledge-centre/types/kc";

const TYPES: { value: KcDownloadType | ""; label: string }[] = [
  { value: "", label: "All categories" },
  { value: "counsellor_guide", label: "Counsellor guide" },
  { value: "meeting_checklist", label: "Meeting checklist" },
  { value: "budget_planner", label: "Budget planner" },
  { value: "arrival_checklist", label: "Arrival checklist" },
  { value: "settlement_checklist", label: "Settlement checklist" },
  { value: "other", label: "Other" },
];

export default function DownloadsIndexPage() {
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof listDownloads>>>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<KcDownloadType | "">("");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    listDownloads({ downloadType: type || undefined })
      .then((rows) => {
        if (!q.trim()) return rows;
        const lower = q.toLowerCase();
        return rows.filter((r) => r.title.toLowerCase().includes(lower));
      })
      .then(setAssets)
      .finally(() => setLoading(false));
  }, [type, q]);

  return (
    <AppLayout>
      <PageHeader title="Downloads" description="Counsellor templates and checklists — Future Link owned files only." />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search downloads…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={type}
            onChange={(e) => setType(e.target.value as KcDownloadType | "")}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {loading ? <Loader2 className="size-6 animate-spin" /> : <DownloadsSectionPanel assets={assets} />}
      </div>
    </AppLayout>
  );
}

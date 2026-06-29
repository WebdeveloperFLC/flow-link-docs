import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, Plus } from "lucide-react";
import { listOfficialSources, upsertOfficialSource, deleteOfficialSource } from "../repositories/kcRepo";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { KcOfficialSource } from "../types/kc";
import { toast } from "sonner";

export default function OfficialSourcesPage() {
  const { canEdit } = useModulePermission("knowledge_centre");
  const [rows, setRows] = useState<KcOfficialSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    listOfficialSources()
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(
    (r) =>
      !q.trim() ||
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.authority.toLowerCase().includes(q.toLowerCase()),
  );

  const addBlank = async () => {
    try {
      await upsertOfficialSource({
        title: "New official source",
        official_url: `https://placeholder-${Date.now()}.invalid`,
        authority: "",
        category: "general",
      });
      toast.success("Source created — edit URL and details");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Official Resources"
        description="Master registry of authoritative URLs — never duplicate links in article body."
        actions={
          canEdit ? (
            <Button size="sm" onClick={addBlank}><Plus className="size-4 mr-1" /> Add source</Button>
          ) : undefined
        }
      />
      <div className="p-8 space-y-4">
        <Input placeholder="Filter by title or authority…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Authority</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Category</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.authority}</td>
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2 text-right space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={r.official_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await deleteOfficialSource(r.id);
                            load();
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

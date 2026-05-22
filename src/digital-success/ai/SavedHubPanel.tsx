import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, ExternalLink, FolderOpen, Loader2, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePromoStudio } from "./usePromoStudio";

type HubRow = {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_scope: string;
  storage_path: string | null;
  mime_type: string | null;
  file_name: string | null;
  country_name: string | null;
  campaign_name: string | null;
  created_at: string;
};

type FilterKey = "all" | "poster" | "stock" | "video" | "other";

function classify(row: HubRow): FilterKey {
  const mime = row.mime_type ?? "";
  if (mime.startsWith("video/")) return "video";
  if (row.content_type === "poster") return "poster";
  if (row.content_type === "social" || row.content_type === "other") return "stock";
  return "other";
}

export function SavedHubPanel() {
  const studio = usePromoStudio();
  const [rows, setRows] = useState<HubRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = (await studio.listMyHubMedia(200)) as HubRow[];
      setRows(data);
      const settled = await Promise.allSettled(
        data
          .filter((r) => r.storage_path)
          .map(async (r) => [r.id, await studio.getSignedUrl(r.storage_path as string)] as const),
      );
      const nextUrls: Record<string, string> = {};
      const nextMissing: Record<string, boolean> = {};
      settled.forEach((res, idx) => {
        const row = data.filter((r) => r.storage_path)[idx];
        if (res.status === "fulfilled") nextUrls[res.value[0]] = res.value[1];
        else if (row) nextMissing[row.id] = true;
      });
      setUrls(nextUrls);
      setMissing(nextMissing);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load saved assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  // Re-fetch when something is saved from another tab
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("dsh-hub-refresh", handler);
    return () => window.removeEventListener("dsh-hub-refresh", handler);
    // eslint-disable-next-line
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && classify(r) !== filter) return false;
      if (q && !(`${r.title} ${r.description ?? ""} ${r.campaign_name ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, filter, search]);

  async function onDelete(row: HubRow) {
    if (!confirm(`Delete "${row.title}" from the Hub? This removes the file permanently.`)) return;
    try {
      await studio.deleteHubMedia({ id: row.id, storage_path: row.storage_path });
      setRows((cur) => cur.filter((r) => r.id !== row.id));
      toast.success("Deleted from Hub");
    } catch (e: any) {
      const msg = e?.message ?? "Delete failed";
      if (/row-level security|42501|permission/i.test(msg)) {
        toast.error("You don't have permission to delete this asset.");
      } else toast.error(msg);
    }
  }

  async function onDownload(row: HubRow) {
    const url = urls[row.id];
    if (!url) return;
    const ext = (row.storage_path?.split(".").pop() || "bin").toLowerCase();
    const fname = row.file_name || `${row.title.replace(/[^a-z0-9-_]+/gi, "-")}.${ext}`;
    try { await studio.downloadAsset(url, fname); }
    catch (e: any) { toast.error(e?.message ?? "Download failed"); }
  }

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: rows.length, poster: 0, stock: 0, video: 0, other: 0 };
    rows.forEach((r) => { c[classify(r)] = (c[classify(r)] ?? 0) + 1; });
    return c;
  }, [rows]);

  const FilterBtn = ({ k, label }: { k: FilterKey; label: string }) => (
    <Button
      type="button"
      size="sm"
      variant={filter === k ? "default" : "outline"}
      onClick={() => setFilter(k)}
    >
      {label} <span className="ml-1 text-xs opacity-70">{counts[k] ?? 0}</span>
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="size-4" /> Your saved assets
        </CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            className="h-8 w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="button" size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <FilterBtn k="all" label="All" />
          <FilterBtn k="poster" label="Posters" />
          <FilterBtn k="stock" label="Stock images" />
          <FilterBtn k="video" label="Videos" />
          <FilterBtn k="other" label="Other" />
        </div>

        {loading && rows.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-8 text-center">
            Nothing saved yet. Click <strong>Save to Hub</strong> on any generated image, stock photo, or video clip and it will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((r) => {
              const url = urls[r.id];
              const isMissing = missing[r.id];
              const isVideo = (r.mime_type ?? "").startsWith("video/") || /\.(webm|mp4|mov)$/i.test(r.storage_path ?? "");
              const isImage = (r.mime_type ?? "").startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(r.storage_path ?? "");
              return (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="p-2 space-y-2">
                    <div className="aspect-square w-full bg-muted rounded overflow-hidden flex items-center justify-center">
                      {isMissing ? (
                        <div className="flex flex-col items-center justify-center text-center px-2 text-muted-foreground">
                          <AlertTriangle className="size-8 text-destructive mb-1" />
                          <div className="text-[11px] font-medium">File no longer available</div>
                          <div className="text-[10px]">Delete to remove from Hub</div>
                        </div>
                      ) : !url ? (
                        <div className="w-full h-full animate-pulse" />
                      ) : isVideo ? (
                        <video src={url} controls className="w-full h-full object-cover bg-black" />
                      ) : isImage ? (
                        <img src={url} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="size-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-h-[2.5rem]">
                      <div className="text-sm font-medium truncate" title={r.title}>{r.title}</div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">{r.content_type}</Badge>
                        {r.country_name && <Badge variant="outline" className="text-[10px] px-1 py-0">{r.country_name}</Badge>}
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 px-2"
                        disabled={!url || isMissing}
                        onClick={() => url && window.open(url, "_blank", "noopener")}
                      >
                        <ExternalLink className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 px-2"
                        disabled={!url || isMissing}
                        onClick={() => onDownload(r)}
                      >
                        <Download className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-7 px-2"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
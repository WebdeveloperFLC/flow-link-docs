import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDshMedia, useBranches, useServiceCatalogueOptions } from "../hooks/useDshMedia";
import { CONTENT_TYPES, type HubTab } from "../lib/dshTypes";
import { MediaListTable } from "../components/MediaListTable";
import { MediaUploadDialog } from "../components/MediaUploadDialog";
import { NotifyBranchesDialog } from "../components/NotifyBranchesDialog";
import { GoogleReviewsPanel } from "../components/GoogleReviewsPanel";
import type { DshMedia } from "../lib/dshTypes";

const TABS: { value: HubTab; label: string }[] = [
  { value: "all", label: "All Content" },
  { value: "common", label: "Common" },
  { value: "country", label: "By Country" },
  { value: "institution", label: "By Institution" },
  { value: "service", label: "By Service" },
  { value: "google_reviews", label: "Google Reviews" },
  { value: "front_desk", label: "Front Desk" },
];

export default function DigitalSuccessHomePage() {
  const [tab, setTab] = useState<HubTab>("all");
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<string>("all");
  const [country, setCountry] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [serviceKey, setServiceKey] = useState<string>("all");
  const [notifyTarget, setNotifyTarget] = useState<DshMedia | null>(null);

  const { data: branches = [] } = useBranches();
  const { data: services = [] } = useServiceCatalogueOptions();
  const serviceKeys = Array.from(new Set(services.map((s) => s.master_key)));

  const { data: rows = [], isLoading } = useDshMedia({
    tab,
    search,
    contentType: contentType === "all" ? undefined : contentType,
    country: country || undefined,
    branchId: branchId === "all" ? undefined : branchId,
    serviceMasterKey: serviceKey === "all" ? undefined : serviceKey,
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Digital Success Hub"
          description="Search clients, link OneDrive-first promotional content, and notify branches."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/digital-success/ai"><Sparkles className="size-4 mr-2" />AI Studio</Link>
              </Button>
              <MediaUploadDialog />
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px] max-w-xl">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search title, campaign, country, institution, service, review text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Content type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CONTENT_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={serviceKey} onValueChange={setServiceKey}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {serviceKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            className="w-[160px]"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as HubTab)}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab === "google_reviews" ? (
          <GoogleReviewsPanel rows={rows} loading={isLoading} />
        ) : (
          <MediaListTable rows={rows} loading={isLoading} onNotify={setNotifyTarget} />
        )}
        <NotifyBranchesDialog
          media={notifyTarget}
          open={!!notifyTarget}
          onOpenChange={(v) => !v && setNotifyTarget(null)}
        />
      </div>
    </AppLayout>
  );
}
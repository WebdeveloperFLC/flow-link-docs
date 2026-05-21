import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTENT_SCOPES,
  CONTENT_TYPES,
  LINK_TYPES,
  OWNER_DEPARTMENTS,
  UPLOAD_SOURCES,
} from "../lib/dshTypes";
import { useBranches, useServiceCatalogueOptions, useTeamMembers } from "../hooks/useDshMedia";

const MAX_UPLOAD = 10 * 1024 * 1024;

export function MediaUploadDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campaign, setCampaign] = useState("");
  const [contentType, setContentType] = useState<string>("poster");
  const [scope, setScope] = useState<string>("common");
  const [ownerDept, setOwnerDept] = useState<string>("marketing");

  // Scope targets
  const [country, setCountry] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [branchId, setBranchId] = useState<string>("none");
  const [serviceKey, setServiceKey] = useState<string>("none");

  // Source
  const [uploadSource, setUploadSource] = useState<string>("onedrive");
  const [linkType, setLinkType] = useState<string>("onedrive_file");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Flags
  const [isFrontDesk, setIsFrontDesk] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [visibleAll, setVisibleAll] = useState(false);

  // Google review
  const [isGoogleReview, setIsGoogleReview] = useState(false);
  const [gReviewUrl, setGReviewUrl] = useState("");
  const [gReviewText, setGReviewText] = useState("");
  const [gReviewRating, setGReviewRating] = useState<string>("");
  const [clientId, setClientId] = useState("");
  const [creditedUserId, setCreditedUserId] = useState<string>("");
  const [reviewReceivedAt, setReviewReceivedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const { data: services = [] } = useServiceCatalogueOptions();
  const { data: branches = [] } = useBranches();
  const { data: team = [] } = useTeamMembers();

  const serviceMasterKeys = useMemo(() => {
    const seen = new Set<string>();
    return services.filter((s) => {
      if (seen.has(s.master_key)) return false;
      seen.add(s.master_key);
      return true;
    });
  }, [services]);

  const isLink = uploadSource !== "upload";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      if (isLink && !externalUrl.trim()) throw new Error("Link URL required");

      let storage_path: string | null = null;
      let file_name: string | null = null;
      let file_size: number | null = null;
      let mime_type: string | null = null;

      if (!isLink) {
        if (!file) throw new Error("Select a file to upload");
        if (file.type.startsWith("video/")) throw new Error("Video uploads are not allowed. Use an OneDrive link.");
        if (file.size > MAX_UPLOAD) throw new Error("File exceeds 10 MB. Use an OneDrive link.");
        const path = `media/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, file);
        if (upErr) throw upErr;
        storage_path = path;
        file_name = file.name;
        file_size = file.size;
        mime_type = file.type;
      }

      let google_review_screenshot_path: string | null = null;
      if (isGoogleReview && screenshotFile) {
        if (!screenshotFile.type.startsWith("image/")) throw new Error("Screenshot must be an image");
        if (screenshotFile.size > MAX_UPLOAD) throw new Error("Screenshot exceeds 10 MB");
        const path = `reviews/${crypto.randomUUID()}-${screenshotFile.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, screenshotFile);
        if (upErr) throw upErr;
        google_review_screenshot_path = path;
      }

      const { data: auth } = await supabase.auth.getUser();

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        campaign_name: campaign.trim() || null,
        content_type: isGoogleReview ? "review" : contentType,
        content_scope: scope,
        content_owner_department: ownerDept,
        source_type: isLink ? "link" : "upload",
        upload_source: uploadSource,
        link_type: isLink ? linkType : null,
        external_url: isLink ? externalUrl.trim() : null,
        storage_path,
        file_name,
        file_size,
        mime_type,
        country_name: country.trim() || null,
        institution_id: institutionId.trim() || null,
        branch_id: branchId !== "none" ? branchId : null,
        service_master_key: serviceKey !== "none" ? serviceKey : null,
        is_front_desk: isFrontDesk,
        is_pinned: isPinned,
        visible_to_all_branches: visibleAll,
        is_google_review: isGoogleReview,
        google_review_url: isGoogleReview ? gReviewUrl.trim() || null : null,
        google_review_text: isGoogleReview ? gReviewText.trim() || null : null,
        google_review_rating: isGoogleReview && gReviewRating ? Number(gReviewRating) : null,
        google_review_screenshot_path,
        client_id: clientId.trim() || null,
        credited_user_id: isGoogleReview ? (creditedUserId || null) : null,
        review_received_at: isGoogleReview ? (reviewReceivedAt || null) : null,
        uploaded_by: auth?.user?.id ?? null,
      };

      const { error } = await supabase.from("dsh_media" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Content saved");
      qc.invalidateQueries({ queryKey: ["dsh_media"] });
      setOpen(false);
      // reset minimal
      setTitle(""); setDescription(""); setCampaign(""); setExternalUrl(""); setFile(null);
      setGReviewUrl(""); setGReviewText(""); setGReviewRating(""); setClientId("");
      setCreditedUserId(""); setScreenshotFile(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" /> Add content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add promotional content</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Campaign name</Label>
              <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Canada Sept 2026" />
            </div>
            <div className="grid gap-2">
              <Label>Owner department</Label>
              <Select value={ownerDept} onValueChange={setOwnerDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNER_DEPARTMENTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Content scope *</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_SCOPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Content type *</Label>
              <Select value={contentType} onValueChange={setContentType} disabled={isGoogleReview}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Country {scope === "country" && "*"}</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Canada" />
            </div>
            <div className="grid gap-2">
              <Label>Institution ID {scope === "institution" && "*"}</Label>
              <Input value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} placeholder="UUID" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Service category {scope === "service_category" && "*"}</Label>
              <Select value={serviceKey} onValueChange={setServiceKey}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {serviceMasterKeys.map((s) => (
                    <SelectItem key={s.master_key} value={s.master_key}>{s.master_key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md p-3 grid gap-3">
            <Label className="font-semibold">Source</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Upload source</Label>
                <Select value={uploadSource} onValueChange={setUploadSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UPLOAD_SOURCES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isLink && (
                <div className="grid gap-2">
                  <Label>Link type</Label>
                  <Select value={linkType} onValueChange={setLinkType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LINK_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {isLink ? (
              <div className="grid gap-2">
                <Label>URL *</Label>
                <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>File (≤10 MB, no video)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">For videos and large files, switch to OneDrive link.</p>
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Google Review</Label>
              <Switch checked={isGoogleReview} onCheckedChange={setIsGoogleReview} />
            </div>
            {isGoogleReview && (
              <>
                <p className="text-xs text-muted-foreground">Client, country, branch and service category are required.</p>
                <div className="grid gap-2">
                  <Label>Client ID *</Label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client UUID" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Credited counselor / team member *</Label>
                    <Select value={creditedUserId} onValueChange={setCreditedUserId}>
                      <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {team.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email ?? u.id.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Review received on *</Label>
                    <Input type="date" value={reviewReceivedAt} onChange={(e) => setReviewReceivedAt(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Google review URL</Label>
                    <Input value={gReviewUrl} onChange={(e) => setGReviewUrl(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rating (1–5)</Label>
                    <Input type="number" min={1} max={5} value={gReviewRating} onChange={(e) => setGReviewRating(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Review text</Label>
                  <Textarea value={gReviewText} onChange={(e) => setGReviewText(e.target.value)} rows={3} />
                </div>
                <div className="grid gap-2">
                  <Label>Screenshot (optional, image ≤10 MB)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <Switch checked={isFrontDesk} onCheckedChange={setIsFrontDesk} /> Front desk
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} /> Pin
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={visibleAll} onCheckedChange={setVisibleAll} /> All branches
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
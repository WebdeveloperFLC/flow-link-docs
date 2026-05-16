import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, RefreshCw, Sparkles, Plus, ArrowUp, Trash2, BookOpen } from "lucide-react";
import type { UpiInstitution, UpiSource, UpiSuggestion } from "../types/upi";

export default function InstitutionDetailPage() {
  const { id = "" } = useParams();
  const [inst, setInst] = useState<UpiInstitution | null>(null);
  const [sources, setSources] = useState<UpiSource[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<UpiSuggestion[]>([]);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceType, setNewSourceType] = useState("website_url");
  const [highlightSourceId, setHighlightSourceId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [campaignChannel, setCampaignChannel] = useState("email");
  const [generated, setGenerated] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [i, s, d, a, c, p, mc, sg] = await Promise.all([
      supabase.from("upi_institutions").select("*").eq("id", id).single(),
      supabase.from("upi_institution_sources").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_uploaded_documents").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_agreements").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_commissions").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_promotions").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_marketing_campaigns").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("upi_ai_suggestions").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
    ]);
    setInst(i.data as UpiInstitution); setSources((s.data ?? []) as UpiSource[]); setDocs(d.data ?? []);
    setAgreements(a.data ?? []); setCommissions(c.data ?? []); setPromos(p.data ?? []);
    setCampaigns(mc.data ?? []); setSuggestions((sg.data ?? []) as UpiSuggestion[]);
  };
  useEffect(() => { load(); }, [id]);

  const saveInst = async (patch: Partial<UpiInstitution>) => {
    if (!inst) return;
    const { error } = await supabase.from("upi_institutions").update(patch as any).eq("id", inst.id);
    if (error) toast.error(error.message); else { setInst({ ...inst, ...patch }); toast.success("Saved"); }
  };

  const addSource = async () => {
    if (!newSourceUrl.trim()) return toast.error("URL required");
    const { data, error } = await supabase
      .from("upi_institution_sources")
      .insert({ institution_id: id, source_type: newSourceType, url: newSourceUrl.trim() })
      .select()
      .single();
    if (error) {
      console.error("[addSource] insert failed", error);
      return toast.error(`Add source failed: ${error.message}`);
    }
    console.log("[addSource] inserted", data);
    setNewSourceUrl("");
    await load();
    if (data?.id) {
      setHighlightSourceId(data.id);
      setTimeout(() => {
        document.getElementById(`source-row-${data.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      setTimeout(() => setHighlightSourceId(null), 2500);
    }
    toast.success("Source added — click Sync now to fetch courses");
  };

  const syncNow = async (source: UpiSource) => {
    toast.info("Starting sync…");
    await supabase.from("upi_institution_sources").update({ crawl_status: "queued" }).eq("id", source.id);
    const { data, error } = await supabase.functions.invoke("upi-sync-source", {
      body: { source_id: source.id },
    });
    if (error) {
      toast.error(error.message);
    } else {
      const res = data as { extracted?: number; upserted?: number; rejected?: number };
      toast.success(`Sync complete — ${res?.upserted ?? 0} course(s) staged for review`);
    }
    load();
  };

  const syncAll = async () => {
    if (sources.length === 0) return;
    setSyncingAll(true);
    let total = 0;
    for (const s of sources) {
      try {
        const { data, error } = await supabase.functions.invoke("upi-sync-source", { body: { source_id: s.id } });
        if (error) toast.error(`${s.url}: ${error.message}`);
        else total += (data as any)?.upserted ?? 0;
      } catch (e: any) {
        toast.error(`${s.url}: ${e?.message ?? "failed"}`);
      }
    }
    setSyncingAll(false);
    toast.success(`Sync all complete — ${total} course(s) staged`);
    load();
  };

  const deleteSource = async (s: UpiSource) => {
    if (!confirm(`Delete this source?\n\n${s.url ?? s.file_path}\n\nExtracted programs will remain in Course Review.`)) return;
    const { error } = await supabase.from("upi_institution_sources").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Source deleted");
    load();
  };

  const uploadDoc = async (file: File) => {
    setBusy(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("institution-documents").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { data: doc, error: dErr } = await supabase.from("upi_uploaded_documents").insert({
      institution_id: id, file_name: file.name, file_path: path, file_size_bytes: file.size, mime_type: file.type,
    }).select().single();
    if (dErr) { setBusy(false); return toast.error(dErr.message); }
    toast.success("Uploaded — processing…");
    await supabase.functions.invoke("upi-process-document", { body: { document_id: doc!.id, institution_id: id } });
    setBusy(false); load();
  };

  const generateContent = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("upi-generate-content", {
      body: { institution_id: id, channel: campaignChannel, context_flags: { programs: true, promotions: true, commission: true }, tone: "professional" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setGenerated((data as any)?.content ?? "");
  };

  const saveCampaign = async () => {
    if (!generated) return;
    const { error } = await supabase.from("upi_marketing_campaigns").insert({
      institution_id: id, channel: campaignChannel, generated_content: generated, status: "approved", approved_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    setGenerated(""); load(); toast.success("Campaign saved");
  };

  const updateSuggestion = async (sId: string, status: "accepted" | "dismissed" | "deferred") => {
    await supabase.from("upi_ai_suggestions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", sId);
    load();
  };

  if (!inst) return <AppLayout><div className="p-8">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title={inst.name} description={`${inst.country_name ?? "—"} · ${inst.institution_type ?? "—"}`} />
      <div className="p-8">
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="agreements">Agreements</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6 space-y-3 max-w-2xl">
              <Input value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} onBlur={(e) => saveInst({ name: e.target.value })} />
              <Input placeholder="Country" value={inst.country_name ?? ""} onChange={(e) => setInst({ ...inst, country_name: e.target.value })} onBlur={(e) => saveInst({ country_name: e.target.value })} />
              <Input placeholder="Website" value={inst.website_url ?? ""} onChange={(e) => setInst({ ...inst, website_url: e.target.value })} onBlur={(e) => saveInst({ website_url: e.target.value })} />
              <Input placeholder="Email" value={inst.email ?? ""} onChange={(e) => setInst({ ...inst, email: e.target.value })} onBlur={(e) => saveInst({ email: e.target.value })} />
              <Input placeholder="Phone" value={inst.phone ?? ""} onChange={(e) => setInst({ ...inst, phone: e.target.value })} onBlur={(e) => saveInst({ phone: e.target.value })} />
              <Input placeholder="Type (public/private/college/university)" value={inst.institution_type ?? ""} onChange={(e) => setInst({ ...inst, institution_type: e.target.value })} onBlur={(e) => saveInst({ institution_type: e.target.value })} />
              <Textarea placeholder="Notes" value={inst.notes ?? ""} onChange={(e) => setInst({ ...inst, notes: e.target.value })} onBlur={(e) => saveInst({ notes: e.target.value })} />
              <div className="flex items-center gap-3">
                <Switch checked={inst.is_partner} onCheckedChange={(v) => saveInst({ is_partner: v })} />
                <span className="text-sm">Partner institution</span>
              </div>
              {Object.keys(inst.metadata ?? {}).length > 0 && (
                <div className="border-t pt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Discovered fields (metadata)</div>
                  <div className="space-y-1">
                    {Object.entries(inst.metadata).map(([k, v]) => (
                      <div key={k} className="text-sm flex justify-between gap-3">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="p-4 mb-4 flex gap-2 flex-wrap items-end">
              <select className="h-10 px-3 rounded-md border bg-background text-sm" value={newSourceType} onChange={(e) => setNewSourceType(e.target.value)}>
                {["website_url","listing_page","scholarship_page","tuition_page","international_page","pdf_brochure","excel_sheet","csv_feed","api_endpoint","uploaded_email","json_feed","sitemap"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <Input ref={urlInputRef} className="flex-1 min-w-[260px]" placeholder="https://university.edu/programs" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSource()} />
              <Button onClick={addSource}><Plus className="size-4" /> Add source</Button>
              {sources.length > 0 && (
                <Button variant="secondary" onClick={syncAll} disabled={syncingAll}>
                  <RefreshCw className={`size-4 ${syncingAll ? "animate-spin" : ""}`} /> Sync all
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to={`/institutions/review?institutionId=${id}`}>
                  <BookOpen className="size-4" /> View programs
                </Link>
              </Button>
            </Card>
            <div className="space-y-2">
              {sources.map((s) => (
                <Card
                  key={s.id}
                  id={`source-row-${s.id}`}
                  className={`p-4 flex items-center gap-4 transition-colors ${highlightSourceId === s.id ? "ring-2 ring-primary bg-primary/5" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.url ?? s.file_path}</div>
                    <div className="text-xs text-muted-foreground">{s.source_type} · {s.crawl_status} · {s.pages_scanned}/{s.pages_found} pages · {s.confidence_score}% confidence</div>
                  </div>
                  <Badge variant={s.crawl_status === "completed" ? "default" : s.crawl_status === "failed" ? "destructive" : "secondary"}>{s.crawl_status}</Badge>
                  <Button onClick={() => syncNow(s)} className="shrink-0">
                    <RefreshCw className="size-4" /> Sync now
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => deleteSource(s)} title="Delete source">
                    <Trash2 className="size-4" />
                  </Button>
                </Card>
              ))}
              {sources.length === 0 && (
                <Card className="p-8 border-dashed">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ArrowUp className="size-6 text-primary animate-bounce" />
                    <div className="font-medium">No sources yet</div>
                    <div className="text-sm text-muted-foreground max-w-md">
                      Paste a program-listing URL above (e.g. <code className="text-xs">https://conestogac.on.ca/fulltime-programs</code>), click <strong>Add source</strong>, then a <strong>Sync now</strong> button will appear on the new row.
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => urlInputRef.current?.focus()}>
                      Focus URL field
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="p-6 mb-4">
              <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/40">
                <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm">Click or drop a file to upload</div>
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])} disabled={busy} />
              </label>
            </Card>
            <div className="space-y-2">
              {docs.map((d) => (
                <Card key={d.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">{d.mime_type ?? "?"} · confidence {d.confidence_score}% · {d.review_status}</div>
                  </div>
                  <Badge variant={d.is_processed ? "default" : "secondary"}>{d.is_processed ? "Processed" : "Pending"}</Badge>
                </Card>
              ))}
              {docs.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No documents yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="agreements">
            <div className="space-y-2">
              {agreements.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div><div className="font-medium">{a.title}</div><div className="text-xs text-muted-foreground">{a.agreement_type} · {a.status} · valid {a.valid_from ?? "?"} → {a.valid_to ?? "?"}</div></div>
                    <Badge>{a.status}</Badge>
                  </div>
                </Card>
              ))}
              {agreements.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No agreements yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="commissions">
            <div className="space-y-2">
              {commissions.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.model_type} · {c.currency} · {c.is_active ? "Active" : c.is_proposed ? "Proposed" : "Inactive"}</div></div>
                    {c.is_proposed && <Badge variant="secondary">Proposed</Badge>}
                  </div>
                </Card>
              ))}
              {commissions.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No commissions yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="promotions">
            <div className="space-y-2">
              {promos.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.promo_type} · {p.is_active ? "Active" : "Inactive"} {p.auto_detected && "· AI detected"}</div>
                </Card>
              ))}
              {promos.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No promotions yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card className="p-4 mb-4 space-y-3">
              <div className="flex gap-2 items-end">
                <select className="h-10 px-3 rounded-md border bg-background text-sm" value={campaignChannel} onChange={(e) => setCampaignChannel(e.target.value)}>
                  {["email","whatsapp","social_post","brochure","counselor_note","sms","push"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <Button onClick={generateContent} disabled={busy}><Sparkles className="size-4" /> Generate</Button>
              </div>
              {generated && (
                <>
                  <Textarea className="min-h-[160px] font-mono text-xs" value={generated} onChange={(e) => setGenerated(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveCampaign}>Approve & save</Button>
                    <Button size="sm" variant="outline" onClick={generateContent}>Regenerate</Button>
                    <Button size="sm" variant="ghost" onClick={() => setGenerated("")}>Discard</Button>
                  </div>
                </>
              )}
            </Card>
            <div className="space-y-2">
              {campaigns.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium capitalize">{c.channel}</div>
                    <Badge>{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{c.generated_content}</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <div className="space-y-2">
              {suggestions.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{s.suggestion_type}</Badge>
                        <span className="text-xs text-muted-foreground">{s.confidence}% confidence</span>
                      </div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                    {s.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateSuggestion(s.id, "accepted")}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => updateSuggestion(s.id, "dismissed")}>Dismiss</Button>
                      </div>
                    )}
                    {s.status !== "pending" && <Badge variant="secondary">{s.status}</Badge>}
                  </div>
                </Card>
              ))}
              {suggestions.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No suggestions yet.</div>}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6"><Link to="/institutions" className="text-sm text-muted-foreground hover:text-foreground">← Back to institutions</Link></div>
      </div>
    </AppLayout>
  );
}
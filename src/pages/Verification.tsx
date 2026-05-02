import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, FileSearch, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

interface Signal {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  weight: number;
  detail?: string;
  evidence?: string;
}

interface Verification {
  id: string;
  document_id: string;
  client_id: string | null;
  doc_type: string | null;
  risk_score: number;
  risk_level: "pass" | "review" | "high_risk";
  signals: Signal[];
  ai_summary: string | null;
  reviewer_status: string | null;
  reviewer_note: string | null;
  created_at: string;
}

interface ClientLite { id: string; full_name: string; application_id: string; }
interface DocLite {
  id: string; client_id: string; file_name: string; document_type: string; mime_type: string | null;
  storage_path: string; uploaded_at: string;
}

const levelMeta = {
  pass: { label: "Pass", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  review: { label: "Needs review", icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  high_risk: { label: "High risk", icon: ShieldX, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-800 border-red-300" },
};

const sigIcon = {
  pass: { I: CheckCircle2, c: "text-emerald-600" },
  warn: { I: AlertTriangle, c: "text-amber-600" },
  fail: { I: XCircle, c: "text-red-600" },
  info: { I: Info, c: "text-muted-foreground" },
} as const;

const Verification = () => {
  const [params, setParams] = useSearchParams();
  const initialDoc = params.get("document_id");

  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocLite | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Verification[]>([]);
  const [active, setActive] = useState<Verification | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");

  // Load clients
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("id, full_name, application_id").order("created_at", { ascending: false }).limit(500);
      setClients((data ?? []) as ClientLite[]);
    })();
  }, []);

  // Load docs for client
  useEffect(() => {
    if (!clientId) { setDocs([]); return; }
    (async () => {
      const { data } = await supabase
        .from("client_documents")
        .select("id, client_id, file_name, document_type, mime_type, storage_path, uploaded_at")
        .eq("client_id", clientId)
        .order("uploaded_at", { ascending: false });
      setDocs((data ?? []) as DocLite[]);
    })();
  }, [clientId]);

  // Deep-link: ?document_id=...
  useEffect(() => {
    if (!initialDoc) return;
    (async () => {
      const { data } = await supabase
        .from("client_documents")
        .select("id, client_id, file_name, document_type, mime_type, storage_path, uploaded_at")
        .eq("id", initialDoc)
        .maybeSingle();
      if (data) {
        setClientId(data.client_id);
        setSelectedDoc(data as DocLite);
      }
    })();
  }, [initialDoc]);

  // Load verification history when doc changes
  useEffect(() => {
    if (!selectedDoc) { setHistory([]); setActive(null); return; }
    (async () => {
      const { data } = await supabase
        .from("document_verifications")
        .select("*")
        .eq("document_id", selectedDoc.id)
        .order("created_at", { ascending: false });
      const h = (data ?? []) as unknown as Verification[];
      setHistory(h);
      setActive(h[0] ?? null);
      setReviewerNote(h[0]?.reviewer_note ?? "");
    })();
  }, [selectedDoc]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.full_name.toLowerCase().includes(q) || c.application_id.toLowerCase().includes(q));
  }, [clients, search]);

  const downloadDoc = async (path: string): Promise<File | null> => {
    const { data, error } = await supabase.storage.from("client-documents").download(path);
    if (error || !data) return null;
    const name = path.split("/").pop() ?? "document";
    return new File([data], name, { type: data.type || "application/octet-stream" });
  };

  const runVerification = async () => {
    if (!selectedDoc) return;
    setRunning(true);
    try {
      const file = await downloadDoc(selectedDoc.storage_path);
      if (!file) throw new Error("Could not download file");
      const isPdf = (file.type === "application/pdf") || /\.pdf$/i.test(file.name);
      let pageImages: string[] = [];
      let embeddedText = "";
      if (isPdf) {
        embeddedText = await extractFirstPageText(file, 12000, 4);
        pageImages = await renderPdfPagesToJpegDataUrls(file, 2, 130, 0.7);
      } else if (file.type.startsWith("image/")) {
        pageImages = [await imageFileToJpegDataUrl(file)];
      }

      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: {
          document_id: selectedDoc.id,
          doc_type: selectedDoc.document_type,
          page_image_data_urls: pageImages,
          embedded_text: embeddedText,
          ocr_text: "", // browser-side OCR not wired; AI vision compensates
        },
      });
      if (error) throw error;

      toast.success("Verification complete");
      // Refresh history
      const { data: hData } = await supabase
        .from("document_verifications")
        .select("*")
        .eq("document_id", selectedDoc.id)
        .order("created_at", { ascending: false });
      const h = (hData ?? []) as unknown as Verification[];
      setHistory(h);
      setActive(h[0] ?? null);
      setReviewerNote(h[0]?.reviewer_note ?? "");
      logActivity("document_verified", "document", selectedDoc.id, { risk_level: (data as { risk_level?: string })?.risk_level });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setRunning(false);
    }
  };

  const setReviewerStatus = async (status: "verified" | "rejected" | "needs_reissue") => {
    if (!active) return;
    const { error } = await supabase
      .from("document_verifications")
      .update({ reviewer_status: status, reviewer_note: reviewerNote, reviewed_at: new Date().toISOString() })
      .eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    // Propagate the reviewer's decision to the underlying document so that the
    // client checklist + document list reflect the verified / rejected / reissue
    // state — not just this verification page.
    const { error: docErr } = await supabase
      .from("client_documents")
      .update({ status })
      .eq("id", active.document_id);
    if (docErr) {
      toast.error(`Saved review, but failed to update document status: ${docErr.message}`);
    }
    await logActivity("document.review_decision", "document", active.document_id, { reviewer_status: status });
    toast.success(`Marked as ${status.replace("_", " ")}`);
    setActive({ ...active, reviewer_status: status, reviewer_note: reviewerNote });
    setHistory((prev) => prev.map((v) => v.id === active.id ? { ...v, reviewer_status: status, reviewer_note: reviewerNote } : v));
  };

  const lvl = active ? levelMeta[active.risk_level] : null;
  const LvlIcon = lvl?.icon;

  return (
    <AppLayout>
      <PageHeader
        title="Document verification"
        description="Run multi-signal authenticity checks on uploaded documents. Catches common fakes; flags suspicious ones for human review."
      />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: pick client + doc */}
        <Card className="p-4 space-y-3 h-fit">
          <div className="text-sm font-semibold">1. Pick a client</div>
          <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-64 overflow-auto space-y-1 border rounded-md p-1">
            {filteredClients.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClientId(c.id); setSelectedDoc(null); }}
                className={cn("w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition", clientId === c.id && "bg-accent")}
              >
                <div className="font-medium truncate">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">{c.application_id}</div>
              </button>
            ))}
            {filteredClients.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">No clients</div>}
          </div>

          {clientId && (
            <>
              <div className="text-sm font-semibold pt-2">2. Pick a document</div>
              <div className="max-h-80 overflow-auto space-y-1 border rounded-md p-1">
                {docs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDoc(d)}
                    className={cn("w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition", selectedDoc?.id === d.id && "bg-accent")}
                  >
                    <div className="font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">{d.document_type}</div>
                  </button>
                ))}
                {docs.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">No documents</div>}
              </div>
            </>
          )}
        </Card>

        {/* Right: report */}
        <div className="space-y-4">
          {!selectedDoc && (
            <Card className="p-12 text-center text-muted-foreground">
              <FileSearch className="size-12 mx-auto mb-3 opacity-40" />
              <div className="font-medium text-foreground">Select a client and document to start</div>
              <div className="text-sm mt-1">No tool is 100% accurate — high-risk results should always be reviewed manually.</div>
            </Card>
          )}

          {selectedDoc && (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Document</div>
                  <div className="font-semibold">{selectedDoc.file_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedDoc.document_type}</div>
                </div>
                <Button onClick={runVerification} disabled={running}>
                  {running ? <><Loader2 className="size-4 mr-2 animate-spin" />Scanning…</> : <><FileSearch className="size-4 mr-2" />Run verification</>}
                </Button>
              </div>
            </Card>
          )}

          {active && lvl && LvlIcon && (
            <Card className={cn("p-5 border-2", lvl.bg)}>
              <div className="flex items-center gap-3">
                <LvlIcon className={cn("size-8", lvl.color)} />
                <div className="flex-1">
                  <div className={cn("text-lg font-bold", lvl.color)}>{lvl.label}</div>
                  <div className="text-sm text-muted-foreground">Risk score {active.risk_score}/100</div>
                </div>
                <Badge className={cn("border", lvl.badge)}>{active.risk_level.replace("_", " ")}</Badge>
              </div>
              <Progress value={active.risk_score} className="mt-3 h-2" />
              {active.ai_summary && (
                <div className="mt-4 text-sm bg-background/60 border rounded-md p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">AI examiner summary</div>
                  {active.ai_summary}
                </div>
              )}
            </Card>
          )}

          {active && active.signals?.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="text-sm font-semibold">Signals</div>
              <div className="divide-y">
                {active.signals.map((s, i) => {
                  const I = sigIcon[s.status].I;
                  return (
                    <div key={i} className="py-3 flex items-start gap-3">
                      <I className={cn("size-5 mt-0.5 shrink-0", sigIcon[s.status].c)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{s.label}</div>
                        {s.detail && <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>}
                        {s.evidence && <div className="text-xs font-mono mt-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate">{s.evidence}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {active && (
            <Card className="p-5 space-y-3">
              <div className="text-sm font-semibold">Reviewer decision</div>
              <Textarea
                placeholder="Add notes about your manual review (optional)"
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="default" onClick={() => setReviewerStatus("verified")}>Mark verified</Button>
                <Button variant="outline" onClick={() => setReviewerStatus("needs_reissue")}>Request reissue</Button>
                <Button variant="destructive" onClick={() => setReviewerStatus("rejected")}>Reject</Button>
              </div>
              {active.reviewer_status && (
                <div className="text-xs text-muted-foreground">
                  Current status: <span className="font-medium text-foreground">{active.reviewer_status.replace("_", " ")}</span>
                </div>
              )}
            </Card>
          )}

          {history.length > 1 && (
            <Card className="p-5">
              <div className="text-sm font-semibold mb-2">Previous runs</div>
              <div className="space-y-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { setActive(h); setReviewerNote(h.reviewer_note ?? ""); }}
                    className={cn("w-full text-left text-sm px-3 py-2 rounded hover:bg-accent flex items-center justify-between", active?.id === h.id && "bg-accent")}
                  >
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                    <Badge className={cn("border", levelMeta[h.risk_level].badge)}>{h.risk_level.replace("_", " ")} · {h.risk_score}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Verification;
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Filter, Search, Download, Loader2, Copy, MessageCircle, Mail, Link as LinkIcon,
  Sparkles, ClipboardCheck, Coins, FileText, ChevronRight, ChevronDown, ChevronLeft, BookOpen, ListChecks, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ALLOWED_SERVICE_LIBRARY_COUNTRIES, ALLOWED_COUNTRY_SET,
  resolveForCountry, scopeByCountry, htmlToPlain, htmlToWhatsApp, htmlToEmail,
  feeItemsToTsv, copyToClipboard, copyHtmlToClipboard, buildShareableLink,
  type Master, type Override, type FeeItem, type ChecklistFile, type SopTask, type SubmissionItem, type Attachment,
} from "@/lib/serviceLibrary";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

const FLAT_CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "coaching_services", label: "Coaching" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_financial", label: "Travel & Financial" },
];

export default function ServiceLibrary() {
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [country, setCountry] = useState(params.get("country") ?? "");
  const [countryFilter, setCountryFilter] = useState<string>(params.get("country") || "ALL");
  const [treeSearch, setTreeSearch] = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (countryFilter && countryFilter !== "ALL") p.set("country", countryFilter);
    setParams(p, { replace: true });
  }, [selectedId, countryFilter, setParams]);

  const masters = useQuery({
    queryKey: ["sl-public-masters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_countries(country)")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as (Master & { service_library_countries: { country: string }[] })[];
    },
  });

  const { flatGroups, visaByCountry, visaForCountry, availableCountries } = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    const matches = (m: Master) =>
      !q || m.service.toLowerCase().includes(q) || m.sub_service.toLowerCase().includes(q);
    const flat: Record<string, Record<string, Master[]>> = {};
    const visa: Record<string, Record<string, Master[]>> = {};
    const countrySet = new Set<string>();
    for (const m of masters.data ?? []) {
      if (m.service_category === "admission_services") continue;
      if (m.service_category === "visa_immigration") {
        const countries = (m.service_library_countries ?? [])
          .map((c) => c.country)
          .filter((c) => ALLOWED_COUNTRY_SET.has(c));
        countries.forEach((c) => countrySet.add(c));
        if (!matches(m)) continue;
        if (countryFilter !== "ALL" && !countries.includes(countryFilter)) continue;
        const buckets = countries.length ? countries : ["Unassigned"];
        for (const c of buckets) {
          if (countryFilter !== "ALL" && c !== countryFilter) continue;
          visa[c] ??= {};
          visa[c][m.service] ??= [];
          visa[c][m.service].push(m);
        }
        continue;
      }
      if (!matches(m)) continue;
      const catDef = FLAT_CATEGORY_ORDER.find((c) => c.key === m.service_category);
      if (!catDef) continue;
      flat[catDef.label] ??= {};
      flat[catDef.label][m.service] ??= [];
      flat[catDef.label][m.service].push(m);
    }
    const flatSorted: Record<string, Record<string, Master[]>> = {};
    for (const { label } of FLAT_CATEGORY_ORDER) {
      if (!flat[label]) continue;
      const svcKeys = Object.keys(flat[label]).sort((a, b) => a.localeCompare(b));
      flatSorted[label] = {};
      for (const s of svcKeys) {
        flatSorted[label][s] = [...flat[label][s]].sort((a, b) =>
          a.sub_service.localeCompare(b.sub_service),
        );
      }
    }
    const visaSorted: Record<string, Record<string, Master[]>> = {};
    const countryKeys = Object.keys(visa).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    for (const c of countryKeys) {
      const svcKeys = Object.keys(visa[c]).sort((a, b) => a.localeCompare(b));
      visaSorted[c] = {};
      for (const s of svcKeys) {
        visaSorted[c][s] = [...visa[c][s]].sort((a, b) =>
          a.sub_service.localeCompare(b.sub_service),
        );
      }
    }
    const visaSingle: Record<string, Master[]> =
      countryFilter !== "ALL" ? visaSorted[countryFilter] ?? {} : {};
    return {
      flatGroups: flatSorted,
      visaByCountry: visaSorted,
      visaForCountry: visaSingle,
      availableCountries: Array.from(countrySet).sort((a, b) => a.localeCompare(b)),
    };
  }, [masters.data, treeSearch, countryFilter]);

  const selected = useMemo(
    () => (masters.data ?? []).find((m) => m.id === selectedId) ?? null,
    [masters.data, selectedId],
  );

  // Country passed to detail panel (for country-scoped overrides/fees).
  const detailCountry = selected?.service_category === "visa_immigration"
    ? (countryFilter !== "ALL" ? countryFilter
        : (selected.service_library_countries.find((c) => ALLOWED_COUNTRY_SET.has(c.country))?.country ?? null))
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 -ml-1" asChild>
            <Link to="/">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>
      <div className="p-4 md:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ListChecks className="h-4 w-4" /> Service Library
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Reference for counselors</h1>
          <p className="text-sm text-muted-foreground">
            Coaching, Allied, and Travel &amp; Financial are listed flat. Use the country filter to view Visa &amp; Immigration services for one country at a time.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-4 rounded-2xl border bg-white p-3 shadow-sm max-h-[80vh] overflow-auto">
            <div className="mb-2 px-1 space-y-2">
              <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filter by country…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All countries</SelectItem>
                  {availableCountries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="Search service or sub-service…"
                className="h-8 text-sm"
              />
            </div>
            {masters.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!masters.isLoading &&
              Object.keys(flatGroups).length === 0 &&
              Object.keys(visaByCountry).length === 0 &&
              Object.keys(visaForCountry).length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No records yet.</div>
              )}
            {Object.entries(flatGroups).map(([catLabel, services]) => (
              <Tree key={catLabel} label={catLabel}>
                {Object.entries(services).map(([svc, items]) => (
                  <Tree key={svc} label={svc}>
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 ${
                          selectedId === m.id ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        {m.sub_service}
                      </button>
                    ))}
                  </Tree>
                ))}
              </Tree>
            ))}
            {countryFilter !== "ALL" && Object.keys(visaForCountry).length > 0 && (
              <Tree label={`Visa & Immigration — ${countryFilter}`} defaultOpen>
                {Object.entries(visaForCountry).map(([svc, items]) => (
                  <Tree key={svc} label={svc}>
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 ${
                          selectedId === m.id ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        {m.sub_service}
                      </button>
                    ))}
                  </Tree>
                ))}
              </Tree>
            )}
            {countryFilter === "ALL" && Object.keys(visaByCountry).length > 0 && (
              <Tree label="Visa & Immigration">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Pick a country above to view services.
                </div>
                {Object.entries(visaByCountry).map(([c, services]) => (
                  <button
                    key={c}
                    onClick={() => setCountryFilter(c)}
                    className="block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100"
                  >
                    {c}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({Object.values(services).reduce((n, arr) => n + arr.length, 0)})
                    </span>
                  </button>
                ))}
              </Tree>
            )}
          </aside>

          <section className="lg:col-span-8">
            {selected ? (
              <RecordDetail master={selected} country={detailCountry} />
            ) : (
              <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                Select a record on the left.
              </div>
            )}
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}

function Tree({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-slate-100"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {label}
      </button>
      {open && <div className="pl-4 border-l ml-2.5">{children}</div>}
    </div>
  );
}

function RecordDetail({ master, country }: { master: Master; country: string | null }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const override = useQuery({
    queryKey: ["sl-ov", master.id, country],
    enabled: !!country,
    queryFn: async () => {
      const { data } = await supabase.from("service_library_overrides").select("*")
        .eq("library_id", master.id).eq("country", country!).maybeSingle();
      return data as Override | null;
    },
  });
  const fees = useQuery({
    queryKey: ["sl-fees-pub", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_fee_items")
        .select("*").eq("library_id", master.id).order("display_order");
      return (data ?? []) as unknown as FeeItem[];
    },
  });
  const attachments = useQuery({
    queryKey: ["sl-att-pub", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_attachments").select("*").eq("library_id", master.id);
      return (data ?? []) as unknown as Attachment[];
    },
  });
  const files = useQuery({
    queryKey: ["sl-cfiles-pub", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_checklist_files")
        .select("*").eq("library_id", master.id).order("version", { ascending: false });
      return (data ?? []) as unknown as ChecklistFile[];
    },
  });
  const sop = useQuery({
    queryKey: ["sl-sop-pub", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_sop_tasks")
        .select("*").eq("library_id", master.id).eq("is_active", true).order("sort_order");
      return (data ?? []) as unknown as SopTask[];
    },
  });
  const submission = useQuery({
    queryKey: ["sl-sub-pub", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_submission_checklist")
        .select("*").eq("library_id", master.id).eq("is_active", true).order("sort_order");
      return (data ?? []) as unknown as SubmissionItem[];
    },
  });
  const myCompletions = useQuery({
    queryKey: ["sl-sub-mine", master.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("service_library_submission_completions")
        .select("item_id").eq("user_id", user!.id);
      return new Set(((data ?? []) as { item_id: string }[]).map((r) => r.item_id));
    },
  });
  const mySopDone = useQuery({
    queryKey: ["sl-sop-mine", master.id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("service_library_sop_completions")
        .select("task_id").eq("user_id", user!.id);
      return new Set(((data ?? []) as { task_id: string }[]).map((r) => r.task_id));
    },
  });

  const resolved = resolveForCountry(master, override.data ?? null);
  const feeRows = scopeByCountry(fees.data ?? [], country);
  const attRows = scopeByCountry(attachments.data ?? [], country);
  const fileRows = scopeByCountry((files.data ?? []).filter((f) => f.is_current), country);
  const sopRows = scopeByCountry(sop.data ?? [], country);
  const subRows = scopeByCountry(submission.data ?? [], country);

  const processFlow: string[] = Array.isArray(resolved.process_flow) ? (resolved.process_flow as string[]) : [];

  const toggleSub = async (itemId: string) => {
    if (!user?.id) return;
    if (myCompletions.data?.has(itemId)) {
      await supabase.from("service_library_submission_completions")
        .delete().eq("item_id", itemId).eq("user_id", user.id);
    } else {
      await supabase.from("service_library_submission_completions")
        .insert({ item_id: itemId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["sl-sub-mine", master.id, user.id] });
  };
  const toggleSop = async (taskId: string) => {
    if (!user?.id) return;
    if (mySopDone.data?.has(taskId)) {
      await supabase.from("service_library_sop_completions")
        .delete().eq("task_id", taskId).eq("user_id", user.id);
    } else {
      await supabase.from("service_library_sop_completions")
        .insert({ task_id: taskId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["sl-sop-mine", master.id, user.id] });
  };

  const shareLink = buildShareableLink({
    category: master.service_category, service: master.service, subService: master.sub_service, country,
  });

  const qg = resolved;
  const hasQG = !!(qg.quick_guide_what_to_do || qg.quick_guide_common_mistakes || qg.quick_guide_escalation_rules || qg.quick_guide_important_reminders);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {country && <span className="text-primary">{country}</span>}
            </div>
            <h2 className="text-xl font-semibold">{master.service} · {master.sub_service}</h2>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={async () => {
              const ok = await copyToClipboard(shareLink);
              toast({ title: ok ? "Link copied" : "Copy failed" });
            }}><LinkIcon className="h-4 w-4 mr-1" />Copy link</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const text = encodeURIComponent(`${master.service} · ${master.sub_service}\n${shareLink}`);
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
            }}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
          </div>
        </div>
      </div>

      {hasQG && (
        <Panel title="Counselor Quick Guide" icon={<Sparkles className="h-4 w-4 text-amber-500" />} accent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["What to do", qg.quick_guide_what_to_do],
              ["Common mistakes", qg.quick_guide_common_mistakes],
              ["Escalation rules", qg.quick_guide_escalation_rules],
              ["Important reminders", qg.quick_guide_important_reminders],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-lg bg-amber-50/60 border border-amber-200 p-3">
                <div className="text-xs font-semibold uppercase text-amber-700">{label}</div>
                {val ? (
                  <div
                    className="mt-1 text-sm prose prose-sm max-w-none prose-p:my-1"
                    dangerouslySetInnerHTML={{ __html: val as string }}
                  />
                ) : (
                  <div className="mt-1 text-sm">—</div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {subRows.length > 0 && (
        <Panel title="Mandatory Submission Checklist" icon={<ClipboardCheck className="h-4 w-4" />}>
          <div className="space-y-2">
            {subRows.map((item) => {
              const done = myCompletions.data?.has(item.id) ?? false;
              return (
                <label key={item.id} className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={done} onChange={() => toggleSub(item.id)} />
                  <span className="text-sm">{item.item_label}</span>
                  {item.is_mandatory && <Badge variant="outline" className="text-xs">Required</Badge>}
                </label>
              );
            })}
            <div className="text-xs text-muted-foreground">
              {Array.from(myCompletions.data ?? []).filter((id) => subRows.some((s) => s.id === id)).length} / {subRows.length} done
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Checklist" icon={<FileText className="h-4 w-4" />}
            action={
              <Button size="sm" variant="ghost" onClick={async () => {
                const ok = await copyToClipboard(resolved.checklist_text ?? "");
                toast({ title: ok ? "Copied" : "Copy failed" });
              }}><Copy className="h-4 w-4" /></Button>
            }>
            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {resolved.checklist_text || "No checklist text yet."}
            </div>
          </Panel>

          <Panel title="Fees" icon={<Coins className="h-4 w-4" />}
            action={
              <Button size="sm" variant="ghost" onClick={async () => {
                const ok = await copyToClipboard(feeItemsToTsv(feeRows));
                toast({ title: ok ? "Table copied" : "Copy failed" });
              }}><Copy className="h-4 w-4" /></Button>
            }>
            {feeRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No fee items.</div>
            ) : (
              <div className="space-y-2">
                {feeRows.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                    <span className="text-slate-600">{f.fee_label}{f.country && <Badge variant="outline" className="ml-2 text-xs">{f.country}</Badge>}</span>
                    <span className="font-medium">{[f.currency, f.amount].filter(Boolean).join(" ") || f.notes || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Complete Cost Summary" icon={<Coins className="h-4 w-4 text-emerald-600" />}>
            {resolved.cost_summary_html ? (
              <>
                <div className="prose prose-sm max-w-none rounded-lg bg-slate-50 p-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: resolved.cost_summary_html }} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    const ok = await copyToClipboard(htmlToPlain(resolved.cost_summary_html));
                    toast({ title: ok ? "Copied" : "Copy failed" });
                  }}><Copy className="h-4 w-4 mr-1" />Copy Cost Summary</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const ok = await copyToClipboard(htmlToWhatsApp(resolved.cost_summary_html));
                    toast({ title: ok ? "WhatsApp version copied" : "Copy failed" });
                  }}><MessageCircle className="h-4 w-4 mr-1" />Copy WhatsApp Version</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const ok = await copyHtmlToClipboard(htmlToEmail(resolved.cost_summary_html));
                    toast({ title: ok ? "Email version copied" : "Copy failed" });
                  }}><Mail className="h-4 w-4 mr-1" />Copy Email Version</Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No cost summary yet.</div>
            )}
          </Panel>

          {processFlow.length > 0 && (
            <Panel title="Client Process Flow" icon={<ChevronRight className="h-4 w-4" />}>
              <div className="flex flex-wrap items-center gap-2">
                {processFlow.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="rounded-lg border bg-white px-3 py-1.5 text-sm">{i + 1}. {s}</div>
                    {i < processFlow.length - 1 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {(resolved.internal_sop_html || sopRows.length > 0) && (
            <Panel title="Internal SOP" icon={<BookOpen className="h-4 w-4" />}>
              {resolved.internal_sop_html && (
                <div className="prose prose-sm max-w-none mb-3"
                  dangerouslySetInnerHTML={{ __html: resolved.internal_sop_html }} />
              )}
              {sopRows.length > 0 && (
                <div className="space-y-1">
                  {sopRows.map((t) => {
                    const done = mySopDone.data?.has(t.id) ?? false;
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={done} onChange={() => toggleSop(t.id)} />
                        <span className={done ? "line-through text-muted-foreground" : ""}>{t.task_text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Checklist files" icon={<FileText className="h-4 w-4" />}>
            {fileRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No files.</div>
            ) : (
              <div className="space-y-2">
                {fileRows.map((f) => <FileLink key={f.id} f={f} />)}
              </div>
            )}
          </Panel>
          {attRows.length > 0 && (
            <Panel title="Other attachments" icon={<FileText className="h-4 w-4" />}>
              <div className="space-y-2">
                {attRows.map((a) => <AttachLink key={a.id} a={a} />)}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function FileLink({ f }: { f: ChecklistFile }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(f.file_path, 600);
    setLoading(false);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <button onClick={open} className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50">
      <div className="min-w-0 text-left">
        <div className="truncate font-medium">{f.file_name}</div>
        <div className="text-xs text-muted-foreground">v{f.version} · {new Date(f.uploaded_at).toLocaleDateString()}</div>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}
function AttachLink({ a }: { a: Attachment }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(a.file_path, 600);
    setLoading(false);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <button onClick={open} className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50">
      <div className="min-w-0 text-left">
        <div className="truncate font-medium">{a.label || a.file_name}</div>
        <div className="truncate text-xs text-muted-foreground">{a.file_name}</div>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}

function Panel({ title, icon, children, action, accent }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent ? "bg-amber-50/30 border-amber-200" : "bg-white"}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mb-3"><div className="mb-1 text-sm font-medium text-slate-700">{label}</div>{children}</div>;
}
function FilterSelect({ label, value, onChange, options, labelOf, placeholder, disabled, hidden }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  labelOf?: (v: string) => string; placeholder?: string; disabled?: boolean; hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <Field label={label}>
      <select
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? "All"}</option>
        {options.map((o) => <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>)}
      </select>
    </Field>
  );
}
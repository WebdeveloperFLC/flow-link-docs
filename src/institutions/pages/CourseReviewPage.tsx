import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Check, X, Pencil, Upload, Info, Search } from "lucide-react";
import { Link } from "react-router-dom";

type Row = any;
const STATUSES = ["pending_review", "approved", "rejected", "published", "needs_update"];
const MANUAL_STATUSES = ["pending_review", "approved", "rejected", "needs_update"];

const ConfidenceBadge = ({ score }: { score: number | null }) => {
  const s = score ?? 0;
  const cls =
    s >= 80
      ? "bg-success/15 text-success"
      : s >= 50
        ? "bg-yellow-500/15 text-yellow-700"
        : "bg-destructive/15 text-destructive";
  return <Badge className={`${cls} border-0`}>{Math.round(s)}%</Badge>;
};

export default function CourseReviewPage() {
  const [searchParams] = useSearchParams();
  const initialInst = searchParams.get("institutionId") ?? "all";
  const initialStatus = searchParams.get("status") ?? "pending_review";
  const [rows, setRows] = useState<Row[]>([]);
  const [institutions, setInstitutions] = useState<{ id: string; name: string; country_name: string | null }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [instFilter, setInstFilter] = useState<string>(initialInst);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    let q = supabase.from("upi_courses_staging").select("*").order("extracted_at", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("review_status", statusFilter);
    if (instFilter !== "all") q = q.eq("institution_id", instFilter);
    if (levelFilter === "unclassified") q = q.is("program_level_id", null);
    else if (levelFilter !== "all") q = q.eq("program_level_id", levelFilter);
    if (countryFilter !== "all") {
      const matchingIds =
        countryFilter === "unspecified"
          ? institutions.filter((i) => !i.country_name).map((i) => i.id)
          : institutions.filter((i) => i.country_name === countryFilter).map((i) => i.id);
      if (matchingIds.length === 0) {
        setRows([]);
        setSelected(new Set());
        return;
      }
      q = q.in("institution_id", matchingIds);
    }
    const { data } = await q;
    setRows((data ?? []) as Row[]);
    setSelected(new Set());
  };
  const loadAux = async () => {
    const [i, l] = await Promise.all([
      supabase.from("upi_institutions").select("id,name,country_name").order("name"),
      supabase.from("upi_program_levels").select("id,name").order("sort_order"),
    ]);
    const insts = (i.data ?? []) as { id: string; name: string; country_name: string | null }[];
    setInstitutions(insts);
    setLevels((l.data ?? []) as any);
    const uniq = Array.from(new Set(insts.map((r) => r.country_name).filter(Boolean) as string[])).sort();
    setCountries(uniq);
  };
  useEffect(() => {
    loadAux();
  }, []);
  useEffect(() => {
    load();
  }, [statusFilter, instFilter, levelFilter, countryFilter, institutions]);

  const instName = useMemo(() => {
    const m = new Map(institutions.map((i) => [i.id, i.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "—");
  }, [institutions]);
  const instCountry = useMemo(() => {
    const m = new Map(institutions.map((i) => [i.id, i.country_name]));
    return (id: string | null) => (id ? (m.get(id) ?? null) : null);
  }, [institutions]);
  const levelName = useMemo(() => {
    const m = new Map(levels.map((l) => [l.id, l.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "—");
  }, [levels]);

  const visibleRows = useMemo(() => {
    const tokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return rows;
    return rows.filter((r) => {
      const parts: (string | number | null | undefined)[] = [
        r.course_title,
        r.course_description,
        r.campus_name,
        r.city,
        r.state_province,
        r.country_name,
        r.currency,
        r.gpa_requirement,
        r.source_url,
        r.source_identifier,
        r.review_status,
        r.ielts_overall,
        r.toefl_overall,
        r.pte_overall,
        r.duolingo_overall,
        Array.isArray(r.intake_months) ? r.intake_months.join(" ") : "",
        r.is_pgwp_eligible === true ? "yes pgwp eligible" : r.is_pgwp_eligible === false ? "no pgwp" : "",
        instName(r.institution_id),
        instCountry(r.institution_id),
        levelName(r.program_level_id),
      ];
      try {
        parts.push(JSON.stringify(r.metadata ?? {}));
      } catch {}
      const hay = parts
        .filter((v) => v !== null && v !== undefined && v !== "")
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [rows, searchText, instName, instCountry, levelName]);

  const setStatus = async (ids: string[], status: string) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from("upi_courses_staging")
      .update({ review_status: status, reviewed_at: new Date().toISOString() } as any)
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} updated → ${status}`);
    load();
  };

  const publish = async (ids: string[]) => {
    if (!ids.length) return;
    const t = toast.loading(`Publishing ${ids.length} to Course Finder…`);
    const { data, error } = await supabase.functions.invoke("upi-publish-courses", { body: { staging_ids: ids } });
    toast.dismiss(t);
    if (error) return toast.error(`Publish failed: ${error.message}`);
    const res = data as { published?: number; failed?: number; errors?: { error: string }[] };
    if (res?.failed && res.failed > 0) {
      toast.warning(`Published ${res.published ?? 0}, failed ${res.failed}`, {
        description: res.errors?.[0]?.error,
      });
    } else {
      toast.success(`Published ${res?.published ?? 0} to Course Finder`, {
        action: { label: "View", onClick: () => window.open("/courses", "_blank") },
      });
    }
    load();
  };

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === visibleRows.length) setSelected(new Set());
    else setSelected(new Set(visibleRows.map((r) => r.id)));
  };
  const selectedIds = Array.from(selected);

  return (
    <AppLayout>
      <PageHeader title="Course Review" description="Review and publish AI-extracted courses awaiting approval." />
      <div className="p-6 space-y-4">
        {statusFilter === "published" && (
          <Card className="p-4 flex items-center gap-3 bg-success/5 border-success/20">
            <Info className="size-4 text-success" />
            <div className="flex-1 text-sm">
              These programs are <strong>live in Course Finder</strong>. Students can see them on the public catalog.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/courses" target="_blank">
                View in Course Finder <ExternalLink className="size-3 ml-1" />
              </Link>
            </Button>
          </Card>
        )}
        <Card className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-[220px]">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Type anything — title, IELTS, intake, PGWP, campus…"
                className="pl-8"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Institution</Label>
            <Select value={instFilter} onValueChange={setInstFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All institutions</SelectItem>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Program level</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="unclassified">Unclassified</SelectItem>
                {levels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Country</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                <SelectItem value="unspecified">Unspecified</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button size="sm" onClick={() => setStatus(selectedIds, "approved")}>
                <Check className="size-4 mr-1" /> Bulk Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStatus(selectedIds, "rejected")}>
                <X className="size-4 mr-1" /> Bulk Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => publish(selectedIds)}>
                <Upload className="size-4 mr-1" /> Bulk Publish
              </Button>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === visibleRows.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Institution</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Tuition</th>
                  <th className="p-3">Intakes</th>
                  <th className="p-3">IELTS</th>
                  <th className="p-3">PGWP</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Source</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-muted-foreground">
                      {searchText
                        ? `No programs match "${searchText}".`
                        : statusFilter === "published"
                          ? 'Nothing published yet. Approve rows under "approved" status, then click Bulk Publish to push them to Course Finder.'
                          : "No programs match the current filters. Try clearing Country / Level / Status or the search box."}
                    </td>
                  </tr>
                )}
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-accent/30">
                    <td className="p-3">
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </td>
                    <td className="p-3 font-medium">{r.course_title}</td>
                    <td className="p-3">{instName(r.institution_id)}</td>
                    <td className="p-3">{instCountry(r.institution_id) ?? r.country_name ?? "—"}</td>
                    <td className="p-3">{levelName(r.program_level_id)}</td>
                    <td className="p-3 tabular-nums">{r.tuition_fee ? `${r.tuition_fee} ${r.currency ?? ""}` : "—"}</td>
                    <td className="p-3">{Array.isArray(r.intake_months) ? r.intake_months.join(", ") : "—"}</td>
                    <td className="p-3">{r.ielts_overall ?? "—"}</td>
                    <td className="p-3">
                      {r.is_pgwp_eligible === true ? (
                        <Badge className="bg-success/15 text-success border-0">Yes</Badge>
                      ) : r.is_pgwp_eligible === false ? (
                        <Badge variant="secondary">No</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <ConfidenceBadge score={r.confidence_score} />
                    </td>
                    <td className="p-3">
                      {r.source_url ? (
                        <a
                          className="text-primary inline-flex items-center gap-1"
                          href={r.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          link <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setStatus([r.id], "approved")}>
                          <Check className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus([r.id], "rejected")}>
                          <X className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        {r.review_status === "published" && r.published_course_id ? (
                          <Button asChild size="sm" variant="ghost" title="Open in Course Finder">
                            <Link to={`/courses?courseId=${r.published_course_id}`} target="_blank">
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={
                              r.review_status === "approved" ? "Publish to Course Finder" : "Approve this row first"
                            }
                            disabled={r.review_status !== "approved" && r.review_status !== "needs_update"}
                            onClick={() => publish([r.id])}
                          >
                            <Upload className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <EditSheet
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        institutions={institutions}
        levels={levels}
      />
    </AppLayout>
  );
}

function EditSheet({
  row,
  onClose,
  onSaved,
  institutions,
  levels,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
  institutions: { id: string; name: string }[];
  levels: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<Row | null>(null);
  const [metaEntries, setMetaEntries] = useState<{ key: string; value: string }[]>([]);
  useEffect(() => {
    setDraft(row);
    const m = (row?.metadata ?? {}) as Record<string, unknown>;
    setMetaEntries(
      Object.entries(m).map(([k, v]) => ({ key: k, value: typeof v === "string" ? v : JSON.stringify(v) })),
    );
  }, [row?.id]);
  // Depend on row?.id (stable identity) instead of the whole `row` object,
  // so background re-fetches don't overwrite the user's in-progress edits.

  if (!row || !draft) return null;

  const save = async () => {
    const metadata: Record<string, unknown> = {};
    for (const e of metaEntries) {
      if (!e.key.trim()) continue;
      try {
        metadata[e.key] = JSON.parse(e.value);
      } catch {
        metadata[e.key] = e.value;
      }
    }
    const patch: any = { ...draft, metadata };
    delete patch.id;
    delete patch.extracted_at;
    delete patch.updated_at;
    const { error } = await supabase.from("upi_courses_staging").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
    onClose();
  };

  const field = (k: string, label: string, type: string = "text") => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(draft as any)[k] ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            [k]: type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
          })
        }
      />
    </div>
  );

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit course</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Course title</Label>
            <Input
              value={draft.course_title ?? ""}
              onChange={(e) => setDraft({ ...draft, course_title: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={draft.course_description ?? ""}
              onChange={(e) => setDraft({ ...draft, course_description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Institution</Label>
              <Select
                value={draft.institution_id ?? ""}
                onValueChange={(v) => setDraft({ ...draft, institution_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Program level</Label>
              <Select
                value={draft.program_level_id ?? ""}
                onValueChange={(v) => setDraft({ ...draft, program_level_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("campus_name", "Campus")}
            {field("city", "City")}
            {field("country_name", "Country")}
            {field("currency", "Currency")}
            {field("tuition_fee", "Tuition fee", "number")}
            {field("application_fee", "Application fee", "number")}
            {field("duration_value", "Duration", "number")}
            {field("duration_unit", "Duration unit")}
            {field("ielts_overall", "IELTS overall", "number")}
            {field("toefl_overall", "TOEFL", "number")}
            {field("pte_overall", "PTE", "number")}
            {field("duolingo_overall", "Duolingo", "number")}
            {field("gpa_requirement", "GPA req")}
            {field("source_url", "Source URL")}
            <div className="space-y-1">
              <Label className="text-xs">Review status</Label>
              <Select
                value={MANUAL_STATUSES.includes(draft.review_status) ? draft.review_status : "pending_review"}
                onValueChange={(v) => setDraft({ ...draft, review_status: v })}
                disabled={draft.review_status === "published"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  {draft.review_status === "published" && <SelectItem value="published">published (live)</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                To publish, use the Publish button — it pushes to Course Finder.
              </p>
            </div>
            {field("confidence_score", "Confidence", "number")}
            <div className="space-y-1">
              <Label className="text-xs">PGWP eligible</Label>
              <Select
                value={
                  draft.is_pgwp_eligible === null || draft.is_pgwp_eligible === undefined
                    ? "unknown"
                    : String(draft.is_pgwp_eligible)
                }
                onValueChange={(v) => setDraft({ ...draft, is_pgwp_eligible: v === "unknown" ? null : v === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Review notes</Label>
            <Textarea
              rows={2}
              value={draft.review_notes ?? ""}
              onChange={(e) => setDraft({ ...draft, review_notes: e.target.value })}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Custom metadata fields</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMetaEntries([...metaEntries, { key: "", value: "" }])}
              >
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>
            {metaEntries.map((e, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="key"
                  value={e.key}
                  onChange={(ev) => {
                    const n = [...metaEntries];
                    n[i].key = ev.target.value;
                    setMetaEntries(n);
                  }}
                />
                <Input
                  placeholder="value"
                  value={e.value}
                  onChange={(ev) => {
                    const n = [...metaEntries];
                    n[i].value = ev.target.value;
                    setMetaEntries(n);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setMetaEntries(metaEntries.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {metaEntries.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No custom fields. Add any extra attributes the AI extracted or you want to track.
              </p>
            )}
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

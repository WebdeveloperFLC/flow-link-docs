import { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, Trash2, ExternalLink, Check, X, Pencil, Upload, Info, Search, LayoutGrid, LayoutList, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useModulePermission } from "@/hooks/useModulePermission";
import { ViewOnlyNotice } from "../components/ViewOnlyNotice";
import { ImportProgramSheetButton } from "../components/ImportProgramSheetButton";
import { CourseReviewList } from "../components/CourseReviewList";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UpiCourseStaging } from "../types/upi";
import {
  buildCourseDedupKey,
  campusNamesFromRow,
  computeCourseDedupHash,
  normalizeCampusFields,
  resolveCourseDedupLevel,
  rowMatchesCampus,
} from "../lib/courseDedup";
import { normalizeInstitutionName } from "../lib/programSheetImport";

const STATUSES = ["pending_review", "approved", "rejected", "published", "needs_update"];
const MANUAL_STATUSES = ["pending_review", "approved", "rejected", "needs_update"];

const FILTER_DEFAULTS = {
  status: "pending_review",
  institutionId: "all",
  level: "all",
  country: "all",
  campus: "all",
  pgwp: "all",
  confidenceMin: "all",
  sort: "newest",
} as const;

type FilterKey = keyof typeof FILTER_DEFAULTS;

const COLUMN_DEFS = [
  { id: "course", label: "Course", default: true },
  { id: "institution", label: "Institution", default: true },
  { id: "country", label: "Country", default: false },
  { id: "level", label: "Level", default: true },
  { id: "campus", label: "Campus", default: true },
  { id: "duration", label: "Duration", default: true },
  { id: "tuition", label: "Tuition", default: true },
  { id: "intakes", label: "Intakes", default: true },
  { id: "ielts", label: "IELTS", default: true },
  { id: "pte", label: "PTE", default: true },
  { id: "toefl", label: "TOEFL", default: false },
  { id: "duolingo", label: "Duolingo", default: false },
  { id: "pgwp", label: "PGWP", default: true },
  { id: "appFee", label: "App fee", default: false },
  { id: "delivery", label: "Delivery", default: false },
  { id: "status", label: "Status", default: false },
  { id: "confidence", label: "Confidence", default: true },
  { id: "source", label: "Source", default: true },
] as const;

type ColumnId = (typeof COLUMN_DEFS)[number]["id"];
const LS_COLUMNS = "courseReview.visibleColumns";
const LS_VIEW = "courseReview.viewMode";

function loadVisibleColumns(): Set<ColumnId> {
  try {
    const raw = localStorage.getItem(LS_COLUMNS);
    if (raw) return new Set(JSON.parse(raw) as ColumnId[]);
  } catch {}
  return new Set(COLUMN_DEFS.filter((c) => c.default).map((c) => c.id));
}

function loadViewMode(): "table" | "cards" {
  const v = localStorage.getItem(LS_VIEW);
  return v === "cards" ? "cards" : "table";
}

function deliveryMode(r: UpiCourseStaging) {
  const m = r.metadata as Record<string, unknown> | null;
  return String(m?.program_delivery_mode ?? (r.is_online ? "Online" : "")).trim() || "—";
}

function setListFilter(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  key: FilterKey,
  value: string,
) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      if (value === FILTER_DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
      return next;
    },
    { replace: true },
  );
}

type InstitutionOption = {
  id: string;
  name: string;
  country_name: string | null;
  logo_url?: string | null;
};

function filterInstitutionsByCountry(institutions: InstitutionOption[], countryFilter: string) {
  if (countryFilter === "all") return institutions;
  if (countryFilter === "unspecified") return institutions.filter((i) => !i.country_name?.trim());
  return institutions.filter((i) => i.country_name === countryFilter);
}

function setCountryFilter(
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  institutions: InstitutionOption[],
  country: string,
) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      if (country === FILTER_DEFAULTS.country) next.delete("country");
      else next.set("country", country);

      const instId = prev.get("institutionId") ?? FILTER_DEFAULTS.institutionId;
      if (instId !== FILTER_DEFAULTS.institutionId && country !== "all") {
        const inst = institutions.find((i) => i.id === instId);
        const valid =
          country === "unspecified"
            ? !inst?.country_name?.trim()
            : inst?.country_name === country;
        if (!valid) next.delete("institutionId");
      }
      return next;
    },
    { replace: true },
  );
}

export default function CourseReviewPage() {
  const { canEdit } = useModulePermission("institutions");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? FILTER_DEFAULTS.status;
  const instFilter = searchParams.get("institutionId") ?? FILTER_DEFAULTS.institutionId;
  const levelFilter = searchParams.get("level") ?? FILTER_DEFAULTS.level;
  const countryFilter = searchParams.get("country") ?? FILTER_DEFAULTS.country;
  const campusFilter = searchParams.get("campus") ?? FILTER_DEFAULTS.campus;
  const pgwpFilter = searchParams.get("pgwp") ?? FILTER_DEFAULTS.pgwp;
  const confidenceMinFilter = searchParams.get("confidenceMin") ?? FILTER_DEFAULTS.confidenceMin;
  const sortFilter = searchParams.get("sort") ?? FILTER_DEFAULTS.sort;
  const [viewMode, setViewMode] = useState<"table" | "cards">(loadViewMode);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(loadVisibleColumns);
  const [rows, setRows] = useState<UpiCourseStaging[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<UpiCourseStaging | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auxError, setAuxError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const load = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError(null);

    let q = supabase
      .from("upi_courses_staging")
      .select("*")
      .order("extracted_at", { ascending: false });

    if (statusFilter !== "all") q = q.eq("review_status", statusFilter);
    if (instFilter !== "all") {
      q = q.eq("institution_id", instFilter);
    } else if (countryFilter !== "all") {
      const matchingIds = filterInstitutionsByCountry(institutions, countryFilter).map((i) => i.id);
      if (matchingIds.length === 0) {
        if (seq !== loadSeq.current) return;
        setRows([]);
        setSelected(new Set());
        setLoading(false);
        return;
      }
      q = q.in("institution_id", matchingIds);
    }

    if (levelFilter === "unclassified") q = q.is("program_level_id", null);
    else if (levelFilter !== "all") q = q.eq("program_level_id", levelFilter);

    // Institution filter is applied server-side; cap only unscoped lists.
    if (instFilter === "all" && countryFilter === "all") q = q.limit(2000);
    else q = q.limit(5000);

    const { data, error } = await q;
    if (seq !== loadSeq.current) return;

    if (error) {
      const msg = error.message?.trim() || error.details || "Could not load courses";
      setLoadError(msg);
      toast.error(msg);
      setRows([]);
    } else {
      let list = (data ?? []) as UpiCourseStaging[];
      if (instFilter !== "all") {
        list = list.filter((r) => r.institution_id === instFilter);
      }
      setRows(list);
    }
    setSelected(new Set());
    setLoading(false);
  };
  const loadAux = async () => {
    const [i, l] = await Promise.all([
      supabase.from("upi_institutions").select("id,name,country_name,logo_url,website_url").order("name"),
      supabase.from("upi_program_levels").select("id,name").order("sort_order"),
    ]);
    const err = i.error ?? l.error;
    if (err) {
      setAuxError(err.message);
      toast.error(err.message);
      setInstitutions([]);
      setLevels([]);
      setCountries([]);
      return;
    }
    setAuxError(null);
    const insts = (i.data ?? []) as InstitutionOption[];
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

  const institutionsForCountry = useMemo(
    () => filterInstitutionsByCountry(institutions, countryFilter),
    [institutions, countryFilter],
  );

  useEffect(() => {
    if (instFilter === "all" || countryFilter === "all" || institutions.length === 0) return;
    const inst = institutions.find((i) => i.id === instFilter);
    const valid =
      countryFilter === "unspecified"
        ? !inst?.country_name?.trim()
        : inst?.country_name === countryFilter;
    if (!valid) setListFilter(setSearchParams, "institutionId", "all");
  }, [instFilter, countryFilter, institutions, setSearchParams]);

  const campuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      campusNamesFromRow(r).forEach((c) => set.add(c));
    }
    return Array.from(set).sort();
  }, [rows]);

  const toggleColumn = (id: ColumnId, on: boolean) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      localStorage.setItem(LS_COLUMNS, JSON.stringify([...next]));
      return next;
    });
  };

  const setView = (mode: "table" | "cards") => {
    setViewMode(mode);
    localStorage.setItem(LS_VIEW, mode);
  };

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

  const instLogo = useMemo(() => {
    const m = new Map(institutions.map((i) => [i.id, i.logo_url]));
    return (id: string | null) => (id ? (m.get(id) ?? null) : null);
  }, [institutions]);

  const mismatchCount = useMemo(() => {
    return rows.filter((r) => {
      const metaName = String((r.metadata as Record<string, unknown> | null)?.institute_name ?? "").trim();
      if (!metaName) return false;
      return normalizeInstitutionName(metaName) !== normalizeInstitutionName(instName(r.institution_id));
    }).length;
  }, [rows, instName]);

  const visibleRows = useMemo(() => {
    let list = rows;
    if (instFilter !== "all") {
      list = list.filter((r) => r.institution_id === instFilter);
    }
    if (campusFilter !== "all") {
      list = list.filter((r) => rowMatchesCampus(r, campusFilter));
    }
    if (pgwpFilter === "yes") list = list.filter((r) => r.is_pgwp_eligible === true);
    else if (pgwpFilter === "no") list = list.filter((r) => r.is_pgwp_eligible === false);
    else if (pgwpFilter === "unknown") list = list.filter((r) => r.is_pgwp_eligible == null);

    if (confidenceMinFilter !== "all") {
      const min = Number(confidenceMinFilter);
      if (Number.isFinite(min)) list = list.filter((r) => (r.confidence_score ?? 0) >= min);
    }

    const tokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length) {
      list = list.filter((r) => {
        const parts: (string | number | null | undefined)[] = [
          r.course_title,
          r.course_description,
          campusNamesFromRow(r).join(" "),
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
          deliveryMode(r),
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
    }

    const sorted = [...list];
    if (sortFilter === "title") sorted.sort((a, b) => (a.course_title ?? "").localeCompare(b.course_title ?? ""));
    else if (sortFilter === "confidence") sorted.sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0));
    else if (sortFilter === "ielts") sorted.sort((a, b) => (b.ielts_overall ?? 0) - (a.ielts_overall ?? 0));
    else sorted.sort((a, b) => new Date(b.extracted_at).getTime() - new Date(a.extracted_at).getTime());
    return sorted;
  }, [
    rows,
    searchText,
    instName,
    instCountry,
    levelName,
    campusFilter,
    pgwpFilter,
    confidenceMinFilter,
    sortFilter,
    instFilter,
  ]);

  const setStatus = async (ids: string[], status: string) => {
    if (!canEdit) return toast.error("View-only access — cannot update review status");
    if (!ids.length) return;
    const { error, count } = await supabase
      .from("upi_courses_staging")
      .update({ review_status: status, reviewed_at: new Date().toISOString() } as any)
      .in("id", ids)
      .select("id", { count: "exact", head: true });
    if (error) return toast.error(error.message);
    const updated = count ?? ids.length;
    if (updated < ids.length) {
      toast.warning(`Updated ${updated} of ${ids.length} → ${status}`);
    } else {
      toast.success(`${updated} updated → ${status}`);
    }
    load();
  };

  const publish = async (ids: string[]) => {
    if (!canEdit) return toast.error("View-only access — cannot publish courses");
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
        action: { label: "View", onClick: () => window.open("/course-finder", "_blank") },
      });
    }
    load();
  };

  const deleteRows = async (ids: string[]) => {
    if (!canEdit) return toast.error("View-only access — cannot delete courses");
    if (!ids.length) return;
    const targets = rows.filter((r) => ids.includes(r.id));
    const publishedCount = targets.filter((r) => r.review_status === "published").length;
    const label = ids.length === 1 ? "this program" : `${ids.length} programs`;
    const publishedNote =
      publishedCount > 0
        ? ` ${publishedCount} ${publishedCount === 1 ? "is" : "are"} published to Course Finder and will be removed from the review queue only (not from Course Finder).`
        : "";
    if (!window.confirm(`Permanently delete ${label}?${publishedNote} This cannot be undone.`)) return;

    const { error, count } = await supabase
      .from("upi_courses_staging")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) return toast.error(error.message);
    const deleted = count ?? ids.length;
    toast.success(`Deleted ${deleted} program${deleted === 1 ? "" : "s"}`);
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
      <PageHeader
        title="Course Review"
        description="Review, import, and publish programs to Course Finder."
      />
      <div className="p-6 space-y-4">
        {(loadError || auxError) && (
          <Card className="p-4 border-destructive/50 bg-destructive/5 text-sm text-destructive">
            {loadError ?? auxError}
          </Card>
        )}
        {!canEdit && <ViewOnlyNotice label="Institutions (Course Review)" />}
        {mismatchCount > 0 && (
          <Card className="p-4 flex items-start gap-3 border-amber-500/40 bg-amber-500/5">
            <Info className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <strong>{mismatchCount}</strong> program{mismatchCount === 1 ? "" : "s"} still have a sheet/source
              institution name that does not match the assigned institution. Re-import after running the latest DB
              cleanup migration, or edit rows to fix the institution.
            </div>
          </Card>
        )}
        {statusFilter === "published" && (
          <Card className="p-4 flex items-center gap-3 bg-success/5 border-success/20">
            <Info className="size-4 text-success" />
            <div className="flex-1 text-sm">
              These programs are <strong>live in Course Finder</strong>. Students can see them on the public catalog.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/course-finder" target="_blank">
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
            <Select value={statusFilter} onValueChange={(v) => setListFilter(setSearchParams, "status", v)}>
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
            <Select value={instFilter} onValueChange={(v) => setListFilter(setSearchParams, "institutionId", v)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {countryFilter === "all"
                    ? "All institutions"
                    : `All institutions (${countryFilter})`}
                </SelectItem>
                {institutionsForCountry.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Program level</Label>
            <Select value={levelFilter} onValueChange={(v) => setListFilter(setSearchParams, "level", v)}>
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
            <Select value={countryFilter} onValueChange={(v) => setCountryFilter(setSearchParams, institutions, v)}>
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
          <div className="space-y-1">
            <Label className="text-xs">Campus</Label>
            <Select value={campusFilter} onValueChange={(v) => setListFilter(setSearchParams, "campus", v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campuses</SelectItem>
                {campuses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PGWP</Label>
            <Select value={pgwpFilter} onValueChange={(v) => setListFilter(setSearchParams, "pgwp", v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Eligible</SelectItem>
                <SelectItem value="no">Not eligible</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min confidence</Label>
            <Select value={confidenceMinFilter} onValueChange={(v) => setListFilter(setSearchParams, "confidenceMin", v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="50">50%+</SelectItem>
                <SelectItem value="70">70%+</SelectItem>
                <SelectItem value="80">80%+</SelectItem>
                <SelectItem value="90">90%+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sort</Label>
            <Select value={sortFilter} onValueChange={(v) => setListFilter(setSearchParams, "sort", v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="title">Title A–Z</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="ielts">IELTS (high)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-1">
            <Button
              size="icon"
              variant={viewMode === "table" ? "secondary" : "outline"}
              title="Table view"
              onClick={() => setView("table")}
            >
              <LayoutList className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "cards" ? "secondary" : "outline"}
              title="Card view"
              onClick={() => setView("cards")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" title="Choose columns">
                  <SlidersHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMN_DEFS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={visibleColumns.has(c.id)}
                    onCheckedChange={(on) => toggleColumn(c.id, !!on)}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {canEdit && (
            <ImportProgramSheetButton institutions={institutions} canEdit={canEdit} onImported={load} />
          )}
          <div className="flex-1" />
          {canEdit && selected.size > 0 && (
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
              <Button size="sm" variant="destructive" onClick={() => deleteRows(selectedIds)}>
                <Trash2 className="size-4 mr-1" /> Bulk Delete
              </Button>
            </div>
          )}
        </Card>

        <CourseReviewList
          rows={visibleRows}
          loading={loading}
          loadError={loadError}
          searchText={searchText}
          statusFilter={statusFilter}
          viewMode={viewMode}
          visibleColumns={visibleColumns}
          canEdit={canEdit}
          selected={selected}
          instName={instName}
          instCountry={instCountry}
          instLogo={instLogo}
          levelName={levelName}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onApprove={(id) => setStatus([id], "approved")}
          onReject={(id) => setStatus([id], "rejected")}
          onEdit={setEditing}
          onDelete={(id) => deleteRows([id])}
          onPublish={(id) => publish([id])}
        />
      </div>

      <EditSheet
        row={editing}
        canEdit={canEdit}
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
  canEdit,
  onClose,
  onSaved,
  institutions,
  levels,
}: {
  row: UpiCourseStaging | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  institutions: { id: string; name: string }[];
  levels: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<UpiCourseStaging | null>(null);
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
    if (!canEdit) return toast.error("View-only access — cannot save changes");
    const metadata: Record<string, unknown> = {};
    for (const e of metaEntries) {
      if (!e.key.trim()) continue;
      try {
        metadata[e.key] = JSON.parse(e.value);
      } catch {
        metadata[e.key] = e.value;
      }
    }
    const levelName = levels.find((l) => l.id === draft.program_level_id)?.name ?? null;
    const programLevel = resolveCourseDedupLevel(metadata, levelName);
    const campusFields = normalizeCampusFields(draft.campus_name, metadata);
    const dedup_hash = await computeCourseDedupHash(
      buildCourseDedupKey({
        institution_id: draft.institution_id,
        course_title: draft.course_title,
        program_level_id: draft.program_level_id,
        program_level: programLevel,
      }),
    );
    const patch: any = {
      ...draft,
      campus_name: campusFields.campus_name,
      metadata: campusFields.metadata,
      dedup_hash,
    };
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
        disabled={!canEdit}
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
          <SheetTitle>{canEdit ? "Edit course" : "View course"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Course title</Label>
            <Input
              disabled={!canEdit}
              value={draft.course_title ?? ""}
              onChange={(e) => setDraft({ ...draft, course_title: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              disabled={!canEdit}
              rows={3}
              value={draft.course_description ?? ""}
              onChange={(e) => setDraft({ ...draft, course_description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Institution</Label>
              <Select
                disabled={!canEdit}
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
                disabled={!canEdit}
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
            {field("campus_name", "Campuses (comma-separated)")}
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
                disabled={!canEdit || draft.review_status === "published"}
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
                disabled={!canEdit}
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
              disabled={!canEdit}
              rows={2}
              value={draft.review_notes ?? ""}
              onChange={(e) => setDraft({ ...draft, review_notes: e.target.value })}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Custom metadata fields</Label>
              {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMetaEntries([...metaEntries, { key: "", value: "" }])}
              >
                <Plus className="size-3 mr-1" /> Add
              </Button>
              )}
            </div>
            {metaEntries.map((e, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  disabled={!canEdit}
                  placeholder="key"
                  value={e.key}
                  onChange={(ev) => {
                    const n = [...metaEntries];
                    n[i].key = ev.target.value;
                    setMetaEntries(n);
                  }}
                />
                <Input
                  disabled={!canEdit}
                  placeholder="value"
                  value={e.value}
                  onChange={(ev) => {
                    const n = [...metaEntries];
                    n[i].value = ev.target.value;
                    setMetaEntries(n);
                  }}
                />
                {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setMetaEntries(metaEntries.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
                )}
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
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && <Button onClick={save}>Save changes</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Heart, GitCompareArrows, Sparkles, GraduationCap,
  CalendarDays, Award, Briefcase, Building2, BookmarkPlus, X, Star, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AttachCourseToClientDialog } from "@/components/course-finder/AttachCourseToClientDialog";
import { listClientPrograms, shortlistCourseForClient, type ClientProgramStatus } from "@/lib/clientPrograms";
import {
  tuitionSummary,
  admissionSummary,
  intakeSummary,
  aiSummaryFromCourse,
  formatDurationMonths,
  counsellorRatingLabel,
  visaTrendLabel,
} from "@/lib/courseFinderSummaries";
import { OfficialResourcesPanel } from "@/institutions/components/OfficialResourcesPanel";
import { CurrentOpportunitiesPanel } from "@/institutions/components/CurrentOpportunitiesPanel";
import {
  officialResourcesFromCfCourse,
  readInstitutionOfficialResources,
} from "@/institutions/lib/officialResources";
import type { InstitutionOfficialResources } from "@/institutions/types/officialResources";
import type { UpiInstitution } from "@/institutions/types/upi";
import { ExportMenu } from "@/components/export/ExportMenu";
import { useExportDataset } from "@/components/export/useExportDataset";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import {
  COURSE_FINDER_EXPORT_COLUMNS,
  type CourseFinderExportRow,
} from "@/lib/courseFinderExportColumns";

// ---------- Types ----------
type Country = {
  code: string; name: string; flag_emoji: string | null;
  is_pr_friendly: boolean; visa_success_rate: number | null;
};
type University = {
  id: string; name: string; slug: string | null; country_code: string;
  city: string | null; province: string | null; logo_url: string | null;
  cover_url: string | null; ranking: number | null; institution_type: string;
  is_partner: boolean; description: string | null;
  upi_institution_id: string | null;
};
type Course = {
  id: string; university_id: string; name: string; study_level: string;
  field_of_study: string; specialization: string | null; duration_months: number | null;
  intake_months: string[]; intake_year: number | null; tuition_fee: number | null;
  currency: string | null; ielts_overall: number | null; ielts_no_band_less_than: number | null;
  pte_score: number | null; toefl_score: number | null; duolingo_accepted: boolean;
  moi_accepted: boolean; scholarship_available: boolean; coop_available: boolean;
  internship_included: boolean; pr_friendly: boolean; pgwp_eligible: boolean;
  stem_eligible: boolean; visa_success_indicator: string | null; mode: string;
  gpa_min: number | null; backlogs_allowed: number | null; gap_accepted_years: number | null;
  work_experience_required: boolean; applications_open: boolean; employability_score: number | null;
  description: string | null; career_outcomes: string | null;
  scholarship_info: string | null;   pr_visa_notes: string | null;
  apply_url: string | null;
};
type Enriched = Course & { university: University; country: Country };

const STUDY_LEVELS = ["diploma", "undergraduate", "postgraduate", "master", "phd"] as const;
const FIELDS = [
  "Business & Management", "IT & Computer Science", "Engineering",
  "Health & Medicine", "Hospitality & Tourism", "Arts & Humanities",
];
const INTAKES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SORTS = [
  { v: "relevance", l: "Relevance" },
  { v: "tuition_low", l: "Lowest tuition" },
  { v: "ranking", l: "Highest ranking" },
  { v: "intake_early", l: "Earliest intake" },
  { v: "scholarship", l: "Scholarship available" },
] as const;

type Filters = {
  q: string;
  countries: string[];
  levels: string[];
  fields: string[];
  intakes: string[];
  tuitionMax: number;
  ieltsMax: number;
  scholarship: boolean;
  prFriendly: boolean;
  coop: boolean;
  pgwp: boolean;
  stem: boolean;
  openOnly: boolean;
  partnerOnly: boolean;
  publicOnly: boolean;
  sort: string;
};
const DEFAULT_FILTERS: Filters = {
  q: "", countries: [], levels: [], fields: [], intakes: [],
  tuitionMax: 100000, ieltsMax: 9, scholarship: false, prFriendly: false,
  coop: false, pgwp: false, stem: false, openOnly: false, partnerOnly: false, publicOnly: false,
  sort: "relevance",
};

// ---------- Page ----------
const CourseFinder = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get("clientId");
  const [clientContext, setClientContext] = useState<{ id: string; full_name: string } | null>(null);
  const [clientProgramByCourse, setClientProgramByCourse] = useState<Record<string, ClientProgramStatus>>({});
  const [attachCourse, setAttachCourse] = useState<{ id: string; label: string } | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [institutionResourcesById, setInstitutionResourcesById] = useState<
    Record<string, InstitutionOfficialResources>
  >({});

  useEffect(() => {
    (async () => {
      const [c, u, p] = await Promise.all([
        supabase.from("cf_countries").select("*").order("name"),
        supabase.from("cf_universities").select("*"),
        supabase.from("cf_courses").select("*"),
      ]);
      setCountries((c.data ?? []) as Country[]);
      setUniversities((u.data ?? []) as University[]);
      setCourses((p.data ?? []) as Course[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("cf_shortlists").select("course_id").eq("user_id", user.id)
      .then(({ data }) => setShortlist(new Set((data ?? []).map((r) => r.course_id))));
  }, [user]);

  const refreshClientPrograms = useCallback(async () => {
    if (!clientIdParam) {
      setClientContext(null);
      setClientProgramByCourse({});
      return;
    }
    const [{ data: client }, programs] = await Promise.all([
      supabase.from("clients").select("id, full_name").eq("id", clientIdParam).maybeSingle(),
      listClientPrograms(clientIdParam).catch(() => []),
    ]);
    if (client) setClientContext(client as { id: string; full_name: string });
    const map: Record<string, ClientProgramStatus> = {};
    for (const p of programs) map[p.course_id] = p.status;
    setClientProgramByCourse(map);
  }, [clientIdParam]);

  useEffect(() => {
    refreshClientPrograms();
  }, [refreshClientPrograms]);

  const handleAttachCourse = useCallback(
    async (courseId: string, label: string) => {
      if (!user) return;
      if (clientIdParam) {
        try {
          await shortlistCourseForClient(clientIdParam, courseId);
          toast.success(`Added to ${clientContext?.full_name ?? "client"} shortlist`);
          await refreshClientPrograms();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not add program");
        }
        return;
      }
      setAttachCourse({ id: courseId, label });
    },
    [user, clientIdParam, clientContext?.full_name, refreshClientPrograms],
  );

  const enriched: Enriched[] = useMemo(() => {
    const uMap = new Map(universities.map((u) => [u.id, u] as const));
    const cMap = new Map(countries.map((c) => [c.code, c] as const));
    return courses
      .map((c) => {
        const uni = uMap.get(c.university_id);
        if (!uni) return null;
        const country = cMap.get(uni.country_code);
        if (!country) return null;
        return { ...c, university: uni, country } as Enriched;
      })
      .filter(Boolean) as Enriched[];
  }, [courses, universities, countries]);

  const results = useMemo(() => {
    const f = filters;
    let list = enriched.filter((e) => {
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!`${e.name} ${e.university.name} ${e.field_of_study} ${e.specialization ?? ""}`.toLowerCase().includes(q)) return false;
      }
      if (f.countries.length && !f.countries.includes(e.country.code)) return false;
      if (f.levels.length && !f.levels.includes(e.study_level)) return false;
      if (f.fields.length && !f.fields.includes(e.field_of_study)) return false;
      if (f.intakes.length && !e.intake_months.some((i) => f.intakes.includes(i))) return false;
      if (e.tuition_fee != null && e.tuition_fee > f.tuitionMax) return false;
      if (e.ielts_overall != null && e.ielts_overall > f.ieltsMax) return false;
      if (f.scholarship && !e.scholarship_available) return false;
      if (f.prFriendly && !e.pr_friendly) return false;
      if (f.coop && !e.coop_available) return false;
      if (f.pgwp && !e.pgwp_eligible) return false;
      if (f.stem && !e.stem_eligible) return false;
      if (f.openOnly && !e.applications_open) return false;
      if (f.partnerOnly && !e.university.is_partner) return false;
      if (f.publicOnly && e.university.institution_type !== "public") return false;
      return true;
    });
    switch (f.sort) {
      case "tuition_low":
        list = [...list].sort((a, b) => (a.tuition_fee ?? 1e9) - (b.tuition_fee ?? 1e9));
        break;
      case "ranking":
        list = [...list].sort((a, b) => (a.university.ranking ?? 9999) - (b.university.ranking ?? 9999));
        break;
      case "intake_early":
        list = [...list].sort((a, b) => (a.intake_year ?? 9999) - (b.intake_year ?? 9999));
        break;
      case "scholarship":
        list = [...list].sort((a, b) => Number(b.scholarship_available) - Number(a.scholarship_available));
        break;
    }
    return list;
  }, [enriched, filters]);

  const toggleShortlist = async (id: string) => {
    if (!user) { toast.error("Sign in to shortlist courses"); return; }
    if (shortlist.has(id)) {
      await supabase.from("cf_shortlists").delete().eq("user_id", user.id).eq("course_id", id);
      setShortlist((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await supabase.from("cf_shortlists").insert({ user_id: user.id, course_id: id });
      setShortlist((s) => new Set(s).add(id));
      toast.success("Added to shortlist");
    }
  };

  const toggleCompare = (id: string) => {
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= 3) { toast.error("Compare up to 3 courses"); return c; }
      return [...c, id];
    });
  };

  const saveSearch = async () => {
    if (!user) { toast.error("Sign in to save searches"); return; }
    const name = window.prompt("Name this search");
    if (!name) return;
    await supabase.from("cf_saved_searches").insert({ user_id: user.id, name, filters: filters as any });
    toast.success("Search saved");
  };

  const detail = detailId ? enriched.find((e) => e.id === detailId) : null;
  const comparing = compare.map((id) => enriched.find((e) => e.id === id)).filter(Boolean) as Enriched[];

  useEffect(() => {
    const instId = detail?.university.upi_institution_id;
    if (!instId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("upi_institutions").select("*").eq("id", instId).maybeSingle();
      if (!cancelled && data) {
        setInstitutionResourcesById((prev) =>
          prev[instId] ? prev : { ...prev, [instId]: readInstitutionOfficialResources(data as UpiInstitution) },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail?.university.upi_institution_id]);

  const exportRows: CourseFinderExportRow[] = useMemo(
    () =>
      results.map((e) => ({
        ...e,
        institution: e.university.name,
        country: e.country.name,
        city: e.university.city ?? "",
        programUrl: e.apply_url ?? "",
      })),
    [results],
  );

  const exportProps = useExportDataset({
    rows: exportRows,
    selectedIds: compare,
    getRowId: (r) => r.id,
    columns: COURSE_FINDER_EXPORT_COLUMNS,
    filenameBase: "course-finder",
    formats: ["csv", "xlsx"],
  });

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Course Finder</h1>
              <p className="text-xs text-muted-foreground">Discover the right course and university that matches your goals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {clientContext && (
              <Button size="sm" variant="secondary" asChild>
                <Link to={`/clients/${clientContext.id}`}>{clientContext.full_name}</Link>
              </Button>
            )}
            {user ? (
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
            ) : (
              <Link to="/auth"><Button size="sm" variant="outline">Sign in</Button></Link>
            )}
          </div>
        </div>
        {clientContext && (
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
              Shortlisting courses for{" "}
              <Link to={`/clients/${clientContext.id}`} className="font-semibold text-primary hover:underline">
                {clientContext.full_name}
              </Link>
              . Use &quot;Shortlist for client&quot; on each course, then mark final on the client file.
            </div>
          </div>
        )}
        {/* Search bar */}
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-4">
          <Card className="p-4 flex flex-col xl:flex-row xl:flex-wrap gap-3 xl:items-end min-w-0">
            <div className="min-w-0 flex-1 xl:min-w-[240px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search course or keyword</label>
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="MBA, Computer Science, Nursing…"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
            </div>
            <div className="min-w-0 w-full sm:w-auto sm:min-w-[200px] xl:w-[220px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Study destination</label>
              <Select
                value={filters.countries[0] ?? "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, countries: v === "all" ? [] : [v] }))}
              >
                <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag_emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 w-full sm:w-auto sm:min-w-[160px] xl:w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Study level</label>
              <Select
                value={filters.levels[0] ?? "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, levels: v === "all" ? [] : [v] }))}
              >
                <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {STUDY_LEVELS.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="lg" className="gap-2 w-full sm:w-auto shrink-0"><Search className="size-4" /> Search</Button>
          </Card>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-6">
        {/* Filters sidebar */}
        <aside className="min-w-0 lg:sticky lg:top-[180px] lg:self-start">
          <Card className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Refine your search</h2>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >Reset all</button>
            </div>

            <FilterGroup label="Country">
              <div className="flex flex-wrap gap-1.5">
                {countries.map((c) => {
                  const active = filters.countries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => setFilters((f) => ({
                        ...f,
                        countries: active ? f.countries.filter((x) => x !== c.code) : [...f.countries, c.code],
                      }))}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-colors",
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
                      )}
                    >
                      {c.flag_emoji} {c.name}
                    </button>
                  );
                })}
              </div>
            </FilterGroup>

            <FilterGroup label="Study level">
              <div className="space-y-1.5">
                {STUDY_LEVELS.map((l) => (
                  <label key={l} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox
                      checked={filters.levels.includes(l)}
                      onCheckedChange={(v) => setFilters((f) => ({
                        ...f,
                        levels: v ? [...f.levels, l] : f.levels.filter((x) => x !== l),
                      }))}
                    />
                    {l}
                  </label>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Field of study">
              <div className="space-y-1.5">
                {FIELDS.map((fld) => (
                  <label key={fld} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filters.fields.includes(fld)}
                      onCheckedChange={(v) => setFilters((f) => ({
                        ...f,
                        fields: v ? [...f.fields, fld] : f.fields.filter((x) => x !== fld),
                      }))}
                    />
                    {fld}
                  </label>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Intake month">
              <div className="flex flex-wrap gap-1">
                {INTAKES.map((m) => {
                  const active = filters.intakes.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => setFilters((f) => ({
                        ...f,
                        intakes: active ? f.intakes.filter((x) => x !== m) : [...f.intakes, m],
                      }))}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border",
                        active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                      )}
                    >{m}</button>
                  );
                })}
              </div>
            </FilterGroup>

            <FilterGroup label={`Tuition (max): ${filters.tuitionMax.toLocaleString()}`}>
              <Slider
                min={0} max={100000} step={1000}
                value={[filters.tuitionMax]}
                onValueChange={([v]) => setFilters((f) => ({ ...f, tuitionMax: v }))}
              />
            </FilterGroup>

            <FilterGroup label={`IELTS overall (max): ${filters.ieltsMax}`}>
              <Slider
                min={4} max={9} step={0.5}
                value={[filters.ieltsMax]}
                onValueChange={([v]) => setFilters((f) => ({ ...f, ieltsMax: v }))}
              />
            </FilterGroup>

            <FilterGroup label="Quick toggles">
              <div className="space-y-1.5 text-sm">
                <Toggle label="Scholarship available" checked={filters.scholarship} onChange={(v) => setFilters((f) => ({ ...f, scholarship: v }))} />
                <Toggle label="PR-friendly" checked={filters.prFriendly} onChange={(v) => setFilters((f) => ({ ...f, prFriendly: v }))} />
                <Toggle label="Co-op available" checked={filters.coop} onChange={(v) => setFilters((f) => ({ ...f, coop: v }))} />
                <Toggle label="Open applications only" checked={filters.openOnly} onChange={(v) => setFilters((f) => ({ ...f, openOnly: v }))} />
              </div>
            </FilterGroup>

            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setShowAdvanced((s) => !s)}
            >{showAdvanced ? "Hide" : "Show"} advanced filters</button>

            {showAdvanced && (
              <FilterGroup label="Advanced">
                <div className="space-y-1.5 text-sm">
                  <Toggle label="PGWP eligible" checked={filters.pgwp} onChange={(v) => setFilters((f) => ({ ...f, pgwp: v }))} />
                  <Toggle label="STEM eligible" checked={filters.stem} onChange={(v) => setFilters((f) => ({ ...f, stem: v }))} />
                  <Toggle label="Public institutions only" checked={filters.publicOnly} onChange={(v) => setFilters((f) => ({ ...f, publicOnly: v }))} />
                  <Toggle label="Partner institutions only" checked={filters.partnerOnly} onChange={(v) => setFilters((f) => ({ ...f, partnerOnly: v }))} />
                </div>
              </FilterGroup>
            )}

            <Separator />
            <Button variant="outline" className="w-full gap-2" onClick={saveSearch}>
              <BookmarkPlus className="size-4" /> Save search
            </Button>
          </Card>
        </aside>

        {/* Results */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.length}</span> courses found
              </p>
            </div>
            <WorkspaceToolbar>
              <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExportMenu {...exportProps} disabled={loading || results.length === 0} />
              {compare.length > 0 && (
                <Button onClick={() => setShowCompare(true)} className="gap-2">
                  <GitCompareArrows className="size-4" /> Compare ({compare.length})
                </Button>
              )}
            </WorkspaceToolbar>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20 text-muted-foreground">Loading…</div>
          ) : results.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Sparkles className="size-8 mx-auto mb-2 opacity-50" />
              No courses match your filters. Try resetting them.
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((e) => (
                <ResultCard
                  key={e.id}
                  c={e}
                  shortlisted={shortlist.has(e.id)}
                  comparing={compare.includes(e.id)}
                  clientProgramStatus={clientIdParam ? clientProgramByCourse[e.id] : undefined}
                  onShortlist={() => toggleShortlist(e.id)}
                  onCompare={() => toggleCompare(e.id)}
                  onView={() => setDetailId(e.id)}
                  onAttachClient={
                    user
                      ? () =>
                          void handleAttachCourse(
                            e.id,
                            `${e.university.name} — ${e.name}`,
                          )
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {detail && (
            <CourseDetail
              c={detail}
              institutionResources={
                detail.university.upi_institution_id
                  ? institutionResourcesById[detail.university.upi_institution_id]
                  : undefined
              }
              clientProgramStatus={clientIdParam ? clientProgramByCourse[detail.id] : undefined}
              onAttachClient={
                user
                  ? () =>
                      void handleAttachCourse(
                        detail.id,
                        `${detail.university.name} — ${detail.name}`,
                      )
                  : undefined
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {attachCourse && (
        <AttachCourseToClientDialog
          open={!!attachCourse}
          onOpenChange={(o) => !o && setAttachCourse(null)}
          courseId={attachCourse.id}
          courseLabel={attachCourse.label}
          defaultClientId={clientIdParam}
          onAttached={() => refreshClientPrograms()}
        />
      )}

      {/* Compare Modal */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Compare courses</DialogTitle></DialogHeader>
          <CompareTable items={comparing} onRemove={(id) => setCompare((c) => c.filter((x) => x !== id))} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Subcomponents ----------
const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    {children}
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between gap-2 cursor-pointer">
    <span>{label}</span>
    <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
  </label>
);

const ResultCard = ({
  c,
  shortlisted,
  comparing,
  clientProgramStatus,
  onShortlist,
  onCompare,
  onView,
  onAttachClient,
}: {
  c: Enriched;
  shortlisted: boolean;
  comparing: boolean;
  clientProgramStatus?: ClientProgramStatus;
  onShortlist: () => void;
  onCompare: () => void;
  onView: () => void;
  onAttachClient?: () => void;
}) => (
  <Card className="p-4 hover:shadow-md transition-shadow min-w-0 overflow-hidden">
    <div className="flex flex-col sm:flex-row gap-4 min-w-0">
      {/* Logo */}
      <div className="shrink-0 size-16 rounded-lg border bg-background grid place-items-center overflow-hidden">
        {c.university.logo_url ? (
          <img src={c.university.logo_url} alt={c.university.name} className="size-full object-contain p-2" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <Building2 className="size-6 text-muted-foreground" />
        )}
      </div>
      {/* Center */}
      <div className="flex-1 min-w-0 order-2 sm:order-none">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-lg leading-none" title={c.country.name}>{c.country.flag_emoji}</span>
          <span className="text-xs text-muted-foreground">{c.country.name} · {c.university.city}</span>
          {c.university.ranking && (
            <Badge variant="secondary" className="gap-1 text-[10px]"><Star className="size-3" /> #{c.university.ranking}</Badge>
          )}
          {c.university.is_partner && <Badge variant="outline" className="text-[10px]">Partner</Badge>}
        </div>
        <h3 className="font-semibold mt-1 truncate">{c.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{c.university.name}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {c.field_of_study} · {formatDurationMonths(c.duration_months)} · {tuitionSummary(c)}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="outline" className="capitalize text-[10px]">{c.study_level}</Badge>
          <Badge variant="outline" className="text-[10px] gap-1"><CalendarDays className="size-3" />{intakeSummary(c)}</Badge>
          {c.pgwp_eligible && <StatusBadge variant="success" className="text-[10px]">PGWP</StatusBadge>}
          {c.scholarship_available && <StatusBadge variant="warning" className="text-[10px] gap-1"><Award className="size-3" /> Scholarship</StatusBadge>}
          {c.coop_available && <StatusBadge variant="primary" className="text-[10px] gap-1"><Briefcase className="size-3" /> Co-op</StatusBadge>}
          {clientProgramStatus === "shortlisted" && (
            <Badge variant="secondary" className="text-[10px]">On client shortlist</Badge>
          )}
          {clientProgramStatus === "final" && (
            <StatusBadge variant="success" className="text-[10px]">On client file</StatusBadge>
          )}
        </div>
      </div>
      {/* Right */}
      <div className="shrink-0 w-full sm:w-auto sm:min-w-[11rem] lg:min-w-[12rem] flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-between gap-3 order-3 sm:order-none border-t sm:border-t-0 pt-3 sm:pt-0">
        <div className="text-left sm:text-right shrink-0">
          <p className="text-lg font-bold">{tuitionSummary(c)}</p>
          <p className="text-xs text-muted-foreground">tuition summary</p>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1 sm:flex-none sm:w-full max-w-[14rem] sm:max-w-none">
          <Button size="sm" onClick={onView} className="w-full">View details</Button>
          {onAttachClient && clientProgramStatus !== "final" && (
            <Button size="sm" variant="secondary" className="w-full gap-1" onClick={onAttachClient}>
              <UserPlus className="size-3.5 shrink-0" />
              <span className="truncate">{clientProgramStatus === "shortlisted" ? "On shortlist" : "Shortlist for client"}</span>
            </Button>
          )}
          <div className="flex gap-1.5">
            <Button
              size="sm" variant="outline" className="flex-1 gap-1"
              onClick={onShortlist}
              aria-label="My favorites"
              title="My favorites"
            >
              <Heart className={cn("size-3.5", shortlisted && "fill-red-500 text-red-500")} />
            </Button>
            <Button
              size="sm" variant={comparing ? "default" : "outline"}
              className="flex-1 gap-1"
              onClick={onCompare}
              aria-label="Compare"
            >
              <GitCompareArrows className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

const CourseDetail = ({
  c,
  institutionResources,
  clientProgramStatus,
  onAttachClient,
}: {
  c: Enriched;
  institutionResources?: InstitutionOfficialResources;
  clientProgramStatus?: ClientProgramStatus;
  onAttachClient?: () => void;
}) => {
  const aiSummary = aiSummaryFromCourse(c);
  const counsellorNote = counsellorRatingLabel(c);
  const visaTrend = visaTrendLabel(c);
  const officialResources = officialResourcesFromCfCourse(c, institutionResources);
  const institutionId = c.university.upi_institution_id;

  return (
  <>
    <SheetHeader>
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-lg border grid place-items-center overflow-hidden bg-background">
          {c.university.logo_url
            ? <img src={c.university.logo_url} alt="" className="size-full object-contain p-1.5" />
            : <Building2 className="size-5" />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{c.country.flag_emoji} {c.university.name}</p>
          <SheetTitle className="text-left">{c.name}</SheetTitle>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {c.study_level} · {c.field_of_study} · {formatDurationMonths(c.duration_months)}
          </p>
        </div>
      </div>
    </SheetHeader>

    <div className="grid grid-cols-2 gap-3 my-4">
      <DetailStat label="Tuition summary" value={tuitionSummary(c)} />
      <DetailStat label="Admission summary" value={admissionSummary(c)} />
      <DetailStat label="Intakes" value={intakeSummary(c)} />
      <DetailStat label="Institution" value={c.university.name} />
    </div>

    <div className="flex flex-wrap gap-1.5 mb-4">
      {c.pgwp_eligible && <StatusBadge variant="success">PGWP</StatusBadge>}
      {c.coop_available && <StatusBadge variant="primary">Co-op</StatusBadge>}
      {c.scholarship_available && <StatusBadge variant="warning">Scholarship available</StatusBadge>}
      {visaTrend && <Badge variant="outline" className="text-[10px]">{visaTrend}</Badge>}
    </div>

    {aiSummary ? (
      <Section title="Future Link AI summary">
        <p className="text-sm text-muted-foreground">{aiSummary}</p>
      </Section>
    ) : null}

    <Section title="Counsellor rating">
      <p className="text-sm text-muted-foreground">
        {counsellorNote ?? "Not rated — employability score will appear when available."}
      </p>
    </Section>

    <Section title="Internal notes">
      <p className="text-sm text-muted-foreground italic">
        Counsellor notes placeholder — add client-specific guidance in a future sprint.
      </p>
    </Section>

    <Section title="Current offers">
      {institutionId ? (
        <CurrentOpportunitiesPanel
          institutionId={institutionId}
          institutionName={c.university.name}
          fieldOfStudy={c.field_of_study}
          compact
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {c.scholarship_available
            ? "Scholarship flagged — see official scholarship page for details."
            : "No institution link — offers unavailable until catalog is synced."}
        </p>
      )}
    </Section>

    <OfficialResourcesPanel
      resources={officialResources}
      description="Open institution-maintained pages for full program details."
      className="my-4"
    />

    <p className="text-xs text-muted-foreground border-t pt-3">
      Detailed academic requirements, career outcomes, and visa notes live on the official program page — Future Link does not duplicate institution content.
    </p>

    <div className="sticky bottom-0 bg-background border-t pt-3 mt-4 -mx-6 px-6 pb-2 flex flex-col gap-2">
      {onAttachClient && clientProgramStatus !== "final" && (
        <Button className="w-full gap-2" variant="secondary" onClick={onAttachClient}>
          <UserPlus className="size-4" />
          {clientProgramStatus === "shortlisted" ? "On client shortlist — add again?" : "Shortlist for client"}
        </Button>
      )}
      {clientProgramStatus === "final" && (
        <p className="text-xs text-center text-success font-medium">This course is on the client file (final).</p>
      )}
      <div className="flex gap-2">
        {c.apply_url ? (
          <Button className="flex-1" asChild>
            <a href={c.apply_url} target="_blank" rel="noopener noreferrer">
              Apply now
            </a>
          </Button>
        ) : (
          <Button className="flex-1" disabled>
            Apply now
          </Button>
        )}
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/leads/new">Request counseling</Link>
        </Button>
      </div>
    </div>
  </>
  );
};

const DetailStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-3">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold mt-0.5 capitalize">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="my-4">
    <h4 className="font-semibold text-sm mb-2">{title}</h4>
    {children}
  </div>
);

const CompareTable = ({ items, onRemove }: { items: Enriched[]; onRemove: (id: string) => void }) => {
  if (items.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No courses to compare yet.</p>;
  const rows: { label: string; render: (c: Enriched) => React.ReactNode }[] = [
    { label: "Institution", render: (c) => `${c.country.flag_emoji} ${c.university.name}` },
    { label: "Qualification", render: (c) => <span className="capitalize">{c.study_level}</span> },
    { label: "Tuition", render: (c) => tuitionSummary(c) },
    { label: "Admission", render: (c) => admissionSummary(c) },
    { label: "Intakes", render: (c) => intakeSummary(c) },
    { label: "Duration", render: (c) => formatDurationMonths(c.duration_months) },
    { label: "PGWP", render: (c) => (c.pgwp_eligible ? "✓" : "—") },
    { label: "Co-op", render: (c) => (c.coop_available ? "✓" : "—") },
    { label: "Scholarship", render: (c) => (c.scholarship_available ? "✓" : "—") },
  ];
  return (
    <ScrollArea className="max-h-[70vh] w-full">
      <div
        className="grid gap-3 min-w-0 w-full"
        style={{ gridTemplateColumns: `minmax(5rem, 7.5rem) repeat(${items.length}, minmax(0, 1fr))` }}
      >
        <div />
        {items.map((c) => (
          <div key={c.id} className="border rounded-lg p-3 relative">
            <button onClick={() => onRemove(c.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
            <div className="font-semibold text-sm pr-6">{c.name}</div>
          </div>
        ))}
        {rows.map((r) => (
          <Fragment key={r.label}>
            <div className="text-xs text-muted-foreground py-2">{r.label}</div>
            {items.map((c) => (
              <div key={r.label + c.id} className="text-sm py-2 border-b">{r.render(c)}</div>
            ))}
          </Fragment>
        ))}
      </div>
    </ScrollArea>
  );
};

export default CourseFinder;
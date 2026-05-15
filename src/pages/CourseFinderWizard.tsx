import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COUNTRY_LIST } from "@/lib/countries";
import {
  GraduationCap, Filter, Save, RotateCcw, ChevronDown, X, Check,
  Loader2, Users, ExternalLink, MapPin, GraduationCap as Cap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ------------------------------------------------------------------ */
/* Types & defaults                                                   */
/* ------------------------------------------------------------------ */

type FilterState = {
  // Top
  countries: string[];
  states: string[];
  city: string;
  studyArea: string;
  disciplineArea: string;
  programLevel: string;
  courseIntake: string;
  year: string;
  semester: string;
  month: string;
  // English proficiency
  englishProficiency: string;
  englishScore: string;
  // Language eligibility
  languageEligibility: string;
  languageScore: string;
  // Aptitude
  aptitudeEligibility: string;
  aptitudeScore: string;
  // Advanced
  advanced: boolean;
  institute: string;
  instituteCampus: string;
  programAvailability: string;
  programDeliveryMode: string;
  currency: string;
  gradingScale: string;
  gradeScoreMin: string;
  gradeScoreMax: string;
  tuitionMin: string;
  tuitionMax: string;
  gmatWaiver: boolean;
  greWaiver: boolean;
  satWaiver: boolean;
  withoutMaths: boolean;
  stemCourse: boolean;
  conditionalAcceptance: string;
  educationGap: string;
  numberOfBacklogs: string;
  scholarshipAvailable: string;
  countryOfCitizenship: string;
  countryOfResidence: string;
  applicationFeesWaiver: boolean;
  germanLanguageTestWaiver: boolean;
  englishProficiencyTestWaiver: boolean;
  frenchLanguageTestWaiver: boolean;
};

const DEFAULT_FILTERS: FilterState = {
  countries: [], states: [], city: "",
  studyArea: "", disciplineArea: "", programLevel: "",
  courseIntake: "", year: "", semester: "", month: "",
  englishProficiency: "", englishScore: "",
  languageEligibility: "", languageScore: "",
  aptitudeEligibility: "", aptitudeScore: "",
  advanced: false,
  institute: "", instituteCampus: "",
  programAvailability: "", programDeliveryMode: "",
  currency: "", gradingScale: "",
  gradeScoreMin: "", gradeScoreMax: "",
  tuitionMin: "", tuitionMax: "",
  gmatWaiver: false, greWaiver: false, satWaiver: false,
  withoutMaths: false, stemCourse: false,
  conditionalAcceptance: "", educationGap: "",
  numberOfBacklogs: "", scholarshipAvailable: "",
  countryOfCitizenship: "", countryOfResidence: "",
  applicationFeesWaiver: false,
  germanLanguageTestWaiver: false,
  englishProficiencyTestWaiver: false,
  frenchLanguageTestWaiver: false,
};

/* ------------------------------------------------------------------ */
/* Static option lists (placeholders until Odoo is wired)             */
/* ------------------------------------------------------------------ */

const STUDY_AREAS = [
  "Business & Management", "Engineering & Technology", "Computer Science & IT",
  "Health & Medicine", "Arts, Design & Architecture", "Sciences",
  "Social Sciences & Humanities", "Hospitality & Tourism", "Law", "Education",
];
const DISCIPLINE_AREAS = [
  "Accounting", "Finance", "Marketing", "Data Science", "Cybersecurity",
  "Artificial Intelligence", "Mechanical", "Civil", "Electrical",
  "Nursing", "Public Health", "Pharmacy", "Architecture", "Graphic Design",
];
const PROGRAM_LEVELS = [
  "Foundation", "Diploma", "Advanced Diploma", "Bachelor", "Postgraduate Diploma",
  "Master", "MBA", "PhD",
];
const INTAKES = ["Spring", "Summer", "Fall", "Winter"];
const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3", "Trimester 1", "Trimester 2", "Trimester 3"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = (() => {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2, y + 3].map(String);
})();

const ENGLISH_TESTS = ["IELTS", "PTE", "TOEFL iBT", "Duolingo", "Cambridge English", "MOI"];
const LANGUAGES = ["English", "German", "French", "Spanish", "Italian", "Mandarin"];
const APTITUDE_TESTS = ["GRE", "GMAT", "SAT", "ACT", "LSAT", "MCAT"];
const PROGRAM_AVAILABILITY = ["Open", "Closed", "Waitlist", "Coming Soon"];
const DELIVERY_MODES = ["On-campus", "Online", "Hybrid", "Distance Learning"];
const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "AUD", "NZD", "INR", "AED"];
const GRADING_SCALES = ["Percentage", "CGPA (4.0)", "CGPA (10.0)", "GPA", "Letter Grade"];
const TRI_OPTS = ["Yes", "No", "Either"];

/* ------------------------------------------------------------------ */
/* Reusable bits                                                      */
/* ------------------------------------------------------------------ */

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 pt-2 pb-3 border-l-2 border-primary pl-3 -ml-3">
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
      {children}
    </span>
  </div>
);

const Field = ({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5">
    <Label className="text-xs text-muted-foreground pt-2 leading-snug" title={hint}>
      {label}
    </Label>
    <div className="min-w-0">{children}</div>
  </div>
);

function MultiCountrySelect({
  value, onChange, placeholder = "Select…",
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRY_LIST.filter((c) => value.includes(c.code));
  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-muted/40 transition"
          >
            <span className="truncate text-muted-foreground">
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[280px]" align="start">
          <Command>
            <CommandInput placeholder="Search country…" />
            <CommandList>
              <CommandEmpty>No matches</CommandEmpty>
              <CommandGroup>
                {COUNTRY_LIST.map((c) => {
                  const active = value.includes(c.code);
                  return (
                    <CommandItem
                      key={c.code}
                      onSelect={() => onChange(active ? value.filter((x) => x !== c.code) : [...value, c.code])}
                      className="cursor-pointer"
                    >
                      <span className="mr-2 w-4">{active ? <Check className="size-3.5" /> : null}</span>
                      <span className="mr-1.5">{c.flag}</span>{c.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((c) => (
            <Badge key={c.code} variant="secondary" className="gap-1 font-normal">
              {c.flag} {c.name}
              <button
                onClick={() => onChange(value.filter((x) => x !== c.code))}
                className="ml-0.5 hover:text-destructive"
                aria-label={`Remove ${c.name}`}
              ><X className="size-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiTextSelect({
  value, onChange, placeholder = "Add tag…",
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) { setDraft(""); return; }
    onChange([...value, v]); setDraft("");
  };
  return (
    <div className="rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1 min-h-[38px] focus-within:ring-2 focus-within:ring-ring">
      {value.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 font-normal">
          {v}
          <button onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-destructive">
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm py-1 px-1"
        placeholder={value.length ? "" : placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
      />
    </div>
  );
}

function SimpleSelect({
  value, onChange, options, placeholder = "Select…",
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v === "__clear" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {value && <SelectItem value="__clear" className="text-muted-foreground">Clear</SelectItem>}
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function NumberPair({
  min, max, onMin, onMax,
}: { min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="number" inputMode="decimal" value={min} onChange={(e) => onMin(e.target.value)} placeholder="0.00" className="h-9" />
      <span className="text-muted-foreground text-sm">→</span>
      <Input type="number" inputMode="decimal" value={max} onChange={(e) => onMax(e.target.value)} placeholder="0.00" className="h-9" />
    </div>
  );
}

function ToggleField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Saved filters (Postgres-backed)                                    */
/* ------------------------------------------------------------------ */

type SavedFilter = {
  id: string;
  name: string;
  payload: FilterState;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
};

type CourseRow = Record<string, unknown> & { id: number; name?: string; display_name?: string };

function fmtRel(v: unknown): string {
  // Odoo many2one fields come back as [id, "label"]
  if (Array.isArray(v) && v.length === 2 && typeof v[1] === "string") return v[1];
  return "";
}
function fmtMoney(v: unknown, ccy: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  const c = fmtRel(ccy);
  return c ? `${c} ${n.toLocaleString()}` : n.toLocaleString();
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

const CourseFinderWizard = () => {
  const { user, isAdmin } = useAuth();
  const [f, setF] = useState<FilterState>(DEFAULT_FILTERS);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [activeSaved, setActiveSaved] = useState<string>("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [shareNew, setShareNew] = useState(false);

  // Results
  const [results, setResults] = useState<CourseRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchSaved = async () => {
    const { data, error } = await supabase
      .from("course_finder_saved_filters")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setSaved((data ?? []) as unknown as SavedFilter[]);
  };

  useEffect(() => { if (user) fetchSaved(); }, [user?.id]);

  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const activeCount = useMemo(() => {
    let n = 0;
    Object.entries(f).forEach(([k, v]) => {
      if (k === "advanced") return;
      if (Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? v : v !== "") n++;
    });
    return n;
  }, [f]);

  const apply = async (offset = 0, append = false) => {
    setLoading(true); setSearchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("flc-courses", {
        body: { action: "search", filters: f, limit: 50, offset },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Search failed");
      const rows = (data.courses ?? []) as CourseRow[];
      setResults((prev) => (append && prev ? [...prev, ...rows] : rows));
      setTotal(Number(data.total) || rows.length);
      if (!append) {
        toast.success(`${data.total ?? rows.length} course${rows.length === 1 ? "" : "s"} match`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSearchError(msg);
      if (!append) setResults([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setF(DEFAULT_FILTERS); setActiveSaved(""); };

  const saveCurrent = async () => {
    if (!saveName.trim()) { toast.error("Name your filter first"); return; }
    if (!user) { toast.error("Sign in to save filters"); return; }
    const { data, error } = await supabase
      .from("course_finder_saved_filters")
      .insert([{
        owner_id: user.id,
        name: saveName.trim(),
        payload: f as unknown as never,
        is_shared: isAdmin && shareNew,
      }])
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSaved((s) => [data as unknown as SavedFilter, ...s]);
    setActiveSaved((data as { id: string }).id);
    setSaveOpen(false); setSaveName(""); setShareNew(false);
    toast.success("Filter saved");
  };

  const loadFilter = (id: string) => {
    const it = saved.find((s) => s.id === id);
    if (!it) return;
    setF(it.payload); setActiveSaved(id);
    toast.success(`Loaded "${it.name}"`);
  };

  const deleteFilter = async (id: string) => {
    const { error } = await supabase.from("course_finder_saved_filters").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSaved((list) => list.filter((s) => s.id !== id));
    if (activeSaved === id) setActiveSaved("");
  };

  const toggleShare = async (it: SavedFilter) => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("course_finder_saved_filters")
      .update({ is_shared: !it.is_shared })
      .eq("id", it.id).select().single();
    if (error) { toast.error(error.message); return; }
    setSaved((list) => list.map((s) => s.id === it.id ? (data as unknown as SavedFilter) : s));
  };

  const mySaved = saved.filter((s) => s.owner_id === user?.id);
  const sharedSaved = saved.filter((s) => s.is_shared && s.owner_id !== user?.id);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Course Finder</h1>
              <p className="text-xs text-muted-foreground">
                Build a filter — matches Odoo Course Finder wizard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Form */}
        <Card className="p-6 shadow-elev-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b">
            <div className="flex items-center gap-2">
              <Button onClick={() => apply(0, false)} disabled={loading}
                className="gradient-brand text-primary-foreground gap-1.5">
                {loading
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Filter className="size-3.5" />}
                Apply Filter
              </Button>
              <Button variant="outline" onClick={reset} className="gap-1.5">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              {activeCount > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {activeCount} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {saved.length > 0 && (
                <Select value={activeSaved || undefined} onValueChange={loadFilter}>
                  <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Use existing filter" /></SelectTrigger>
                  <SelectContent>
                    {saved.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Popover open={saveOpen} onOpenChange={setSaveOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-1.5">
                    <Save className="size-3.5" /> Save filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px]" align="end">
                  <div className="space-y-2">
                    <Label className="text-xs">Filter name</Label>
                    <Input
                      value={saveName} onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g. Canada Masters CS"
                      onKeyDown={(e) => { if (e.key === "Enter") saveCurrent(); }}
                      autoFocus
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-2 pt-1">
                        <Switch id="cf-share" checked={shareNew} onCheckedChange={setShareNew} />
                        <Label htmlFor="cf-share" className="text-xs cursor-pointer">
                          Share with team
                        </Label>
                      </div>
                    )}
                    <Button size="sm" className="w-full" onClick={() => saveCurrent()}>Save</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Top filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <Field label="Country">
                <MultiCountrySelect value={f.countries} onChange={(v) => set("countries", v)} />
              </Field>
              <Field label="State / Province">
                <MultiTextSelect value={f.states} onChange={(v) => set("states", v)} placeholder="Type a state, press Enter" />
              </Field>
              <Field label="City">
                <Input value={f.city} onChange={(e) => set("city", e.target.value)} className="h-9" placeholder="e.g. Toronto" />
              </Field>
              <Field label="Study Area">
                <SimpleSelect value={f.studyArea} onChange={(v) => set("studyArea", v)} options={STUDY_AREAS} />
              </Field>
              <Field label="Discipline Area">
                <SimpleSelect value={f.disciplineArea} onChange={(v) => set("disciplineArea", v)} options={DISCIPLINE_AREAS} />
              </Field>
              <Field label="Program Level">
                <SimpleSelect value={f.programLevel} onChange={(v) => set("programLevel", v)} options={PROGRAM_LEVELS} />
              </Field>
            </div>
            <div>
              <Field label="Course Intake">
                <SimpleSelect value={f.courseIntake} onChange={(v) => set("courseIntake", v)} options={INTAKES} />
              </Field>
              <Field label="Year">
                <SimpleSelect value={f.year} onChange={(v) => set("year", v)} options={YEARS} />
              </Field>
              <Field label="Semester">
                <SimpleSelect value={f.semester} onChange={(v) => set("semester", v)} options={SEMESTERS} />
              </Field>
              <Field label="Month">
                <SimpleSelect value={f.month} onChange={(v) => set("month", v)} options={MONTHS} />
              </Field>
            </div>
          </div>

          <Separator className="my-6" />
          <SectionHeader>English Proficiency</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Field label="English Proficiency">
              <SimpleSelect value={f.englishProficiency} onChange={(v) => set("englishProficiency", v)} options={ENGLISH_TESTS} />
            </Field>
            <Field label="Score Criteria">
              <Input value={f.englishScore} onChange={(e) => set("englishScore", e.target.value)} className="h-9" placeholder="e.g. 6.5 overall" />
            </Field>
          </div>

          <Separator className="my-6" />
          <SectionHeader>Language Eligibility</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Field label="Language Eligibility">
              <SimpleSelect value={f.languageEligibility} onChange={(v) => set("languageEligibility", v)} options={LANGUAGES} />
            </Field>
            <Field label="Score Criteria">
              <Input value={f.languageScore} onChange={(e) => set("languageScore", e.target.value)} className="h-9" placeholder="e.g. B2" />
            </Field>
          </div>

          <Separator className="my-6" />
          <SectionHeader>Aptitude Eligibility</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Field label="Aptitude Eligibility">
              <SimpleSelect value={f.aptitudeEligibility} onChange={(v) => set("aptitudeEligibility", v)} options={APTITUDE_TESTS} />
            </Field>
            <Field label="Score Criteria">
              <Input value={f.aptitudeScore} onChange={(e) => set("aptitudeScore", e.target.value)} className="h-9" placeholder="e.g. 320" />
            </Field>
          </div>

          <Separator className="my-6" />
          <div className="flex items-center gap-3 mb-2">
            <Switch checked={f.advanced} onCheckedChange={(v) => set("advanced", v)} id="advfilter" />
            <Label htmlFor="advfilter" className="text-sm font-medium cursor-pointer">Advanced Filter</Label>
          </div>

          {f.advanced && (
            <>
              <SectionHeader>Advanced Filter</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <Field label="Institute">
                    <Input value={f.institute} onChange={(e) => set("institute", e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Institute Campus">
                    <Input value={f.instituteCampus} onChange={(e) => set("instituteCampus", e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Program Availability">
                    <SimpleSelect value={f.programAvailability} onChange={(v) => set("programAvailability", v)} options={PROGRAM_AVAILABILITY} />
                  </Field>
                  <Field label="Program Delivery Mode">
                    <SimpleSelect value={f.programDeliveryMode} onChange={(v) => set("programDeliveryMode", v)} options={DELIVERY_MODES} />
                  </Field>
                  <Field label="Currency">
                    <SimpleSelect value={f.currency} onChange={(v) => set("currency", v)} options={CURRENCIES} />
                  </Field>
                  <Field label="Grading Scale">
                    <SimpleSelect value={f.gradingScale} onChange={(v) => set("gradingScale", v)} options={GRADING_SCALES} />
                  </Field>
                  <Field label="Grade Score">
                    <NumberPair min={f.gradeScoreMin} max={f.gradeScoreMax}
                      onMin={(v) => set("gradeScoreMin", v)} onMax={(v) => set("gradeScoreMax", v)} />
                  </Field>
                  <Field label="Tuition Fees Amount">
                    <NumberPair min={f.tuitionMin} max={f.tuitionMax}
                      onMin={(v) => set("tuitionMin", v)} onMax={(v) => set("tuitionMax", v)} />
                  </Field>
                  <ToggleField label="GMAT Waiver" checked={f.gmatWaiver} onChange={(v) => set("gmatWaiver", v)} />
                  <ToggleField label="GRE Waiver" checked={f.greWaiver} onChange={(v) => set("greWaiver", v)} />
                  <ToggleField label="SAT Waiver" checked={f.satWaiver} onChange={(v) => set("satWaiver", v)} />
                  <ToggleField label="Without Maths" checked={f.withoutMaths} onChange={(v) => set("withoutMaths", v)} />
                  <ToggleField label="Stem Course" checked={f.stemCourse} onChange={(v) => set("stemCourse", v)} />
                </div>
                <div>
                  <Field label="Conditional Acceptance">
                    <SimpleSelect value={f.conditionalAcceptance} onChange={(v) => set("conditionalAcceptance", v)} options={TRI_OPTS} />
                  </Field>
                  <Field label="Education Gap">
                    <Input value={f.educationGap} onChange={(e) => set("educationGap", e.target.value)} className="h-9" placeholder="years allowed" />
                  </Field>
                  <Field label="Number Of Backlogs">
                    <Input type="number" value={f.numberOfBacklogs} onChange={(e) => set("numberOfBacklogs", e.target.value)} className="h-9" placeholder="max" />
                  </Field>
                  <Field label="Scholarship Available">
                    <SimpleSelect value={f.scholarshipAvailable} onChange={(v) => set("scholarshipAvailable", v)} options={TRI_OPTS} />
                  </Field>
                  <Field label="Country of Citizenship">
                    <SimpleSelect value={f.countryOfCitizenship} onChange={(v) => set("countryOfCitizenship", v)}
                      options={COUNTRY_LIST.map((c) => c.name)} />
                  </Field>
                  <Field label="Country of Residence">
                    <SimpleSelect value={f.countryOfResidence} onChange={(v) => set("countryOfResidence", v)}
                      options={COUNTRY_LIST.map((c) => c.name)} />
                  </Field>
                  <ToggleField label="Application Fees Waiver" checked={f.applicationFeesWaiver} onChange={(v) => set("applicationFeesWaiver", v)} />
                  <ToggleField label="German Language Test Waiver" checked={f.germanLanguageTestWaiver} onChange={(v) => set("germanLanguageTestWaiver", v)} />
                  <ToggleField label="English Proficiency Test Waiver" checked={f.englishProficiencyTestWaiver} onChange={(v) => set("englishProficiencyTestWaiver", v)} />
                  <ToggleField label="French Language Test Waiver" checked={f.frenchLanguageTestWaiver} onChange={(v) => set("frenchLanguageTestWaiver", v)} />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-[100px] lg:self-start">
          <Card className="p-4 shadow-elev-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Results</div>
              {results !== null && !loading && (
                <Badge variant="secondary" className="font-normal">{total}</Badge>
              )}
            </div>
            {results === null && !loading && (
              <p className="text-xs text-muted-foreground">
                Build a filter and click <em>Apply Filter</em> to search the live course catalogue.
              </p>
            )}
            {loading && results === null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="size-3.5 animate-spin" /> Searching…
              </div>
            )}
            {searchError && (
              <p className="text-xs text-destructive whitespace-pre-wrap">{searchError}</p>
            )}
            {results && results.length === 0 && !loading && !searchError && (
              <p className="text-xs text-muted-foreground">
                No courses match. Try widening the filters.
              </p>
            )}
            {results && results.length > 0 && (
              <ScrollArea className="max-h-[520px] -mx-2 px-2">
                <ul className="space-y-2">
                  {results.map((c) => {
                    const institute = fmtRel((c as Record<string, unknown>).institute_id);
                    const campus = fmtRel((c as Record<string, unknown>).campus_id);
                    const country = fmtRel((c as Record<string, unknown>).country_id);
                    const city = (c as { city?: string }).city || "";
                    const level = fmtRel((c as Record<string, unknown>).program_level_id);
                    const tuition = fmtMoney((c as Record<string, unknown>).tuition_fee,
                      (c as Record<string, unknown>).currency_id);
                    const name = String(
                      (c as { display_name?: string; name?: string }).display_name
                        ?? (c as { name?: string }).name ?? `Course #${c.id}`,
                    );
                    return (
                      <li key={c.id} className="rounded-md border bg-card p-2.5 text-xs space-y-1">
                        <div className="font-medium text-sm leading-tight line-clamp-2" title={name}>
                          {name}
                        </div>
                        {(institute || campus) && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="size-3 shrink-0" />
                            <span className="truncate">{[institute, campus].filter(Boolean).join(" · ")}</span>
                          </div>
                        )}
                        {(country || city) && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{[city, country].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-0.5">
                          {level && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Cap className="size-3" /> {level}
                            </span>
                          )}
                          {tuition && <span className="font-medium">{tuition}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {results.length < total && (
                  <Button variant="outline" size="sm" className="w-full mt-3"
                    onClick={() => apply(results.length, true)} disabled={loading}>
                    {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                    Load more ({total - results.length} remaining)
                  </Button>
                )}
              </ScrollArea>
            )}
          </Card>

          <Card className="p-4 shadow-elev-sm">
            <div className="text-sm font-semibold mb-2">My saved filters</div>
            {mySaved.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                None yet. Click <em>Save filter</em> to keep this configuration.
              </p>
            ) : (
              <ul className="space-y-1">
                {mySaved.map((s) => (
                  <li key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                      activeSaved === s.id && "bg-muted",
                    )}
                  >
                    <button className="text-left truncate flex-1" onClick={() => loadFilter(s.id)}>
                      {s.name}
                      {s.is_shared && (
                        <Badge variant="secondary" className="ml-2 font-normal text-[10px]">shared</Badge>
                      )}
                    </button>
                    {isAdmin && (
                      <button onClick={() => toggleShare(s)}
                        title={s.is_shared ? "Unshare" : "Share with team"}
                        className="text-muted-foreground hover:text-primary">
                        <Users className="size-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteFilter(s.id)}
                      className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {sharedSaved.length > 0 && (
            <Card className="p-4 shadow-elev-sm">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Users className="size-4 text-primary" /> Team filters
              </div>
              <ul className="space-y-1">
                {sharedSaved.map((s) => (
                  <li key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                      activeSaved === s.id && "bg-muted",
                    )}
                  >
                    <button className="text-left truncate flex-1" onClick={() => loadFilter(s.id)}>
                      {s.name}
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteFilter(s.id)}
                        className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CourseFinderWizard;
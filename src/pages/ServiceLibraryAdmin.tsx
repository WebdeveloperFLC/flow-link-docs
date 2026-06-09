import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Loader2, Upload, Download, X, ShieldAlert,
  ListChecks, ChevronRight, ChevronDown, ChevronLeft, Globe, FileText, FileUp, Settings2,
  ClipboardCheck, BookOpen, Coins, Sparkles, History, GraduationCap, ScrollText, Workflow, LayoutList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  buildAcademyNav,
  masterDisplayLabel,
  type AcademyCategoryFilter,
  type AcademyNavGroup,
  type AcademyServiceItem,
} from "@/lib/service-library/academyNav";
import type { CoachingVariant } from "@/lib/service-library/serviceNavClassification";
import { AcademyContentEditor } from "@/components/service-library/admin/AcademyContentEditor";
import { ContentSetupSummary } from "@/components/service-library/admin/ContentSetupSummary";
import { ServiceAcademyNavPanel } from "@/components/service-library/design/ServiceAcademyNavPanel";
import { WorkflowTemplatePanel } from "@/components/templates/WorkflowTemplatePanel";
import { buildServiceCode } from "@/lib/service-library/serviceCodes";
import {
  ALLOWED_SERVICE_LIBRARY_COUNTRIES, ALLOWED_COUNTRY_SET,
  type Master, type Override,
  type FeeItem, type ChecklistFile, type VisaFormFile, type SopTask, type SubmissionItem,
} from "@/lib/serviceLibrary";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

const CATEGORY_OPTIONS = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_financial", label: "Travel & Financial" },
];

const COUNTRY_BOUND_CATEGORIES = new Set(["visa_immigration"]);

const DEFAULT_SUBMISSION_ITEMS = [
  { item_key: "documents_verified", item_label: "Documents verified" },
  { item_key: "checklist_completed", item_label: "Checklist completed" },
  { item_key: "fees_collected", item_label: "Fees collected" },
  { item_key: "client_approval_received", item_label: "Client approval received" },
  { item_key: "quality_review_completed", item_label: "Quality review completed" },
  { item_key: "submission_approved", item_label: "Submission approved" },
];

const ADMIN_CATEGORY_TABS: { key: AdminCategoryTab; label: string; dbKey?: string }[] = [
  { key: "visa", label: "Visa & Immigration" },
  { key: "coaching", label: "Coaching" },
  { key: "allied", label: "Allied", dbKey: "allied_services" },
  { key: "travel", label: "Travel & Financial", dbKey: "travel_financial" },
  { key: "admission", label: "Admissions (legacy)", dbKey: "admission_services" },
];

type AdminCategoryTab = "visa" | "coaching" | "allied" | "travel" | "admission";

function parseAdminCategory(raw: string | null): AdminCategoryTab {
  if (raw === "coaching" || raw === "allied" || raw === "travel" || raw === "admission") return raw;
  return "visa";
}

function parseCoachingVariant(raw: string | null): CoachingVariant | null {
  return raw === "general" || raw === "academic" || raw === "other" ? raw : null;
}

export default function ServiceLibraryAdmin() {
  const { hasRole, isAdmin } = useAuth();
  const canManage = isAdmin || hasRole(["administrator", "documentation"]);
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [showNew, setShowNew] = useState(false);
  const [treeSearch, setTreeSearch] = useState("");
  const [adminCategory, setAdminCategory] = useState<AdminCategoryTab>(() =>
    parseAdminCategory(searchParams.get("cat")),
  );
  const [countryFilter, setCountryFilter] = useState<string>(() => searchParams.get("country") || "ALL");
  const [coachingFamily, setCoachingFamily] = useState<string | null>(() => searchParams.get("family"));
  const [coachingVariant, setCoachingVariant] = useState<CoachingVariant | null>(() =>
    parseCoachingVariant(searchParams.get("variant")),
  );
  const adminTab = searchParams.get("tab");
  const showBinderCatalog = adminTab === "binder-catalog";

  const masters = useQuery({
    queryKey: ["sl-masters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_countries(country)")
        .order("service_category").order("service").order("sub_service");
      if (error) throw error;
      return (data ?? []) as unknown as (Master & { service_library_countries: { country: string }[] })[];
    },
  });

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedId) p.set("id", selectedId);
    if (adminCategory !== "visa") p.set("cat", adminCategory);
    if (adminCategory === "visa" && countryFilter !== "ALL") p.set("country", countryFilter);
    if (coachingFamily) p.set("family", coachingFamily);
    if (coachingVariant) p.set("variant", coachingVariant);
    if (adminTab === "binder-catalog") p.set("tab", "binder-catalog");
    setSearchParams(p, { replace: true });
  }, [selectedId, adminCategory, countryFilter, coachingFamily, coachingVariant, adminTab, setSearchParams]);

  const academyCategory: AcademyCategoryFilter =
    adminCategory === "coaching" ? "coaching" : "visa";

  const { group: navGroup } = useMemo(
    () =>
      adminCategory === "visa" || adminCategory === "coaching"
        ? buildAcademyNav(masters.data ?? [], {
            categoryFilter: academyCategory,
            countryFilter: adminCategory === "visa" ? countryFilter : "ALL",
            coachingFamily,
            coachingVariant,
            search: treeSearch,
            statusFilter: "all",
            includeInactive: true,
          })
        : { group: null, activeCount: 0, reviewCount: 0 },
    [
      masters.data,
      adminCategory,
      academyCategory,
      countryFilter,
      coachingFamily,
      coachingVariant,
      treeSearch,
    ],
  );

  const flatAdminRows = useMemo(() => {
    const tab = ADMIN_CATEGORY_TABS.find((t) => t.key === adminCategory);
    if (!tab?.dbKey) return [];
    const q = treeSearch.trim().toLowerCase();
    return (masters.data ?? [])
      .filter((m) => m.service_category === tab.dbKey)
      .filter((m) => {
        if (!q) return true;
        const label = masterDisplayLabel(m).toLowerCase();
        return (
          label.includes(q) ||
          m.service.toLowerCase().includes(q) ||
          m.sub_service.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => masterDisplayLabel(a).localeCompare(masterDisplayLabel(b)));
  }, [masters.data, adminCategory, treeSearch]);

  const handleAdminCategoryChange = (cat: AdminCategoryTab) => {
    setAdminCategory(cat);
    setSelectedId(null);
    setCoachingFamily(null);
    setCoachingVariant(null);
    if (cat === "visa") setCountryFilter("ALL");
  };

  const handleCountryChange = (c: string) => {
    setCountryFilter(c);
    setSelectedId(null);
  };

  const handleCoachingFamilyChange = (f: string | null) => {
    setCoachingFamily(f);
    setCoachingVariant(null);
    setSelectedId(null);
  };

  const handleCoachingVariantChange = (v: CoachingVariant | null) => {
    setCoachingVariant(v);
    setSelectedId(null);
  };

  const resetToCountries = () => {
    setCountryFilter("ALL");
    setSelectedId(null);
  };

  const resetToCoachingFamilies = () => {
    setCoachingFamily(null);
    setCoachingVariant(null);
    setSelectedId(null);
  };

  const resetToCoachingVariants = () => {
    setCoachingVariant(null);
    setSelectedId(null);
  };

  const selected = useMemo(
    () => (masters.data ?? []).find((m) => m.id === selectedId) ?? null,
    [masters.data, selectedId],
  );

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && masters.data?.some((m) => m.id === id)) {
      setSelectedId(id);
    }
  }, [searchParams, masters.data]);

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1400px] items-center px-4 py-3 md:px-6">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 -ml-1" asChild>
              <Link to="/">
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </header>
        <div className="p-6 grid place-items-center">
          <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="mt-2 text-lg font-semibold">No access</h2>
            <p className="text-sm text-muted-foreground">Admin or Documentation role required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center px-4 py-3 md:px-6">
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ListChecks className="h-4 w-4" /> Service Library Admin
              </div>
              <h1 className="mt-1 text-2xl font-semibold">Canonical service records</h1>
              <p className="text-sm text-muted-foreground">
                Same flow as counselor Service Library: country → all visa & immigration services in one list.
                Admissions workflow rows stay under Admissions (legacy).
              </p>
            </div>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New record
            </Button>
            <Button variant="outline" asChild>
              <Link to="/service-library-admin?tab=binder-catalog">
                <Workflow className="h-4 w-4 mr-1" /> All binders
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-4 rounded-2xl border bg-white p-3 shadow-sm max-h-[80vh] overflow-auto">
            <div className="mb-2 px-1 space-y-2">
              <div className="flex flex-col gap-1">
                {ADMIN_CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleAdminCategoryChange(tab.key)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      adminCategory === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Input
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="Search service or sub-service…"
                className="h-8 text-sm"
              />
              {adminCategory === "visa" && countryFilter !== "ALL" && (
                <div className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">
                  {countryFilter} · Visa & Immigration
                </div>
              )}
              {adminCategory === "visa" && countryFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={resetToCountries}
                  className="w-full text-left px-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  ← All countries
                </button>
              )}
            </div>

            {masters.isLoading && <Loader2 className="h-4 w-4 animate-spin mx-2" />}

            {!masters.isLoading && (adminCategory === "visa" || adminCategory === "coaching") && navGroup && (
              <AdminNavTree
                group={navGroup}
                adminCategory={adminCategory}
                countryFilter={countryFilter}
                coachingFamily={coachingFamily}
                coachingVariant={coachingVariant}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCountry={handleCountryChange}
                onCoachingFamily={handleCoachingFamilyChange}
                onCoachingVariant={handleCoachingVariantChange}
                resetToCountries={resetToCountries}
                resetToCoachingFamilies={resetToCoachingFamilies}
                resetToCoachingVariants={resetToCoachingVariants}
              />
            )}

            {!masters.isLoading &&
              (adminCategory === "visa" || adminCategory === "coaching") &&
              !navGroup && (
                <div className="p-3 text-sm text-muted-foreground">No records match.</div>
              )}

            {!masters.isLoading && (adminCategory === "allied" || adminCategory === "travel" || adminCategory === "admission") && (
              <ul className="space-y-0.5">
                {flatAdminRows.length === 0 && (
                  <li className="p-3 text-sm text-muted-foreground">No records in this category.</li>
                )}
                {flatAdminRows.map((m) => (
                  <AdminRecordButton
                    key={m.id}
                    id={m.id}
                    label={masterDisplayLabel(m)}
                    selected={selectedId === m.id}
                    inactive={!m.is_active}
                    onSelect={setSelectedId}
                  />
                ))}
              </ul>
            )}
          </aside>

          <section className="lg:col-span-8 min-h-[60vh]">
            {showBinderCatalog ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <WorkflowTemplatePanel />
              </div>
            ) : selected ? (
              <MasterDetail
                key={selected.id}
                master={selected}
                onChanged={() => qc.invalidateQueries({ queryKey: ["sl-masters"] })}
                onDeleted={() => {
                  setSelectedId(null);
                  qc.invalidateQueries({ queryKey: ["sl-masters"] });
                }}
              />
            ) : (adminCategory === "visa" || adminCategory === "coaching") && navGroup ? (
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden min-h-[60vh] flex flex-col">
                <ServiceAcademyNavPanel
                  group={navGroup}
                  categoryFilter={academyCategory}
                  country={countryFilter}
                  coachingFamily={coachingFamily}
                  coachingVariant={coachingVariant}
                  onCountry={handleCountryChange}
                  onCoachingFamily={handleCoachingFamilyChange}
                  onCoachingVariant={handleCoachingVariantChange}
                  onSelectService={setSelectedId}
                />
              </div>
            ) : (
              <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                Select a record on the left, or pick a country above.
              </div>
            )}
          </section>
        </div>
      </div>

      {showNew && (
        <NewMasterDialog
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            setSelectedId(id);
            qc.invalidateQueries({ queryKey: ["sl-masters"] });
          }}
        />
      )}
      </div>
    </div>
  );
}

function AdminRecordButton({
  id,
  label,
  selected,
  inactive,
  needsReview,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  inactive?: boolean;
  needsReview?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
        selected ? "bg-primary/10 text-primary font-medium" : ""
      } ${inactive ? "opacity-60" : ""}`}
    >
      <span className="flex-1 truncate">{label}</span>
      {inactive && (
        <Badge variant="outline" className="text-[10px] shrink-0">
          Inactive
        </Badge>
      )}
      {needsReview && <span className="size-1.5 rounded-full bg-amber-400 shrink-0" title="Needs review" />}
    </button>
  );
}

function AdminNavTree({
  group,
  adminCategory,
  countryFilter,
  coachingFamily,
  coachingVariant,
  selectedId,
  onSelect,
  onCountry,
  onCoachingFamily,
  onCoachingVariant,
  resetToCountries,
  resetToCoachingFamilies,
  resetToCoachingVariants,
}: {
  group: AcademyNavGroup;
  adminCategory: AdminCategoryTab;
  countryFilter: string;
  coachingFamily: string | null;
  coachingVariant: CoachingVariant | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCountry: (c: string) => void;
  onCoachingFamily: (f: string | null) => void;
  onCoachingVariant: (v: CoachingVariant | null) => void;
  resetToCountries: () => void;
  resetToCoachingFamilies: () => void;
  resetToCoachingVariants: () => void;
}) {
  const step = group.step;

  const renderItem = (item: AcademyServiceItem) => (
    <AdminRecordButton
      key={item.id}
      id={item.id}
      label={item.label}
      selected={selectedId === item.id}
      inactive={item.inactive}
      needsReview={item.needsReview}
      onSelect={onSelect}
    />
  );

  if (step === "countries" && group.countryPickers) {
    return (
      <div className="space-y-1">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Country
        </p>
        <ul className="space-y-0.5">
          {group.countryPickers.map((picker) => (
            <li key={picker.country}>
              <button
                type="button"
                onClick={() => onCountry(picker.country)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
                  countryFilter === picker.country ? "bg-primary/10 text-primary font-medium" : ""
                }`}
              >
                <span className="flex-1 truncate">{picker.country}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{picker.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "coaching_families" && group.coachingFamilies) {
    return (
      <div className="space-y-1">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Step 1 — Program
        </p>
        <ul className="space-y-0.5">
          {group.coachingFamilies.map((family) => (
            <li key={family.key}>
              <button
                type="button"
                onClick={() => onCoachingFamily(family.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
                  coachingFamily === family.key ? "bg-primary/10 text-primary font-medium" : ""
                }`}
              >
                <span className="flex-1 truncate">{family.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{family.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "coaching_variants" && group.coachingVariants) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={resetToCoachingFamilies}
          className="mb-1 w-full text-left px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          ← Programs
        </button>
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Step 2 — {coachingFamily}
        </p>
        <ul className="space-y-0.5">
          {group.coachingVariants.map((variant) => (
            <li key={variant.key}>
              <button
                type="button"
                onClick={() => onCoachingVariant(variant.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
                  coachingVariant === variant.key ? "bg-primary/10 text-primary font-medium" : ""
                }`}
              >
                <span className="flex-1 truncate">{variant.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{variant.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "services" && group.items) {
    return (
      <ul className="space-y-0.5">
        {adminCategory === "visa" && (
          <button
            type="button"
            onClick={resetToCountries}
            className="mb-1 w-full text-left px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            ← All countries
          </button>
        )}
        {adminCategory === "coaching" && coachingVariant && (
          <button
            type="button"
            onClick={resetToCoachingVariants}
            className="mb-1 w-full text-left px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            ← Format
          </button>
        )}
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {adminCategory === "visa"
            ? `${countryFilter} · Visa & Immigration`
            : "Services"}
        </p>
        {group.items.map((item) => renderItem(item))}
      </ul>
    );
  }

  return null;
}

function NewMasterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const needsCountry = COUNTRY_BOUND_CATEGORIES.has(category);
    if (!category || !subService.trim() || (!needsCountry && !service.trim())) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    if (needsCountry && !country) {
      toast({ title: "Pick a country", variant: "destructive" });
      return;
    }
    setSaving(true);
    const serviceField =
      needsCountry && country ? country : service.trim();
    const subField = subService.trim();
    const displayName =
      needsCountry && country ? `${country} – ${subField}` : subField;
    const { data, error } = await supabase
      .from("service_library")
      .insert({
        service_category: category,
        service: serviceField,
        sub_service: subField,
        is_active: true,
        academy_metadata: {
          displayName,
          shortDescription: `${country ? `${country} · ` : ""}${subField}`,
          reviewStatus: "active",
        },
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    if (needsCountry) {
      const { error: cErr } = await supabase
        .from("service_library_countries")
        .insert({ library_id: data!.id, country });
      if (cErr) {
        setSaving(false);
        toast({ title: "Country link failed", description: cErr.message, variant: "destructive" });
        return;
      }
    }
    // seed default submission checklist items
    await supabase.from("service_library_submission_checklist").insert(
      DEFAULT_SUBMISSION_ITEMS.map((x, i) => ({
        library_id: data!.id,
        item_key: x.item_key,
        item_label: x.item_label,
        is_mandatory: true,
        sort_order: i + 1,
      })),
    );
    setSaving(false);
    onCreated(data!.id);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service record</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Service Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {COUNTRY_BOUND_CATEGORIES.has(category) && (
            <div>
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Choose country" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {COUNTRY_BOUND_CATEGORIES.has(category) ? (
            <div>
              <Label>Visa / service type</Label>
              <Input
                value={subService}
                onChange={(e) => setSubService(e.target.value)}
                placeholder="e.g. Work & Holiday Visa (Subclass 417)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Country ({country || "pick above"}) is saved as the service field — same as canonical records.
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label>Service</Label>
                <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. IELTS" />
              </div>
              <div>
                <Label>Sub-service</Label>
                <Input value={subService} onChange={(e) => setSubService(e.target.value)} placeholder="e.g. Academic" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BinderTab({
  master,
}: {
  master: Master & { service_library_countries?: { country: string }[] };
}) {
  const country =
    master.service_category === "visa_immigration"
      ? master.service_library_countries?.[0]?.country ?? master.service
      : null;
  const serviceCode = buildServiceCode(master.id, country);

  return (
    <WorkflowTemplatePanel
      compact
      libraryId={master.id}
      country={country}
      defaultCountry={country ?? ""}
      defaultCategory={serviceCode}
      title="Document binder"
      description="Client document collection structure for this service. Used when assigning workflow templates to clients."
    />
  );
}

function MasterDetail({
  master, onChanged, onDeleted,
}: { master: Master & { service_library_countries?: { country: string }[] }; onChanged: () => void; onDeleted: () => void }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {CATEGORY_OPTIONS.find((c) => c.key === master.service_category)?.label ?? master.service_category}
          </div>
          <h2 className="text-lg font-semibold">{masterDisplayLabel(master)}</h2>
          <ContentSetupSummary master={master} compact />
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={async () => {
            if (!confirm("Delete this record and all its data?")) return;
            const { error } = await supabase.from("service_library").delete().eq("id", master.id);
            if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
            toast({ title: "Deleted" });
            onDeleted();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </header>

      <Tabs defaultValue="content" className="p-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Settings2 className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="content"><GraduationCap className="h-3.5 w-3.5 mr-1" />Service content</TabsTrigger>
          <TabsTrigger value="countries"><Globe className="h-3.5 w-3.5 mr-1" />Countries</TabsTrigger>
          <TabsTrigger value="checklist"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Checklist</TabsTrigger>
          <TabsTrigger value="binder"><Workflow className="h-3.5 w-3.5 mr-1" />Document binder</TabsTrigger>
          <TabsTrigger value="visaforms"><ScrollText className="h-3.5 w-3.5 mr-1" />Visa forms</TabsTrigger>
          <TabsTrigger value="submission"><ListChecks className="h-3.5 w-3.5 mr-1" />Submission</TabsTrigger>
          <TabsTrigger value="quickguide"><Sparkles className="h-3.5 w-3.5 mr-1" />Quick Guide</TabsTrigger>
          <TabsTrigger value="fees"><Coins className="h-3.5 w-3.5 mr-1" />Fees</TabsTrigger>
          <TabsTrigger value="packages"><LayoutList className="h-3.5 w-3.5 mr-1" />Lead form packages</TabsTrigger>
          <TabsTrigger value="cost"><FileText className="h-3.5 w-3.5 mr-1" />Cost Summary</TabsTrigger>
          <TabsTrigger value="process"><ChevronRight className="h-3.5 w-3.5 mr-1" />Process Flow</TabsTrigger>
          <TabsTrigger value="sop"><BookOpen className="h-3.5 w-3.5 mr-1" />Internal SOP</TabsTrigger>
          <TabsTrigger value="overrides"><Globe className="h-3.5 w-3.5 mr-1" />Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="content">
          <AcademyContentEditor master={master} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="quickguide"><QuickGuideTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="countries"><CountriesTab master={master} /></TabsContent>
        <TabsContent value="checklist"><ChecklistTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="binder">
          <BinderTab master={master} />
        </TabsContent>
        <TabsContent value="visaforms"><VisaFormsTab master={master} /></TabsContent>
        <TabsContent value="submission"><SubmissionTab master={master} /></TabsContent>
        <TabsContent value="fees"><FeesTab master={master} /></TabsContent>
        <TabsContent value="packages"><PackagesTab master={master} /></TabsContent>
        <TabsContent value="cost"><CostSummaryTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="process"><ProcessFlowTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="sop"><InternalSopTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="overrides"><OverridesTab master={master} /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({
  master,
  onChanged,
}: {
  master: Master & { service_library_countries?: { country: string }[] };
  onChanged: () => void;
}) {
  const [order, setOrder] = useState(master.display_order);
  const [active, setActive] = useState(master.is_active);
  const save = async () => {
    const { error } = await supabase
      .from("service_library")
      .update({ display_order: order, is_active: active })
      .eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <ContentSetupSummary master={master} />
      <div className="space-y-3 rounded-xl border p-4">
        <h3 className="text-sm font-semibold">Record settings</h3>
        <div>
          <Label>Display order</Label>
          <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium">Active</div>
            <div className="text-xs text-muted-foreground">Inactive records are hidden from counselor view.</div>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <Button onClick={save}>Save</Button>
      </div>
    </div>
  );
}

function QuickGuideTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const [v, setV] = useState({
    quick_guide_what_to_do: master.quick_guide_what_to_do ?? "",
    quick_guide_common_mistakes: master.quick_guide_common_mistakes ?? "",
    quick_guide_escalation_rules: master.quick_guide_escalation_rules ?? "",
    quick_guide_important_reminders: master.quick_guide_important_reminders ?? "",
  });
  const save = async () => {
    const { error } = await supabase.from("service_library").update(v).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[
        ["quick_guide_what_to_do", "What to do"],
        ["quick_guide_common_mistakes", "Common mistakes"],
        ["quick_guide_escalation_rules", "Escalation rules"],
        ["quick_guide_important_reminders", "Important reminders"],
      ].map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          <Textarea
            rows={5}
            value={(v as Record<string, string>)[key]}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <Button onClick={save}>Save Quick Guide</Button>
      </div>
    </div>
  );
}

function CountriesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_countries")
        .select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });
  const assigned = new Set(rows);

  const toggle = async (country: string) => {
    if (assigned.has(country)) {
      await supabase.from("service_library_countries").delete()
        .eq("library_id", master.id).eq("country", country);
    } else {
      const { error } = await supabase.from("service_library_countries")
        .insert({ library_id: master.id, country });
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    qc.invalidateQueries({ queryKey: ["sl-countries", master.id] });
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Select the countries this record applies to. Only the approved {ALLOWED_SERVICE_LIBRARY_COUNTRIES.length}-country allow-list is shown.
      </p>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="flex flex-wrap gap-2">
          {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                assigned.has(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(master.checklist_text ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadCountry, setUploadCountry] = useState<string>("");
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const files = useQuery({
    queryKey: ["sl-cfiles", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_checklist_files").select("*")
        .eq("library_id", master.id)
        .order("file_name").order("version", { ascending: false });
      return (data ?? []) as unknown as ChecklistFile[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, ChecklistFile[]> = {};
    for (const f of files.data ?? []) {
      const key = `${f.country ?? "ALL"}::${f.file_name}`;
      (out[key] ??= []).push(f);
    }
    return out;
  }, [files.data]);

  const saveText = async () => {
    const { error } = await supabase.from("service_library").update({ checklist_text: text }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };

  const upload = async (file: File) => {
    setUploading(true);
    const country = uploadCountry || null;
    // determine version: max version for (library, country, file_name) + 1
    const matching = (files.data ?? []).filter(
      (f) => f.file_name === file.name && (f.country ?? null) === country,
    );
    const nextVersion = matching.length ? Math.max(...matching.map((m) => m.version)) + 1 : 1;
    const path = `checklist/${master.id}/${nextVersion}-${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("service-library-files").upload(path, file);
    if (up.error) {
      setUploading(false);
      return toast({ title: "Upload failed", description: up.error.message, variant: "destructive" });
    }
    // flip previous to is_current=false
    if (matching.length) {
      await supabase.from("service_library_checklist_files")
        .update({ is_current: false })
        .in("id", matching.map((m) => m.id));
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("service_library_checklist_files").insert({
      library_id: master.id, country,
      file_name: file.name, file_path: path, mime_type: file.type, size_bytes: file.size,
      version: nextVersion, is_current: true, uploaded_by: u.user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Uploaded" });
    qc.invalidateQueries({ queryKey: ["sl-cfiles", master.id] });
  };

  const remove = async (f: ChecklistFile) => {
    if (!confirm(`Delete ${f.file_name} v${f.version}?`)) return;
    await supabase.storage.from("service-library-files").remove([f.file_path]);
    await supabase.from("service_library_checklist_files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["sl-cfiles", master.id] });
  };

  const download = async (f: ChecklistFile) => {
    if (f.file_path.startsWith("/specimens/")) {
      window.open(f.file_path, "_blank", "noopener");
      return;
    }
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(f.file_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Checklist text (default)</Label>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2">
          <Button onClick={saveText}>Save checklist text</Button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-medium">Checklist files</h3>
          <div className="flex items-center gap-2">
            <Select value={uploadCountry || "__all"} onValueChange={(v) => setUploadCountry(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All countries</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
              <input type="file" hidden accept=".pdf,.html,.htm,.doc,.docx,.xls,.xlsx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
              />
            </label>
          </div>
        </div>

        {files.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!files.isLoading && (files.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">No files yet.</div>
        )}
        <div className="space-y-2">
          {Object.entries(grouped).map(([key, versions]) => {
            const current = versions.find((v) => v.is_current) ?? versions[0];
            const history = versions.filter((v) => v.id !== current.id);
            return (
              <div key={key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{current.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      v{current.version} · {current.country ?? "All countries"} · uploaded {new Date(current.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => download(current)}><Download className="h-4 w-4" /></Button>
                    {history.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setShowHistory(showHistory === key ? null : key)}>
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(current)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {showHistory === key && history.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span>v{h.version} · {new Date(h.uploaded_at).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => download(h)}><Download className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(h)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VisaFormsTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formMime, setFormMime] = useState("application/pdf");

  const forms = useQuery({
    queryKey: ["sl-vforms", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_visa_form_files" as "service_library_checklist_files")
        .select("*")
        .eq("library_id", master.id)
        .order("sort_order")
        .order("version", { ascending: false });
      return (data ?? []) as unknown as VisaFormFile[];
    },
  });

  const current = (forms.data ?? []).filter((f) => f.is_current).sort((a, b) => a.sort_order - b.sort_order);

  const openForm = (f: VisaFormFile) => {
    if (f.file_path.startsWith("/specimens/") || /^https?:\/\//i.test(f.file_path)) {
      window.open(f.file_path, "_blank", "noopener");
      return;
    }
    supabase.storage.from("service-library-files").createSignedUrl(f.file_path, 600).then(({ data }) => {
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    });
  };

  const addForm = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      return toast({ title: "Title and URL required", variant: "destructive" });
    }
    const nextSort = current.length ? Math.max(...current.map((f) => f.sort_order)) + 1 : 1;
    const { error } = await supabase
      .from("service_library_visa_form_files" as "service_library_checklist_files")
      .insert({
        library_id: master.id,
        form_code: formCode.trim() || null,
        file_name: formTitle.trim(),
        file_path: formUrl.trim(),
        mime_type: formMime,
        sort_order: nextSort,
        version: 1,
        is_current: true,
        notes: "Added via Service Library Admin",
      } as never);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Form added" });
    setAdding(false);
    setFormCode("");
    setFormTitle("");
    setFormUrl("");
    qc.invalidateQueries({ queryKey: ["sl-vforms", master.id] });
  };

  const remove = async (f: VisaFormFile) => {
    if (!confirm(`Remove ${f.form_code ?? f.file_name}?`)) return;
    await supabase.from("service_library_visa_form_files" as "service_library_checklist_files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["sl-vforms", master.id] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Original visa forms</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official PDFs and online application portals. Run seed SQL once for all 36 services, or add links here.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add form
          </Button>
        </div>

        {forms.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!forms.isLoading && current.length === 0 && (
          <div className="text-sm text-muted-foreground">No forms linked yet.</div>
        )}
        <div className="space-y-2">
          {current.map((f) => (
            <div key={f.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {f.form_code && <Badge variant="secondary" className="text-[10px] font-mono">{f.form_code}</Badge>}
                  <span className="font-medium text-sm truncate">{f.file_name}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{f.file_path}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openForm(f)}><Download className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add official form link</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Form code (optional)</Label>
              <Input placeholder="e.g. IMM 1294, DS-160" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
            </div>
            <div>
              <Label>Title</Label>
              <Input placeholder="Application for Study Permit…" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div>
              <Label>Official URL</Label>
              <Input placeholder="https://…" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formMime} onValueChange={setFormMime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="application/pdf">PDF download</SelectItem>
                  <SelectItem value="text/html">Online portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addForm}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmissionTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["sl-sub", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_submission_checklist")
        .select("*").eq("library_id", master.id).order("sort_order");
      return (data ?? []) as unknown as SubmissionItem[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const update = async (id: string, patch: Partial<SubmissionItem>) => {
    await supabase.from("service_library_submission_checklist").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    await supabase.from("service_library_submission_checklist").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };
  const add = async () => {
    const lbl = prompt("Item label");
    if (!lbl) return;
    const key = lbl.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_" + Date.now();
    const nextOrder = ((items.data ?? []).reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    await supabase.from("service_library_submission_checklist").insert({
      library_id: master.id, item_key: key, item_label: lbl, is_mandatory: true, sort_order: nextOrder,
    });
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Items counselors must check before submission.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add item</Button>
      </div>
      <div className="space-y-2">
        {(items.data ?? []).map((it) => (
          <div key={it.id} className="rounded-lg border p-3 grid gap-2 md:grid-cols-[1fr_180px_120px_120px_40px] md:items-center">
            <Input
              value={it.item_label}
              onChange={(e) => update(it.id, { item_label: e.target.value })}
              onBlur={(e) => update(it.id, { item_label: e.target.value })}
            />
            <Select value={it.country ?? "__all"} onValueChange={(v) => update(it.id, { country: v === "__all" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All countries</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={it.is_mandatory} onCheckedChange={(v) => update(it.id, { is_mandatory: v })} />
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={it.is_active} onCheckedChange={(v) => update(it.id, { is_active: v })} />
              Active
            </label>
            <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

type PickerVariant = {
  id: string;
  library_id: string;
  country: string;
  variant_key: string;
  picker_label: string;
  group_label: string;
  fee_inr: number;
  fee_cad: number;
  govt_fee_inr: number | null;
  govt_fee_cad: number | null;
  display_order: number;
  is_active: boolean;
};

function PackagesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const variants = useQuery({
    queryKey: ["sl-packages", master.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library_picker_variants")
        .select("*")
        .eq("library_id", master.id)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as PickerVariant[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const update = async (id: string, patch: Partial<PickerVariant>) => {
    const { error } = await supabase.from("service_library_picker_variants").update(patch).eq("id", id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["sl-packages", master.id] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("service_library_picker_variants").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["sl-packages", master.id] });
  };
  const add = async () => {
    const countries = assigned.data ?? [];
    const country = countries[0] ?? "Canada";
    const nextOrder = ((variants.data ?? []).reduce((m, x) => Math.max(m, x.display_order), 0) || 0) + 1;
    const { error } = await supabase.from("service_library_picker_variants").insert({
      library_id: master.id,
      country,
      variant_key: `pkg_${nextOrder}`,
      picker_label: "New package",
      group_label: master.sub_service ?? "Services",
      fee_inr: 0,
      fee_cad: 0,
      govt_fee_inr: null,
      govt_fee_cad: null,
      display_order: nextOrder,
    });
    if (error) return toast({ title: "Add failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["sl-packages", master.id] });
  };

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Packages shown on lead/client service pickers. Set consultancy and government fees in both INR and CAD.
        </p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add package</Button>
      </div>
      {variants.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!variants.isLoading && (variants.data ?? []).length === 0 && (
        <div className="text-sm text-muted-foreground rounded-lg border p-4">
          No lead-form packages yet. Add variants to group options (e.g. Visitor Visa 1/2/3 persons) with fees.
        </div>
      )}
      <div className="space-y-2">
        {(variants.data ?? []).map((v) => (
          <div key={v.id} className="grid grid-cols-12 gap-2 rounded-lg border p-2 text-sm">
            <Input
              className="col-span-3"
              defaultValue={v.picker_label}
              placeholder="Picker label"
              onBlur={(e) => update(v.id, { picker_label: e.target.value })}
            />
            <Input
              className="col-span-2"
              defaultValue={v.group_label}
              placeholder="Group"
              onBlur={(e) => update(v.id, { group_label: e.target.value })}
            />
            <Select value={v.country} onValueChange={(c) => update(v.id, { country: c })}>
              <SelectTrigger className="col-span-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(assigned.data ?? ["Canada"]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="col-span-1"
              defaultValue={v.variant_key}
              placeholder="Key"
              onBlur={(e) => update(v.id, { variant_key: e.target.value })}
            />
            <Input
              className="col-span-1"
              type="number"
              defaultValue={String(v.fee_inr)}
              placeholder="₹"
              onBlur={(e) => update(v.id, { fee_inr: Number(e.target.value) || 0 })}
            />
            <Input
              className="col-span-1"
              type="number"
              defaultValue={String(v.fee_cad)}
              placeholder="CA$"
              onBlur={(e) => update(v.id, { fee_cad: Number(e.target.value) || 0 })}
            />
            <Input
              className="col-span-1"
              type="number"
              defaultValue={v.govt_fee_inr != null ? String(v.govt_fee_inr) : ""}
              placeholder="Govt ₹"
              onBlur={(e) => update(v.id, { govt_fee_inr: numOrNull(e.target.value) })}
            />
            <Input
              className="col-span-1"
              type="number"
              defaultValue={v.govt_fee_cad != null ? String(v.govt_fee_cad) : ""}
              placeholder="Govt CA$"
              onBlur={(e) => update(v.id, { govt_fee_cad: numOrNull(e.target.value) })}
            />
            <Button size="sm" variant="ghost" className="col-span-1" onClick={() => remove(v.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["sl-fees", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_fee_items")
        .select("*").eq("library_id", master.id).order("display_order");
      return (data ?? []) as unknown as FeeItem[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const update = async (id: string, patch: Partial<FeeItem>) => {
    await supabase.from("service_library_fee_items").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };
  const remove = async (id: string) => {
    await supabase.from("service_library_fee_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };
  const add = async () => {
    const nextOrder = ((items.data ?? []).reduce((m, x) => Math.max(m, x.display_order), 0) || 0) + 1;
    await supabase.from("service_library_fee_items").insert({
      library_id: master.id, fee_label: "New fee", amount: "0", currency: "INR", display_order: nextOrder,
    });
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Per-row country scope: leave as "All" or pick a specific country.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add fee</Button>
      </div>
      <div className="space-y-2">
        {(items.data ?? []).map((it) => (
          <div key={it.id} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
            <Input className="col-span-4" defaultValue={it.fee_label} onBlur={(e) => update(it.id, { fee_label: e.target.value })} />
            <Input className="col-span-2" defaultValue={it.amount ?? ""} onBlur={(e) => update(it.id, { amount: e.target.value })} />
            <Input className="col-span-1" defaultValue={it.currency ?? ""} onBlur={(e) => update(it.id, { currency: e.target.value })} />
            <Input className="col-span-2" defaultValue={it.notes ?? ""} placeholder="Notes" onBlur={(e) => update(it.id, { notes: e.target.value })} />
            <Select value={it.country ?? "__all"} onValueChange={(v) => update(it.id, { country: v === "__all" ? null : v })}>
              <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="col-span-1" onClick={() => remove(it.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostSummaryTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const [v, setV] = useState(master.cost_summary_html ?? "");
  const save = async () => {
    const { error } = await supabase.from("service_library").update({ cost_summary_html: v }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Complete cost breakdown shown on the counselor view. Supports basic HTML (paragraphs, lists, bold).
      </p>
      <Textarea rows={14} value={v} onChange={(e) => setV(e.target.value)} placeholder="Government fees, Future Link fees, third-party costs, notes, total estimated cost…" />
      <Button onClick={save}>Save Cost Summary</Button>
    </div>
  );
}

function ProcessFlowTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const initial = Array.isArray(master.process_flow) ? (master.process_flow as string[]) : [];
  const [steps, setSteps] = useState<string[]>(initial);
  const save = async () => {
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("service_library").update({ process_flow: cleaned }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input value={s} onChange={(e) => { const c = [...steps]; c[i] = e.target.value; setSteps(c); }} />
          <Button variant="ghost" size="sm" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSteps([...steps, ""])}>
          <Plus className="h-4 w-4 mr-1" /> Add step
        </Button>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
    </div>
  );
}

function InternalSopTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const qc = useQueryClient();
  const [html, setHtml] = useState(master.internal_sop_html ?? "");
  const tasks = useQuery({
    queryKey: ["sl-sop", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_sop_tasks")
        .select("*").eq("library_id", master.id).order("sort_order");
      return (data ?? []) as unknown as SopTask[];
    },
  });

  const saveHtml = async () => {
    const { error } = await supabase.from("service_library").update({ internal_sop_html: html }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  const addTask = async () => {
    const t = prompt("Task text");
    if (!t) return;
    const order = ((tasks.data ?? []).reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    await supabase.from("service_library_sop_tasks").insert({ library_id: master.id, task_text: t, sort_order: order });
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };
  const update = async (id: string, patch: Partial<SopTask>) => {
    await supabase.from("service_library_sop_tasks").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };
  const remove = async (id: string) => {
    await supabase.from("service_library_sop_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Internal SOP (counselor-only)</Label>
        <Textarea rows={10} value={html} onChange={(e) => setHtml(e.target.value)} />
        <div className="mt-2"><Button onClick={saveHtml}>Save SOP</Button></div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">SOP tasks (counselors check off per lead)</h3>
          <Button size="sm" onClick={addTask}><Plus className="h-3.5 w-3.5 mr-1" />Add task</Button>
        </div>
        <div className="space-y-2">
          {(tasks.data ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <Input defaultValue={t.task_text} onBlur={(e) => update(t.id, { task_text: e.target.value })} />
              <Switch checked={t.is_active} onCheckedChange={(v) => update(t.id, { is_active: v })} />
              <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverridesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const [openCountry, setOpenCountry] = useState<string | null>(null);

  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });
  const overrides = useQuery({
    queryKey: ["sl-overrides", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_overrides").select("*").eq("library_id", master.id);
      return (data ?? []) as unknown as Override[];
    },
  });

  const byCountry = useMemo(() => {
    const m: Record<string, Override> = {};
    for (const o of overrides.data ?? []) m[o.country] = o;
    return m;
  }, [overrides.data]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Override any text field for a specific country. Leave blank to inherit from the master.
      </p>
      {(assigned.data ?? []).length === 0 && (
        <div className="text-sm text-muted-foreground">Assign countries first in the Countries tab.</div>
      )}
      {(assigned.data ?? []).map((c) => (
        <div key={c} className="rounded-lg border">
          <button
            className="flex w-full items-center justify-between p-3 text-left"
            onClick={() => setOpenCountry(openCountry === c ? null : c)}
          >
            <span className="font-medium">{c}</span>
            <div className="flex items-center gap-2">
              {byCountry[c] && <Badge variant="secondary">Override active</Badge>}
              {openCountry === c ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>
          {openCountry === c && (
            <OverrideForm
              libraryId={master.id}
              country={c}
              existing={byCountry[c] ?? null}
              onSaved={() => qc.invalidateQueries({ queryKey: ["sl-overrides", master.id] })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function OverrideForm({
  libraryId, country, existing, onSaved,
}: { libraryId: string; country: string; existing: Override | null; onSaved: () => void }) {
  const [v, setV] = useState({
    quick_guide_what_to_do: existing?.quick_guide_what_to_do ?? "",
    quick_guide_common_mistakes: existing?.quick_guide_common_mistakes ?? "",
    quick_guide_escalation_rules: existing?.quick_guide_escalation_rules ?? "",
    quick_guide_important_reminders: existing?.quick_guide_important_reminders ?? "",
    checklist_text: existing?.checklist_text ?? "",
    cost_summary_html: existing?.cost_summary_html ?? "",
    internal_sop_html: existing?.internal_sop_html ?? "",
    process_flow_text: Array.isArray(existing?.process_flow)
      ? (existing!.process_flow as string[]).join("\n") : "",
  });

  const save = async () => {
    const payload = {
      library_id: libraryId,
      country,
      quick_guide_what_to_do: v.quick_guide_what_to_do || null,
      quick_guide_common_mistakes: v.quick_guide_common_mistakes || null,
      quick_guide_escalation_rules: v.quick_guide_escalation_rules || null,
      quick_guide_important_reminders: v.quick_guide_important_reminders || null,
      checklist_text: v.checklist_text || null,
      cost_summary_html: v.cost_summary_html || null,
      internal_sop_html: v.internal_sop_html || null,
      process_flow: v.process_flow_text
        ? v.process_flow_text.split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
    };
    const { error } = await supabase
      .from("service_library_overrides")
      .upsert(payload, { onConflict: "library_id,country" });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onSaved();
  };
  const clear = async () => {
    if (!existing) return;
    if (!confirm(`Remove override for ${country}?`)) return;
    await supabase.from("service_library_overrides").delete().eq("id", existing.id);
    onSaved();
  };

  return (
    <div className="space-y-3 border-t p-4 bg-slate-50">
      {[
        ["quick_guide_what_to_do", "Quick Guide · What to do"],
        ["quick_guide_common_mistakes", "Quick Guide · Common mistakes"],
        ["quick_guide_escalation_rules", "Quick Guide · Escalation rules"],
        ["quick_guide_important_reminders", "Quick Guide · Important reminders"],
        ["checklist_text", "Checklist text"],
        ["cost_summary_html", "Cost Summary"],
        ["internal_sop_html", "Internal SOP"],
        ["process_flow_text", "Process Flow (one step per line)"],
      ].map(([k, label]) => (
        <div key={k}>
          <Label className="text-xs">{label}</Label>
          <Textarea rows={3}
            value={(v as Record<string, string>)[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={save}>Save override</Button>
        {existing && <Button size="sm" variant="ghost" onClick={clear}>Remove override</Button>}
      </div>
    </div>
  );
}
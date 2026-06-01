import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Download,
  X,
  Save,
  ShieldAlert,
  ListChecks,
  Search,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMasterLabels } from "@/lib/masters";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { REGIONS } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

/**
 * Service categories MUST match the lead form (see src/components/leads/ServiceTabs.tsx).
 * Country / Service / Sub-Service are sourced from master_items + service_catalogue —
 * no separate hierarchy is maintained inside Service Library.
 */
const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "admission_services", label: "Admission" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_financial", label: "Travel & Financial" },
];
const CATEGORY_LABEL_BY_KEY = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));
const CATEGORY_KEY_BY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.label, c.key]));

/**
 * Service Library is restricted to this fixed allow-list of countries.
 * Sourced from the REGIONS list (Europe, North America, Oceania, Middle East, Asia).
 * Any country outside this list is purged during sync and hidden from admin pickers.
 */
export const ALLOWED_SERVICE_LIBRARY_COUNTRIES: string[] = [
  ...new Set(REGIONS.flatMap((r) => r.countries)),
].sort();
const ALLOWED_COUNTRY_SET = new Set(ALLOWED_SERVICE_LIBRARY_COUNTRIES);

type FeeItem = {
  id?: string;
  fee_label: string;
  amount: string | null;
  currency: string | null;
  notes: string | null;
};
type Attachment = {
  id: string;
  file_name: string;
  file_path: string;
  label: string | null;
  mime_type: string | null;
};
type LibraryRow = {
  id: string;
  country: string;
  service_category: string;
  service: string;
  sub_service: string;
  checklist_text: string | null;
  process_flow: string[] | null;
  is_active: boolean;
  display_order: number;
  service_library_fee_items: FeeItem[];
  service_library_attachments: Attachment[];
};

const emptyForm = (): Omit<LibraryRow, "id" | "service_library_fee_items" | "service_library_attachments"> => ({
  country: "",
  service_category: "",
  service: "",
  sub_service: "",
  checklist_text: "",
  process_flow: [],
  is_active: true,
  display_order: 0,
});

export default function ServiceLibraryAdmin() {
  const { hasRole, isAdmin } = useAuth();
  const canManage = isAdmin || hasRole(["administrator", "documentation"]);
  const qc = useQueryClient();
  const masterCountries = useMasterLabels("countries");

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");

  const [editing, setEditing] = useState<LibraryRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: rows = [], isLoading } = useQuery<LibraryRow[]>({
    queryKey: ["service-library-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_fee_items(*), service_library_attachments(*)")
        .order("country")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as LibraryRow[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["service-library-admin"] });

  /**
   * Backfill Service Library from the lead form catalogue.
   * Inserts every (country, category, service, sub-service) combination
   * that exists in service_catalogue but not yet in service_library.
   * Existing rows (and their checklist / fees / process flow / attachments)
   * are left untouched — we only INSERT missing combos.
   */
  const syncFromCatalogue = async () => {
    setSyncing(true);
    try {
      const catalogue = await fetchAllServiceCatalogue();

      // 1) Purge rows for any country NOT in the allow-list (and their child rows).
      // Fetch all rows and filter client-side to avoid URL-length issues with .not("country","in",...).
      const { data: allRows, error: allErr } = await supabase
        .from("service_library")
        .select("id, country");
      if (allErr) throw allErr;
      const disallowedIds = (allRows ?? [])
        .filter((r) => !ALLOWED_COUNTRY_SET.has(r.country as string))
        .map((r) => r.id as string);
      let deleted = 0;
      const CHUNK = 80;
      const chunked = <T,>(arr: T[]): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
        return out;
      };
      if (disallowedIds.length) {
        // Collect storage paths in batches, then remove files (best-effort).
        const paths: string[] = [];
        for (const ids of chunked(disallowedIds)) {
          const { data: atts } = await supabase
            .from("service_library_attachments")
            .select("file_path")
            .in("library_id", ids);
          for (const a of atts ?? []) if (a.file_path) paths.push(a.file_path as string);
        }
        for (const p of chunked(paths)) {
          if (p.length) await supabase.storage.from("service-library-files").remove(p);
        }
        for (const ids of chunked(disallowedIds)) {
          await supabase.from("service_library_attachments").delete().in("library_id", ids);
          await supabase.from("service_library_fee_items").delete().in("library_id", ids);
          const { error: delErr } = await supabase.from("service_library").delete().in("id", ids);
          if (delErr) throw delErr;
          deleted += ids.length;
        }
      }

      // 2) Build existing keys from the remaining (allow-listed) rows.
      const { data: existingRows, error: exErr } = await supabase
        .from("service_library")
        .select("country, service_category, service, sub_service");
      if (exErr) throw exErr;
      const existingKeys = new Set(
        (existingRows ?? []).map(
          (r) => `${r.country}|${r.service_category}|${r.service}|${r.sub_service}`,
        ),
      );

      // Use master countries intersected with the allow-list as fallback for
      // catalogue items without a country_tag.
      const targetCountries = (masterCountries.length ? masterCountries : ALLOWED_SERVICE_LIBRARY_COUNTRIES)
        .filter((c) => ALLOWED_COUNTRY_SET.has(c));
      const toInsert: {
        country: string;
        service_category: string;
        service: string;
        sub_service: string;
      }[] = [];
      const seen = new Set<string>();

      for (const item of catalogue) {
        const categoryLabel = CATEGORY_LABEL_BY_KEY[item.master_key];
        if (!categoryLabel) continue; // skip catalogue keys not in lead form's 5 categories
        const subService = (item.sub_category ?? "").trim() || "General";
        // If the catalogue item is tagged to a country outside the allow-list, skip it.
        if (item.country_tag && !ALLOWED_COUNTRY_SET.has(item.country_tag)) continue;
        const itemCountries = item.country_tag ? [item.country_tag] : targetCountries;
        for (const c of itemCountries) {
          if (!ALLOWED_COUNTRY_SET.has(c)) continue;
          const key = `${c}|${categoryLabel}|${item.service_name}|${subService}`;
          if (existingKeys.has(key) || seen.has(key)) continue;
          seen.add(key);
          toInsert.push({
            country: c,
            service_category: categoryLabel,
            service: item.service_name,
            sub_service: subService,
          });
        }
      }

      if (toInsert.length === 0) {
        toast({
          title: deleted ? "Sync complete" : "Already in sync",
          description: deleted
            ? `Removed ${deleted} disallowed-country entr${deleted === 1 ? "y" : "ies"}. No new entries to create.`
            : "No new entries to create.",
        });
        if (deleted) refresh();
        return;
      }

      // Insert in batches to stay well under any payload limits.
      const BATCH = 200;
      let created = 0;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const slice = toInsert.slice(i, i + BATCH);
        const { error } = await supabase.from("service_library").insert(slice);
        if (error) throw error;
        created += slice.length;
      }
      toast({
        title: "Sync complete",
        description: `Removed ${deleted} disallowed entr${deleted === 1 ? "y" : "ies"} and created ${created} new entr${created === 1 ? "y" : "ies"} from the lead form catalogue.`,
      });
      console.info(`[service-library] sync deleted ${deleted}, created ${created}`);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (country && r.country !== country) return false;
      if (serviceCategory && r.service_category !== serviceCategory) return false;
      if (service && r.service !== service) return false;
      if (subService && r.sub_service !== subService) return false;
      if (!q) return true;
      return [r.country, r.service_category, r.service, r.sub_service, r.checklist_text ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, country, serviceCategory, service, subService, search]);

  const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
  const countries = uniq(rows.map((r) => r.country));
  const categories = uniq(
    rows.filter((r) => !country || r.country === country).map((r) => r.service_category),
  );
  const services = uniq(
    rows
      .filter((r) => (!country || r.country === country) && (!serviceCategory || r.service_category === serviceCategory))
      .map((r) => r.service),
  );
  const subServices = uniq(
    rows
      .filter(
        (r) =>
          (!country || r.country === country) &&
          (!serviceCategory || r.service_category === serviceCategory) &&
          (!service || r.service === service),
      )
      .map((r) => r.sub_service),
  );

  const handleDelete = async (row: LibraryRow) => {
    if (!confirm(`Delete ${row.country} · ${row.service}? Files and fees will be removed.`)) return;
    // remove storage files first
    if (row.service_library_attachments.length) {
      await supabase.storage.from("service-library-files").remove(row.service_library_attachments.map((a) => a.file_path));
    }
    const { error } = await supabase.from("service_library").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    refresh();
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" />
          <h2 className="text-lg font-semibold">View-only access</h2>
          <p className="mt-1 text-sm text-amber-800">
            Only Admins and the Documentation team can manage the Service Library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <ListChecks className="h-4 w-4" /> Service Library Admin
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Manage Service Library</h1>
            <p className="mt-1 text-sm text-slate-600">
              Add countries, services, sub-services, checklists, fees, process flow and files.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={syncFromCatalogue} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync from lead form
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add entry
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <FilterSelect value={country} onChange={(v) => { setCountry(v); setServiceCategory(""); setService(""); setSubService(""); }} options={countries} placeholder="All countries" />
            <FilterSelect value={serviceCategory} onChange={(v) => { setServiceCategory(v); setService(""); setSubService(""); }} options={categories} placeholder="All categories" />
            <FilterSelect value={service} onChange={(v) => { setService(v); setSubService(""); }} options={services} placeholder="All services" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <FilterSelect value={subService} onChange={setSubService} options={subServices} placeholder="All sub-services" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sub-service</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Files</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                    No entries.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.country}</TableCell>
                  <TableCell>{r.service_category}</TableCell>
                  <TableCell>{r.service}</TableCell>
                  <TableCell>{r.sub_service}</TableCell>
                  <TableCell>{r.service_library_fee_items.length}</TableCell>
                  <TableCell>{r.service_library_attachments.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(r);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {showForm && (
        <EditDialog
          row={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: LibraryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => (row ? { ...row } : { ...emptyForm() }));
  const [fees, setFees] = useState<FeeItem[]>(row?.service_library_fee_items ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(row?.service_library_attachments ?? []);
  const [processFlow, setProcessFlow] = useState<string[]>(
    Array.isArray(row?.process_flow) ? (row!.process_flow as string[]) : [],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const masterCountries = useMasterLabels("countries");
  const countries = useMemo(
    () => masterCountries.filter((c) => ALLOWED_COUNTRY_SET.has(c)),
    [masterCountries],
  );

  useEffect(() => {
    fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  useEffect(() => {
    if (row) {
      setForm({ ...row });
      setFees(row.service_library_fee_items);
      setAttachments(row.service_library_attachments);
      setProcessFlow(Array.isArray(row.process_flow) ? (row.process_flow as string[]) : []);
    }
  }, [row]);

  const categoryKey = CATEGORY_KEY_BY_LABEL[form.service_category] ?? "";
  const catalogueForCategory = useMemo(
    () => catalogue.filter((c) => c.master_key === categoryKey),
    [catalogue, categoryKey],
  );
  // Services are filtered by selected country when the catalogue item is country-tagged.
  // Items without a country_tag are global and show for every country.
  const servicesForSelection = useMemo(() => {
    if (!form.country) return catalogueForCategory;
    return catalogueForCategory.filter((c) => !c.country_tag || c.country_tag === form.country);
  }, [catalogueForCategory, form.country]);
  const serviceOptions = useMemo(
    () => [...new Set(servicesForSelection.map((s) => s.service_name))].sort(),
    [servicesForSelection],
  );
  const subServiceOptions = useMemo(
    () =>
      [
        ...new Set(
          servicesForSelection
            .filter((s) => s.service_name === form.service)
            .map((s) => s.sub_category || "")
            .filter(Boolean),
        ),
      ].sort(),
    [servicesForSelection, form.service],
  );

  const save = async () => {
    if (!form.country || !form.service_category || !form.service || !form.sub_service) {
      toast({ title: "Fill country, category, service, sub-service", variant: "destructive" });
      return;
    }
    // Validate against catalogue / masters — prevents duplicate master data.
    if (!countries.includes(form.country)) {
      toast({
        title: "Unknown country",
        description: "Pick a country from the master list (Masters → Countries).",
        variant: "destructive",
      });
      return;
    }
    if (!CATEGORY_KEY_BY_LABEL[form.service_category]) {
      toast({ title: "Pick a service category from the lead form list", variant: "destructive" });
      return;
    }
    const matchesCatalogue = catalogueForCategory.some(
      (c) =>
        c.service_name === form.service &&
        (!c.country_tag || c.country_tag === form.country) &&
        (c.sub_category ?? "") === form.sub_service,
    );
    if (!matchesCatalogue) {
      toast({
        title: "Service / sub-service not in catalogue",
        description: "Add it to the service catalogue first so the lead form and Service Library stay in sync.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // Duplicate guard: same (country, category, service, sub-service) cannot exist twice.
      const { data: existing, error: dupErr } = await supabase
        .from("service_library")
        .select("id")
        .eq("country", form.country.trim())
        .eq("service_category", form.service_category.trim())
        .eq("service", form.service.trim())
        .eq("sub_service", form.sub_service.trim());
      if (dupErr) throw dupErr;
      const clash = (existing ?? []).find((e) => e.id !== row?.id);
      if (clash) {
        toast({
          title: "Entry already exists",
          description: "An entry for this country + service + sub-service already exists.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const payload = {
        country: form.country.trim(),
        service_category: form.service_category.trim(),
        service: form.service.trim(),
        sub_service: form.sub_service.trim(),
        checklist_text: form.checklist_text || null,
        process_flow: processFlow,
        is_active: form.is_active,
        display_order: form.display_order ?? 0,
      };

      let libraryId = row?.id;
      if (row) {
        const { error } = await supabase.from("service_library").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("service_library")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        libraryId = data.id;
      }

      // Replace fee items: delete then insert
      if (libraryId) {
        await supabase.from("service_library_fee_items").delete().eq("library_id", libraryId);
        const cleanFees = fees
          .filter((f) => f.fee_label.trim())
          .map((f, i) => ({
            library_id: libraryId!,
            fee_label: f.fee_label.trim(),
            amount: f.amount || null,
            currency: f.currency || null,
            notes: f.notes || null,
            display_order: i,
          }));
        if (cleanFees.length) {
          const { error } = await supabase.from("service_library_fee_items").insert(cleanFees);
          if (error) throw error;
        }
      }
      toast({ title: row ? "Updated" : "Created" });
      onSaved();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!row?.id) {
      toast({
        title: "Save the entry first",
        description: "Create the entry before uploading files.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${row.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("service-library-files")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data, error: dbErr } = await supabase
          .from("service_library_attachments")
          .insert({
            library_id: row.id,
            file_name: file.name,
            file_path: path,
            mime_type: file.type,
            label: file.name,
          })
          .select("*")
          .single();
        if (dbErr) throw dbErr;
        setAttachments((prev) => [...prev, data as Attachment]);
      }
      toast({ title: "Files uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (a: Attachment) => {
    if (!confirm(`Remove ${a.file_name}?`)) return;
    await supabase.storage.from("service-library-files").remove([a.file_path]);
    const { error } = await supabase.from("service_library_attachments").delete().eq("id", a.id);
    if (error) {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
      return;
    }
    setAttachments((prev) => prev.filter((x) => x.id !== a.id));
  };

  const downloadAttachment = async (a: Attachment) => {
    const { data, error } = await supabase.storage
      .from("service-library-files")
      .createSignedUrl(a.file_path, 600);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit entry" : "Add entry"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Section label="Country">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value, service: "", sub_service: "" })
                }
              >
                <option value="">Select country…</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Section>
            <Section label="Service Category">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={CATEGORY_KEY_BY_LABEL[form.service_category] ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    service_category: CATEGORY_LABEL_BY_KEY[e.target.value] ?? "",
                    service: "",
                    sub_service: "",
                  })
                }
              >
                <option value="">Select category…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Section>
            <Section label="Service">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value, sub_service: "" })}
                disabled={!categoryKey}
              >
                <option value="">{categoryKey ? "Select service…" : "Pick category first"}</option>
                {serviceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Section>
            <Section label="Sub-service">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.sub_service}
                onChange={(e) => setForm({ ...form, sub_service: e.target.value })}
                disabled={!form.service}
              >
                <option value="">{form.service ? "Select sub-service…" : "Pick service first"}</option>
                {subServiceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Section>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Country, category, service and sub-service come from the lead form catalogue. To add new options, update the
            service catalogue / Masters — not here.
          </p>

          <Section label="Checklist text">
            <Textarea
              rows={5}
              value={form.checklist_text ?? ""}
              onChange={(e) => setForm({ ...form, checklist_text: e.target.value })}
            />
          </Section>

          <Section label="Process flow (one step per line)">
            <Textarea
              rows={4}
              value={processFlow.join("\n")}
              onChange={(e) => setProcessFlow(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            />
          </Section>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Fee structure</Label>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setFees([...fees, { fee_label: "", amount: "", currency: "", notes: "" }])
                }
              >
                <Plus className="mr-1 h-3 w-3" /> Add fee
              </Button>
            </div>
            <div className="space-y-2">
              {fees.map((f, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-12">
                  <Input
                    className="md:col-span-4"
                    placeholder="Label"
                    value={f.fee_label}
                    onChange={(e) => {
                      const next = [...fees];
                      next[i] = { ...next[i], fee_label: e.target.value };
                      setFees(next);
                    }}
                  />
                  <Input
                    className="md:col-span-2"
                    placeholder="Currency"
                    value={f.currency ?? ""}
                    onChange={(e) => {
                      const next = [...fees];
                      next[i] = { ...next[i], currency: e.target.value };
                      setFees(next);
                    }}
                  />
                  <Input
                    className="md:col-span-2"
                    placeholder="Amount"
                    value={f.amount ?? ""}
                    onChange={(e) => {
                      const next = [...fees];
                      next[i] = { ...next[i], amount: e.target.value };
                      setFees(next);
                    }}
                  />
                  <Input
                    className="md:col-span-3"
                    placeholder="Notes"
                    value={f.notes ?? ""}
                    onChange={(e) => {
                      const next = [...fees];
                      next[i] = { ...next[i], notes: e.target.value };
                      setFees(next);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => setFees(fees.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Attachments (PDF/DOCX/XLSX)</Label>
              {row?.id ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </label>
              ) : (
                <span className="text-xs text-slate-500">Save entry to enable uploads</span>
              )}
            </div>
            <div className="space-y-2">
              {attachments.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-sm text-slate-500">No files yet.</div>
              )}
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.file_name}</div>
                    <div className="truncate text-xs text-slate-500">{a.mime_type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" type="button" onClick={() => downloadAttachment(a)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => removeAttachment(a)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
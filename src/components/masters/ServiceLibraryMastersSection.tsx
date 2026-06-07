import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ExternalLink, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";
import { isExcludedCatalogueService } from "@/lib/service-library/excludedCatalogueServices";
import { isAcademyVisaServiceRow } from "@/lib/service-library/academyNav";

type LibraryRow = {
  id: string;
  service_category: string;
  service: string;
  sub_service: string;
  display_order: number;
  is_active: boolean;
  academy_metadata?: { displayName?: string } | null;
  service_library_countries?: { country: string }[];
};

const CATEGORIES = [
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "coaching_services", label: "Coaching" },
  { key: "admission_services", label: "Admissions" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_financial", label: "Travel & Financial" },
];

function rowLabel(r: LibraryRow): string {
  const meta = r.academy_metadata as { displayName?: string } | null | undefined;
  if (meta?.displayName) return meta.displayName;
  if (r.service_category === "visa_immigration" && r.service !== r.sub_service) {
    return `${r.service} — ${r.sub_service}`;
  }
  return r.sub_service || r.service;
}

function rowCountries(r: LibraryRow): string[] {
  const mapped = (r.service_library_countries ?? []).map((c) => c.country);
  if (mapped.length) return mapped;
  if (ALLOWED_SERVICE_LIBRARY_COUNTRIES.includes(r.service)) return [r.service];
  return [];
}

function rowMatchesCountry(r: LibraryRow, country: string): boolean {
  if (country === "all") return true;
  const countries = rowCountries(r);
  return countries.includes(country) || r.service === country;
}

export function ServiceLibraryMastersSection() {
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterKey, setFilterKey] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LibraryRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_library")
      .select("*, service_library_countries(country)")
      .order("service_category")
      .order("display_order")
      .order("service")
      .order("sub_service");
    if (error) toast.error(error.message);
    setRows((data ?? []) as LibraryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const countryOptions = useMemo(() => {
    const present = new Set<string>();
    for (const r of rows) {
      for (const c of rowCountries(r)) present.add(c);
    }
    return ALLOWED_SERVICE_LIBRARY_COUNTRIES.filter((c) => present.has(c));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterKey !== "all" && r.service_category !== filterKey) return false;
      if (
        (filterKey === "all" || filterKey === "visa_immigration") &&
        r.service_category === "visa_immigration" &&
        !isAcademyVisaServiceRow(r)
      ) {
        return false;
      }
      if (!rowMatchesCountry(r, countryFilter)) return false;
      if (!q) return true;
      return (
        rowLabel(r).toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.sub_service.toLowerCase().includes(q) ||
        rowCountries(r).some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [rows, filterKey, countryFilter, search]);

  const toggleActive = async (r: LibraryRow) => {
    const { error } = await supabase
      .from("service_library")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const onDelete = async (r: LibraryRow) => {
    if (!confirm(`Remove "${rowLabel(r)}" from the service library? Existing lead/client references are preserved in history.`)) {
      return;
    }
    const { error } = await supabase.from("service_library").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            Service Library
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Services shown on lead and client forms. Toggle active to hide without deleting. For training content,
            checklists, and sample docs use{" "}
            <Link to="/service-library-admin" className="text-primary underline inline-flex items-center gap-1">
              Service Library Admin <ExternalLink className="size-3" />
            </Link>
            .
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-brand text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> Add service
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterKey} onValueChange={setFilterKey}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <Card className="overflow-hidden shadow-elev-sm">
        <div className="grid grid-cols-12 px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/40">
          <div className="col-span-4">Service</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Country / group</div>
          <div className="col-span-1">Active</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y max-h-[600px] overflow-auto">
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No services match.</div>
          )}
          {filtered.map((r) => {
            const excluded = isExcludedCatalogueService({
              subService: r.sub_service,
              serviceName: rowLabel(r),
              serviceCode: r.id,
              serviceField: r.service,
            });
            const countries = rowCountries(r);
            return (
              <div
                key={r.id}
                className={`grid grid-cols-12 px-4 py-2.5 items-center text-sm ${!r.is_active ? "opacity-50" : ""}`}
              >
                <div className="col-span-4">
                  <div className="font-medium">{rowLabel(r)}</div>
                  {excluded && (
                    <div className="text-[10px] text-amber-600">Hidden from forms (legacy admission workflow)</div>
                  )}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {CATEGORIES.find((c) => c.key === r.service_category)?.label ?? r.service_category}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">
                  {countries.length ? countries.join(", ") : r.service}
                </div>
                <div className="col-span-1">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                </div>
                <div className="col-span-3 text-right flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    onClick={() => onDelete(r)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <LibraryEditorDialog open={open} onOpenChange={setOpen} row={editing} onSaved={load} />
    </div>
  );
}

function LibraryEditorDialog({
  open,
  onOpenChange,
  row,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: LibraryRow | null;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState("visa_immigration");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");
  const [country, setCountry] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory(row?.service_category ?? "visa_immigration");
    setService(row?.service ?? "");
    setSubService(row?.sub_service ?? "");
    setCountry(row?.service_library_countries?.[0]?.country ?? "");
    setDisplayName((row?.academy_metadata as { displayName?: string } | null)?.displayName ?? "");
  }, [open, row]);

  const onSubmit = async () => {
    if (!service.trim() || !subService.trim()) {
      toast.error("Service group and sub-service name are required");
      return;
    }
    setBusy(true);
    try {
      const meta = displayName.trim() ? { displayName: displayName.trim() } : {};
      if (row) {
        const { error } = await supabase
          .from("service_library")
          .update({
            service_category: category,
            service: service.trim(),
            sub_service: subService.trim(),
            academy_metadata: meta as never,
          })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("service_library")
          .insert({
            service_category: category,
            service: service.trim(),
            sub_service: subService.trim(),
            academy_metadata: meta as never,
            is_active: true,
            display_order: 900,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (category === "visa_immigration" && country) {
          await supabase.from("service_library_countries").insert({
            library_id: inserted.id,
            country,
          });
        }
      }
      toast.success(row ? "Updated" : "Added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Group / country *</Label>
              <Input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. Canada or IELTS"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sub-service *</Label>
              <Input
                value={subService}
                onChange={(e) => setSubService(e.target.value)}
                placeholder="e.g. Student Visa"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Display name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Canada — Student Visa (Study Permit)"
            />
          </div>
          {category === "visa_immigration" && !row && (
            <div className="space-y-1.5">
              <Label>Country mapping</Label>
              <Select value={country || "__none"} onValueChange={(v) => setCountry(v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={busy || !service.trim() || !subService.trim()}
            className="gradient-brand text-primary-foreground"
          >
            {busy ? "Saving…" : row ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

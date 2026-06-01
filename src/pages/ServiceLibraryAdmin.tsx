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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");

  const [editing, setEditing] = useState<LibraryRow | null>(null);
  const [showForm, setShowForm] = useState(false);

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
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add entry
          </Button>
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

  useEffect(() => {
    if (row) {
      setForm({ ...row });
      setFees(row.service_library_fee_items);
      setAttachments(row.service_library_attachments);
      setProcessFlow(Array.isArray(row.process_flow) ? (row.process_flow as string[]) : []);
    }
  }, [row]);

  const save = async () => {
    if (!form.country || !form.service_category || !form.service || !form.sub_service) {
      toast({ title: "Fill country, category, service, sub-service", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
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
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Section>
            <Section label="Service Category">
              <Input
                value={form.service_category}
                onChange={(e) => setForm({ ...form, service_category: e.target.value })}
              />
            </Section>
            <Section label="Service">
              <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </Section>
            <Section label="Sub-service">
              <Input
                value={form.sub_service}
                onChange={(e) => setForm({ ...form, sub_service: e.target.value })}
              />
            </Section>
          </div>

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
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteInstitutionContact,
  fetchInstitutionContacts,
  setInstitutionContactActive,
  SUGGESTED_CONTACT_TYPES,
  upsertInstitutionContact,
  type InstitutionContactRecord,
} from "@/institutions/lib/institutionContacts";

type FormState = {
  contact_type: string;
  contact_name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  country: string;
  notes: string;
  is_primary: boolean;
  is_active: boolean;
  sort_order: string;
};

const emptyForm = (): FormState => ({
  contact_type: "",
  contact_name: "",
  designation: "",
  department: "",
  email: "",
  phone: "",
  mobile: "",
  country: "",
  notes: "",
  is_primary: false,
  is_active: true,
  sort_order: "0",
});

function formFromRow(row: InstitutionContactRecord): FormState {
  return {
    contact_type: row.contact_type,
    contact_name: row.contact_name ?? "",
    designation: row.designation ?? "",
    department: row.department ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    mobile: row.mobile ?? "",
    country: row.country ?? "",
    notes: row.notes ?? "",
    is_primary: row.is_primary,
    is_active: row.is_active,
    sort_order: String(row.sort_order),
  };
}

export function InstitutionContactsPanel({
  institutionId,
  canEdit,
}: {
  institutionId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<InstitutionContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [customType, setCustomType] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInstitutionContacts(institutionId, {
        includeInactive: showInactive,
      });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [institutionId, showInactive]);

  const activeWithEmail = useMemo(
    () => rows.filter((r) => r.is_active && r.email?.trim()),
    [rows],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCustomType(false);
    setOpen(true);
  };

  const openEdit = (row: InstitutionContactRecord) => {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setCustomType(!SUGGESTED_CONTACT_TYPES.includes(row.contact_type as (typeof SUGGESTED_CONTACT_TYPES)[number]));
    setOpen(true);
  };

  const handleSave = async () => {
    const contactType = form.contact_type.trim();
    if (!contactType) {
      toast.error("Contact type is required");
      return;
    }

    setSaving(true);
    try {
      await upsertInstitutionContact({
        id: editingId ?? undefined,
        institution_id: institutionId,
        contact_type: contactType,
        contact_name: form.contact_name.trim() || null,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
        is_primary: form.is_primary,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      });
      toast.success(editingId ? "Contact updated" : "Contact added");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (row: InstitutionContactRecord) => {
    try {
      await setInstitutionContactActive(row.id, false);
      toast.success("Contact deactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not deactivate");
    }
  };

  const handleReactivate = async (row: InstitutionContactRecord) => {
    try {
      await setInstitutionContactActive(row.id, true);
      toast.success("Contact reactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reactivate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this contact?")) return;
    try {
      await deleteInstitutionContact(id);
      toast.success("Contact deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const typeSelectValue = customType ? "__custom__" : form.contact_type || "";

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-medium">Institution Contacts</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Multiple contacts per type — staff change often. Deactivate outdated rows instead of deleting when possible.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-1" />
              Add contact
            </Button>
          )}
        </div>

        {activeWithEmail.length === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Recommended: add at least one active contact with an email address. This improves completeness score but does not block activation.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive-contacts"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive-contacts" className="text-sm font-normal">
            Show inactive contacts
          </Label>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading contacts…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No contacts yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-[120px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={!row.is_active ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{row.contact_type}</span>
                      {row.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.contact_name ?? "—"}</TableCell>
                  <TableCell>{row.designation ?? "—"}</TableCell>
                  <TableCell>{row.department ?? "—"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{row.email ?? "—"}</TableCell>
                  <TableCell>{row.mobile ?? row.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_active ? "default" : "outline"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="size-4" />
                        </Button>
                        {row.is_active ? (
                          <Button variant="ghost" size="icon" onClick={() => void handleDeactivate(row)}>
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => void handleReactivate(row)}>
                            Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit contact" : "Add contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Contact type</Label>
              <Select
                disabled={!canEdit}
                value={typeSelectValue}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setCustomType(true);
                    setForm((f) => ({ ...f, contact_type: "" }));
                  } else {
                    setCustomType(false);
                    setForm((f) => ({ ...f, contact_type: v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select or custom" /></SelectTrigger>
                <SelectContent>
                  {SUGGESTED_CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom type…</SelectItem>
                </SelectContent>
              </Select>
              {customType && (
                <Input
                  disabled={!canEdit}
                  placeholder="Custom contact type"
                  value={form.contact_type}
                  onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact name</Label>
                <Input disabled={!canEdit} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input disabled={!canEdit} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input disabled={!canEdit} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input disabled={!canEdit} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input disabled={!canEdit} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input disabled={!canEdit} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input disabled={!canEdit} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea disabled={!canEdit} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  disabled={!canEdit}
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                />
                <Label className="font-normal">Primary contact</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  disabled={!canEdit}
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label className="font-normal">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingId && canEdit && !form.is_active && (
              <Button variant="destructive" onClick={() => void handleDelete(editingId)}>
                Delete permanently
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {canEdit && (
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

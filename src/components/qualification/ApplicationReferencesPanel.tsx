import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  deleteApplicationReference,
  upsertApplicationReference,
} from "@/lib/qualification/qualificationApi";
import {
  findDuplicateReferenceType,
  formatReferenceDefaultsCountry,
  getDefaultReferenceTypes,
  normalizeReferenceType,
} from "@/lib/qualification/applicationReferenceDefaults";
import type { ApplicationReference } from "@/lib/qualification/types";

type Props = {
  qualificationId: string;
  references: ApplicationReference[];
  institutionCountryName: string | null | undefined;
  canEdit: boolean;
  loading: boolean;
  onChanged: () => Promise<void>;
};

type FormState = {
  id?: string;
  referenceType: string;
  referenceNumber: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  referenceType: "",
  referenceNumber: "",
  notes: "",
};

export function ApplicationReferencesPanel({
  qualificationId,
  references,
  institutionCountryName,
  canEdit,
  loading,
  onChanged,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const defaultTypes = useMemo(
    () => getDefaultReferenceTypes(institutionCountryName),
    [institutionCountryName],
  );

  const countryLabel = formatReferenceDefaultsCountry(institutionCountryName);

  const unusedDefaults = useMemo(() => {
    const used = new Set(references.map((r) => normalizeReferenceType(r.referenceType)));
    return defaultTypes.filter((type) => !used.has(normalizeReferenceType(type)));
  }, [defaultTypes, references]);

  const openCreate = (referenceType = "") => {
    setForm({ ...EMPTY_FORM, referenceType });
    setDialogOpen(true);
  };

  const openEdit = (ref: ApplicationReference) => {
    setForm({
      id: ref.id,
      referenceType: ref.referenceType,
      referenceNumber: ref.referenceNumber,
      notes: ref.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const referenceType = form.referenceType.trim();
    const referenceNumber = form.referenceNumber.trim();
    if (!referenceType) {
      toast.error("Reference type is required");
      return;
    }
    if (!referenceNumber) {
      toast.error("Reference number is required");
      return;
    }

    const duplicate = findDuplicateReferenceType(references, referenceType, form.id);
    if (duplicate) {
      toast.error(`This application already has a "${duplicate.referenceType}" reference`);
      return;
    }

    setSaving(true);
    try {
      await upsertApplicationReference({
        id: form.id,
        qualificationId,
        referenceType,
        referenceNumber,
        notes: form.notes.trim() || null,
      });
      toast.success(form.id ? "Reference updated" : "Reference added");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ref: ApplicationReference) => {
    if (!confirm(`Remove "${ref.referenceType}" reference?`)) return;
    setDeletingId(ref.id);
    try {
      await deleteApplicationReference(ref.id);
      toast.success("Reference removed");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-medium flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" />
              Application References
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Institution reference numbers for this application
              {countryLabel ? ` (${countryLabel} defaults available)` : ""}.
              One reference per type per application. Custom types allowed.
            </p>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4 mr-1" />
                  Add reference
                  <ChevronDown className="size-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                {unusedDefaults.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => openCreate(type)}>
                    {type}
                  </DropdownMenuItem>
                ))}
                {unusedDefaults.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => openCreate()}>Custom type…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading references…
          </div>
        ) : references.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No references recorded yet.
            {canEdit && unusedDefaults.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {unusedDefaults.slice(0, 4).map((type) => (
                  <Button key={type} size="sm" variant="secondary" onClick={() => openCreate(type)}>
                    + {type}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Reference type</th>
                  <th className="pb-2 pr-4 font-medium">Reference number</th>
                  <th className="pb-2 pr-4 font-medium hidden md:table-cell">Notes</th>
                  <th className="pb-2 pr-4 font-medium whitespace-nowrap">Created</th>
                  {canEdit && <th className="pb-2 font-medium w-20" />}
                </tr>
              </thead>
              <tbody>
                {references.map((ref) => (
                  <tr key={ref.id} className="border-b last:border-0 align-top">
                    <td className="py-2.5 pr-4 font-medium">{ref.referenceType}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs sm:text-sm">{ref.referenceNumber}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground hidden md:table-cell">
                      {ref.notes || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    {canEdit && (
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title="Edit"
                            onClick={() => openEdit(ref)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive"
                            title="Remove"
                            disabled={deletingId === ref.id}
                            onClick={() => void handleDelete(ref)}
                          >
                            {deletingId === ref.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setDialogOpen(open);
            if (!open) setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit reference" : "Add reference"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="ref-type">Reference type</Label>
              <Input
                id="ref-type"
                value={form.referenceType}
                onChange={(e) => setForm((f) => ({ ...f, referenceType: e.target.value }))}
                placeholder="e.g. CAS Number"
                list="application-reference-type-suggestions"
              />
              <datalist id="application-reference-type-suggestions">
                {defaultTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-number">Reference number</Label>
              <Input
                id="ref-number"
                value={form.referenceNumber}
                onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="Institution-issued reference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-notes">Notes (optional)</Label>
              <Textarea
                id="ref-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Portal username, expiry reminder, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

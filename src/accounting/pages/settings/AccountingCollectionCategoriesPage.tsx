import { useMemo, useState } from "react";
import { Plus, Pencil, FolderTree } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import {
  useCollectionCategories,
  saveCollectionCategory,
  setCategoryLifecycle,
} from "@/accounting/stores/collectionCategoriesStore";
import {
  buildCategoryTree,
  LIFECYCLE_LABELS,
  TREATMENT_LABELS,
} from "@/accounting/lib/collectionCategories";
import type {
  AccountingTreatment,
  CategoryLifecycleStatus,
  CollectionCategory,
} from "@/accounting/types/collectionCategory";
import { Badge } from "@/components/ui/badge";

const TREATMENTS: AccountingTreatment[] = [
  "REVENUE", "THIRD_PARTY", "RECOVERABLE", "REIMBURSEMENT", "INSTITUTION_RELATED",
];

const LIFECYCLES: CategoryLifecycleStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];

function lifecycleVariant(s: CategoryLifecycleStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "ACTIVE") return "default";
  if (s === "DRAFT") return "secondary";
  if (s === "ARCHIVED") return "destructive";
  return "outline";
}

export default function AccountingCollectionCategoriesPage() {
  const flat = useCollectionCategories();
  const tree = useMemo(() => buildCategoryTree(flat), [flat]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionCategory | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    parentId: "",
    isPostingGroup: false,
    lifecycleStatus: "DRAFT" as CategoryLifecycleStatus,
    accountingTreatment: "THIRD_PARTY" as AccountingTreatment,
    requiresTrust: true,
    requiresDisbursement: true,
    expectedPayeeName: "",
    defaultTaxCode: "EXEMPT",
    defaultCollectionCurrency: "INR",
    defaultPaymentCurrency: "",
    defaultPayeeType: "",
    liabilityAccountCode: "2405",
    revenueAccountCode: "",
    roleKey: "",
  });

  const openNew = (parentId?: string) => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      description: "",
      parentId: parentId ?? "",
      isPostingGroup: false,
      lifecycleStatus: "DRAFT",
      accountingTreatment: "THIRD_PARTY",
      requiresTrust: true,
      requiresDisbursement: true,
      expectedPayeeName: "",
      defaultTaxCode: "EXEMPT",
      defaultCollectionCurrency: "INR",
      defaultPaymentCurrency: "",
      defaultPayeeType: "",
      liabilityAccountCode: "2405",
      revenueAccountCode: "",
      roleKey: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: CollectionCategory) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description ?? "",
      parentId: c.parentId ?? "",
      isPostingGroup: c.isPostingGroup,
      lifecycleStatus: c.lifecycleStatus,
      accountingTreatment: c.accountingTreatment,
      requiresTrust: c.requiresTrust,
      requiresDisbursement: c.requiresDisbursement,
      expectedPayeeName: c.expectedPayeeName ?? "",
      defaultTaxCode: c.defaultTaxCode ?? "EXEMPT",
      defaultCollectionCurrency: c.defaultCollectionCurrency ?? "INR",
      defaultPaymentCurrency: c.defaultPaymentCurrency ?? "",
      defaultPayeeType: c.defaultPayeeType ?? "",
      liabilityAccountCode: c.coa?.liabilityAccountCode ?? "2405",
      revenueAccountCode: c.coa?.revenueAccountCode ?? "",
      roleKey: c.coa?.roleKey ?? c.defaultTrustRoleKey ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const roleKey = form.roleKey || (form.accountingTreatment === "REVENUE"
      ? `REV_CAT_${form.code}`
      : `TRUST_CAT_${form.code}`);
    await saveCollectionCategory({
      id: editing?.id,
      code: form.code,
      name: form.name,
      description: form.description,
      parentId: form.parentId || null,
      isPostingGroup: form.isPostingGroup,
      lifecycleStatus: form.lifecycleStatus,
      accountingTreatment: form.accountingTreatment,
      requiresTrust: form.requiresTrust,
      requiresDisbursement: form.requiresDisbursement,
      expectedPayeeName: form.expectedPayeeName || null,
      defaultTaxCode: form.defaultTaxCode,
      defaultCollectionCurrency: form.defaultCollectionCurrency,
      defaultPaymentCurrency: form.defaultPaymentCurrency || null,
      defaultPayeeType: (form.defaultPayeeType || null) as CollectionCategory["defaultPayeeType"],
      defaultTrustRoleKey: form.accountingTreatment !== "REVENUE" ? roleKey : null,
      defaultRevenueRoleKey: form.accountingTreatment === "REVENUE" ? roleKey : null,
      coa: {
        categoryId: editing?.id ?? "",
        roleKey,
        liabilityAccountCode: form.liabilityAccountCode || null,
        revenueAccountCode: form.revenueAccountCode || null,
      },
    });
    setDialogOpen(false);
  };

  const renderNode = (nodes: CollectionCategory[], depth = 0) => (
    <ul className={depth ? "ml-4 border-l pl-3" : ""}>
      {nodes.map((n) => (
        <li key={n.id} className="py-2">
          <div className="flex flex-wrap items-center gap-2">
            {n.isPostingGroup && <FolderTree className="size-4 text-muted-foreground" />}
            <span className="font-medium">{n.name}</span>
            <code className="text-xs bg-muted px-1 rounded">{n.code}</code>
            <Badge variant={lifecycleVariant(n.lifecycleStatus)}>{LIFECYCLE_LABELS[n.lifecycleStatus]}</Badge>
            {!n.isPostingGroup && (
              <span className="text-xs text-muted-foreground">{TREATMENT_LABELS[n.accountingTreatment]}</span>
            )}
            {n.expectedPayeeName && (
              <span className="text-xs text-muted-foreground">→ {n.expectedPayeeName}</span>
            )}
            <div className="flex gap-1 ml-auto">
              {n.isPostingGroup && (
                <Button variant="ghost" size="sm" onClick={() => openNew(n.id)}>Add child</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => openEdit(n)}><Pencil className="size-3.5" /></Button>
              {n.lifecycleStatus === "DRAFT" && (
                <Button variant="outline" size="sm" onClick={() => void setCategoryLifecycle(n.id, "ACTIVE")}>Activate</Button>
              )}
              {n.lifecycleStatus === "ACTIVE" && !n.isSystem && (
                <Button variant="outline" size="sm" onClick={() => void setCategoryLifecycle(n.id, "INACTIVE")}>Deactivate</Button>
              )}
            </div>
          </div>
          {n.children?.length ? renderNode(n.children, depth + 1) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <AccountingPageHeader
          title="Collection categories"
          subtitle="User-configurable payment purposes — no hardcoded buckets"
          actions={
            <Button onClick={() => openNew()} className="gap-2">
              <Plus className="size-4" /> New category
            </Button>
          }
        />
        <Card className="p-4 mt-4">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories loaded. Publish migrations and refresh.</p>
          ) : (
            renderNode(tree)
          )}
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div><Label>Expected payee name</Label><Input value={form.expectedPayeeName} onChange={(e) => setForm({ ...form, expectedPayeeName: e.target.value })} placeholder="e.g. GuardMe, VFS Global" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lifecycle</Label>
                  <Select value={form.lifecycleStatus} onValueChange={(v) => setForm({ ...form, lifecycleStatus: v as CategoryLifecycleStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LIFECYCLES.map((s) => <SelectItem key={s} value={s}>{LIFECYCLE_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Accounting treatment</Label>
                  <Select value={form.accountingTreatment} onValueChange={(v) => setForm({ ...form, accountingTreatment: v as AccountingTreatment })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TREATMENTS.map((t) => <SelectItem key={t} value={t}>{TREATMENT_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.isPostingGroup} onCheckedChange={(v) => setForm({ ...form, isPostingGroup: v })} /><Label>Posting group only</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.requiresTrust} onCheckedChange={(v) => setForm({ ...form, requiresTrust: v })} /><Label>Requires trust</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.requiresDisbursement} onCheckedChange={(v) => setForm({ ...form, requiresDisbursement: v })} /><Label>Requires disbursement</Label></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Role key</Label><Input value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value })} placeholder="Auto-generated if empty" /></div>
                <div><Label>Liability COA</Label><Input value={form.liabilityAccountCode} onChange={(e) => setForm({ ...form, liabilityAccountCode: e.target.value })} /></div>
                {form.accountingTreatment === "REVENUE" && (
                  <div><Label>Revenue COA</Label><Input value={form.revenueAccountCode} onChange={(e) => setForm({ ...form, revenueAccountCode: e.target.value })} placeholder="4201" /></div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => void save()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

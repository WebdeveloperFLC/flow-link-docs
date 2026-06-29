import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingBreadcrumbs from "../../components/shared/AccountingBreadcrumbs";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import DarkModeToggle from "../../components/shared/DarkModeToggle";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import EntityTree from "../../components/settings/EntityTree";
import EntityFormDialog from "../../components/settings/EntityFormDialog";
import { addEntity, deleteEntity, updateEntity, useAllEntities as useEntities } from "../../stores/accountingEntitiesStore";
import { SettingsEntity } from "../../types/settings";
import { toast } from "sonner";

export default function AccountingEntitiesPage() {
  const entities = useEntities();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SettingsEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettingsEntity | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: SettingsEntity) => { setEditing(e); setFormOpen(true); };

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingBreadcrumbs items={[{ label: "Finance", to: "/accounting" }, { label: "Advanced finance" }, { label: "Companies & fiscal year" }]} />
        <AccountingPageHeader
          title="Companies & fiscal year"
          subtitle="Set up each legal company, its branches, and when your financial year starts. Opening balances for accounts are managed in Account setup."
          actions={
            <>
              <DarkModeToggle />
              <Button onClick={openAdd}><Plus className="size-4 mr-1" /> Add entity</Button>
            </>
          }
        />
        <Card className="p-5 shadow-elev-sm">
          {entities.length === 0 ? (
            <AccountingEmptyState
              icon={Building2}
              title="No entities yet"
              description="Add your first company to start tracking accounting data."
              action={<Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" /> Add entity</Button>}
            />
          ) : (
            <EntityTree entities={entities} onEdit={openEdit} onDelete={setDeleteTarget} />
          )}
        </Card>

        <EntityFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          onSubmit={(data) => {
            if (editing) {
              updateEntity(editing.id, data);
              toast.success(`${data.name} updated`);
            } else {
              addEntity(data);
              toast.success(`${data.name} added`);
            }
          }}
        />
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          title="Delete entity?"
          description={deleteTarget ? `This will remove "${deleteTarget.name}" from all dropdowns. Children will be re-parented.` : ""}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (!deleteTarget) return;
            deleteEntity(deleteTarget.id);
            toast.success("Entity deleted");
            setDeleteTarget(null);
          }}
        />
      </div>
    </AppLayout>
  );
}
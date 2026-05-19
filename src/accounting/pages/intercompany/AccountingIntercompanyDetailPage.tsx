import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftRight, Printer, Ban, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AccountingPageHeader from "@/accounting/components/shared/AccountingPageHeader";
import AccountingStatusBadge from "@/accounting/components/shared/AccountingStatusBadge";
import { useIntercompany, updateIntercompany, deleteIntercompany } from "@/accounting/stores/intercompanyStore";
import { useScopedEntities } from "../../hooks/useEntityScope";
import { useJournals, updateJournal } from "@/accounting/stores/journalsStore";
import { formatCurrency } from "@/accounting/lib/format";
import { asCurrency } from "@/accounting/lib/journalHelpers";

export default function AccountingIntercompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const txns = useIntercompany();
  const journals = useJournals();
  const entities = useScopedEntities();
  const [voidOpen, setVoidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const txn = txns.find((t) => t.id === id);
  if (!txn) {
    return (
      <AppLayout>
        <div className="p-6">
          <AccountingPageHeader title="Transaction not found" />
          <Button variant="outline" onClick={() => navigate("/accounting/intercompany")}>Back to list</Button>
        </div>
      </AppLayout>
    );
  }

  const entityName = (eid: string) => entities.find((e) => e.id === eid)?.name ?? eid;
  const fromJournal = journals.find((j) => j.id === txn.fromJournalId);
  const toJournal = journals.find((j) => j.id === txn.toJournalId);
  const cur = asCurrency(txn.currency);

  function handleVoid() {
    if (txn?.fromJournalId) updateJournal(txn.fromJournalId, { status: "VOIDED" });
    if (txn?.toJournalId) updateJournal(txn.toJournalId, { status: "VOIDED" });
    updateIntercompany(txn!.id, { status: "VOIDED" });
    toast.success("Transaction voided");
    setVoidOpen(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto print:p-0">
        <AccountingPageHeader
          title={txn.txnNumber}
          subtitle={txn.description}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> Print</Button>
              {txn.status === "POSTED" && (
                <Button variant="outline" onClick={() => setVoidOpen(true)} className="gap-2 text-destructive"><Ban className="size-4" /> Void</Button>
              )}
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          }
        />

        <div className="mb-4 flex items-center gap-3">
          <AccountingStatusBadge status={txn.status} />
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-center gap-4 text-lg font-medium mb-4">
            <span>{entityName(txn.fromEntity)}</span>
            <ArrowLeftRight className="size-5 text-primary" />
            <span>{entityName(txn.toEntity)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Date</div><div className="font-medium">{txn.txnDate}</div></div>
            <div><div className="text-xs text-muted-foreground">Currency</div><div className="font-medium">{txn.currency}</div></div>
            <div><div className="text-xs text-muted-foreground">Amount</div><div className="font-medium tabular-nums">{formatCurrency(txn.netAmount, cur)}</div></div>
            <div><div className="text-xs text-muted-foreground">FX rate</div><div className="font-medium">{txn.fxRate}</div></div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-6">
          {[
            { title: `${entityName(txn.fromEntity)} journal`, journal: fromJournal },
            null,
            { title: `${entityName(txn.toEntity)} journal`, journal: toJournal },
          ].map((slot, idx) => slot === null ? (
            <div key="arr" className="hidden md:flex justify-center">
              <ArrowLeftRight className="size-6 text-muted-foreground" />
            </div>
          ) : (
            <Card key={idx} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">{slot.title}</div>
                {slot.journal && <AccountingStatusBadge status={slot.journal.status} />}
              </div>
              {slot.journal ? (
                <>
                  <Link to={`/accounting/journals/${slot.journal.id}`} className="text-primary hover:underline text-sm">{slot.journal.entryNumber}</Link>
                  <table className="w-full text-xs mt-3">
                    <thead className="text-muted-foreground"><tr><th className="text-left py-1">Account</th><th className="text-right py-1">DR</th><th className="text-right py-1">CR</th></tr></thead>
                    <tbody>
                      {slot.journal.lines.map((l) => (
                        <tr key={l.id} className="border-t">
                          <td className="py-1.5">{l.accountCode} — {l.accountName}</td>
                          <td className="text-right tabular-nums">{l.debit ? formatCurrency(l.debit, cur) : "—"}</td>
                          <td className="text-right tabular-nums">{l.credit ? formatCurrency(l.credit, cur) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No journal posted (draft)</p>
              )}
            </Card>
          ))}
        </div>

        {txn.notes && (
          <Card className="p-4 mb-4"><div className="text-xs text-muted-foreground mb-1">Notes</div><p className="text-sm">{txn.notes}</p></Card>
        )}

        <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this transaction?</AlertDialogTitle>
              <AlertDialogDescription>Both linked journal entries will also be voided.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleVoid}>Void transaction</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will also void both linked journal entries. Cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (txn.fromJournalId) updateJournal(txn.fromJournalId, { status: "VOIDED" });
                  if (txn.toJournalId) updateJournal(txn.toJournalId, { status: "VOIDED" });
                  deleteIntercompany(txn.id);
                  setDeleteOpen(false);
                  toast.success("Deleted successfully");
                  navigate("/accounting/intercompany");
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
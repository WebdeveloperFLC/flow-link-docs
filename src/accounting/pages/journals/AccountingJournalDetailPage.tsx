import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Decimal from "decimal.js";
import { Check, FileText, Plus, Send, Trash2, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import { formatCurrency } from "../../lib/format";
import { Journal, AccountType } from "../../data/mockJournals";
import { useJournals, updateJournal, deleteJournal } from "../../stores/journalsStore";
import { useAllEntities } from "../../stores/accountingEntitiesStore";
import { entityDisplayName, findEntityByRef } from "../../lib/entityResolve";

const ACCOUNT_COLOR: Record<AccountType, string> = {
  ASSET: 'text-blue-600',
  LIABILITY: 'text-red-600',
  EQUITY: 'text-purple-600',
  REVENUE: 'text-green-600',
  EXPENSE: 'text-amber-600',
};

function fmtDate(s?: string) {
  if (!s) return '—';
  const d = s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s);
  return d.toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function AccountingJournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const journals = useJournals();
  const allEntities = useAllEntities();
  const entry = journals.find(j => j.id === id);
  const [voidOpen, setVoidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const entityLabel = useMemo(
    () => (entry ? entityDisplayName(entry.entity, allEntities) : "—"),
    [entry, allEntities],
  );
  const entityRow = useMemo(
    () => (entry ? findEntityByRef(entry.entity, allEntities) : undefined),
    [entry, allEntities],
  );

  const totals = useMemo(() => {
    if (!entry) return { dr: 0, cr: 0 };
    const dr = entry.lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
    const cr = entry.lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
    return { dr: dr.toNumber(), cr: cr.toNumber() };
  }, [entry]);

  if (!entry) {
    return (
      <AppLayout>
        <div className="p-8">
          <AccountingPageHeader title="Journal entry" subtitle="Accounting · Future Link Flow" />
          <AccountingEmptyState
            icon={FileText}
            title="Journal not found"
            description="This entry does not exist or has been removed."
            action={<Button onClick={() => navigate('/accounting/journals')}>Back to journals</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const confirmVoid = () => {
    if (!entry) return;
    updateJournal(entry.id, {
      status: 'VOIDED',
      voidedAt: new Date().toISOString(),
      voidReason: 'Voided from detail view',
    });
    toast.success(`${entry.entryNumber} voided`);
    setVoidOpen(false);
  };

  const confirmDelete = () => {
    if (!entry) return;
    deleteJournal(entry.id);
    toast.success(`${entry.entryNumber} deleted`);
    navigate('/accounting/journals');
  };

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <span>Accounting</span>
          <span className="mx-1.5">/</span>
          <Link to="/accounting/journals" className="hover:text-foreground hover:underline">Journal entries</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{entry.entryNumber}</span>
        </nav>
        <div className="flex items-center gap-3">
          <AccountingStatusBadge status={entry.status} />
          <Button variant="ghost" onClick={() => navigate('/accounting/journals')}>Back</Button>
          {entry.status === 'DRAFT' && (
            <Button variant="outline" onClick={() => navigate(`/accounting/journals/${entry.id}/edit`)}>Edit</Button>
          )}
          {entry.status === 'POSTED' && (
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setVoidOpen(true)}
            >
              Void
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{entry.entryNumber}</CardTitle>
            <AccountingStatusBadge status={entry.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <EntityField label="Entity" name={entityLabel} entityId={entityRow?.id} />
              <Field label="Entry date" value={fmtDate(entry.entryDate)} />
              <Field label="Source type" value={entry.sourceType.replace(/_/g, ' ')} />
              <Field label="Reference" value={entry.reference || '—'} />
              <Field label="Currency" value={entry.currency} />
              {entry.currency !== 'CAD' && <Field label="FX rate to CAD" value="1.0000" />}
              <Field label="Created by" value={entry.createdBy} />
              {entry.status === 'POSTED' && entry.postedAt && (
                <Field label="Posted at" value={fmtDate(entry.postedAt)} />
              )}
              {entry.status === 'VOIDED' && (
                <>
                  <Field label="Voided at" value={fmtDate(entry.voidedAt)} />
                  <Field label="Void reason" value={entry.voidReason || '—'} />
                </>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Narration</div>
              <div className="bg-muted rounded p-3 text-sm">{entry.narration}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Journal lines</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                  <th className="w-8 text-center">#</th>
                  <th className="text-left px-2">Account</th>
                  <th className="text-left px-2 w-32">Branch</th>
                  <th className="text-left px-2 w-24">Tax code</th>
                  <th className="text-left px-2">Description</th>
                  <th className="text-right px-2 w-32">Debit</th>
                  <th className="text-right px-2 w-32">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((l, i) => (
                  <tr key={l.id} className={cn(i % 2 === 1 && 'bg-muted/30')}>
                    <td className="text-center text-muted-foreground text-xs py-2">{i + 1}</td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{l.accountCode}</span>
                      <Link
                        to={`/accounting/reports/general-ledger/${l.accountId}`}
                        className={cn('font-medium hover:underline', ACCOUNT_COLOR[l.accountType])}
                      >
                        {l.accountName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{entityLabel}</td>
                    <td className="px-2 py-2 text-muted-foreground">{l.taxCode || '—'}</td>
                    <td className="px-2 py-2">{l.description}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">
                      {l.debit ? formatCurrency(l.debit, entry.currency) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">
                      {l.credit ? formatCurrency(l.credit, entry.currency) : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-b font-medium">
                  <td colSpan={5} className="text-right px-2 py-2">Totals</td>
                  <td className="text-right px-2 py-2 font-mono tabular-nums">{formatCurrency(totals.dr, entry.currency)}</td>
                  <td className="text-right px-2 py-2 font-mono tabular-nums">{formatCurrency(totals.cr, entry.currency)}</td>
                </tr>
              </tbody>
            </table>
            <div className="text-right text-sm text-green-600 font-medium mt-2">Balanced ✓</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Audit trail</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative">
              <TimelineEvent
                color="bg-blue-100 text-blue-600"
                icon={<Plus className="w-3 h-3" />}
                label={`Created by ${entry.createdBy}`}
                timestamp={`${fmtDate(entry.entryDate)} · 192.168.1.42`}
                last={entry.status === 'DRAFT'}
              />
              {entry.status !== 'DRAFT' && (
                <TimelineEvent
                  color="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  icon={<Send className="w-3 h-3" />}
                  label="Submitted for review"
                  timestamp={`${fmtDate(entry.entryDate)} · 192.168.1.42`}
                  last={entry.status === 'PENDING_REVIEW'}
                />
              )}
              {(entry.status === 'POSTED' || entry.status === 'VOIDED') && entry.postedAt && (
                <TimelineEvent
                  color="bg-green-100 text-green-600"
                  icon={<Check className="w-3 h-3" />}
                  label="Posted by Finance Admin"
                  timestamp={`${fmtDate(entry.postedAt)} · 10.0.0.15`}
                  last={entry.status === 'POSTED'}
                />
              )}
              {entry.status === 'VOIDED' && (
                <TimelineEvent
                  color="bg-red-100 text-red-600"
                  icon={<X className="w-3 h-3" />}
                  label={`Voided — ${entry.voidReason || 'no reason given'}`}
                  timestamp={fmtDate(entry.voidedAt)}
                  last
                />
              )}
            </ol>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void journal entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void {entry.entryNumber}? This cannot be undone and will create a reversal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entry.status === 'POSTED' ? 'Delete posted journal entry?' : 'Delete this record?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {entry.status === 'POSTED'
                ? 'Warning: This journal has been posted. Deleting it will affect your trial balance and general ledger. During testing this is allowed.'
                : 'This action cannot be undone. The record will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {entry.status === 'POSTED' ? 'Delete anyway' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function EntityField({ label, name, entityId }: { label: string; name: string; entityId?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">
        {entityId ? (
          <Link to="/accounting/settings/entities" className="text-primary hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function TimelineEvent({
  color, icon, label, timestamp, last,
}: { color: string; icon: React.ReactNode; label: string; timestamp: string; last?: boolean }) {
  return (
    <li className="flex gap-3 pb-4 relative">
      {!last && <span className="absolute border-l-2 border-muted h-full left-3.5 top-7" />}
      <div className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs z-10", color)}>
        {icon}
      </div>
      <div className="pt-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{timestamp}</div>
      </div>
    </li>
  );
}

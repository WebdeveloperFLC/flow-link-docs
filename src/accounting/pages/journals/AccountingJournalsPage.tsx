import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Decimal from "decimal.js";
import { Download, MoreHorizontal, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingStatusBadge from "../../components/shared/AccountingStatusBadge";
import { formatCurrency } from "../../lib/format";
import {
  MOCK_JOURNALS, Journal, JournalStatus, SourceType,
} from "../../data/mockJournals";

const ALL_STATUSES: JournalStatus[] = ['DRAFT', 'PENDING_REVIEW', 'POSTED', 'VOIDED'];
const ENTITIES = ['Canada HQ', 'USA Corp', 'India Mumbai', 'India Delhi'];
const PAGE_SIZE = 15;

const SOURCE_BADGE: Record<SourceType, string> = {
  MANUAL: 'bg-muted text-muted-foreground',
  OCR_UPLOAD: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  AP: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  AR: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
};

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function lineTotals(j: Journal) {
  const dr = j.lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
  const cr = j.lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
  return { dr: dr.toNumber(), cr: cr.toNumber() };
}

export default function AccountingJournalsPage() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<Journal[]>(MOCK_JOURNALS);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<Set<JournalStatus>>(new Set());
  const [entity, setEntity] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [voidTarget, setVoidTarget] = useState<Journal | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journals.filter(j => {
      if (q && !(j.narration.toLowerCase().includes(q) || j.reference.toLowerCase().includes(q))) return false;
      if (statuses.size > 0 && !statuses.has(j.status)) return false;
      if (entity !== 'all' && j.entity !== entity) return false;
      return true;
    });
  }, [journals, search, statuses, entity]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleStatus = (s: JournalStatus) => {
    const next = new Set(statuses);
    if (next.has(s)) next.delete(s); else next.add(s);
    setStatuses(next);
    setPage(1);
  };

  const exportCSV = () => {
    const header = ['Entry #', 'Date', 'Entity', 'Narration', 'Source', 'Currency', 'Total DR', 'Total CR', 'Status'];
    const rows = filtered.map(j => {
      const t = lineTotals(j);
      return [
        j.entryNumber, j.entryDate, j.entity,
        `"${j.narration.replace(/"/g, '""')}"`,
        j.sourceType, j.currency, t.dr.toFixed(2), t.cr.toFixed(2), j.status,
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };

  const confirmVoid = () => {
    if (!voidTarget) return;
    setJournals(prev => prev.map(j =>
      j.id === voidTarget.id
        ? { ...j, status: 'VOIDED', voidedAt: new Date().toISOString(), voidReason: 'Voided from list' }
        : j
    ));
    toast.success(`${voidTarget.entryNumber} voided`);
    setVoidTarget(null);
  };

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Journal entries"
          subtitle="Accounting · Future Link Flow"
          actions={
            <Button onClick={() => navigate('/accounting/journals/new')}>
              <Plus className="w-4 h-4 mr-1" /> New journal entry
            </Button>
          }
        />

        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Search narration, reference…"
            className="w-64"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {statuses.size === 0 ? 'Status' : `Status (${statuses.size})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_STATUSES.map(s => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statuses.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                >
                  {s.replace(/_/g, ' ')}
                </DropdownMenuCheckboxItem>
              ))}
              {statuses.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setStatuses(new Set()); setPage(1); }}>
                    Clear
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Showing {filtered.length} of {journals.length} entries
        </p>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
              <tr className="h-10">
                <th className="text-left px-3 w-32">Entry #</th>
                <th className="text-left px-3 w-28">Date</th>
                <th className="text-left px-3 w-32">Entity</th>
                <th className="text-left px-3">Narration</th>
                <th className="text-left px-3 w-28">Source</th>
                <th className="text-center px-3 w-16">Cur</th>
                <th className="text-right px-3 w-28">Total DR</th>
                <th className="text-right px-3 w-28">Total CR</th>
                <th className="text-left px-3 w-32">Status</th>
                <th className="px-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((j, idx) => {
                const t = lineTotals(j);
                return (
                  <tr
                    key={j.id}
                    className={`h-11 hover:bg-muted/50 cursor-pointer ${idx < paged.length - 1 ? 'border-b' : ''}`}
                    onClick={() => navigate(`/accounting/journals/${j.id}`)}
                  >
                    <td className="px-3">
                      <span
                        className="text-blue-600 hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/accounting/journals/${j.id}`); }}
                      >
                        {j.entryNumber}
                      </span>
                    </td>
                    <td className="px-3">{fmtDate(j.entryDate)}</td>
                    <td className="px-3">{j.entity}</td>
                    <td className="px-3 max-w-0 truncate" title={j.narration}>{j.narration}</td>
                    <td className="px-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SOURCE_BADGE[j.sourceType]}`}>
                        {j.sourceType}
                      </span>
                    </td>
                    <td className="px-3 text-center">{j.currency}</td>
                    <td className="px-3 text-right font-mono tabular-nums">{formatCurrency(t.dr, j.currency)}</td>
                    <td className="px-3 text-right font-mono tabular-nums">{formatCurrency(t.cr, j.currency)}</td>
                    <td className="px-3"><AccountingStatusBadge status={j.status} /></td>
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/accounting/journals/${j.id}`)}>
                            View
                          </DropdownMenuItem>
                          {j.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => navigate(`/accounting/journals/${j.id}/edit`)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {j.status === 'POSTED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setVoidTarget(j)}
                              >
                                Void
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No entries match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-3 text-sm">
          <span className="text-muted-foreground">Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void journal entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void {voidTarget?.entryNumber}? This cannot be undone and will create a reversal entry.
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
    </AppLayout>
  );
}

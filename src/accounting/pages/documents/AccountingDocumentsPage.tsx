import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Image as ImageIcon, FileSpreadsheet, MoreHorizontal,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { MockDocument, OCRStatus, ApprovalStatus, DocType } from "../../data/mockDocuments";
import { useDocuments, updateDocument, deleteDocument } from "../../stores/documentsStore";

const ENTITIES = ['Canada HQ', 'USA Corp', 'India Mumbai', 'India Delhi'];
const DOC_TYPES: DocType[] = [
  'INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'BILL', 'CHALLAN',
  'TAX_NOTICE', 'PAYMENT_PROOF', 'CONTRACT', 'EXPENSE_SLIP', 'OTHER',
];
const PAGE_SIZE = 15;

const DOC_TYPE_BADGE: Record<DocType, string> = {
  INVOICE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  RECEIPT: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  BANK_STATEMENT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  BILL: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  CHALLAN: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  TAX_NOTICE: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  PAYMENT_PROOF: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CONTRACT: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  EXPENSE_SLIP: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  OTHER: 'bg-muted text-muted-foreground',
};

const OCR_BADGE: Record<OCRStatus, { cls: string; label: string; pulse?: boolean }> = {
  PENDING: { cls: 'bg-muted text-muted-foreground', label: 'Pending' },
  PROCESSING: { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', label: 'Processing', pulse: true },
  COMPLETE: { cls: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', label: 'Complete' },
  FAILED: { cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400', label: 'Failed' },
};
const APPROVAL_BADGE: Record<ApprovalStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  APPROVED: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  REJECTED: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
};

function fileIcon(t: 'pdf' | 'image' | 'excel') {
  if (t === 'pdf') return FileText;
  if (t === 'excel') return FileSpreadsheet;
  return ImageIcon;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function entryNumberOf(jid: string) {
  const n = jid.replace(/^je/, '').padStart(4, '0');
  return `JE-2024-${n}`;
}

export default function AccountingDocumentsPage() {
  const navigate = useNavigate();
  const docs = useDocuments();
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('all');
  const [entity, setEntity] = useState('all');
  const [ocr, setOcr] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<null | { kind: 'reject' | 'delete'; doc: MockDocument }>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d => {
      if (q) {
        const hay = [
          d.filename, d.linkedVendor || '',
          d.extracted?.vendorName || '', d.extracted?.invoiceNumber || '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (docType !== 'all' && d.docType !== docType) return false;
      if (entity !== 'all' && d.entity !== entity) return false;
      if (ocr !== 'all' && d.ocrStatus !== ocr) return false;
      const ts = d.uploadedAt.slice(0, 10);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [docs, search, docType, entity, ocr, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const doConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'reject') {
      updateDocument(confirm.doc.id, { approvalStatus: 'REJECTED' });
      toast.success(`${confirm.doc.filename} rejected`);
    } else {
      deleteDocument(confirm.doc.id);
      toast.success(`${confirm.doc.filename} deleted`);
    }
    setConfirm(null);
  };

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Document library"
          subtitle="Accounting · Future Link Flow"
          actions={
            <Button onClick={() => navigate('/accounting/documents/upload')}>
              Upload documents
            </Button>
          }
        />

        <Card className="mb-4">
          <CardContent className="p-4 flex flex-wrap gap-3 items-end">
            <Input
              placeholder="Search filename, vendor, invoice…"
              className="w-64"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <Select value={docType} onValueChange={(v) => { setDocType(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ocr} onValueChange={(v) => { setOcr(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OCR</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">From</span>
              <Input type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">To</span>
              <Input type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mb-3">
          Showing {filtered.length} of {docs.length} documents
        </p>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
              <tr className="h-10">
                <th className="text-left px-3 w-64">File</th>
                <th className="text-left px-3 w-28">Type</th>
                <th className="text-left px-3 w-28">Entity</th>
                <th className="text-left px-3 w-36">Vendor / Client</th>
                <th className="text-left px-3 w-32">Linked to</th>
                <th className="text-left px-3 w-28">Uploaded</th>
                <th className="text-left px-3 w-28">OCR</th>
                <th className="text-left px-3 w-24">Approval</th>
                <th className="px-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((d, i) => {
                const Icon = fileIcon(d.fileType);
                const vendor = d.extracted?.vendorName || d.linkedVendor || d.linkedClient || '';
                const ocrB = OCR_BADGE[d.ocrStatus];
                return (
                  <tr key={d.id} className={cn("h-12 hover:bg-muted/40", i < paged.length - 1 && "border-b")}>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm truncate" title={d.filename}>{trunc(d.filename, 30)}</div>
                          <div className="text-xs text-muted-foreground">{d.fileSizeKB} KB</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", DOC_TYPE_BADGE[d.docType])}>
                        {d.docType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3">{d.entity}</td>
                    <td className="px-3">
                      {vendor ? <span className="text-sm">{vendor}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3">
                      {d.linkedJournalId ? (
                        <button
                          onClick={() => navigate(`/accounting/journals/${d.linkedJournalId}`)}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 hover:underline"
                        >
                          {entryNumberOf(d.linkedJournalId)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3">
                      <div className="text-sm">{d.uploadedBy}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(d.uploadedAt)}</div>
                    </td>
                    <td className="px-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", ocrB.cls)}>
                        {ocrB.pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        {ocrB.label}
                      </span>
                    </td>
                    <td className="px-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", APPROVAL_BADGE[d.approvalStatus])}>
                        {d.approvalStatus.charAt(0) + d.approvalStatus.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info(`Opening ${d.filename}`)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success(`Downloading ${d.filename}`)}>Download</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/accounting/journals')}>Link to journal</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirm({ kind: 'reject', doc: d })}
                          >
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirm({ kind: 'delete', doc: d })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No documents match your filters</td></tr>
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

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'delete' ? 'Delete document?' : 'Reject document?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'delete'
                ? 'Are you sure? This cannot be undone.'
                : `${confirm?.doc.filename} will be marked as rejected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={doConfirm}
            >
              {confirm?.kind === 'delete' ? 'Delete' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

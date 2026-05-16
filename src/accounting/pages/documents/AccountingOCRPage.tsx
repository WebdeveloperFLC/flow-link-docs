import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Download, RefreshCw, CheckCircle, AlertTriangle, AlertCircle,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import {
  MockDocument, OCRStatus, ExtractedData,
} from "../../data/mockDocuments";
import {
  useDocuments, updateDocument, deleteDocument, getDocumentFile,
} from "../../stores/documentsStore";
import { extractCardStatement, mapToCardStatementLines } from "../../lib/extractCardStatement";
import { MOCK_ACCOUNTS } from "../../data/mockJournals";

const ENTITIES = ['Canada HQ', 'USA Corp', 'India Mumbai', 'India Delhi'];
const TAX_CODES = ['GST-5%', 'HST-13%', 'IGST-18%', 'CGST-9%', 'SGST-9%', 'TDS-10%', 'TCS-1%'];
const DOC_TYPES: MockDocument['docType'][] = [
  'INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'BILL', 'CHALLAN',
  'TAX_NOTICE', 'PAYMENT_PROOF', 'CONTRACT', 'EXPENSE_SLIP', 'OTHER',
];
const PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'UPI', 'Other'];

type FilterMode = 'all' | 'review' | 'complete' | 'failed';

export default function AccountingOCRPage() {
  const navigate = useNavigate();
  const docs = useDocuments();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [index, setIndex] = useState(0);
  // Field edits keyed by doc id
  const [edits, setEdits] = useState<Record<string, Partial<ExtractedData> & { docType?: MockDocument['docType']; entity?: string }>>({});
  const [confirm, setConfirm] = useState<null | 'duplicate' | 'reject'>(null);

  const queue = useMemo(() => {
    return docs.filter(d => {
      if (filter === 'all') return true;
      if (filter === 'complete') return d.ocrStatus === 'COMPLETE';
      if (filter === 'failed') return d.ocrStatus === 'FAILED';
      // review = PENDING + PROCESSING + low-confidence COMPLETE
      return d.ocrStatus !== 'COMPLETE' || (d.extracted?.confidence ?? 1) < 0.85;
    });
  }, [docs, filter]);

  useEffect(() => { setIndex(0); }, [filter]);

  const counts = useMemo(() => ({
    complete: docs.filter(d => d.ocrStatus === 'COMPLETE').length,
    processing: docs.filter(d => d.ocrStatus === 'PROCESSING').length,
    pending: docs.filter(d => d.ocrStatus === 'PENDING').length,
    failed: docs.filter(d => d.ocrStatus === 'FAILED').length,
  }), [docs]);

  const current = queue[index];

  if (!current) {
    return (
      <AppLayout>
        <div className="p-8">
          <AccountingPageHeader
            title="OCR review queue"
            subtitle="0 documents awaiting review"
          />
          <StatPills counts={counts} />
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No documents match the current filter.
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const ext = current.extracted;
  const e = edits[current.id] ?? {};
  const fc = (key: string) => ext?.fieldConfidences?.[key];
  const conf = ext?.confidence ?? 0;

  const setField = <K extends keyof (ExtractedData & { docType: MockDocument['docType']; entity: string })>(key: K, value: any) => {
    setEdits(prev => ({ ...prev, [current.id]: { ...prev[current.id], [key]: value } }));
  };

  const advance = () => setIndex(i => Math.min(queue.length - 1, i + 1));
  const back = () => setIndex(i => Math.max(0, i - 1));

  const removeFromQueue = (msg: string) => {
    if (confirm === 'reject') {
      updateDocument(current.id, { approvalStatus: 'REJECTED', ocrStatus: 'COMPLETE' });
    } else {
      // mark as duplicate then drop
      deleteDocument(current.id);
    }
    setIndex(i => Math.min(i, Math.max(0, queue.length - 2)));
    toast.success(msg);
    setConfirm(null);
  };

  const reRunOCR = async () => {
    const file = getDocumentFile(current.id);
    if (!file) {
      toast.error('Original file is no longer in session. Please re-upload to re-extract.');
      return;
    }
    updateDocument(current.id, { ocrStatus: 'PROCESSING' as OCRStatus });
    try {
      const result = await extractCardStatement(file, {});
      if (!result.success || result.transactions.length === 0) {
        updateDocument(current.id, {
          ocrStatus: 'FAILED',
          ocrError: result.errors?.[0] ?? 'No transactions found',
        });
        toast.error('OCR re-run failed');
        return;
      }
      updateDocument(current.id, {
        ocrStatus: 'COMPLETE',
        docType: 'BANK_STATEMENT',
        extracted: {
          vendorName: result.meta.cardHolderName || 'Bank statement',
          invoiceNumber: result.meta.cardLast4 ? `••${result.meta.cardLast4}` : undefined,
          invoiceDate: result.meta.statementFrom,
          dueDate: result.meta.statementTo,
          subtotal: result.meta.openingBalance,
          totalAmount: result.meta.closingBalance,
          currency: result.meta.currency || 'CAD',
          confidence: 0.9,
        },
        lineItems: result.transactions,
      });
      toast.success(`Re-extracted ${result.transactions.length} transactions`);
    } catch (e) {
      updateDocument(current.id, {
        ocrStatus: 'FAILED',
        ocrError: e instanceof Error ? e.message : 'Extraction failed',
      });
      toast.error('OCR re-run failed');
    }
  };

  const sendToCardReconciliation = () => {
    if (!current.lineItems || current.lineItems.length === 0) {
      toast.error('No extracted transactions to send');
      return;
    }
    const lines = mapToCardStatementLines(
      current.lineItems,
      current.extracted?.currency || 'CAD',
    );
    try {
      sessionStorage.setItem(
        'pending-card-statement',
        JSON.stringify({
          docId: current.id,
          filename: current.filename,
          meta: {
            statementFrom: current.extracted?.invoiceDate,
            statementTo: current.extracted?.dueDate,
            openingBalance: current.extracted?.subtotal,
            closingBalance: current.extracted?.totalAmount,
            currency: current.extracted?.currency || 'CAD',
          },
          lines,
        }),
      );
    } catch {}
    navigate('/accounting/card-reconciliation/new');
  };

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="OCR review queue"
          subtitle={`${counts.pending + counts.processing + queue.filter(d => d.ocrStatus === 'COMPLETE' && (d.extracted?.confidence ?? 1) < 0.85).length} documents awaiting review`}
        />

        <StatPills counts={counts} />

        <Card className="mb-4">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={index <= 0} onClick={back}>← Previous</Button>
              <span className="text-sm text-muted-foreground">{index + 1} of {queue.length} documents</span>
              <Button variant="outline" size="sm" disabled={index >= queue.length - 1} onClick={advance}>Next →</Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="review">Needs review</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={advance}>Skip</Button>
            </div>
          </CardContent>
        </Card>

        {ext && <ConfidenceBanner confidence={conf} />}

        {ext?.isDuplicateSuspected && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center gap-2 mb-3 dark:bg-amber-500/10 dark:border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-900 dark:text-amber-200 flex-1">
              Possible duplicate detected — similar document already exists (Doc #{ext.duplicateOfId})
            </span>
            <button
              className="text-sm text-amber-700 dark:text-amber-300 hover:underline font-medium"
              onClick={() => {
                const idx = queue.findIndex(q => q.id === ext.duplicateOfId);
                if (idx >= 0) setIndex(idx);
                else toast.info(`Original doc ${ext.duplicateOfId} is in the library`);
              }}
            >
              View original
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT — preview */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base truncate">{current.filename}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => toast.success(`Downloading ${current.filename}`)}>
                <Download className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-muted rounded-lg flex flex-col items-center justify-center gap-3 p-6">
                <FileText className="w-12 h-12 text-muted-foreground/40" />
                <div className="text-sm text-muted-foreground text-center break-all">{current.filename}</div>
                <div className="text-xs text-muted-foreground">Page 1 of 2</div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" disabled>← Page</Button>
                  <Button variant="outline" size="sm">Page →</Button>
                  <Button variant="ghost" size="sm"><ZoomIn className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><ZoomOut className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <LegendDot color="bg-blue-500" label="Vendor name" />
                <LegendDot color="bg-green-500" label="Amount" />
                <LegendDot color="bg-amber-500" label="Tax" />
                <LegendDot color="bg-red-500" label="Low confidence" />
              </div>
            </CardContent>
          </Card>

          {/* RIGHT — fields */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Extracted fields</CardTitle>
              <Button variant="ghost" size="sm" onClick={reRunOCR}>
                <RefreshCw className="w-4 h-4 mr-1" /> Re-run OCR
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!ext && (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No extracted data available {current.ocrStatus === 'FAILED' ? '— OCR failed for this document.' : '— still processing.'}
                </div>
              )}
              {ext && (
                <>
                  <FieldRow label="Document type">
                    <Select value={(e.docType as string) ?? current.docType} onValueChange={(v) => setField('docType', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Vendor name" confidence={fc('vendorName')}>
                    <Input
                      value={(e.vendorName as string) ?? ext.vendorName ?? ''}
                      onChange={(ev) => setField('vendorName', ev.target.value)}
                      className={cn('h-9', isLow(fc('vendorName')) && 'border-amber-300')}
                    />
                  </FieldRow>

                  <FieldRow label="Invoice number" confidence={fc('invoiceNumber')}>
                    <Input
                      value={(e.invoiceNumber as string) ?? ext.invoiceNumber ?? ''}
                      onChange={(ev) => setField('invoiceNumber', ev.target.value)}
                      className={cn('h-9', isLow(fc('invoiceNumber')) && 'border-amber-300')}
                    />
                  </FieldRow>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Invoice date" confidence={fc('invoiceDate')}>
                      <Input
                        type="date"
                        value={(e.invoiceDate as string) ?? ext.invoiceDate ?? ''}
                        onChange={(ev) => setField('invoiceDate', ev.target.value)}
                        className={cn('h-9', isLow(fc('invoiceDate')) && 'border-amber-300')}
                      />
                    </FieldRow>
                    <FieldRow label="Due date" confidence={fc('dueDate')}>
                      <Input
                        type="date"
                        value={(e.dueDate as string) ?? ext.dueDate ?? ''}
                        onChange={(ev) => setField('dueDate', ev.target.value)}
                        className={cn('h-9', isLow(fc('dueDate')) && 'border-amber-300')}
                      />
                    </FieldRow>
                  </div>

                  <FieldRow label="Subtotal" confidence={fc('subtotal')}>
                    <Input
                      type="number" step="0.01"
                      value={(e.subtotal as number) ?? ext.subtotal ?? ''}
                      onChange={(ev) => setField('subtotal', parseFloat(ev.target.value) || 0)}
                      className={cn('h-9 text-right tabular-nums', isLow(fc('subtotal')) && 'border-amber-300')}
                    />
                  </FieldRow>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Tax type">
                      <Select value={(e.taxType as string) ?? ext.taxType ?? 'none'} onValueChange={(v) => setField('taxType', v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {TAX_CODES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Tax amount" confidence={fc('taxAmount')}>
                      <Input
                        type="number" step="0.01"
                        value={(e.taxAmount as number) ?? ext.taxAmount ?? ''}
                        onChange={(ev) => setField('taxAmount', parseFloat(ev.target.value) || 0)}
                        className={cn('h-9 text-right tabular-nums', isLow(fc('taxAmount')) && 'border-amber-300')}
                      />
                    </FieldRow>
                  </div>

                  <FieldRow label="Total amount" bold confidence={fc('totalAmount')}>
                    <Input
                      type="number" step="0.01"
                      value={(e.totalAmount as number) ?? ext.totalAmount ?? ''}
                      onChange={(ev) => setField('totalAmount', parseFloat(ev.target.value) || 0)}
                      className={cn('h-9 text-right tabular-nums font-medium', isLow(fc('totalAmount')) && 'border-amber-300')}
                    />
                  </FieldRow>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Currency">
                      <Select value={(e.currency as string) ?? ext.currency ?? 'CAD'} onValueChange={(v) => setField('currency', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Payment mode">
                      <Select value={(e.paymentMode as string) ?? ext.paymentMode ?? 'none'} onValueChange={(v) => setField('paymentMode', v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  </div>

                  <FieldRow label="Suggested GL account">
                    <Select value={(e.suggestedLedger as string) ?? ext.suggestedLedger ?? ''} onValueChange={(v) => setField('suggestedLedger', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select account…" /></SelectTrigger>
                      <SelectContent>
                        {MOCK_ACCOUNTS.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Tax code">
                      <Select value={(e.suggestedTaxCode as string) ?? ext.suggestedTaxCode ?? 'none'} onValueChange={(v) => setField('suggestedTaxCode', v === 'none' ? '' : v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {TAX_CODES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Branch">
                      <Select value={(e.entity as string) ?? current.entity} onValueChange={(v) => setField('entity', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ENTITIES.map(en => <SelectItem key={en} value={en}>{en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2 pt-3 border-t">
                <Button onClick={() => {
                  const merged: any = { ...(ext ?? {}), ...(edits[current.id] ?? {}) };
                  const params = new URLSearchParams({
                    vendor: merged.vendorName ?? '',
                    amount: String(merged.totalAmount ?? ''),
                    date: merged.invoiceDate ?? '',
                    taxCode: merged.suggestedTaxCode ?? '',
                    glAccount: merged.suggestedLedger ?? '',
                    currency: merged.currency ?? 'CAD',
                    reference: merged.invoiceNumber ?? '',
                    narration: [merged.vendorName, merged.documentType, merged.invoiceNumber]
                      .filter(Boolean).join(' — '),
                    sourceType: 'OCR_UPLOAD',
                  });
                  navigate(`/accounting/journals/new?${params}`);
                }}>Create journal entry</Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive flex-1"
                    onClick={() => setConfirm('duplicate')}
                  >
                    Mark as duplicate
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={advance}>Skip</Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive flex-1"
                    onClick={() => setConfirm('reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'duplicate' ? 'Mark as duplicate?' : 'Reject document?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'duplicate'
                ? 'This document will be flagged and removed from the review queue.'
                : 'This document will be rejected and removed from the review queue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeFromQueue(confirm === 'duplicate' ? 'Marked as duplicate' : 'Document rejected')}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function isLow(c?: number) { return c === undefined || c < 0.65; }

function StatPills({ counts }: { counts: { complete: number; processing: number; pending: number; failed: number } }) {
  return (
    <div className="flex gap-3 mb-4">
      <Pill cls="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">Complete: {counts.complete}</Pill>
      <Pill cls="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Processing: {counts.processing}</Pill>
      <Pill cls="bg-muted text-muted-foreground">Pending: {counts.pending}</Pill>
      <Pill cls="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">Failed: {counts.failed}</Pill>
    </div>
  );
}
function Pill({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", cls)}>{children}</span>;
}

function ConfidenceBanner({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2 mb-3 dark:bg-green-500/10 dark:border-green-500/30">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-900 dark:text-green-300">
          High confidence extraction ({Math.round(confidence * 100)}%) — review and confirm
        </span>
      </div>
    );
  }
  if (confidence >= 0.65) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 mb-3 dark:bg-amber-500/10 dark:border-amber-500/30">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-900 dark:text-amber-200">
          Medium confidence — some fields need attention
        </span>
      </div>
    );
  }
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2 mb-3 dark:bg-red-500/10 dark:border-red-500/30">
      <AlertCircle className="w-4 h-4 text-destructive" />
      <span className="text-sm text-red-900 dark:text-red-300">
        Low confidence — manual review required
      </span>
    </div>
  );
}

function FieldRow({
  label, children, confidence, bold,
}: { label: string; children: React.ReactNode; confidence?: number; bold?: boolean }) {
  let indicator: React.ReactNode = null;
  if (confidence !== undefined) {
    if (confidence < 0.65) {
      indicator = <span className="inline-flex items-center gap-1 text-xs text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Low confidence</span>;
    } else if (confidence < 0.85) {
      indicator = <span className="inline-flex items-center gap-1 text-xs text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Medium confidence</span>;
    }
  } else {
    // undefined confidence treated as low when displayed
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className={cn("text-xs text-muted-foreground", bold && "font-semibold text-foreground")}>{label}</Label>
        {indicator}
      </div>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      {label}
    </span>
  );
}

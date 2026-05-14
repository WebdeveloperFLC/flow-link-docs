import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileText, Image as ImageIcon, FileSpreadsheet,
  CheckCircle, X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { MOCK_DOCUMENTS, MockDocument, OCRStatus } from "../../data/mockDocuments";

type QStatus = 'queued' | 'uploading' | 'complete' | 'error';
interface QFile {
  id: string;
  file: File;
  name: string;
  sizeKB: number;
  type: 'pdf' | 'image' | 'excel';
  status: QStatus;
  progress: number;
}

function detectType(name: string): 'pdf' | 'image' | 'excel' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  return 'image';
}
function fileIcon(t: 'pdf' | 'image' | 'excel') {
  if (t === 'pdf') return FileText;
  if (t === 'excel') return FileSpreadsheet;
  return ImageIcon;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const OCR_BADGE: Record<OCRStatus, { cls: string; label: string; pulse?: boolean }> = {
  PENDING: { cls: 'bg-muted text-muted-foreground', label: 'Pending' },
  PROCESSING: { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', label: 'Processing', pulse: true },
  COMPLETE: { cls: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', label: 'Complete' },
  FAILED: { cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400', label: 'Failed' },
};

function OCRBadge({ status }: { status: OCRStatus }) {
  const b = OCR_BADGE[status];
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", b.cls)}>
      {b.pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {b.label}
    </span>
  );
}

export default function AccountingUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);

  const recent = useMemo(
    () => [...MOCK_DOCUMENTS].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 10),
    []
  );

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    setDone(false);
    const next: QFile[] = Array.from(fl).map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f, name: f.name, sizeKB: Math.round(f.size / 1024),
      type: detectType(f.name), status: 'queued' as QStatus, progress: 0,
    }));
    setQueue(prev => [...prev, ...next]);
  };

  const removeOne = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));
  const clearAll = () => { setQueue([]); setDone(false); };

  const uploadAll = () => {
    const queued = queue.filter(q => q.status === 'queued' || q.status === 'error');
    if (!queued.length) return;
    queued.forEach((q) => {
      setQueue(prev => prev.map(p => p.id === q.id ? { ...p, status: 'uploading', progress: 0 } : p));
      const iv = setInterval(() => {
        setQueue(prev => {
          const target = prev.find(p => p.id === q.id);
          if (!target) { clearInterval(iv); return prev; }
          const next = Math.min(100, target.progress + 8 + Math.random() * 6);
          if (next >= 100) {
            clearInterval(iv);
            const updated = prev.map(p => p.id === q.id ? { ...p, status: 'complete' as QStatus, progress: 100 } : p);
            const allDone = updated.every(p => p.status === 'complete');
            if (allDone) {
              setTimeout(() => {
                toast.success(`${updated.length} files uploaded and queued for OCR processing`);
                setDone(true);
              }, 100);
            }
            return updated;
          }
          return prev.map(p => p.id === q.id ? { ...p, progress: next } : p);
        });
      }, 100);
    });
  };

  const reset = () => { setQueue([]); setDone(false); };

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Upload centre"
          subtitle="Accounting · Documents & OCR"
          actions={
            <Button variant="outline" onClick={() => navigate('/accounting/documents')}>
              View document library
            </Button>
          }
        />

        <Card className="mb-6">
          <CardContent className="p-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={cn(
                "min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/20 transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary"
              )}
            >
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-base font-medium">Drop files here to upload</div>
              <div className="text-sm text-muted-foreground">PDF · Images (JPG, PNG) · Excel · CSV</div>
              <div className="text-xs text-muted-foreground -mt-1">Maximum 20MB per file · Up to 10 files</div>
              <div className="text-xs text-muted-foreground">or</div>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse files
              </Button>
              <input
                ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv"
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }}
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {['PDF', 'JPG', 'PNG', 'XLSX', 'CSV'].map(t => (
                <span key={t} className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {queue.length > 0 && !done && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Upload queue ({queue.length} files)</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={uploadAll}>Upload all</Button>
                  <Button size="sm" variant="ghost" onClick={clearAll}>Clear all</Button>
                </div>
              </div>
              <div>
                {queue.map((q) => {
                  const Icon = fileIcon(q.type);
                  const barColor =
                    q.status === 'complete' ? 'bg-green-500' :
                    q.status === 'error' ? 'bg-destructive' :
                    q.status === 'uploading' ? 'bg-primary' : 'bg-muted';
                  const barWidth =
                    q.status === 'complete' || q.status === 'error' ? 100 :
                    q.status === 'uploading' ? q.progress : 0;
                  return (
                    <div key={q.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{q.name}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{q.sizeKB} KB</span>
                      <div className="w-32 h-1.5 bg-muted rounded overflow-hidden">
                        <div className={cn("h-full rounded transition-all", barColor)} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className={cn(
                        "text-xs w-16 text-right",
                        q.status === 'complete' && 'text-green-600',
                        q.status === 'error' && 'text-destructive',
                      )}>
                        {q.status === 'queued' && 'Queued'}
                        {q.status === 'uploading' && `${Math.round(q.progress)}%`}
                        {q.status === 'complete' && '✓ Done'}
                        {q.status === 'error' && 'Failed'}
                      </span>
                      {(q.status === 'queued' || q.status === 'error') ? (
                        <button onClick={() => removeOne(q.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      ) : <span className="w-4" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {done && (
          <Card className="mb-6">
            <CardContent className="p-8 flex flex-col items-center text-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="text-base font-medium">{queue.length} files uploaded successfully</div>
              <p className="text-sm text-muted-foreground max-w-md">
                Documents are queued for OCR processing. Review extracted data in the OCR queue.
              </p>
              <div className="flex gap-2 mt-2">
                <Button onClick={() => navigate('/accounting/documents/ocr')}>Review OCR queue</Button>
                <Button variant="outline" onClick={reset}>Upload more</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Recent uploads</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                  <tr className="h-10">
                    <th className="text-left px-3">Filename</th>
                    <th className="text-left px-3 w-32">Type</th>
                    <th className="text-left px-3 w-28">Entity</th>
                    <th className="text-left px-3 w-32">Uploaded by</th>
                    <th className="text-left px-3 w-24">Date</th>
                    <th className="text-left px-3 w-28">OCR</th>
                    <th className="text-left px-3 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d, i) => (
                    <tr key={d.id} className={cn(i < recent.length - 1 && "border-b")}>
                      <td className="px-3 py-2 truncate max-w-0" title={d.filename}>{d.filename}</td>
                      <td className="px-3 py-2"><DocTypeBadge type={d.docType} /></td>
                      <td className="px-3 py-2">{d.entity}</td>
                      <td className="px-3 py-2">{d.uploadedBy}</td>
                      <td className="px-3 py-2">{fmtDate(d.uploadedAt)}</td>
                      <td className="px-3 py-2"><OCRBadge status={d.ocrStatus} /></td>
                      <td className="px-3 py-2">
                        {(d.ocrStatus === 'COMPLETE' || d.ocrStatus === 'FAILED') && (
                          <button
                            onClick={() => navigate('/accounting/documents/ocr')}
                            className="text-blue-600 hover:underline text-xs mr-3"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/accounting/documents')}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

const DOC_TYPE_BADGE: Record<MockDocument['docType'], string> = {
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

function DocTypeBadge({ type }: { type: MockDocument['docType'] }) {
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", DOC_TYPE_BADGE[type])}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export { OCRBadge, DocTypeBadge };

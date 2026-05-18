import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import Decimal from "decimal.js";
import { Check, ChevronsUpDown, Plus, Upload, X, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../../lib/format";
import { AccountType, Currency, Journal } from "../../data/mockJournals";
import { useJournals, addJournal, updateJournal } from "../../stores/journalsStore";
import { useEntities } from "../../stores/accountingEntitiesStore";
import { useAccounts } from "../../stores/coaStore";
import { toAccountType } from "../../lib/journalHelpers";
import DynamicSelect from "../../components/shared/DynamicSelect";

const SOURCES = ['MANUAL', 'OCR_UPLOAD', 'AP', 'AR'] as const;
const BRANCHES = ['Canada HQ', 'USA Corp', 'India Mumbai', 'India Delhi'];
const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

interface LineForm {
  id: string;
  accountId: string;
  branch: string;
  taxCode: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): LineForm => ({
  id: Math.random().toString(36).slice(2),
  accountId: '', branch: '', taxCode: '', description: '', debit: '', credit: '',
});

export default function AccountingNewJournalPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const allJournals = useJournals();
  const existing = id ? allJournals.find(j => j.id === id) : undefined;
  const [searchParams] = useSearchParams();
  const entities = useEntities();
  const accounts = useAccounts();

  const [entity, setEntity] = useState(existing?.entity ?? '');
  const [entryDate, setEntryDate] = useState(existing?.entryDate ?? new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'CAD');
  const [fxRate, setFxRate] = useState('1.0000');
  const [sourceType, setSourceType] = useState(existing?.sourceType ?? 'MANUAL');
  const [reference, setReference] = useState(existing?.reference ?? '');
  const [narration, setNarration] = useState(existing?.narration ?? '');
  const [lines, setLines] = useState<LineForm[]>(() =>
    existing
      ? existing.lines.map(l => ({
          id: l.id, accountId: l.accountId, branch: '', taxCode: l.taxCode || '',
          description: l.description, debit: l.debit ? String(l.debit) : '',
          credit: l.credit ? String(l.credit) : '',
        }))
      : [emptyLine(), emptyLine(), emptyLine()]
  );
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOcrBanner, setShowOcrBanner] = useState(
    !existing && (
      !!searchParams.get('vendor') || !!searchParams.get('amount') ||
      !!searchParams.get('reference') || !!searchParams.get('narration') ||
      searchParams.get('sourceType') === 'OCR_UPLOAD'
    )
  );

  useEffect(() => {
    if (existing) return;
    const hasOcr =
      !!searchParams.get('vendor') || !!searchParams.get('amount') ||
      !!searchParams.get('reference') || !!searchParams.get('narration') ||
      searchParams.get('sourceType') === 'OCR_UPLOAD';
    if (!hasOcr) return;

    const date = searchParams.get('date');
    const cur = searchParams.get('currency');
    const ref = searchParams.get('reference');
    const narr = searchParams.get('narration');
    const amount = searchParams.get('amount') ?? '';
    const taxCode = searchParams.get('taxCode') ?? '';
    const vendor = searchParams.get('vendor') ?? '';
    const glAccount = searchParams.get('glAccount') ?? '';

    if (date) setEntryDate(date);
    if (cur && ['CAD', 'USD', 'INR'].includes(cur)) setCurrency(cur as Currency);
    if (ref) setReference(ref);
    if (narr) setNarration(narr);
    setSourceType('OCR_UPLOAD');

    const account =
      accounts.find(a => a.code === glAccount) ||
      (glAccount ? accounts.find(a => a.name.toLowerCase().includes(glAccount.toLowerCase())) : undefined);

    const prefilled: LineForm = {
      ...emptyLine(),
      accountId: account?.id ?? '',
      debit: amount,
      taxCode,
      description: vendor,
    };
    setLines([prefilled, emptyLine(), emptyLine()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const dr = lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
    const cr = lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
    return { dr, cr, diff: dr.minus(cr) };
  }, [lines]);

  const balanced = totals.diff.abs().lessThan(0.005);

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleFiles = (fl: FileList | null) => {
    if (!fl) return;
    setFiles(prev => [...prev, ...Array.from(fl)]);
  };

  const validateDraft = (): string[] => {
    const errs: string[] = [];
    if (!entity) errs.push('Entity is required');
    if (!entryDate) errs.push('Entry date is required');
    if (!narration || narration.trim().length < 5) errs.push('Narration must be at least 5 characters');
    return errs;
  };
  const validatePost = (): string[] => {
    const errs = validateDraft();
    if (lines.length < 2) errs.push('At least 2 lines required');
    if (lines.some(l => !l.accountId)) errs.push('Every line must have an account selected');
    if (!balanced) errs.push('Total debits must equal total credits');
    return errs;
  };

  const onSaveDraft = () => {
    setSubmitted(true);
    const errs = validateDraft();
    if (errs.length) { toast.error(errs.join(' · ')); return; }
    persist('DRAFT');
    toast.success('Draft saved');
    setTimeout(() => navigate('/accounting/journals'), 300);
  };
  const onPost = () => {
    setSubmitted(true);
    const errs = validatePost();
    if (errs.length) { toast.error(errs.join(' · ')); return; }
    const num = persist('POSTED');
    toast.success(`Journal entry ${num} posted`);
    setTimeout(() => navigate('/accounting/journals'), 400);
  };

  function persist(status: Journal['status']): string {
    const lineModels = lines.filter(l => l.accountId).flatMap(l => {
      const a = accounts.find(x => x.id === l.accountId);
      if (!a) return [];
      return [{
        id: l.id, accountId: l.accountId, accountCode: a.code, accountName: a.name,
        accountType: toAccountType(a.groupCode),
        debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
        description: l.description, taxCode: l.taxCode,
      }];
    });
    if (existing) {
      updateJournal(existing.id, { entity, entryDate, currency, sourceType, reference, narration, status, lines: lineModels });
      return existing.entryNumber;
    }
    const num = `JE-${new Date().getFullYear()}-${String(allJournals.length + 1).padStart(4, '0')}`;
    addJournal({
      entryNumber: num, entryDate, entity, narration, sourceType, reference, currency, status,
      createdBy: 'Current user', postedAt: status === 'POSTED' ? new Date().toISOString() : undefined,
      lines: lineModels,
    });
    return num;
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <span>Accounting</span>
          <span className="mx-1.5">/</span>
          <Link to="/accounting/journals" className="hover:text-foreground hover:underline">Journal entries</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{existing ? `Edit ${existing.entryNumber}` : 'New'}</span>
        </nav>
        <div className="flex items-center gap-3">
          {balanced ? (
            <span className="text-green-600 text-sm font-medium">Balanced ✓</span>
          ) : (
            <span className="text-destructive text-sm font-medium">
              Out of balance {currency} {totals.diff.abs().toFixed(2)}
            </span>
          )}
          <Button variant="ghost" onClick={() => navigate('/accounting/journals')}>Discard</Button>
          <Button variant="outline" onClick={onSaveDraft}>Save draft</Button>
          <Button onClick={onPost} disabled={!balanced}>Post entry</Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 p-6">
        {showOcrBanner && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 text-blue-900 px-3 py-2 text-sm">
            <span className="flex-1">Pre-filled from OCR extraction — please review all fields before posting</span>
            <button onClick={() => setShowOcrBanner(false)} aria-label="Dismiss" className="hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">Entry details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Entity *</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className={cn(submitted && !entity && 'border-destructive')}>
                  <SelectValue placeholder="Select entity…" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entry date *</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency *</Label>
              <DynamicSelect listKey="currencies" value={currency} onValueChange={(v) => setCurrency(v as Currency)} />
            </div>
            {currency !== 'CAD' && (
              <div className="space-y-1.5">
                <Label>FX rate to CAD</Label>
                <Input type="number" step="0.0001" value={fxRate} onChange={(e) => setFxRate(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Source type *</Label>
              <DynamicSelect listKey="journal_types" value={sourceType} onValueChange={(v) => setSourceType(v as typeof SOURCES[number])} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2024-0042" />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label>Narration *</Label>
              <Textarea
                rows={2}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Describe what this journal entry represents…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Journal lines</CardTitle>
            <Badge variant="secondary">{lines.length} lines</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b h-9">
                    <th className="w-8 text-center">#</th>
                    <th className="text-left px-2">Account</th>
                    <th className="text-left px-2">Branch</th>
                    <th className="text-left px-2">Tax code</th>
                    <th className="text-left px-2">Description</th>
                    <th className="text-right px-2">Debit</th>
                    <th className="text-right px-2">Credit</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.id} className="border-b last:border-b-0">
                      <td className="text-center text-muted-foreground text-xs py-2">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <AccountCombobox
                          value={l.accountId}
                          invalid={submitted && !l.accountId}
                          onChange={(v) => updateLine(idx, { accountId: v })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={l.branch || 'none'} onValueChange={(v) => updateLine(idx, { branch: v === 'none' ? '' : v })}>
                          <SelectTrigger className="w-28 h-9"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-32"><DynamicSelect listKey="tax_codes" value={l.taxCode} onValueChange={(v) => updateLine(idx, { taxCode: v })} placeholder="—" /></div>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          className="w-36 h-9"
                          placeholder="Note…"
                          value={l.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} step="0.01"
                          className="w-28 h-9 text-right tabular-nums"
                          placeholder="0.00"
                          value={l.debit}
                          onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} step="0.01"
                          className="w-28 h-9 text-right tabular-nums"
                          placeholder="0.00"
                          value={l.credit}
                          onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Remove line"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t mt-2 pt-2 flex justify-end gap-8 text-sm">
              <span>Total debits: <span className="font-mono tabular-nums font-medium">{formatCurrency(totals.dr.toNumber(), currency)}</span></span>
              <span>Total credits: <span className="font-mono tabular-nums font-medium">{formatCurrency(totals.cr.toNumber(), currency)}</span></span>
              <span>
                Difference: <span className={cn('font-mono tabular-nums font-medium', balanced ? 'text-green-600' : 'text-destructive')}>
                  {formatCurrency(totals.diff.toNumber(), currency)}
                </span>
              </span>
            </div>

            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Add line
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Supporting documents</CardTitle></CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary"
              )}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">Drop files here</div>
              <div className="text-xs text-muted-foreground">or click to browse</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, images, Excel, CSV up to 20MB</div>
              <input
                ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 divide-y">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 py-1.5">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function AccountCombobox({
  value, onChange, invalid,
}: { value: string; onChange: (id: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const accounts = useAccounts();
  const activeAccounts = useMemo(
    () => accounts.filter(a => a.status !== "INACTIVE").slice().sort((a, b) => a.code.localeCompare(b.code)),
    [accounts],
  );
  const selected = activeAccounts.find(a => a.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("min-w-[280px] justify-between h-9 font-normal", invalid && 'border-destructive')}
        >
          <span className="truncate">
            {selected ? `${selected.code} — ${selected.name}` : <span className="text-muted-foreground">Select account…</span>}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput placeholder="Search code or name…" />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            {ACCOUNT_TYPES.map(type => {
              const items = activeAccounts.filter(a => toAccountType(a.groupCode) === type);
              if (!items.length) return null;
              return (
                <CommandGroup key={type} heading={type}>
                  {items.map(a => (
                    <CommandItem
                      key={a.id}
                      value={`${a.code} ${a.name}`}
                      onSelect={() => { onChange(a.id); setOpen(false); }}
                    >
                      <Check className={cn("w-4 h-4 mr-2", value === a.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="font-mono text-xs mr-2">{a.code}</span>
                      <span>{a.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

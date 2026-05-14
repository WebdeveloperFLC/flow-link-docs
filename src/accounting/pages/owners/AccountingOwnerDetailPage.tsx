import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft, UserCircle, Plus, Edit, Wallet, TrendingUp, AlertCircle,
  Landmark, Clock, PieChart, Shield, Heart, CreditCard, Banknote, Star, Home,
  ChevronDown, ChevronRight, MoreHorizontal,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import AccountingPageHeader from '../../components/shared/AccountingPageHeader';
import AccountingEmptyState from '../../components/shared/AccountingEmptyState';
import AccountingKPICard from '../../components/shared/AccountingKPICard';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
  MOCK_FINANCIAL_ACCOUNTS, getAccountsForOwner, getOwnerById,
  ownerDisplayName, ownerInitials, avatarColorClass, countryFlag,
  formatAccountAmount, formatMaskedAccount, categoryOf,
} from '../../data/mockOwners';
import { MOCK_DOCUMENTS } from '../../data/mockDocuments';
import type { AccountType, FinancialAccount } from '../../types/owners';

const TYPE_PILL: Record<string, string> = {
  CORPORATION: 'bg-blue-100 text-blue-700',
  PRIVATE_LIMITED: 'bg-blue-100 text-blue-700',
  LLC: 'bg-blue-100 text-blue-700',
  BRAND_TRADE_NAME: 'bg-gray-100 text-gray-700',
  INDIVIDUAL: 'bg-purple-100 text-purple-700',
  HUF: 'bg-purple-100 text-purple-700',
  TRUST: 'bg-purple-100 text-purple-700',
  NRI: 'bg-purple-100 text-purple-700',
};

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CORPORATE: 'Corporate', CURRENT: 'Current', PAYROLL: 'Payroll',
  CREDIT_CARD: 'Credit card', MERCHANT: 'Merchant',
  SAVINGS: 'Savings', NRE_SAVINGS: 'NRE savings', NRO_SAVINGS: 'NRO savings', FCNR_DEPOSIT: 'FCNR deposit',
  FIXED_DEPOSIT: 'Fixed deposit', RECURRING_DEPOSIT: 'Recurring deposit',
  DEMAT: 'Demat', TRADING: 'Trading', MUTUAL_FUND: 'Mutual fund',
  PPF: 'PPF', EPF: 'EPF', NPS: 'NPS', SSY: 'SSY', BONDS: 'Bonds',
  STOCKS: 'Stocks', REAL_ESTATE: 'Real estate',
  LIC_POLICY: 'LIC policy', TERM_INSURANCE: 'Term insurance', ULIP: 'ULIP',
  HEALTH_INSURANCE: 'Health insurance', VEHICLE_INSURANCE: 'Vehicle insurance', ENDOWMENT_POLICY: 'Endowment',
  HOME_LOAN: 'Home loan', CAR_LOAN: 'Car loan', PERSONAL_LOAN: 'Personal loan',
  CREDIT_CARD_LIABILITY: 'Credit card', EDUCATION_LOAN: 'Education loan',
  CASH: 'Cash', GOLD: 'Gold', OTHER: 'Other',
};

function iconForType(t: AccountType) {
  if (['CORPORATE','CURRENT','PAYROLL','SAVINGS','NRE_SAVINGS','NRO_SAVINGS','FCNR_DEPOSIT','MERCHANT'].includes(t)) return Landmark;
  if (['FIXED_DEPOSIT','RECURRING_DEPOSIT'].includes(t)) return Clock;
  if (['DEMAT','TRADING','STOCKS','BONDS'].includes(t)) return TrendingUp;
  if (['MUTUAL_FUND'].includes(t)) return PieChart;
  if (['PPF','NPS','EPF','SSY'].includes(t)) return Shield;
  if (['LIC_POLICY','TERM_INSURANCE','ULIP','HEALTH_INSURANCE','VEHICLE_INSURANCE','ENDOWMENT_POLICY'].includes(t)) return Heart;
  if (['HOME_LOAN','CAR_LOAN','PERSONAL_LOAN','CREDIT_CARD','CREDIT_CARD_LIABILITY','EDUCATION_LOAN'].includes(t)) return CreditCard;
  if (t === 'CASH') return Banknote;
  if (t === 'GOLD') return Star;
  if (t === 'REAL_ESTATE') return Home;
  return Wallet;
}

type Section = 'BANK' | 'INVESTMENT' | 'INSURANCE' | 'LIABILITY';
function sectionOf(a: FinancialAccount): Section {
  const cat = categoryOf(a.accountType);
  if (cat === 'INVESTMENT') return 'INVESTMENT';
  if (cat === 'INSURANCE') return 'INSURANCE';
  if (cat === 'LIABILITY') return 'LIABILITY';
  return 'BANK';
}

const SECTION_LABEL: Record<Section, string> = {
  BANK: 'Bank accounts', INVESTMENT: 'Investments',
  INSURANCE: 'Insurance policies', LIABILITY: 'Loans & liabilities',
};

export default function AccountingOwnerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const owner = getOwnerById(id);

  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => getAccountsForOwner(id));
  const [notes, setNotes] = useState<{ ts: string; text: string }[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [defaultSection, setDefaultSection] = useState<Section>('BANK');

  const totals = useMemo(() => {
    let assets = 0, liab = 0;
    for (const a of accounts) {
      const bal = a.currentBalance ?? 0;
      if (categoryOf(a.accountType) === 'LIABILITY' || bal < 0) liab += Math.abs(bal);
      else assets += bal;
    }
    return { assets, liab, net: assets - liab };
  }, [accounts]);

  if (!owner) {
    return (
      <AppLayout>
        <div className="p-8">
          <AccountingEmptyState
            icon={UserCircle}
            title="Owner not found"
            description="That owner profile doesn't exist or has been deleted."
            action={<Button asChild variant="outline"><Link to="/accounting/owners"><ChevronLeft className="size-4" /> Back to owner profiles</Link></Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const type = owner.businessType ?? owner.personalType ?? '';
  const ccy = accounts[0]?.currency ?? (owner.country === 'CA' ? 'CAD' : owner.country === 'US' ? 'USD' : 'INR');

  function openAdd(section: Section) {
    setEditingAccount(null);
    setDefaultSection(section);
    setAccountModalOpen(true);
  }

  function saveAccount(a: FinancialAccount) {
    setAccounts(prev => {
      const exists = prev.find(x => x.id === a.id);
      if (exists) return prev.map(x => x.id === a.id ? a : x);
      return [a, ...prev];
    });
    toast.success(editingAccount ? 'Account updated' : 'Account added');
    setAccountModalOpen(false); setEditingAccount(null);
  }

  const linkedDocs = MOCK_DOCUMENTS.filter(d =>
    d.linkedVendor === ownerDisplayName(owner) ||
    (owner.brandName && d.linkedVendor === owner.brandName)
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-4">
          <Link to="/accounting/owners" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3" /> Back to owner profiles
          </Link>
        </div>

        <Card className="p-5 mb-6 sticky top-0 z-10 bg-card flex items-center gap-4">
          <div className={cn('size-12 rounded-full flex items-center justify-center font-semibold flex-shrink-0', avatarColorClass(owner.id))}>
            {ownerInitials(owner)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold truncate">{ownerDisplayName(owner)}</h1>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', TYPE_PILL[type] ?? 'bg-muted')}>
                {type}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {countryFlag(owner.country)} {owner.country}
              {owner.relationship && <> · {owner.relationship}</>}
              {owner.panNumber && <> · PAN {owner.panNumber}</>}
            </div>
          </div>
          <Button variant="outline" onClick={() => toast.info('Edit profile — open from list page')}>
            <Edit className="size-4" /> Edit
          </Button>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Total accounts" value={String(accounts.length)} icon={Wallet} currency={ccy as 'CAD'|'USD'|'INR'} />
          <AccountingKPICard label="Total assets" value={totals.assets} currency={ccy as 'CAD'|'USD'|'INR'} icon={TrendingUp} />
          <AccountingKPICard label="Total liabilities" value={totals.liab} currency={ccy as 'CAD'|'USD'|'INR'} icon={AlertCircle} />
          <AccountingKPICard label="Net worth" value={totals.net} currency={ccy as 'CAD'|'USD'|'INR'} icon={TrendingUp}
            deltaDirection={totals.net >= 0 ? 'up' : 'down'} delta={totals.net >= 0 ? 'Positive' : 'Negative'} />
        </div>

        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-4 space-y-4">
            {(['BANK','INVESTMENT','INSURANCE','LIABILITY'] as Section[]).map(sec => {
              const list = accounts.filter(a => sectionOf(a) === sec);
              return (
                <SectionBlock
                  key={sec}
                  title={SECTION_LABEL[sec]}
                  count={list.length}
                  onAdd={() => openAdd(sec)}
                >
                  {list.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 px-2">No accounts in this category.</div>
                  ) : (
                    <div className="space-y-2">
                      {list.map(a => (
                        <AccountRow
                          key={a.id}
                          a={a}
                          onEdit={() => { setEditingAccount(a); setDefaultSection(sectionOf(a)); setAccountModalOpen(true); }}
                        />
                      ))}
                    </div>
                  )}
                </SectionBlock>
              );
            })}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {linkedDocs.length === 0 ? (
              <Card className="p-8">
                <AccountingEmptyState
                  icon={UserCircle}
                  title="No linked documents"
                  description="Upload statements, policies or agreements to link them to this profile."
                  action={<Button onClick={() => toast.info('Upload — coming soon')}>Upload document</Button>}
                />
              </Card>
            ) : (
              <Card className="divide-y">
                {linkedDocs.map(d => (
                  <div key={d.id} className="p-3 flex items-center gap-3">
                    <div className="size-9 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                      {d.fileType.toUpperCase().slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.filename}</div>
                      <div className="text-xs text-muted-foreground">{d.docType} · {d.entity}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{(d.fileSizeKB).toLocaleString()} KB</span>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <Card className="p-4">
              <Textarea rows={3} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add a note…" />
              <div className="flex justify-end mt-2">
                <Button onClick={() => {
                  if (!noteDraft.trim()) return;
                  setNotes(prev => [{ ts: new Date().toISOString(), text: noteDraft.trim() }, ...prev]);
                  setNoteDraft('');
                  toast.success('Note added');
                }}>Add note</Button>
              </div>
            </Card>
            {notes.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No notes yet.</div>
            ) : (
              <Card className="divide-y">
                {notes.map((n, i) => (
                  <div key={i} className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{new Date(n.ts).toLocaleString()}</div>
                    <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="divide-y">
              {[
                { ts: owner.createdAt, label: `Profile created — ${ownerDisplayName(owner)}` },
                ...accounts.map(a => ({ ts: a.createdAt, label: `Account added — ${a.nickname}` })),
                ...notes.map(n => ({ ts: n.ts, label: `Note added` })),
              ]
                .sort((a, b) => b.ts.localeCompare(a.ts))
                .map((e, i) => (
                  <div key={i} className="p-3 flex items-start gap-3">
                    <div className="size-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="text-sm">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </Card>
          </TabsContent>
        </Tabs>

        <AccountModal
          open={accountModalOpen}
          onOpenChange={open => { setAccountModalOpen(open); if (!open) setEditingAccount(null); }}
          ownerId={owner.id}
          country={owner.country}
          editing={editingAccount}
          defaultSection={defaultSection}
          onSave={saveAccount}
        />
      </div>
    </AppLayout>
  );
}

function SectionBlock({ title, count, onAdd, children }: { title: string; count: number; onAdd: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-left">
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <h3 className="font-semibold">{title}</h3>
              <span className="text-xs text-muted-foreground">({count})</span>
            </button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="sm" onClick={onAdd}><Plus className="size-3.5" /> Add account</Button>
        </div>
        <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function AccountRow({ a, onEdit }: { a: FinancialAccount; onEdit: () => void }) {
  const Icon = iconForType(a.accountType);
  const cat = categoryOf(a.accountType);
  const bal = a.currentBalance ?? 0;
  const isLiab = cat === 'LIABILITY' || bal < 0;
  const initial = a.institutionName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition">
      <div className="size-10 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm truncate">{a.nickname}</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
            <Icon className="size-3" /> {ACCOUNT_TYPE_LABEL[a.accountType]}
          </span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
            a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            a.status === 'MATURED' ? 'bg-amber-100 text-amber-700' :
            'bg-muted text-muted-foreground')}>{a.status}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
          <span>{a.institutionName}</span>
          {a.accountNumber && <span className="font-mono">{formatMaskedAccount(a.accountNumber)}</span>}
          {(a.accountType === 'FIXED_DEPOSIT' || a.accountType === 'RECURRING_DEPOSIT') && a.maturityDate && (
            <span>Matures {a.maturityDate} · {a.interestRate}% pa</span>
          )}
          {(a.accountType === 'LIC_POLICY' || a.accountType === 'TERM_INSURANCE' || a.accountType === 'ULIP') && (
            <span>SA {formatAccountAmount(a.sumAssured ?? 0, a.currency)} · Premium {formatAccountAmount(a.premiumAmount ?? 0, a.currency)} · Next {a.nextPremiumDate}</span>
          )}
          {(a.accountType === 'HOME_LOAN' || a.accountType === 'CAR_LOAN' || a.accountType === 'PERSONAL_LOAN' || a.accountType === 'EDUCATION_LOAN') && a.emiAmount && (
            <span>EMI {formatAccountAmount(a.emiAmount, a.currency)}/mo · Outstanding {formatAccountAmount(Math.abs(bal), a.currency)}</span>
          )}
        </div>
      </div>
      <div className={cn('text-right font-semibold tabular-nums', isLiab ? 'text-red-600' : 'text-green-700')}>
        {isLiab ? `-${formatAccountAmount(Math.abs(bal), a.currency)}` : formatAccountAmount(bal, a.currency)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info('Transactions — coming soon')}>View transactions</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info('Document linking — coming soon')}>Link document</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Account modal — two step
// ─────────────────────────────────────────────────────────────

type AcctCategoryUI = 'BANK' | 'INVESTMENT' | 'INSURANCE' | 'LIABILITY' | 'OTHER';

const TYPES_BY_CATEGORY: Record<AcctCategoryUI, AccountType[]> = {
  BANK: ['SAVINGS','CURRENT','NRE_SAVINGS','NRO_SAVINGS','FCNR_DEPOSIT','CORPORATE','PAYROLL','CREDIT_CARD','FIXED_DEPOSIT','RECURRING_DEPOSIT'],
  INVESTMENT: ['DEMAT','TRADING','MUTUAL_FUND','PPF','EPF','NPS','SSY','BONDS','STOCKS','REAL_ESTATE'],
  INSURANCE: ['LIC_POLICY','TERM_INSURANCE','ULIP','HEALTH_INSURANCE','VEHICLE_INSURANCE','ENDOWMENT_POLICY'],
  LIABILITY: ['HOME_LOAN','CAR_LOAN','PERSONAL_LOAN','CREDIT_CARD_LIABILITY','EDUCATION_LOAN'],
  OTHER: ['CASH','GOLD','OTHER'],
};

function categoryUIFromSection(s: Section): AcctCategoryUI {
  if (s === 'BANK') return 'BANK';
  if (s === 'INVESTMENT') return 'INVESTMENT';
  if (s === 'INSURANCE') return 'INSURANCE';
  return 'LIABILITY';
}

function AccountModal({
  open, onOpenChange, ownerId, country, editing, defaultSection, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ownerId: string;
  country: string;
  editing: FinancialAccount | null;
  defaultSection: Section;
  onSave: (a: FinancialAccount) => void;
}) {
  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);
  const [cat, setCat] = useState<AcctCategoryUI>(editing ? categoryUIFromSection(sectionOf(editing)) : categoryUIFromSection(defaultSection));
  useMemo(() => {
    setStep(editing ? 2 : 1);
    if (editing) setCat(categoryUIFromSection(sectionOf(editing)));
    else setCat(categoryUIFromSection(defaultSection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultSection]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit account' : step === 1 ? 'Choose account type' : 'Account details'}</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { k: 'BANK', label: 'Bank / Savings', icon: Landmark },
              { k: 'INVESTMENT', label: 'Investment', icon: TrendingUp },
              { k: 'INSURANCE', label: 'Insurance / Policy', icon: Heart },
              { k: 'LIABILITY', label: 'Loan / Liability', icon: CreditCard },
              { k: 'OTHER', label: 'Cash / Other', icon: Banknote },
            ] as { k: AcctCategoryUI; label: string; icon: typeof Landmark }[]).map(o => (
              <button key={o.k} type="button"
                onClick={() => { setCat(o.k); setStep(2); }}
                className="text-left p-4 border rounded-lg hover:border-primary hover:shadow transition">
                <o.icon className="size-6 text-primary mb-2" />
                <div className="font-semibold">{o.label}</div>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <AccountForm
            ownerId={ownerId}
            country={country}
            cat={cat}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onBack={editing ? undefined : () => setStep(1)}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function freqToMonths(f?: string): number {
  switch (f) {
    case 'MONTHLY': return 1;
    case 'QUARTERLY': return 3;
    case 'HALF_YEARLY': return 6;
    case 'YEARLY': return 12;
    default: return 12;
  }
}

function AccountForm({
  ownerId, country, cat, editing, onCancel, onBack, onSave,
}: {
  ownerId: string; country: string; cat: AcctCategoryUI;
  editing: FinancialAccount | null;
  onCancel: () => void;
  onBack?: () => void;
  onSave: (a: FinancialAccount) => void;
}) {
  const defaultType = (editing?.accountType ?? TYPES_BY_CATEGORY[cat][0]) as AccountType;
  const [form, setForm] = useState<Partial<FinancialAccount>>(() =>
    editing ?? {
      currency: country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'INR',
      country, status: 'ACTIVE', tags: [], documents: [], accountType: defaultType,
    }
  );
  const [tenureMonths, setTenureMonths] = useState<number>(12);

  function set<K extends keyof FinancialAccount>(k: K, v: FinancialAccount[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function submit() {
    if (!form.nickname || !form.institutionName) {
      toast.error('Nickname and institution are required');
      return;
    }
    const t = (form.accountType ?? defaultType) as AccountType;
    const built: FinancialAccount = {
      id: editing?.id ?? `fa-${Date.now()}`,
      tenantId: 'tenant-1',
      ownerProfileId: ownerId,
      accountType: t,
      category: categoryOf(t),
      nickname: form.nickname,
      institutionName: form.institutionName,
      currency: form.currency ?? 'INR',
      country: form.country ?? country,
      status: (form.status as FinancialAccount['status']) ?? 'ACTIVE',
      tags: form.tags ?? [],
      documents: form.documents ?? [],
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...form,
    } as FinancialAccount;
    onSave(built);
  }

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account type">
          <Select value={form.accountType} onValueChange={v => set('accountType', v as AccountType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES_BY_CATEGORY[cat].map(t => <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={form.currency} onValueChange={v => set('currency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Nickname *"><Input value={form.nickname ?? ''} onChange={e => set('nickname', e.target.value)} placeholder="My HDFC savings" /></Field>
      <Field label="Institution name *"><Input value={form.institutionName ?? ''} onChange={e => set('institutionName', e.target.value)} /></Field>

      {cat === 'BANK' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account number" hint="Stored as last-4 only">
              <Input value={form.accountNumber ?? ''} onChange={e => set('accountNumber', e.target.value)} />
            </Field>
            <Field label={country === 'IN' ? 'IFSC code' : 'SWIFT code'}>
              <Input value={(country === 'IN' ? form.ifscCode : form.swiftCode) ?? ''}
                onChange={e => country === 'IN' ? set('ifscCode', e.target.value) : set('swiftCode', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current balance"><Input type="number" value={form.currentBalance ?? ''} onChange={e => set('currentBalance', Number(e.target.value))} /></Field>
            <Field label="Opened date"><Input type="date" value={form.openedDate ?? ''} onChange={e => set('openedDate', e.target.value)} /></Field>
          </div>
          {(form.accountType === 'FIXED_DEPOSIT' || form.accountType === 'RECURRING_DEPOSIT') && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Interest rate (%)"><Input type="number" step="0.1" value={form.interestRate ?? ''} onChange={e => set('interestRate', Number(e.target.value))} /></Field>
                <Field label="Tenure (months)">
                  <Input type="number" value={tenureMonths} onChange={e => {
                    const m = Number(e.target.value); setTenureMonths(m);
                    if (form.openedDate) set('maturityDate', addMonths(form.openedDate, m));
                  }} />
                </Field>
                <Field label="Maturity date"><Input type="date" value={form.maturityDate ?? ''} onChange={e => set('maturityDate', e.target.value)} /></Field>
              </div>
            </>
          )}
        </>
      )}

      {cat === 'INVESTMENT' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="DP ID / Folio"><Input value={form.dpId ?? form.folioNumber ?? ''} onChange={e => { set('dpId', e.target.value); set('folioNumber', e.target.value); }} /></Field>
            <Field label="Current value"><Input type="number" value={form.currentBalance ?? ''} onChange={e => set('currentBalance', Number(e.target.value))} /></Field>
          </div>
          <Field label="Holdings notes"><Textarea rows={2} value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value)} placeholder="e.g. INFY 100, RELIANCE 50" /></Field>
        </>
      )}

      {cat === 'INSURANCE' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Policy number"><Input value={form.policyNumber ?? ''} onChange={e => set('policyNumber', e.target.value)} /></Field>
            <Field label="Sum assured"><Input type="number" value={form.sumAssured ?? ''} onChange={e => set('sumAssured', Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Premium"><Input type="number" value={form.premiumAmount ?? ''} onChange={e => set('premiumAmount', Number(e.target.value))} /></Field>
            <Field label="Frequency">
              <Select value={form.premiumFrequency ?? 'YEARLY'} onValueChange={v => {
                set('premiumFrequency', v as FinancialAccount['premiumFrequency']);
                if (form.openedDate) set('nextPremiumDate', addMonths(form.openedDate, freqToMonths(v)));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="HALF_YEARLY">Half-yearly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="SINGLE">Single</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next premium"><Input type="date" value={form.nextPremiumDate ?? ''} onChange={e => set('nextPremiumDate', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Policy start"><Input type="date" value={form.openedDate ?? ''} onChange={e => set('openedDate', e.target.value)} /></Field>
            <Field label="Maturity date"><Input type="date" value={form.maturityDate ?? ''} onChange={e => set('maturityDate', e.target.value)} /></Field>
          </div>
        </>
      )}

      {cat === 'LIABILITY' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loan account #"><Input value={form.accountNumber ?? ''} onChange={e => set('accountNumber', e.target.value)} /></Field>
            <Field label="Outstanding balance"><Input type="number" value={form.currentBalance ?? ''} onChange={e => set('currentBalance', Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Interest rate (%)"><Input type="number" step="0.1" value={form.interestRate ?? ''} onChange={e => set('interestRate', Number(e.target.value))} /></Field>
            <Field label="EMI amount"><Input type="number" value={form.emiAmount ?? ''} onChange={e => set('emiAmount', Number(e.target.value))} /></Field>
            <Field label="EMI day"><Input type="number" min={1} max={31} value={form.emiDay ?? ''} onChange={e => set('emiDay', Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loan start"><Input type="date" value={form.openedDate ?? ''} onChange={e => set('openedDate', e.target.value)} /></Field>
            <Field label="End date"><Input type="date" value={form.maturityDate ?? ''} onChange={e => set('maturityDate', e.target.value)} /></Field>
          </div>
        </>
      )}

      {cat === 'OTHER' && (
        <>
          <Field label="Current value"><Input type="number" value={form.currentBalance ?? ''} onChange={e => set('currentBalance', Number(e.target.value))} /></Field>
          <Field label="Remarks"><Textarea rows={2} value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value)} /></Field>
        </>
      )}

      <DialogFooter>
        {onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>{editing ? 'Save changes' : 'Add account'}</Button>
      </DialogFooter>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}



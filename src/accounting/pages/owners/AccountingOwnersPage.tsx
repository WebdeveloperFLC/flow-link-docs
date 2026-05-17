import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MoreHorizontal, Plus, User, Users, Shield, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import AccountingPageHeader from '../../components/shared/AccountingPageHeader';
import AccountingEmptyState from '../../components/shared/AccountingEmptyState';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import DeleteRecordDialog from '../../components/shared/DeleteRecordDialog';

import {
  MOCK_OWNERS, MOCK_FINANCIAL_ACCOUNTS, getAccountsForOwner,
  ownerDisplayName, ownerInitials, avatarColorClass, countryFlag, maskTaxId,
  formatAccountAmount, formatINR, categoryOf,
} from '../../data/mockOwners';
import type { OwnerProfile, OwnerCategory, BusinessOwnerType, PersonalOwnerType } from '../../types/owners';

const TYPE_PILL: Record<string, string> = {
  CORPORATION: 'bg-blue-100 text-blue-700',
  PRIVATE_LIMITED: 'bg-blue-100 text-blue-700',
  LLC: 'bg-blue-100 text-blue-700',
  PARTNERSHIP: 'bg-blue-100 text-blue-700',
  SOLE_PROPRIETOR: 'bg-blue-100 text-blue-700',
  FRANCHISE: 'bg-blue-100 text-blue-700',
  BRAND_TRADE_NAME: 'bg-gray-100 text-gray-700',
  INDIVIDUAL: 'bg-purple-100 text-purple-700',
  HUF: 'bg-purple-100 text-purple-700',
  TRUST: 'bg-purple-100 text-purple-700',
  NRI: 'bg-purple-100 text-purple-700',
  MINOR: 'bg-purple-100 text-purple-700',
};

const TYPE_LABEL: Record<string, string> = {
  CORPORATION: 'Corporation', PRIVATE_LIMITED: 'Pvt Ltd', LLC: 'LLC',
  PARTNERSHIP: 'Partnership', SOLE_PROPRIETOR: 'Sole prop',
  FRANCHISE: 'Franchise', BRAND_TRADE_NAME: 'Brand / Trade name',
  INDIVIDUAL: 'Individual', HUF: 'HUF', TRUST: 'Trust', NRI: 'NRI', MINOR: 'Minor',
};

function ownerType(o: OwnerProfile): string {
  return (o.businessType ?? o.personalType ?? '');
}

function totalsForOwner(ownerId: string) {
  const accts = getAccountsForOwner(ownerId);
  const byCcy: Record<string, { assets: number; liabilities: number }> = {};
  for (const a of accts) {
    const bal = a.currentBalance ?? 0;
    const cat = categoryOf(a.accountType);
    const isLiab = cat === 'LIABILITY' || bal < 0;
    byCcy[a.currency] = byCcy[a.currency] ?? { assets: 0, liabilities: 0 };
    if (isLiab) byCcy[a.currency].liabilities += Math.abs(bal);
    else byCcy[a.currency].assets += bal;
  }
  return { count: accts.length, byCcy };
}

function formatTotalsLine(byCcy: Record<string, { assets: number; liabilities: number }>, kind: 'assets' | 'liabilities') {
  const parts = Object.entries(byCcy)
    .map(([ccy, v]) => v[kind] > 0 ? formatAccountAmount(v[kind], ccy) : null)
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export default function AccountingOwnersPage() {
  const [owners, setOwners] = useState<OwnerProfile[]>(MOCK_OWNERS);
  const [tab, setTab] = useState<'all' | 'business' | 'personal' | 'family'>('all');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return owners.filter(o => {
      if (activeOnly && !o.isActive) return false;
      if (country !== 'all' && o.country !== country) return false;
      if (tab === 'business' && o.category !== 'BUSINESS') return false;
      if (tab === 'personal' && o.category !== 'PERSONAL') return false;
      if (tab === 'family' && o.category !== 'FAMILY_OFFICE') return false;
      if (q) {
        const hay = [
          ownerDisplayName(o), o.brandName, o.legalName,
          o.firstName, o.lastName, o.panNumber, o.gstNumber, o.taxId,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [owners, tab, search, country, activeOnly]);

  function handleSave(o: OwnerProfile) {
    setOwners(prev => {
      const exists = prev.find(x => x.id === o.id);
      if (exists) return prev.map(x => x.id === o.id ? o : x);
      return [o, ...prev];
    });
    toast.success(editing ? 'Owner profile updated' : 'Owner profile created');
    setModalOpen(false); setEditing(null);
  }

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Owner profiles"
          subtitle="Manage business brands, personal accounts, HUF, trusts and investment portfolios"
          actions={
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="size-4" /> Add owner profile
            </Button>
          }
        />

        <div className="mb-4">
          <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="family">Family office</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="p-4 mb-4 flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search name, PAN, brand…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              <SelectItem value="CA">🇨🇦 Canada</SelectItem>
              <SelectItem value="US">🇺🇸 USA</SelectItem>
              <SelectItem value="IN">🇮🇳 India</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto text-sm">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only" />
            <Label htmlFor="active-only" className="cursor-pointer">Active only</Label>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <AccountingEmptyState icon={Users} title="No owner profiles" description="Try a different filter or add a new owner profile." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(o => {
              const t = totalsForOwner(o.id);
              const type = ownerType(o);
              return (
                <Card key={o.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={cn('size-12 rounded-full flex items-center justify-center font-semibold flex-shrink-0', avatarColorClass(o.id))}>
                      {ownerInitials(o)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/accounting/owners/${o.id}`} className="block font-semibold text-foreground hover:underline truncate">
                        {ownerDisplayName(o)}
                      </Link>
                      <div className="mt-1">
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', TYPE_PILL[type])}>
                          {TYPE_LABEL[type] ?? type}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(o); setModalOpen(true); }}>Edit profile</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={`/accounting/owners/${o.id}`}>Add account</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={`/accounting/owners/${o.id}`}>View all accounts</Link></DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setOwners(prev => prev.map(x => x.id === o.id ? { ...x, isActive: false } : x));
                            toast.success('Owner profile deactivated');
                          }}
                          className="text-destructive"
                        >Deactivate</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(o.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <div className="text-muted-foreground">{countryFlag(o.country)} {o.country}</div>
                    {o.panNumber && <div className="text-xs text-muted-foreground">PAN: <span className="font-mono">{maskTaxId(o.panNumber)}</span></div>}
                    {o.gstNumber && <div className="text-xs text-muted-foreground">GST: <span className="font-mono">{maskTaxId(o.gstNumber)}</span></div>}
                    {o.taxId && <div className="text-xs text-muted-foreground">Tax ID: <span className="font-mono">{maskTaxId(o.taxId)}</span></div>}
                    {o.relationship && <div className="text-xs text-muted-foreground">Relationship: {o.relationship}</div>}
                    {o.businessType === 'BRAND_TRADE_NAME' && o.legalName && (
                      <div className="text-xs text-muted-foreground italic truncate">Linked to: {o.legalName}</div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-end justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{t.count} account{t.count === 1 ? '' : 's'}</div>
                      <div className="text-xs"><span className="text-muted-foreground">Assets:</span> <span className="font-semibold text-green-700">{formatTotalsLine(t.byCcy, 'assets')}</span></div>
                      {Object.values(t.byCcy).some(v => v.liabilities > 0) && (
                        <div className="text-xs"><span className="text-muted-foreground">Liab:</span> <span className="font-semibold text-red-600">{formatTotalsLine(t.byCcy, 'liabilities')}</span></div>
                      )}
                    </div>
                    <Link to={`/accounting/owners/${o.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">View accounts →</Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <OwnerModal
          open={modalOpen}
          onOpenChange={open => { setModalOpen(open); if (!open) setEditing(null); }}
          editing={editing}
          onSave={handleSave}
        />
      </div>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// OwnerModal — two-step
// ─────────────────────────────────────────────────────────────

type Step1Choice = 'BUSINESS' | 'INDIVIDUAL' | 'HUF' | 'TRUST';

function OwnerModal({
  open, onOpenChange, editing, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: OwnerProfile | null;
  onSave: (o: OwnerProfile) => void;
}) {
  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);
  const [choice, setChoice] = useState<Step1Choice>(() => {
    if (!editing) return 'BUSINESS';
    if (editing.category === 'BUSINESS') return 'BUSINESS';
    if (editing.personalType === 'HUF') return 'HUF';
    if (editing.personalType === 'TRUST') return 'TRUST';
    return 'INDIVIDUAL';
  });

  // Reset state when reopening
  const resetKey = `${open}-${editing?.id ?? 'new'}`;
  useMemo(() => {
    setStep(editing ? 2 : 1);
    if (editing) {
      if (editing.category === 'BUSINESS') setChoice('BUSINESS');
      else if (editing.personalType === 'HUF') setChoice('HUF');
      else if (editing.personalType === 'TRUST') setChoice('TRUST');
      else setChoice('INDIVIDUAL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit owner profile' : step === 1 ? 'Choose owner type' : 'Profile details'}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { k: 'BUSINESS', label: 'Business / Brand', desc: 'Companies, brands, trade names', icon: Briefcase },
              { k: 'INDIVIDUAL', label: 'Individual', desc: 'Personal accounts, NRI', icon: User },
              { k: 'HUF', label: 'HUF', desc: 'Hindu Undivided Family', icon: Users },
              { k: 'TRUST', label: 'Trust', desc: 'Family or charitable trust', icon: Shield },
            ] as { k: Step1Choice; label: string; desc: string; icon: typeof Briefcase }[]).map(opt => (
              <button
                key={opt.k}
                type="button"
                onClick={() => { setChoice(opt.k); setStep(2); }}
                className="text-left p-4 border rounded-lg hover:border-primary hover:shadow transition"
              >
                <opt.icon className="size-6 text-primary mb-2" />
                <div className="font-semibold">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <OwnerForm
            choice={choice}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onBack={() => setStep(1)}
            showBack={!editing}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OwnerForm({
  choice, editing, onCancel, onBack, showBack, onSave,
}: {
  choice: Step1Choice;
  editing: OwnerProfile | null;
  onCancel: () => void;
  onBack: () => void;
  showBack: boolean;
  onSave: (o: OwnerProfile) => void;
}) {
  const [form, setForm] = useState<Partial<OwnerProfile>>(() =>
    editing ?? {
      country: 'IN', tags: [], isActive: true,
      category: choice === 'BUSINESS' ? 'BUSINESS' : choice === 'HUF' || choice === 'TRUST' ? 'FAMILY_OFFICE' : 'PERSONAL',
      ...(choice === 'BUSINESS' ? { businessType: 'CORPORATION' as BusinessOwnerType } : {}),
      ...(choice === 'INDIVIDUAL' ? { personalType: 'INDIVIDUAL' as PersonalOwnerType } : {}),
      ...(choice === 'HUF' ? { personalType: 'HUF' as PersonalOwnerType, hufMembers: [] } : {}),
      ...(choice === 'TRUST' ? { personalType: 'TRUST' as PersonalOwnerType, trustees: [], beneficiaries: [], trustType: 'PRIVATE' } : {}),
    }
  );
  const [tagsText, setTagsText] = useState((editing?.tags ?? []).join(', '));

  function set<K extends keyof OwnerProfile>(k: K, v: OwnerProfile[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function submit() {
    const id = editing?.id ?? `o-${Date.now()}`;
    const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean);
    const built: OwnerProfile = {
      id, tenantId: 'tenant-1',
      category: form.category as OwnerCategory,
      country: form.country ?? 'IN',
      tags, isActive: form.isActive ?? true,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...form,
    } as OwnerProfile;
    if (!ownerDisplayName(built) || ownerDisplayName(built) === 'Unnamed') {
      toast.error('Please enter a name');
      return;
    }
    onSave(built);
  }

  return (
    <div className="space-y-4 py-2">
      {choice === 'BUSINESS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business type">
              <Select value={form.businessType} onValueChange={v => set('businessType', v as BusinessOwnerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['CORPORATION','PRIVATE_LIMITED','LLC','PARTNERSHIP','SOLE_PROPRIETOR','BRAND_TRADE_NAME','FRANCHISE'] as BusinessOwnerType[]).map(b => (
                    <SelectItem key={b} value={b}>{TYPE_LABEL[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Country">
              <CountrySelect value={form.country ?? 'IN'} onChange={v => set('country', v)} />
            </Field>
          </div>
          <Field label="Brand name *" hint="Display name used throughout ERP">
            <Input value={form.brandName ?? ''} onChange={e => set('brandName', e.target.value)} />
          </Field>
          <Field label="Legal name" hint="Registered legal name if different from brand">
            <Input value={form.legalName ?? ''} onChange={e => set('legalName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {form.country === 'IN' && <Field label="GST number"><Input value={form.gstNumber ?? ''} onChange={e => set('gstNumber', e.target.value)} /></Field>}
            {form.country === 'IN' && <Field label="PAN number"><Input value={form.panNumber ?? ''} onChange={e => set('panNumber', e.target.value)} /></Field>}
            {form.country === 'US' && <Field label="EIN"><Input value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} /></Field>}
            {form.country === 'CA' && <Field label="Business number"><Input value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} /></Field>}
          </div>
        </>
      )}

      {choice === 'INDIVIDUAL' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *"><Input value={form.firstName ?? ''} onChange={e => set('firstName', e.target.value)} /></Field>
            <Field label="Last name"><Input value={form.lastName ?? ''} onChange={e => set('lastName', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relationship">
              <Select value={form.relationship ?? 'Self'} onValueChange={v => set('relationship', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Self','Spouse','Son','Daughter','Father','Mother','Sibling','Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth"><Input type="date" value={form.dateOfBirth ?? ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country"><CountrySelect value={form.country ?? 'IN'} onChange={v => set('country', v)} /></Field>
            <Field label="Personal type">
              <Select value={form.personalType ?? 'INDIVIDUAL'} onValueChange={v => set('personalType', v as PersonalOwnerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="NRI">NRI</SelectItem>
                  <SelectItem value="MINOR">Minor</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.country === 'IN' && <Field label="PAN"><Input value={form.panNumber ?? ''} onChange={e => set('panNumber', e.target.value)} /></Field>}
            {form.country === 'IN' && <Field label="Aadhar (last 4)"><Input maxLength={4} value={form.aadharLast4 ?? ''} onChange={e => set('aadharLast4', e.target.value)} /></Field>}
            {form.country === 'CA' && <Field label="SIN"><Input value={form.sin ?? ''} onChange={e => set('sin', e.target.value)} /></Field>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} /></Field>
          </div>
          {form.personalType === 'NRI' && (
            <Field label="Linked individual profile" hint="Connect NRI profile to main individual">
              <Select value={form.linkedIndividualId ?? ''} onValueChange={v => set('linkedIndividualId', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {MOCK_OWNERS.filter(o => o.personalType === 'INDIVIDUAL').map(o => (
                    <SelectItem key={o.id} value={o.id}>{ownerDisplayName(o)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </>
      )}

      {choice === 'HUF' && (
        <>
          <Field label="HUF name *"><Input value={form.brandName ?? ''} onChange={e => set('brandName', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Karta name"><Input value={form.kartaName ?? ''} onChange={e => set('kartaName', e.target.value)} /></Field>
            <Field label="PAN"><Input value={form.panNumber ?? ''} onChange={e => set('panNumber', e.target.value)} /></Field>
          </div>
          <Field label="Members">
            <RepeatableList
              items={(form.hufMembers ?? []).map(m => `${m.name} (${m.relationship})`)}
              onChange={items => set('hufMembers', items.map(s => {
                const m = s.match(/^(.+?)\s*\((.+?)\)\s*$/);
                return m ? { name: m[1].trim(), relationship: m[2].trim() } : { name: s, relationship: '' };
              }))}
              placeholder="Member name (Relationship)"
            />
          </Field>
        </>
      )}

      {choice === 'TRUST' && (
        <>
          <Field label="Trust name *"><Input value={form.brandName ?? ''} onChange={e => set('brandName', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trust type">
              <Select value={form.trustType ?? 'PRIVATE'} onValueChange={v => set('trustType', v as 'PRIVATE'|'PUBLIC'|'CHARITABLE')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="CHARITABLE">Charitable</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="PAN"><Input value={form.panNumber ?? ''} onChange={e => set('panNumber', e.target.value)} /></Field>
          </div>
          <Field label="Trustees">
            <RepeatableList items={form.trustees ?? []} onChange={v => set('trustees', v)} placeholder="Trustee name" />
          </Field>
          <Field label="Beneficiaries">
            <RepeatableList items={form.beneficiaries ?? []} onChange={v => set('beneficiaries', v)} placeholder="Beneficiary name" />
          </Field>
          <Field label="Trust deed date"><Input type="date" value={form.dateOfBirth ?? ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
        </>
      )}

      <Field label="Tags" hint="Comma-separated"><Input value={tagsText} onChange={e => setTagsText(e.target.value)} /></Field>
      <Field label="Notes"><Textarea rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field>

      <DialogFooter>
        {showBack && <Button variant="ghost" onClick={onBack}>Back</Button>}
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>{editing ? 'Save changes' : 'Create profile'}</Button>
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

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
        <SelectItem value="US">🇺🇸 USA</SelectItem>
        <SelectItem value="IN">🇮🇳 India</SelectItem>
      </SelectContent>
    </Select>
  );
}

function RepeatableList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1 px-3 py-1.5 bg-muted rounded text-sm">{it}</div>
          <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} />
        <Button variant="outline" onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); } }}>Add</Button>
      </div>
    </div>
  );
}

// keep tree-shaker happy if unused vars get pruned
void Building2;

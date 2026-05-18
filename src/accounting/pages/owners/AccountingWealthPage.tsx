import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertCircle, Wallet, Heart, Check } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import AccountingPageHeader from '../../components/shared/AccountingPageHeader';
import AccountingKPICard from '../../components/shared/AccountingKPICard';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import {
  ownerDisplayName, categoryOf,
  convertTo, formatAccountAmount,
} from '../../data/mockOwners';
import { useOwners, useFinancialAccounts } from '../../stores/ownersStore';
import type { FinancialAccount } from '../../types/owners';

const DISPLAY_CCY: ('INR'|'CAD'|'USD')[] = ['INR','CAD','USD'];

const ASSET_SEGMENTS = [
  { key: 'BANK', label: 'Bank deposits', color: '#3b82f6' },
  { key: 'INVESTMENT', label: 'Investments', color: '#8b5cf6' },
  { key: 'INSURANCE', label: 'Insurance policies', color: '#ec4899' },
  { key: 'REAL_ESTATE', label: 'Real estate', color: '#10b981' },
  { key: 'OTHER', label: 'Other assets', color: '#f59e0b' },
] as const;

const LIAB_SEGMENTS = [
  { keys: ['HOME_LOAN'], label: 'Home loans', color: '#dc2626' },
  { keys: ['CAR_LOAN'], label: 'Vehicle loans', color: '#f97316' },
  { keys: ['PERSONAL_LOAN','EDUCATION_LOAN'], label: 'Personal loans', color: '#a855f7' },
  { keys: ['CREDIT_CARD','CREDIT_CARD_LIABILITY'], label: 'Credit cards', color: '#0ea5e9' },
] as const;

function segmentForAsset(a: FinancialAccount): string {
  if (a.accountType === 'REAL_ESTATE') return 'REAL_ESTATE';
  if (categoryOf(a.accountType) === 'INVESTMENT') return 'INVESTMENT';
  if (categoryOf(a.accountType) === 'INSURANCE') return 'INSURANCE';
  if (['SAVINGS','CURRENT','PAYROLL','CORPORATE','MERCHANT','NRE_SAVINGS','NRO_SAVINGS','FCNR_DEPOSIT','FIXED_DEPOSIT','RECURRING_DEPOSIT'].includes(a.accountType))
    return 'BANK';
  return 'OTHER';
}

function isLiquid(a: FinancialAccount): boolean {
  return ['SAVINGS','CURRENT','PAYROLL','CORPORATE','NRE_SAVINGS','NRO_SAVINGS','CASH'].includes(a.accountType);
}

function donutSegments(values: { value: number; color: string; label: string }[]) {
  const total = values.reduce((s, v) => s + v.value, 0);
  if (total === 0) return [];
  let acc = 0;
  return values.map(v => {
    const pct = v.value / total;
    const start = acc; acc += pct;
    return { ...v, pct, start, end: acc };
  });
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const a0 = (start - 0.25) * 2 * Math.PI;
  const a1 = (end - 0.25) * 2 * Math.PI;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

type Event = {
  date: string; ownerId: string; accountId: string; accountName: string;
  type: 'PREMIUM' | 'MATURITY' | 'EMI'; amount: number; currency: string;
};

function buildEvents(accounts: FinancialAccount[], asOf: Date, days = 90): Event[] {
  const events: Event[] = [];
  const horizon = new Date(asOf); horizon.setDate(horizon.getDate() + days);
  for (const a of accounts) {
    if (a.nextPremiumDate && a.premiumAmount) {
      const d = new Date(a.nextPremiumDate);
      if (d >= asOf && d <= horizon) {
        events.push({ date: a.nextPremiumDate, ownerId: a.ownerProfileId, accountId: a.id, accountName: a.nickname, type: 'PREMIUM', amount: a.premiumAmount, currency: a.currency });
      }
    }
    if (a.maturityDate && (a.accountType === 'FIXED_DEPOSIT' || a.accountType === 'RECURRING_DEPOSIT')) {
      const d = new Date(a.maturityDate);
      if (d >= asOf && d <= horizon) {
        events.push({ date: a.maturityDate, ownerId: a.ownerProfileId, accountId: a.id, accountName: a.nickname, type: 'MATURITY', amount: a.currentBalance ?? 0, currency: a.currency });
      }
    }
    if (a.emiAmount && a.emiDay) {
      // generate next 3 EMI dates within horizon
      for (let m = 0; m < 3; m++) {
        const d = new Date(asOf); d.setMonth(d.getMonth() + m); d.setDate(a.emiDay);
        if (d >= asOf && d <= horizon) {
          events.push({ date: d.toISOString().slice(0,10), ownerId: a.ownerProfileId, accountId: a.id, accountName: a.nickname, type: 'EMI', amount: a.emiAmount, currency: a.currency });
        }
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export default function AccountingWealthPage() {
  const allOwners = useOwners();
  const allAccounts = useFinancialAccounts();
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  // Default-select all owners once they're loaded.
  useMemo(() => {
    if (selectedOwners.length === 0 && allOwners.length > 0) {
      setSelectedOwners(allOwners.map(o => o.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOwners.length]);
  const [displayCcy, setDisplayCcy] = useState<'INR'|'CAD'|'USD'>('INR');
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [paid, setPaid] = useState<Set<string>>(new Set());

  const accounts = useMemo(
    () => allAccounts.filter(a => selectedOwners.includes(a.ownerProfileId)),
    [allAccounts, selectedOwners]
  );

  const totals = useMemo(() => {
    let assets = 0, liab = 0, liquid = 0;
    const segMap: Record<string, number> = {};
    const liabMap: Record<string, number> = {};
    let monthlyEMI = 0;
    for (const a of accounts) {
      const bal = a.currentBalance ?? 0;
      const v = convertTo(bal, a.currency, displayCcy);
      const isLiab = categoryOf(a.accountType) === 'LIABILITY' || bal < 0;
      if (isLiab) {
        liab += Math.abs(v);
        const seg = LIAB_SEGMENTS.find(s => (s.keys as readonly string[]).includes(a.accountType));
        if (seg) liabMap[seg.label] = (liabMap[seg.label] ?? 0) + Math.abs(v);
        if (a.emiAmount) monthlyEMI += convertTo(a.emiAmount, a.currency, displayCcy);
      } else {
        assets += v;
        const segKey = segmentForAsset(a);
        segMap[segKey] = (segMap[segKey] ?? 0) + v;
        if (isLiquid(a)) liquid += v;
      }
    }
    return { assets, liab, net: assets - liab, liquid, segMap, liabMap, monthlyEMI };
  }, [accounts, displayCcy]);

  const donut = donutSegments(ASSET_SEGMENTS.map(s => ({
    value: totals.segMap[s.key] ?? 0, color: s.color, label: s.label,
  })).filter(s => s.value > 0));

  const liabBars = LIAB_SEGMENTS.map(s => ({ label: s.label, color: s.color, value: totals.liabMap[s.label] ?? 0 }));
  const liabTotal = liabBars.reduce((s, b) => s + b.value, 0);

  const events = useMemo(() => buildEvents(accounts, new Date(asOf), 90).filter(e => !paid.has(`${e.accountId}-${e.date}-${e.type}`)), [accounts, asOf, paid]);

  const policies = accounts.filter(a => categoryOf(a.accountType) === 'INSURANCE' && a.status === 'ACTIVE');

  function dueColor(dateStr?: string) {
    if (!dateStr) return 'text-muted-foreground';
    const days = Math.ceil((new Date(dateStr).getTime() - new Date(asOf).getTime()) / 86400000);
    if (days < 30) return 'text-red-600 font-semibold';
    if (days < 60) return 'text-amber-600 font-semibold';
    return 'text-foreground';
  }

  function ownerName(id: string) {
    const o = allOwners.find(o => o.id === id);
    return o ? ownerDisplayName(o) : '—';
  }

  function markPaid(e: Event) {
    setPaid(prev => { const s = new Set(prev); s.add(`${e.accountId}-${e.date}-${e.type}`); return s; });
    toast.success('Marked as paid');
  }

  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Wealth & investment summary"
          subtitle="Across all owner profiles"
        />

        <Card className="p-4 mb-6 flex flex-wrap gap-3 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[180px] justify-start">
                Owners ({selectedOwners.length}/{allOwners.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {allOwners.map(o => (
                  <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedOwners.includes(o.id)}
                      onCheckedChange={c => setSelectedOwners(prev => c ? [...prev, o.id] : prev.filter(x => x !== o.id))}
                    />
                    {ownerDisplayName(o)}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Select value={displayCcy} onValueChange={v => setDisplayCcy(v as 'INR'|'CAD'|'USD')}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISPLAY_CCY.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs">As of</Label>
            <Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="w-40" />
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountingKPICard label="Total assets" value={totals.assets} currency={displayCcy} icon={TrendingUp} />
          <AccountingKPICard label="Total liabilities" value={totals.liab} currency={displayCcy} icon={AlertCircle} />
          <AccountingKPICard label="Net worth" value={totals.net} currency={displayCcy} icon={Wallet}
            deltaDirection={totals.net >= 0 ? 'up' : 'down'} delta={totals.net >= 0 ? 'Positive' : 'Negative'} />
          <AccountingKPICard label="Liquid assets" value={totals.liquid} currency={displayCcy} icon={Wallet} />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Asset breakdown</h3>
            {donut.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No assets to display.</div>
            ) : (
              <div className="flex items-center gap-4">
                <svg viewBox="0 0 120 120" className="w-32 h-32 flex-shrink-0">
                  {donut.map((s, i) => (
                    <path key={i} d={arc(60, 60, 50, s.start, s.end)} stroke={s.color} strokeWidth="14" fill="none" />
                  ))}
                </svg>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {donut.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="size-3 rounded" style={{ background: s.color }} />{s.label}</span>
                      <span className="text-muted-foreground tabular-nums">{(s.pct * 100).toFixed(1)}% · {formatAccountAmount(s.value, displayCcy)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Liabilities breakdown</h3>
            {liabTotal === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No liabilities.</div>
            ) : (
              <>
                <div className="flex h-3 rounded-full overflow-hidden mb-3">
                  {liabBars.filter(b => b.value > 0).map((b, i) => (
                    <div key={i} style={{ background: b.color, width: `${(b.value / liabTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {liabBars.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="size-3 rounded" style={{ background: b.color }} />{b.label}</span>
                      <span className="text-muted-foreground tabular-nums">{formatAccountAmount(b.value, displayCcy)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Total monthly EMI</span>
                  <span className="font-semibold">{formatAccountAmount(totals.monthlyEMI, displayCcy)}</span>
                </div>
              </>
            )}
          </Card>
        </div>

        <Card className="mb-6">
          <div className="p-5 border-b">
            <h3 className="font-semibold">Upcoming events (next 90 days)</h3>
          </div>
          {events.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No upcoming events.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Owner</th>
                    <th className="text-left p-3">Account</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{e.date}</td>
                      <td className="p-3">{ownerName(e.ownerId)}</td>
                      <td className="p-3">{e.accountName}</td>
                      <td className="p-3">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          e.type === 'PREMIUM' ? 'bg-amber-100 text-amber-700' :
                          e.type === 'MATURITY' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700')}>
                          {e.type}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatAccountAmount(e.amount, e.currency)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => markPaid(e)}>Mark paid</Button>
                        <Button variant="ghost" size="sm" asChild><Link to={`/accounting/owners/${e.ownerId}`}>View</Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Heart className="size-4 text-pink-500" /> Insurance policies</h3>
            {policies.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No active policies.</div>
            ) : (
              <div className="space-y-2">
                {policies.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.nickname}</div>
                      <div className="text-xs text-muted-foreground">{p.institutionName} · SA {formatAccountAmount(p.sumAssured ?? 0, p.currency)}</div>
                      <div className="text-xs">Premium {formatAccountAmount(p.premiumAmount ?? 0, p.currency)} ({p.premiumFrequency?.toLowerCase()})</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-xs', dueColor(p.nextPremiumDate))}>
                        Next: {p.nextPremiumDate ?? '—'}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toast.success('Premium marked paid')}>
                        <Check className="size-3" /> Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Investment portfolio</h3>
            {(() => {
              const inv = accounts.filter(a => categoryOf(a.accountType) === 'INVESTMENT');
              const total = inv.reduce((s, a) => s + convertTo(a.currentBalance ?? 0, a.currency, displayCcy), 0);
              const byOwner: Record<string, number> = {};
              for (const a of inv) byOwner[a.ownerProfileId] = (byOwner[a.ownerProfileId] ?? 0) + convertTo(a.currentBalance ?? 0, a.currency, displayCcy);
              const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ec4899','#0ea5e9'];
              const ownerEntries = Object.entries(byOwner).filter(([, v]) => v > 0);
              return (
                <>
                  <div className="text-2xl font-bold tabular-nums mb-3">{formatAccountAmount(total, displayCcy)}</div>
                  {total > 0 && (
                    <>
                      <div className="flex h-3 rounded-full overflow-hidden mb-3">
                        {ownerEntries.map(([oid, v], i) => (
                          <div key={oid} style={{ background: colors[i % colors.length], width: `${(v / total) * 100}%` }} />
                        ))}
                      </div>
                      <ul className="space-y-1 text-sm">
                        {ownerEntries.map(([oid, v], i) => (
                          <li key={oid} className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><span className="size-3 rounded" style={{ background: colors[i % colors.length] }} />{ownerName(oid)}</span>
                            <span className="text-muted-foreground tabular-nums">{formatAccountAmount(v, displayCcy)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {inv.some(a => a.remarks) && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Holdings</div>
                      <ul className="text-xs space-y-1">
                        {inv.filter(a => a.remarks).map(a => (
                          <li key={a.id}><span className="font-medium">{a.nickname}:</span> <span className="text-muted-foreground">{a.remarks}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

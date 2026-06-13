import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Tag } from "lucide-react";
import { fetchActiveOffers, fetchAccountingEntities, type ServiceOffer, type BillingEntity, type InvoiceLineDraft } from "@/lib/clientRegistration";
import { ServiceOffersConvergenceBanner } from "@/components/performance/ServiceOffersConvergenceBanner";
import { LEGACY_OFFERS_READ_ONLY } from "@/lib/legacyOffersConvergence";
import type { ServiceCatalogueItem } from "@/lib/leads";
import type { FamilyMember } from "@/lib/clientRegistration";
import { cn } from "@/lib/utils";

interface SelectedServices {
  coaching_services: string[];
  visa_services: string[];
  admission_services: string[];
  allied_services: string[];
  travel_services: string[];
}

interface Props {
  primaryName: string;
  selected: SelectedServices;
  catalogue: ServiceCatalogueItem[];
  familyMembers: FamilyMember[];
  serviceFees: Record<string, { amount: number; complimentary?: boolean }>;
  isCounselor: boolean;
  paymentTerms: string;
  onPaymentTermsChange: (v: string) => void;
  billingEntity: string;
  onBillingEntityChange: (v: string) => void;
  onCreateInvoice: (lines: InvoiceLineDraft[]) => void | Promise<void>;
  creating: boolean;
}

const PAYMENT_TERMS = [
  { value: "DUE_ON_RECEIPT", label: "Due on receipt" },
  { value: "NET_7", label: "Net 7" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
];

export const InvoicePreviewSection = ({
  primaryName, selected, catalogue, familyMembers, serviceFees, isCounselor,
  paymentTerms, onPaymentTermsChange, billingEntity, onBillingEntityChange,
  onCreateInvoice, creating,
}: Props) => {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [appliedOfferId, setAppliedOfferId] = useState<string | null>(null);
  const [showOffers, setShowOffers] = useState(false);

  useEffect(() => {
    fetchAccountingEntities().then(setEntities);
    if (isCounselor) fetchActiveOffers().then(setOffers);
  }, [isCounselor]);

  const byCode = useMemo(() => {
    const m = new Map<string, ServiceCatalogueItem>();
    catalogue.forEach((s) => { if (s.service_code) m.set(s.service_code, s); });
    return m;
  }, [catalogue]);

  const lines: InvoiceLineDraft[] = useMemo(() => {
    const out: InvoiceLineDraft[] = [];
    const pushFor = (codes: string[], personType: InvoiceLineDraft["person_type"], personName: string, familyId: string | null, alliedFee = false, isSettlement = false) => {
      codes.forEach((code) => {
        const s = byCode.get(code);
        if (!s) return;
        const overrideFee = serviceFees[code]?.amount;
        const complimentary = !!serviceFees[code]?.complimentary || isSettlement;
        const unit = complimentary ? 0 : (overrideFee ?? Number(s.fee_inr ?? 0));
        out.push({
          service_code: code,
          service_name: s.service_name,
          person_type: personType,
          person_name: personName,
          family_member_id: familyId,
          quantity: 1,
          unit_price: unit,
          discount_amount: 0,
          gst_rate: 18,
          is_complimentary: complimentary,
          offer_id: null,
        });
      });
    };

    pushFor(selected.coaching_services, "primary", primaryName || "Primary", null);
    pushFor(selected.visa_services, "primary", primaryName || "Primary", null);
    pushFor(selected.admission_services, "primary", primaryName || "Primary", null);
    pushFor(selected.allied_services, "primary", primaryName || "Primary", null, true);
    // Treat travel_financial as settlement-style: default complimentary unless override.
    pushFor(selected.travel_services, "primary", primaryName || "Primary", null, false, true);

    familyMembers
      .filter((m) => m.application_mode === "together")
      .forEach((m) => {
        const pname = `${m.first_name} ${m.last_name}`.trim() || m.relationship;
        const ptype: InvoiceLineDraft["person_type"] =
          m.relationship === "spouse" ? "spouse"
          : m.relationship === "child" || m.relationship === "parent" ? "dependent"
          : "other";
        pushFor(m.visa_services ?? [], ptype, pname, m.id);
      });
    return out;
  }, [selected, primaryName, byCode, serviceFees, familyMembers]);

  const subtotal = lines.reduce((s, l) => s + (l.is_complimentary ? 0 : l.unit_price * l.quantity), 0);
  const offer = offers.find((o) => o.id === appliedOfferId);
  const discount = !offer ? 0
    : offer.offer_type === "PERCENT" && offer.discount_percent ? (subtotal * Number(offer.discount_percent)) / 100
    : offer.offer_type === "FIXED_INR" && offer.discount_amount_inr ? Number(offer.discount_amount_inr)
    : 0;
  const taxable = Math.max(0, subtotal - discount);
  const gst = taxable * 0.18;
  const grand = taxable + gst;

  // Group lines by person for display
  const groups: Record<string, { label: string; type: InvoiceLineDraft["person_type"]; lines: InvoiceLineDraft[] }> = {};
  lines.forEach((l) => {
    const key = `${l.person_type}-${l.person_name}`;
    if (!groups[key]) groups[key] = { label: l.person_name, type: l.person_type, lines: [] };
    groups[key].lines.push(l);
  });

  const handleCreate = () => {
    if (lines.length === 0) return;
    // Distribute discount proportionally across non-complimentary lines.
    let outLines = lines;
    if (discount > 0) {
      const totalBase = lines.reduce((s, l) => s + (l.is_complimentary ? 0 : l.unit_price * l.quantity), 0) || 1;
      outLines = lines.map((l) => ({
        ...l,
        discount_amount: l.is_complimentary ? 0 : (l.unit_price * l.quantity / totalBase) * discount,
        offer_id: l.is_complimentary ? null : (appliedOfferId ?? null),
      }));
    }
    onCreateInvoice(outLines);
  };

  return (
    <Card className="p-6 space-y-4 sticky top-4">
      {isCounselor && (
        <ServiceOffersConvergenceBanner scope="registration-invoice" />
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Invoice Preview</h3>
        <Badge variant="outline">DRAFT</Badge>
      </div>

      {Object.entries(groups).length === 0 && (
        <p className="text-sm text-muted-foreground">Select services to build the invoice.</p>
      )}

      <div className="space-y-3">
        {Object.entries(groups).map(([k, g]) => (
          <div key={k} className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              {g.type === "primary" ? "PRIMARY" : g.type === "spouse" ? "SPOUSE" : g.type === "dependent" ? "DEPENDENT" : "OTHER"} — {g.label}
            </div>
            {g.lines.map((l, i) => (
              <div key={`${k}-${i}`} className="flex items-center justify-between text-sm">
                <span className={cn("truncate", l.is_complimentary && "text-muted-foreground italic")}>{l.service_name}</span>
                <span className="font-mono text-xs">
                  {l.is_complimentary ? "Complimentary" : `₹${(l.unit_price * l.quantity).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>

        {isCounselor && (
          <div>
            <Button type="button" variant="ghost" size="sm" className="px-0 h-7" onClick={() => setShowOffers((v) => !v)}>
              <Lock className="h-3.5 w-3.5 mr-1" /> {showOffers ? "Hide" : "Show"} offers
            </Button>
            {showOffers && (
              <div className="space-y-1.5 border rounded-md p-2 bg-muted/30">
                {LEGACY_OFFERS_READ_ONLY && (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Legacy offers are read-only — create new promotions in the Offer Library.
                  </p>
                )}
                {offers.length === 0 && <div className="text-xs text-muted-foreground">No active offers.</div>}
                {offers.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1"><Tag className="h-3 w-3" />{o.offer_name}</div>
                      <div className="text-muted-foreground">
                        {o.offer_type === "PERCENT" ? `${o.discount_percent}% off` :
                         o.offer_type === "FIXED_INR" ? `₹${o.discount_amount_inr} off` : "Combo"}
                        {o.valid_until ? ` · expires ${o.valid_until}` : ""}
                      </div>
                    </div>
                    {!LEGACY_OFFERS_READ_ONLY && (
                      appliedOfferId === o.id ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setAppliedOfferId(null)}>Remove</Button>
                      ) : (
                        <Button type="button" size="sm" variant="secondary" onClick={() => setAppliedOfferId(o.id)}>Apply</Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Internal discount (hidden from client receipt)</span>
            <span className="font-mono">−₹{discount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between"><span>GST (18%)</span><span className="font-mono">₹{gst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between font-semibold pt-1 border-t"><span>Total</span><span className="font-mono">₹{grand.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-xs">Payment Terms</Label>
          <Select value={paymentTerms} onValueChange={onPaymentTermsChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Billing Entity</Label>
          <Select value={billingEntity} onValueChange={onBillingEntityChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {entities.length === 0 && <SelectItem value="default">Future Link Consultants</SelectItem>}
              {entities.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="button" className="w-full" disabled={creating || lines.length === 0} onClick={handleCreate}>
        {creating ? "Creating…" : "Create Draft Invoice"}
      </Button>
    </Card>
  );
};
/* ───────────────────── Create Invoice ───────────────────── */
function CreateInvoiceDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entities, setEntities] = useState<FirmEntity[]>([]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState("INR");
  const [branchId, setBranchId] = useState<string | undefined>();
  const [firmId, setFirmId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Phase 2: offers applicable to this client (eligible via RPC).
  type EligibleOffer = {
    id: string;
    title: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount: number | null;
    promo_code: string | null;
  };
  const [offers, setOffers] = useState<EligibleOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("none");

  useEffect(() => {
    (async () => {
      const [s, b, f] = await Promise.all([
        supabase
          .from("service_catalogue")
          .select("id,service_name,fee_inr,fee_cad")
          .eq("is_active", true)
          .order("service_name")
          .limit(200),
        supabase.from("branches").select("id,name").eq("is_active", true).order("name"),
        supabase.from("firm_profile").select("id,firm_name").order("firm_name"),
      ]);
      setServices((s.data ?? []) as any);
      setBranches((b.data ?? []) as any);
      setEntities((f.data ?? []) as any);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("offers_eligible_for_client", {
          _client_id: clientId,
        });
        if (error) throw error;
        setOffers(
          ((data ?? []) as any[]).map((o) => ({
            id: o.id,
            title: o.title,
            discount_type: o.discount_type,
            discount_value: Number(o.discount_value) || 0,
            max_discount_amount: o.max_discount_amount == null ? null : Number(o.max_discount_amount),
            promo_code: o.promo_code ?? null,
          })),
        );
      } catch {
        // Offers are optional; never block invoice creation if this fails.
        setOffers([]);
      }
    })();
  }, [clientId]);

  const lineItems = useMemo(
    () =>
      Object.entries(picked)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => {
          const svc = services.find((s) => s.id === id);
          const unit = currency === "CAD" ? Number(svc?.fee_cad ?? 0) : Number(svc?.fee_inr ?? 0);
          return {
            service_id: id,
            service_name: svc?.service_name ?? "",
            description: svc?.service_name ?? "",
            quantity: qty,
            currency,
            amount: unit,
            discount: 0,
            tax: 0,
            total: unit * qty,
          };
        }),
    [picked, services, currency],
  );

  const total = lineItems.reduce((s, l) => s + l.total, 0);

  // Phase 2: compute the offer discount against the subtotal (invoice currency).
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) || null;
  const discount = useMemo(() => {
    if (!selectedOffer || total <= 0) return 0;
    let d =
      selectedOffer.discount_type === "percentage"
        ? (total * selectedOffer.discount_value) / 100
        : selectedOffer.discount_value;
    if (selectedOffer.max_discount_amount != null) {
      d = Math.min(d, selectedOffer.max_discount_amount);
    }
    // Never discount below zero or above the subtotal.
    return Math.max(0, Math.min(d, total));
  }, [selectedOffer, total]);

  const netTotal = Math.max(0, total - discount);

  const save = async () => {
    if (lineItems.length === 0) {
      toast.error("Pick at least one service");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `TEMP-${crypto.randomUUID()}`;

    // Phase 2: distribute the discount proportionally across line items so the
    // sum of line totals matches the reduced invoice amount. 'amount' below is
    // the NET (reduced) total — the single source of truth fn_recompute_invoice_totals reads.
    const discountedLineItems =
      discount > 0 && total > 0
        ? lineItems.map((l) => {
            const share = (l.total / total) * discount;
            const lineNet = Math.max(0, l.total - share);
            return { ...l, discount: Number(share.toFixed(2)), total: Number(lineNet.toFixed(2)) };
          })
        : lineItems;

    const { error } = await supabase.from("client_invoices").insert({
      id: invoiceId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      amount: netTotal,
      currency,
      status: "draft",
      line_items: discountedLineItems,
      due_date: dueDate || null,
      branch_id: branchId ?? null,
      firm_entity_id: firmId ?? null,
      created_by: u?.user?.id ?? null,
      invoice_entity_code: "FLC",
      invoice_branch_code:
        branches
          .find((b) => b.id === branchId)
          ?.name?.slice(0, 3)
          .toUpperCase() ?? "GEN",
      fx_snapshot_date: new Date().toISOString().slice(0, 10),
      fx_rate_to_inr: 1,
      fx_rate_to_cad: 1,
      fx_rate_to_usd: 1,
      fx_provider: "manual",
      fx_manual_override: true,
      subtotal_in_inr: netTotal,
      subtotal_in_cad: netTotal,
      subtotal_in_usd: netTotal,
      // Phase 2 attribution (record-keeping; does not drive totals)
      applied_offer_id: selectedOffer ? selectedOffer.id : null,
      offer_discount_amount: discount > 0 ? Number(discount.toFixed(2)) : 0,
      attributed_counselor_id: selectedOffer ? (u?.user?.id ?? null) : null,
      tracking_code: null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    try {
      const { data: cli } = await supabase
        .from("clients")
        .select("owner_id, assigned_counselor_id, full_name")
        .eq("id", clientId)
        .maybeSingle();
      const recipients = resolveCounselorNotificationUserIds(cli as any, {
        event: "invoice_created",
        clientId,
        invoiceId,
      });
      notifyUsers({
        userIds: recipients,
        category: "invoice_created",
        severity: "info",
        title: `Invoice created: ${invoiceNumber}`,
        body: `${(cli as any)?.full_name ?? "Client"} • ${currency} ${netTotal.toFixed(2)}`,
        link: `/clients/${clientId}`,
        entityType: "client_invoice",
        entityId: invoiceId,
        dedupeKey: `invoice:${invoiceId}:created`,
        metadata: { client_id: clientId, amount: netTotal, currency },
      });
    } catch (e) {
      console.warn("[invoice] inapp_notif_throw", e);
    }
    toast.success("Draft invoice created");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["INR", "CAD", "USD"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issuing entity</Label>
            <Select value={firmId} onValueChange={setFirmId}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firm_name || "Firm"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1">Service</th>
                <th className="text-right px-2 py-1">Unit</th>
                <th className="w-24 text-right px-2 py-1">Qty</th>
                <th className="text-right px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const unit = currency === "CAD" ? Number(s.fee_cad ?? 0) : Number(s.fee_inr ?? 0);
                const qty = picked[s.id] ?? 0;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.service_name}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(unit, currency)}</td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) =>
                          setPicked((p) => ({ ...p, [s.id]: Math.max(0, parseInt(e.target.value) || 0) }))
                        }
                        className="h-7 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(unit * qty, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phase 2: optional offer/discount at draft creation */}
        <div className="mt-3">
          <Label>Apply offer (optional)</Label>
          <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
            <SelectTrigger>
              <SelectValue placeholder="No offer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No offer</SelectItem>
              {offers.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.title}
                  {o.discount_type === "percentage"
                    ? ` — ${o.discount_value}% off`
                    : ` — ${currency} ${o.discount_value} off`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 text-right text-sm space-y-0.5">
          <div className="text-muted-foreground">Subtotal: {money(total, currency)}</div>
          {discount > 0 && <div className="text-primary">Offer discount: −{money(discount, currency)}</div>}
          <div className="font-medium">Total: {money(netTotal, currency)}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || netTotal <= 0}>
            {saving ? "Saving…" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Inv = { id: string; invoice_number: string; amount: number; currency: string; status: string; due_date: string|null; points_redeemed: number };

export default function PortalPayments() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}
function Inner({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [wallet, setWallet] = useState<{ available_points: number; points_value_rate: number }|null>(null);
  const [redeemOpen, setRedeemOpen] = useState<Inv | null>(null);
  const [points, setPoints] = useState(50);
  const load = async () => {
    const [i, w] = await Promise.all([
      supabase.from("client_invoices").select("*").eq("client_id", clientId).order("created_at",{ascending:false}),
      supabase.from("credit_wallet").select("available_points,points_value_rate").eq("client_id", clientId).maybeSingle(),
    ]);
    setInvoices((i.data ?? []) as Inv[]); setWallet(w.data);
  };
  useEffect(() => { load(); }, [clientId]);
  const redeem = async () => {
    if (!redeemOpen) return;
    if (points < 50) { toast.error("Minimum 50 points"); return; }
    if (wallet && points > wallet.available_points) { toast.error("Not enough points"); return; }
    const value = points * (wallet?.points_value_rate ?? 1);
    if (value > redeemOpen.amount * 0.5) { toast.error("Cannot redeem more than 50% of invoice"); return; }
    const { error } = await supabase.from("point_redemptions").insert({ client_id: clientId, points_redeemed: points, usd_value: value, service_id: null });
    if (error) { toast.error(error.message); return; }
    toast.success("Redemption submitted"); setRedeemOpen(null); setPoints(50);
  };
  const total = invoices.reduce((s,i) => s + (i.status === "paid" ? 0 : Number(i.amount)), 0);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Payments</h1></div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-bold">${total.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Available Points</div><div className="text-2xl font-bold">{wallet?.available_points ?? 0}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Points Value</div><div className="text-2xl font-bold">${((wallet?.available_points ?? 0) * (wallet?.points_value_rate ?? 1)).toFixed(2)}</div></Card>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            {invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.invoice_number}</TableCell>
                <TableCell>${Number(i.amount).toFixed(2)} {i.currency}</TableCell>
                <TableCell className="text-sm">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded ${i.status==="paid"?"bg-emerald-500/15 text-emerald-700":i.status==="overdue"?"bg-red-500/15 text-red-700":"bg-amber-500/15 text-amber-700"}`}>{i.status}</span></TableCell>
                <TableCell>{i.status !== "paid" && (wallet?.available_points ?? 0) >= 50 && <Button size="sm" variant="outline" onClick={()=>{setRedeemOpen(i);setPoints(50);}}>Redeem points</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!redeemOpen} onOpenChange={(o)=>!o&&setRedeemOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redeem points</DialogTitle></DialogHeader>
          {redeemOpen && (
            <div className="space-y-3">
              <div className="text-sm">Invoice <b>{redeemOpen.invoice_number}</b> — ${Number(redeemOpen.amount).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Min 50 pts · max 50% of invoice · 1 pt = ${(wallet?.points_value_rate ?? 1).toFixed(2)}</div>
              <Input type="number" min={50} value={points} onChange={(e)=>setPoints(parseInt(e.target.value)||0)}/>
              <div className="text-sm">Discount: <b>${(points * (wallet?.points_value_rate ?? 1)).toFixed(2)}</b></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRedeemOpen(null)}>Cancel</Button>
            <Button onClick={redeem}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

type Ref = { id: string; friend_name: string|null; friend_email: string|null; status: string; points_earned: number };

export default function PortalRefer() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}
function Inner({ clientId }: { clientId: string }) {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const link = `${window.location.origin}/portal/auth?ref=${clientId.slice(0,8)}`;
  const load = async () => {
    const { data } = await supabase.from("referrals").select("id,friend_name,friend_email,status,points_earned").eq("referrer_client_id", clientId).order("created_at",{ascending:false});
    setRefs((data ?? []) as Ref[]);
  };
  useEffect(() => { load(); }, [clientId]);
  const submit = async () => {
    if (!name.trim() || (!email && !phone)) { toast.error("Name + email or phone required"); return; }
    const { error } = await supabase.from("referrals").insert({ referrer_client_id: clientId, friend_name: name, friend_email: email||null, friend_phone: phone||null });
    if (error) { toast.error(error.message); return; }
    toast.success("Referral added"); setName(""); setEmail(""); setPhone(""); load();
  };
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Refer & Earn</h1></div>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Your referral link</h3>
        <div className="flex gap-2">
          <Input value={link} readOnly/>
          <Button variant="outline" onClick={()=>{navigator.clipboard.writeText(link);toast.success("Copied");}}><Copy className="size-4"/></Button>
        </div>
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 border rounded"><div className="font-semibold">1 Point = $1.00</div><div className="text-xs text-muted-foreground">Normal</div></div>
          <div className="p-3 border rounded"><div className="font-semibold">1 Point = $1.50</div><div className="text-xs text-muted-foreground">During offers</div></div>
          <div className="p-3 border rounded"><div className="font-semibold">Up to 50%</div><div className="text-xs text-muted-foreground">of consulting fee</div></div>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Invite a friend</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)}/></div>
          <div><Label>Email</Label><Input value={email} onChange={(e)=>setEmail(e.target.value)} type="email"/></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e)=>setPhone(e.target.value)}/></div>
        </div>
        <Button className="mt-3" onClick={submit}>Add referral</Button>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Your Referrals</h3>
        <ul className="divide-y">
          {refs.length === 0 && <li className="text-sm text-muted-foreground py-4 text-center">No referrals yet.</li>}
          {refs.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between">
              <div><div className="font-medium text-sm">{r.friend_name}</div><div className="text-xs text-muted-foreground">{r.friend_email}</div></div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded ${r.status==="joined"?"bg-emerald-500/15 text-emerald-700":"bg-amber-500/15 text-amber-700"}`}>{r.status}</span>
                {r.points_earned > 0 && <div className="text-xs mt-1 font-semibold">+{r.points_earned} pts</div>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

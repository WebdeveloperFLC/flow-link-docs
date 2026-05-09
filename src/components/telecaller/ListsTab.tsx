import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Megaphone, Plus, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImportLeadsDialog } from "./ImportLeadsDialog";
import { BulkDistributeDialog } from "./BulkDistributeDialog";
import { listCampaigns } from "@/lib/telecallerQueue";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ListsTab() {
  const { isAdmin, hasRole } = useAuth();
  const canImport = isAdmin || hasRole(["counselor"]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => setCampaigns(await listCampaigns());
  useEffect(() => { load(); }, []);

  const createCampaign = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("call_campaigns").insert({ name: newName.trim() });
    if (error) { toast.error(error.message); return; }
    setNewName(""); load(); toast.success("Campaign created");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Bulk lead upload</div>
            <div className="text-xs text-muted-foreground">CSV with phone, name, email, status, assigned counselor/telecaller. Duplicates auto-detected.</div>
          </div>
          {canImport ? (
            <div className="flex gap-2">
              <Button onClick={() => setOpen(true)}><Upload className="size-4 mr-1.5" />Import leads</Button>
              {isAdmin && <Button variant="outline" onClick={() => setDistOpen(true)}><Shuffle className="size-4 mr-1.5" />Bulk distribute</Button>}
            </div>
          ) : (
            <Badge variant="outline">Telecallers cannot bulk import — ask an admin or counselor.</Badge>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2"><Megaphone className="size-4" />Campaigns</div>
          {isAdmin && (
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New campaign name" className="h-8 w-56" />
              <Button size="sm" variant="outline" onClick={createCampaign}><Plus className="size-3 mr-1" />Add</Button>
            </div>
          )}
        </div>
        <div className="divide-y">
          {campaigns.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No campaigns yet.</div>}
          {campaigns.map((c) => (
            <div key={c.id} className="p-4 flex justify-between items-center">
              <div className="font-medium">{c.name}</div>
              <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <ImportLeadsDialog open={open} onOpenChange={setOpen} campaigns={campaigns} />
      <BulkDistributeDialog open={distOpen} onOpenChange={setDistOpen} />
    </div>
  );
}
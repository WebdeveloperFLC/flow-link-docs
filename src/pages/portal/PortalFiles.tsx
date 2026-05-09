import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DOCUMENT_TYPES } from "@/lib/portal";
import { Upload, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type FileRow = { id: string; document_type: string; file_name: string|null; file_path: string|null; status: string; remarks: string|null; version: number };

const STATUS_BADGE: Record<string,string> = {
  verified: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  action_required: "bg-orange-500/15 text-orange-700",
  rejected: "bg-red-500/15 text-red-700",
  not_uploaded: "bg-muted text-muted-foreground",
};

export default function PortalFiles() {
  return <PortalLayout render={({ clientId }) => clientId ? <Inner clientId={clientId}/> : null}/>;
}

function Inner({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<FileRow[]>([]);
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [customType, setCustomType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("client_files").select("*").eq("client_id", clientId).order("created_at",{ascending:false});
    setRows((data ?? []) as FileRow[]);
  };
  useEffect(() => { load(); }, [clientId]);

  const upload = async () => {
    const type = customType.trim() || docType;
    if (!type || !file) { toast.error("Pick document type and a file"); return; }
    setBusy(true);
    try {
      const path = `${clientId}/portal/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("client_files").insert({
        client_id: clientId, document_type: type, file_name: file.name, file_path: path,
        status: "pending", uploaded_by: user?.id, uploaded_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Uploaded");
      setOpen(false); setFile(null); setDocType(""); setCustomType(""); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  };

  const download = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from("client-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">File Status</h1><p className="text-sm text-muted-foreground">Upload and track your documents</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1.5"/>Upload Document</Button>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>File</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead><TableHead>Ver</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No documents yet.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.document_type}</TableCell>
                <TableCell className="text-sm">{r.file_name ?? "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[r.status]}`}>{r.status.replace("_"," ")}</span></TableCell>
                <TableCell className="text-sm">{r.remarks ?? "—"}</TableCell>
                <TableCell className="text-sm">v{r.version}</TableCell>
                <TableCell>{r.file_path && <Button size="sm" variant="ghost" onClick={() => download(r.file_path)}><Download className="size-4"/></Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Choose..."/></SelectTrigger>
                <SelectContent>{DEFAULT_DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Or custom type</Label><Input value={customType} onChange={(e)=>setCustomType(e.target.value)} placeholder="e.g. Affidavit"/></div>
            <div><Label>File</Label><Input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={upload} disabled={busy}><Upload className="size-4 mr-1.5"/>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
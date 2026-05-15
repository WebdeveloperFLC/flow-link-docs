import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ComplianceNotice, NoticeStatus } from "../../types/tax";
import { useEntities } from "../../stores/accountingEntitiesStore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (n: ComplianceNotice) => void;
}

export default function AddNoticeDialog({ open, onOpenChange, onCreate }: Props) {
  const entities = useEntities();
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [authority, setAuthority] = useState("");
  const [noticeNumber, setNoticeNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("CAD");
  const [status, setStatus] = useState<NoticeStatus>("OPEN");
  const [linkedDocument, setLinkedDocument] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setAuthority(""); setNoticeNumber(""); setDueDate("");
    setAmount("0"); setStatus("OPEN"); setLinkedDocument(""); setNotes("");
  };

  const submit = () => {
    if (!authority.trim() || !noticeNumber.trim() || !dueDate) {
      toast.error("Authority, notice number and due date are required"); return;
    }
    const ent = entities.find((e) => e.id === entityId);
    onCreate({
      id: `n-${Date.now().toString(36)}`,
      entityId, entityName: ent?.name ?? "—",
      authority, noticeNumber, issueDate, dueDate,
      amount: Number(amount) || 0,
      currency: currency as "CAD" | "USD" | "INR",
      status,
      linkedDocument: linkedDocument || undefined,
      notes: notes || undefined,
    });
    toast.success(`Notice ${noticeNumber} added`);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add tax notice</DialogTitle>
          <DialogDescription>Track a notice from a tax authority and link supporting documents.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as NoticeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="RESPONDED">Responded</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Authority</Label>
            <Input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Canada Revenue Agency" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Notice number</Label>
              <Input value={noticeNumber} onChange={(e) => setNoticeNumber(e.target.value)} placeholder="CRA-2025-04821" />
            </div>
            <div className="grid gap-2">
              <Label>Linked document</Label>
              <Input value={linkedDocument} onChange={(e) => setLinkedDocument(e.target.value)} placeholder="filename.pdf" />
            </div>
            <div className="grid gap-2">
              <Label>Issue date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CAD", "USD", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Summary of the notice and required action" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add notice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
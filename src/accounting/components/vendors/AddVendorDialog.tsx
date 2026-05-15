import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VENDOR_CATEGORY_LABEL } from "../../data/mockVendors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate?: (v: { name: string; category: string; country: string; currency: string; paymentTerms: string }) => void;
}

export default function AddVendorDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("PROFESSIONAL_SERVICES");
  const [country, setCountry] = useState("CA");
  const [currency, setCurrency] = useState("CAD");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [taxId, setTaxId] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Vendor name is required"); return; }
    onCreate?.({ name, category, country, currency, paymentTerms });
    toast.success(`Vendor "${name}" created`);
    onOpenChange(false);
    setName(""); setTaxId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
          <DialogDescription>Create a new vendor to track bills and payments.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="vname">Vendor name</Label>
            <Input id="vname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Office Supplies" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VENDOR_CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CA","US","IN","GB","DE","CZ","AU"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CAD","USD","INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Due on receipt","Net 7","Net 14","Net 15","Net 21","Net 30","Net 45","Net 60"].map(p =>
                    <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="789456123BC0001" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Create vendor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
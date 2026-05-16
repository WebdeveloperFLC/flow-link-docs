import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DynamicSelect from "../shared/DynamicSelect";
import { addVendor } from "../../stores/vendorsStore";
import type { Vendor, VendorCategory } from "../../types/vendors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate?: (v: Vendor) => void;
}

export default function AddVendorDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("PROFESSIONAL_SERVICES");
  const [country, setCountry] = useState("CA");
  const [currency, setCurrency] = useState("CAD");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showContact, setShowContact] = useState(false);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Vendor name is required"); return; }
    const created = addVendor({
      name: name.trim(),
      legalName: name.trim(),
      category: category as VendorCategory,
      country,
      taxId: taxId || "—",
      paymentTerms,
      currency: currency as Vendor["currency"],
      status: "ACTIVE",
      email: contactEmail || "",
      phone: contactPhone || "",
      address: "",
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
    });
    onCreate?.(created);
    toast.success(`Vendor "${name}" created`);
    onOpenChange(false);
    setName(""); setTaxId("");
    setContactName(""); setContactEmail(""); setContactPhone("");
    setShowContact(false);
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
              <DynamicSelect listKey="vendor_categories" value={category} onValueChange={setCategory} addLabel="category" />
            </div>
            <div className="grid gap-2">
              <Label>Country</Label>
              <DynamicSelect listKey="countries" value={country} onValueChange={setCountry} addLabel="country" />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <DynamicSelect listKey="currencies" value={currency} onValueChange={setCurrency} addLabel="currency" />
            </div>
            <div className="grid gap-2">
              <Label>Payment terms</Label>
              <DynamicSelect listKey="payment_terms" value={paymentTerms} onValueChange={setPaymentTerms} addLabel="payment term" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="789456123BC0001" />
          </div>

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowContact(v => !v)}
              className="text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {showContact ? "− " : "+ "}Contact person (optional)
            </button>
            {showContact && (
              <div className="grid gap-3 mt-3">
                <div className="grid gap-2">
                  <Label htmlFor="cname">Contact name</Label>
                  <Input id="cname" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="cemail">Contact email</Label>
                    <Input id="cemail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="jane@vendor.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cphone">Contact phone</Label>
                    <Input id="cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 0100" />
                  </div>
                </div>
              </div>
            )}
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
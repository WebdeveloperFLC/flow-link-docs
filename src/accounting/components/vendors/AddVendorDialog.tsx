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
import { Plus } from "lucide-react";
import { useVendorCategories, addVendorCategory } from "../../stores/vendorCategoriesStore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate?: (v: { name: string; category: string; country: string; currency: string; paymentTerms: string }) => void;
}

export default function AddVendorDialog({ open, onOpenChange, onCreate }: Props) {
  const categories = useVendorCategories();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("PROFESSIONAL_SERVICES");
  const [country, setCountry] = useState("CA");
  const [currency, setCurrency] = useState("CAD");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Vendor name is required"); return; }
    onCreate?.({ name, category, country, currency, paymentTerms });
    toast.success(`Vendor "${name}" created`);
    onOpenChange(false);
    setName(""); setTaxId("");
    setContactName(""); setContactEmail(""); setContactPhone("");
    setShowContact(false);
  };

  const handleAddCategory = () => {
    const created = addVendorCategory(newCategoryLabel);
    if (!created) { toast.error("Enter a valid category name"); return; }
    setCategory(created.code);
    setNewCategoryLabel("");
    setAddingCategory(false);
    toast.success(`Category "${created.label}" added`);
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
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                <button type="button"
                  onClick={() => setAddingCategory(v => !v)}
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                  <Plus className="size-3" /> {addingCategory ? "Cancel" : "New"}
                </button>
              </div>
              {addingCategory ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="e.g. Insurance"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  />
                  <Button type="button" size="sm" onClick={handleAddCategory}>Add</Button>
                </div>
              ) : (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Users, Pencil, Ticket } from "lucide-react";
import { OfferTrackingCodes } from "@/components/offers/OfferTrackingCodes";
import { useMasterLabels } from "@/lib/masters";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  promo_code: string | null;
  discount_type: string;
  discount_value: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  audience: "global" | "group" | "individual";
  target_countries: string[] | null;
  applicable_services: string[] | null;
}
interface Group {
  id: string;
  name: string;
  description: string | null;
}
interface Client {
  id: string;
  full_name: string;
  email: string | null;
}

export default function OffersAdmin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return (
    <AppLayout>
      <PageHeader title="Offers & Discounts" />
      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="offers">
          <TabsList>
            <TabsTrigger value="offers">
              <Tag className="size-4 mr-1" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="size-4 mr-1" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="codes">
              <Ticket className="size-4 mr-1" />
              Tracking codes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="offers" className="pt-4">
            <OffersTab />
          </TabsContent>
          <TabsContent value="groups" className="pt-4">
            <GroupsTab />
          </TabsContent>
          <TabsContent value="codes" className="pt-4">
            <OfferTrackingCodes />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function OffersTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    setOffers((data ?? []) as Offer[]);
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          New offer
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {offers.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">
            No offers yet. Create one to share with your clients.
          </Card>
        )}
        {offers.map((o) => (
          <Card key={o.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{o.title}</div>
                <div className="text-xs text-muted-foreground">
                  {o.discount_type === "percentage" ? `${o.discount_value}% off` : `$${o.discount_value} off`}
                  {o.promo_code ? ` · code ${o.promo_code}` : ""}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(o);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(o.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${o.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted"}`}>
                {o.is_active ? "Active" : "Inactive"}
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">{o.audience}</span>
              {o.valid_to && (
                <span className="text-muted-foreground">until {new Date(o.valid_to).toLocaleDateString()}</span>
              )}
            </div>
            {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
          </Card>
        ))}
      </div>
      <OfferDialog open={open} onOpenChange={setOpen} offer={editing} onSaved={load} />
    </div>
  );
}

function OfferDialog({
  open,
  onOpenChange,
  offer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  offer: Offer | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Offer>>({
    discount_type: "percentage",
    discount_value: 0,
    audience: "global",
    is_active: true,
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());
  const [selClients, setSelClients] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  // Phase 3: country + service targeting (country = master labels; service = service_catalogue.id)
  const countryOptions = useMasterLabels("countries");
  const [serviceOptions, setServiceOptions] = useState<{ id: string; service_name: string }[]>([]);
  const [selCountries, setSelCountries] = useState<Set<string>>(new Set());
  const [selServices, setSelServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setForm(offer ?? { discount_type: "percentage", discount_value: 0, audience: "global", is_active: true });
    supabase
      .from("offer_groups")
      .select("*")
      .order("name")
      .then(({ data }) => setGroups((data ?? []) as Group[]));
    supabase
      .from("service_catalogue")
      .select("id, service_name")
      .eq("is_active", true)
      .order("service_name")
      .then(({ data }) => setServiceOptions((data ?? []) as { id: string; service_name: string }[]));
    // Phase 3: seed country/service selections from the offer being edited
    setSelCountries(new Set(offer?.target_countries ?? []));
    setSelServices(new Set(offer?.applicable_services ?? []));
    if (offer) {
      supabase
        .from("offer_audience_targets")
        .select("*")
        .eq("offer_id", offer.id)
        .then(({ data }) => {
          setSelGroups(new Set((data ?? []).filter((t: any) => t.group_id).map((t: any) => t.group_id)));
          setSelClients(new Set((data ?? []).filter((t: any) => t.client_id).map((t: any) => t.client_id)));
        });
    } else {
      setSelGroups(new Set());
      setSelClients(new Set());
    }
  }, [open, offer]);

  useEffect(() => {
    if (form.audience !== "individual" || !open) return;
    const t = setTimeout(async () => {
      const q = supabase.from("clients").select("id, full_name, email").order("full_name").limit(50);
      const { data } = search ? await q.ilike("full_name", `%${search}%`) : await q;
      setClients((data ?? []) as Client[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, form.audience, open]);

  const save = async () => {
    if (!form.title) {
      toast.error("Title required");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description ?? null,
      promo_code: form.promo_code || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value ?? 0,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      is_active: form.is_active ?? true,
      audience: form.audience ?? "global",
      target_countries: Array.from(selCountries),
      applicable_services: Array.from(selServices),
    };
    let offerId = offer?.id;
    if (offer) {
      const { error } = await supabase.from("offers").update(payload).eq("id", offer.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("offers").insert(payload).select("id").single();
      if (error) {
        toast.error(error.message);
        return;
      }
      offerId = data.id;
    }
    // Replace audience targets
    if (offerId) {
      await supabase.from("offer_audience_targets").delete().eq("offer_id", offerId);
      const rows: any[] = [];
      if (payload.audience === "group") selGroups.forEach((g) => rows.push({ offer_id: offerId, group_id: g }));
      if (payload.audience === "individual") selClients.forEach((c) => rows.push({ offer_id: offerId, client_id: c }));
      if (rows.length) await supabase.from("offer_audience_targets").insert(rows);
    }
    toast.success("Saved");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "New offer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Discount type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                value={form.discount_value ?? 0}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Promo code</Label>
              <Input value={form.promo_code ?? ""} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valid from</Label>
              <Input
                type="date"
                value={form.valid_from?.slice(0, 10) ?? ""}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Valid to</Label>
              <Input
                type="date"
                value={form.valid_to?.slice(0, 10) ?? ""}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value || null })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Target countries (optional)</Label>
              <div className="text-xs text-muted-foreground mb-1">Empty = all countries.</div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {countryOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">No countries in master list.</div>
                )}
                {countryOptions.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selCountries.has(c)}
                      onChange={(e) => {
                        const s = new Set(selCountries);
                        e.target.checked ? s.add(c) : s.delete(c);
                        setSelCountries(s);
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Applicable services (optional)</Label>
              <div className="text-xs text-muted-foreground mb-1">Empty = all services.</div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {serviceOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">No active services.</div>
                )}
                {serviceOptions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selServices.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selServices);
                        e.target.checked ? next.add(s.id) : next.delete(s.id);
                        setSelServices(next);
                      }}
                    />
                    {s.service_name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Offer["audience"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">All clients (global)</SelectItem>
                <SelectItem value="group">Specific groups (legacy)</SelectItem>
                <SelectItem value="individual">Specific clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.audience === "group" && (
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
              {groups.length === 0 && (
                <div className="text-xs text-muted-foreground">No groups yet — create one in the Groups tab.</div>
              )}
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selGroups.has(g.id)}
                    onChange={(e) => {
                      const s = new Set(selGroups);
                      e.target.checked ? s.add(g.id) : s.delete(g.id);
                      setSelGroups(s);
                    }}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          )}
          {form.audience === "individual" && (
            <div className="space-y-2">
              <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="text-xs text-muted-foreground">{selClients.size} selected</div>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {clients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selClients.has(c.id)}
                      onChange={(e) => {
                        const s = new Set(selClients);
                        e.target.checked ? s.add(c.id) : s.delete(c.id);
                        setSelClients(s);
                      }}
                    />
                    <span className="flex-1">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Client[]>([]);

  const load = async () => {
    const { data } = await supabase.from("offer_groups").select("*").order("name");
    setGroups((data ?? []) as Group[]);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase
      .from("offer_groups")
      .insert({ name: name.trim(), description: desc.trim() || null });
    if (error) toast.error(error.message);
    else {
      setName("");
      setDesc("");
      load();
      toast.success("Group created");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete group?")) return;
    await supabase.from("offer_groups").delete().eq("id", id);
    load();
  };

  const loadMembers = async (g: Group) => {
    setActiveGroup(g);
    const { data } = await supabase
      .from("offer_group_members")
      .select("client_id, clients(id, full_name, email)")
      .eq("group_id", g.id);
    setMembers((data ?? []).map((d: any) => d.clients).filter(Boolean));
  };
  useEffect(() => {
    if (!activeGroup) return;
    const t = setTimeout(async () => {
      const q = supabase.from("clients").select("id, full_name, email").order("full_name").limit(30);
      const { data } = search ? await q.ilike("full_name", `%${search}%`) : await q;
      setResults((data ?? []) as Client[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, activeGroup]);

  const addMember = async (cid: string) => {
    if (!activeGroup) return;
    await supabase.from("offer_group_members").insert({ group_id: activeGroup.id, client_id: cid });
    loadMembers(activeGroup);
  };
  const removeMember = async (cid: string) => {
    if (!activeGroup) return;
    await supabase.from("offer_group_members").delete().eq("group_id", activeGroup.id).eq("client_id", cid);
    loadMembers(activeGroup);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Groups</h3>
        <div className="space-y-2">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
          />
          <Button onClick={create} size="sm">
            <Plus className="size-4 mr-1" />
            Create group
          </Button>
        </div>
        <div className="space-y-1 pt-3 border-t">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${activeGroup?.id === g.id ? "bg-primary/10" : "hover:bg-muted"}`}
              onClick={() => loadMembers(g)}
            >
              <span className="flex-1 text-sm">{g.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(g.id);
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{activeGroup ? `Members of ${activeGroup.name}` : "Select a group"}</h3>
        {activeGroup && (
          <>
            <div className="space-y-1">
              {members.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{c.full_name}</span>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => removeMember(c.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              {members.length === 0 && <div className="text-xs text-muted-foreground">No members yet.</div>}
            </div>
            <div className="pt-3 border-t space-y-2">
              <Input placeholder="Search clients to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {results
                  .filter((c) => !members.some((m) => m.id === c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addMember(c.id)}
                      className="flex items-center gap-2 text-sm w-full text-left p-1 hover:bg-muted rounded"
                    >
                      <Plus className="size-3" />
                      <span>{c.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{c.email}</span>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

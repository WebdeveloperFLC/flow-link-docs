import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus, Users, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { buildServiceCode, buildServiceLibraryParams } from "@/lib/service-library/serviceCodes";
import { enrollClientInServiceLibraryApplication } from "@/lib/service-library/enrollClientInService";

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  application_id: string | null;
};

type LeadRow = {
  id: string;
  lead_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  interested_countries: string[] | null;
  converted_to_client_id: string | null;
};

type MainTab = "client" | "lead" | "create";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryId: string;
  serviceTitle: string;
  subService: string;
  serviceCategory: string;
  country: string | null;
  shareLink: string;
  mode?: "application" | "push";
};

export function ServiceLibraryClientDialog({
  open,
  onOpenChange,
  libraryId,
  serviceTitle,
  subService,
  serviceCategory,
  country,
  shareLink,
  mode = "application",
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MainTab>("client");
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickedClient, setPickedClient] = useState<string | null>(null);
  const [pickedLead, setPickedLead] = useState<string | null>(null);

  const serviceCode = useMemo(() => buildServiceCode(libraryId, country), [libraryId, country]);

  const serviceParams = useMemo(
    () =>
      buildServiceLibraryParams({
        libraryId,
        country,
        serviceTitle,
        serviceCode,
        subService,
      }),
    [libraryId, country, serviceTitle, serviceCode, subService],
  );

  useEffect(() => {
    if (!open) {
      setQ("");
      setPickedClient(null);
      setPickedLead(null);
      setTab("client");
      return;
    }
    setLoading(true);
    Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, email, phone, country, application_id")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("leads")
        .select(
          "id, lead_number, first_name, last_name, email, phone, interested_countries, converted_to_client_id",
        )
        .is("converted_to_client_id", null)
        .order("updated_at", { ascending: false })
        .limit(200),
    ])
      .then(([clientsRes, leadsRes]) => {
        if (clientsRes.error) toast.error(clientsRes.error.message);
        else setClients((clientsRes.data ?? []) as ClientRow[]);
        if (leadsRes.error) toast.error(leadsRes.error.message);
        else setLeads((leadsRes.data ?? []) as LeadRow[]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filteredClients = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? clients.filter(
          (c) =>
            c.full_name?.toLowerCase().includes(needle) ||
            c.application_id?.toLowerCase().includes(needle) ||
            c.email?.toLowerCase().includes(needle) ||
            c.phone?.includes(needle),
        )
      : clients;
    return list.slice(0, 50);
  }, [clients, q]);

  const filteredLeads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? leads.filter((l) => {
          const name = `${l.first_name} ${l.last_name}`.toLowerCase();
          return (
            name.includes(needle) ||
            l.lead_number?.toLowerCase().includes(needle) ||
            l.email?.toLowerCase().includes(needle) ||
            l.phone?.includes(needle)
          );
        })
      : leads;
    return list.slice(0, 50);
  }, [leads, q]);

  const openNewClient = () => {
    onOpenChange(false);
    navigate(`/clients/new?${serviceParams.toString()}`);
  };

  const openNewLead = () => {
    onOpenChange(false);
    navigate(`/leads/new?${serviceParams.toString()}`);
  };

  const openClient = async (clientId: string) => {
    if (mode === "push") {
      const ok = await copyToClipboard(shareLink);
      toast[ok ? "success" : "error"](
        ok ? "Service Library link copied — paste in client chat or notes" : "Could not copy link",
      );
      onOpenChange(false);
      navigate(`/clients/${clientId}`);
      return;
    }

    setBusy(true);
    try {
      const result = await enrollClientInServiceLibraryApplication({
        clientId,
        libraryId,
        country,
        serviceTitle,
        subService,
        serviceCategory,
      });
      onOpenChange(false);
      if (result.pipelineAssigned) {
        toast.success(`Linked to ${serviceTitle}`);
      } else {
        toast.success(`Service added — assign a pipeline on the client page if needed`);
      }
      navigate(`/clients/${clientId}?service=${encodeURIComponent(result.serviceCode)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not link client to this service";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const openLead = () => {
    if (!pickedLead) {
      toast.error("Select a lead");
      return;
    }
    onOpenChange(false);
    navigate(`/leads/${pickedLead}`);
  };

  const registerLeadAsClient = () => {
    if (!pickedLead) {
      toast.error("Select a lead");
      return;
    }
    const p = new URLSearchParams(serviceParams);
    p.set("lead_id", pickedLead);
    onOpenChange(false);
    navigate(`/clients/new?${p.toString()}`);
  };

  const title = mode === "push" ? "Push to client" : "New application";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Link this service to an existing lead or client, or start a new record.
          </p>
          <p className="text-xs text-muted-foreground font-medium">{serviceTitle}</p>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="client" className="gap-1 text-xs sm:text-sm">
              <Users className="size-3.5 shrink-0" />
              Client
            </TabsTrigger>
            <TabsTrigger value="lead" className="gap-1 text-xs sm:text-sm">
              <UserRound className="size-3.5 shrink-0" />
              Lead
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1 text-xs sm:text-sm">
              <UserPlus className="size-3.5 shrink-0" />
              Create
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search client name, ID, email…"
                className="pl-8"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <PersonList
              loading={loading}
              emptyLabel="No clients found"
              items={filteredClients.map((c) => ({
                id: c.id,
                title: c.full_name,
                subtitle: [c.application_id, c.country, c.email].filter(Boolean).join(" · "),
              }))}
              picked={pickedClient}
              onPick={setPickedClient}
            />
          </TabsContent>

          <TabsContent value="lead" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search lead name, number, email…"
                className="pl-8"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <PersonList
              loading={loading}
              emptyLabel="No open leads (not yet converted)"
              items={filteredLeads.map((l) => ({
                id: l.id,
                title: `${l.first_name} ${l.last_name}`.trim(),
                subtitle: [l.lead_number, l.interested_countries?.[0], l.email].filter(Boolean).join(" · "),
              }))}
              picked={pickedLead}
              onPick={setPickedLead}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-3 space-y-4">
            {country && (
              <div className="text-sm">
                <Label className="text-muted-foreground">Country</Label>
                <p className="font-medium">{country}</p>
              </div>
            )}
            <div className="text-sm">
              <Label className="text-muted-foreground">Service</Label>
              <p className="font-medium">{subService}</p>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" className="w-full justify-start" onClick={openNewLead}>
                <UserRound className="size-4 mr-2" />
                New lead
              </Button>
              <Button className="w-full justify-start" onClick={openNewClient}>
                <UserPlus className="size-4 mr-2" />
                New client (full registration)
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {tab === "client" && (
            <Button
              onClick={() => pickedClient && openClient(pickedClient)}
              disabled={!pickedClient || busy}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Linking…
                </>
              ) : mode === "push" ? (
                "Copy link & open client"
              ) : (
                "Link & open client"
              )}
            </Button>
          )}
          {tab === "lead" && (
            <>
              <Button variant="outline" onClick={openLead} disabled={!pickedLead || busy}>
                Open lead
              </Button>
              <Button onClick={registerLeadAsClient} disabled={!pickedLead || busy}>
                Register as client
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonList({
  loading,
  emptyLabel,
  items,
  picked,
  onPick,
}: {
  loading: boolean;
  emptyLabel: string;
  items: { id: string; title: string; subtitle: string }[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="max-h-52 overflow-y-auto border rounded-md divide-y">
      {loading ? (
        <div className="p-6 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length ? (
        items.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onPick(row.id)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${
              picked === row.id ? "bg-primary/10" : ""
            }`}
          >
            <div className="font-medium">{row.title}</div>
            {row.subtitle && <div className="text-xs text-muted-foreground">{row.subtitle}</div>}
          </button>
        ))
      ) : (
        <p className="p-4 text-sm text-muted-foreground text-center">{emptyLabel}</p>
      )}
    </div>
  );
}

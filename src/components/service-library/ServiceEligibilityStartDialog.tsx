import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus, Users, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchEligibilityQuestions, prefillEligibilityFromClient } from "@/lib/service-eligibility/questions";
import { createStaffEligibilitySession } from "@/lib/service-eligibility/sessions";
import { dialCodeFor } from "@/lib/countryCodes";
import { PhoneCodeSelect } from "@/components/leads/PhoneCodeSelect";

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryId: string;
  serviceTitle: string;
  country: string | null;
};

export function ServiceEligibilityStartDialog({
  open,
  onOpenChange,
  libraryId,
  serviceTitle,
  country,
}: Props) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(() => {
    const cc = dialCodeFor(country ?? "Canada");
    return cc ? `+${cc}` : "+1";
  });

  useEffect(() => {
    if (!open) return;
    const cc = dialCodeFor(country ?? "Canada");
    if (cc) setPhoneCountryCode(`+${cc}`);
    setLoading(true);
    supabase
      .from("clients")
      .select("id, full_name, email, phone")
      .order("updated_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setClients((data ?? []) as ClientRow[]);
      })
      .finally(() => setLoading(false));
  }, [open, country]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? clients.filter(
          (c) =>
            c.full_name?.toLowerCase().includes(needle) ||
            c.email?.toLowerCase().includes(needle) ||
            c.phone?.includes(needle),
        )
      : clients;
    return list.slice(0, 50);
  }, [clients, q]);

  const start = async () => {
    setBusy(true);
    try {
      let prefillAnswers: Record<string, unknown> = {};
      if (tab === "existing" && picked) {
        const qs = await fetchEligibilityQuestions(libraryId);
        prefillAnswers = await prefillEligibilityFromClient(picked, qs);
      }

      let result: { sessionId: string };
      if (tab === "existing") {
        if (!picked) {
          toast.error("Select a client");
          setBusy(false);
          return;
        }
        result = await createStaffEligibilitySession({
          libraryId,
          clientId: picked,
          prefillAnswers,
        });
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error("First and last name required");
          setBusy(false);
          return;
        }
        result = await createStaffEligibilitySession({
          libraryId,
          prefillAnswers,
          newClient: {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim() || null,
            phone: phone.trim() || null,
            phone_country_code: phoneCountryCode,
            country: country ?? "Canada",
          },
        });
      }

      onOpenChange(false);
      window.open(`/eligibility/run/${result.sessionId}`, "_blank");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start assessment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5" />
            Eligibility Assessment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{serviceTitle}</p>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "existing" | "new")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="existing">
              <Users className="size-3.5 mr-1" /> Existing client
            </TabsTrigger>
            <TabsTrigger value="new">
              <UserPlus className="size-3.5 mr-1" /> New client
            </TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search client…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {loading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPicked(c.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${
                      picked === c.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="new" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <div>
                <Label>Country code</Label>
                <PhoneCodeSelect value={phoneCountryCode} onChange={setPhoneCountryCode} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  inputMode="tel"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={start} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Start assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

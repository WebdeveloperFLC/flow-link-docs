import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Copy, Ticket } from "lucide-react";

interface OfferLite {
  id: string;
  title: string;
  promo_code: string | null;
}

interface CounselorLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CodeRow {
  id: string;
  offer_id: string;
  counselor_id: string;
  code: string;
  created_at: string;
}

export function OfferTrackingCodes() {
  const [offers, setOffers] = useState<OfferLite[]>([]);
  const [counselors, setCounselors] = useState<CounselorLite[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>("");
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load offers + counselors once
  useEffect(() => {
    (async () => {
      const { data: offerData } = await supabase
        .from("offers")
        .select("id,title,promo_code")
        .order("created_at", { ascending: false });
      setOffers((offerData ?? []) as OfferLite[]);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("role", ["counselor", "admin"]);
      const ids = Array.from(new Set((roleData ?? []).map((r: any) => r.user_id))).filter(Boolean);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", ids as string[]);
        setCounselors((profs ?? []) as CounselorLite[]);
      } else {
        setCounselors([]);
      }
    })();
  }, []);

  const loadCodes = useCallback(async (offerId: string) => {
    if (!offerId) {
      setCodes([]);
      return;
    }
    setLoadingCodes(true);
    try {
      const { data, error } = await supabase
        .from("offer_tracking_codes")
        .select("id,offer_id,counselor_id,code,created_at")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCodes((data ?? []) as CodeRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tracking codes");
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  useEffect(() => {
    loadCodes(selectedOfferId);
  }, [selectedOfferId, loadCodes]);

  const counselorName = (id: string) => {
    const c = counselors.find((x) => x.id === id);
    return c?.full_name || c?.email || id.slice(0, 8);
  };

  const generate = async () => {
    if (!selectedOfferId || !selectedCounselorId) {
      toast.error("Pick an offer and a counselor");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc("generate_offer_tracking_code", {
        _offer_id: selectedOfferId,
        _counselor_id: selectedCounselorId,
      });
      if (error) throw error;
      const code = data as unknown as string;
      toast.success(`Code ready: ${code}`);
      await loadCodes(selectedOfferId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="size-4 text-primary" />
          <h3 className="font-semibold">Counselor tracking codes</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a unique code per counselor for an offer. Codes are idempotent — generating again for
          the same offer and counselor returns the existing code.
        </p>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Offer</label>
            <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
              <SelectTrigger>
                <SelectValue placeholder="Select offer" />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                    {o.promo_code ? ` (${o.promo_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Counselor</label>
            <Select value={selectedCounselorId} onValueChange={setSelectedCounselorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select counselor" />
              </SelectTrigger>
              <SelectContent>
                {counselors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={generating || !selectedOfferId || !selectedCounselorId} className="gap-1">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
            Generate code
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-3">
          {selectedOfferId ? "Codes for selected offer" : "Select an offer to view its codes"}
        </h4>
        {loadingCodes ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading…
          </div>
        ) : !selectedOfferId ? null : codes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No tracking codes generated for this offer yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Counselor</th>
                  <th className="text-left py-2 px-2">Code</th>
                  <th className="text-left py-2 px-2">Created</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 px-2">{counselorName(c.counselor_id)}</td>
                    <td className="py-2 px-2 font-mono font-bold">{c.code}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => copy(c.code)} title="Copy code">
                        <Copy className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

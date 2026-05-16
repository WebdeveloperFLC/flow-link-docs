import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = [180, 120, 90, 60, 30, 7];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: agreements } = await supabase
      .from("upi_agreements")
      .select("id, institution_id, title, valid_to, status")
      .eq("status", "active")
      .not("valid_to", "is", null);
    const now = Date.now();
    let created = 0;
    for (const a of agreements ?? []) {
      const days = Math.ceil((new Date(a.valid_to).getTime() - now) / (1000 * 60 * 60 * 24));
      for (const t of THRESHOLDS) {
        if (days <= t && days > 0) {
          const fireDate = new Date(new Date(a.valid_to).getTime() - t * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);
          const { error } = await supabase
            .from("upi_renewal_alerts")
            .upsert(
              {
                agreement_id: a.id,
                threshold_days: t,
                fire_at: fireDate,
                status: "pending",
              },
              { onConflict: "agreement_id,threshold_days", ignoreDuplicates: true },
            );
          if (!error) created++;

          // AI suggestion mirror
          await supabase.from("upi_ai_suggestions").insert({
            institution_id: a.institution_id,
            suggestion_type: "general",
            title: `Agreement renewal in ${days} day(s)`,
            description: `${a.title} expires ${a.valid_to}. Initiate renewal review.`,
            suggestion_data: { agreement_id: a.id, threshold_days: t },
            confidence: 95,
          });
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, scanned: agreements?.length ?? 0, alerts_created: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
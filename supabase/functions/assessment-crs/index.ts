import { calculateCrs } from "../_shared/crs/calculator.ts";
import { calculateFsw67 } from "../_shared/crs/fsw67.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { answers } = await req.json();
    const a = answers ?? {};
    const result = calculateCrs(a);
    const fsw = calculateFsw67(a);
    return new Response(JSON.stringify({ ...result, fsw67: fsw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

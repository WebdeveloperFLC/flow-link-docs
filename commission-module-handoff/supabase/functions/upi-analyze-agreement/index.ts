import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CCY = /^[A-Z]{3}$/;

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function validateExtraction(parsed: {
  institution?: Record<string, any>;
  agreement?: Record<string, any>;
  commission?: Record<string, any>;
}) {
  const missing: string[] = [];
  const low: string[] = [];
  const notes: string[] = [];
  const inst = parsed.institution ?? {};
  const ag = parsed.agreement ?? {};
  const comm = parsed.commission ?? {};
  const rules = Array.isArray(comm.rules) ? comm.rules : [];

  // Required institution fields
  for (const f of ["legal_name", "address", "signing_authority"]) {
    if (isEmpty(inst[f])) missing.push(`institution.${f}`);
  }
  if (isEmpty(inst.agent_email) && isEmpty(inst.phone)) {
    missing.push("institution.agent_email_or_phone");
  }

  // Required agreement fields
  const reqAg = [
    "agreement_type", "valid_from", "valid_to", "governing_law",
    "claim_deadline_days", "invoice_deadline_days", "termination_notice_days",
    "payment_method", "signed_on", "institution_signed_on", "institution_signed_by",
    "sub_agent_allowed", "consent_form_required", "countries_allowed", "ai_summary",
  ];
  for (const f of reqAg) {
    if (isEmpty(ag[f])) missing.push(`agreement.${f}`);
  }

  // Date sanity
  for (const d of ["valid_from", "valid_to", "signed_on", "institution_signed_on"]) {
    const v = ag[d];
    if (v && typeof v === "string" && !ISO_DATE.test(v)) {
      low.push(`agreement.${d}`);
      notes.push(`${d} is not ISO YYYY-MM-DD (got "${v}")`);
    }
  }
  if (ag.valid_from && ag.valid_to && ISO_DATE.test(ag.valid_from) && ISO_DATE.test(ag.valid_to)) {
    if (ag.valid_to <= ag.valid_from) {
      low.push("agreement.valid_to");
      notes.push("valid_to is not after valid_from");
    }
  }
  for (const d of ["claim_deadline_days", "invoice_deadline_days", "termination_notice_days"]) {
    const v = ag[d];
    if (v != null && (typeof v !== "number" || v < 0 || v > 3650)) {
      low.push(`agreement.${d}`);
      notes.push(`${d} out of range`);
    }
  }

  // Commission
  if (isEmpty(comm.model_type)) missing.push("commission.model_type");
  if (isEmpty(comm.currency)) {
    missing.push("commission.currency");
  } else if (!CCY.test(String(comm.currency))) {
    low.push("commission.currency");
    notes.push(`currency "${comm.currency}" is not a 3-letter ISO code`);
  }
  if (rules.length === 0) {
    missing.push("commission.rules");
  } else {
    rules.forEach((r: any, i: number) => {
      if (isEmpty(r.rule_type)) missing.push(`commission.rules[${i}].rule_type`);
      if (isEmpty(r.payout_type)) missing.push(`commission.rules[${i}].payout_type`);
      if (typeof r.payout_amount === "number" && r.payout_amount < 0) {
        low.push(`commission.rules[${i}].payout_amount`);
        notes.push(`rule ${i + 1} payout_amount is negative`);
      }
      if (r.payout_type === "percentage" && typeof r.payout_amount === "number" && r.payout_amount > 100) {
        low.push(`commission.rules[${i}].payout_amount`);
        notes.push(`rule ${i + 1} percentage payout > 100`);
      }
    });
  }

  return {
    missing_fields: missing,
    low_confidence_fields: low,
    notes,
    needs_review: missing.length > 0 || low.length > 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { agreement_id, institution_id } = await req.json();
    if (!agreement_id || !institution_id) throw new Error("agreement_id and institution_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ag } = await supabase.from("upi_agreements").select("*").eq("id", agreement_id).single();
    if (!ag) throw new Error("Agreement not found");

    // Build multimodal user content. Prefer sending the PDF/image directly to Gemini.
    let fileBase64: string | null = null;
    let mimeType: string | null = null;
    let rawText = "";
    if (ag.file_path) {
      const { data: file } = await supabase.storage.from("institution-documents").download(ag.file_path);
      if (file) {
        mimeType = file.type || "application/pdf";
        const buf = new Uint8Array(await file.arrayBuffer());
        if (mimeType.startsWith("text/") || mimeType.includes("json")) {
          try { rawText = new TextDecoder().decode(buf); } catch { /* ignore */ }
        } else {
          fileBase64 = bytesToBase64(buf);
        }
      }
    }

    const systemPrompt = `You extract structured data from institution Recruitment Agency Agreements (RAAs).

ALWAYS populate the agency block with these FIXED values (this is our company, identical on every agreement):
- company: "Future Link Consultants Inc."
- address: "5 Vandorf Street, Toronto, Ontario, Canada M1B 4Y3"
- phone: "+1 416 902 4524"
- email: "overseasrelations@futurelinkconsultants.com"
- website: "www.futurelinkconsultants.com"
- signing_authority: "Santosh Ramrakhiani"
- signing_title: "Managing Director"
- signing_email: "santosh@futurelinkconsultants.ca"

For the institution side, extract every detail you can see in the document (legal name, address, contact email, website, phone, signing authority and title, contact office).

For the agreement, extract: title, agreement_type (commission/partnership/mou/exclusive/non_exclusive), valid_from, valid_to (ISO YYYY-MM-DD), status (active/expired/terminated), signed_on, institution_signed_on, institution_signed_by, governing_law, claim_deadline_days, invoice_deadline_days, termination_notice_days, sub_agent_allowed, b2b_allowed, consent_form_required, payment_method, countries_allowed (array), and a concise 2-3 sentence ai_summary.

For commission: model_type, currency (ISO code, default CAD), description, and the full list of rules (base %, bonuses, slabs, penalties, term limits, etc.).

Leave any field you cannot determine as null. Never invent institution details.`;

    const userParts: any[] = [
      { type: "text", text: `Agreement title (uploaded filename): ${ag.title}\nInstitution ID: ${institution_id}` },
    ];
    if (fileBase64 && mimeType) {
      // OpenAI-compatible image_url channel — Lovable Gateway accepts PDFs this way for Gemini.
      userParts.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    } else if (rawText) {
      userParts.push({ type: "text", text: `Document text:\n${rawText.slice(0, 80000)}` });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_agreement_extraction",
            parameters: {
              type: "object",
              properties: {
                agency: {
                  type: "object",
                  properties: {
                    company: { type: "string" },
                    address: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                    website: { type: "string" },
                    signing_authority: { type: "string" },
                    signing_title: { type: "string" },
                    signing_email: { type: "string" },
                  },
                },
                institution: {
                  type: "object",
                  properties: {
                    legal_name: { type: "string" },
                    address: { type: "string" },
                    agent_email: { type: "string" },
                    website: { type: "string" },
                    phone: { type: "string" },
                    signing_authority: { type: "string" },
                    signing_title: { type: "string" },
                    contact_office: { type: "string" },
                  },
                },
                agreement: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    agreement_type: { type: "string" },
                    valid_from: { type: "string" },
                    valid_to: { type: "string" },
                    status: { type: "string" },
                    signed_on: { type: "string" },
                    institution_signed_on: { type: "string" },
                    institution_signed_by: { type: "string" },
                    governing_law: { type: "string" },
                    claim_deadline_days: { type: "number" },
                    invoice_deadline_days: { type: "number" },
                    termination_notice_days: { type: "number" },
                    sub_agent_allowed: { type: "boolean" },
                    b2b_allowed: { type: "boolean" },
                    consent_form_required: { type: "boolean" },
                    payment_method: { type: "string" },
                    countries_allowed: { type: "array", items: { type: "string" } },
                    ai_summary: { type: "string" },
                  },
                },
                commission: {
                  type: "object",
                  properties: {
                    model_type: { type: "string", enum: ["fixed","percentage","slab","yearly","semester","bonus","conditional","hybrid"] },
                    currency: { type: "string" },
                    description: { type: "string" },
                    rules: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          rule_name: { type: "string" },
                          rule_type: { type: "string" },
                          payout_amount: { type: "number" },
                          payout_type: { type: "string", enum: ["fixed","percentage","multiplier"] },
                          min_value: { type: "number" },
                          max_value: { type: "number" },
                          condition_field: { type: "string" },
                          condition_operator: { type: "string" },
                          condition_value: { type: "string" },
                          notes: { type: "string" },
                        },
                        required: ["rule_type", "payout_type"],
                      },
                    },
                  },
                },
              },
              required: ["agency", "institution", "agreement", "commission"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_agreement_extraction" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${errText.slice(0, 500)}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    // Always overlay the fixed agency block so it can never be wrong/missing.
    const agency = {
      company: "Future Link Consultants Inc.",
      address: "5 Vandorf Street, Toronto, Ontario, Canada M1B 4Y3",
      phone: "+1 416 902 4524",
      email: "overseasrelations@futurelinkconsultants.com",
      website: "www.futurelinkconsultants.com",
      signing_authority: "Santosh Ramrakhiani",
      signing_title: "Managing Director",
      signing_email: "santosh@futurelinkconsultants.ca",
    };
    const institution = parsed.institution ?? {};
    const agreement = parsed.agreement ?? {};
    const commission = parsed.commission ?? { model_type: "fixed", rules: [] };
    const rules = Array.isArray(commission.rules) ? commission.rules : [];

    const validation = validateExtraction({ institution, agreement, commission });
    const hasInstitution = !!institution.legal_name;
    const hasRules = rules.length > 0;
    const baseConfidence = hasInstitution && hasRules ? 95 : hasInstitution || hasRules ? 75 : 60;
    const confidence = Math.max(
      30,
      Math.min(
        baseConfidence,
        95 - 5 * validation.missing_fields.length - 3 * validation.low_confidence_fields.length,
      ),
    );

    const extracted_data = {
      ...agreement,
      agency,
      institution,
      commission_summary: { model_type: commission.model_type, currency: commission.currency, description: commission.description },
      confidence,
      validation,
    };

    // Update the agreement row with the parsed fields + extracted_data
    const agreementUpdate: Record<string, unknown> = { extracted_data };
    if (agreement.valid_from) agreementUpdate.valid_from = agreement.valid_from;
    if (agreement.valid_to) agreementUpdate.valid_to = agreement.valid_to;
    if (agreement.agreement_type) agreementUpdate.agreement_type = agreement.agreement_type;
    if (validation.needs_review) {
      agreementUpdate.status = "needs_review";
    } else if (agreement.status) {
      agreementUpdate.status = agreement.status;
    }
    if (agreement.title) agreementUpdate.title = agreement.title;
    await supabase.from("upi_agreements").update(agreementUpdate).eq("id", agreement_id);

    let commission_id: string | null = null;
    if (hasRules) {
      const { data: comm } = await supabase.from("upi_commissions").insert({
        institution_id, agreement_id,
        name: `Proposed from "${agreement.title ?? ag.title}"`,
        model_type: commission.model_type ?? "fixed",
        currency: commission.currency ?? "CAD",
        description: commission.description ?? null,
        effective_from: agreement.valid_from ?? null,
        effective_to: agreement.valid_to ?? null,
        is_proposed: true, is_active: false, source: "ai_extracted",
      }).select().single();
      commission_id = comm?.id ?? null;
      if (comm) {
        await supabase.from("upi_commission_rules").insert(
          rules.map((r: Record<string, unknown>) => ({ ...r, commission_id: comm.id, payout_currency: commission.currency ?? "CAD" })),
        );
      }
    }

    await supabase.from("upi_ai_suggestions").insert({
      institution_id,
      suggestion_type: "commission_structure",
      title: `Agreement extracted: "${agreement.title ?? ag.title}"`,
      description: `${institution.legal_name ?? "Unknown institution"} · ${commission.model_type ?? "n/a"} · ${rules.length} rules · valid ${agreement.valid_from ?? "?"}→${agreement.valid_to ?? "?"}`,
      suggestion_data: extracted_data,
      confidence,
    });

    return new Response(JSON.stringify({ ok: true, commission_id, agreement_id, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upi-analyze-agreement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

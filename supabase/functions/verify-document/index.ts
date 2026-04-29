const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Signal = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  weight: number; // 0..1 risk contribution if fail
  detail?: string;
  evidence?: string;
};

function pushSig(arr: Signal[], s: Signal) { arr.push(s); }

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToString(bytes: Uint8Array, max = 2_500_000): string {
  // ASCII view of PDF (PDFs are mostly ASCII at the structural level)
  const len = Math.min(bytes.length, max);
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function parsePdfMeta(raw: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const fields = ["Producer", "Creator", "Author", "Title", "Subject", "CreationDate", "ModDate"];
  for (const f of fields) {
    const rx = new RegExp(`/${f}\\s*\\(([^)]*)\\)|/${f}\\s*<([0-9A-Fa-f]+)>`);
    const m = raw.match(rx);
    if (m) meta[f] = (m[1] ?? m[2] ?? "").trim();
  }
  return meta;
}

function suspiciousProducer(p: string | undefined): boolean {
  if (!p) return false;
  return /ilovepdf|smallpdf|sejda|pdfescape|nitro|foxit phantompdf|pdfsam|libreoffice|microsoft\W*word|word for|google docs|writer|canva|photoshop|gimp/i.test(p);
}

function countOccurrences(haystack: string, needle: string): number {
  let i = 0, n = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

function parsePdfDate(s: string | undefined): Date | null {
  if (!s) return null;
  // D:YYYYMMDDHHmmSS...
  const m = s.match(/D?:?(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return null;
  const [_, y, mo, d, h = "00", mi = "00", se = "00"] = m;
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}Z`);
  return isNaN(dt.getTime()) ? null : dt;
}

function aggregate(signals: Signal[]): { score: number; level: "pass" | "review" | "high_risk" } {
  let risk = 0;
  let totalW = 0;
  for (const s of signals) {
    if (s.status === "info") continue;
    totalW += s.weight;
    if (s.status === "fail") risk += s.weight;
    else if (s.status === "warn") risk += s.weight * 0.5;
  }
  const score = totalW > 0 ? Math.round((risk / totalW) * 100) : 0;
  const level: "pass" | "review" | "high_risk" = score >= 60 ? "high_risk" : score >= 25 ? "review" : "pass";
  return { score, level };
}

// MRZ validation per ICAO 9303
function mrzCheckDigit(input: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    let v = 0;
    if (c >= "0" && c <= "9") v = c.charCodeAt(0) - 48;
    else if (c >= "A" && c <= "Z") v = c.charCodeAt(0) - 55;
    else if (c === "<") v = 0;
    else return -1;
    sum += v * w[i % 3];
  }
  return sum % 10;
}

function findMrz(text: string): { ok: boolean; reason: string; lines?: string[] } | null {
  // TD3 passport: 2 lines of 44 chars; we accept slightly noisy OCR by relaxing length
  const norm = text.toUpperCase().replace(/[ \t]/g, "");
  const lines = norm.split(/\r?\n/).filter((l) => /^[A-Z0-9<]{30,50}$/.test(l));
  if (lines.length < 2) return null;
  // pick the last two
  const l1 = lines[lines.length - 2].padEnd(44, "<").slice(0, 44);
  const l2 = lines[lines.length - 1].padEnd(44, "<").slice(0, 44);
  const passportNumber = l2.slice(0, 9);
  const passportCheck = l2[9];
  const dob = l2.slice(13, 19);
  const dobCheck = l2[19];
  const expiry = l2.slice(21, 27);
  const expiryCheck = l2[27];

  const c1 = mrzCheckDigit(passportNumber);
  const c2 = mrzCheckDigit(dob);
  const c3 = mrzCheckDigit(expiry);
  const okPp = String(c1) === passportCheck;
  const okDob = String(c2) === dobCheck;
  const okExp = String(c3) === expiryCheck;
  if (okPp && okDob && okExp) return { ok: true, reason: "all check digits valid", lines: [l1, l2] };
  return { ok: false, reason: `passport=${okPp}, dob=${okDob}, expiry=${okExp}`, lines: [l1, l2] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const documentId = String(body?.document_id ?? "");
    const docType = body?.doc_type ? String(body.doc_type) : null;
    const pageImageDataUrls: string[] = Array.isArray(body?.page_image_data_urls)
      ? body.page_image_data_urls.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("data:image/")).slice(0, 3)
      : [];
    const ocrText = typeof body?.ocr_text === "string" ? String(body.ocr_text).slice(0, 20000) : "";
    const embeddedText = typeof body?.embedded_text === "string" ? String(body.embedded_text).slice(0, 20000) : "";
    if (!documentId) return json({ error: "document_id required" }, 400);

    // Auth: verify caller's JWT
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SERVICE_ROLE },
    });
    if (!userResp.ok) return json({ error: "unauthorized" }, 401);
    const userData = await userResp.json();
    const userId = userData?.id as string | undefined;
    if (!userId) return json({ error: "unauthorized" }, 401);

    // Fetch document row
    const docRow = await fetch(
      `${SUPABASE_URL}/rest/v1/client_documents?id=eq.${documentId}&select=id,client_id,storage_path,document_type,custom_type,file_name,mime_type,size_bytes`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    if (!docRow.ok) return json({ error: "doc fetch failed" }, 500);
    const docs = await docRow.json();
    const doc = Array.isArray(docs) ? docs[0] : null;
    if (!doc) return json({ error: "document not found" }, 404);

    // Download from storage
    const fileResp = await fetch(`${SUPABASE_URL}/storage/v1/object/client-documents/${doc.storage_path}`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    if (!fileResp.ok) return json({ error: "file fetch failed" }, 500);
    const fileBytes = new Uint8Array(await fileResp.arrayBuffer());
    const sha = await sha256Hex(fileBytes);

    const signals: Signal[] = [];
    const isPdf = (doc.mime_type === "application/pdf") || /\.pdf$/i.test(doc.file_name);

    // ---- 1. Duplicate / reuse detection (across other clients) ----
    const dupResp = await fetch(
      `${SUPABASE_URL}/rest/v1/document_fingerprints?sha256=eq.${sha}&select=document_id,client_id`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const dups = dupResp.ok ? (await dupResp.json() as Array<{ document_id: string; client_id: string }>) : [];
    const dupOther = dups.filter((d) => d.client_id && d.client_id !== doc.client_id);
    if (dupOther.length > 0) {
      pushSig(signals, {
        key: "duplicate_reuse",
        label: "Duplicate document used on another client",
        status: "fail",
        weight: 1.0,
        detail: `Identical file hash found on ${dupOther.length} other client case(s). Strong reuse-fraud signal.`,
        evidence: sha.slice(0, 16),
      });
    } else {
      pushSig(signals, {
        key: "duplicate_reuse",
        label: "No duplicate reuse detected",
        status: "pass",
        weight: 0.6,
      });
    }

    // ---- 2. PDF structural analysis ----
    if (isPdf) {
      const raw = bytesToString(fileBytes);
      const meta = parsePdfMeta(raw);
      const eofCount = countOccurrences(raw, "%%EOF");
      const xrefCount = countOccurrences(raw, "\nxref");
      const startxrefCount = countOccurrences(raw, "startxref");

      // Producer suspicious
      if (suspiciousProducer(meta.Producer) || suspiciousProducer(meta.Creator)) {
        pushSig(signals, {
          key: "producer",
          label: "Suspicious PDF producer/creator",
          status: "warn",
          weight: 0.6,
          detail: `Producer="${meta.Producer ?? "?"}", Creator="${meta.Creator ?? "?"}". Genuine official documents are rarely produced by editing tools.`,
          evidence: `${meta.Producer ?? ""} | ${meta.Creator ?? ""}`,
        });
      } else {
        pushSig(signals, {
          key: "producer",
          label: "Producer/creator looks normal",
          status: "pass",
          weight: 0.3,
          detail: `Producer="${meta.Producer ?? "?"}"`,
        });
      }

      // Incremental updates
      if (eofCount > 1 || startxrefCount > 1) {
        pushSig(signals, {
          key: "incremental_updates",
          label: "Multiple revisions inside PDF",
          status: "warn",
          weight: 0.7,
          detail: `Found ${eofCount} %%EOF markers and ${startxrefCount} startxref entries. The file was modified after its initial save — common when text is altered.`,
        });
      } else {
        pushSig(signals, {
          key: "incremental_updates",
          label: "Single-revision PDF",
          status: "pass",
          weight: 0.4,
        });
      }

      // Mod vs Creation date
      const cre = parsePdfDate(meta.CreationDate);
      const mod = parsePdfDate(meta.ModDate);
      if (cre && mod && (mod.getTime() - cre.getTime()) > 1000 * 60 * 5) {
        pushSig(signals, {
          key: "mod_after_creation",
          label: "Modified after creation",
          status: "warn",
          weight: 0.5,
          detail: `Created ${cre.toISOString()}, modified ${mod.toISOString()}. Genuine issuer PDFs usually have matching timestamps.`,
        });
      }

      // OCR vs embedded text mismatch
      if (ocrText && embeddedText) {
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
        const a = norm(ocrText);
        const b = norm(embeddedText);
        const aT = new Set(a.split(" ").filter((w) => w.length > 3));
        const bT = new Set(b.split(" ").filter((w) => w.length > 3));
        let common = 0;
        for (const t of aT) if (bT.has(t)) common++;
        const denom = Math.max(1, Math.min(aT.size, bT.size));
        const overlap = common / denom;
        if (overlap < 0.5 && aT.size > 20 && bT.size > 20) {
          pushSig(signals, {
            key: "ocr_text_mismatch",
            label: "Visible text differs from PDF text layer",
            status: "fail",
            weight: 0.9,
            detail: `Token overlap ${Math.round(overlap * 100)}%. A common manipulation tell — visible characters were drawn over the original text layer.`,
          });
        } else {
          pushSig(signals, {
            key: "ocr_text_mismatch",
            label: "Visible text matches text layer",
            status: "pass",
            weight: 0.5,
            detail: `Token overlap ${Math.round(overlap * 100)}%`,
          });
        }
      }
    } else {
      pushSig(signals, {
        key: "format",
        label: "Non-PDF input",
        status: "info",
        weight: 0,
        detail: `Mime ${doc.mime_type ?? "unknown"} — only image-level checks will run.`,
      });
    }

    // ---- 3. MRZ validation for passports ----
    const isPassport = (docType ?? doc.document_type ?? "").toLowerCase().includes("passport");
    if (isPassport && (ocrText || embeddedText)) {
      const mrz = findMrz(ocrText || embeddedText);
      if (!mrz) {
        pushSig(signals, {
          key: "mrz",
          label: "MRZ not detected on passport",
          status: "warn",
          weight: 0.6,
          detail: "Could not locate the 2-line machine-readable zone — image quality issue or non-standard layout.",
        });
      } else if (!mrz.ok) {
        pushSig(signals, {
          key: "mrz",
          label: "MRZ check digits FAILED",
          status: "fail",
          weight: 1.0,
          detail: `ICAO 9303 check-digit failure (${mrz.reason}). Numeric tampering on passport number, DOB, or expiry is the most likely cause.`,
          evidence: mrz.lines?.join(" / "),
        });
      } else {
        pushSig(signals, {
          key: "mrz",
          label: "MRZ check digits valid",
          status: "pass",
          weight: 1.0,
          detail: "All ICAO 9303 check digits passed.",
          evidence: mrz.lines?.join(" / "),
        });
      }
    }

    // ---- 4. Cross-document name consistency ----
    if (doc.client_id) {
      const profileResp = await fetch(
        `${SUPABASE_URL}/rest/v1/clients?id=eq.${doc.client_id}&select=full_name`,
        { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
      );
      if (profileResp.ok) {
        const arr = await profileResp.json();
        const fullName = (arr?.[0]?.full_name ?? "").toString().toLowerCase();
        const haystack = ((ocrText || embeddedText) || "").toLowerCase();
        if (fullName && haystack) {
          const tokens = fullName.split(/\s+/).filter((t: string) => t.length > 2);
          const found = tokens.filter((t: string) => haystack.includes(t)).length;
          const ratio = tokens.length ? found / tokens.length : 0;
          if (ratio < 0.5) {
            pushSig(signals, {
              key: "name_consistency",
              label: "Client name not found in document",
              status: "warn",
              weight: 0.7,
              detail: `Only ${found}/${tokens.length} name tokens of "${fullName}" were found. May be a different person's document or heavy redaction.`,
            });
          } else {
            pushSig(signals, {
              key: "name_consistency",
              label: "Client name found in document",
              status: "pass",
              weight: 0.4,
              detail: `${found}/${tokens.length} name tokens matched.`,
            });
          }
        }
      }
    }

    // ---- 5. AI vision review ----
    let aiSummary = "";
    if (LOVABLE_API_KEY && pageImageDataUrls.length > 0) {
      const sys = "You are a forensic document examiner. Look at this document image and report ONLY visible authenticity concerns. Reply with strict JSON: {\"verdict\":\"likely_authentic\"|\"suspicious\"|\"likely_fake\",\"confidence\":0..1,\"observations\":[\"...\"],\"summary\":\"<1-2 sentences>\"}. Look for: text alignment/kerning anomalies near names/dates/amounts, font inconsistencies, pixelated or low-resolution seals/signatures, signs of pasting (different background tones, shadow mismatches), uneven baselines, copy-move patterns, JPEG-quality discontinuities, missing security features expected on this document type. Do not assume guilt without evidence.";
      const userContent: Array<unknown> = [
        { type: "text", text: `Document type hint: ${docType ?? doc.document_type ?? "unknown"}. Inspect carefully.` },
        ...pageImageDataUrls.map((u) => ({ type: "image_url", image_url: { url: u } })),
      ];
      try {
        const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (ai.status === 429) {
          pushSig(signals, { key: "ai_vision", label: "AI vision rate-limited", status: "info", weight: 0, detail: "Try again shortly." });
        } else if (ai.status === 402) {
          pushSig(signals, { key: "ai_vision", label: "AI vision: credits exhausted", status: "info", weight: 0, detail: "Add credits in Lovable Cloud workspace." });
        } else if (ai.ok) {
          const data = await ai.json();
          const content = data?.choices?.[0]?.message?.content ?? "{}";
          let parsed: { verdict?: string; confidence?: number; observations?: string[]; summary?: string } = {};
          try { parsed = JSON.parse(content); } catch { /* ignore */ }
          aiSummary = parsed.summary ?? "";
          const verdict = parsed.verdict ?? "suspicious";
          const obs = Array.isArray(parsed.observations) ? parsed.observations.slice(0, 8).join(" • ") : "";
          if (verdict === "likely_fake") {
            pushSig(signals, { key: "ai_vision", label: "AI vision: likely fake", status: "fail", weight: 1.0, detail: aiSummary, evidence: obs });
          } else if (verdict === "suspicious") {
            pushSig(signals, { key: "ai_vision", label: "AI vision: suspicious", status: "warn", weight: 0.8, detail: aiSummary, evidence: obs });
          } else {
            pushSig(signals, { key: "ai_vision", label: "AI vision: likely authentic", status: "pass", weight: 0.8, detail: aiSummary, evidence: obs });
          }
        }
      } catch (e) {
        pushSig(signals, { key: "ai_vision", label: "AI vision unavailable", status: "info", weight: 0, detail: e instanceof Error ? e.message : "error" });
      }
    } else if (pageImageDataUrls.length === 0) {
      pushSig(signals, { key: "ai_vision", label: "No page image provided for AI vision", status: "info", weight: 0 });
    }

    // ---- 6. Aggregate ----
    const { score, level } = aggregate(signals);

    // ---- 7. Persist verification + fingerprint ----
    const insertVerify = await fetch(`${SUPABASE_URL}/rest/v1/document_verifications`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        document_id: documentId,
        client_id: doc.client_id,
        doc_type: docType ?? doc.document_type,
        risk_score: score,
        risk_level: level,
        signals,
        ai_summary: aiSummary || null,
        created_by: userId,
      }),
    });
    const verifyRow = insertVerify.ok ? (await insertVerify.json())?.[0] : null;

    await fetch(`${SUPABASE_URL}/rest/v1/document_fingerprints`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        document_id: documentId,
        client_id: doc.client_id,
        sha256: sha,
        size_bytes: doc.size_bytes ?? fileBytes.byteLength,
      }),
    });

    return json({ verification: verifyRow, signals, risk_score: score, risk_level: level, ai_summary: aiSummary });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
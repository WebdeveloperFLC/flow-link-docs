import {
  parseMetaAppSecrets,
  verifyMetaSignature,
} from "./metaApi.ts";

async function signBody(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

Deno.test("parseMetaAppSecrets — single WHATSAPP_APP_SECRET", () => {
  Deno.env.set("WHATSAPP_APP_SECRET", "secret-one");
  Deno.env.delete("WHATSAPP_APP_SECRETS");
  const secrets = parseMetaAppSecrets();
  if (secrets.length !== 1 || secrets[0] !== "secret-one") {
    throw new Error(`expected [secret-one], got ${JSON.stringify(secrets)}`);
  }
  Deno.env.delete("WHATSAPP_APP_SECRET");
});

Deno.test("parseMetaAppSecrets — comma-separated WHATSAPP_APP_SECRETS", () => {
  Deno.env.set("WHATSAPP_APP_SECRETS", "app-a-secret, app-b-secret");
  Deno.env.delete("WHATSAPP_APP_SECRET");
  const secrets = parseMetaAppSecrets();
  if (secrets.length !== 2 || secrets[0] !== "app-a-secret" || secrets[1] !== "app-b-secret") {
    throw new Error(`unexpected secrets: ${JSON.stringify(secrets)}`);
  }
  Deno.env.delete("WHATSAPP_APP_SECRETS");
});

Deno.test("verifyMetaSignature — accepts any configured app secret", async () => {
  Deno.env.set("WHATSAPP_APP_SECRETS", "first-app,second-app");
  Deno.env.delete("WHATSAPP_APP_SECRET");
  const body = '{"entry":[]}';
  const sig = await signBody("second-app", body);
  const ok = await verifyMetaSignature(body, sig);
  if (!ok) throw new Error("expected second-app signature to verify");
  Deno.env.delete("WHATSAPP_APP_SECRETS");
});

Deno.test("verifyMetaSignature — rejects wrong signature when secrets set", async () => {
  Deno.env.set("WHATSAPP_APP_SECRET", "only-one");
  Deno.env.delete("WHATSAPP_APP_SECRETS");
  const body = '{"entry":[]}';
  const sig = await signBody("wrong-secret", body);
  const ok = await verifyMetaSignature(body, sig);
  if (ok) throw new Error("expected signature mismatch");
  Deno.env.delete("WHATSAPP_APP_SECRET");
});

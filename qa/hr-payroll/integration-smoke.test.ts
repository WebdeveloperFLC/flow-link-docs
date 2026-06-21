/**
 * Optional live Supabase smoke — runs only when HR_INTEGRATION_TEST=1 and real credentials exist.
 * Data assertions require SUPABASE_SERVICE_ROLE_KEY (anon is blocked by HR RLS).
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Load .env into process.env when keys are missing (no shell export). */
function loadLocalEnv(): void {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadLocalEnv();

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const key = serviceKey ?? anonKey;

function isPlaceholderSupabaseUrl(value?: string): boolean {
  if (!value) return true;
  const u = value.toLowerCase();
  return (
    u.includes("your_project") ||
    u.includes("your-project") ||
    u.includes("xxx.supabase.co") ||
    u.includes("example.supabase.co") ||
    u.includes("placeholder")
  );
}

function isPlaceholderSupabaseKey(value?: string): boolean {
  if (!value) return true;
  const k = value.toLowerCase();
  return k === "your-anon-key" || k === "eyj..." || k.length < 30;
}

const hasCredentials = !!url && !!key;
const hasRealCredentials =
  hasCredentials && !isPlaceholderSupabaseUrl(url) && !isPlaceholderSupabaseKey(key);
const enabled = process.env.HR_INTEGRATION_TEST === "1" && hasRealCredentials;
const hasServiceRole = !!serviceKey && !isPlaceholderSupabaseKey(serviceKey);
const DEMO_ORG = "00000000-0000-0000-0000-0000000000f1";

describe.skipIf(!enabled)("HR Payroll live DB smoke (HR_INTEGRATION_TEST=1)", () => {
  const sb = createClient(url!, key!);

  it("Supabase project is reachable", async () => {
    const { error } = await sb.from("employees").select("id", { head: true, count: "exact" }).limit(0);
    expect(error).toBeNull();
  }, 15000);

  it("training workflow migration status on remote DB", async () => {
    const { error } = await sb
      .from("training_records")
      .select("id, completion_reason, extended_end_date, training_ref, status")
      .limit(1);
    const missing =
      error?.code === "42703" ||
      (error?.message ?? "").toLowerCase().includes("does not exist");
    if (missing) {
      console.warn(
        "\n⚠ HR LIVE DB: training workflow migration NOT published on Supabase.\n" +
          "   Lovable → Publish: 20260724120000_hr_training_completion_workflow.sql,\n" +
          "   20260725120000_hr_training_approval_fixes.sql,\n" +
          "   20260726120000_hr_training_admin_bypass.sql\n" +
          "   Until published: training completion/approval may fail or use limited fallbacks.\n",
      );
    }
    if (process.env.HR_INTEGRATION_TEST_STRICT === "1") {
      expect(missing, "training workflow migration must be published on remote").toBe(false);
    } else {
      expect(error === null || missing).toBe(true);
    }
  }, 15000);

  it("hr employee categories table exists (anon)", async () => {
    const { error } = await sb.from("hr_employee_categories").select("id").limit(1);
    expect(error).toBeNull();
  }, 15000);

  it.skipIf(!hasServiceRole)("demo org has employees (service role)", async () => {
    const { count, error } = await sb
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("org_id", DEMO_ORG);
    expect(error).toBeNull();
    expect((count ?? 0) >= 5).toBe(true);
  }, 15000);

  it.skipIf(!hasServiceRole)("employee categories seeded for demo org", async () => {
    const { count, error } = await sb
      .from("hr_employee_categories")
      .select("*", { count: "exact", head: true })
      .eq("org_id", DEMO_ORG);
    expect(error).toBeNull();
    expect((count ?? 0) >= 1).toBe(true);
  }, 15000);

  it.skipIf(!hasServiceRole)("training workflow schema is published", async () => {
    const { error: colErr } = await sb
      .from("training_records")
      .select("completion_reason, extended_end_date, training_ref")
      .limit(1);
    expect(colErr).toBeNull();

    const { data: rpcData, error: rpcErr } = await sb.rpc("fn_extend_training", {
      p_training_id: "00000000-0000-0000-0000-000000000001",
      p_extended_until: "2099-01-01",
      p_reason: "smoke-test-should-fail-not-missing-rpc",
    });
    expect(rpcErr).toBeTruthy();
    expect((rpcErr?.message ?? "").toLowerCase()).not.toContain("does not exist");
    expect(rpcData).toBeFalsy();
  }, 15000);

  it.skipIf(!hasServiceRole)("TV02A anchor via v_payroll_preview — Isha with ₹200 PT (service role)", async () => {
    const { data, error } = await sb
      .from("v_payroll_preview")
      .select("emp_code, payable_days, net_salary, pt_employee")
      .eq("emp_code", "FL-1042")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Number(data!.payable_days)).toBe(29.5);
    expect(Number(data!.pt_employee)).toBe(200);
    expect(Number(data!.net_salary)).toBe(39300);
  }, 15000);

  it.skipIf(!hasServiceRole)("FL-CA01 Canada anchor via v_payroll_preview (service role)", async () => {
    const { data, error } = await sb
      .from("v_payroll_preview")
      .select("emp_code, payable_days, net_salary, salary_currency")
      .eq("emp_code", "FL-CA01")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Number(data!.payable_days)).toBe(30);
    const net = Number(data!.net_salary);
    expect(net).toBeGreaterThanOrEqual(4100);
    expect(net).toBeLessThanOrEqual(4200);
  }, 15000);

  it.skipIf(!hasServiceRole)("Isha FL-1042 CRM link for ESS (service role)", async () => {
    const { data, error } = await sb
      .from("employees")
      .select("emp_code, staff_id")
      .eq("org_id", DEMO_ORG)
      .eq("emp_code", "FL-1042")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.staff_id).toBeTruthy();
  }, 15000);

  it.skipIf(!hasServiceRole)("FL-CA01 has payroll line on latest cycle (service role)", async () => {
    const { data: cycle, error: cycleErr } = await sb
      .from("payroll_cycles")
      .select("id")
      .eq("org_id", DEMO_ORG)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(cycleErr).toBeNull();
    expect(cycle?.id).toBeTruthy();

    const { data: emp, error: empErr } = await sb
      .from("employees")
      .select("id")
      .eq("org_id", DEMO_ORG)
      .eq("emp_code", "FL-CA01")
      .maybeSingle();
    expect(empErr).toBeNull();
    expect(emp?.id).toBeTruthy();

    const { count, error: lineErr } = await sb
      .from("payroll_lines")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", cycle!.id)
      .eq("employee_id", emp!.id);
    expect(lineErr).toBeNull();
    expect((count ?? 0) >= 1).toBe(true);
  }, 15000);
});

/**
 * Optional live Supabase smoke — runs only when HR_INTEGRATION_TEST=1 and real credentials exist.
 * Data assertions require SUPABASE_SERVICE_ROLE_KEY (anon is blocked by HR RLS).
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

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

  it.skipIf(!hasServiceRole)("demo org has employees (service role)", async () => {
    const { count, error } = await sb
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("org_id", DEMO_ORG);
    expect(error).toBeNull();
    expect((count ?? 0) >= 5).toBe(true);
  }, 15000);

  it.skipIf(!hasServiceRole)("TV02 anchor via v_payroll_preview (service role)", async () => {
    const { data, error } = await sb
      .from("v_payroll_preview")
      .select("emp_code, payable_days, net_salary")
      .eq("emp_code", "FL-1042")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(Number(data!.payable_days)).toBe(29.5);
    expect(Number(data!.net_salary)).toBe(39500);
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

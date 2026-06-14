/**
 * Optional live Supabase smoke — runs only when HR_INTEGRATION_TEST=1 and credentials exist.
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const enabled = process.env.HR_INTEGRATION_TEST === "1" && !!url && !!key;
const DEMO_ORG = "00000000-0000-0000-0000-0000000000f1";

describe.skipIf(!enabled)("HR Payroll live DB smoke (HR_INTEGRATION_TEST=1)", () => {
  const sb = createClient(url!, key!);

  it("demo org has employees", async () => {
    const { count, error } = await sb
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("org_id", DEMO_ORG);
    expect(error).toBeNull();
    expect((count ?? 0) >= 5).toBe(true);
  }, 15000);

  it("TV02 anchor via v_payroll_preview", async () => {
    const { data, error } = await sb
      .from("v_payroll_preview")
      .select("emp_code, payable_days, net_salary")
      .eq("emp_code", "FL-1042")
      .maybeSingle();
    expect(error).toBeNull();
    if (data) {
      expect(Number(data.payable_days)).toBe(29.5);
      expect(Number(data.net_salary)).toBe(39500);
    }
  }, 15000);
});

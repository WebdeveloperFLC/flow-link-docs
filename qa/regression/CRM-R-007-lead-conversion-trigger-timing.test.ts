import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260718120055_fix_lead_conversion_trigger_timing.sql",
);

function readMigration(): string {
  return readFileSync(MIGRATION, "utf8");
}

/** Mirrors convert_lead_to_client v_year_raw / v_year_date logic in migration 055. */
function yearOfPassingFromEducationEntry(e0: Record<string, string | null | undefined> | null): string | null {
  if (!e0) return null;
  const coalesced = e0.end_year ?? e0.year ?? null;
  if (coalesced == null) return null;
  const vYearRaw = coalesced.trim() === "" ? null : coalesced.trim();
  if (vYearRaw == null) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(vYearRaw)) return vYearRaw;
  const match = vYearRaw.match(/\d{4}/);
  if (!match) return null;
  return `${match[0]}-06-30`;
}

describe("CRM-R-007 lead conversion trigger timing", () => {
  it("splits BEFORE (client fields) and AFTER (lead link) triggers", () => {
    const sql = readMigration();

    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.fn_client_source_lead_before\(\)/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.fn_mark_lead_converted_after_client\(\)/);
    expect(sql).toMatch(/CREATE TRIGGER trg_client_source_lead_before[\s\S]*BEFORE INSERT OR UPDATE OF source_lead_id/);
    expect(sql).toMatch(
      /CREATE TRIGGER trg_mark_lead_converted_after_client[\s\S]*AFTER INSERT OR UPDATE OF source_lead_id/,
    );
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS trg_mark_lead_converted_on_client ON public\.clients/);
  });

  it("BEFORE trigger only sets source_lead_number on NEW, not lead converted_to_client_id", () => {
    const sql = readMigration();
    const beforeFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.fn_client_source_lead_before\(\)[\s\S]*?END;\s*\$\$;/,
    )?.[0];
    expect(beforeFn).toBeTruthy();
    expect(beforeFn).toMatch(/NEW\.source_lead_number/);
    expect(beforeFn).not.toMatch(/converted_to_client_id/);
    expect(beforeFn).not.toMatch(/UPDATE public\.leads/);
  });

  it("AFTER trigger updates lead conversion fields when client row exists", () => {
    const sql = readMigration();
    const afterFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.fn_mark_lead_converted_after_client\(\)[\s\S]*?END;\s*\$\$;/,
    )?.[0];
    expect(afterFn).toBeTruthy();
    expect(afterFn).toMatch(/UPDATE public\.leads/);
    expect(afterFn).toMatch(/converted_to_client_id = NEW\.id/);
    expect(afterFn).toMatch(/status = 'converted'/);
    expect(afterFn).toMatch(/converted_at = COALESCE\(converted_at, now\(\)\)/);
  });

  it("convert_lead_to_client backfills lead when client already exists for source_lead_id", () => {
    const sql = readMigration();
    const rpc = sql.match(/CREATE OR REPLACE FUNCTION public\.convert_lead_to_client\([\s\S]*?END;\s*\$\$;/)?.[0];
    expect(rpc).toBeTruthy();
    expect(rpc).toMatch(/SELECT id INTO v_existing_id FROM public\.clients WHERE source_lead_id = _lead_id/);
    expect(rpc).toMatch(/converted_to_client_id = v_existing_id/);
    expect(rpc).toMatch(/converted_to_client_id IS DISTINCT FROM v_existing_id/);
  });

  it("repairs orphaned lead rows missing converted_to_client_id", () => {
    const sql = readMigration();
    expect(sql).toMatch(/UPDATE public\.leads l[\s\S]*FROM public\.clients c[\s\S]*c\.source_lead_id = l\.id/);
  });

  it("does not weaken FK or use deferrable constraints", () => {
    const sql = readMigration();
    expect(sql).not.toMatch(/DEFERRABLE/i);
    expect(sql).not.toMatch(/DROP CONSTRAINT leads_converted_to_client_id_fkey/i);
  });

  it("merges 053 year_of_passing parsing with end_year preference", () => {
    const sql = readMigration();
    const rpc = sql.match(/CREATE OR REPLACE FUNCTION public\.convert_lead_to_client\([\s\S]*?END;\s*\$\$;/)?.[0];
    expect(rpc).toBeTruthy();
    expect(rpc).toMatch(/v_year_raw text/);
    expect(rpc).toMatch(
      /v_year_raw := NULLIF\(\s*btrim\(COALESCE\(v_e0 ->> 'end_year', v_e0 ->> 'year'\)\),\s*''\s*\)/,
    );
    expect(rpc).toMatch(/WHEN v_year_raw ~ '\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$' THEN v_year_raw::date/);
    expect(rpc).toMatch(/make_date\(substring\(v_year_raw from '\\d\{4\}'\)::int, 6, 30\)/);
  });

  it("preserves test_attempts copy and post-insert hooks in RPC", () => {
    const sql = readMigration();
    const rpc = sql.match(/CREATE OR REPLACE FUNCTION public\.convert_lead_to_client\([\s\S]*?END;\s*\$\$;/)?.[0];
    expect(rpc).toMatch(/test_attempts, active_attempt_ids/);
    expect(rpc).toMatch(/COALESCE\(v_lead\.test_attempts/);
    expect(rpc).toMatch(/assign_client_registration_number/);
    expect(rpc).toMatch(/sync_client_profile_from_client/);
  });
});

describe("CRM-R-007 year_of_passing parsing (053 + end_year merge)", () => {
  it("uses end_year only", () => {
    expect(yearOfPassingFromEducationEntry({ end_year: "2025" })).toBe("2025-06-30");
  });

  it("uses legacy year when end_year absent", () => {
    expect(yearOfPassingFromEducationEntry({ year: "2020" })).toBe("2020-06-30");
  });

  it("prefers end_year over year", () => {
    expect(yearOfPassingFromEducationEntry({ end_year: "2025", year: "2020" })).toBe("2025-06-30");
  });

  it("passes through ISO date", () => {
    expect(yearOfPassingFromEducationEntry({ end_year: "2024-06-30" })).toBe("2024-06-30");
    expect(yearOfPassingFromEducationEntry({ year: "2024-12-31" })).toBe("2024-12-31");
  });

  it("trims whitespace from year values", () => {
    expect(yearOfPassingFromEducationEntry({ end_year: "  2023  " })).toBe("2023-06-30");
    expect(yearOfPassingFromEducationEntry({ year: "  2024-06-30  " })).toBe("2024-06-30");
  });

  it("returns null for missing or empty year", () => {
    expect(yearOfPassingFromEducationEntry(null)).toBeNull();
    expect(yearOfPassingFromEducationEntry({})).toBeNull();
    expect(yearOfPassingFromEducationEntry({ end_year: "" })).toBeNull();
    expect(yearOfPassingFromEducationEntry({ end_year: "   " })).toBeNull();
  });
});

describe("convertLeadToClient app path (unchanged contract)", () => {
  it("still calls convert_lead_to_client RPC and handles already_converted", async () => {
    const src = readFileSync(join(process.cwd(), "src/lib/convertLeadToClient.ts"), "utf8");
    expect(src).toMatch(/supabase\.rpc\("convert_lead_to_client"/);
    expect(src).toMatch(/already_converted/);
    expect(src).toMatch(/syncClientBackgroundAfterConversion/);
    expect(src).toMatch(/copyLeadHistoryToClientActivity/);
    expect(src).toMatch(/autoDraftInvoiceForServices/);
    expect(src).toMatch(/notifyLeadConverted/);
    expect(src).toMatch(/createTask/);
  });
});

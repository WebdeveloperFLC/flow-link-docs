import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteEqSpy = vi.fn(async () => ({ error: null }));
const lineInsertSpy = vi.fn(async () => ({ error: null }));
const headerInsertSpy = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: { id: "journal-1" }, error: null }),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "accounting_journals") {
        return {
          insert: headerInsertSpy,
          delete: () => ({ eq: deleteEqSpy }),
        };
      }
      if (table === "accounting_journal_lines") {
        return { insert: lineInsertSpy };
      }
      return {
        upsert: async () => ({ error: null }),
        insert: async () => ({ error: null }),
      };
    },
  },
}));

import { migrateAllToSupabase } from "./migrateToSupabase";

describe("migrateAllToSupabase journals", () => {
  beforeEach(() => {
    localStorage.clear();
    deleteEqSpy.mockClear();
    lineInsertSpy.mockClear();
    headerInsertSpy.mockClear();
  });

  it("rolls back journal header when line migration fails", async () => {
    lineInsertSpy.mockResolvedValueOnce({ error: { message: "line insert failed" } });
    localStorage.setItem(
      "accounting:journals:v2",
      JSON.stringify([
        {
          entryDate: "2026-01-01",
          entity: "Entity A",
          currency: "CAD",
          sourceType: "MANUAL",
          narration: "test",
          status: "DRAFT",
          reference: "REF-1",
          lines: [{ accountCode: "1000", accountName: "Cash", debit: 100, credit: 0 }],
        },
      ]),
    );

    const results = await migrateAllToSupabase();
    const journals = results.find((r) => r.store === "Journal entries");

    expect(journals?.migrated).toBe(0);
    expect(journals?.errors.some((e) => e.includes("line insert failed"))).toBe(true);
    expect(deleteEqSpy).toHaveBeenCalledWith("id", "journal-1");
  });

  it("counts journal as migrated when lines insert succeeds", async () => {
    lineInsertSpy.mockResolvedValueOnce({ error: null });
    localStorage.setItem(
      "accounting:journals:v2",
      JSON.stringify([
        {
          entryDate: "2026-01-01",
          entity: "Entity A",
          lines: [{ accountCode: "1000", accountName: "Cash", debit: 100, credit: 0 }],
        },
      ]),
    );

    const results = await migrateAllToSupabase();
    const journals = results.find((r) => r.store === "Journal entries");

    expect(journals?.migrated).toBe(1);
    expect(journals?.errors).toEqual([]);
    expect(deleteEqSpy).not.toHaveBeenCalled();
  });
});

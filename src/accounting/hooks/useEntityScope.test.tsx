import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

let shouldFailUserFetch = false;
let mockedRole: string | null = "STAFF";
let mockedRows: Array<{
  id: string;
  accounting_user_id: string;
  scope_type: "country" | "entity";
  country_code: string | null;
  entity_id: string | null;
  can_view: boolean;
  can_edit: boolean;
}> = [];
const mockAuthUser = { id: "auth-user-1" };
const mockEntities = [
  { id: "e-1", name: "Entity 1", country: "CA", type: "COMPANY" },
  { id: "e-2", name: "Entity 2", country: "IN", type: "COMPANY" },
];

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

vi.mock("../stores/accountingEntitiesStore", () => ({
  useEntities: () => mockEntities,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "accounting_users") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => {
                  if (shouldFailUserFetch) {
                    return { data: null, error: { message: "network failed" } };
                  }
                  return {
                    data: { id: "acct-user-1", role: mockedRole, status: "ACTIVE" },
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      }
      if (table === "accounting_user_entity_scope") {
        return {
          select: () => ({
            eq: async () => ({ data: mockedRows, error: null }),
          }),
        };
      }
      return {};
    },
  },
}));

describe("useEntityScope", () => {
  it("fails closed when scope fetch fails", async () => {
    shouldFailUserFetch = true;
    mockedRows = [];
    const { useEntityScope } = await import("./useEntityScope");
    const { result } = renderHook(() => useEntityScope());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isUnrestricted).toBe(false);
    expect(result.current.allowedEntityIds).toEqual([]);
    expect(result.current.canViewEntity("e-1")).toBe(false);
    expect(result.current.canEditEntity("e-1")).toBe(false);
  });

  it("fails closed for non-admin users with no rows", async () => {
    shouldFailUserFetch = false;
    mockedRole = "STAFF";
    mockedRows = [];
    const { useEntityScope } = await import("./useEntityScope");
    const { result } = renderHook(() => useEntityScope());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isUnrestricted).toBe(false);
    expect(result.current.allowedEntityIds).toEqual([]);
  });
});

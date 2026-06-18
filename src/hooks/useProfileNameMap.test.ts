import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfileNameMap } from "@/hooks/useProfileNameMap";

const selectMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (...args: unknown[]) => selectMock(...args),
      }),
    }),
  },
}));

describe("useProfileNameMap", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("resolves known profiles and marks missing ids without re-fetching", async () => {
    const knownId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const missingId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    selectMock.mockResolvedValue({
      data: [{ id: knownId, full_name: "Alex Counselor", email: "alex@example.com" }],
    });

    const { result, rerender } = renderHook(({ ids }) => useProfileNameMap(ids), {
      initialProps: { ids: [knownId, missingId] },
    });

    await waitFor(() => {
      expect(result.current[knownId]).toBe("Alex Counselor");
      expect(result.current[missingId]).toBe("Unknown user");
    });

    expect(selectMock).toHaveBeenCalledTimes(1);

    rerender({ ids: [knownId, missingId] });
    await waitFor(() => {
      expect(selectMock).toHaveBeenCalledTimes(1);
    });
  });
});

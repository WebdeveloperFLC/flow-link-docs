import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildVerifiedPaymentUpdate, fnPaymentIsVerified, syncProofStatusOnVerify } from "@/incentives/lib/walletEngineLogic";

const mockUpdate = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/timeline", () => ({ appendTimeline: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/appNotifications", () => ({
  notifyUsers: vi.fn(),
  resolveCounselorNotificationUserIds: vi.fn().mockReturnValue([]),
}));

import { verifyPayment } from "./paymentVerification";

describe("paymentVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "finance-uid" } } });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === "client_invoice_payments") {
        return { update: mockUpdate };
      }
      if (table === "clients") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { owner_id: "c1", assigned_counselor_id: "c1", full_name: "Test Client" },
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it("sets both payment_status and payment_proof_status on verify", async () => {
    const ok = await verifyPayment({
      id: "pay-1",
      client_id: "client-1",
      amount: 25000,
      currency: "INR",
    });

    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: "verified",
        payment_proof_status: "verified",
        verified_by: "finance-uid",
      }),
    );
  });

  it("aligns with fn_payment_is_verified for either column", () => {
    expect(fnPaymentIsVerified("verified", "pending")).toBe(true);
    expect(fnPaymentIsVerified("uploaded", "verified")).toBe(true);
    expect(fnPaymentIsVerified("uploaded", "pending")).toBe(false);
  });

  it("DB trigger syncs proof when only payment_status verified", () => {
    expect(syncProofStatusOnVerify({ payment_status: "verified", payment_proof_status: "pending" })).toBe("verified");
    expect(buildVerifiedPaymentUpdate("u", "t").payment_proof_status).toBe("verified");
  });
});

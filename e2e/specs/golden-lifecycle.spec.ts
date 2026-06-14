import { test, expect } from "@playwright/test";
import { expectRow, getServiceClient } from "../fixtures/db";
import { GiveDiscountPage } from "../pages/GiveDiscountPage";

const e2eReady =
  !!process.env.E2E_BASE_URL &&
  !!process.env.SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe.configure({ skip: !e2eReady });

/**
 * GOLDEN PATH — Lead → Client → Wallet → Offer → Invoice → Payment → Incentive → Dashboard.
 * Asserts UI AND the underlying Supabase row at every hop. Runs as `counselor` project.
 */
test.describe("golden commercial lifecycle", () => {
  const ctx = { period: "2026-06", clientId: "", invoiceId: "" };

  test("lead converts through to incentive and dashboard", async ({ page }) => {
    const db = getServiceClient();
    await page.goto("/performance");
    await expect(page.getByTestId("lead-queue")).toContainText("PH-DEMO");

    ctx.clientId = await new GiveDiscountPage(page).convertSeedLeadToClient();
    await expectRow(db, "clients", { id: ctx.clientId });

    const disc = new GiveDiscountPage(page);
    await disc.open(ctx.clientId);
    await disc.applyWallet({ amount: 13500, currency: "INR" });
    await expectRow(db, "wallet_allocations", { client_id: ctx.clientId, status: "applied" });
    await expectRow(db, "wallet_ledger", { entry_type: "allocation" });

    await disc.applyOfferCode("FLC-EBIRD-7K3M");
    await expectRow(db, "client_offers", { client_id: ctx.clientId, status: "redeemed" });
    await expectRow(db, "offer_events", { event_type: "redeemed" });

    ctx.invoiceId = await disc.generateInvoice();
    const inv = await expectRow(db, "client_invoices", { id: ctx.invoiceId });
    expect(Number(inv.offer_discount_amount)).toBeGreaterThan(0);

    await disc.recordPayment({ amount: Number(inv.amount), currency: "INR" });
    const locked = await expectRow(db, "client_invoices", { id: ctx.invoiceId });
    expect(locked.invoice_locked).toBe(true);
    expect(locked.immutable_after_paid).toBe(true);

    await db.functions.invoke("incentive-calculate-run", { body: { period_key: ctx.period } });
    await expectRow(db, "incentive_line_items", { client_id: ctx.clientId });

    await page.goto("/performance/executive");
    await expect(page.getByTestId("kpi-revenue")).not.toHaveText("₹0");
    await expect(page.getByTestId("kpi-wallet-unlocked")).not.toHaveText("₹0");
  });
});

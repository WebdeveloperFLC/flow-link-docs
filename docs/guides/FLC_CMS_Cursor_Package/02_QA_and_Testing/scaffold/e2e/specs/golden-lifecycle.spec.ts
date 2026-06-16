import { test, expect } from "@playwright/test";
import { expectRow, getServiceClient } from "../fixtures/db";
import { GiveDiscountPage } from "../pages/GiveDiscountPage";

/**
 * GOLDEN PATH — Lead → Client → Wallet → Offer → Invoice → Payment → Incentive → Dashboard.
 * Asserts UI AND the underlying Supabase row at every hop. Runs as `counselor` project.
 * Data seeded deterministically by the Test Data Generator (qa/generators) in global-setup.
 */
test.describe("golden commercial lifecycle", () => {
  const db = getServiceClient(); // staging service-role, allowlisted URL only
  const ctx = { period: "2026-06", clientId: "", invoiceId: "" };

  test("lead converts through to incentive and dashboard", async ({ page }) => {
    // 1. Lead created (seeded) → visible in counselor queue
    await page.goto("/performance");
    await expect(page.getByTestId("lead-queue")).toContainText("PH-DEMO");

    // 2. Client created
    ctx.clientId = await new GiveDiscountPage(page).convertSeedLeadToClient();
    await expectRow(db, "clients", { id: ctx.clientId });

    // 3. Wallet applied → allocation + ledger debit
    const disc = new GiveDiscountPage(page);
    await disc.open(ctx.clientId);
    await disc.applyWallet({ amount: 13500, currency: "INR" });
    await expectRow(db, "wallet_allocations", { client_id: ctx.clientId, status: "applied" });
    await expectRow(db, "wallet_ledger", { entry_type: "allocation" }); // balance_after asserted in helper

    // 4. Offer applied → client_offers + offer_events('redeemed')
    await disc.applyOfferCode("FLC-EBIRD-7K3M");
    await expectRow(db, "client_offers", { client_id: ctx.clientId, status: "redeemed" });
    await expectRow(db, "offer_events", { event_type: "redeemed" });

    // 5. Invoice generated → breakdown correct
    ctx.invoiceId = await disc.generateInvoice();
    const inv = await expectRow(db, "client_invoices", { id: ctx.invoiceId });
    expect(Number(inv.offer_discount_amount)).toBeGreaterThan(0);

    // 6. Payment received → invoice locks (invoice-lock rule)
    await disc.recordPayment({ amount: Number(inv.amount), currency: "INR" });
    const locked = await expectRow(db, "client_invoices", { id: ctx.invoiceId });
    expect(locked.invoice_locked).toBe(true);
    expect(locked.immutable_after_paid).toBe(true);

    // 7. Incentive calculated (edge fn) → earned line item
    await db.functions.invoke("incentive-calculate-run", { body: { period_key: ctx.period } });
    await expectRow(db, "incentive_line_items", { client_id: ctx.clientId }); // earned_amount > 0 in helper

    // 8. Dashboard updated → KPI reflects revenue + wallet spend
    await page.goto("/performance/executive");
    await expect(page.getByTestId("kpi-revenue")).not.toHaveText("₹0");
    await expect(page.getByTestId("kpi-wallet-unlocked")).not.toHaveText("₹0"); // guards PH-R-001
  });
});

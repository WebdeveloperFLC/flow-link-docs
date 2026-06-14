import type { Page } from "@playwright/test";

/** Page object for Give Discount — expanded as golden lifecycle E2E grows. */
export class GiveDiscountPage {
  constructor(private page: Page) {}

  async convertSeedLeadToClient(): Promise<string> {
    throw new Error("GiveDiscountPage.convertSeedLeadToClient — implement in golden lifecycle phase");
  }

  async open(clientId: string) {
    await this.page.goto(`/performance/give-discount?client=${clientId}`);
  }

  async applyWallet(_opts: { amount: number; currency: string }) {
    throw new Error("GiveDiscountPage.applyWallet — implement in golden lifecycle phase");
  }

  async applyOfferCode(_code: string) {
    throw new Error("GiveDiscountPage.applyOfferCode — implement in golden lifecycle phase");
  }

  async generateInvoice(): Promise<string> {
    throw new Error("GiveDiscountPage.generateInvoice — implement in golden lifecycle phase");
  }

  async recordPayment(_opts: { amount: number; currency: string }) {
    throw new Error("GiveDiscountPage.recordPayment — implement in golden lifecycle phase");
  }
}

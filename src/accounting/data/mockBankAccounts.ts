import { BankAccount } from "../types/bankAccounts";

const now = new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const SEED_BANK_ACCOUNTS: BankAccount[] = [];
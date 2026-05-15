import { AccountingUser } from "../types/accountingUsers";

export const MOCK_ACCOUNTING_USERS: AccountingUser[] = [
  { id: "u1", name: "Anita Sharma", email: "anita@futurelink.io", role: "SUPER_ADMIN", entityScope: ["*"], mfaEnabled: true, lastLogin: "2025-10-28T09:14:00Z", status: "ACTIVE" },
  { id: "u2", name: "Marcus Lee", email: "marcus@futurelink.io", role: "FINANCE_ADMIN", entityScope: ["e1", "e2"], mfaEnabled: true, lastLogin: "2025-10-27T18:42:00Z", status: "ACTIVE" },
  { id: "u3", name: "Priya Verma", email: "priya@futurelink.io", role: "ACCOUNTANT", entityScope: ["e3", "e4"], mfaEnabled: true, lastLogin: "2025-10-28T07:30:00Z", status: "ACTIVE" },
  { id: "u4", name: "Devon Carter", email: "devon@futurelink.io", role: "AUDITOR", entityScope: ["e1"], mfaEnabled: false, lastLogin: "2025-10-25T15:01:00Z", status: "ACTIVE" },
  { id: "u5", name: "Hiroshi Tanaka", email: "hiroshi@futurelink.io", role: "FINAL_AUDITOR", entityScope: ["*"], mfaEnabled: true, lastLogin: "2025-10-27T11:20:00Z", status: "ACTIVE" },
  { id: "u6", name: "Rohan Mehta", email: "rohan@futurelink.io", role: "BRANCH_MANAGER", entityScope: ["e4"], mfaEnabled: true, lastLogin: "2025-10-26T13:55:00Z", status: "ACTIVE" },
  { id: "u7", name: "Lila Okafor", email: "lila@futurelink.io", role: "COMPLIANCE_OFFICER", entityScope: ["e1", "e3"], mfaEnabled: true, lastLogin: "2025-10-28T08:08:00Z", status: "ACTIVE" },
  { id: "u8", name: "Sam Park", email: "sam@futurelink.io", role: "VIEWER", entityScope: ["*"], mfaEnabled: false, status: "INVITED" },
];
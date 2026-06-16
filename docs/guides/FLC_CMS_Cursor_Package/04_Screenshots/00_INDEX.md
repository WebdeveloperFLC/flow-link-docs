# FLC CMS Prototype — Screenshot Reference

**Purpose:** Visual / UX reference for the new Performance Hub → CMS UI. **Design target only — not implementation.**
Build against the existing repo + Transformation Brief; use these for *look and feel* per screen.
Currency: INR base + CAD. Branches: Vadodara (×5), Bharuch, Anand, Toronto. Rendered at 2× (retina).

## Pages (Super Admin unless noted)
| File | Screen | CMS module |
|---|---|---|
| 01_Dashboard_Executive | Executive command center | Dashboards (M8) |
| 02a_Dashboard_Counselor | Counselor "My Performance" view | Dashboards — role-aware |
| 02b_Dashboard_Finance | Finance & revenue control view | Dashboards — role-aware |
| 02c_Dashboard_Branch | Branch manager view | Dashboards — role-aware |
| 03_Revenue_Analytics | Revenue/discount/margin analytics | Reporting/BI |
| 04_Comparison_Engine | Counselor/branch/etc VS comparison | Comparison (M9) |
| 05_Discount_Wallets | Wallet list, utilization meters | Wallets (M1) |
| 06_Combination_Engine | Service combinations (logical/package) | Combinations (M2) |
| 07_Offer_Management | Offer lifecycle + conflict resolution | Offers (M3) |
| 08_Offer_Codes | Code generation, prefixes, bulk/one-time | Offer Codes |
| 09_Promotion_Requests | Proposal → review → launch | Promotions (M4) |
| 10_Client_Commercials | Apply wallet/offer from client profile | Client-level usage |
| 11_Incentive_Plans | Plans, basis config, client-type rules | Incentives (M5) |
| 12_Incentive_Ledger_Payouts | Earned→approved→paid→clawback, cycles, forecast | Payouts |
| 13_Commission_Tracking | Partner/institution commission ledger | Commissions (M6) |
| 14_Multi_Currency | INR base + CAD, FX override | Multi-currency (M7) |
| 15_Approvals | Auto/manager/director/multi-level queue | Approvals |
| 16_Report_Builder | Compose/group/export reports | Reporting (M11) |
| 17_Profitability | Net profit after discount/incentive/commission | Profitability |
| 18_Audit_Trail | Append-only commercial audit timeline | Audit (M12) |
| 19_Roles_Permissions | 8-role × module capability matrix | RBAC (M10) |
| 20_CRM_Integration | Inherited CRM entities, auto-apply policy | CRM layer |
| 21_Configuration | Eligibility, invoice controls, service catalog, departments | Config |
| 22_Architecture_API | Data model + REST + scalability | Reference |

## Modals
| File | Shows |
|---|---|
| 23_Modal_Wallet_Detail | Wallet allocation/usage detail + lifecycle |
| 24_Modal_Client_Invoice_Lock | Price breakdown + auto-lock after payment + eligibility checks |
| 25_Modal_New_Wallet | Create-wallet form (type, scope, rules, carry-forward) |
| 26_Modal_New_Offer_Code | Code generation form (prefix, scope, limits) |
| 27_Modal_Run_Payout | Payout cycle run (frequency, threshold, partial) |

## Mobile
| File | Shows |
|---|---|
| 28_Mobile_Dashboard | Responsive dashboard (390px) |
| 29_Mobile_Wallets | Responsive wallet list |

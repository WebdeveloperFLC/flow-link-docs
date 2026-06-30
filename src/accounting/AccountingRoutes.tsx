import { Routes, Route } from "react-router-dom";
import { AccountingProtectedRoute } from "./components/AccountingProtectedRoute";
import AccountingSectionRoute from "./components/AccountingSectionRoute";
import { PettyCashProvider } from "./stores/pettyCashStore";
import AccountingOverviewPage from "./pages/AccountingOverviewPage";
import AccountingJournalsPage from "./pages/journals/AccountingJournalsPage";
import AccountingNewJournalPage from "./pages/journals/AccountingNewJournalPage";
import AccountingJournalDetailPage from "./pages/journals/AccountingJournalDetailPage";
import AccountingCOAPage from "./pages/coa/AccountingCOAPage";
import AccountingOwnersPage from "./pages/owners/AccountingOwnersPage";
import AccountingOwnerDetailPage from "./pages/owners/AccountingOwnerDetailPage";
import AccountingWealthPage from "./pages/owners/AccountingWealthPage";
import AccountingAPPage from "./pages/ap/AccountingAPPage";
import AccountingNewBillPage from "./pages/ap/AccountingNewBillPage";
import AccountingBillDetailPage from "./pages/ap/AccountingBillDetailPage";
import AccountingARPage from "./pages/ar/AccountingARPage";
import AccountingNewInvoicePage from "./pages/ar/AccountingNewInvoicePage";
import AccountingInvoiceDetailPage from "./pages/ar/AccountingInvoiceDetailPage";
import AccountingVerificationQueuePage from "./pages/ar/AccountingVerificationQueuePage";
import AccountingReceiptsPage from "./pages/ar/AccountingReceiptsPage";
import AccountingTrustPage from "./pages/trust/AccountingTrustPage";
import AccountingTrustDisbursementPage from "./pages/trust/AccountingTrustDisbursementPage";
import AccountingPayrollPage from "./pages/payroll/AccountingPayrollPage";
import AccountingPayrollDetailPage from "./pages/payroll/AccountingPayrollDetailPage";
import AccountingVendorsPage from "./pages/vendors/AccountingVendorsPage";
import AccountingVendorDetailPage from "./pages/vendors/AccountingVendorDetailPage";
import AccountingClientsPage from "./pages/clients/AccountingClientsPage";
import AccountingClientDetailPage from "./pages/clients/AccountingClientDetailPage";
import AccountingBankAccountsPage from "./pages/bank-accounts/AccountingBankAccountsPage";
import AccountingBankAccountDetailPage from "./pages/bank-accounts/AccountingBankAccountDetailPage";
import AccountingDocumentsPage from "./pages/documents/AccountingDocumentsPage";
import AccountingUploadPage from "./pages/documents/AccountingUploadPage";
import AccountingOCRPage from "./pages/documents/AccountingOCRPage";
import AccountingApprovalsPage from "./pages/approvals/AccountingApprovalsPage";
import AccountingApprovalDetailPage from "./pages/approvals/AccountingApprovalDetailPage";
import AccountingReportsPage from "./pages/reports/AccountingReportsPage";
import AccountingPLPage from "./pages/reports/AccountingPLPage";
import AccountingBSPage from "./pages/reports/AccountingBSPage";
import AccountingCashFlowPage from "./pages/reports/AccountingCashFlowPage";
import AccountingConsolidatedPage from "./pages/reports/AccountingConsolidatedPage";
import AccountingTrialBalancePage from "./pages/reports/AccountingTrialBalancePage";
import AccountingGeneralLedgerPage from "./pages/reports/AccountingGeneralLedgerPage";
import AccountingReportReconciliationPage from "./pages/reports/AccountingReconciliationPage";
import AccountingTaxDashboardPage from "./pages/tax/AccountingTaxDashboardPage";
import AccountingTaxCalendarPage from "./pages/tax/AccountingTaxCalendarPage";
import AccountingNoticesPage from "./pages/tax/AccountingNoticesPage";
import AccountingFraudPage from "./pages/fraud/AccountingFraudPage";
import AccountingFlaggedPage from "./pages/fraud/AccountingFlaggedPage";
import AccountingReconciliationPage from "./pages/reconciliation/AccountingReconciliationPage";
import AccountingAIPage from "./pages/ai/AccountingAIPage";
import AccountingUsersPage from "./pages/settings/AccountingUsersPage";
import AccountingEntitiesPage from "./pages/settings/AccountingEntitiesPage";
import AccountingCollectionCategoriesPage from "./pages/settings/AccountingCollectionCategoriesPage";
import AccountingPaymentPurposePage from "./pages/reports/AccountingPaymentPurposePage";
import AccountingAccessAdminPage from "./pages/settings/AccountingAccessAdminPage";
import AccountingNoAccessPage from "./pages/AccountingNoAccessPage";
import AccountingPettyCashDashboardPage from "./pages/petty-cash/AccountingPettyCashDashboardPage";
import AccountingPettyCashVoucherPage from "./pages/petty-cash/AccountingPettyCashVoucherPage";
import AccountingPettyCashDetailPage from "./pages/petty-cash/AccountingPettyCashDetailPage";
import AccountingPettyCashAuditPage from "./pages/petty-cash/AccountingPettyCashAuditPage";
import AccountingPettyCashReplenishmentPage from "./pages/petty-cash/AccountingPettyCashReplenishmentPage";
import AccountingIntercompanyPage from "./pages/intercompany/AccountingIntercompanyPage";
import AccountingIntercompanyNewPage from "./pages/intercompany/AccountingIntercompanyNewPage";
import AccountingIntercompanyDetailPage from "./pages/intercompany/AccountingIntercompanyDetailPage";
import AccountingReimbursementsPage from "./pages/reimbursements/AccountingReimbursementsPage";
import AccountingReimbursementNewPage from "./pages/reimbursements/AccountingReimbursementNewPage";
import AccountingReimbursementDetailPage from "./pages/reimbursements/AccountingReimbursementDetailPage";
import AccountingCardReconciliationPage from "./pages/card-reconciliation/AccountingCardReconciliationPage";
import AccountingCardReconciliationNewPage from "./pages/card-reconciliation/AccountingCardReconciliationNewPage";

export default function AccountingRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <AccountingProtectedRoute>
            <AccountingOverviewPage />
          </AccountingProtectedRoute>
        }
      />
      <Route
        path="no-access"
        element={
          <AccountingProtectedRoute>
            <AccountingNoAccessPage />
          </AccountingProtectedRoute>
        }
      />
      <Route
        path="access"
        element={
          <AccountingSectionRoute section="access_admin">
            <AccountingAccessAdminPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="journals"
        element={
          <AccountingSectionRoute section="journals">
            <AccountingJournalsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="journals/new"
        element={
          <AccountingSectionRoute section="journals" level="edit">
            <AccountingNewJournalPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="journals/:id"
        element={
          <AccountingSectionRoute section="journals">
            <AccountingJournalDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="journals/:id/edit"
        element={
          <AccountingSectionRoute section="journals" level="edit">
            <AccountingNewJournalPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="coa"
        element={
          <AccountingSectionRoute section="coa">
            <AccountingCOAPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="owners"
        element={
          <AccountingSectionRoute section="owners">
            <AccountingOwnersPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="owners/wealth-summary"
        element={
          <AccountingSectionRoute section="owners">
            <AccountingWealthPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="owners/:id"
        element={
          <AccountingSectionRoute section="owners">
            <AccountingOwnerDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ap"
        element={
          <AccountingSectionRoute section="ap">
            <AccountingAPPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ap/new"
        element={
          <AccountingSectionRoute section="ap" level="edit">
            <AccountingNewBillPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ap/:id"
        element={
          <AccountingSectionRoute section="ap">
            <AccountingBillDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ar"
        element={
          <AccountingSectionRoute section="ar">
            <AccountingARPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ar/new"
        element={
          <AccountingSectionRoute section="ar" level="edit">
            <AccountingNewInvoicePage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="finance-queue"
        element={
          <AccountingSectionRoute section="approvals">
            <AccountingVerificationQueuePage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ar/verification"
        element={
          <AccountingSectionRoute section="ar">
            <AccountingVerificationQueuePage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ar/receipts"
        element={
          <AccountingSectionRoute section="ar">
            <AccountingReceiptsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ar/:id"
        element={
          <AccountingSectionRoute section="ar">
            <AccountingInvoiceDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="trust"
        element={
          <AccountingSectionRoute section="trust">
            <AccountingTrustPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="trust/disburse"
        element={
          <AccountingSectionRoute section="trust" level="edit">
            <AccountingTrustDisbursementPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="payroll"
        element={
          <AccountingSectionRoute section="payroll">
            <AccountingPayrollPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="payroll/:id"
        element={
          <AccountingSectionRoute section="payroll">
            <AccountingPayrollDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="vendors"
        element={
          <AccountingSectionRoute section="vendors">
            <AccountingVendorsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="vendors/:id"
        element={
          <AccountingSectionRoute section="vendors">
            <AccountingVendorDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="clients"
        element={
          <AccountingSectionRoute section="clients_link">
            <AccountingClientsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="clients/:id"
        element={
          <AccountingSectionRoute section="clients_link">
            <AccountingClientDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="bank-accounts"
        element={
          <AccountingSectionRoute section="bank">
            <AccountingBankAccountsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="bank-accounts/:id"
        element={
          <AccountingSectionRoute section="bank">
            <AccountingBankAccountDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="documents"
        element={
          <AccountingSectionRoute section="documents">
            <AccountingDocumentsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="documents/upload"
        element={
          <AccountingSectionRoute section="documents" level="edit">
            <AccountingUploadPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="documents/ocr"
        element={
          <AccountingSectionRoute section="documents">
            <AccountingOCRPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="approvals"
        element={
          <AccountingSectionRoute section="approvals">
            <AccountingApprovalsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="approvals/:id"
        element={
          <AccountingSectionRoute section="approvals">
            <AccountingApprovalDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingReportsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/pl"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingPLPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/bs"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingBSPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/cashflow"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingCashFlowPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/consolidated"
        element={
          <AccountingSectionRoute section="reports_consolidated">
            <AccountingConsolidatedPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/trial-balance"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingTrialBalancePage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/reconciliation"
        element={
          <AccountingSectionRoute section="reports_reconciliation">
            <AccountingReportReconciliationPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/general-ledger"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingGeneralLedgerPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/general-ledger/:accountId"
        element={
          <AccountingSectionRoute section="reports_financials">
            <AccountingGeneralLedgerPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="tax"
        element={
          <AccountingSectionRoute section="tax">
            <AccountingTaxDashboardPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="tax/calendar"
        element={
          <AccountingSectionRoute section="tax">
            <AccountingTaxCalendarPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="tax/notices"
        element={
          <AccountingSectionRoute section="tax">
            <AccountingNoticesPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="fraud"
        element={
          <AccountingSectionRoute section="fraud">
            <AccountingFraudPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="fraud/flagged"
        element={
          <AccountingSectionRoute section="fraud">
            <AccountingFlaggedPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reconciliation"
        element={
          <AccountingSectionRoute section="reports_reconciliation">
            <AccountingReconciliationPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="wealth"
        element={
          <AccountingSectionRoute section="owners">
            <AccountingWealthPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="ai-assistant"
        element={
          <AccountingSectionRoute section="ai">
            <AccountingAIPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="settings/platform-config"
        element={
          <AccountingSectionRoute section="users" level="edit">
            <AccountingAccessAdminPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="settings/users"
        element={
          <AccountingSectionRoute section="users">
            <AccountingUsersPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="settings/entities"
        element={
          <AccountingSectionRoute section="entities">
            <AccountingEntitiesPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="settings/collection-categories"
        element={
          <AccountingSectionRoute section="collection_categories" level="edit">
            <AccountingCollectionCategoriesPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reports/payment-purpose"
        element={
          <AccountingSectionRoute section="payment_purpose_report">
            <AccountingPaymentPurposePage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="petty-cash"
        element={
          <AccountingSectionRoute section="petty_cash">
            <PettyCashProvider>
              <AccountingPettyCashDashboardPage />
            </PettyCashProvider>
          </AccountingSectionRoute>
        }
      />
      <Route
        path="petty-cash/new"
        element={
          <AccountingSectionRoute section="petty_cash" level="edit">
            <PettyCashProvider>
              <AccountingPettyCashVoucherPage />
            </PettyCashProvider>
          </AccountingSectionRoute>
        }
      />
      <Route
        path="petty-cash/audit"
        element={
          <AccountingSectionRoute section="petty_cash">
            <PettyCashProvider>
              <AccountingPettyCashAuditPage />
            </PettyCashProvider>
          </AccountingSectionRoute>
        }
      />
      <Route
        path="petty-cash/replenishment"
        element={
          <AccountingSectionRoute section="petty_cash" level="edit">
            <PettyCashProvider>
              <AccountingPettyCashReplenishmentPage />
            </PettyCashProvider>
          </AccountingSectionRoute>
        }
      />
      <Route
        path="petty-cash/:id"
        element={
          <AccountingSectionRoute section="petty_cash">
            <PettyCashProvider>
              <AccountingPettyCashDetailPage />
            </PettyCashProvider>
          </AccountingSectionRoute>
        }
      />
      <Route
        path="intercompany"
        element={
          <AccountingSectionRoute section="intercompany">
            <AccountingIntercompanyPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="intercompany/new"
        element={
          <AccountingSectionRoute section="intercompany" level="edit">
            <AccountingIntercompanyNewPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="intercompany/:id"
        element={
          <AccountingSectionRoute section="intercompany">
            <AccountingIntercompanyDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reimbursements"
        element={
          <AccountingSectionRoute section="reimbursements">
            <AccountingReimbursementsPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reimbursements/new"
        element={
          <AccountingSectionRoute section="reimbursements" level="edit">
            <AccountingReimbursementNewPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="reimbursements/:id"
        element={
          <AccountingSectionRoute section="reimbursements">
            <AccountingReimbursementDetailPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="card-reconciliation"
        element={
          <AccountingSectionRoute section="card_recon">
            <AccountingCardReconciliationPage />
          </AccountingSectionRoute>
        }
      />
      <Route
        path="card-reconciliation/new"
        element={
          <AccountingSectionRoute section="card_recon" level="edit">
            <AccountingCardReconciliationNewPage />
          </AccountingSectionRoute>
        }
      />
      
    </Routes>
  );
}

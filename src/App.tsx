import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { BrowserPhoneProvider } from "@/contexts/BrowserPhoneContext";
import { PostCallNotesDialog } from "@/components/telephony/PostCallNotesDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Templates from "./pages/Templates";
import LetterTemplates from "./pages/LetterTemplates";
import Activity from "./pages/Activity";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import TeamAccess from "./pages/TeamAccess";
import Masters from "./pages/Masters";
import Verification from "./pages/Verification";
import FormsLibrary from "./pages/FormsLibrary";
import FormBuilder from "./pages/FormBuilder";
import QuestionnaireEmailTemplates from "./pages/QuestionnaireEmailTemplates";
import TelephonySettings from "./pages/TelephonySettings";
import TelephonyIntegrationSettings from "./pages/TelephonyIntegrationSettings";
import EmailSmtpSettings from "./pages/EmailSmtpSettings";
import EmailLogs from "./pages/EmailLogs";
import SharedView from "./pages/SharedView";
import Questionnaire from "./pages/Questionnaire";
import CourseFinder from "./pages/CourseFinder";
import Messages from "./pages/Messages";
import Telecaller from "./pages/Telecaller";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { PortalProtectedRoute } from "@/components/portal/PortalProtectedRoute";
import PortalAuth from "./pages/portal/PortalAuth";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalApplication from "./pages/portal/PortalApplication";
import PortalFiles from "./pages/portal/PortalFiles";
import PortalChat from "./pages/portal/PortalChat";
import PortalOffers from "./pages/portal/PortalOffers";
import PortalRefer from "./pages/portal/PortalRefer";
import PortalPayments from "./pages/portal/PortalPayments";
import PortalAppointments from "./pages/portal/PortalAppointments";
import PortalNotifications from "./pages/portal/PortalNotifications";
import PortalSettings from "./pages/portal/PortalSettings";
import PortalInviteRedeem from "./pages/portal/PortalInviteRedeem";
import OffersAdmin from "./pages/OffersAdmin";
import AssessmentLanding from "./pages/assessment/AssessmentLanding";
import AssessmentInvite from "./pages/assessment/AssessmentInvite";
import AssessmentVerify from "./pages/assessment/AssessmentVerify";
import AssessmentRun from "./pages/assessment/AssessmentRun";
import AssessmentGoal from "./pages/assessment/AssessmentGoal";
import AssessmentCountry from "./pages/assessment/AssessmentCountry";
import PortalAssessment from "./pages/portal/PortalAssessment";
import AssessmentAdmin from "./pages/admin/AssessmentAdmin";
import NocAdmin from "./pages/admin/NocAdmin";
import GermanyRulesAdmin from "./pages/admin/GermanyRulesAdmin";
import AccountingOverviewPage from "./accounting/pages/AccountingOverviewPage";
import AccountingJournalsPage from "./accounting/pages/journals/AccountingJournalsPage";
import AccountingNewJournalPage from "./accounting/pages/journals/AccountingNewJournalPage";
import AccountingJournalDetailPage from "./accounting/pages/journals/AccountingJournalDetailPage";
import AccountingCOAPage from "./accounting/pages/coa/AccountingCOAPage";
import AccountingOwnersPage from "./accounting/pages/owners/AccountingOwnersPage";
import AccountingOwnerDetailPage from "./accounting/pages/owners/AccountingOwnerDetailPage";
import AccountingWealthPage from "./accounting/pages/owners/AccountingWealthPage";
import AccountingAPPage from "./accounting/pages/ap/AccountingAPPage";
import AccountingNewBillPage from "./accounting/pages/ap/AccountingNewBillPage";
import AccountingBillDetailPage from "./accounting/pages/ap/AccountingBillDetailPage";
import AccountingARPage from "./accounting/pages/ar/AccountingARPage";
import AccountingNewInvoicePage from "./accounting/pages/ar/AccountingNewInvoicePage";
import AccountingInvoiceDetailPage from "./accounting/pages/ar/AccountingInvoiceDetailPage";
import AccountingVendorsPage from "./accounting/pages/vendors/AccountingVendorsPage";
import AccountingVendorDetailPage from "./accounting/pages/vendors/AccountingVendorDetailPage";
import AccountingClientsPage from "./accounting/pages/clients/AccountingClientsPage";
import AccountingClientDetailPage from "./accounting/pages/clients/AccountingClientDetailPage";
import AccountingBankAccountsPage from "./accounting/pages/bank-accounts/AccountingBankAccountsPage";
import AccountingBankAccountDetailPage from "./accounting/pages/bank-accounts/AccountingBankAccountDetailPage";
import AccountingDocumentsPage from "./accounting/pages/documents/AccountingDocumentsPage";
import AccountingUploadPage from "./accounting/pages/documents/AccountingUploadPage";
import AccountingOCRPage from "./accounting/pages/documents/AccountingOCRPage";
import AccountingApprovalsPage from "./accounting/pages/approvals/AccountingApprovalsPage";
import AccountingApprovalDetailPage from "./accounting/pages/approvals/AccountingApprovalDetailPage";
import AccountingReportsPage from "./accounting/pages/reports/AccountingReportsPage";
import AccountingPLPage from "./accounting/pages/reports/AccountingPLPage";
import AccountingBSPage from "./accounting/pages/reports/AccountingBSPage";
import AccountingCashFlowPage from "./accounting/pages/reports/AccountingCashFlowPage";
import AccountingConsolidatedPage from "./accounting/pages/reports/AccountingConsolidatedPage";
import AccountingTaxDashboardPage from "./accounting/pages/tax/AccountingTaxDashboardPage";
import AccountingTaxCalendarPage from "./accounting/pages/tax/AccountingTaxCalendarPage";
import AccountingNoticesPage from "./accounting/pages/tax/AccountingNoticesPage";
import AccountingFraudPage from "./accounting/pages/fraud/AccountingFraudPage";
import AccountingFlaggedPage from "./accounting/pages/fraud/AccountingFlaggedPage";
import AccountingReconciliationPage from "./accounting/pages/reconciliation/AccountingReconciliationPage";
import AccountingAIPage from "./accounting/pages/ai/AccountingAIPage";
import AccountingUsersPage from "./accounting/pages/settings/AccountingUsersPage";
import AccountingEntitiesPage from "./accounting/pages/settings/AccountingEntitiesPage";
import { AccountingProtectedRoute } from "./accounting/components/AccountingProtectedRoute";
import AccountingPettyCashDashboardPage from "./accounting/pages/petty-cash/AccountingPettyCashDashboardPage";
import AccountingPettyCashVoucherPage from "./accounting/pages/petty-cash/AccountingPettyCashVoucherPage";
import AccountingPettyCashDetailPage from "./accounting/pages/petty-cash/AccountingPettyCashDetailPage";
import AccountingPettyCashAuditPage from "./accounting/pages/petty-cash/AccountingPettyCashAuditPage";
import AccountingPettyCashReplenishmentPage from "./accounting/pages/petty-cash/AccountingPettyCashReplenishmentPage";
import { PettyCashProvider } from "./accounting/stores/pettyCashStore";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrowserPhoneProvider>
          <CallProvider>
          <PostCallNotesDialog />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/share/:token" element={<SharedView />} />
            <Route path="/questionnaire/:token" element={<Questionnaire />} />
            <Route path="/course-finder" element={<CourseFinder />} />
            <Route path="/portal/auth" element={<PortalAuth />} />
            <Route path="/portal/invite" element={<PortalInviteRedeem />} />
            <Route path="/assessment" element={<AssessmentLanding />} />
            <Route path="/settle-abroad" element={<AssessmentLanding />} />
            <Route path="/assessment/country" element={<AssessmentCountry />} />
            <Route path="/assessment/goal" element={<AssessmentGoal />} />
            <Route path="/assessment/invite/:token" element={<AssessmentInvite />} />
            <Route path="/assessment/verify/:token" element={<AssessmentVerify />} />
            <Route path="/assessment/run/:sessionId" element={<ProtectedRoute><AssessmentRun /></ProtectedRoute>} />
            <Route path="/portal" element={<PortalProtectedRoute><PortalDashboard /></PortalProtectedRoute>} />
            <Route path="/portal/application" element={<PortalProtectedRoute><PortalApplication /></PortalProtectedRoute>} />
            <Route path="/portal/files" element={<PortalProtectedRoute><PortalFiles /></PortalProtectedRoute>} />
            <Route path="/portal/chat" element={<PortalProtectedRoute><PortalChat /></PortalProtectedRoute>} />
            <Route path="/portal/offers" element={<PortalProtectedRoute><PortalOffers /></PortalProtectedRoute>} />
            <Route path="/portal/refer" element={<PortalProtectedRoute><PortalRefer /></PortalProtectedRoute>} />
            <Route path="/portal/payments" element={<PortalProtectedRoute><PortalPayments /></PortalProtectedRoute>} />
            <Route path="/portal/appointments" element={<PortalProtectedRoute><PortalAppointments /></PortalProtectedRoute>} />
            <Route path="/portal/notifications" element={<PortalProtectedRoute><PortalNotifications /></PortalProtectedRoute>} />
            <Route path="/portal/settings" element={<PortalProtectedRoute><PortalSettings /></PortalProtectedRoute>} />
            <Route path="/portal/assessment" element={<PortalProtectedRoute><PortalAssessment /></PortalProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/telecaller" element={<ProtectedRoute><Telecaller /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/letter-templates" element={<ProtectedRoute><LetterTemplates /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/offers-admin" element={<ProtectedRoute><OffersAdmin /></ProtectedRoute>} />
            <Route path="/assessment-admin" element={<ProtectedRoute><AssessmentAdmin /></ProtectedRoute>} />
            <Route path="/noc-admin" element={<ProtectedRoute><NocAdmin /></ProtectedRoute>} />
            <Route path="/germany-rules" element={<ProtectedRoute><GermanyRulesAdmin /></ProtectedRoute>} />
            <Route path="/accounting" element={<AccountingProtectedRoute><AccountingOverviewPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/journals" element={<AccountingProtectedRoute><AccountingJournalsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/journals/new" element={<AccountingProtectedRoute><AccountingNewJournalPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/journals/:id" element={<AccountingProtectedRoute><AccountingJournalDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/journals/:id/edit" element={<AccountingProtectedRoute><AccountingNewJournalPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/coa" element={<AccountingProtectedRoute><AccountingCOAPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/owners" element={<AccountingProtectedRoute><AccountingOwnersPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/owners/wealth-summary" element={<AccountingProtectedRoute><AccountingWealthPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/owners/:id" element={<AccountingProtectedRoute><AccountingOwnerDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ap" element={<AccountingProtectedRoute><AccountingAPPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ap/new" element={<AccountingProtectedRoute><AccountingNewBillPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ap/:id" element={<AccountingProtectedRoute><AccountingBillDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ar" element={<AccountingProtectedRoute><AccountingARPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ar/new" element={<AccountingProtectedRoute><AccountingNewInvoicePage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ar/:id" element={<AccountingProtectedRoute><AccountingInvoiceDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/vendors" element={<AccountingProtectedRoute><AccountingVendorsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/vendors/:id" element={<AccountingProtectedRoute><AccountingVendorDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/clients" element={<AccountingProtectedRoute><AccountingClientsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/clients/:id" element={<AccountingProtectedRoute><AccountingClientDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/bank-accounts" element={<AccountingProtectedRoute><AccountingBankAccountsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/bank-accounts/:id" element={<AccountingProtectedRoute><AccountingBankAccountDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/documents" element={<AccountingProtectedRoute><AccountingDocumentsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/documents/upload" element={<AccountingProtectedRoute><AccountingUploadPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/documents/ocr" element={<AccountingProtectedRoute><AccountingOCRPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/approvals" element={<AccountingProtectedRoute><AccountingApprovalsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/approvals/:id" element={<AccountingProtectedRoute><AccountingApprovalDetailPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reports" element={<AccountingProtectedRoute><AccountingReportsPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reports/pl" element={<AccountingProtectedRoute><AccountingPLPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reports/bs" element={<AccountingProtectedRoute><AccountingBSPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reports/cashflow" element={<AccountingProtectedRoute><AccountingCashFlowPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reports/consolidated" element={<AccountingProtectedRoute><AccountingConsolidatedPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/tax" element={<AccountingProtectedRoute><AccountingTaxDashboardPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/tax/calendar" element={<AccountingProtectedRoute><AccountingTaxCalendarPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/tax/notices" element={<AccountingProtectedRoute><AccountingNoticesPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/fraud" element={<AccountingProtectedRoute><AccountingFraudPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/fraud/flagged" element={<AccountingProtectedRoute><AccountingFlaggedPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/reconciliation" element={<AccountingProtectedRoute><AccountingReconciliationPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/wealth" element={<AccountingProtectedRoute><AccountingWealthPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/ai-assistant" element={<AccountingProtectedRoute><AccountingAIPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/settings/users" element={<AccountingProtectedRoute><AccountingUsersPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/settings/entities" element={<AccountingProtectedRoute><AccountingEntitiesPage /></AccountingProtectedRoute>} />
            <Route path="/accounting/petty-cash" element={<AccountingProtectedRoute><PettyCashProvider><AccountingPettyCashDashboardPage /></PettyCashProvider></AccountingProtectedRoute>} />
            <Route path="/accounting/petty-cash/new" element={<AccountingProtectedRoute><PettyCashProvider><AccountingPettyCashVoucherPage /></PettyCashProvider></AccountingProtectedRoute>} />
            <Route path="/accounting/petty-cash/audit" element={<AccountingProtectedRoute><PettyCashProvider><AccountingPettyCashAuditPage /></PettyCashProvider></AccountingProtectedRoute>} />
            <Route path="/accounting/petty-cash/replenishment" element={<AccountingProtectedRoute><PettyCashProvider><AccountingPettyCashReplenishmentPage /></PettyCashProvider></AccountingProtectedRoute>} />
            <Route path="/accounting/petty-cash/:id" element={<AccountingProtectedRoute><PettyCashProvider><AccountingPettyCashDetailPage /></PettyCashProvider></AccountingProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/team-access" element={<ProtectedRoute><TeamAccess /></ProtectedRoute>} />
            <Route path="/masters" element={<ProtectedRoute><Masters /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
            <Route path="/forms-library" element={<ProtectedRoute><FormsLibrary /></ProtectedRoute>} />
            <Route path="/forms-library/:formId/build" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
            <Route path="/settings/questionnaire-emails" element={<ProtectedRoute><QuestionnaireEmailTemplates /></ProtectedRoute>} />
            <Route path="/settings/telephony" element={<ProtectedRoute><TelephonySettings /></ProtectedRoute>} />
            <Route path="/settings/telephony-integration" element={<ProtectedRoute><TelephonyIntegrationSettings /></ProtectedRoute>} />
            <Route path="/settings/email-smtp" element={<ProtectedRoute><EmailSmtpSettings /></ProtectedRoute>} />
            <Route path="/settings/email-logs" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CallProvider>
          </BrowserPhoneProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

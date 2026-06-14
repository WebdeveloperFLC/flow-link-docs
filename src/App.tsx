import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PerformancePeriodProvider } from "@/contexts/PerformancePeriodContext";
import { CallProvider } from "@/contexts/CallContext";
import { BrowserPhoneProvider } from "@/contexts/BrowserPhoneContext";
import { PostCallNotesDialog } from "@/components/telephony/PostCallNotesDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientNew from "./pages/clients/ClientNew";
import LeadsList from "./pages/leads/LeadsList";
import ColdPool from "./pages/leads/ColdPool";
import LeadNew from "./pages/leads/LeadNew";
import LeadDetail from "./pages/leads/LeadDetail";
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
import NotificationPreferences from "./pages/NotificationPreferences";
import NotificationMonitoring from "./pages/admin/NotificationMonitoring";
import SharedView from "./pages/SharedView";
import Questionnaire from "./pages/Questionnaire";
import CourseFinder from "./pages/CourseFinder";
import Messages from "./pages/Messages";
import WhatsAppInbox from "./pages/WhatsAppInbox";
import ServiceLibrary from "./pages/ServiceLibrary";
import ServiceLibraryAdmin from "./pages/ServiceLibraryAdmin";
import { ServiceLibraryProtectedRoute } from "@/components/service-library/ServiceLibraryProtectedRoute";
import Telecaller from "./pages/Telecaller";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import CalendarDashboard from "./calendar/pages/CalendarDashboard";
import CalendarSettings from "./calendar/pages/CalendarSettings";
import AppointmentDetailPage from "./calendar/pages/AppointmentDetailPage";
import MeetingTypesPage from "./calendar/pages/MeetingTypesPage";
import AppointmentApprovalsPage from "./calendar/pages/AppointmentApprovalsPage";
import AnalyticsDashboardPage from "./calendar/pages/AnalyticsDashboardPage";
import ReportsPage from "./calendar/pages/ReportsPage";
import ActivityFeedPage from "./calendar/pages/ActivityFeedPage";
import CompanyBrandingPage from "./calendar/pages/CompanyBrandingPage";
import PublicBookingPage from "./calendar/pages/PublicBookingPage";
import VisitorActionPage from "./calendar/pages/VisitorActionPage";
import DigitalSuccessHomePage from "./digital-success/pages/DigitalSuccessHomePage";
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
import OffersAnalytics from "./pages/OffersAnalytics";
import AssessmentLanding from "./pages/assessment/AssessmentLanding";
import AssessmentInvite from "./pages/assessment/AssessmentInvite";
import AssessmentVerify from "./pages/assessment/AssessmentVerify";
import AssessmentRun from "./pages/assessment/AssessmentRun";
import ServiceEligibilityRun from "./pages/eligibility/ServiceEligibilityRun";
import EligibilityCheckPublic from "./pages/eligibility/EligibilityCheckPublic";
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
import AccountingVerificationQueuePage from "./accounting/pages/ar/AccountingVerificationQueuePage";
import AccountingReceiptsPage from "./accounting/pages/ar/AccountingReceiptsPage";
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
import AccountingTrialBalancePage from "./accounting/pages/reports/AccountingTrialBalancePage";
import AccountingGeneralLedgerPage from "./accounting/pages/reports/AccountingGeneralLedgerPage";
import AccountingReportReconciliationPage from "./accounting/pages/reports/AccountingReconciliationPage";
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
import AccountingSectionRoute from "./accounting/components/AccountingSectionRoute";
import AccountingAccessAdminPage from "./accounting/pages/settings/AccountingAccessAdminPage";
import AccountingNoAccessPage from "./accounting/pages/AccountingNoAccessPage";
import AccountingPettyCashDashboardPage from "./accounting/pages/petty-cash/AccountingPettyCashDashboardPage";
import AccountingPettyCashVoucherPage from "./accounting/pages/petty-cash/AccountingPettyCashVoucherPage";
import AccountingPettyCashDetailPage from "./accounting/pages/petty-cash/AccountingPettyCashDetailPage";
import AccountingPettyCashAuditPage from "./accounting/pages/petty-cash/AccountingPettyCashAuditPage";
import AccountingPettyCashReplenishmentPage from "./accounting/pages/petty-cash/AccountingPettyCashReplenishmentPage";
import { PettyCashProvider } from "./accounting/stores/pettyCashStore";
import AccountingIntercompanyPage from "./accounting/pages/intercompany/AccountingIntercompanyPage";
import AccountingIntercompanyNewPage from "./accounting/pages/intercompany/AccountingIntercompanyNewPage";
import AccountingIntercompanyDetailPage from "./accounting/pages/intercompany/AccountingIntercompanyDetailPage";
import AccountingReimbursementsPage from "./accounting/pages/reimbursements/AccountingReimbursementsPage";
import AccountingReimbursementNewPage from "./accounting/pages/reimbursements/AccountingReimbursementNewPage";
import AccountingReimbursementDetailPage from "./accounting/pages/reimbursements/AccountingReimbursementDetailPage";
import AccountingCardReconciliationPage from "./accounting/pages/card-reconciliation/AccountingCardReconciliationPage";
import AccountingCardReconciliationNewPage from "./accounting/pages/card-reconciliation/AccountingCardReconciliationNewPage";
import InstitutionsListPage from "./institutions/pages/InstitutionsListPage";
import InstitutionDetailPage from "./institutions/pages/InstitutionDetailPage";
import CourseReviewPage from "./institutions/pages/CourseReviewPage";
import AiSuggestionsPage from "./institutions/pages/AiSuggestionsPage";
import { InstitutionsProtectedRoute } from "./institutions/components/InstitutionsProtectedRoute";
import { CommissionsProtectedRoute } from "./institutions/components/CommissionsProtectedRoute";
import CommissionsPage from "./pages/CommissionsPage";
import MyIncentives from "@/pages/MyIncentives";
import IncentivesAdmin from "@/pages/IncentivesAdmin";
import GiveDiscount from "@/pages/GiveDiscount";
import WalletTopups from "@/pages/WalletTopups";
import PeriodClose from "@/pages/PeriodClose";
import IncentivePlans from "@/pages/IncentivePlans";
import IncentiveFxRates from "@/pages/IncentiveFxRates";
import IncentivePayoutDesk from "@/pages/IncentivePayoutDesk";
import IncentiveRunDetail from "@/pages/IncentiveRunDetail";
import IncentiveCompetitions from "@/pages/IncentiveCompetitions";
import IncentiveSimulator from "@/pages/IncentiveSimulator";
import PerformanceHome from "@/pages/PerformanceHome";
import PerformanceCommandCenter from "@/pages/PerformanceCommandCenter";
import PerformanceExecutive from "@/pages/PerformanceExecutive";
import PerformanceTeam from "@/pages/PerformanceTeam";
import PerformanceWalletPolicy from "@/pages/PerformanceWalletPolicy";
import PerformanceWallets from "@/pages/PerformanceWallets";
import PerformanceBranchPool from "@/pages/PerformanceBranchPool";
import PerformanceHowItWorks from "@/pages/PerformanceHowItWorks";
import PerformanceUnclassifiedPayments from "@/pages/PerformanceUnclassifiedPayments";
import PerformanceApprovals from "@/pages/PerformanceApprovals";
import PerformancePromotionRequests from "@/pages/PerformancePromotionRequests";
import PerformanceOffersStudio from "@/pages/PerformanceOffersStudio";
import PerformanceOffersLibrary from "@/pages/PerformanceOffersLibrary";
import PerformanceOfferWizard from "@/pages/PerformanceOfferWizard";
import PerformanceOffersAnalytics from "@/pages/PerformanceOffersAnalytics";
import PerformanceOfferAiStudio from "@/pages/PerformanceOfferAiStudio";
import HrPayrollRoutes from "@/hr-payroll/HrPayrollRoutes";
import PerformanceOffersCalendar from "@/pages/PerformanceOffersCalendar";
import PerformanceOffersSegments from "@/pages/PerformanceOffersSegments";
import PerformanceOffersAutomation from "@/pages/PerformanceOffersAutomation";
import PerformanceOffersJourneys from "@/pages/PerformanceOffersJourneys";
import PerformanceOffersAbTests from "@/pages/PerformanceOffersAbTests";
import AiHelpPage from "./ai-help/pages/AiHelpPage";
import GuidesIndexPage from "./guides/pages/GuidesIndexPage";
import GuideDetailPage from "./guides/pages/GuideDetailPage";
import AiStudioPage from "./digital-success/ai/AiStudioPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PerformancePeriodProvider>
            <BrowserPhoneProvider>
              <CallProvider>
                <PostCallNotesDialog />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/share/:token" element={<SharedView />} />
                  <Route path="/book/:slug" element={<PublicBookingPage />} />
                  <Route path="/book/:slug/:meetingSlug" element={<PublicBookingPage />} />
                  <Route path="/a/:token" element={<VisitorActionPage />} />
                  <Route path="/questionnaire/:token" element={<Questionnaire />} />
                  <Route path="/course-finder" element={<CourseFinder />} />
                  <Route
                    path="/service-library"
                    element={
                      <ServiceLibraryProtectedRoute>
                        <ServiceLibrary />
                      </ServiceLibraryProtectedRoute>
                    }
                  />
                  <Route
                    path="/service-library-admin"
                    element={
                      <ServiceLibraryProtectedRoute requireManage>
                        <ServiceLibraryAdmin />
                      </ServiceLibraryProtectedRoute>
                    }
                  />
                  <Route path="/portal/auth" element={<PortalAuth />} />
                  <Route path="/portal/invite" element={<PortalInviteRedeem />} />
                  <Route path="/assessment" element={<AssessmentLanding />} />
                  <Route path="/settle-abroad" element={<AssessmentLanding />} />
                  <Route path="/assessment/country" element={<AssessmentCountry />} />
                  <Route path="/assessment/goal" element={<AssessmentGoal />} />
                  <Route path="/assessment/invite/:token" element={<AssessmentInvite />} />
                  <Route path="/assessment/verify/:token" element={<AssessmentVerify />} />
                  <Route path="/eligibility/check" element={<EligibilityCheckPublic />} />
                  <Route path="/eligibility/run/:sessionId" element={<ServiceEligibilityRun />} />
                  <Route path="/assessment/run/:sessionId" element={<AssessmentRun />} />
                  <Route
                    path="/portal"
                    element={
                      <PortalProtectedRoute>
                        <PortalDashboard />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/application"
                    element={
                      <PortalProtectedRoute>
                        <PortalApplication />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/files"
                    element={
                      <PortalProtectedRoute>
                        <PortalFiles />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/chat"
                    element={
                      <PortalProtectedRoute>
                        <PortalChat />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/offers"
                    element={
                      <PortalProtectedRoute>
                        <PortalOffers />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/refer"
                    element={
                      <PortalProtectedRoute>
                        <PortalRefer />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/payments"
                    element={
                      <PortalProtectedRoute>
                        <PortalPayments />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/appointments"
                    element={
                      <PortalProtectedRoute>
                        <PortalAppointments />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/notifications"
                    element={
                      <PortalProtectedRoute>
                        <PortalNotifications />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/settings"
                    element={
                      <PortalProtectedRoute>
                        <PortalSettings />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/portal/assessment"
                    element={
                      <PortalProtectedRoute>
                        <PortalAssessment />
                      </PortalProtectedRoute>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <ProtectedRoute>
                        <Clients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients/new"
                    element={
                      <ProtectedRoute>
                        <ClientNew />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients/:id"
                    element={
                      <ProtectedRoute>
                        <ClientDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads"
                    element={
                      <ProtectedRoute>
                        <LeadsList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads/cold"
                    element={
                      <ProtectedRoute>
                        <ColdPool />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads/new"
                    element={
                      <ProtectedRoute>
                        <LeadNew />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads/:id"
                    element={
                      <ProtectedRoute>
                        <LeadDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/messages"
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/whatsapp"
                    element={
                      <ProtectedRoute>
                        <WhatsAppInbox />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/telecaller"
                    element={
                      <ProtectedRoute>
                        <Telecaller />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/templates"
                    element={<Navigate to="/service-library-admin?tab=binder-catalog" replace />}
                  />
                  <Route
                    path="/letter-templates"
                    element={
                      <ProtectedRoute>
                        <LetterTemplates />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/activity"
                    element={
                      <ProtectedRoute>
                        <Activity />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute>
                        <Users />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/offers-analytics"
                    element={
                      <ProtectedRoute>
                        <OffersAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/assessment-admin"
                    element={
                      <ProtectedRoute>
                        <AssessmentAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/noc-admin"
                    element={
                      <ProtectedRoute>
                        <NocAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/germany-rules"
                    element={
                      <ProtectedRoute>
                        <GermanyRulesAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institutions"
                    element={
                      <InstitutionsProtectedRoute>
                        <InstitutionsListPage />
                      </InstitutionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/institutions/review"
                    element={
                      <InstitutionsProtectedRoute>
                        <CourseReviewPage />
                      </InstitutionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/institutions/suggestions"
                    element={
                      <InstitutionsProtectedRoute>
                        <AiSuggestionsPage />
                      </InstitutionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/institutions/:id"
                    element={
                      <InstitutionsProtectedRoute>
                        <InstitutionDetailPage />
                      </InstitutionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/commissions"
                    element={
                      <CommissionsProtectedRoute>
                        <CommissionsPage />
                      </CommissionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/hr/*"
                    element={
                      <ProtectedRoute>
                        <HrPayrollRoutes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance"
                    element={
                      <ProtectedRoute>
                        <PerformanceHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/admin"
                    element={
                      <ProtectedRoute>
                        <PerformanceCommandCenter />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/executive"
                    element={
                      <ProtectedRoute>
                        <PerformanceExecutive />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/team"
                    element={
                      <ProtectedRoute>
                        <PerformanceTeam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/give-discount"
                    element={
                      <ProtectedRoute>
                        <GiveDiscount />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/wallets"
                    element={
                      <ProtectedRoute>
                        <PerformanceWallets />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/wallet/policy"
                    element={
                      <ProtectedRoute>
                        <PerformanceWalletPolicy />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/wallet/branch-pool"
                    element={
                      <ProtectedRoute>
                        <PerformanceBranchPool />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/how-it-works"
                    element={
                      <ProtectedRoute>
                        <PerformanceHowItWorks />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/admin/unclassified"
                    element={
                      <ProtectedRoute>
                        <PerformanceUnclassifiedPayments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/admin/approvals"
                    element={
                      <ProtectedRoute>
                        <PerformanceApprovals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/requests"
                    element={
                      <ProtectedRoute>
                        <PerformancePromotionRequests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/library"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/new"
                    element={
                      <ProtectedRoute>
                        <PerformanceOfferWizard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/analytics"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/calendar"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersCalendar />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/segments"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersSegments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/automation"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersAutomation />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/journeys"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersJourneys />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/ab-tests"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersAbTests />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/ai-studio"
                    element={
                      <ProtectedRoute>
                        <PerformanceOfferAiStudio />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersStudio />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/offers-admin" element={<Navigate to="/performance/offers/library" replace />} />
                  <Route
                    path="/incentives"
                    element={
                      <ProtectedRoute>
                        <MyIncentives />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/admin"
                    element={
                      <ProtectedRoute>
                        <IncentivesAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/plans"
                    element={
                      <ProtectedRoute>
                        <IncentivePlans />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/fx-rates"
                    element={
                      <ProtectedRoute>
                        <IncentiveFxRates />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/competitions"
                    element={
                      <ProtectedRoute>
                        <IncentiveCompetitions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/simulator"
                    element={
                      <ProtectedRoute>
                        <IncentiveSimulator />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/payouts"
                    element={
                      <ProtectedRoute>
                        <IncentivePayoutDesk />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/runs/:runId"
                    element={
                      <ProtectedRoute>
                        <IncentiveRunDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/give-discount"
                    element={<Navigate to="/performance/give-discount" replace />}
                  />
                  <Route
                    path="/incentives/wallet-topups"
                    element={
                      <ProtectedRoute>
                        <WalletTopups />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incentives/period-close"
                    element={
                      <ProtectedRoute>
                        <PeriodClose />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/digital-success"
                    element={
                      <ProtectedRoute>
                        <DigitalSuccessHomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/digital-success/ai"
                    element={
                      <ProtectedRoute>
                        <AiStudioPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ai-help"
                    element={
                      <ProtectedRoute>
                        <AiHelpPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/guides"
                    element={
                      <ProtectedRoute>
                        <GuidesIndexPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/guides/:slug"
                    element={
                      <ProtectedRoute>
                        <GuideDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting"
                    element={
                      <AccountingProtectedRoute>
                        <AccountingOverviewPage />
                      </AccountingProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting/no-access"
                    element={
                      <AccountingProtectedRoute>
                        <AccountingNoAccessPage />
                      </AccountingProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting/access"
                    element={
                      <AccountingSectionRoute section="access_admin">
                        <AccountingAccessAdminPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/journals"
                    element={
                      <AccountingSectionRoute section="journals">
                        <AccountingJournalsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/journals/new"
                    element={
                      <AccountingSectionRoute section="journals" level="edit">
                        <AccountingNewJournalPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/journals/:id"
                    element={
                      <AccountingSectionRoute section="journals">
                        <AccountingJournalDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/journals/:id/edit"
                    element={
                      <AccountingSectionRoute section="journals" level="edit">
                        <AccountingNewJournalPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/coa"
                    element={
                      <AccountingSectionRoute section="coa">
                        <AccountingCOAPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/owners"
                    element={
                      <AccountingSectionRoute section="owners">
                        <AccountingOwnersPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/owners/wealth-summary"
                    element={
                      <AccountingSectionRoute section="owners">
                        <AccountingWealthPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/owners/:id"
                    element={
                      <AccountingSectionRoute section="owners">
                        <AccountingOwnerDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ap"
                    element={
                      <AccountingSectionRoute section="ap">
                        <AccountingAPPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ap/new"
                    element={
                      <AccountingSectionRoute section="ap" level="edit">
                        <AccountingNewBillPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ap/:id"
                    element={
                      <AccountingSectionRoute section="ap">
                        <AccountingBillDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ar"
                    element={
                      <AccountingSectionRoute section="ar">
                        <AccountingARPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ar/new"
                    element={
                      <AccountingSectionRoute section="ar" level="edit">
                        <AccountingNewInvoicePage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ar/verification"
                    element={
                      <AccountingSectionRoute section="ar">
                        <AccountingVerificationQueuePage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ar/receipts"
                    element={
                      <AccountingSectionRoute section="ar">
                        <AccountingReceiptsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ar/:id"
                    element={
                      <AccountingSectionRoute section="ar">
                        <AccountingInvoiceDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/vendors"
                    element={
                      <AccountingSectionRoute section="vendors">
                        <AccountingVendorsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/vendors/:id"
                    element={
                      <AccountingSectionRoute section="vendors">
                        <AccountingVendorDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/clients"
                    element={
                      <AccountingSectionRoute section="clients_link">
                        <AccountingClientsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/clients/:id"
                    element={
                      <AccountingSectionRoute section="clients_link">
                        <AccountingClientDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/bank-accounts"
                    element={
                      <AccountingSectionRoute section="bank">
                        <AccountingBankAccountsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/bank-accounts/:id"
                    element={
                      <AccountingSectionRoute section="bank">
                        <AccountingBankAccountDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/documents"
                    element={
                      <AccountingSectionRoute section="documents">
                        <AccountingDocumentsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/documents/upload"
                    element={
                      <AccountingSectionRoute section="documents" level="edit">
                        <AccountingUploadPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/documents/ocr"
                    element={
                      <AccountingSectionRoute section="documents">
                        <AccountingOCRPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/approvals"
                    element={
                      <AccountingSectionRoute section="approvals">
                        <AccountingApprovalsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/approvals/:id"
                    element={
                      <AccountingSectionRoute section="approvals">
                        <AccountingApprovalDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingReportsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/pl"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingPLPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/bs"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingBSPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/cashflow"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingCashFlowPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/consolidated"
                    element={
                      <AccountingSectionRoute section="reports_consolidated">
                        <AccountingConsolidatedPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/trial-balance"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingTrialBalancePage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/reconciliation"
                    element={
                      <AccountingSectionRoute section="reports_reconciliation">
                        <AccountingReportReconciliationPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/general-ledger"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingGeneralLedgerPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reports/general-ledger/:accountId"
                    element={
                      <AccountingSectionRoute section="reports_financials">
                        <AccountingGeneralLedgerPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/tax"
                    element={
                      <AccountingSectionRoute section="tax">
                        <AccountingTaxDashboardPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/tax/calendar"
                    element={
                      <AccountingSectionRoute section="tax">
                        <AccountingTaxCalendarPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/tax/notices"
                    element={
                      <AccountingSectionRoute section="tax">
                        <AccountingNoticesPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/fraud"
                    element={
                      <AccountingSectionRoute section="fraud">
                        <AccountingFraudPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/fraud/flagged"
                    element={
                      <AccountingSectionRoute section="fraud">
                        <AccountingFlaggedPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reconciliation"
                    element={
                      <AccountingSectionRoute section="reports_reconciliation">
                        <AccountingReconciliationPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/wealth"
                    element={
                      <AccountingSectionRoute section="owners">
                        <AccountingWealthPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/ai-assistant"
                    element={
                      <AccountingSectionRoute section="ai">
                        <AccountingAIPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/settings/users"
                    element={
                      <AccountingSectionRoute section="users">
                        <AccountingUsersPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/settings/entities"
                    element={
                      <AccountingSectionRoute section="entities">
                        <AccountingEntitiesPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/petty-cash"
                    element={
                      <AccountingSectionRoute section="petty_cash">
                        <PettyCashProvider>
                          <AccountingPettyCashDashboardPage />
                        </PettyCashProvider>
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/petty-cash/new"
                    element={
                      <AccountingSectionRoute section="petty_cash" level="edit">
                        <PettyCashProvider>
                          <AccountingPettyCashVoucherPage />
                        </PettyCashProvider>
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/petty-cash/audit"
                    element={
                      <AccountingSectionRoute section="petty_cash">
                        <PettyCashProvider>
                          <AccountingPettyCashAuditPage />
                        </PettyCashProvider>
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/petty-cash/replenishment"
                    element={
                      <AccountingSectionRoute section="petty_cash" level="edit">
                        <PettyCashProvider>
                          <AccountingPettyCashReplenishmentPage />
                        </PettyCashProvider>
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/petty-cash/:id"
                    element={
                      <AccountingSectionRoute section="petty_cash">
                        <PettyCashProvider>
                          <AccountingPettyCashDetailPage />
                        </PettyCashProvider>
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/intercompany"
                    element={
                      <AccountingSectionRoute section="intercompany">
                        <AccountingIntercompanyPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/intercompany/new"
                    element={
                      <AccountingSectionRoute section="intercompany" level="edit">
                        <AccountingIntercompanyNewPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/intercompany/:id"
                    element={
                      <AccountingSectionRoute section="intercompany">
                        <AccountingIntercompanyDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reimbursements"
                    element={
                      <AccountingSectionRoute section="reimbursements">
                        <AccountingReimbursementsPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reimbursements/new"
                    element={
                      <AccountingSectionRoute section="reimbursements" level="edit">
                        <AccountingReimbursementNewPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/reimbursements/:id"
                    element={
                      <AccountingSectionRoute section="reimbursements">
                        <AccountingReimbursementDetailPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/card-reconciliation"
                    element={
                      <AccountingSectionRoute section="card_recon">
                        <AccountingCardReconciliationPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/accounting/card-reconciliation/new"
                    element={
                      <AccountingSectionRoute section="card_recon" level="edit">
                        <AccountingCardReconciliationNewPage />
                      </AccountingSectionRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/team-access"
                    element={
                      <ProtectedRoute>
                        <TeamAccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/masters"
                    element={
                      <ProtectedRoute>
                        <Masters />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/verification"
                    element={
                      <ProtectedRoute>
                        <Verification />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms-library"
                    element={
                      <ProtectedRoute>
                        <FormsLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms-library/:formId/build"
                    element={
                      <ProtectedRoute>
                        <FormBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/questionnaire-emails"
                    element={
                      <ProtectedRoute>
                        <QuestionnaireEmailTemplates />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/telephony"
                    element={
                      <ProtectedRoute>
                        <TelephonySettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/telephony-integration"
                    element={
                      <ProtectedRoute>
                        <TelephonyIntegrationSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/email-smtp"
                    element={
                      <ProtectedRoute>
                        <EmailSmtpSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/email-logs"
                    element={
                      <ProtectedRoute>
                        <EmailLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationPreferences />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationMonitoring />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <CalendarDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/settings"
                    element={
                      <ProtectedRoute>
                        <CalendarSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/appointments/:id"
                    element={
                      <ProtectedRoute>
                        <AppointmentDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/meeting-types"
                    element={
                      <ProtectedRoute>
                        <MeetingTypesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/approvals"
                    element={
                      <ProtectedRoute>
                        <AppointmentApprovalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/analytics"
                    element={
                      <ProtectedRoute>
                        <AnalyticsDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/reports"
                    element={
                      <ProtectedRoute>
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/activity"
                    element={
                      <ProtectedRoute>
                        <ActivityFeedPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar/branding"
                    element={
                      <ProtectedRoute>
                        <CompanyBrandingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CallProvider>
            </BrowserPhoneProvider>
            </PerformancePeriodProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

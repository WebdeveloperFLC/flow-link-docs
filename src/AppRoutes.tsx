import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
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
const ServiceLibrary = lazy(() => import("./pages/ServiceLibrary"));
const ServiceLibraryAdmin = lazy(() => import("./pages/ServiceLibraryAdmin"));
const ProfilePreviewDevPage = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/ProfilePreviewDevPage"))
  : () => null;
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
import InstitutionsListPage from "./institutions/pages/InstitutionsListPage";
import InstitutionDetailPage from "./institutions/pages/InstitutionDetailPage";
import AggregatorWorkbenchPage from "./institutions/pages/AggregatorWorkbenchPage";
import CourseReviewPage from "./institutions/pages/CourseReviewPage";
import AiSuggestionsPage from "./institutions/pages/AiSuggestionsPage";
import CfUpiLinkagePage from "./institutions/pages/CfUpiLinkagePage";
import { InstitutionsProtectedRoute } from "./institutions/components/InstitutionsProtectedRoute";
import { CommissionsProtectedRoute } from "./institutions/components/CommissionsProtectedRoute";
import {
  KcLegacyAdminArticleRedirect,
  KcLegacyArticleSlugRedirect,
  KcLegacyCountryRedirect,
  KcLegacyQuizSlugRedirect,
  KcLegacyServiceRedirect,
} from "./lib/knowledgeCentreLegacyRedirects";
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
import PerformanceFinance from "@/pages/PerformanceFinance";
import PerformanceRevenueAnalytics from "@/pages/PerformanceRevenueAnalytics";
import PerformanceComparison from "@/pages/PerformanceComparison";
import PerformanceClientCommercials from "@/pages/PerformanceClientCommercials";
import PerformanceCombinations from "@/pages/PerformanceCombinations";
import PerformanceProfitability from "@/pages/PerformanceProfitability";
import PerformanceCrmIntegration from "@/pages/PerformanceCrmIntegration";
import PerformanceIncentivePlans from "@/pages/PerformanceIncentivePlans";
import PerformanceIncentiveLedger from "@/pages/PerformanceIncentiveLedger";
import PerformanceCommissions from "@/pages/PerformanceCommissions";
import PerformanceMultiCurrency from "@/pages/PerformanceMultiCurrency";
import PerformanceTeam from "@/pages/PerformanceTeam";
import PerformanceWalletPolicy from "@/pages/PerformanceWalletPolicy";
import PerformanceWallets from "@/pages/PerformanceWallets";
import PerformanceBranchPool from "@/pages/PerformanceBranchPool";
import PerformanceHowItWorks from "@/pages/PerformanceHowItWorks";
import PerformanceUnclassifiedPayments from "@/pages/PerformanceUnclassifiedPayments";
import PerformanceApprovals from "@/pages/PerformanceApprovals";
import PerformanceApprovalsCms from "@/pages/PerformanceApprovalsCms";
import PerformanceAuditTrail from "@/pages/PerformanceAuditTrail";
import PerformanceReportBuilder from "@/pages/PerformanceReportBuilder";
import PerformanceRolesPermissions from "@/pages/PerformanceRolesPermissions";
import PerformanceConfiguration from "@/pages/PerformanceConfiguration";
import PerformanceArchitecture from "@/pages/PerformanceArchitecture";
import PerformancePromotionRequests from "@/pages/PerformancePromotionRequests";
import PerformanceOffersStudio from "@/pages/PerformanceOffersStudio";
import PerformanceOffersLibrary from "@/pages/PerformanceOffersLibrary";
import PerformanceOffersCodes from "@/pages/PerformanceOffersCodes";
import PerformanceOffersEligibility from "@/pages/PerformanceOffersEligibility";
import PerformanceOfferWizard from "@/pages/PerformanceOfferWizard";
import PerformanceOffersAnalytics from "@/pages/PerformanceOffersAnalytics";
import PerformanceOfferAiStudio from "@/pages/PerformanceOfferAiStudio";
import PerformanceOffersCalendar from "@/pages/PerformanceOffersCalendar";
import PerformanceOffersSegments from "@/pages/PerformanceOffersSegments";
import PerformanceOffersAutomation from "@/pages/PerformanceOffersAutomation";
import PerformanceOffersJourneys from "@/pages/PerformanceOffersJourneys";
import PerformanceOffersAbTests from "@/pages/PerformanceOffersAbTests";
const AiHelpPage = lazy(() => import("./ai-help/pages/AiHelpPage"));
const GuidesIndexPage = lazy(() => import("./guides/pages/GuidesIndexPage"));
const GuideDetailPage = lazy(() => import("./guides/pages/GuideDetailPage"));
const AccountingRoutes = lazy(() => import("./accounting/AccountingRoutes"));
const HrPayrollRoutes = lazy(() => import("@/hr-payroll/HrPayrollRoutes"));
import AiStudioPage from "./digital-success/ai/AiStudioPage";
import { BootstrapLoading } from "@/components/BootstrapLoading";

const RouteFallback = () => <BootstrapLoading message="Loading…" />;

export default function AppRoutes() {
  return (
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
                  {import.meta.env.DEV && (
                    <Route
                      path="/dev/profile-preview"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <ProfilePreviewDevPage />
                        </Suspense>
                      }
                    />
                  )}
                  <Route path="/service-library/articles" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/articles/*" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/faqs" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/quiz" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/quiz/*" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/downloads" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/official-sources" element={<Navigate to="/service-library" replace />} />
                  <Route path="/service-library/search" element={<Navigate to="/service-library" replace />} />
                  <Route
                    path="/service-library"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <ServiceLibraryProtectedRoute>
                          <ServiceLibrary />
                        </ServiceLibraryProtectedRoute>
                      </Suspense>
                    }
                  />
                  <Route
                    path="/service-library-admin/knowledge-centre"
                    element={<Navigate to="/service-library-admin" replace />}
                  />
                  <Route
                    path="/service-library-admin/knowledge-centre/*"
                    element={<Navigate to="/service-library-admin" replace />}
                  />
                  <Route
                    path="/service-library-admin"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <ServiceLibraryProtectedRoute requireManage>
                          <ServiceLibraryAdmin />
                        </ServiceLibraryProtectedRoute>
                      </Suspense>
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
                    path="/institutions/linkage"
                    element={
                      <InstitutionsProtectedRoute requireEdit>
                        <CfUpiLinkagePage />
                      </InstitutionsProtectedRoute>
                    }
                  />
                  <Route
                    path="/institutions/aggregators/:aggregatorId/workbench"
                    element={
                      <CommissionsProtectedRoute>
                        <AggregatorWorkbenchPage />
                      </CommissionsProtectedRoute>
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
                  <Route path="/knowledge-centre/countries/:code" element={<KcLegacyCountryRedirect />} />
                  <Route path="/knowledge-centre/services/:libraryId" element={<KcLegacyServiceRedirect />} />
                  <Route path="/knowledge-centre/articles/:slug" element={<KcLegacyArticleSlugRedirect />} />
                  <Route path="/knowledge-centre/quiz/:slug" element={<KcLegacyQuizSlugRedirect />} />
                  <Route path="/knowledge-centre/admin/articles/:id" element={<KcLegacyAdminArticleRedirect />} />
                  <Route path="/knowledge-centre" element={<Navigate to="/service-library" replace />} />
                  <Route path="/knowledge-centre/*" element={<Navigate to="/service-library" replace />} />
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
                        <Suspense fallback={<RouteFallback />}>
                          <HrPayrollRoutes />
                        </Suspense>
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
                    path="/performance/finance"
                    element={
                      <ProtectedRoute>
                        <PerformanceFinance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/architecture"
                    element={
                      <ProtectedRoute>
                        <PerformanceArchitecture />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/configuration"
                    element={
                      <ProtectedRoute>
                        <PerformanceConfiguration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/roles"
                    element={
                      <ProtectedRoute>
                        <PerformanceRolesPermissions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/reports"
                    element={
                      <ProtectedRoute>
                        <PerformanceReportBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/analytics"
                    element={
                      <ProtectedRoute>
                        <PerformanceRevenueAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/compare"
                    element={
                      <ProtectedRoute>
                        <PerformanceComparison />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/client-commercials"
                    element={
                      <ProtectedRoute>
                        <PerformanceClientCommercials />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/combinations"
                    element={
                      <ProtectedRoute>
                        <PerformanceCombinations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/profitability"
                    element={
                      <ProtectedRoute>
                        <PerformanceProfitability />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/crm-integration"
                    element={
                      <ProtectedRoute>
                        <PerformanceCrmIntegration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/incentives/plans"
                    element={
                      <ProtectedRoute>
                        <PerformanceIncentivePlans />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/incentives/payouts"
                    element={
                      <ProtectedRoute>
                        <PerformanceIncentiveLedger />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/commissions"
                    element={
                      <ProtectedRoute>
                        <PerformanceCommissions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/multi-currency"
                    element={
                      <ProtectedRoute>
                        <PerformanceMultiCurrency />
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
                    path="/performance/audit-trail"
                    element={
                      <ProtectedRoute>
                        <PerformanceAuditTrail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/approvals"
                    element={
                      <ProtectedRoute>
                        <PerformanceApprovalsCms />
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
                    path="/performance/offers/codes"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersCodes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/performance/offers/eligibility"
                    element={
                      <ProtectedRoute>
                        <PerformanceOffersEligibility />
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
                        <Suspense fallback={<RouteFallback />}>
                          <AiHelpPage />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/guides"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<RouteFallback />}>
                          <GuidesIndexPage />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/guides/:slug"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<RouteFallback />}>
                          <GuideDetailPage />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounting/*"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <AccountingRoutes />
                      </Suspense>
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
  );
}

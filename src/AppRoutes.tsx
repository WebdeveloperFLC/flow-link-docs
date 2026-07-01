import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { PerformancePeriodProvider } from "@/contexts/PerformancePeriodContext";
import { CallProvider } from "@/contexts/CallContext";
import { BrowserPhoneProvider } from "@/contexts/BrowserPhoneContext";
import { PostCallNotesDialog } from "@/components/telephony/PostCallNotesDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientNew = lazy(() => import("./pages/clients/ClientNew"));
const LeadsList = lazy(() => import("./pages/leads/LeadsList"));
const ColdPool = lazy(() => import("./pages/leads/ColdPool"));
const LeadNew = lazy(() => import("./pages/leads/LeadNew"));
const LeadDetail = lazy(() => import("./pages/leads/LeadDetail"));
const LetterTemplates = lazy(() => import("./pages/LetterTemplates"));
const Activity = lazy(() => import("./pages/Activity"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const TeamAccess = lazy(() => import("./pages/TeamAccess"));
const Masters = lazy(() => import("./pages/Masters"));
const Verification = lazy(() => import("./pages/Verification"));
const FormsLibrary = lazy(() => import("./pages/FormsLibrary"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const QuestionnaireEmailTemplates = lazy(() => import("./pages/QuestionnaireEmailTemplates"));
const TelephonySettings = lazy(() => import("./pages/TelephonySettings"));
const TelephonyIntegrationSettings = lazy(() => import("./pages/TelephonyIntegrationSettings"));
const EmailSmtpSettings = lazy(() => import("./pages/EmailSmtpSettings"));
const EmailLogs = lazy(() => import("./pages/EmailLogs"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const NotificationMonitoring = lazy(() => import("./pages/admin/NotificationMonitoring"));
const SharedView = lazy(() => import("./pages/SharedView"));
const Questionnaire = lazy(() => import("./pages/Questionnaire"));
const CourseFinder = lazy(() => import("./pages/CourseFinder"));
const Messages = lazy(() => import("./pages/Messages"));
const WhatsAppInbox = lazy(() => import("./pages/WhatsAppInbox"));
const ServiceLibrary = lazy(() => import("./pages/ServiceLibrary"));
const ServiceLibraryAdmin = lazy(() => import("./pages/ServiceLibraryAdmin"));
const ProfilePreviewDevPage = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/ProfilePreviewDevPage"))
  : () => null;
import { ServiceLibraryProtectedRoute } from "@/components/service-library/ServiceLibraryProtectedRoute";
const Telecaller = lazy(() => import("./pages/Telecaller"));
const Reports = lazy(() => import("./pages/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CalendarDashboard = lazy(() => import("./calendar/pages/CalendarDashboard"));
const CalendarSettings = lazy(() => import("./calendar/pages/CalendarSettings"));
const AppointmentDetailPage = lazy(() => import("./calendar/pages/AppointmentDetailPage"));
const MeetingTypesPage = lazy(() => import("./calendar/pages/MeetingTypesPage"));
const AppointmentApprovalsPage = lazy(() => import("./calendar/pages/AppointmentApprovalsPage"));
const AnalyticsDashboardPage = lazy(() => import("./calendar/pages/AnalyticsDashboardPage"));
const ReportsPage = lazy(() => import("./calendar/pages/ReportsPage"));
const ActivityFeedPage = lazy(() => import("./calendar/pages/ActivityFeedPage"));
const CompanyBrandingPage = lazy(() => import("./calendar/pages/CompanyBrandingPage"));
const PublicBookingPage = lazy(() => import("./calendar/pages/PublicBookingPage"));
const VisitorActionPage = lazy(() => import("./calendar/pages/VisitorActionPage"));
const DigitalSuccessHomePage = lazy(() => import("./digital-success/pages/DigitalSuccessHomePage"));
import { PortalProtectedRoute } from "@/components/portal/PortalProtectedRoute";
const PortalAuth = lazy(() => import("./pages/portal/PortalAuth"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalApplication = lazy(() => import("./pages/portal/PortalApplication"));
const PortalFiles = lazy(() => import("./pages/portal/PortalFiles"));
const PortalChat = lazy(() => import("./pages/portal/PortalChat"));
const PortalOffers = lazy(() => import("./pages/portal/PortalOffers"));
const PortalRefer = lazy(() => import("./pages/portal/PortalRefer"));
const PortalPayments = lazy(() => import("./pages/portal/PortalPayments"));
const PortalAppointments = lazy(() => import("./pages/portal/PortalAppointments"));
const PortalNotifications = lazy(() => import("./pages/portal/PortalNotifications"));
const PortalSettings = lazy(() => import("./pages/portal/PortalSettings"));
const PortalInviteRedeem = lazy(() => import("./pages/portal/PortalInviteRedeem"));
const OffersAnalytics = lazy(() => import("./pages/OffersAnalytics"));
const AssessmentLanding = lazy(() => import("./pages/assessment/AssessmentLanding"));
const AssessmentInvite = lazy(() => import("./pages/assessment/AssessmentInvite"));
const AssessmentVerify = lazy(() => import("./pages/assessment/AssessmentVerify"));
const AssessmentRun = lazy(() => import("./pages/assessment/AssessmentRun"));
const ServiceEligibilityRun = lazy(() => import("./pages/eligibility/ServiceEligibilityRun"));
const EligibilityCheckPublic = lazy(() => import("./pages/eligibility/EligibilityCheckPublic"));
const AssessmentGoal = lazy(() => import("./pages/assessment/AssessmentGoal"));
const AssessmentCountry = lazy(() => import("./pages/assessment/AssessmentCountry"));
const PortalAssessment = lazy(() => import("./pages/portal/PortalAssessment"));
const AssessmentAdmin = lazy(() => import("./pages/admin/AssessmentAdmin"));
const NocAdmin = lazy(() => import("./pages/admin/NocAdmin"));
const GermanyRulesAdmin = lazy(() => import("./pages/admin/GermanyRulesAdmin"));
const InstitutionsListPage = lazy(() => import("./institutions/pages/InstitutionsListPage"));
const InstitutionDetailPage = lazy(() => import("./institutions/pages/InstitutionDetailPage"));
const AggregatorWorkbenchPage = lazy(() => import("./institutions/pages/AggregatorWorkbenchPage"));
const CourseReviewPage = lazy(() => import("./institutions/pages/CourseReviewPage"));
const AiSuggestionsPage = lazy(() => import("./institutions/pages/AiSuggestionsPage"));
const CfUpiLinkagePage = lazy(() => import("./institutions/pages/CfUpiLinkagePage"));
import { InstitutionsProtectedRoute } from "./institutions/components/InstitutionsProtectedRoute";
import { CommissionsProtectedRoute } from "./institutions/components/CommissionsProtectedRoute";
import {
  KcLegacyAdminArticleRedirect,
  KcLegacyArticleSlugRedirect,
  KcLegacyCountryRedirect,
  KcLegacyQuizSlugRedirect,
  KcLegacyServiceRedirect,
} from "./lib/knowledgeCentreLegacyRedirects";
const CommissionsPage = lazy(() => import("./pages/CommissionsPage"));
const MyIncentives = lazy(() => import("@/pages/MyIncentives"));
const IncentivesAdmin = lazy(() => import("@/pages/IncentivesAdmin"));
const GiveDiscount = lazy(() => import("@/pages/GiveDiscount"));
const WalletTopups = lazy(() => import("@/pages/WalletTopups"));
const PeriodClose = lazy(() => import("@/pages/PeriodClose"));
const IncentivePlans = lazy(() => import("@/pages/IncentivePlans"));
const IncentiveFxRates = lazy(() => import("@/pages/IncentiveFxRates"));
const IncentivePayoutDesk = lazy(() => import("@/pages/IncentivePayoutDesk"));
const IncentiveRunDetail = lazy(() => import("@/pages/IncentiveRunDetail"));
const IncentiveCompetitions = lazy(() => import("@/pages/IncentiveCompetitions"));
const IncentiveSimulator = lazy(() => import("@/pages/IncentiveSimulator"));
const PerformanceHome = lazy(() => import("@/pages/PerformanceHome"));
const PerformanceCommandCenter = lazy(() => import("@/pages/PerformanceCommandCenter"));
const PerformanceExecutive = lazy(() => import("@/pages/PerformanceExecutive"));
const PerformanceFinance = lazy(() => import("@/pages/PerformanceFinance"));
const PerformanceRevenueAnalytics = lazy(() => import("@/pages/PerformanceRevenueAnalytics"));
const PerformanceComparison = lazy(() => import("@/pages/PerformanceComparison"));
const PerformanceClientCommercials = lazy(() => import("@/pages/PerformanceClientCommercials"));
const PerformanceCombinations = lazy(() => import("@/pages/PerformanceCombinations"));
const PerformanceProfitability = lazy(() => import("@/pages/PerformanceProfitability"));
const PerformanceCrmIntegration = lazy(() => import("@/pages/PerformanceCrmIntegration"));
const PerformanceIncentivePlans = lazy(() => import("@/pages/PerformanceIncentivePlans"));
const PerformanceIncentiveLedger = lazy(() => import("@/pages/PerformanceIncentiveLedger"));
const PerformanceCommissions = lazy(() => import("@/pages/PerformanceCommissions"));
const PerformanceMultiCurrency = lazy(() => import("@/pages/PerformanceMultiCurrency"));
const PerformanceTeam = lazy(() => import("@/pages/PerformanceTeam"));
const PerformanceWalletPolicy = lazy(() => import("@/pages/PerformanceWalletPolicy"));
const PerformanceWallets = lazy(() => import("@/pages/PerformanceWallets"));
const PerformanceBranchPool = lazy(() => import("@/pages/PerformanceBranchPool"));
const PerformanceHowItWorks = lazy(() => import("@/pages/PerformanceHowItWorks"));
const PerformanceUnclassifiedPayments = lazy(() => import("@/pages/PerformanceUnclassifiedPayments"));
const PerformanceApprovals = lazy(() => import("@/pages/PerformanceApprovals"));
const PerformanceApprovalsCms = lazy(() => import("@/pages/PerformanceApprovalsCms"));
const PerformanceAuditTrail = lazy(() => import("@/pages/PerformanceAuditTrail"));
const PerformanceReportBuilder = lazy(() => import("@/pages/PerformanceReportBuilder"));
const PerformanceRolesPermissions = lazy(() => import("@/pages/PerformanceRolesPermissions"));
const PerformanceConfiguration = lazy(() => import("@/pages/PerformanceConfiguration"));
const PerformanceArchitecture = lazy(() => import("@/pages/PerformanceArchitecture"));
const PerformancePromotionRequests = lazy(() => import("@/pages/PerformancePromotionRequests"));
const PerformanceOffersStudio = lazy(() => import("@/pages/PerformanceOffersStudio"));
const PerformanceOffersLibrary = lazy(() => import("@/pages/PerformanceOffersLibrary"));
const PerformanceOffersCodes = lazy(() => import("@/pages/PerformanceOffersCodes"));
const PerformanceOffersEligibility = lazy(() => import("@/pages/PerformanceOffersEligibility"));
const PerformanceOfferWizard = lazy(() => import("@/pages/PerformanceOfferWizard"));
const PerformanceOffersAnalytics = lazy(() => import("@/pages/PerformanceOffersAnalytics"));
const PerformanceOfferAiStudio = lazy(() => import("@/pages/PerformanceOfferAiStudio"));
const PerformanceOffersCalendar = lazy(() => import("@/pages/PerformanceOffersCalendar"));
const PerformanceOffersSegments = lazy(() => import("@/pages/PerformanceOffersSegments"));
const PerformanceOffersAutomation = lazy(() => import("@/pages/PerformanceOffersAutomation"));
const PerformanceOffersJourneys = lazy(() => import("@/pages/PerformanceOffersJourneys"));
const PerformanceOffersAbTests = lazy(() => import("@/pages/PerformanceOffersAbTests"));
const AiHelpPage = lazy(() => import("./ai-help/pages/AiHelpPage"));
const GuidesIndexPage = lazy(() => import("./guides/pages/GuidesIndexPage"));
const GuideDetailPage = lazy(() => import("./guides/pages/GuideDetailPage"));
const AccountingRoutes = lazy(() => import("./accounting/AccountingRoutes"));
const HrPayrollRoutes = lazy(() => import("@/hr-payroll/HrPayrollRoutes"));
const AiStudioPage = lazy(() => import("./digital-success/ai/AiStudioPage"));
import { ShellProviders } from "@/ShellProviders";
import { BootstrapLoading } from "@/components/BootstrapLoading";

const RouteFallback = () => <BootstrapLoading message="Loading…" />;

export default function AppRoutes() {
  return (
    <ShellProviders>
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
    </ShellProviders>
  );
}

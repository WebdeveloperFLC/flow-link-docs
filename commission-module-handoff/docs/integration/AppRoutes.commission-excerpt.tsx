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

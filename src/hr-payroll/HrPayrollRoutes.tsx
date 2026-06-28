import { Navigate, Route, Routes } from "react-router-dom";
import { HrPayrollLayout } from "./components/HrPayrollLayout";
import { HrPayrollProvider } from "./context/HrPayrollProvider";
import HrDashboardPage from "./pages/HrDashboardPage";
import HrEssPage from "./pages/HrEssPage";
import HrEmp360ListPage from "./pages/HrEmp360ListPage";
import HrEmp360Layout from "./pages/emp360/HrEmp360Layout";
import HrEmp360SummaryPage from "./pages/emp360/HrEmp360SummaryPage";
import HrEmp360AttendancePage from "./pages/emp360/HrEmp360AttendancePage";
import HrEmp360LeaveHistoryPage from "./pages/emp360/HrEmp360LeaveHistoryPage";
import HrEmp360PayrollHistoryPage from "./pages/emp360/HrEmp360PayrollHistoryPage";
import HrEmp360TrainingPage from "./pages/emp360/HrEmp360TrainingPage";
import HrEmp360DocumentsPage from "./pages/emp360/HrEmp360DocumentsPage";
import HrEmp360PolicyBundlePage from "./pages/emp360/HrEmp360PolicyBundlePage";
import HrEmployeesPage from "./pages/HrEmployeesPage";
import HrShiftsPage from "./pages/HrShiftsPage";
import HrTrainingPage from "./pages/HrTrainingPage";
import HrCalculatorPage from "./pages/HrCalculatorPage";
import HrPayrollValidationPage from "./pages/HrPayrollValidationPage";
import HrVerifyPage from "./pages/HrVerifyPage";
import HrAttendancePage from "./pages/HrAttendancePage";
import {
  AttendanceModuleLayout,
  AttendanceIndexRedirect,
} from "./components/attendance/AttendanceModuleLayout";
import HrLeavePage from "./pages/HrLeavePage";
import HrCompoffPage from "./pages/HrCompoffPage";
import HrLatePage from "./pages/HrLatePage";
import HrMispunchPage from "./pages/HrMispunchPage";
import HrHolidaysPage from "./pages/HrHolidaysPage";
import HrDocumentTypesPage from "./pages/HrDocumentTypesPage";
import HrConfigPage from "./pages/HrConfigPage";
import HrConfigHubPage from "./pages/HrConfigHubPage";
import HrConfigPolicyRoute from "./pages/HrConfigPolicyRoute";
import HrRolesPage from "./pages/HrRolesPage";
import HrAuditPage from "./pages/HrAuditPage";
import HrImportPage from "./pages/HrImportPage";
import HrApprovalsPage from "./pages/HrApprovalsPage";
import HrReportsHubPage, { HrReportPage } from "./pages/HrReportsPage";
import HrDocumentsPage from "./pages/HrDocumentsPage";
import HrSalaryRegisterPage from "./pages/HrSalaryRegisterPage";
import HrPayrollHistoryPage from "./pages/HrPayrollHistoryPage";
import HrEmployeeCategoriesPage from "./pages/HrEmployeeCategoriesPage";
import HrCrmMasterLinkPage from "./pages/HrCrmMasterLinkPage";
import HrAdminHubPage from "./pages/admin/HrAdminHubPage";
import HrMasterDataHubPage from "./pages/admin/HrMasterDataHubPage";
import HrMasterDataDomainPage from "./pages/admin/HrMasterDataDomainPage";
import HrCompaniesAdminPage from "./pages/admin/HrCompaniesAdminPage";
import HrAdminCrmMasterPage from "./pages/admin/HrAdminCrmMasterPage";
import WpmsHubPage from "./pages/wpms/WpmsHubPage";
import WpmsPoliciesPage from "./pages/wpms/WpmsPoliciesPage";
import WpmsBundlesPage from "./pages/wpms/WpmsBundlesPage";
import WpmsAssignPage from "./pages/wpms/WpmsAssignPage";
import WtmEssHistoryPage from "./pages/wtm/WtmEssHistoryPage";
import AemsEssExceptionsPage, { AemsHrReviewPage } from "./pages/aems/AemsExceptionsPage";
import AemsIncidentRegisterPage from "./pages/aems/AemsIncidentRegisterPage";

export default function HrPayrollRoutes() {
  return (
    <HrPayrollProvider>
      <Routes>
        <Route element={<HrPayrollLayout />}>
          <Route index element={<HrDashboardPage />} />
          <Route path="me" element={<HrEssPage />} />
          <Route path="me/time-history" element={<WtmEssHistoryPage />} />
          <Route path="me/exceptions" element={<AemsEssExceptionsPage />} />
          <Route path="employee" element={<HrEmp360ListPage />} />
          <Route path="employee/:id" element={<HrEmp360Layout />}>
            <Route index element={<HrEmp360SummaryPage />} />
            <Route path="attendance" element={<HrEmp360AttendancePage />} />
            <Route path="leaves" element={<HrEmp360LeaveHistoryPage />} />
            <Route path="payroll" element={<HrEmp360PayrollHistoryPage />} />
            <Route path="training" element={<HrEmp360TrainingPage />} />
            <Route path="documents" element={<HrEmp360DocumentsPage />} />
            <Route path="policy-bundle" element={<HrEmp360PolicyBundlePage />} />
          </Route>

          {/* People */}
          <Route path="employees" element={<HrEmployeesPage />} />
          <Route path="documents" element={<HrDocumentsPage />} />
          <Route path="training" element={<HrTrainingPage />} />

          {/* Workforce — attendance module with tabs */}
          <Route path="attendance" element={<AttendanceModuleLayout />}>
            <Route index element={<AttendanceIndexRedirect />} />
            <Route path="records" element={<HrAttendancePage />} />
            <Route path="exceptions" element={<AemsHrReviewPage />} />
            <Route path="compoff" element={<HrCompoffPage />} />
            <Route path="late" element={<HrLatePage />} />
            <Route path="mispunch" element={<HrMispunchPage />} />
          </Route>
          <Route path="compoff" element={<Navigate to="/hr/attendance/compoff" replace />} />
          <Route path="late" element={<Navigate to="/hr/attendance/late" replace />} />
          <Route path="mispunch" element={<Navigate to="/hr/attendance/mispunch" replace />} />
          <Route path="leave" element={<HrLeavePage />} />
          <Route path="holidays" element={<HrHolidaysPage />} />

          {/* Payroll */}
          <Route path="payroll/cycle" element={<Navigate to="/hr/config/payroll-cycle" replace />} />
          <Route path="payroll/process" element={<HrCalculatorPage />} />
          <Route path="payroll/validation" element={<HrPayrollValidationPage />} />
          <Route path="payroll/register" element={<HrSalaryRegisterPage />} />
          <Route path="payroll/history" element={<HrPayrollHistoryPage />} />
          <Route path="payroll/verify/:cycleId?" element={<HrVerifyPage />} />
          <Route path="payroll/:cycleId?" element={<HrVerifyPage />} />

          {/* Approvals */}
          <Route path="approvals" element={<Navigate to="/hr/approvals/leave" replace />} />
          <Route path="approvals/:type" element={<HrApprovalsPage />} />

          {/* Reports */}
          <Route path="reports" element={<HrReportsHubPage />} />
          <Route path="reports/:reportId" element={<HrReportPage />} />

          {/* Configuration hub + sections */}
          <Route path="config" element={<HrConfigHubPage />} />
          <Route path="config/shifts" element={<HrShiftsPage />} />
          <Route path="config/holidays" element={<HrHolidaysPage masterMode />} />
          <Route path="config/document-types" element={<HrDocumentTypesPage />} />
          <Route path="config/categories" element={<HrEmployeeCategoriesPage />} />
          <Route path="config/branches" element={<Navigate to="/hr/admin/master-data/crm/__branches" replace />} />
          <Route path="config/departments" element={<Navigate to="/hr/admin/master-data/crm/__departments" replace />} />
          <Route path="config/designations" element={<Navigate to="/hr/admin/master-data/crm/__designations" replace />} />
          <Route path="config/roles" element={<HrRolesPage />} />
          <Route path="config/audit" element={<HrAuditPage />} />
          <Route path="config/:slug" element={<HrConfigPolicyRoute />} />

          {/* Legacy redirects */}
          <Route path="shifts" element={<Navigate to="/hr/config/shifts" replace />} />
          <Route path="calculator" element={<Navigate to="/hr/payroll/process" replace />} />
          <Route path="document-types" element={<Navigate to="/hr/config/document-types" replace />} />
          <Route path="roles" element={<Navigate to="/hr/config/roles" replace />} />
          <Route path="audit" element={<Navigate to="/hr/config/audit" replace />} />

          <Route path="import" element={<HrImportPage />} />

          {/* Administration — Master Data + WPMS */}
          <Route path="admin" element={<HrAdminHubPage />} />
          <Route path="admin/master-data" element={<HrMasterDataHubPage />} />
          <Route path="admin/master-data/companies" element={<HrCompaniesAdminPage />} />
          <Route path="admin/master-data/crm/:section" element={<HrAdminCrmMasterPage />} />
          <Route path="admin/master-data/:domain" element={<HrMasterDataDomainPage />} />
          <Route path="admin/wpms" element={<WpmsHubPage />} />
          <Route path="admin/wpms/policies" element={<WpmsPoliciesPage />} />
          <Route path="admin/wpms/bundles" element={<WpmsBundlesPage />} />
          <Route path="admin/wpms/assign" element={<WpmsAssignPage />} />
          <Route path="admin/incidents" element={<AemsIncidentRegisterPage />} />

          <Route path="*" element={<Navigate to="/hr" replace />} />
        </Route>
      </Routes>
    </HrPayrollProvider>
  );
}

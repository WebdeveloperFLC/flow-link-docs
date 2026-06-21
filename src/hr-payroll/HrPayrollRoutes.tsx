import { Navigate, Route, Routes } from "react-router-dom";
import { HrPayrollLayout } from "./components/HrPayrollLayout";
import { HrPayrollProvider } from "./context/HrPayrollProvider";
import HrDashboardPage from "./pages/HrDashboardPage";
import HrEssPage from "./pages/HrEssPage";
import HrEmp360ListPage from "./pages/HrEmp360ListPage";
import HrEmp360DetailPage from "./pages/HrEmp360DetailPage";
import HrEmployeesPage from "./pages/HrEmployeesPage";
import HrShiftsPage from "./pages/HrShiftsPage";
import HrTrainingPage from "./pages/HrTrainingPage";
import HrCalculatorPage from "./pages/HrCalculatorPage";
import HrVerifyPage from "./pages/HrVerifyPage";
import HrAttendancePage from "./pages/HrAttendancePage";
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

export default function HrPayrollRoutes() {
  return (
    <HrPayrollProvider>
      <Routes>
        <Route element={<HrPayrollLayout />}>
          <Route index element={<HrDashboardPage />} />
          <Route path="me" element={<HrEssPage />} />
          <Route path="employee" element={<HrEmp360ListPage />} />
          <Route path="employee/:id" element={<HrEmp360DetailPage />} />

          {/* People */}
          <Route path="employees" element={<HrEmployeesPage />} />
          <Route path="documents" element={<HrDocumentsPage />} />
          <Route path="training" element={<HrTrainingPage />} />

          {/* Attendance & Leave */}
          <Route path="attendance" element={<HrAttendancePage />} />
          <Route path="leave" element={<HrLeavePage />} />
          <Route path="compoff" element={<HrCompoffPage />} />
          <Route path="late" element={<HrLatePage />} />
          <Route path="mispunch" element={<HrMispunchPage />} />
          <Route path="holidays" element={<HrHolidaysPage />} />

          {/* Payroll */}
          <Route path="payroll/cycle" element={<Navigate to="/hr/config/payroll-cycle" replace />} />
          <Route path="payroll/process" element={<HrCalculatorPage />} />
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
          <Route path="config/branches" element={<HrCrmMasterLinkPage kind="branches" />} />
          <Route path="config/departments" element={<HrCrmMasterLinkPage kind="departments" />} />
          <Route path="config/designations" element={<HrCrmMasterLinkPage kind="designations" />} />
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
          <Route path="*" element={<Navigate to="/hr" replace />} />
        </Route>
      </Routes>
    </HrPayrollProvider>
  );
}

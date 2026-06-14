import { Navigate, Route, Routes } from "react-router-dom";
import { HrPayrollLayout } from "./components/HrPayrollLayout";
import { HrPayrollProvider } from "./context/HrPayrollProvider";
import HrDashboardPage from "./pages/HrDashboardPage";
import HrEssPage from "./pages/HrEssPage";
import HrEmp360Page from "./pages/HrEmp360Page";
import HrEmp360Redirect from "./pages/HrEmp360Redirect";
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
import HrConfigPage from "./pages/HrConfigPage";
import HrRolesPage from "./pages/HrRolesPage";
import HrAuditPage from "./pages/HrAuditPage";
import HrImportPage from "./pages/HrImportPage";

export default function HrPayrollRoutes() {
  return (
    <HrPayrollProvider>
      <Routes>
        <Route element={<HrPayrollLayout />}>
        <Route index element={<HrDashboardPage />} />
        <Route path="me" element={<HrEssPage />} />
        <Route path="employee" element={<HrEmp360Redirect />} />
        <Route path="employee/:id" element={<HrEmp360Page />} />
        <Route path="employees" element={<HrEmployeesPage />} />
        <Route path="shifts" element={<HrShiftsPage />} />
        <Route path="training" element={<HrTrainingPage />} />
        <Route path="calculator" element={<HrCalculatorPage />} />
        <Route path="payroll/:cycleId?" element={<HrVerifyPage />} />
        <Route path="attendance" element={<HrAttendancePage />} />
        <Route path="leave" element={<HrLeavePage />} />
        <Route path="compoff" element={<HrCompoffPage />} />
        <Route path="late" element={<HrLatePage />} />
        <Route path="mispunch" element={<HrMispunchPage />} />
        <Route path="holidays" element={<HrHolidaysPage />} />
        <Route path="config" element={<HrConfigPage />} />
        <Route path="import" element={<HrImportPage />} />
        <Route path="roles" element={<HrRolesPage />} />
        <Route path="audit" element={<HrAuditPage />} />
        <Route path="*" element={<Navigate to="/hr" replace />} />
        </Route>
      </Routes>
    </HrPayrollProvider>
  );
}

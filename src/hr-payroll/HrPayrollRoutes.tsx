import { Navigate, Route, Routes } from "react-router-dom";
import { HrPayrollShell } from "./components/HrPayrollLayout";
import HrEmployeesPage from "./pages/HrEmployeesPage";
import HrRolesPage from "./pages/HrRolesPage";
import { HrPlaceholderPage } from "./pages/HrPlaceholderPage";
import { HR_SCREEN_TITLES } from "./lib/constants";

export default function HrPayrollRoutes() {
  return (
    <Routes>
      <Route element={<HrPayrollShell />}>
        <Route index element={<HrPlaceholderPage label={HR_SCREEN_TITLES.dashboard} />} />
        <Route path="me" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.ess} />} />
        <Route path="employee/:id" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.emp360} />} />
        <Route path="employees" element={<HrEmployeesPage />} />
        <Route path="shifts" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.shifts} />} />
        <Route path="training" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.training} />} />
        <Route path="calculator" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.calculator} />} />
        <Route path="payroll/:cycleId?" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.verify} />} />
        <Route path="attendance" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.attendance} />} />
        <Route path="leave" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.leave} />} />
        <Route path="compoff" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.compoff} />} />
        <Route path="late" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.late} />} />
        <Route path="mispunch" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.mispunch} />} />
        <Route path="holidays" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.holiday} />} />
        <Route path="config" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.config} />} />
        <Route path="roles" element={<HrRolesPage />} />
        <Route path="audit" element={<HrPlaceholderPage label={HR_SCREEN_TITLES.audit} />} />
        <Route path="*" element={<Navigate to="/hr" replace />} />
      </Route>
    </Routes>
  );
}

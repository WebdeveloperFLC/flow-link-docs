import HrConfigPage from "./HrConfigPage";

/** Payroll cycle dates and payroll days — configuration only (not processing). */
export default function HrPayrollCyclePage() {
  return <HrConfigPage initialTab="Payroll Cycle" showHubLink={false} />;
}

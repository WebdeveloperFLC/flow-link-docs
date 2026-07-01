/** Load heavy theme CSS after first paint so bootstrap JS stays smaller/faster. */
export function deferModuleStyles(): void {
  void import("@/styles/performance-hub-theme.css");
  void import("@/hr-payroll/styles/hr-payroll-theme.css");
}

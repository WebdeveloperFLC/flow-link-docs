const env = import.meta.env;

function isTruthy(value: string | undefined, defaultValue: boolean): boolean {
  const raw = value ?? String(defaultValue);
  return String(raw).toLowerCase() === "true";
}

/** WhatsApp queue KPI — follows inbox module; off when `VITE_WHATSAPP_ENABLED=false`. */
export const DASHBOARD_WHATSAPP_KPI =
  String(env.VITE_WHATSAPP_ENABLED ?? "true").toLowerCase() !== "false";

/** Assessments Done KPI — off until assessment module is in production use. */
export const DASHBOARD_ASSESSMENTS_KPI = isTruthy(env.VITE_DASHBOARD_ASSESSMENTS_ENABLED, false);

/** Offer revenue KPIs and top-offers table — off until offers module is in production use. */
export const DASHBOARD_OFFERS_WIDGETS = isTruthy(env.VITE_DASHBOARD_OFFERS_ENABLED, false);

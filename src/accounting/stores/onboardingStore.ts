const KEY = "accounting:onboarded";

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1";
}

export function dismissOnboarding() {
  try { window.localStorage.setItem(KEY, "1"); } catch {}
}
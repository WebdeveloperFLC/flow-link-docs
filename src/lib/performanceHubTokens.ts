/** Prototype token keys — hex values live in performance-hub-theme.css */
export type PerformanceHubTokenKey =
  | "ink"
  | "paper"
  | "card"
  | "line"
  | "text"
  | "faint"
  | "blue"
  | "blueBg"
  | "cash"
  | "cashBg"
  | "wallet"
  | "walletBg"
  | "offer"
  | "offerBg"
  | "violet"
  | "violetBg"
  | "muteBg"
  | "barBg"
  | "cashTxt"
  | "walletTxt"
  | "offerTxt"
  | "topbar"
  | "topbarChip";

export const PERFORMANCE_HUB_LIGHT: Record<PerformanceHubTokenKey, string> = {
  ink: "#101A2E",
  paper: "#F4F5F7",
  card: "#FFFFFF",
  line: "#E3E6EC",
  text: "#3D4759",
  faint: "#8B93A5",
  blue: "#1257D6",
  blueBg: "#EDF2FD",
  cash: "#0E8F62",
  cashBg: "#E9F6F0",
  wallet: "#C97A06",
  walletBg: "#FCF3E3",
  offer: "#C0392B",
  offerBg: "#FBEDEA",
  violet: "#6D4AC9",
  violetBg: "#F0EBFB",
  muteBg: "#EFF1F5",
  barBg: "#EDEFF3",
  cashTxt: "#0B5F42",
  walletTxt: "#7A5104",
  offerTxt: "#7A2A20",
  topbar: "#101A2E",
  topbarChip: "#1C2A45",
};

export const PERFORMANCE_HUB_DARK: Record<PerformanceHubTokenKey, string> = {
  ink: "#F1F4FA",
  paper: "#0E1320",
  card: "#171F31",
  line: "#2A3550",
  text: "#C2CADB",
  faint: "#828DA6",
  blue: "#5B8DEF",
  blueBg: "#16243F",
  cash: "#2BBE8A",
  cashBg: "#10271E",
  wallet: "#E09A2D",
  walletBg: "#2A2110",
  offer: "#E2604F",
  offerBg: "#2C1512",
  violet: "#9C7DF0",
  violetBg: "#221A3A",
  muteBg: "#222B40",
  barBg: "#222B40",
  cashTxt: "#7FD9B4",
  walletTxt: "#E8C07A",
  offerTxt: "#F2A092",
  topbar: "#0A0F1B",
  topbarChip: "#1C2A45",
};

export function performanceHubTokenVar(key: PerformanceHubTokenKey): string {
  return `var(--${key})`;
}

export function isPerformanceHubPath(pathname: string): boolean {
  return pathname === "/performance" || pathname.startsWith("/performance/");
}

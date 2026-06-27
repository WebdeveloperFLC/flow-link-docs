/** Live working/break timer from WTM session timestamps. */

import type { WtmBreakRow, WtmSessionRow } from "./wtmTypes";

export type WtmLiveTimer = {
  workingSec: number;
  breakSec: number;
  statusLabel: string;
};

function openBreak(breaks: WtmBreakRow[]): WtmBreakRow | null {
  return breaks.find((b) => !b.break_in) ?? null;
}

export function computeWtmLiveTimer(
  session: WtmSessionRow | null | undefined,
  breaks: WtmBreakRow[],
  now: Date = new Date(),
): WtmLiveTimer {
  if (!session?.clock_in_at) {
    return { workingSec: 0, breakSec: 0, statusLabel: "Not clocked in" };
  }

  const startMs = new Date(session.clock_in_at).getTime();
  const endMs = session.clock_out_at
    ? new Date(session.clock_out_at).getTime()
    : now.getTime();
  const grossSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

  let completedBreakSec = 0;
  for (const b of breaks) {
    if (b.break_in_at) {
      completedBreakSec += b.break_duration_min * 60;
    }
  }

  const open = openBreak(breaks);
  let currentBreakSec = 0;
  if (open) {
    currentBreakSec = Math.max(
      0,
      Math.floor((now.getTime() - new Date(open.break_out_at).getTime()) / 1000),
    );
  }

  const totalBreakSec = completedBreakSec + currentBreakSec;
  const workingSec = Math.max(0, grossSec - totalBreakSec);

  let statusLabel = session.session_status;
  if (session.session_status === "Completed") statusLabel = "Completed";
  else if (open) statusLabel = "On Break";
  else if (session.clock_in) statusLabel = "Working";

  return { workingSec, breakSec: totalBreakSec, statusLabel };
}

export function formatTimerDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function collectDeviceMeta(): Record<string, string> {
  if (typeof navigator === "undefined") return {};
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  return {
    device: /Mobi|Android/i.test(ua) ? "Mobile" : "Desktop",
    browser,
    user_agent: ua.slice(0, 200),
  };
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TelephonyCallError, startCall as invokeStartCall } from "@/lib/telephony/client";
import { useBrowserPhone } from "@/contexts/BrowserPhoneContext";

export type CallStatus =
  | "idle"
  | "initiated"
  | "ringing"
  | "answered"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy"
  | "canceled";

export interface CurrentCall {
  sessionId: string;
  clientId: string;
  status: CallStatus;
  maskedNumber: string | null;
  startedAt: number;
}

interface CallCtx {
  currentCall: CurrentCall | null;
  startingClientId: string | null;
  isActive: (clientId?: string) => boolean;
  startCall: (clientId: string) => Promise<CurrentCall | null>;
  hangup: () => void;
  reset: () => void;
  lastCompletedCall: { sessionId: string; clientId: string; status: CallStatus } | null;
  clearLastCompletedCall: () => void;
}

const Ctx = createContext<CallCtx | undefined>(undefined);

const TERMINAL: CallStatus[] = ["completed", "failed", "no_answer", "busy", "canceled"];
const ACTIVE: CallStatus[] = ["initiated", "ringing", "answered"];

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const browser = useBrowserPhone();
  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const [startingClientId, setStartingClientId] = useState<string | null>(null);
  const [lastCompletedCall, setLastCompletedCall] = useState<{ sessionId: string; clientId: string; status: CallStatus } | null>(null);
  const currentCallRef = useRef<CurrentCall | null>(null);
  const startingClientIdRef = useRef<string | null>(null);
  const latestStartTokenRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { currentCallRef.current = currentCall; }, [currentCall]);
  useEffect(() => { startingClientIdRef.current = startingClientId; }, [startingClientId]);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const clearCurrentCall = useCallback(() => {
    cleanupChannel();
    activeSessionIdRef.current = null;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    currentCallRef.current = null;
    setCurrentCall(null);
  }, [cleanupChannel]);

  const reset = useCallback(() => {
    latestStartTokenRef.current += 1;
    startingClientIdRef.current = null;
    setStartingClientId(null);
    clearCurrentCall();
  }, [clearCurrentCall]);

  useEffect(() => () => { cleanupChannel(); if (timeoutRef.current) clearTimeout(timeoutRef.current); }, [cleanupChannel]);

  const subscribe = useCallback((sessionId: string) => {
    cleanupChannel();
    const ch = supabase
      .channel(`call-session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          // Ignore stale updates (a newer call has been started)
          if (activeSessionIdRef.current !== sessionId) return;
          const row = payload.new as { status?: string };
          const status = (row.status as CallStatus) ?? "initiated";
          setCurrentCall((prev) =>
            prev && prev.sessionId === sessionId ? { ...prev, status } : prev,
          );
          if (TERMINAL.includes(status)) {
            const cur = currentCallRef.current;
            if (cur && cur.sessionId === sessionId && !String(sessionId).startsWith("failed-")) {
              setLastCompletedCall({ sessionId, clientId: cur.clientId, status });
            }
            // Auto-clear terminal state shortly after so a fresh call is allowed.
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              if (activeSessionIdRef.current === sessionId) reset();
            }, 1500);
          }
        },
      )
      .subscribe();
    channelRef.current = ch;
  }, [cleanupChannel, reset]);

  const startCall = useCallback(async (clientId: string): Promise<CurrentCall | null> => {
    const existing = currentCallRef.current;
    // Prevent duplicates only for the same in-flight/active call.
    if (startingClientIdRef.current === clientId) return null;
    if (existing && existing.clientId === clientId && ACTIVE.includes(existing.status)) {
      return existing;
    }
    const startToken = latestStartTokenRef.current + 1;
    latestStartTokenRef.current = startToken;
    // Clear previous call state before a fresh backend dial request.
    clearCurrentCall();
    startingClientIdRef.current = clientId;
    setStartingClientId(clientId);
    try {
      // Prefer browser SDK when the counselor's TeleCMI session is ready.
      if (browser.status === "ready") {
        // Resolve client phone and create the call_session server-side, but do
        // not invoke TeleCMI adminConnect. A ready WebRTC session dials through
        // the browser SDK, avoiding the legacy /agent/get readiness check.
        const result = await invokeStartCall({ clientId, mode: "browser_sdk" });
        if (latestStartTokenRef.current !== startToken) return null;
        if (!result.maskedNumber) throw new TelephonyCallError("No dialable phone number was returned", { sessionId: result.sessionId, traceId: result.traceId });
        browser.dial(result.maskedNumber.replace(/[^\d+*#]/g, ""), { sessionId: result.sessionId, clientId });
        const next: CurrentCall = {
          sessionId: result.sessionId,
          clientId,
          status: "initiated",
          maskedNumber: result.maskedNumber ?? null,
          startedAt: Date.now(),
        };
        activeSessionIdRef.current = next.sessionId;
        currentCallRef.current = next;
        setCurrentCall(next);
        subscribe(next.sessionId);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (activeSessionIdRef.current === next.sessionId) {
            setCurrentCall((prev) => prev && prev.sessionId === next.sessionId ? { ...prev, status: "failed" } : prev);
            setTimeout(() => { if (activeSessionIdRef.current === next.sessionId) reset(); }, 1500);
          }
        }, 90_000);
        return next;
      }
      throw new TelephonyCallError("Connect browser phone before dialing. Legacy TeleCMI click-to-call is disabled for counselor calls.");
    } catch (e) {
      if (latestStartTokenRef.current === startToken) {
        const sessionId = e instanceof TelephonyCallError && e.sessionId ? e.sessionId : `failed-${startToken}`;
        const failedCall = { sessionId, clientId, status: "failed" as CallStatus, maskedNumber: null, startedAt: Date.now() };
        currentCallRef.current = failedCall;
        setCurrentCall(failedCall);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (latestStartTokenRef.current === startToken) clearCurrentCall();
        }, 1500);
      }
      throw e;
    } finally {
      if (latestStartTokenRef.current === startToken) {
        startingClientIdRef.current = null;
        setStartingClientId(null);
      }
    }
  }, [clearCurrentCall, subscribe, browser, reset]);

  const isActive = useCallback((clientId?: string) => {
    if (!currentCall) return false;
    if (!ACTIVE.includes(currentCall.status)) return false;
    return clientId ? currentCall.clientId === clientId : true;
  }, [currentCall]);

  const hangup = useCallback(() => {
    try { browser.hangup(); } catch { /* */ }
    const cur = currentCallRef.current;
    if (cur) {
      if (!String(cur.sessionId).startsWith("failed-")) {
        setLastCompletedCall({ sessionId: cur.sessionId, clientId: cur.clientId, status: "canceled" });
      }
      setCurrentCall({ ...cur, status: "canceled" });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => reset(), 800);
    } else {
      reset();
    }
  }, [browser, reset]);

  return <Ctx.Provider value={{ currentCall, startingClientId, isActive, startCall, hangup, reset, lastCompletedCall, clearLastCompletedCall: () => setLastCompletedCall(null) }}>{children}</Ctx.Provider>;
};

export const useCall = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCall must be used within CallProvider");
  return c;
};
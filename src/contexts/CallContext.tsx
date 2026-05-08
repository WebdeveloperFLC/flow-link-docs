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
  reset: () => void;
}

const Ctx = createContext<CallCtx | undefined>(undefined);

const TERMINAL: CallStatus[] = ["completed", "failed", "no_answer", "busy", "canceled"];
const ACTIVE: CallStatus[] = ["initiated", "ringing", "answered"];

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const browser = useBrowserPhone();
  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const [startingClientId, setStartingClientId] = useState<string | null>(null);
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
        // Resolve client phone server-side via existing edge function (it returns
        // maskedNumber + creates a call_session). We then trigger the SDK dial
        // using the same masked outbound number so audit + UI stay aligned.
        const result = await invokeStartCall({ clientId });
        if (latestStartTokenRef.current !== startToken) return null;
        try {
          // Backend already created the session and triggered adminConnect; if
          // the masked number is returned, also dial via SDK so audio lands in
          // the browser. If SDK dial fails, the backend leg keeps working.
          if (result.maskedNumber) {
            try { browser.dial(result.maskedNumber.replace(/[^\d+*#]/g, ""), { sessionId: result.sessionId, clientId }); }
            catch (e) { console.warn("[call] SDK dial failed, falling back to backend leg", e); }
          }
        } catch (e) { console.warn("[call] SDK dial error", e); }
        const next: CurrentCall = {
          sessionId: result.sessionId,
          clientId,
          status: (result.status as CallStatus) ?? "initiated",
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
      const result = await invokeStartCall({ clientId });
      if (latestStartTokenRef.current !== startToken) return null;
      const next: CurrentCall = {
        sessionId: result.sessionId,
        clientId,
        status: (result.status as CallStatus) ?? "initiated",
        maskedNumber: result.maskedNumber ?? null,
        startedAt: Date.now(),
      };
      activeSessionIdRef.current = next.sessionId;
      currentCallRef.current = next;
      setCurrentCall(next);
      subscribe(next.sessionId);
      // Safety timeout: if no terminal event in 90s, auto-reset so user can retry.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (activeSessionIdRef.current === next.sessionId) {
          setCurrentCall((prev) => prev && prev.sessionId === next.sessionId ? { ...prev, status: "failed" } : prev);
          setTimeout(() => { if (activeSessionIdRef.current === next.sessionId) reset(); }, 1500);
        }
      }, 90_000);
      return next;
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

  return <Ctx.Provider value={{ currentCall, startingClientId, isActive, startCall, reset }}>{children}</Ctx.Provider>;
};

export const useCall = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCall must be used within CallProvider");
  return c;
};
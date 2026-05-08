import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserPhone, BrowserPhoneStatus } from "@/lib/telephony/browserPhone";
import { useAuth } from "@/contexts/AuthContext";

interface SbcCredsResponse {
  sbc_uri: string;
  user_id: string;
  password: string;
  telecmi_agent_id: string | null;
  test_extension: string | null;
  is_admin: boolean;
}

interface BrowserPhoneCtx {
  status: BrowserPhoneStatus;
  statusDetail?: string;
  callId: string | null;
  remoteStream: MediaStream | null;
  testExtension: string | null;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => void;
  dial: (numberOrExt: string, meta?: Record<string, unknown>) => string | null;
  hangup: () => void;
  testCall: () => string | null;
}

const Ctx = createContext<BrowserPhoneCtx | undefined>(undefined);

async function logAudit(eventType: string, details: Record<string, unknown> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const actor = u?.user?.id ?? null;
    if (!actor) return;
    await supabase.from("telephony_audit_logs").insert([{ actor_id: actor, event_type: eventType, details: details as any }]);
  } catch { /* best-effort */ }
}

export const BrowserPhoneProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<BrowserPhoneStatus>("logged_out");
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [callId, setCallId] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [testExtension, setTestExtension] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phoneRef = useRef<BrowserPhone | null>(null);

  // Hidden audio element for remote stream (autoplay enabled in SDK; this is a safety net)
  useEffect(() => {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.style.display = "none";
    document.body.appendChild(el);
    audioRef.current = el;
    return () => { try { el.remove(); } catch { /* */ } };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Tear down phone on auth change
  useEffect(() => {
    if (!user) {
      try { phoneRef.current?.logout(); } catch { /* */ }
      phoneRef.current = null;
      setStatus("logged_out");
      setCallId(null);
      setRemoteStream(null);
    }
  }, [user]);

  const fetchCreds = useCallback(async (): Promise<SbcCredsResponse> => {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!session) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (!session?.access_token) throw new Error("Please sign in again");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/telephony-sbc-credentials`, {
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `Failed to fetch SBC credentials (${res.status})`);
    return body as SbcCredsResponse;
  }, []);

  const login = useCallback(async () => {
    const creds = await fetchCreds();
    setTestExtension(creds.test_extension);
    setIsAdmin(creds.is_admin);

    const phone = new BrowserPhone({
      onStatus: (s, detail) => { setStatus(s); setStatusDetail(detail); },
      onCallId: (id) => setCallId(id),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onError: (msg) => { logAudit("browser_call_error", { msg }); },
    });
    phoneRef.current = phone;
    try {
      await phone.login({ user_id: creds.user_id, password: creds.password, sbc_uri: creds.sbc_uri });
      await logAudit("browser_login_success", { sbc_uri: creds.sbc_uri });
    } catch (e: any) {
      await logAudit("browser_login_failed", { reason: e?.message ?? String(e) });
      throw e;
    }
  }, [fetchCreds]);

  const logout = useCallback(() => {
    try { phoneRef.current?.logout(); } catch { /* */ }
    phoneRef.current = null;
    setStatus("logged_out");
    setCallId(null);
    setRemoteStream(null);
    logAudit("browser_logout", {});
  }, []);

  const dial = useCallback((numberOrExt: string, meta?: Record<string, unknown>) => {
    if (!phoneRef.current) throw new Error("Not logged in to TeleCMI SBC");
    const id = phoneRef.current.call(numberOrExt, meta);
    logAudit("browser_call_start", { call_id: id, ext: numberOrExt.replace(/\d(?=\d{2})/g, "•") });
    return id;
  }, []);

  const hangup = useCallback(() => {
    try { phoneRef.current?.hangup(); } catch { /* */ }
    logAudit("browser_call_end_local", { call_id: callId });
  }, [callId]);

  const testCall = useCallback(() => {
    if (!testExtension) throw new Error("No test extension configured. Set one in Telephony Integration Settings.");
    return dial(testExtension, { test: true });
  }, [dial, testExtension]);

  const value = useMemo<BrowserPhoneCtx>(() => ({
    status, statusDetail, callId, remoteStream, testExtension, isAdmin,
    login, logout, dial, hangup, testCall,
  }), [status, statusDetail, callId, remoteStream, testExtension, isAdmin, login, logout, dial, hangup, testCall]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useBrowserPhone = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBrowserPhone must be used within BrowserPhoneProvider");
  return c;
};
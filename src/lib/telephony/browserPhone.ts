// Thin wrapper over the piopiyjs SDK so React components can drive it via a
// stable, typed API. The SDK runs entirely in the browser and never has
// access to the TeleCMI app secret.
import PIOPIY from "piopiyjs";

export type BrowserPhoneStatus =
  | "logged_out"
  | "logging_in"
  | "ready"
  | "dialing"
  | "ringing"
  | "connected"
  | "ended"
  | "failed";

export interface BrowserPhoneListener {
  onStatus: (status: BrowserPhoneStatus, detail?: string) => void;
  onCallId: (callId: string | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onError: (message: string) => void;
}

export interface BrowserPhoneCredentials {
  user_id: string;
  password: string;
  sbc_uri: string;
  displayName?: string;
}

export class BrowserPhone {
  private piopiy: any | null = null;
  private listener: BrowserPhoneListener;

  constructor(listener: BrowserPhoneListener) {
    this.listener = listener;
  }

  isReady(): boolean {
    return !!this.piopiy && this.currentStatus === "ready";
  }

  private currentStatus: BrowserPhoneStatus = "logged_out";
  private setStatus(s: BrowserPhoneStatus, detail?: string) {
    this.currentStatus = s;
    this.listener.onStatus(s, detail);
  }

  async login(creds: BrowserPhoneCredentials): Promise<void> {
    if (this.piopiy) {
      try { this.piopiy.logout?.(); } catch { /* ignore */ }
      this.piopiy = null;
    }
    this.setStatus("logging_in");
    return new Promise((resolve, reject) => {
      try {
        const piopiy = new PIOPIY({
          name: creds.displayName ?? "Counselor",
          debug: false,
          autoplay: true,
          ringTime: 60,
        });

        piopiy.on("login", () => {
          this.setStatus("ready");
          resolve();
        });
        piopiy.on("loginFailed", (data: any) => {
          const msg = typeof data === "string" ? data : data?.reason ?? data?.message ?? "Login failed";
          this.setStatus("failed", msg);
          this.listener.onError(`SBC login failed: ${msg}`);
          reject(new Error(msg));
        });
        piopiy.on("logout", () => {
          this.setStatus("logged_out");
          this.listener.onCallId(null);
          this.listener.onRemoteStream(null);
        });
        piopiy.on("trying", () => {
          this.setStatus("dialing");
          try { this.listener.onCallId(piopiy.getCallId?.() || null); } catch { /* ignore */ }
        });
        piopiy.on("ringing", () => this.setStatus("ringing"));
        piopiy.on("answered", () => this.setStatus("connected"));
        piopiy.on("callStream", (stream: MediaStream) => {
          this.listener.onRemoteStream(stream);
        });
        piopiy.on("ended", () => {
          this.setStatus("ended");
          this.listener.onCallId(null);
          this.listener.onRemoteStream(null);
          // After a brief moment, return to ready so user can place another call
          setTimeout(() => {
            if (this.currentStatus === "ended") this.setStatus("ready");
          }, 1500);
        });
        piopiy.on("hangup", () => {
          this.setStatus("ended");
          this.listener.onCallId(null);
          this.listener.onRemoteStream(null);
          setTimeout(() => {
            if (this.currentStatus === "ended") this.setStatus("ready");
          }, 1500);
        });
        piopiy.on("error", (e: any) => {
          const msg = typeof e === "string" ? e : e?.message ?? "Telephony error";
          this.listener.onError(msg);
          this.setStatus("failed", msg);
        });
        piopiy.on("mediaFailed", () => {
          this.listener.onError("Microphone access failed. Allow mic permission and retry.");
          this.setStatus("failed", "media_failed");
        });

        this.piopiy = piopiy;
        piopiy.login(creds.user_id, creds.password, creds.sbc_uri);
      } catch (e: any) {
        this.setStatus("failed", e?.message ?? "Init failed");
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  call(phoneOrExtension: string, extra?: Record<string, unknown>): string | null {
    if (!this.piopiy) throw new Error("Browser phone not logged in");
    if (this.currentStatus !== "ready") throw new Error(`Not ready (status: ${this.currentStatus})`);
    this.setStatus("dialing");
    const opts = extra ? { extra_param: extra } : undefined;
    this.piopiy.call(phoneOrExtension, opts);
    try { return this.piopiy.getCallId?.() || null; } catch { return null; }
  }

  hangup() {
    try { this.piopiy?.terminate?.(); } catch { /* ignore */ }
  }

  logout() {
    try { this.piopiy?.logout?.(); } catch { /* ignore */ }
    this.piopiy = null;
    this.setStatus("logged_out");
  }

  getCallId(): string | null {
    try { return this.piopiy?.getCallId?.() || null; } catch { return null; }
  }
}
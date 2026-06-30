import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const shell: CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 20px",
  background: "linear-gradient(180deg, #eef4f9 0%, #f5f8fa 100%)",
  color: "#1a2332",
  fontFamily: "Inter, system-ui, sans-serif",
  boxSizing: "border-box",
};

const card: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  minWidth: 280,
  background: "#fff",
  borderRadius: 16,
  padding: "36px 32px",
  boxShadow: "0 12px 40px rgba(0, 93, 170, 0.12)",
  border: "1px solid rgba(0, 93, 170, 0.08)",
};

const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  fontSize: 15,
  boxSizing: "border-box",
};

const button: CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #005daa, #0077cc)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

function resetRootLayout() {
  const root = document.getElementById("root");
  if (!root) return;
  root.style.minHeight = "100vh";
  root.style.width = "100%";
  root.style.display = "block";
  root.style.alignItems = "";
  root.style.justifyContent = "";
  root.style.background = "";
  root.style.padding = "0";
}

export default function MinimalAuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    resetRootLayout();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 1500);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!cancelled && session?.user) navigate("/", { replace: true });
      })
      .catch(() => {
        /* preview offline — show form */
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message || "";
        if (/invalid login credentials/i.test(msg)) {
          setError("Wrong email or password.");
        } else if (/email not confirmed/i.test(msg)) {
          setError("Email not confirmed — ask your admin to confirm your account.");
        } else if (/failed to fetch|network/i.test(msg)) {
          setError("Cannot reach the server. Check connection or Supabase settings in Lovable.");
        } else {
          setError(msg);
        }
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        setError("Cannot reach Supabase. Confirm VITE_SUPABASE_URL and keys are set in Lovable.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div style={shell}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              margin: "0 auto 12px",
              borderRadius: "50%",
              border: "2px solid #005daa",
              borderTopColor: "transparent",
              animation: "flc-spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 15, color: "#5a6a7a" }}>Loading sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <img src="/flc-logo.png" alt="Future Link Consultants" style={{ height: 56, width: "auto" }} />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 700, textAlign: "center" }}>Sign in</h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#5a6a7a", textAlign: "center" }}>
          Future Link workspace
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, fontWeight: 500 }}>
            Email
            <input name="email" type="email" required autoComplete="email" style={input} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, fontWeight: 500 }}>
            Password
            <input name="password" type="password" required autoComplete="current-password" style={input} />
          </label>
          {error ? (
            <p style={{ margin: 0, fontSize: 14, color: "#b42318", lineHeight: 1.4 }} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ margin: "20px 0 0", fontSize: 13, color: "#8a96a3", textAlign: "center", lineHeight: 1.5 }}>
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  );
}

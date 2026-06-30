import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const shell: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#f5f8fa",
  color: "#1a2332",
  fontFamily: "system-ui, sans-serif",
};

const card: CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "#fff",
  borderRadius: 12,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
};

const input: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d0d7de",
  fontSize: 14,
  boxSizing: "border-box",
};

const button: CSSProperties = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #005daa, #0077cc)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export default function MinimalAuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

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
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
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
              width: 32,
              height: 32,
              margin: "0 auto 12px",
              borderRadius: "50%",
              border: "2px solid #005daa",
              borderTopColor: "transparent",
              animation: "flc-spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 14, color: "#5a6a7a" }}>Loading sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ marginBottom: 20 }}>
          <img src="/flc-logo.png" alt="Future Link" style={{ height: 48, width: "auto" }} />
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>Sign in</h1>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#5a6a7a" }}>
          Future Link workspace
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500 }}>
            Email
            <input name="email" type="email" required autoComplete="email" style={input} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500 }}>
            Password
            <input name="password" type="password" required autoComplete="current-password" style={input} />
          </label>
          {error ? (
            <p style={{ margin: 0, fontSize: 13, color: "#b42318" }} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

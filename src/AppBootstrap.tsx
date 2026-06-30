import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BootstrapLoading } from "@/components/BootstrapLoading";
import { AppProviders } from "@/AppProviders";
import { useAuth } from "@/contexts/AuthContext";
import { isLovablePreview } from "@/lib/previewEnv";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";

const PREVIEW_CHUNK_TIMEOUT_MS = 120_000;
const DEFAULT_CHUNK_TIMEOUT_MS = 45_000;

function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

function ChunkLoadTimeout({
  timeoutMs,
  onTimeout,
}: {
  timeoutMs: number;
  onTimeout: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onTimeout, timeoutMs);
    return () => clearTimeout(id);
  }, [onTimeout, timeoutMs]);
  return null;
}

function SlowLoadRecovery({ onRetry }: { onRetry: () => void }) {
  const clearSessionAndReload = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) localStorage.removeItem(key);
      });
    } catch {
      /* noop */
    }
    window.location.href = "/auth";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#f5f8fa",
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Still loading</h1>
        <p style={{ fontSize: 14, color: "#5a6a7a", margin: "0 0 16px", lineHeight: 1.5 }}>
          The app bundle is large and Lovable preview can take a minute or two on first load.
          Try reload first — only clear session if sign-in is actually broken.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#005daa",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={clearSessionAndReload}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #d0d7de",
              background: "#fff",
              color: "#1a2332",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Clear session &amp; sign in
          </button>
        </div>
      </div>
    </div>
  );
}

function DeferredAppRoutes() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const preview = isLovablePreview();
  const chunkTimeoutMs = preview ? PREVIEW_CHUNK_TIMEOUT_MS : DEFAULT_CHUNK_TIMEOUT_MS;
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [slow, setSlow] = useState(false);

  const AppRoutes = useMemo(
    () => lazyWithRetry(() => import("@/AppRoutes")),
    [loadAttempt],
  );

  const handleSlow = useCallback(() => setSlow(true), []);
  const handleRetry = useCallback(() => {
    setSlow(false);
    setLoadAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    setSlow(false);
  }, [loadAttempt]);

  if (loading) {
    return (
      <BootstrapLoading
        message={preview ? "Checking sign-in (preview)…" : "Loading workspace…"}
      />
    );
  }

  if (!user && pathname === "/") {
    return <Navigate to="/auth" replace />;
  }

  if (slow) {
    return <SlowLoadRecovery onRetry={handleRetry} />;
  }

  return (
    <>
      <ChunkLoadTimeout timeoutMs={chunkTimeoutMs} onTimeout={handleSlow} />
      <Suspense
        fallback={
          <BootstrapLoading
            message={
              preview
                ? "Loading app modules — first preview load can take up to 2 minutes…"
                : "Loading app…"
            }
          />
        }
      >
        <AppRoutes key={loadAttempt} />
      </Suspense>
    </>
  );
}

export default function AppBootstrap() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<DeferredAppRoutes />} />
      </Routes>
    </AppProviders>
  );
}

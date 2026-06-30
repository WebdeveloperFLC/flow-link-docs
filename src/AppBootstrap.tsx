import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BootstrapLoading } from "@/components/BootstrapLoading";
import { AppProviders } from "@/AppProviders";
import { useAuth } from "@/contexts/AuthContext";
import { isLovablePreview } from "@/lib/previewEnv";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";

/** Warm the ~9MB routes chunk as soon as bootstrap mounts (does not block render). */
const appRoutesImport = import("@/AppRoutes");

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

const AppRoutes = lazyWithRetry(() => appRoutesImport);

function DeferredAppRoutes() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const preview = isLovablePreview();
  const [chunkError, setChunkError] = useState<string | null>(null);

  useEffect(() => {
    appRoutesImport.catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not load application modules";
      setChunkError(message);
    });
  }, []);

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

  if (chunkError) {
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
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Could not load the app</h1>
          <p style={{ fontSize: 14, color: "#5a6a7a", margin: "0 0 16px", lineHeight: 1.5 }}>
            {chunkError}. Try a hard refresh (Ctrl+Shift+R). Your signed-in session is kept.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
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
            Hard refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <BootstrapLoading
          message={
            preview
              ? "Loading app modules — first load can take a minute…"
              : "Loading app…"
          }
        />
      }
    >
      <AppRoutes />
    </Suspense>
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

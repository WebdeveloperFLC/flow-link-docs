import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BootstrapLoading } from "@/components/BootstrapLoading";
import { BootstrapProviders } from "@/BootstrapProviders";
import { useAuth } from "@/contexts/AuthContext";
import { isLovablePreview } from "@/lib/previewEnv";
import { bootDebugLog } from "@/lib/bootDebugLog";
import { deferModuleStyles } from "@/lib/deferModuleStyles";

const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

function DeferredAppRoutes() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const preview = isLovablePreview();
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [AppRoutes, setAppRoutes] = useState<ComponentType | null>(null);

  useEffect(() => {
    bootDebugLog("AppBootstrap.tsx:DeferredAppRoutes", "auth gate state", {
      loading,
      hasUser: !!user,
      pathname,
      preview,
      chunkError,
      routesReady: !!AppRoutes,
    }, "H4");
  }, [loading, user, pathname, preview, chunkError, AppRoutes]);

  useEffect(() => {
    if (loading) return;
    const started = performance.now();
    bootDebugLog("AppBootstrap.tsx:routes", "AppRoutes import started after auth", {
      pathname,
      preview,
    }, "H1");
    import("@/AppRoutes")
      .then((mod) => {
        setAppRoutes(() => mod.default);
        bootDebugLog("AppBootstrap.tsx:routes", "AppRoutes import resolved", {
          pathname,
          preview,
          ms: Math.round(performance.now() - started),
        }, "H1");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not load application modules";
        setChunkError(message);
        bootDebugLog("AppBootstrap.tsx:routes", "AppRoutes import failed", {
          pathname,
          preview,
          error: message,
          ms: Math.round(performance.now() - started),
        }, "H2");
      });
  }, [loading, pathname, preview]);

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

  if (!AppRoutes) {
    return (
      <BootstrapLoading
        message={
          preview
            ? "Loading route map — first preview load is much faster now…"
            : "Loading app…"
        }
      />
    );
  }

  return (
    <Suspense
      fallback={
        <BootstrapLoading
          message={
            preview
              ? "Loading page — only the route you open is fetched…"
              : "Loading page…"
          }
        />
      }
    >
      <AppRoutes />
    </Suspense>
  );
}

const AuthFallback = () => <BootstrapLoading message="Loading sign-in…" />;

export default function AppBootstrap() {
  useEffect(() => {
    deferModuleStyles();
  }, []);

  return (
    <BootstrapProviders>
      <Routes>
        <Route
          path="/auth"
          element={
            <Suspense fallback={<AuthFallback />}>
              <Auth />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<AuthFallback />}>
              <ResetPassword />
            </Suspense>
          }
        />
        <Route path="*" element={<DeferredAppRoutes />} />
      </Routes>
    </BootstrapProviders>
  );
}

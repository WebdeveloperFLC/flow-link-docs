import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BootstrapLoading } from "@/components/BootstrapLoading";
import { AppProviders } from "@/AppProviders";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";

const AppRoutes = lazy(() => import("@/AppRoutes"));

function ChunkLoadTimeout({ onTimeout }: { onTimeout: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onTimeout, 20000);
    return () => clearTimeout(id);
  }, [onTimeout]);
  return null;
}

function SlowLoadRecovery() {
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
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Still loading</h1>
        <p style={{ fontSize: 14, color: "#5a6a7a", margin: "0 0 16px" }}>
          The full app bundle is taking longer than usual in preview. Try signing in again or hard refresh.
        </p>
        <button
          type="button"
          onClick={clearSessionAndReload}
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
          Clear session &amp; sign in
        </button>
      </div>
    </div>
  );
}

function DeferredAppRoutes() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [slow, setSlow] = useState(false);

  if (loading) {
    return <BootstrapLoading message="Loading workspace…" />;
  }

  if (!user && pathname === "/") {
    return <Navigate to="/auth" replace />;
  }

  if (slow) {
    return <SlowLoadRecovery />;
  }

  return (
    <>
      <ChunkLoadTimeout onTimeout={() => setSlow(true)} />
      <Suspense fallback={<BootstrapLoading message="Loading app…" />}>
        <AppRoutes />
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

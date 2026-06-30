/** Visible before Tailwind/CSS hydrate — avoids blank white screen on slow Lovable preview loads. */
export function BootstrapLoading({ message = "Loading Future Link…" }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#f5f8fa",
        color: "#1a2332",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid #005daa",
          borderTopColor: "transparent",
          animation: "flc-spin 0.8s linear infinite",
        }}
        aria-hidden
      />
      <p className="text-sm text-muted-foreground" style={{ fontSize: 14, color: "#5a6a7a", margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

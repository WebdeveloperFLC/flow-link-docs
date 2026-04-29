import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-resolve`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<{ url: string; file_name: string; expires_at: string } | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Link unavailable");
        setData(json);
        setState("ready");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Link unavailable");
        setState("error");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8 shadow-elev-lg">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="size-9 rounded-lg gradient-accent flex items-center justify-center">
            <FileText className="size-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">Future Link DMS</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Secure document share</div>
          </div>
        </div>

        {state === "loading" && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-3 text-primary" />
            Verifying link…
          </div>
        )}
        {state === "error" && (
          <div className="py-12 text-center">
            <AlertTriangle className="size-10 mx-auto text-destructive mb-3" />
            <div className="font-semibold">Link unavailable</div>
            <p className="text-sm text-muted-foreground mt-1">{err}</p>
          </div>
        )}
        {state === "ready" && data && (
          <div>
            <div className="font-semibold text-lg break-all">{data.file_name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Link expires {new Date(data.expires_at).toLocaleString()}
            </div>
            <div className="mt-4 rounded-lg overflow-hidden border bg-muted">
              <iframe src={data.url} className="w-full h-[70vh]" title={data.file_name} />
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild className="gradient-brand text-primary-foreground">
                <a href={data.url} download={data.file_name}><Download className="size-4 mr-1.5" />Download</a>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SharedView;
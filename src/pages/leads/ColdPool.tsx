import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy route — unified leads workspace with cold segment. */
export default function ColdPool() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("segment", "cold");
  return <Navigate to={`/leads?${next.toString()}`} replace />;
}

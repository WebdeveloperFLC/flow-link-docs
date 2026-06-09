import { Navigate, useSearchParams } from "react-router-dom";

/** Redirect legacy /clients/new URLs to the unified lead form with client registration expanded. */
const ClientNew = () => {
  const [sp] = useSearchParams();
  const p = new URLSearchParams(sp);
  if (p.has("lead_id") && !p.has("id")) {
    p.set("id", p.get("lead_id")!);
    p.delete("lead_id");
  }
  p.set("register_client", "1");
  return <Navigate to={`/leads/new?${p.toString()}`} replace />;
};

export default ClientNew;

import { Navigate, useParams } from "react-router-dom";
import HrCrmMasterLinkPage from "../HrCrmMasterLinkPage";

const MAP: Record<string, "branches" | "departments" | "designations"> = {
  __branches: "branches",
  __departments: "departments",
  __designations: "designations",
};

export default function HrAdminCrmMasterPage() {
  const { section = "" } = useParams();
  const kind = MAP[section];
  if (!kind) return <Navigate to="/hr/admin/master-data" replace />;
  return <HrCrmMasterLinkPage kind={kind} backTo="/hr/admin/master-data" />;
}

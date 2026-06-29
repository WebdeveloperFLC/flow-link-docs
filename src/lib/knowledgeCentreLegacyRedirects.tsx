import { Navigate, useLocation, useParams } from "react-router-dom";

/** Legacy /knowledge-centre/* bookmarks → single Knowledge Centre module (/service-library). */
export function KcLegacyPathRedirect({ to }: { to: string }) {
  const loc = useLocation();
  return <Navigate to={`${to}${loc.search}`} replace />;
}

export function KcLegacyCountryRedirect() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/service-library?country=${encodeURIComponent(code ?? "")}`} replace />;
}

export function KcLegacyServiceRedirect() {
  const { libraryId } = useParams<{ libraryId: string }>();
  return <Navigate to={`/service-library?id=${encodeURIComponent(libraryId ?? "")}`} replace />;
}

export function KcLegacyArticleSlugRedirect() {
  return <Navigate to="/service-library" replace />;
}

export function KcLegacyQuizSlugRedirect() {
  return <Navigate to="/service-library" replace />;
}

export function KcLegacyAdminArticleRedirect() {
  return <Navigate to="/service-library-admin" replace />;
}

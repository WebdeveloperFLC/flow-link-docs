import { Navigate, useLocation, useParams } from "react-router-dom";

/** Preserves query string when redirecting legacy /knowledge-centre paths. */
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
  return (
    <Navigate
      to={`/service-library?id=${encodeURIComponent(libraryId ?? "")}&tab=guide`}
      replace
    />
  );
}

export function KcLegacyArticleSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/service-library/articles/${encodeURIComponent(slug ?? "")}`} replace />;
}

export function KcLegacyQuizSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/service-library/quiz/${encodeURIComponent(slug ?? "")}`} replace />;
}

export function KcLegacyAdminArticleRedirect() {
  const { id } = useParams<{ id: string }>();
  return (
    <Navigate
      to={`/service-library-admin/knowledge-centre/articles/${encodeURIComponent(id ?? "")}`}
      replace
    />
  );
}

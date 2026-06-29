import { Link } from "react-router-dom";
import type { KcInternalLink } from "@/knowledge-centre/types/kc";

export function RelatedKnowledgePanel({ links }: { links: KcInternalLink[] }) {
  if (!links.length) return <p className="text-sm text-muted-foreground">No related knowledge links yet.</p>;
  return (
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.id}>
          {l.to_article?.slug ? (
            <Link
              to={`/knowledge-centre/articles/${l.to_article.slug}`}
              className="text-sm text-primary hover:underline"
            >
              {l.anchor_text || l.to_article.title}
            </Link>
          ) : (
            <span className="text-sm">{l.anchor_text || l.to_article_id}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

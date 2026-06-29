import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2 } from "lucide-react";
import { resolveLiveArticle, getVersionSatellites } from "@/knowledge-centre/repositories/kcRepo";
import { QuizSectionPanel } from "@/knowledge-centre/components/QuizSectionPanel";
import { useModulePermission } from "@/hooks/useModulePermission";

export default function QuizRunnerPage() {
  const { slug } = useParams<{ slug: string }>();
  const { canEdit } = useModulePermission("knowledge_centre");
  const [questions, setQuestions] = useState<Awaited<ReturnType<typeof getVersionSatellites>>["quiz"]>([]);
  const [title, setTitle] = useState("Quiz");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    resolveLiveArticle(slug)
      .then(async (p) => {
        if (!p?.article || !p.version) return;
        setTitle(p.article.title);
        const sat = await getVersionSatellites(p.version.id);
        setQuestions(sat.quiz);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <AppLayout>
      <PageHeader title={title} description="Self-test quiz" />
      <div className="p-8 max-w-2xl">
        {loading ? <Loader2 className="size-6 animate-spin" /> : (
          <QuizSectionPanel questions={questions} showAnswers={canEdit} />
        )}
      </div>
    </AppLayout>
  );
}

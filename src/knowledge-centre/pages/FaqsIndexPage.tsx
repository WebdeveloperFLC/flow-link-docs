import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2 } from "lucide-react";
import { listPublishedFaqs } from "../repositories/kcRepo";
import { FaqSectionPanel } from "../components/FaqSectionPanel";

export default function FaqsIndexPage() {
  const [faqs, setFaqs] = useState<Awaited<ReturnType<typeof listPublishedFaqs>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublishedFaqs().then(setFaqs).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader title="FAQs" description="Published FAQ items across all knowledge topics." />
      <div className="p-8 max-w-3xl">
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <FaqSectionPanel items={faqs} />
        )}
      </div>
    </AppLayout>
  );
}

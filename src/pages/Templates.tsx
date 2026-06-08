import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowTemplatePanel } from "@/components/templates/WorkflowTemplatePanel";

const Templates = () => (
  <AppLayout>
    <PageHeader
      title="Workflow templates"
      description="Document binders have moved to Service Library Admin. This page remains for bookmarks."
    />
    <div className="p-8">
      <WorkflowTemplatePanel />
    </div>
  </AppLayout>
);

export default Templates;

export type { Template, TemplateItem, TemplateGroup } from "@/components/templates/templateTypes";

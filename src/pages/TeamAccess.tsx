import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DefaultTeamMembersCard } from "@/components/users/DefaultTeamMembersCard";

const TeamAccess = () => (
  <AppLayout>
    <PageHeader
      title="Team access"
      description="Share access to all of your clients with default team members."
    />
    <div className="p-8 max-w-3xl">
      <DefaultTeamMembersCard />
    </div>
  </AppLayout>
);

export default TeamAccess;
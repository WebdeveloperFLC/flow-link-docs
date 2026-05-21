import { AppLayout } from "@/components/layout/AppLayout";
import { AiHelpChat } from "../components/AiHelpChat";

export default function AiHelpPage() {
  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        <AiHelpChat showSidebar className="flex-1 min-h-0" />
      </div>
    </AppLayout>
  );
}
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import { CalendarStatsCards } from "../components/CalendarStatsCards";
import { BookingLinkCard } from "../components/BookingLinkCard";
import { UpcomingMeetingsTable } from "../components/UpcomingMeetingsTable";
import { useCalendarProfile } from "../hooks/useCalendarData";

export default function CalendarDashboard() {
  const { data: profile, isLoading } = useCalendarProfile();
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Calendar"
          description="Manage your bookings, availability, and meeting types."
          actions={
            <Button asChild variant="outline">
              <Link to="/calendar/settings"><SettingsIcon className="size-4 mr-1.5" /> Settings</Link>
            </Button>
          }
        />
        {!isLoading && !profile && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">You haven't set up your booking profile yet.</p>
            <Button asChild><Link to="/calendar/settings">Set up calendar</Link></Button>
          </div>
        )}
        {profile && (
          <>
            <CalendarStatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1"><BookingLinkCard /></div>
              <div className="lg:col-span-2"><UpcomingMeetingsTable /></div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
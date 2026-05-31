import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettingsCard } from "../components/ProfileSettingsCard";
import { BookingPreferencesCard } from "../components/BookingPreferencesCard";
import { WorkingHoursEditor } from "../components/WorkingHoursEditor";
import { BreaksEditor } from "../components/BreaksEditor";
import { MeetingTypesEditor } from "../components/MeetingTypesEditor";
import { UnavailableDatesEditor } from "../components/UnavailableDatesEditor";

export default function CalendarSettings() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <PageHeader title="Calendar settings" description="Configure your booking profile, availability, and preferences." />
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="meetings">Meeting types</TabsTrigger>
            <TabsTrigger value="blocked">Blocked dates</TabsTrigger>
            <TabsTrigger value="prefs">Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-4"><ProfileSettingsCard /></TabsContent>
          <TabsContent value="availability" className="mt-4 space-y-4">
            <WorkingHoursEditor />
            <BreaksEditor />
          </TabsContent>
          <TabsContent value="meetings" className="mt-4"><MeetingTypesEditor /></TabsContent>
          <TabsContent value="blocked" className="mt-4"><UnavailableDatesEditor /></TabsContent>
          <TabsContent value="prefs" className="mt-4"><BookingPreferencesCard /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
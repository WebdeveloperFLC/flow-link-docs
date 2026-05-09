import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { BrowserPhoneProvider } from "@/contexts/BrowserPhoneContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Templates from "./pages/Templates";
import LetterTemplates from "./pages/LetterTemplates";
import Activity from "./pages/Activity";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import TeamAccess from "./pages/TeamAccess";
import Masters from "./pages/Masters";
import Verification from "./pages/Verification";
import FormsLibrary from "./pages/FormsLibrary";
import FormBuilder from "./pages/FormBuilder";
import QuestionnaireEmailTemplates from "./pages/QuestionnaireEmailTemplates";
import TelephonySettings from "./pages/TelephonySettings";
import TelephonyIntegrationSettings from "./pages/TelephonyIntegrationSettings";
import SharedView from "./pages/SharedView";
import Questionnaire from "./pages/Questionnaire";
import CourseFinder from "./pages/CourseFinder";
import Messages from "./pages/Messages";
import Telecaller from "./pages/Telecaller";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { PortalProtectedRoute } from "@/components/portal/PortalProtectedRoute";
import PortalAuth from "./pages/portal/PortalAuth";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalApplication from "./pages/portal/PortalApplication";
import PortalFiles from "./pages/portal/PortalFiles";
import PortalChat from "./pages/portal/PortalChat";
import PortalOffers from "./pages/portal/PortalOffers";
import PortalRefer from "./pages/portal/PortalRefer";
import PortalPayments from "./pages/portal/PortalPayments";
import PortalAppointments from "./pages/portal/PortalAppointments";
import PortalNotifications from "./pages/portal/PortalNotifications";
import PortalSettings from "./pages/portal/PortalSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrowserPhoneProvider>
          <CallProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/share/:token" element={<SharedView />} />
            <Route path="/questionnaire/:token" element={<Questionnaire />} />
            <Route path="/course-finder" element={<CourseFinder />} />
            <Route path="/portal/auth" element={<PortalAuth />} />
            <Route path="/portal" element={<PortalProtectedRoute><PortalDashboard /></PortalProtectedRoute>} />
            <Route path="/portal/application" element={<PortalProtectedRoute><PortalApplication /></PortalProtectedRoute>} />
            <Route path="/portal/files" element={<PortalProtectedRoute><PortalFiles /></PortalProtectedRoute>} />
            <Route path="/portal/chat" element={<PortalProtectedRoute><PortalChat /></PortalProtectedRoute>} />
            <Route path="/portal/offers" element={<PortalProtectedRoute><PortalOffers /></PortalProtectedRoute>} />
            <Route path="/portal/refer" element={<PortalProtectedRoute><PortalRefer /></PortalProtectedRoute>} />
            <Route path="/portal/payments" element={<PortalProtectedRoute><PortalPayments /></PortalProtectedRoute>} />
            <Route path="/portal/appointments" element={<PortalProtectedRoute><PortalAppointments /></PortalProtectedRoute>} />
            <Route path="/portal/notifications" element={<PortalProtectedRoute><PortalNotifications /></PortalProtectedRoute>} />
            <Route path="/portal/settings" element={<PortalProtectedRoute><PortalSettings /></PortalProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/telecaller" element={<ProtectedRoute><Telecaller /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/letter-templates" element={<ProtectedRoute><LetterTemplates /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/team-access" element={<ProtectedRoute><TeamAccess /></ProtectedRoute>} />
            <Route path="/masters" element={<ProtectedRoute><Masters /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
            <Route path="/forms-library" element={<ProtectedRoute><FormsLibrary /></ProtectedRoute>} />
            <Route path="/forms-library/:formId/build" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
            <Route path="/settings/questionnaire-emails" element={<ProtectedRoute><QuestionnaireEmailTemplates /></ProtectedRoute>} />
            <Route path="/settings/telephony" element={<ProtectedRoute><TelephonySettings /></ProtectedRoute>} />
            <Route path="/settings/telephony-integration" element={<ProtectedRoute><TelephonyIntegrationSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CallProvider>
          </BrowserPhoneProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

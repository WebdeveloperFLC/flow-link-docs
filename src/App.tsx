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
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
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

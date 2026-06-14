import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import "./index.css";
import "./styles/performance-hub-theme.css";
import "./hr-payroll/styles/hr-payroll-theme.css";

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);

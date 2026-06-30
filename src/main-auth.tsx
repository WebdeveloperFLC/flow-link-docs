import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MinimalAuthPage from "@/MinimalAuthPage";

const mount = document.getElementById("root");
if (!mount) throw new Error("Missing #root element");

createRoot(mount).render(
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<MinimalAuthPage />} />
      <Route path="/reset-password" element={<Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  </BrowserRouter>,
);

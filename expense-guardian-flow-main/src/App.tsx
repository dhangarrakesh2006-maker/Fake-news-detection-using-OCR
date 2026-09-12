import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Reports from "./pages/Reports.tsx";
import AnalyzeArticle from "./pages/AnalyzeArticle.tsx";
import ScanHistory from "./pages/ScanHistory.tsx";
import SourceGuide from "./pages/SourceGuide.tsx";
import UserPanel from "./pages/UserPanel.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import SettingsPage from "./pages/Settings.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><AnalyzeArticle /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><ScanHistory /></ProtectedRoute>} />
            <Route path="/sources" element={<ProtectedRoute><SourceGuide /></ProtectedRoute>} />
            <Route path="/user-panel" element={<ProtectedRoute><UserPanel /></ProtectedRoute>} />
            <Route path="/admin-panel" element={<ProtectedRoute allowedRoles={["admin", "ceo"]}><AdminPanel /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={["manager", "admin", "ceo"]}><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

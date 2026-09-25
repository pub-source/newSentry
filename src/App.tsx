import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Household from "./pages/Household";
import Research from "./pages/Research";
import Monitoring from "./pages/Monitoring";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<RequireAuth><Index /></RequireAuth>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/join/:code" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/household" element={<RequireAuth><Household /></RequireAuth>} />
          <Route path="/monitoring" element={<RequireAuth><Monitoring /></RequireAuth>} />
          <Route path="/cameras" element={<Navigate to="/monitoring" replace />} />
          <Route path="/research" element={<RequireAuth><Research /></RequireAuth>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

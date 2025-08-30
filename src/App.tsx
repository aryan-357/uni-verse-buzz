import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Explore from "./pages/Explore";
import Messages from "./pages/Messages";
import Communities from "./pages/Communities";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import EnhancedModeration from "./pages/EnhancedModeration";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import UserProfilePage from "./pages/UserProfilePage";
import CommunityPage from "./pages/CommunityPage";
import Announcements from "./pages/Announcements";
import OfficialAnnouncements from "./pages/OfficialAnnouncements";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/explore" element={<Layout><Explore /></Layout>} />
            <Route path="/messages" element={<Layout><Messages /></Layout>} />
            <Route path="/communities" element={<Layout><Communities /></Layout>} />
            <Route path="/community/:id" element={<Layout><CommunityPage /></Layout>} />
            <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
            <Route path="/official" element={<Layout><OfficialAnnouncements /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
            <Route path="/moderation" element={<Layout><EnhancedModeration /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/profile/:userId" element={<Layout><UserProfilePage /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;


import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// IconPark styles are imported in index.css
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import AppSidebar from "./components/sidebar/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pomodoro from "./pages/Pomodoro";
import Settings from "./pages/Settings";
import SearchResults from "./pages/SearchResults";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { TaskProvider } from "@/contexts/task";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import AuthRoute from "@/components/AuthRoute";
import AuthCallback from "@/pages/AuthCallback";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <ProjectProvider>
              <TaskProvider>
                <SidebarProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route element={<AuthRoute />}>
                      <Route
                        path="/"
                        element={
                          <div className="flex h-screen overflow-hidden">
                            <AppSidebar />
                            <div className="flex-1 overflow-hidden">
                              <Index />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/pomodoro"
                        element={
                          <div className="flex h-screen overflow-hidden">
                            <AppSidebar />
                            <div className="flex-1 overflow-hidden">
                              <Pomodoro />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <div className="flex h-screen overflow-hidden">
                            <AppSidebar />
                            <div className="flex-1 overflow-hidden">
                              <Settings />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/search"
                        element={
                          <div className="flex h-screen overflow-hidden">
                            <AppSidebar />
                            <div className="flex-1 overflow-hidden">
                              <SearchResults />
                            </div>
                          </div>
                        }
                      />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SidebarProvider>
              </TaskProvider>
            </ProjectProvider>
          </AuthProvider>
        </TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

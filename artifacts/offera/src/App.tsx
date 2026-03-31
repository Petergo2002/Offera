import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useAuth, AuthProvider } from "@/components/auth-provider";
import { Layout } from "@/components/layout";
import { ConfirmationProvider } from "@/components/ui/custom-confirm";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Archive from "./pages/archive";
import AuthPage from "./pages/auth";
import ProposalBuilder from "./pages/builder";
import DashboardPage from "./pages/dashboard";
import LandingPage from "./pages/landing";
import NotFound from "./pages/not-found";
import PublicProposal from "./pages/public-proposal";
import SettingsPage from "./pages/settings";
import TemplateBuilderPage from "./pages/template-builder";
import TemplatesPage from "./pages/templates";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  const { companyProfile, isAuthenticated, isLoading } = useAuth();

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AuthAwareRouter
        companyProfile={companyProfile}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
      />
    </WouterRouter>
  );
}

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function isCompanyProfileComplete(
  companyProfile:
    | ReturnType<typeof useAuth>["companyProfile"]
    | null
    | undefined,
) {
  return Boolean(
    companyProfile?.companyName.trim() && companyProfile?.email.trim(),
  );
}

function AuthAwareRouter({
  companyProfile,
  isAuthenticated,
  isLoading,
}: {
  companyProfile: ReturnType<typeof useAuth>["companyProfile"];
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  const [location, setLocation] = useLocation();
  const isPublicRoute = location.startsWith("/p/");
  const isAuthRoute = location === "/auth";
  const hasCompletedOnboarding = isCompanyProfileComplete(companyProfile);

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute && !isAuthRoute && location !== "/") {
      setLocation("/auth");
      return;
    }

    if (isAuthenticated && isAuthRoute) {
      setLocation(hasCompletedOnboarding ? "/" : "/settings");
      return;
    }

    if (
      isAuthenticated &&
      !hasCompletedOnboarding &&
      !isPublicRoute &&
      location !== "/settings"
    ) {
      setLocation("/settings");
    }
  }, [
    hasCompletedOnboarding,
    isAuthenticated,
    isAuthRoute,
    isLoading,
    isPublicRoute,
    location,
    setLocation,
  ]);

  if (isLoading && !isPublicRoute) {
    return <AppLoader />;
  }

  // Handle unauthenticated state
  if (!isAuthenticated && !isPublicRoute) {
    // Show landing page on the index route for unauthenticated users
    if (location === "/") {
      return <LandingPage />;
    }
    // Show auth page on /auth route
    if (isAuthRoute) {
      return <AuthPage />;
    }
    // Otherwise redirect to auth
    setLocation("/auth");
    return <AppLoader />;
  }

  if (
    isAuthenticated &&
    !isPublicRoute &&
    (isAuthRoute || (!hasCompletedOnboarding && location !== "/settings"))
  ) {
    return <AppLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Layout>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={DashboardPage} />
          <Route path="/templates" component={TemplatesPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/archive" component={Archive} />

          <Route path="/templates/new" component={TemplateBuilderPage} />
          <Route path="/templates/:id" component={TemplateBuilderPage} />
          <Route path="/proposal/:id" component={ProposalBuilder} />
          <Route path="/p/:slug" component={PublicProposal} />

          <Route component={NotFound} />
        </Switch>
      </Layout>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ConfirmationProvider>
            <Router />
            <Toaster />
          </ConfirmationProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

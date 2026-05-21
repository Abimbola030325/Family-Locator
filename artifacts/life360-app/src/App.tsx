import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@workspace/replit-auth-web";
import { AutoTrackProvider } from "@/context/AutoTrackContext";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Circles from "@/pages/Circles";
import CircleDetail from "@/pages/CircleDetail";
import Places from "@/pages/Places";
import Activity from "@/pages/Activity";
import Profile from "@/pages/Profile";
import Join from "@/pages/Join";
import AppLayout from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login"           component={Login} />
      <Route path="/join/:token"     component={Join} />
      <Route path="/"                component={() => <ProtectedRoute component={Home} />} />
      <Route path="/circles"         component={() => <ProtectedRoute component={Circles} />} />
      <Route path="/circles/:id"     component={() => <ProtectedRoute component={CircleDetail} />} />
      <Route path="/places"          component={() => <ProtectedRoute component={Places} />} />
      <Route path="/activity"        component={() => <ProtectedRoute component={Activity} />} />
      <Route path="/profile"         component={() => <ProtectedRoute component={Profile} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AutoTrackProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AutoTrackProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

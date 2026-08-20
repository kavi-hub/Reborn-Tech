/** Material Trace app shell: a focused, public ITAD landing experience with a future portal entry point. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ClientDashboard from "./pages/ClientDashboard";
import AccessLogin from "./pages/AccessLogin";
import CollectionsManager from "./pages/CollectionsManager";
import BulkItadDash from "./pages/BulkItadDash";
import OperationsDashboard from "./pages/OperationsDashboard";
import { ImpactPage, PrivacyPage, SecurityPage, ServicesPage } from "./pages/TrustPages";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/operations" component={OperationsDashboard} />
      <Route path="/operations/collections" component={CollectionsManager} />
      <Route path="/bulk/itad-dash" component={BulkItadDash} />
      <Route path="/login" component={AccessLogin} />
      <Route path="/portal" component={ClientDashboard} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/impact" component={ImpactPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

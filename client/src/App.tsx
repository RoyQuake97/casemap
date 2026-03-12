import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import LandingPage from "./pages/landing";
import AuthPage from "./pages/auth";
import AppPage from "./pages/app-page";
import PaywallPage from "./pages/paywall";
import PaymentResultPage from "./pages/payment-result";
import NotFound from "./pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/app" component={AppPage} />
      <Route path="/paywall" component={PaywallPage} />
      <Route path="/payment-result" component={PaymentResultPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import SearchPage from "@/pages/search";
import KnowledgeBasePage from "@/pages/knowledge-base";
import AuthPage from "@/pages/auth";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout>
          <Redirect to="/search" />
        </Layout>
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/search">
        <Layout>
          <SearchPage />
        </Layout>
      </Route>
      <Route path="/knowledge-base">
        <Layout>
          <KnowledgeBasePage />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

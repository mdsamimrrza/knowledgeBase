import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import SearchPage from "@/pages/search";
import KnowledgeBasePage from "@/pages/knowledge-base";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <Redirect to="/search" />
        </Route>
        <Route path="/search" component={SearchPage} />
        <Route path="/knowledge-base" component={KnowledgeBasePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

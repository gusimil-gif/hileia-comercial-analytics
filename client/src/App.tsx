import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import ImportCenter from "./pages/ImportCenter";
import Conciliation from "./pages/Conciliation";
import Reports from "./pages/Reports";
import Routes from "./pages/Routes";
import Funds from "./pages/Funds";
import DataQuality from "./pages/DataQuality";
import Audit from "./pages/Audit";
import ClassificationRules from "./pages/ClassificationRules";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout><Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/importacoes"} component={ImportCenter} />
      <Route path={"/conciliacao"} component={Conciliation} />
      <Route path={"/relatorios"} component={Reports} />
      <Route path={"/setores-rotas"} component={Routes} />
      <Route path={"/regras-classificacao"} component={ClassificationRules} />
      <Route path={"/verbas"} component={Funds} />
      <Route path={"/qualidade"} component={DataQuality} />
      <Route path={"/auditoria"} component={Audit} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch></DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

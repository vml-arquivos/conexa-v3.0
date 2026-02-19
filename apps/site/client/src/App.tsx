import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import QuemSomos from "@/pages/QuemSomos";
import Unidades from "@/pages/Unidades";
import UnidadeDetail from "@/pages/UnidadeDetail";
import Projetos from "@/pages/Projetos";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Doacoes from "@/pages/Doacoes";
import Transparencia from "@/pages/Transparencia";
import Contato from "@/pages/Contato";
import Compliance from "@/pages/Compliance";
import TrabalheConosco from "@/pages/TrabalheConosco";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/quem-somos"} component={QuemSomos} />
      <Route path={"/unidades"} component={Unidades} />
      <Route path={"/unidades/:slug"} component={UnidadeDetail} />
      <Route path={"/projetos"} component={Projetos} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogPost} />
      <Route path={"/doacoes"} component={Doacoes} />
      <Route path={"/transparencia"} component={Transparencia} />
      <Route path={"/contato"} component={Contato} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/trabalhe-conosco"} component={TrabalheConosco} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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

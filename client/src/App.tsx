import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { UserRole } from "@shared/schema";
import MainLayout from "@/components/layout/main-layout";

// Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import FormsPage from "@/pages/forms-page";
import FormEditor from "@/pages/form-editor";
import FormCapture from "@/pages/form-capture";
import FormImportPage from "@/pages/form-import-page";
import ReportsPage from "@/pages/reports-page";
import UsersPage from "@/pages/users-page";
import SettingsPage from "@/pages/settings-page";
import CapturedFormsPage from "@/pages/captured-forms-page";
import ProductsPage from "@/pages/products-page-new";
import EmployeesPage from "@/pages/employees-page-new";
import ProductionFormPage from "@/pages/production-form-page";
import ProcessFormsList from "@/pages/process-forms-list";
import DulcesFormPage from "@/pages/dulces-form-page";
import FormViewerPage from "@/pages/form-viewer-page";

// Componente wrapper para rutas protegidas
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}

// Versión modificada del ProtectedRoute que incluye el layout
function ProtectedRouteWithLayout(props: {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles?: UserRole[];
}) {
  return (
    <ProtectedRoute
      path={props.path}
      allowedRoles={props.allowedRoles}
      component={() => (
        <ProtectedLayout>
          <props.component />
        </ProtectedLayout>
      )}
    />
  );
}

function Router() {
  return (
    <Switch>
      <ProtectedRouteWithLayout path="/" component={Dashboard} />
      <ProtectedRouteWithLayout path="/dashboard" component={Dashboard} />
      <ProtectedRouteWithLayout 
        path="/users" 
        component={UsersPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout 
        path="/form-editor" 
        component={FormEditor} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout path="/forms" component={FormsPage} />
      <ProtectedRouteWithLayout 
        path="/form-capture" 
        component={FormCapture} 
        allowedRoles={[UserRole.ADMIN, UserRole.PRODUCTION, UserRole.QUALITY, UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout 
        path="/form-import" 
        component={FormImportPage} 
        allowedRoles={[UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.VIEWER]} 
      />
      <ProtectedRouteWithLayout path="/captured-forms" component={CapturedFormsPage} />
      <ProtectedRouteWithLayout 
        path="/settings" 
        component={SettingsPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout 
        path="/products" 
        component={ProductsPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PRODUCTION_MANAGER]} 
      />
      <ProtectedRouteWithLayout 
        path="/employees" 
        component={EmployeesPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRouteWithLayout 
        path="/production-form/:id" 
        component={ProductionFormPage} 
      />
      <ProtectedRouteWithLayout 
        path="/production-form" 
        component={ProductionFormPage} 
      />
      <ProtectedRouteWithLayout 
        path="/process-forms" 
        component={ProcessFormsList} 
      />
      <ProtectedRouteWithLayout 
        path="/form-viewer/new/19" 
        component={() => <DulcesFormPage />} 
      />
      <ProtectedRouteWithLayout 
        path="/form-viewer/new/:templateId" 
        component={(props: any) => <FormViewerPage params={props.params} />} 
      />
      <ProtectedRouteWithLayout 
        path="/form-viewer/:entryId" 
        component={(props: any) => <DulcesFormPage params={props.params} />} 
      />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Agregar metaetiquetas para optimizar la visualización en dispositivos móviles
  useEffect(() => {
    // Crear o actualizar la metaetiqueta viewport
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Configurar para iPhone y otros dispositivos móviles
    viewportMeta.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    
    // Crear o actualizar metaetiqueta para el color del tema
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    
    themeColorMeta.setAttribute('content', '#2563EB');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import * as React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { UserRole } from "@shared/schema";

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

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute 
        path="/users" 
        component={UsersPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRoute 
        path="/form-editor" 
        component={FormEditor} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <ProtectedRoute path="/forms" component={FormsPage} />
      <ProtectedRoute 
        path="/form-capture" 
        component={FormCapture} 
        allowedRoles={[UserRole.ADMIN, UserRole.PRODUCTION, UserRole.QUALITY, UserRole.SUPERADMIN]} 
      />
      <ProtectedRoute 
        path="/form-import" 
        component={FormImportPage} 
        allowedRoles={[UserRole.SUPERADMIN]} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.VIEWER]} 
      />
      <ProtectedRoute path="/captured-forms" component={CapturedFormsPage} />
      <ProtectedRoute 
        path="/settings" 
        component={SettingsPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]} 
      />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Agregar metaetiquetas para optimizar la visualización en dispositivos móviles
  React.useEffect(() => {
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

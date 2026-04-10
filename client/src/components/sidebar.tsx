import { UserRole } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  PenLine,
  BarChart3,
  Settings,
  LogOut,
  CheckSquare,
  PlusSquare,
  ClipboardCheck,
  Package,
  UserCircle,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import gelagLogo from '@/assets/gelag-logo.png';

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Administrador",
  admin: "Administrador",
  produccion: "Producción",
  calidad: "Calidad",
  gerente_produccion: "Gerente Producción",
  gerente_calidad: "Gerente Calidad",
  viewer: "Visor",
};

export default function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const userRole = user.role.toLowerCase();
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "superadmin";
  const isProduction = userRole === "produccion";
  const isQuality = userRole === "calidad";
  const isProductionManager = userRole === "gerente_produccion";
  const isQualityManager = userRole === "gerente_calidad";
  const isViewer = userRole === "viewer";
  const canCaptureData = isAdmin || isProduction || isQuality || isSuperAdmin || isProductionManager || isQualityManager;

  const navGroups = [
    {
      label: null,
      items: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
      ],
    },
    {
      label: "Gestión",
      items: [
        { title: "Formularios", href: "/forms", icon: FileText, show: true },
        { title: "Formularios de Proceso", href: "/process-forms", icon: ClipboardCheck, show: isAdmin || isSuperAdmin || isProduction || isQuality || isProductionManager || isQualityManager },
        { title: "Capturar Datos", href: "/form-capture", icon: PenLine, show: canCaptureData },
        { title: "Formularios Capturados", href: "/captured-forms", icon: CheckSquare, show: true },
      ],
    },
    {
      label: "Administración",
      items: [
        { title: "Gestión de Usuarios", href: "/users", icon: Users, show: isAdmin || isSuperAdmin || isProductionManager || isQualityManager },
        { title: "Productos", href: "/products", icon: Package, show: isAdmin || isSuperAdmin || isProductionManager },
        { title: "Empleados", href: "/employees", icon: UserCircle, show: isAdmin || isSuperAdmin || isProductionManager || isQualityManager },
        { title: "Crear Formularios", href: "/form-editor", icon: PlusSquare, show: isSuperAdmin },
        { title: "Importar Formularios", href: "/form-import", icon: Upload, show: isSuperAdmin },
        { title: "Reportes", href: "/reports", icon: BarChart3, show: isSuperAdmin || isViewer || isAdmin || isProductionManager || isQualityManager },
        { title: "Configuración", href: "/settings", icon: Settings, show: isAdmin || isSuperAdmin },
      ],
    },
  ];

  const roleLabel = ROLE_LABELS[userRole] || user.role;
  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <aside className={cn("flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm z-10", className)}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100 flex flex-col items-center">
        <img src={gelagLogo} alt="GELAG Logo" className="h-10 mb-2 object-contain" />
        <h1 className="text-sm font-semibold text-primary tracking-wide">GELAG S.A. DE C.V.</h1>
      </div>

      {/* Usuario */}
      <div className="px-4 py-4 border-b border-gray-50 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-full h-9 w-9 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} className="mb-4">
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          isActive
                            ? "bg-primary text-white font-medium shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          className="flex w-full items-center justify-start gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>{logoutMutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
        </Button>
      </div>
    </aside>
  );
}

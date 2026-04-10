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
    <aside className={cn(
      "flex flex-col w-64 z-10",
      "bg-[#E8195A] text-white shadow-xl",
      className
    )}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/20 flex flex-col items-center">
        <div className="bg-white rounded-xl px-3 py-2 mb-2 shadow-sm">
          <img src={gelagLogo} alt="GELAG Logo" className="h-8 object-contain" />
        </div>
        <h1 className="text-xs font-semibold text-white/80 tracking-wider uppercase">GELAG S.A. DE C.V.</h1>
      </div>

      {/* Usuario */}
      <div className="px-4 py-4 border-b border-white/20 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="bg-[#E8891A] rounded-full h-9 w-9 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{user.name}</p>
            <p className="text-xs text-white/70 truncate">{roleLabel}</p>
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
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
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
                            ? "bg-white text-[#E8195A] font-semibold shadow-md"
                            : "text-white/85 hover:bg-white/15 hover:text-white"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-[#E8195A]" : "")} />
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
      <div className="p-3 border-t border-white/20">
        <Button
          variant="ghost"
          size="sm"
          className="flex w-full items-center justify-start gap-3 text-white/80 hover:text-white hover:bg-white/15 transition-colors"
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

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, PenLine, BarChart3,
  Settings, LogOut, Menu, X, PlusSquare, ClipboardCheck,
  CheckSquare, Package, UserCircle, Upload
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import gelagLogo from "@/assets/gelag-logo.png";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Administrador",
  admin: "Administrador",
  produccion: "Producción",
  calidad: "Calidad",
  gerente_produccion: "Gerente Producción",
  gerente_calidad: "Gerente Calidad",
  viewer: "Visor",
};

export default function MobileNav({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const r = user.role.toLowerCase();
  const isAdmin          = r === "admin";
  const isSuperAdmin     = r === "superadmin";
  const isProduction     = r === "produccion";
  const isQuality        = r === "calidad";
  const isProdMgr        = r === "gerente_produccion";
  const isQualMgr        = r === "gerente_calidad";
  const isViewer         = r === "viewer";
  const canCapture       = isAdmin || isSuperAdmin || isProduction || isQuality || isProdMgr || isQualMgr;

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
        { title: "Formularios",             href: "/forms",           icon: FileText,       show: true },
        { title: "Formularios de Proceso",  href: "/process-forms",   icon: ClipboardCheck, show: isAdmin || isSuperAdmin || isProduction || isQuality || isProdMgr || isQualMgr },
        { title: "Capturar Datos",          href: "/form-capture",    icon: PenLine,        show: canCapture },
        { title: "Formularios Capturados",  href: "/captured-forms",  icon: CheckSquare,    show: true },
      ],
    },
    {
      label: "Administración",
      items: [
        { title: "Gestión de Usuarios",    href: "/users",       icon: Users,       show: isAdmin || isSuperAdmin || isProdMgr || isQualMgr },
        { title: "Productos",              href: "/products",    icon: Package,     show: isAdmin || isSuperAdmin || isProdMgr },
        { title: "Empleados",              href: "/employees",   icon: UserCircle,  show: isAdmin || isSuperAdmin || isProdMgr || isQualMgr },
        { title: "Crear Formularios",      href: "/form-editor", icon: PlusSquare,  show: isSuperAdmin },
        { title: "Importar Formularios",   href: "/form-import", icon: Upload,      show: isSuperAdmin },
        { title: "Reportes",               href: "/reports",     icon: BarChart3,   show: isSuperAdmin || isViewer || isAdmin || isProdMgr || isQualMgr },
        { title: "Configuración",          href: "/settings",    icon: Settings,    show: isAdmin || isSuperAdmin },
      ],
    },
  ];

  const roleLabel = ROLE_LABELS[r] || user.role;
  const initials  = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const close = () => setOpen(false);

  return (
    <div className={cn("md:hidden sticky top-0 z-50 w-full shadow-md", className)}>
      <div className="flex items-center justify-between px-4 py-3 bg-[#E8195A]">
        <div className="flex items-center gap-2">
          <img src={gelagLogo} alt="GELAG" className="h-7 w-auto object-contain brightness-0 invert" />
          <span className="text-white font-bold tracking-wide text-base">GELAG</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="p-0 w-[280px] bg-[#E8195A] border-none flex flex-col h-full">

            {/* Cabecera del menú */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <img src={gelagLogo} alt="GELAG" className="h-7 w-auto object-contain brightness-0 invert" />
                <span className="text-white font-bold tracking-wide">GELAG</span>
              </div>
              <button onClick={close} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Usuario */}
            <div className="px-4 py-3 bg-black/15 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-[#E8891A] rounded-full h-9 w-9 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-white/60 text-xs truncate">{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Navegación — con scroll */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {navGroups.map((group, gi) => {
                const visible = group.items.filter(i => i.show);
                if (visible.length === 0) return null;
                return (
                  <div key={gi} className="mb-4">
                    {group.label && (
                      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45">
                        {group.label}
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {visible.map(item => {
                        const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={close}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                                isActive
                                  ? "bg-white text-[#E8195A] font-semibold shadow-sm"
                                  : "text-white/85 hover:bg-white/15 hover:text-white"
                              )}
                            >
                              <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-[#E8195A]" : "")} />
                              <span>{item.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>

            {/* Cerrar sesión */}
            <div className="px-3 py-4 border-t border-white/20 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="flex w-full items-center justify-start gap-3 text-white/80 hover:text-white hover:bg-white/15"
                onClick={() => { logoutMutation.mutate(); close(); }}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span>{logoutMutation.isPending ? "Cerrando..." : "Cerrar sesión"}</span>
              </Button>
            </div>

          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

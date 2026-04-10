import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserRole } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  PenLine,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PlusSquare
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface MobileNavProps {
  className?: string;
}

export default function MobileNav({ className }: MobileNavProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return null;
  }

  // Usamos strings directamente para comparar los roles, normalizando a minúsculas para evitar problemas
  const userRole = user.role.toLowerCase();
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "superadmin";
  const isProduction = userRole === "produccion";
  const isQuality = userRole === "calidad";
  const isProductionManager = userRole === "gerente_produccion";
  const isQualityManager = userRole === "gerente_calidad";
  const isViewer = userRole === "viewer";
  const canCaptureData = isAdmin || isSuperAdmin || isProduction || isQuality || isProductionManager || isQualityManager;

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Gestión de Usuarios",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      show: isAdmin || isSuperAdmin,
    },
    {
      title: "Crear Formularios",
      href: "/form-editor",
      icon: <PlusSquare className="h-5 w-5" />,
      show: isSuperAdmin,
    },
    {
      title: "Formularios",
      href: "/forms",
      icon: <FileText className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Formularios de Proceso",
      href: "/process-forms",
      icon: <FileText className="h-5 w-5" />,
      show: isAdmin || isSuperAdmin || isProduction || isQuality,
    },
    {
      title: "Capturar Datos",
      href: "/form-capture",
      icon: <PenLine className="h-5 w-5" />,
      show: canCaptureData,
    },
    {
      title: "Reportes",
      href: "/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      show: isSuperAdmin || isViewer,
    },
    {
      title: "Configuración",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      show: isAdmin || isSuperAdmin,
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
    setOpen(false);
  };

  // Handle navigation closure after navigation
  const handleNavigation = () => {
    setOpen(false);
  };

  return (
    <div className={cn("md:hidden sticky top-0 z-50 w-full", className)}>
      <div className="flex items-center justify-between p-4 bg-[#E8195A] text-white shadow-md">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-xl font-semibold tracking-wide">GELAG</h1>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#E8195A] border-none">
            <div className="p-4 border-b border-white/20 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white">
                <FileText className="h-5 w-5" />
                <h1 className="text-xl font-semibold">GELAG</h1>
              </div>
              <X 
                className="h-5 w-5 cursor-pointer text-white"
                onClick={() => setOpen(false)}
              />
            </div>
            
            <div className="p-4 bg-black/10 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="bg-[#E8891A] rounded-full h-10 w-10 flex items-center justify-center text-white font-bold shadow-md">
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-sm text-white/70">{user.role}</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-2">
              <ul>
                {navItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <li key={item.href} className="mt-1">
                      <Link href={item.href}>
                        <a
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg transition-all",
                            location === item.href
                              ? "bg-white text-[#E8195A] font-semibold shadow-md"
                              : "text-white/85 hover:bg-white/15"
                          )}
                          onClick={handleNavigation}
                        >
                          <span className={location === item.href ? "text-[#E8195A]" : "text-white/85"}>
                            {item.icon}
                          </span>
                          <span>{item.title}</span>
                        </a>
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
            
            <div className="p-4 border-t border-white/20">
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start space-x-2 text-white/80 hover:text-white hover:bg-white/15"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar sesión</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

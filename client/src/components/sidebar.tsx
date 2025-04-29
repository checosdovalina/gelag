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
  PlusSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === UserRole.ADMIN;
  const isProduction = user.role === UserRole.PRODUCTION;
  const isQuality = user.role === UserRole.QUALITY;
  const canCaptureData = isAdmin || isProduction || isQuality;

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
      show: isAdmin,
    },
    {
      title: "Crear Formularios",
      href: "/form-editor",
      icon: <PlusSquare className="h-5 w-5" />,
      show: isAdmin,
    },
    {
      title: "Formularios",
      href: "/forms",
      icon: <FileText className="h-5 w-5" />,
      show: true,
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
      show: true,
    },
    {
      title: "Configuración",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      show: isAdmin,
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn("flex flex-col w-64 bg-white shadow-md z-10", className)}>
      <div className="p-4 bg-primary text-white flex items-center space-x-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-xl font-medium">FormCapture</h1>
      </div>
      
      <div className="p-4 bg-neutral-50">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-full h-10 w-10 flex items-center justify-center text-white">
            <span className="font-medium">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-neutral-500">{user.role}</p>
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
                      "flex items-center space-x-3 p-3 rounded-md hover:bg-neutral-100",
                      location === item.href && "bg-blue-50 border-l-4 border-primary"
                    )}
                  >
                    <span className={cn("text-primary", location === item.href ? "text-primary" : "text-gray-500")}>
                      {item.icon}
                    </span>
                    <span className={cn(location === item.href ? "font-medium" : "")}>
                      {item.title}
                    </span>
                  </a>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start space-x-2 text-neutral-700 hover:text-primary"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar sesión</span>
        </Button>
      </div>
    </aside>
  );
}

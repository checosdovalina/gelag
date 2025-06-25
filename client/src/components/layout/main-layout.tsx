import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Home,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  FileStack,
  Blocks
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Determinar si el usuario tiene permisos para acceder a funcionalidades específicas
  const canCreateForms = user && ["superadmin"].includes(user.role);
  const canAccessForms = user && ["superadmin", "admin", "produccion", "gerente_produccion", "calidad", "gerente_calidad", "viewer"].includes(user.role);
  const canAccessProcessForms = user && ["superadmin", "admin", "produccion", "gerente_produccion", "calidad", "gerente_calidad"].includes(user.role);
  const canAccessEmployees = user && ["superadmin", "admin", "gerente_produccion", "gerente_calidad"].includes(user.role);
  const canAccessProducts = user && ["superadmin", "admin"].includes(user.role);
  const canAccessExports = user && ["superadmin", "admin"].includes(user.role);
  const canAccessUsers = user && ["superadmin", "admin"].includes(user.role);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/">
              <span className="text-lg font-bold">FormBuilder</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-2">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Inicio
                </Link>
              </Button>
              
              {canAccessForms && (
                <Button
                  variant={isActive("/forms") ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href="/forms">
                    <FileText className="mr-2 h-4 w-4" />
                    Formularios
                  </Link>
                </Button>
              )}
              
              {canAccessProcessForms && (
                <Button
                  variant={isActive("/process-forms") ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href="/process-forms">
                    <Blocks className="mr-2 h-4 w-4" />
                    Formularios de Proceso
                  </Link>
                </Button>
              )}

              {canAccessProcessForms && (
                <Button
                  variant={isActive("/form-viewer/new/19") ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href="/form-viewer/new/19">
                    <FileText className="mr-2 h-4 w-4" />
                    Ficha Técnica Dulces
                  </Link>
                </Button>
              )}

              {canAccessEmployees && (
                <Button
                  variant={isActive("/employees") ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href="/employees">
                    <Users className="mr-2 h-4 w-4" />
                    Empleados
                  </Link>
                </Button>
              )}
              
              {canAccessExports && (
                <Button
                  variant={isActive("/exports") ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href="/exports">
                    <FileStack className="mr-2 h-4 w-4" />
                    Exportaciones
                  </Link>
                </Button>
              )}
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {user.name || user.username}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuItem disabled>
                      Rol: {user.role}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {canAccessUsers && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/users">
                            <Users className="mr-2 h-4 w-4" />
                            Usuarios
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
        {children}
      </main>
      <footer className="border-t py-4 bg-background">
        <div className="container flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FormBuilder. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
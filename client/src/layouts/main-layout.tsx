import { ReactNode, useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const { isLoading } = useAuth();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    setCurrentDate(new Date().toLocaleDateString('es-ES', options));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar — solo en escritorio */}
      <Sidebar className="hidden md:flex" />

      {/* Columna derecha: barra móvil arriba + contenido */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Barra de navegación móvil */}
        <MobileNav />

        {/* Contenido de la página */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50">
          <div className="p-4 md:p-6">
            {title && (
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-medium text-neutral-800">{title}</h1>
                <span className="text-sm text-neutral-400 mt-1 md:mt-0">{currentDate}</span>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

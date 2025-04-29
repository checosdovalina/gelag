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
    // Set current date in Spanish format
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const formattedDate = new Date().toLocaleDateString('es-ES', options);
    setCurrentDate(formattedDate);
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
      {/* Sidebar - Desktop */}
      <Sidebar className="hidden md:flex" />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50 pb-16 md:pb-0">
        <div className="md:p-6 p-4 mt-16 md:mt-0">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h1 className="text-2xl font-medium text-neutral-800">{title}</h1>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <span className="text-neutral-500">{currentDate}</span>
            </div>
          </div>
          
          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}

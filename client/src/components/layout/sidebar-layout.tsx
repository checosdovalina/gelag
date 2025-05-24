import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";

interface SidebarLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function SidebarLayout({ children, title }: SidebarLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64 flex-shrink-0" />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
import React from "react";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const SidebarLayout = ({ children, className }: SidebarLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top spacing */}
        <div className="lg:hidden h-16" />

        {/* Scrollable content area */}
        <main className={cn("flex-1 overflow-y-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;

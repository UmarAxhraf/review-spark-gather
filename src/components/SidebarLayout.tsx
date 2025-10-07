import React from "react";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const SidebarLayout = ({ children, className }: SidebarLayoutProps) => {
  return (
    <div className="fixed inset-0 flex bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile top spacing */}
        <div className="lg:hidden h-16" />

        {/* Scrollable content area */}
        <main
          className={cn("flex-1 overflow-y-auto overflow-x-auto", className)}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;

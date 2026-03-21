import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { NetworkStatusBanner } from "./NetworkStatusBanner";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <NetworkStatusBanner />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

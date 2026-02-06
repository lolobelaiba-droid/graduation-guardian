import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Printer,
  Activity,
  Settings,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "لوحة التحكم", icon: LayoutDashboard, path: "/" },
  { title: "قاعدة بيانات طلبة الدكتوراه", icon: Database, path: "/phd-students" },
  { title: "إدارة الطلاب", icon: Users, path: "/students" },
  { title: "إدارة القوالب", icon: FileText, path: "/templates" },
  { title: "طباعة الشهادات", icon: Printer, path: "/print" },
  { title: "سجل الأنشطة", icon: Activity, path: "/activity" },
  { title: "الإعدادات", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 right-0 h-screen bg-sidebar text-sidebar-foreground z-50 transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold">نظام الشهادات</h1>
                <p className="text-xs text-sidebar-foreground/60">الجامعية الذكي</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-pulse-subtle")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.title}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-200 rotate-180",
                        isActive && "rotate-90"
                      )}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Button - Desktop Only */}
        <div className="hidden md:block p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                isCollapsed ? "rotate-180" : ""
              )}
            />
            {!isCollapsed && <span className="mr-2">طي القائمة</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}

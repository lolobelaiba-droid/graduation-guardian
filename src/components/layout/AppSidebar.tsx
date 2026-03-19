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
  StickyNote,
  BarChart3,
  Scale,
  Wifi,
  WifiOff,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadNotesCount } from "@/hooks/useNotes";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "لوحة التحكم", icon: LayoutDashboard, path: "/" },
  { title: "قاعدة بيانات طلبة الدكتوراه", icon: Database, path: "/phd-students" },
  { title: "طلبة في طور المناقشة", icon: Scale, path: "/defense-stage" },
  { title: "إدارة الطلبة المناقشين", icon: Users, path: "/students" },
  { title: "طباعة الشهادات", icon: Printer, path: "/print" },
  { title: "إدارة القوالب", icon: FileText, path: "/templates" },
  { title: "تقرير الأداء", icon: BarChart3, path: "/reports" },
  { title: "سجل الأنشطة", icon: Activity, path: "/activity" },
  { title: "سجل الملاحظات", icon: StickyNote, path: "/notes" },
  { title: "الإعدادات", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { data: unreadCount = 0 } = useUnreadNotesCount();
  const { data: networkInfo } = useNetworkInfo();

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
          "fixed md:sticky top-0 right-0 h-screen z-50 transition-all duration-300 ease-in-out flex flex-col",
          "bg-sidebar/80 backdrop-blur-xl border-l border-sidebar-border/50",
          "shadow-[inset_-1px_0_0_0_hsl(var(--sidebar-border)/0.3)]",
          isCollapsed ? "w-[72px]" : "w-64",
          isMobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="p-5 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-xl bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0 transition-all duration-300",
              isCollapsed ? "w-10 h-10" : "w-11 h-11"
            )}>
              <GraduationCap className="h-6 w-6 text-sidebar-primary" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-base font-bold text-sidebar-foreground">نظام إدارة</h1>
                <p className="text-[11px] text-sidebar-foreground/50 font-medium">طلبة الدكتوراه</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isNotesItem = item.path === "/notes";
            const showBadge = isNotesItem && unreadCount > 0;
            
            return (
              <Tooltip key={item.path} delayDuration={isCollapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_20px_hsl(var(--sidebar-primary)/0.35)]"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                      )} />
                      {showBadge && isCollapsed && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-ping" />
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className={cn(
                          "flex-1 text-sm font-medium truncate",
                          isActive ? "text-sidebar-primary-foreground" : ""
                        )}>{item.title}</span>
                        {showBadge && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="left" className="text-xs font-medium">
                    {item.title}
                    {showBadge && <span className="mr-1 text-destructive">({unreadCount})</span>}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Network Status + Collapse Button */}
        <div className="hidden md:block px-3 pb-4 pt-2 border-t border-sidebar-border/30 space-y-2">
          {/* Network Status Indicator */}
          {networkInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors",
                  networkInfo.isNetwork 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-sidebar-accent/30 text-sidebar-foreground/50"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    networkInfo.isNetwork 
                      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" 
                      : "bg-sidebar-foreground/30"
                  )} />
                  {networkInfo.isNetwork ? (
                    <Wifi className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  {!isCollapsed && (
                    <span className="font-medium truncate">
                      {networkInfo.isNetwork ? "وضع الشبكة" : "وضع محلي"}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="font-semibold">{networkInfo.isNetwork ? "متصل بالشبكة المشتركة" : "وضع محلي (جهاز واحد)"}</p>
                <p className="text-muted-foreground">الجهاز: {networkInfo.hostname}</p>
                <p className="text-muted-foreground">IP: {networkInfo.ip}</p>
                {networkInfo.sharedPath && (
                  <p className="text-muted-foreground truncate max-w-[200px]">المسار: {networkInfo.sharedPath}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 h-9 rounded-lg"
          >
            {isCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelRightClose className="h-4 w-4" />
                <span className="mr-2 text-xs">طي القائمة</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

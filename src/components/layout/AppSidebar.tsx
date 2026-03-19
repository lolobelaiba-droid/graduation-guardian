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
  GraduationCap,
  Menu,
  X,
  Database,
  StickyNote,
  BarChart3,
  Scale,
  Wifi,
  WifiOff,
  LogOut,
  ChevronDown,
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
  { title: "إدارة القوالب", icon: FileText, path: "/templates", hasChevron: true },
  { title: "تقرير الأداء", icon: BarChart3, path: "/reports", hasChevron: true },
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
          "fixed md:sticky top-0 right-0 h-screen z-50 transition-all duration-300 ease-in-out flex flex-col sidebar-glass",
          isCollapsed ? "w-[76px]" : "w-[270px]",
          isMobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section - Centered */}
        <div className={cn("pt-7 pb-5 flex flex-col items-center gap-3 border-b border-white/[0.06]", isCollapsed && "pt-5 pb-4")}>
          <div className={cn(
            "rounded-2xl bg-white/[0.08] flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/[0.08]",
            isCollapsed ? "w-10 h-10" : "w-14 h-14"
          )}>
            <GraduationCap className={cn("text-white/90", isCollapsed ? "h-5 w-5" : "h-7 w-7")} />
          </div>
          {!isCollapsed && (
            <div className="text-center animate-fade-in">
              <h1 className="text-[15px] font-bold text-white/95 leading-tight">نظام إدارة طلبة الدكتوراه</h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scrollbar">
          {menuItems.map((item) => {
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
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "sidebar-active-glow"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive ? "text-white" : "text-white/50 group-hover:text-white/70"
                      )} />
                      {showBadge && isCollapsed && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-ping" />
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className={cn(
                          "flex-1 text-[15px] font-medium transition-colors",
                          isActive ? "text-white" : "text-white/55 group-hover:text-white/80"
                        )}>{item.title}</span>
                        {showBadge && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                            {unreadCount}
                          </span>
                        )}
                        {item.hasChevron && (
                          <ChevronDown className="h-3.5 w-3.5 text-white/25" />
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

        {/* Bottom Section */}
        <div className="hidden md:block px-3 pb-4 pt-2 border-t border-white/[0.06] space-y-2">
          {/* Network Status */}
          {networkInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs transition-colors",
                  networkInfo.isNetwork 
                    ? "bg-green-500/[0.08] text-green-400/80" 
                    : "text-white/30"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    networkInfo.isNetwork 
                      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" 
                      : "bg-white/20"
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

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-all text-xs"
          >
            <LogOut className={cn("h-4 w-4 flex-shrink-0 transition-transform", isCollapsed && "rotate-180")} />
            {!isCollapsed && <span className="font-medium">طي القائمة</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

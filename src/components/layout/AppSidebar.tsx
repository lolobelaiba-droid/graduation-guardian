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
  Search,
  LogOut,
  Shield,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUnreadNotesCount } from "@/hooks/useNotes";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "لوحة التحكم", icon: LayoutDashboard, path: "/" },
  { title: "قاعدة بيانات طلبة الدكتوراه", icon: Database, path: "/phd-students" },
  { title: "طلبة في طور المناقشة", icon: Scale, path: "/defense-stage" },
  { title: "إدارة الطلبة المناقشين", icon: Users, path: "/students" },
  { title: "طباعة الشهادات", icon: Printer, path: "/print" },
  { title: "إدارة القوالب", icon: FileText, path: "/templates" },
  { title: "تقرير الأداء", icon: BarChart3, path: "/reports" },
  { title: "مستعرض البيانات", icon: Search, path: "/data-explorer" },
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
  const { currentUser, isAdmin, logout } = useAuth();

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
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-sm font-bold leading-tight">نظام إدارة</h1>
                <p className="text-[10px] text-sidebar-foreground/60">طلبة الدكتوراه</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isNotesItem = item.path === "/notes";
            const showBadge = isNotesItem && unreadCount > 0;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative">
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-pulse-subtle")} />
                  {showBadge && isCollapsed && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-ping" />
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.title}</span>
                    {showBadge && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full animate-pulse">
                        {unreadCount}
                      </span>
                    )}
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

        {/* User Info + Network Status + Collapse Button */}
        <div className="hidden md:block p-4 border-t border-sidebar-border space-y-3">
          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {currentUser.avatar_url ? (
                  <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
                ) : (
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                    {currentUser.role === "admin" ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <UserCog className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                )}
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.display_name}</p>
                  <p className="text-xs text-sidebar-foreground/60">
                    {currentUser.role === "admin" ? "مدير" : "موظف"}
                  </p>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Network Status Indicator */}
          {networkInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                  networkInfo.isNetwork 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-sidebar-accent text-sidebar-foreground/60"
                )}>
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    networkInfo.isNetwork 
                      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" 
                      : "bg-muted-foreground/40"
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

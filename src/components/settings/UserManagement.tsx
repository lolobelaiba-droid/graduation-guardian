import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { useAuth, AppUser } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Edit2, Trash2, Shield, UserCog, Lock, Eye, EyeOff, Info, Check, X, ImagePlus, XCircle, User, GraduationCap, Briefcase, BookOpen, Monitor, HeartHandshake, Star, Smile, History, AlertTriangle, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UsageGuideDialog, { userManagementGuide } from "./UsageGuideDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useActivityLog, activityTypeLabels } from "@/hooks/useActivityLog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface UserFormData {
  username: string;
  display_name: string;
  password: string;
  role: "admin" | "employee";
  avatar_url?: string | null;
  custom_permissions?: Record<string, boolean> | null;
}

/** تنسيق التاريخ بصيغة DD/MM/YYYY */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "لم يسجل دخول";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "لم يسجل دخول";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "لم يسجل دخول";
  }
}

/** الصلاحيات القابلة للتخصيص */
const CUSTOMIZABLE_PERMISSIONS = [
  { key: "delete", label: "حذف السجلات", defaultEmployee: false },
  { key: "manage_users", label: "إدارة المستخدمين", defaultEmployee: false },
  { key: "manage_settings", label: "تعديل الإعدادات العامة", defaultEmployee: false },
  { key: "manage_templates", label: "إدارة القوالب (حذف)", defaultEmployee: false },
  { key: "bulk_cleanup", label: "تنظيف البيانات الجماعي", defaultEmployee: false },
  { key: "restore_backup", label: "استعادة النسخ الاحتياطية", defaultEmployee: false },
  { key: "manage_network", label: "إدارة الشبكة", defaultEmployee: false },
  { key: "change_app_password", label: "تغيير كلمة مرور التطبيق", defaultEmployee: false },
];

/** الصلاحيات الثابتة (متاحة للجميع) */
const FIXED_PERMISSIONS = [
  { name: "عرض البيانات", allowed: true },
  { name: "إضافة سجلات", allowed: true },
  { name: "تعديل السجلات", allowed: true },
  { name: "تصدير واستيراد", allowed: true },
  { name: "طباعة الشهادات", allowed: true },
];

/** صلاحيات كل دور */
const ROLE_PERMISSIONS = {
  admin: {
    label: "مدير - صلاحيات كاملة",
    permissions: [
      ...FIXED_PERMISSIONS,
      ...CUSTOMIZABLE_PERMISSIONS.map(p => ({ name: p.label, allowed: true })),
    ],
  },
  employee: {
    label: "موظف - صلاحيات محدودة",
    permissions: [
      ...FIXED_PERMISSIONS,
      ...CUSTOMIZABLE_PERMISSIONS.map(p => ({ name: p.label, allowed: p.defaultEmployee })),
    ],
  },
};

/** أفاتارات افتراضية */
function makeAvatarSvg(color: string, iconPath: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${color}"/><g transform="translate(32,32)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</g></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const DEFAULT_AVATARS = [
  { id: "user", label: "مستخدم", icon: User, color: "#6366f1", svg: makeAvatarSvg("#6366f1", '<path d="M32 36c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12z"/><path d="M8 58c0-13.3 10.7-24 24-24s24 10.7 24 24"/>') },
  { id: "grad", label: "أكاديمي", icon: GraduationCap, color: "#8b5cf6", svg: makeAvatarSvg("#8b5cf6", '<path d="M2 24l30-12 30 12-30 12z"/><path d="M8 28v16c0 0 10 8 24 8s24-8 24-8V28"/><path d="M56 26v20"/>') },
  { id: "brief", label: "إداري", icon: Briefcase, color: "#0891b2", svg: makeAvatarSvg("#0891b2", '<rect x="4" y="16" width="56" height="40" rx="4"/><path d="M20 16V8a4 4 0 014-4h16a4 4 0 014 4v8"/>') },
  { id: "book", label: "باحث", icon: BookOpen, color: "#059669", svg: makeAvatarSvg("#059669", '<path d="M4 4v52c0 0 8-4 28-4s28 4 28 4V4c0 0-8 4-28 4S4 4 4 4z"/><path d="M32 8v48"/>') },
  { id: "monitor", label: "تقني", icon: Monitor, color: "#d97706", svg: makeAvatarSvg("#d97706", '<rect x="4" y="4" width="56" height="40" rx="4"/><path d="M20 44h24"/><path d="M24 44v12"/><path d="M40 44v12"/><path d="M16 56h32"/>') },
  { id: "heart", label: "مساعد", icon: HeartHandshake, color: "#e11d48", svg: makeAvatarSvg("#e11d48", '<path d="M32 52S4 36 4 18a14 14 0 0128 0 14 14 0 0128 0c0 18-28 34-28 34z"/>') },
  { id: "star", label: "متميز", icon: Star, color: "#ca8a04", svg: makeAvatarSvg("#ca8a04", '<polygon points="32,2 40,22 62,22 44,36 50,56 32,44 14,56 20,36 2,22 24,22"/>') },
  { id: "smile", label: "ودود", icon: Smile, color: "#16a34a", svg: makeAvatarSvg("#16a34a", '<circle cx="32" cy="32" r="28"/><path d="M20 20h0.1"/><path d="M44 20h0.1"/><path d="M18 38c4 6 10 8 14 8s10-2 14-8"/>') },
];

/** الحصول على الصلاحيات الفعلية لمستخدم */
function getEffectivePermissions(user: AppUser): Record<string, boolean> {
  if (user.role === "admin") {
    // المدير لديه كل الصلاحيات دائماً
    const perms: Record<string, boolean> = {};
    CUSTOMIZABLE_PERMISSIONS.forEach(p => { perms[p.key] = true; });
    return perms;
  }
  // الموظف: استخدم الصلاحيات المخصصة إن وجدت، وإلا الافتراضية
  const custom = (user as any).custom_permissions;
  if (custom && typeof custom === "object") {
    const perms: Record<string, boolean> = {};
    CUSTOMIZABLE_PERMISSIONS.forEach(p => {
      perms[p.key] = custom[p.key] === true;
    });
    return perms;
  }
  // الافتراضي
  const perms: Record<string, boolean> = {};
  CUSTOMIZABLE_PERMISSIONS.forEach(p => { perms[p.key] = p.defaultEmployee; });
  return perms;
}

export default function UserManagement() {
  const { currentUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPermissions, setShowPermissions] = useState<"admin" | "employee" | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    display_name: "",
    password: "",
    role: "employee",
    avatar_url: null,
    custom_permissions: null,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // سجل نشاط المستخدم
  const [activityUser, setActivityUser] = useState<AppUser | null>(null);
  const { data: allActivities = [] } = useActivityLog();

  // الصلاحيات المخصصة في النموذج
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});

  // تغيير كلمة المرور الشخصية
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["system-users"],
    queryFn: async () => {
      if (!isElectron()) return [];
      const db = getDbClient()!;
      if (!("getAllUsers" in db)) return [];
      const result = await (db as any).getAllUsers();
      return result.success ? (result.data as AppUser[]) : [];
    },
  });

  // إشعارات محاولات الدخول الفاشلة
  const { data: failedLoginAlerts = [] } = useQuery({
    queryKey: ["failed-login-alerts"],
    queryFn: async () => {
      if (!isElectron()) return [];
      const db = getDbClient()! as any;
      if (typeof db.getFailedLoginAlerts !== "function") return [];
      const result = await db.getFailedLoginAlerts();
      return result.success ? (result.data || []) : [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // كل 30 ثانية
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const db = getDbClient()! as any;
      if (typeof db.dismissFailedLoginAlert !== "function") return;
      await db.dismissFailedLoginAlert(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failed-login-alerts"] });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const db = getDbClient()!;
      const payload: any = { ...data };
      if (data.role === "employee" && data.custom_permissions) {
        payload.custom_permissions = data.custom_permissions;
      }
      const result = await (db as any).addUser(payload);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      toast.success("تم إضافة المستخدم بنجاح");
      resetForm();
      setShowAddDialog(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> & { is_active?: boolean } }) => {
      const db = getDbClient()!;
      const result = await (db as any).updateUser(id, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      toast.success("تم تحديث المستخدم بنجاح");
      resetForm();
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const db = getDbClient()!;
      const result = await (db as any).deleteUser(userId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      toast.success("تم حذف المستخدم");
      setDeletingUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 4) throw new Error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      if (newPassword !== confirmNewPassword) throw new Error("كلمتا المرور غير متطابقتين");
      const db = getDbClient()!;
      const result = await (db as any).changePassword(currentUser!.id, oldPassword, newPassword);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setShowChangePassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleUserActive = (user: AppUser) => {
    if (user.id === currentUser?.id) {
      toast.error("لا يمكنك تعطيل حسابك الخاص");
      return;
    }
    updateUserMutation.mutate({
      id: user.id,
      data: { is_active: !user.is_active },
    });
  };

  const resetForm = () => {
    setFormData({ username: "", display_name: "", password: "", role: "employee", avatar_url: null, custom_permissions: null });
    setShowPassword(false);
    setAvatarPreview(null);
    setCustomPerms({});
  };

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user);
    const perms = getEffectivePermissions(user);
    setCustomPerms(perms);
    setFormData({
      username: user.username,
      display_name: user.display_name,
      password: "",
      role: user.role,
      avatar_url: user.avatar_url || null,
      custom_permissions: user.role === "employee" ? perms : null,
    });
    setAvatarPreview(user.avatar_url || null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 500 كيلوبايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      setFormData(prev => ({ ...prev, avatar_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // تصفية أنشطة مستخدم معين
  const userActivities = activityUser
    ? allActivities.filter(a => a.created_by === activityUser.display_name).slice(0, 50)
    : [];

  if (!isElectron()) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          إدارة المستخدمين متاحة فقط في تطبيق سطح المكتب
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* تنبيهات محاولات الدخول الفاشلة */}
      {isAdmin && failedLoginAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="h-5 w-5" />
              تنبيهات أمنية — محاولات دخول فاشلة
            </div>
            {(failedLoginAlerts as any[]).map((alert: any, i: number) => (
              <div key={alert.id || i} className="flex items-center justify-between bg-background rounded-lg p-3 border border-destructive/20">
                <div className="text-sm">
                  <span className="font-medium">{alert.username}</span>
                  <span className="text-muted-foreground mx-2">—</span>
                  <span className="text-destructive">{alert.attempts} محاولة فاشلة</span>
                  {alert.locked && <Badge variant="destructive" className="mr-2 text-xs">مقفل</Badge>}
                  <span className="text-muted-foreground text-xs mr-2">{formatDate(alert.last_attempt)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlertMutation.mutate(alert.id || alert.username)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة المستخدمين
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <UsageGuideDialog title="دليل استخدام إدارة المستخدمين" sections={userManagementGuide} />
            <Button variant="outline" size="sm" onClick={() => setShowPermissions("employee")}>
              <Info className="h-4 w-4 ml-1" />
              صلاحيات الموظف
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
              <Lock className="h-4 w-4 ml-1" />
              تغيير كلمة المرور
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة مستخدم
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">آخر دخول</TableHead>
                  {isAdmin && <TableHead className="text-right">إجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={user.id === currentUser?.id ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      {user.display_name}
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="mr-2 text-xs">أنت</Badge>
                      )}
                    </TableCell>
                    <TableCell dir="ltr" className="text-left">{user.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="gap-1 cursor-pointer"
                        onClick={() => setShowPermissions(user.role)}
                      >
                        {user.role === "admin" ? <Shield className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
                        {user.role === "admin" ? "مدير" : "موظف"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && user.id !== currentUser?.id ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_active !== false}
                            onCheckedChange={() => toggleUserActive(user)}
                          />
                          <span className={`text-xs ${user.is_active !== false ? "text-green-600" : "text-destructive"}`}>
                            {user.is_active !== false ? "نشط" : "معطل"}
                          </span>
                        </div>
                      ) : (
                        <Badge variant={user.is_active !== false ? "default" : "destructive"} className="text-xs">
                          {user.is_active !== false ? "نشط" : "معطل"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.last_login)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="سجل النشاط" onClick={() => setActivityUser(user)}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* سجل نشاط المستخدم */}
      <Dialog open={!!activityUser} onOpenChange={(open) => !open && setActivityUser(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل نشاط: {activityUser?.display_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-2">
            {userActivities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد أنشطة مسجلة لهذا المستخدم</p>
            ) : (
              <div className="space-y-2">
                {userActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {activityTypeLabels[activity.activity_type] || activity.activity_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</span>
                      </div>
                      <p className="text-sm truncate">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setActivityUser(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* عرض الصلاحيات */}
      <Dialog open={!!showPermissions} onOpenChange={(open) => !open && setShowPermissions(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {showPermissions && ROLE_PERMISSIONS[showPermissions].label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {showPermissions && ROLE_PERMISSIONS[showPermissions].permissions.map((perm, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <span className="text-sm">{perm.name}</span>
                {perm.allowed ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
            ))}
          </div>
          {showPermissions === "employee" && (
            <p className="text-xs text-muted-foreground text-center">
              💡 يمكن تخصيص صلاحيات كل موظف عند التعديل
            </p>
          )}
          <DialogFooter>
            {showPermissions === "employee" && (
              <Button variant="outline" size="sm" onClick={() => setShowPermissions("admin")}>
                عرض صلاحيات المدير
              </Button>
            )}
            {showPermissions === "admin" && (
              <Button variant="outline" size="sm" onClick={() => setShowPermissions("employee")}>
                عرض صلاحيات الموظف
              </Button>
            )}
            <Button onClick={() => setShowPermissions(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة/تعديل مستخدم */}
      <Dialog open={showAddDialog || !!editingUser} onOpenChange={(open) => {
        if (!open) { setShowAddDialog(false); setEditingUser(null); resetForm(); }
      }}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="مثال: أحمد محمد"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="مثال: ahmed"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? "كلمة المرور الجديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "اتركها فارغة للإبقاء" : "4 أحرف على الأقل"}
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => {
                  const role = v as "admin" | "employee";
                  setFormData({ ...formData, role, custom_permissions: role === "employee" ? customPerms : null });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير - صلاحيات كاملة</SelectItem>
                  <SelectItem value="employee">موظف - صلاحيات محدودة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* صلاحيات مخصصة للموظف */}
            {formData.role === "employee" && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  صلاحيات مخصصة
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  فعّل أو عطّل صلاحيات محددة لهذا الموظف
                </p>
                <div className="space-y-2">
                  {CUSTOMIZABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30">
                      <span className="text-sm">{perm.label}</span>
                      <Checkbox
                        checked={customPerms[perm.key] === true}
                        onCheckedChange={(checked) => {
                          const updated = { ...customPerms, [perm.key]: checked === true };
                          setCustomPerms(updated);
                          setFormData(prev => ({ ...prev, custom_permissions: updated }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* صورة المستخدم */}
            <div className="space-y-2">
              <Label>صورة المستخدم (اختياري)</Label>
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="صورة المستخدم" />
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                      {formData.display_name?.charAt(0) || "؟"}
                    </AvatarFallback>
                  )}
                </Avatar>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setAvatarPreview(null);
                      setFormData(prev => ({ ...prev, avatar_url: null }));
                    }}
                  >
                    <XCircle className="h-4 w-4 ml-1" />
                    إزالة
                  </Button>
                )}
              </div>
              <Tabs defaultValue="default" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="default">أفاتار افتراضي</TabsTrigger>
                  <TabsTrigger value="upload">رفع صورة</TabsTrigger>
                </TabsList>
                <TabsContent value="default" className="mt-3">
                  <div className="grid grid-cols-4 gap-2">
                    {DEFAULT_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setAvatarPreview(av.svg);
                          setFormData(prev => ({ ...prev, avatar_url: av.svg }));
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:bg-accent ${
                          avatarPreview === av.svg ? "border-primary bg-primary/10" : "border-transparent"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: av.color }}
                        >
                          <av.icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{av.label}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <ImagePlus className="h-4 w-4 ml-1" />
                      اختيار صورة من الجهاز
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG أو WEBP — أقصى 500 كيلوبايت</p>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingUser(null); resetForm(); }}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (editingUser) {
                  const updateData: any = {
                    username: formData.username,
                    display_name: formData.display_name,
                    role: formData.role,
                    avatar_url: formData.avatar_url,
                  };
                  if (formData.role === "employee") {
                    updateData.custom_permissions = customPerms;
                  } else {
                    updateData.custom_permissions = null;
                  }
                  if (formData.password) updateData.password = formData.password;
                  updateUserMutation.mutate({ id: editingUser.id, data: updateData });
                } else {
                  if (!formData.username.trim() || formData.password.length < 4) {
                    toast.error("يرجى ملء جميع الحقول (كلمة المرور 4 أحرف على الأقل)");
                    return;
                  }
                  const payload = { ...formData };
                  if (formData.role === "employee") {
                    payload.custom_permissions = customPerms;
                  }
                  addUserMutation.mutate(payload);
                }
              }}
              disabled={addUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حذف مستخدم */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستخدم "{deletingUser?.display_name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تغيير كلمة المرور */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>كلمة المرور الحالية</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="4 أحرف على الأقل" />
            </div>
            <div className="space-y-2">
              <Label>تأكيد كلمة المرور الجديدة</Label>
              <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>إلغاء</Button>
            <Button onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending}>
              تغيير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

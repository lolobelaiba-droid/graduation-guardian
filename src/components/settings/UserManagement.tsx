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
import { Users, Plus, Edit2, Trash2, Shield, UserCog, Lock, Eye, EyeOff, Info, Check, X, ImagePlus, XCircle } from "lucide-react";
import UsageGuideDialog, { userManagementGuide } from "./UsageGuideDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserFormData {
  username: string;
  display_name: string;
  password: string;
  role: "admin" | "employee";
  avatar_url?: string | null;
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

/** صلاحيات كل دور */
const ROLE_PERMISSIONS = {
  admin: {
    label: "مدير - صلاحيات كاملة",
    permissions: [
      { name: "عرض البيانات", allowed: true },
      { name: "إضافة سجلات", allowed: true },
      { name: "تعديل السجلات", allowed: true },
      { name: "حذف السجلات", allowed: true },
      { name: "تصدير واستيراد", allowed: true },
      { name: "طباعة الشهادات", allowed: true },
      { name: "إدارة المستخدمين", allowed: true },
      { name: "تعديل الإعدادات العامة", allowed: true },
      { name: "إدارة القوالب (حذف)", allowed: true },
      { name: "تنظيف البيانات الجماعي", allowed: true },
      { name: "استعادة النسخ الاحتياطية", allowed: true },
      { name: "إدارة الشبكة", allowed: true },
    ],
  },
  employee: {
    label: "موظف - صلاحيات محدودة",
    permissions: [
      { name: "عرض البيانات", allowed: true },
      { name: "إضافة سجلات", allowed: true },
      { name: "تعديل السجلات", allowed: true },
      { name: "حذف السجلات", allowed: false },
      { name: "تصدير واستيراد", allowed: true },
      { name: "طباعة الشهادات", allowed: true },
      { name: "إدارة المستخدمين", allowed: false },
      { name: "تعديل الإعدادات العامة", allowed: false },
      { name: "إدارة القوالب (حذف)", allowed: false },
      { name: "تنظيف البيانات الجماعي", allowed: false },
      { name: "استعادة النسخ الاحتياطية", allowed: false },
      { name: "إدارة الشبكة", allowed: false },
    ],
  },
};

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
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  const addUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const db = getDbClient()!;
      const result = await (db as any).addUser(data);
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
    setFormData({ username: "", display_name: "", password: "", role: "employee", avatar_url: null });
    setShowPassword(false);
    setAvatarPreview(null);
  };

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      display_name: user.display_name,
      password: "",
      role: user.role,
      avatar_url: user.avatar_url || null,
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
        <DialogContent dir="rtl">
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
                onValueChange={(v) => setFormData({ ...formData, role: v as "admin" | "employee" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير - صلاحيات كاملة</SelectItem>
                  <SelectItem value="employee">موظف - صلاحيات محدودة</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowPermissions(formData.role)}
              >
                عرض الصلاحيات لهذا الدور
              </button>
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
                  };
                  if (formData.password) updateData.password = formData.password;
                  updateUserMutation.mutate({ id: editingUser.id, data: updateData });
                } else {
                  if (!formData.username.trim() || formData.password.length < 4) {
                    toast.error("يرجى ملء جميع الحقول (كلمة المرور 4 أحرف على الأقل)");
                    return;
                  }
                  addUserMutation.mutate(formData);
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

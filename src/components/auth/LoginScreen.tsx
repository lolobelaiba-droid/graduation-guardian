import { useState, useEffect } from "react";
import { GraduationCap, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";
import { AppUser } from "@/contexts/AuthContext";

interface LoginScreenProps {
  onAuthenticated: (user: AppUser) => void;
}

/**
 * تشفير كلمة المرور باستخدام SHA-256 مع salt (للإعداد الأول فقط)
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ScreenState = "loading" | "login" | "setup_first_admin" | "legacy_login";

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>("loading");

  // إعداد أول مدير
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");

  useEffect(() => {
    checkSystemState();
  }, []);

  const checkSystemState = async () => {
    try {
      if (!isElectron()) {
        onAuthenticated({
          id: "web-user",
          username: "admin",
          display_name: "مدير النظام",
          role: "admin",
          is_active: true,
          must_change_password: false,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        });
        return;
      }
      const db = getDbClient()!;

      // التحقق من وجود نظام المستخدمين الجديد
      const dbAny = db as any;
      if ("hasUsers" in db) {
        const result = await dbAny.hasUsers();
        if (result.success && result.data) {
          // يوجد مستخدمون - شاشة الدخول
          setScreenState("login");
        } else {
          // التحقق من وجود كلمة مرور قديمة
          const oldHash = await dbAny.getSetting("app_password_hash");
          if (oldHash.success && oldHash.data && (oldHash.data as any).value) {
            // نظام قديم بكلمة مرور واحدة
            setScreenState("legacy_login");
          } else {
            // نظام جديد - إعداد أول مدير
            setScreenState("setup_first_admin");
          }
        }
      } else {
        // إصدار قديم من Electron بدون دعم المستخدمين
        const oldHash = await dbAny.getSetting("app_password_hash");
        if (oldHash.success && oldHash.data && (oldHash.data as any).value) {
          setScreenState("legacy_login");
        } else {
          onAuthenticated({
            id: "legacy-user",
            username: "admin",
            display_name: "المستخدم",
            role: "admin",
            is_active: true,
            must_change_password: false,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error("Error checking system state:", e);
      setScreenState("setup_first_admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiUserLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setIsVerifying(true);
    try {
      const dbAny = db as any;
      const result = await dbAny.authenticateUser(username.trim(), password);
      if (result.success && result.user) {
        toast.success(`مرحباً ${result.user.display_name}`);
        onAuthenticated(result.user as AppUser);
      } else {
        toast.error(result.error || "فشل تسجيل الدخول");
        setPassword("");
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLegacyLogin = async () => {
    if (!password.trim()) return;
    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const saltResult = await dbAny.getSetting("app_password_salt");
      const hashResult = await dbAny.getSetting("app_password_hash");

      if (!saltResult.success || !hashResult.success) {
        toast.error("خطأ في قراءة الإعدادات");
        return;
      }

      const salt = (saltResult.data as any)?.value || "";
      const storedHash = (hashResult.data as any)?.value || "";
      const inputHash = await hashPassword(password, salt);

      if (inputHash === storedHash) {
        toast.success("تم تسجيل الدخول بنجاح");
        onAuthenticated({
          id: "legacy-admin",
          username: "admin",
          display_name: "المدير",
          role: "admin",
          is_active: true,
          must_change_password: false,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        });
      } else {
        toast.error("كلمة المرور غير صحيحة");
        setPassword("");
      }
    } catch (e) {
      console.error("Legacy login error:", e);
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetupFirstAdmin = async () => {
    if (!adminUsername.trim()) {
      toast.error("يرجى إدخال اسم المستخدم");
      return;
    }
    if (adminPassword.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.addUser({
        username: adminUsername.trim(),
        display_name: adminDisplayName.trim() || adminUsername.trim(),
        password: adminPassword,
        role: "admin",
      });

      if (result.success) {
        toast.success("تم إنشاء حساب المدير بنجاح");
        onAuthenticated(result.user as AppUser);
      } else {
        toast.error(result.error || "فشل في إنشاء الحساب");
      }
    } catch (e) {
      console.error("Setup error:", e);
      toast.error("حدث خطأ أثناء الإعداد");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading || screenState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">نظام إدارة طلبة الدكتوراه</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {screenState === "login" && "أدخل بيانات الدخول للمتابعة"}
              {screenState === "legacy_login" && "أدخل كلمة المرور للمتابعة"}
              {screenState === "setup_first_admin" && "إعداد حساب المدير الأول"}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-8 space-y-6">
          {screenState === "login" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    اسم المستخدم
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("password")?.focus()}
                    placeholder="أدخل اسم المستخدم"
                    autoFocus
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMultiUserLogin()}
                      placeholder="أدخل كلمة المرور"
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleMultiUserLogin}
                disabled={isVerifying || !username.trim() || !password.trim()}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                تسجيل الدخول
              </Button>
            </>
          )}

          {screenState === "legacy_login" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="legacy-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="legacy-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLegacyLogin()}
                    placeholder="أدخل كلمة المرور"
                    autoFocus
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleLegacyLogin}
                disabled={isVerifying || !password.trim()}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                تسجيل الدخول
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                💡 للانتقال لنظام المستخدمين المتعدد، تواصل مع المدير
              </p>
            </>
          )}

          {screenState === "setup_first_admin" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input
                    value={adminDisplayName}
                    onChange={(e) => setAdminDisplayName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="مثال: admin"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="4 أحرف على الأقل"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetupFirstAdmin()}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSetupFirstAdmin}
                disabled={isVerifying}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                إنشاء حساب المدير
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          هذه حماية واجهة فقط ولا تشفر البيانات المخزنة
        </p>
      </div>
    </div>
  );
}

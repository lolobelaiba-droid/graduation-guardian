import { useState, useEffect } from "react";
import { GraduationCap, Lock, Eye, EyeOff, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";

interface LoginScreenProps {
  onAuthenticated: () => void;
}

/**
 * تشفير كلمة المرور باستخدام SHA-256 مع salt
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

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    checkPasswordExists();
  }, []);

  const checkPasswordExists = async () => {
    try {
      if (!isElectron()) {
        // في بيئة الويب، لا نستخدم شاشة الدخول
        onAuthenticated();
        return;
      }
      const db = getDbClient()!;
      const result = await db.getSetting("app_password_hash");
      if (result.success && result.data && (result.data as any).value) {
        setHasPassword(true);
      } else {
        // لا توجد كلمة مرور - الدخول مباشرة أو إعداد واحدة
        setHasPassword(false);
      }
    } catch (e) {
      console.error("Error checking password:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) return;
    setIsVerifying(true);
    try {
      const db = getDbClient()!;
      const saltResult = await db.getSetting("app_password_salt");
      const hashResult = await db.getSetting("app_password_hash");

      if (!saltResult.success || !hashResult.success) {
        toast.error("خطأ في قراءة الإعدادات");
        return;
      }

      const salt = (saltResult.data as any)?.value || "";
      const storedHash = (hashResult.data as any)?.value || "";
      const inputHash = await hashPassword(password, salt);

      if (inputHash === storedHash) {
        toast.success("تم تسجيل الدخول بنجاح");
        onAuthenticated();
      } else {
        toast.error("كلمة المرور غير صحيحة");
        setPassword("");
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetupPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("يرجى إدخال كلمة مرور");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsVerifying(true);
    try {
      const db = getDbClient()!;
      const salt = generateSalt();
      const hash = await hashPassword(newPassword, salt);

      await db.setSetting("app_password_salt", salt);
      await db.setSetting("app_password_hash", hash);

      toast.success("تم تعيين كلمة المرور بنجاح");
      onAuthenticated();
    } catch (e) {
      console.error("Setup password error:", e);
      toast.error("حدث خطأ أثناء حفظ كلمة المرور");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipSetup = () => {
    onAuthenticated();
  };

  if (isLoading) {
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
              {hasPassword ? "أدخل كلمة المرور للمتابعة" : "مرحباً بك"}
            </p>
          </div>
        </div>

        {/* Login Form or Setup */}
        <div className="bg-card rounded-2xl shadow-card p-8 space-y-6">
          {hasPassword ? (
            /* شاشة تسجيل الدخول */
            <>
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
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                onClick={handleLogin}
                disabled={isVerifying || !password.trim()}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                تسجيل الدخول
              </Button>
            </>
          ) : isSettingUp ? (
            /* إعداد كلمة مرور جديدة */
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetupPassword()}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSetupPassword}
                  disabled={isVerifying}
                >
                  {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  تعيين كلمة المرور
                </Button>
                <Button variant="outline" onClick={() => setIsSettingUp(false)}>
                  رجوع
                </Button>
              </div>
            </>
          ) : (
            /* خيارات أولية */
            <>
              <p className="text-sm text-muted-foreground text-center">
                هل تريد تعيين كلمة مرور لحماية التطبيق؟
              </p>
              <div className="space-y-3">
                <Button className="w-full gap-2" onClick={() => setIsSettingUp(true)}>
                  <Settings className="h-4 w-4" />
                  تعيين كلمة مرور
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSkipSetup}>
                  تخطي - الدخول بدون كلمة مرور
                </Button>
              </div>
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

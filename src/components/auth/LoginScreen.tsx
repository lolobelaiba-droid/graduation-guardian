import { useState, useEffect } from "react";
import { GraduationCap, Lock, Eye, EyeOff, Loader2, User, ShieldQuestion, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { toast } from "sonner";
import { AppUser } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginScreenProps {
  onAuthenticated: (user: AppUser) => void;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SECURITY_QUESTIONS = [
  "ما هو اسم مدرستك الابتدائية؟",
  "ما هو اسم أول صديق لك؟",
  "ما هي المدينة التي ولدت فيها والدتك؟",
  "ما هو لقب جدك؟",
  "ما هو اسم أول أستاذ درسك؟",
  "ما هو رقم هاتفك القديم؟",
];

type ScreenState = "loading" | "login" | "login_offline" | "setup_first_admin" | "legacy_login" | "forgot_password" | "emergency_reset_done";

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
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  // استعادة كلمة المرور
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"username" | "answer">("username");

  // رسالة إعادة التعيين الطارئ
  const [emergencyMessage, setEmergencyMessage] = useState("");

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
      const db = getDbClient()! as any;

      // === الخطوة 1: التحقق من وضع الشبكة ===
      let networkActive = false;
      let wasConfigured = false;

      if (typeof db.isNetworkMode === "function") {
        try {
          const netResult = await db.isNetworkMode();
          networkActive = netResult?.success && netResult?.data === true;
        } catch (e) {
          console.warn("isNetworkMode check failed:", e);
        }
      }

      // التحقق مما إذا كان الجهاز قد تم إعداده مسبقاً للشبكة
      if (!networkActive && typeof db.wasNetworkConfigured === "function") {
        try {
          const configResult = await db.wasNetworkConfigured();
          wasConfigured = configResult?.success && configResult?.data === true;
        } catch (e) {
          console.warn("wasNetworkConfigured check failed:", e);
        }
      }

      if (!networkActive) {
        if (wasConfigured) {
          // الجهاز كان مُعدّاً للشبكة لكن الاتصال مفقود → تسجيل دخول أوفلاين
          console.log("[Login] Network was configured but unreachable, requiring offline login");
          setScreenState("login_offline");
          setIsLoading(false);
          return;
        }
        // لا يوجد مجلد مشترك ولم يُعدّ من قبل → دخول مباشر كمدير محلي
        console.log("[Login] No network configured, granting local admin access");
        onAuthenticated({
          id: "local-admin",
          username: "admin",
          display_name: "المدير المحلي",
          role: "admin",
          is_active: true,
          must_change_password: false,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        });
        return;
      }

      // === الخطوة 2: الشبكة مفعّلة → التحقق من ملف الطوارئ ===
      if (typeof db.checkEmergencyReset === "function") {
        try {
          const resetResult = await db.checkEmergencyReset();
          if (resetResult?.success) {
            setEmergencyMessage(`تم إعادة تعيين كلمة مرور المستخدم "${resetResult.username}" إلى: admin123\nيرجى تغييرها فوراً بعد الدخول.`);
            setScreenState("emergency_reset_done");
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("checkEmergencyReset failed:", e);
        }
      }

      // === الخطوة 3: التحقق من وجود مستخدمين في المجلد المشترك ===
      if (typeof db.hasUsers === "function") {
        try {
          const result = await db.hasUsers();
          console.log("hasUsers result:", JSON.stringify(result));
          if (result?.success && result?.data === true) {
            setScreenState("login");
          } else {
            // لا يوجد مستخدمون في المجلد المشترك → إعداد أول مدير
            setScreenState("setup_first_admin");
          }
        } catch (e) {
          console.error("hasUsers call failed:", e);
          setScreenState("setup_first_admin");
        }
      } else {
        setScreenState("setup_first_admin");
      }
    } catch (e) {
      console.error("Error checking system state:", e);
      // في حال خطأ عام → دخول محلي
      onAuthenticated({
        id: "fallback-admin",
        username: "admin",
        display_name: "المدير",
        role: "admin",
        is_active: true,
        must_change_password: false,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultiUserLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.authenticateUser(username.trim(), password);
      if (result.success && result.user) {
        toast.success(`مرحباً ${result.user.display_name}`);
        onAuthenticated(result.user as AppUser);
      } else {
        if (typeof dbAny.recordFailedLogin === "function") {
          try { await dbAny.recordFailedLogin(username.trim()); } catch (e2) {}
        }
        const isLocked = result.error?.includes("مقفل") || result.error?.includes("locked");
        if (isLocked) {
          toast.error("تم قفل الحساب بسبب كثرة المحاولات الخاطئة. تواصل مع المدير.");
        } else {
          toast.error(result.error || "فشل تسجيل الدخول");
        }
        setPassword("");
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOfflineLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.authenticateUserOffline(username.trim(), password);
      if (result.success && result.user) {
        toast.success(`مرحباً ${result.user.display_name} (وضع القراءة فقط)`);
        onAuthenticated(result.user as AppUser);
      } else {
        toast.error(result.error || "فشل تسجيل الدخول");
        setPassword("");
      }
    } catch (e) {
      console.error("Offline login error:", e);
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
          id: "legacy-admin", username: "admin", display_name: "المدير",
          role: "admin", is_active: true, must_change_password: false,
          created_at: new Date().toISOString(), last_login: new Date().toISOString(),
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
    if (!adminUsername.trim()) { toast.error("يرجى إدخال اسم المستخدم"); return; }
    if (adminPassword.length < 4) { toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل"); return; }
    if (adminPassword !== adminConfirmPassword) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    if (!securityQuestion) { toast.error("يرجى اختيار سؤال الأمان"); return; }
    if (!securityAnswer.trim()) { toast.error("يرجى إدخال إجابة سؤال الأمان"); return; }

    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.addUser({
        username: adminUsername.trim(),
        display_name: adminDisplayName.trim() || adminUsername.trim(),
        password: adminPassword,
        role: "admin",
        security_question: securityQuestion,
        security_answer: securityAnswer.trim(),
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

  // --- استعادة كلمة المرور ---
  const handleFetchSecurityQuestion = async () => {
    if (!recoveryUsername.trim()) { toast.error("أدخل اسم المستخدم"); return; }
    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.getSecurityQuestion(recoveryUsername.trim());
      if (result.success && result.question) {
        setRecoveryQuestion(result.question);
        setRecoveryStep("answer");
      } else if (result.success && !result.question) {
        toast.error("لا يوجد سؤال أمان لهذا الحساب. استخدم ملف الطوارئ.");
      } else {
        toast.error(result.error || "المستخدم غير موجود");
      }
    } catch (e) {
      toast.error("حدث خطأ");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!recoveryAnswer.trim()) { toast.error("أدخل إجابة سؤال الأمان"); return; }
    if (newPassword.length < 4) { toast.error("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل"); return; }
    if (newPassword !== newPasswordConfirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setIsVerifying(true);
    try {
      const dbAny = getDbClient()! as any;
      const result = await dbAny.recoverPasswordByQuestion(recoveryUsername.trim(), recoveryAnswer.trim(), newPassword);
      if (result.success) {
        toast.success("تم إعادة تعيين كلمة المرور بنجاح! سجّل دخولك الآن.");
        setScreenState("login");
        setUsername(recoveryUsername);
        setPassword("");
        resetRecoveryState();
      } else {
        toast.error(result.error || "فشل في الاستعادة");
      }
    } catch (e) {
      toast.error("حدث خطأ");
    } finally {
      setIsVerifying(false);
    }
  };

  const resetRecoveryState = () => {
    setRecoveryUsername("");
    setRecoveryQuestion(null);
    setRecoveryAnswer("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setRecoveryStep("username");
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
              {screenState === "forgot_password" && "استعادة كلمة المرور"}
              {screenState === "emergency_reset_done" && "تم إعادة تعيين كلمة المرور"}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-8 space-y-6">
          {/* ===== شاشة تسجيل الدخول ===== */}
          {screenState === "login" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> اسم المستخدم
                  </Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("password")?.focus()}
                    placeholder="أدخل اسم المستخدم" autoFocus dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> كلمة المرور
                  </Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMultiUserLogin()}
                      placeholder="أدخل كلمة المرور" className="pl-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleMultiUserLogin}
                disabled={isVerifying || !username.trim() || !password.trim()}>
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                تسجيل الدخول
              </Button>
              <button type="button" onClick={() => setScreenState("forgot_password")}
                className="w-full text-sm text-primary hover:underline text-center">
                نسيت كلمة المرور؟
              </button>
            </>
          )}

          {/* ===== شاشة النظام القديم ===== */}
          {screenState === "legacy_login" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="legacy-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> كلمة المرور
                </Label>
                <div className="relative">
                  <Input id="legacy-password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLegacyLogin()}
                    placeholder="أدخل كلمة المرور" autoFocus className="pl-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleLegacyLogin}
                disabled={isVerifying || !password.trim()}>
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                تسجيل الدخول
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                💡 للانتقال لنظام المستخدمين المتعدد، تواصل مع المدير
              </p>
            </>
          )}

          {/* ===== إعداد أول مدير ===== */}
          {screenState === "setup_first_admin" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)}
                    placeholder="مثال: أحمد محمد" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="مثال: admin" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="4 أحرف على الأقل" />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input type="password" value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور" />
                </div>

                {/* سؤال الأمان */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="flex items-center gap-2 text-primary">
                    <ShieldQuestion className="h-4 w-4" /> سؤال الأمان (لاستعادة كلمة المرور)
                  </Label>
                  <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سؤال الأمان" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECURITY_QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="إجابة سؤال الأمان" onKeyDown={(e) => e.key === "Enter" && handleSetupFirstAdmin()} />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleSetupFirstAdmin} disabled={isVerifying}>
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                إنشاء حساب المدير
              </Button>
            </>
          )}

          {/* ===== استعادة كلمة المرور ===== */}
          {screenState === "forgot_password" && (
            <>
              {recoveryStep === "username" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> اسم المستخدم
                    </Label>
                    <Input value={recoveryUsername} onChange={(e) => setRecoveryUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFetchSecurityQuestion()}
                      placeholder="أدخل اسم المستخدم" autoFocus dir="ltr" className="text-left" />
                  </div>
                  <Button className="w-full gap-2" onClick={handleFetchSecurityQuestion}
                    disabled={isVerifying || !recoveryUsername.trim()}>
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldQuestion className="h-4 w-4" />}
                    التالي
                  </Button>
                </div>
              )}

              {recoveryStep === "answer" && recoveryQuestion && (
                <div className="space-y-4">
                  <Alert>
                    <ShieldQuestion className="h-4 w-4" />
                    <AlertDescription className="font-medium">{recoveryQuestion}</AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>الإجابة</Label>
                    <Input value={recoveryAnswer} onChange={(e) => setRecoveryAnswer(e.target.value)}
                      placeholder="أدخل إجابة سؤال الأمان" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="4 أحرف على الأقل" />
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور الجديدة</Label>
                    <Input type="password" value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRecoverPassword()}
                      placeholder="أعد إدخال كلمة المرور" />
                  </div>
                  <Button className="w-full gap-2" onClick={handleRecoverPassword} disabled={isVerifying}>
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    إعادة تعيين كلمة المرور
                  </Button>
                </div>
              )}

              {/* تعليمات ملف الطوارئ */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  إذا لم تنجح الطريقة أعلاه:
                </p>
                <ol className="text-xs text-muted-foreground list-decimal mr-4 space-y-1">
                  <li>أنشئ ملف <code className="bg-muted px-1 rounded">reset.txt</code> في مجلد البيانات</li>
                  <li>اكتب فيه: <code className="bg-muted px-1 rounded">RESET_ADMIN_PASSWORD</code></li>
                  <li>أعد تشغيل التطبيق</li>
                  <li>ستصبح كلمة المرور: <code className="bg-muted px-1 rounded">admin123</code></li>
                </ol>
              </div>

              <button type="button" onClick={() => { setScreenState("login"); resetRecoveryState(); }}
                className="w-full text-sm text-primary hover:underline text-center">
                ← العودة لتسجيل الدخول
              </button>
            </>
          )}

          {/* ===== رسالة إعادة التعيين الطارئ ===== */}
          {screenState === "emergency_reset_done" && (
            <>
              <Alert className="border-destructive/50 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="whitespace-pre-line text-destructive">
                  {emergencyMessage}
                </AlertDescription>
              </Alert>
              <Button className="w-full gap-2" onClick={() => setScreenState("login")}>
                <Lock className="h-4 w-4" /> متابعة لتسجيل الدخول
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

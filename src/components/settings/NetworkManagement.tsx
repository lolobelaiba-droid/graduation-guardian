import { useState, useEffect, useCallback } from "react";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { toast } from "sonner";
import {
  Network,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Monitor,
  Edit3,
  Download,
  RefreshCw,
  AlertTriangle,
  Unplug,
   TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import UsageGuideDialog, { networkGuide } from "./UsageGuideDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface DeviceEntry {
  hostname: string;
  ip: string;
  firstSeen: string;
  lastActive: string;
}

type DeviceAliases = Record<string, string>;

export default function NetworkManagement() {
  const { data: networkInfo } = useNetworkInfo();

  // Setup wizard
  const [sharedPath, setSharedPath] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    reachable: boolean;
    writable: boolean;
    error?: string;
  } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Device registry
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Aliases
  const [aliases, setAliases] = useState<DeviceAliases>({});
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const [isSavingAliases, setIsSavingAliases] = useState(false);

  // Centralized backup
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Load current config
  useEffect(() => {
    if (!isElectron()) return;
    const loadConfig = async () => {
      const db = getDbClient();
      if (!db) return;
      try {
        const result = await (db as any).getNetworkConfig();
        if (result.success && result.data?.found) {
          setSharedPath(result.data.config.sharedPath || "");
        }
      } catch (e) {}
    };
    loadConfig();
  }, []);

  // Load devices and aliases
  const loadDevicesAndAliases = useCallback(async () => {
    if (!isElectron()) return;
    const db = getDbClient();
    if (!db) return;
    setIsLoadingDevices(true);
    try {
      // Update own registry first
      await (db as any).updateDeviceRegistry();
      const regResult = await (db as any).getDeviceRegistry();
      if (regResult.success && regResult.data) {
        setDevices(regResult.data as DeviceEntry[]);
      }
      const aliasResult = await (db as any).getDeviceAliases();
      if (aliasResult.success && aliasResult.data) {
        setAliases(aliasResult.data as DeviceAliases);
      }
    } catch (e) {}
    setIsLoadingDevices(false);
  }, []);

  useEffect(() => {
    loadDevicesAndAliases();
  }, [loadDevicesAndAliases]);

  // === Handlers ===

  const handleConnect = async () => {
    if (!sharedPath.trim()) {
      toast.error("يرجى إدخال مسار المجلد المشترك");
      return;
    }
    setIsSaving(true);
    try {
      const db = getDbClient();
      if (!db) return;
      const result = await (db as any).saveNetworkConfig(sharedPath.trim());
      if (result.success) {
        toast.success("تم حفظ إعدادات الشبكة بنجاح — أعد تشغيل التطبيق لتفعيل الاتصال");
      } else {
        toast.error("فشل في حفظ الإعدادات: " + (result.error || ""));
      }
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!sharedPath.trim()) {
      toast.error("يرجى إدخال مسار أولاً");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const db = getDbClient();
      if (!db) return;
      const result = await (db as any).testNetworkPath(sharedPath.trim());
      if (result.success) {
        setTestResult(result.data);
        if (result.data.reachable && result.data.writable) {
          toast.success("المسار قابل للوصول والكتابة ✓");
        } else if (result.data.reachable) {
          toast.error("المسار موجود لكن الكتابة ممنوعة");
        } else {
          toast.error("المسار غير موجود أو غير قابل للوصول");
        }
      }
    } catch (e: any) {
      setTestResult({ reachable: false, writable: false, error: e.message });
      toast.error("فشل الاختبار: " + e.message);
    }
    setIsTesting(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const db = getDbClient();
      if (!db) return;
      const result = await (db as any).disconnectNetwork();
      if (result.success) {
        setSharedPath("");
        toast.success("تم فصل الاتصال بالشبكة — أعد تشغيل التطبيق للعمل محلياً");
      }
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    }
    setIsDisconnecting(false);
  };

  const handleSaveAlias = async (deviceKey: string) => {
    const newAliases = { ...aliases };
    if (aliasInput.trim()) {
      newAliases[deviceKey] = aliasInput.trim();
    } else {
      delete newAliases[deviceKey];
    }
    setIsSavingAliases(true);
    try {
      const db = getDbClient();
      if (!db) return;
      await (db as any).saveDeviceAliases(newAliases);
      setAliases(newAliases);
      setEditingAlias(null);
      setAliasInput("");
      toast.success("تم حفظ الاسم المستعار");
    } catch (e: any) {
      toast.error("فشل الحفظ: " + e.message);
    }
    setIsSavingAliases(false);
  };

  const handleCentralizedBackup = async () => {
    setIsBackingUp(true);
    try {
      const db = getDbClient();
      if (!db) return;
      const result = await (db as any).centralizedBackup();
      if (result.success && result.data?.success) {
        toast.success(
          `تم النسخ الاحتياطي المركزي بنجاح — ${result.data.filesCount} ملف`
        );
      } else {
        toast.error(result.data?.error || "فشل النسخ الاحتياطي");
      }
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    }
    setIsBackingUp(false);
  };

  const getDeviceStatus = (lastActive: string): "online" | "offline" => {
    const diff = Date.now() - new Date(lastActive).getTime();
    return diff < 5 * 60 * 1000 ? "online" : "offline";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("ar-EG-u-nu-latn", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (!isElectron()) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-6 text-center text-muted-foreground">
        <Network className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>إدارة الشبكة متاحة فقط في نسخة سطح المكتب</p>
      </div>
    );
  }

  const isConnected = networkInfo?.isNetwork;

  return (
    <div className="space-y-6">
      {/* 1. Network Setup Wizard */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          إعداد الاتصال بالشبكة
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          أدخل مسار المجلد المشترك على الشبكة المحلية للعمل الجماعي
        </p>

        {/* Status indicator */}
        {isConnected && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-medium">
              متصل بالشبكة
            </span>
            <span className="font-mono text-xs text-muted-foreground mr-auto" dir="ltr">
              {networkInfo?.sharedPath}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="sharedPath">مسار المجلد المشترك</Label>
            <Input
              id="sharedPath"
              value={sharedPath}
              onChange={(e) => {
                setSharedPath(e.target.value);
                setTestResult(null);
              }}
              placeholder="مثال: \\\\SERVER\\SharedFolder أو /mnt/shared"
              dir="ltr"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={handleTest}
            variant="outline"
            disabled={isTesting || !sharedPath.trim()}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            اختبار الاتصال
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isSaving || !sharedPath.trim()}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ والاتصال
          </Button>
          {isConnected && (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              disabled={isDisconnecting}
              className="gap-2"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              فصل الاتصال
            </Button>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg border text-sm flex items-center gap-2 ${
              testResult.reachable && testResult.writable
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {testResult.reachable && testResult.writable ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {testResult.reachable && testResult.writable
                  ? "المسار قابل للوصول والكتابة ✓"
                  : testResult.reachable
                  ? "المسار موجود لكن الكتابة ممنوعة"
                  : "المسار غير قابل للوصول"}
              </p>
              {testResult.error && (
                <p className="text-xs opacity-70 mt-0.5">{testResult.error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Device Dashboard */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            الأجهزة المتصلة
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDevicesAndAliases}
            disabled={isLoadingDevices}
            className="gap-1"
          >
            {isLoadingDevices ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            تحديث
          </Button>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            لم يتم تسجيل أي جهاز بعد
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الاسم المستعار</TableHead>
                <TableHead className="text-right">اسم الجهاز</TableHead>
                <TableHead className="text-right">عنوان IP</TableHead>
                <TableHead className="text-right">آخر نشاط</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => {
                const key = device.ip + "_" + device.hostname;
                const status = getDeviceStatus(device.lastActive);
                const alias = aliases[key] || aliases[device.ip] || "";
                const isCurrentDevice =
                  device.ip === networkInfo?.ip &&
                  device.hostname === networkInfo?.hostname;

                return (
                  <TableRow key={key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            status === "online"
                              ? "bg-green-500 animate-pulse"
                              : "bg-muted-foreground/40"
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {status === "online" ? "متصل" : "غير متصل"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingAlias === key ? (
                        <div className="flex gap-1 items-center">
                          <Input
                            value={aliasInput}
                            onChange={(e) => setAliasInput(e.target.value)}
                            className="h-7 text-xs w-28"
                            placeholder="اسم مستعار"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveAlias(key);
                              if (e.key === "Escape") setEditingAlias(null);
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleSaveAlias(key)}
                            disabled={isSavingAliases}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm">
                          {alias || (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {device.hostname}
                      {isCurrentDevice && (
                        <Badge
                          variant="secondary"
                          className="mr-2 text-[10px] py-0"
                        >
                          هذا الجهاز
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {device.ip}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(device.lastActive)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingAlias(key);
                          setAliasInput(alias);
                        }}
                        title="تعديل الاسم المستعار"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Device info for current machine */}
        {networkInfo && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-center gap-3">
            <Monitor className="h-4 w-4 shrink-0" />
            <span>
              الجهاز الحالي:{" "}
              <span className="font-mono font-medium text-foreground">
                {networkInfo.hostname}
              </span>{" "}
              ({networkInfo.ip})
            </span>
          </div>
        )}
      </div>

      {/* 3. Management Tools */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          أدوات الإدارة
        </h3>

        {/* Admin notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50 border border-accent mb-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
          <p className="text-accent-foreground">
            يُنصح بتنفيذ عمليات "الأسماء المستعارة" و"النسخ الاحتياطي المركزي" من جهاز المسؤول الرئيسي فقط
          </p>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">نسخ احتياطي مركزي</h4>
            <p className="text-xs text-muted-foreground mb-3">
              نسخ جميع بيانات المجلد المشترك إلى مجلد محلي بطابع زمني على هذا الجهاز
            </p>
            <Button
              onClick={handleCentralizedBackup}
              disabled={isBackingUp || !isConnected}
              variant="outline"
              className="gap-2"
            >
              {isBackingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              نسخ احتياطي مركزي الآن
            </Button>
            {!isConnected && (
              <p className="text-xs text-muted-foreground mt-2">
                يتطلب الاتصال بالشبكة أولاً
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Database,
  Printer,
  Download,
  Upload,
  Save,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Image,
  X,
  Calendar,
  Settings2,
  FolderOpen,
} from "lucide-react";
import DateFormatSettings from "@/components/settings/DateFormatSettings";
import TemplatePrintSettings from "@/components/settings/TemplatePrintSettings";
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { BackupService, type BackupData } from "@/lib/database/backup-service";
import { toast } from "sonner";

interface BackupSummary {
  phdLmdCount: number;
  phdScienceCount: number;
  masterCount: number;
  templatesCount: number;
  phdLmdStudentsCount: number;
  phdScienceStudentsCount: number;
  createdAt?: string;
}


export default function Settings() {
  // University Info State
  const [universityName, setUniversityName] = useState("");
  const [universityNameEn, setUniversityNameEn] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSavingUniversity, setIsSavingUniversity] = useState(false);

  // Backup State
  const [backupCount, setBackupCount] = useState("10");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingNow, setIsSavingNow] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [savedBackups, setSavedBackups] = useState<{ name: string; created_at: string }[]>([]);
  const [showBackupsList, setShowBackupsList] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [previousBackup, setPreviousBackup] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<{
    data: Record<string, unknown[]>;
    summary: BackupSummary;
  } | null>(null);
  const [currentDataSummary, setCurrentDataSummary] = useState<BackupSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Logo state
  const [universityLogo, setUniversityLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);


  // Load all settings from database
  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*");

      if (!error && data) {
        data.forEach((setting) => {
          switch (setting.key) {
            // University settings
            case "university_name":
              if (setting.value) setUniversityName(setting.value);
              break;
            case "university_name_en":
              if (setting.value) setUniversityNameEn(setting.value);
              break;
            case "university_address":
              if (setting.value) setAddress(setting.value);
              break;
            case "university_phone":
              if (setting.value) setPhone(setting.value);
              break;
            case "university_email":
              if (setting.value) setEmail(setting.value);
              break;
            case "university_website":
              if (setting.value) setWebsite(setting.value);
              break;
            case "university_logo":
              if (setting.value) setUniversityLogo(setting.value);
              break;
            // Backup settings
            case "backup_count":
              if (setting.value) setBackupCount(setting.value);
              break;
          }
        });
      }
    };

    loadSettings();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      await supabase
        .from("settings")
        .update({ value })
        .eq("id", existing.id);
    } else {
      await supabase.from("settings").insert([{ key, value }]);
    }
  };

  const saveUniversitySettings = async () => {
    setIsSavingUniversity(true);
    try {
      await Promise.all([
        saveSetting("university_name", universityName),
        saveSetting("university_name_en", universityNameEn),
        saveSetting("university_address", address),
        saveSetting("university_phone", phone),
        saveSetting("university_email", email),
        saveSetting("university_website", website),
      ]);
      toast.success("تم حفظ معلومات الجامعة بنجاح");
    } catch (error) {
      console.error("Error saving university settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSavingUniversity(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await saveSetting("university_logo", base64);
        setUniversityLogo(base64);
        toast.success("تم رفع الشعار بنجاح");
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        toast.error("حدث خطأ أثناء قراءة الملف");
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("حدث خطأ أثناء رفع الشعار");
      setIsUploadingLogo(false);
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const removeLogo = async () => {
    try {
      await saveSetting("university_logo", "");
      setUniversityLogo(null);
      toast.success("تم حذف الشعار");
    } catch (error) {
      console.error("Error removing logo:", error);
      toast.error("حدث خطأ أثناء حذف الشعار");
    }
  };


  const getBackupSummary = (data: BackupData['data']): BackupSummary => ({
    phdLmdCount: data.phd_lmd_certificates?.length || 0,
    phdScienceCount: data.phd_science_certificates?.length || 0,
    masterCount: data.master_certificates?.length || 0,
    templatesCount: data.certificate_templates?.length || 0,
    phdLmdStudentsCount: data.phd_lmd_students?.length || 0,
    phdScienceStudentsCount: data.phd_science_students?.length || 0,
  });

  const downloadBackup = async () => {
    setIsDownloading(true);
    try {
      const { data: backupData, error } = await BackupService.exportAll();
      if (error || !backupData) throw error || new Error("فشل التصدير");

      BackupService.downloadBackupFile(backupData);
      toast.success("تم تنزيل النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error("Error downloading backup:", error);
      toast.error("حدث خطأ أثناء تنزيل النسخة الاحتياطية");
    } finally {
      setIsDownloading(false);
    }
  };

  const saveBackupToStorage = async () => {
    setIsSavingNow(true);
    try {
      const { data: backupData, error: exportError } = await BackupService.exportAll();
      if (exportError || !backupData) throw exportError || new Error("فشل التصدير");

      const now = new Date();
      const fileName = `backup_${now.toISOString().replace(/[:.]/g, '-')}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const { error } = await supabase.storage
        .from("backups")
        .upload(fileName, blob, {
          contentType: "application/json",
          upsert: false,
        });

      if (error) throw error;

      // Clean up old backups if exceeding max count
      const maxCount = parseInt(backupCount) || 10;
      const { data: files } = await supabase.storage
        .from("backups")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (files && files.length > maxCount) {
        const toDelete = files.slice(maxCount).map((f) => f.name);
        await supabase.storage.from("backups").remove(toDelete);
      }

      toast.success("تم حفظ النسخة الاحتياطية بنجاح في المجلد");
    } catch (error) {
      console.error("Error saving backup to storage:", error);
      toast.error("حدث خطأ أثناء حفظ النسخة الاحتياطية");
    } finally {
      setIsSavingNow(false);
    }
  };

  const loadSavedBackups = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from("backups")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      setSavedBackups(
        (files || [])
          .filter((f) => f.name.endsWith(".json"))
          .map((f) => ({ name: f.name, created_at: f.created_at || "" }))
      );
      setShowBackupsList(true);
    } catch (error) {
      console.error("Error loading backups:", error);
      toast.error("حدث خطأ أثناء تحميل قائمة النسخ الاحتياطية");
    }
  };

  const prepareRestoreConfirmation = async (tableData: BackupData['data'], createdAt?: string) => {
    const backupSummary: BackupSummary = {
      ...getBackupSummary(tableData),
      createdAt,
    };

    const { data: currentExport } = await BackupService.exportAll();
    const currentSummary: BackupSummary = currentExport
      ? getBackupSummary(currentExport.data)
      : { phdLmdCount: 0, phdScienceCount: 0, masterCount: 0, templatesCount: 0, phdLmdStudentsCount: 0, phdScienceStudentsCount: 0 };

    setPendingBackupData({ data: tableData as unknown as Record<string, unknown[]>, summary: backupSummary });
    setCurrentDataSummary(currentSummary);
    return true;
  };

  const restoreFromStorage = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("backups")
        .download(fileName);

      if (error) throw error;

      const text = await data.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        toast.error("ملف النسخة الاحتياطية غير صالح");
        return;
      }

      await prepareRestoreConfirmation(backupData.data, backupData.created_at);
      setShowBackupsList(false);
      setShowRestoreConfirm(true);
    } catch (error) {
      console.error("Error restoring from storage:", error);
      toast.error("حدث خطأ أثناء قراءة النسخة الاحتياطية");
    }
  };

  const deleteBackupFromStorage = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from("backups").remove([fileName]);
      if (error) throw error;
      setSavedBackups((prev) => prev.filter((b) => b.name !== fileName));
      toast.success("تم حذف النسخة الاحتياطية");
    } catch (error) {
      console.error("Error deleting backup:", error);
      toast.error("حدث خطأ أثناء حذف النسخة الاحتياطية");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backupData = await BackupService.readBackupFile(file);
      if (!backupData) {
        toast.error("ملف النسخة الاحتياطية غير صالح");
        return;
      }

      await prepareRestoreConfirmation(backupData.data, backupData.created_at);
      setShowRestoreConfirm(true);
    } catch (error) {
      console.error("Error reading backup file:", error);
      toast.error("حدث خطأ أثناء قراءة ملف النسخة الاحتياطية");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const confirmRestore = async () => {
    if (!pendingBackupData) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);

    try {
      // Save current state before restoring
      const { data: currentExport } = await BackupService.exportAll();
      if (currentExport) {
        setPreviousBackup(JSON.stringify(currentExport));
      }

      const backupToRestore: BackupData = {
        version: "2.0",
        created_at: new Date().toISOString(),
        data: pendingBackupData.data as BackupData['data'],
      };

      const { error } = await BackupService.importAll(backupToRestore);
      if (error) throw error;

      setCanUndo(true);
      setPendingBackupData(null);
      setCurrentDataSummary(null);
      toast.success("تم استعادة النسخة الاحتياطية بنجاح - يمكنك التراجع خلال هذه الجلسة");
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
    } finally {
      setIsRestoring(false);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(false);
    setPendingBackupData(null);
    setCurrentDataSummary(null);
  };

  const undoRestore = async () => {
    if (!previousBackup) {
      toast.error("لا توجد نسخة سابقة للتراجع إليها");
      return;
    }

    setIsUndoing(true);
    try {
      const backupData = JSON.parse(previousBackup) as BackupData;
      const { error } = await BackupService.importAll(backupData);
      if (error) throw error;

      setPreviousBackup(null);
      setCanUndo(false);
      toast.success("تم التراجع عن الاستعادة بنجاح");
    } catch (error) {
      console.error("Error undoing restore:", error);
      toast.error("حدث خطأ أثناء التراجع");
    } finally {
      setIsUndoing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "غير معروف";
    return new Date(dateString).toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div className="space-y-6">
      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent className="max-w-lg" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد الاستعادة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-4">
              <p>سيتم استبدال جميع البيانات الحالية بالبيانات من النسخة الاحتياطية.</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <h4 className="font-semibold text-destructive mb-2">البيانات الحالية (ستُحذف)</h4>
                  <ul className="text-sm space-y-1 text-foreground">
                    <li>• شهادات دكتوراه ل م د: {currentDataSummary?.phdLmdCount || 0}</li>
                    <li>• شهادات دكتوراه علوم: {currentDataSummary?.phdScienceCount || 0}</li>
                    <li>• شهادات ماجستير: {currentDataSummary?.masterCount || 0}</li>
                    <li>• طلبة دكتوراه ل م د: {currentDataSummary?.phdLmdStudentsCount || 0}</li>
                    <li>• طلبة دكتوراه علوم: {currentDataSummary?.phdScienceStudentsCount || 0}</li>
                    <li>• القوالب: {currentDataSummary?.templatesCount || 0}</li>
                  </ul>
                </div>
                
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <h4 className="font-semibold text-primary mb-2">النسخة الاحتياطية (ستُستعاد)</h4>
                  <ul className="text-sm space-y-1 text-foreground">
                    <li>• شهادات دكتوراه ل م د: {pendingBackupData?.summary.phdLmdCount || 0}</li>
                    <li>• شهادات دكتوراه علوم: {pendingBackupData?.summary.phdScienceCount || 0}</li>
                    <li>• شهادات ماجستير: {pendingBackupData?.summary.masterCount || 0}</li>
                    <li>• طلبة دكتوراه ل م د: {pendingBackupData?.summary.phdLmdStudentsCount || 0}</li>
                    <li>• طلبة دكتوراه علوم: {pendingBackupData?.summary.phdScienceStudentsCount || 0}</li>
                    <li>• القوالب: {pendingBackupData?.summary.templatesCount || 0}</li>
                  </ul>
                  {pendingBackupData?.summary.createdAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      تاريخ النسخة: {formatDate(pendingBackupData.summary.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              
              <p className="text-destructive text-sm">
                ⚠️ يمكنك التراجع عن هذا الإجراء خلال نفس الجلسة فقط
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel onClick={cancelRestore}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الاستعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Saved Backups List Dialog */}
      <AlertDialog open={showBackupsList} onOpenChange={setShowBackupsList}>
        <AlertDialogContent className="max-w-lg" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <FolderOpen className="h-5 w-5 text-primary" />
              النسخ الاحتياطية المحفوظة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {savedBackups.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">لا توجد نسخ احتياطية محفوظة بعد</p>
              ) : (
                <div className="space-y-2 mt-3 max-h-80 overflow-y-auto">
                  {savedBackups.map((backup) => (
                    <div
                      key={backup.name}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {backup.name.replace('.json', '').replace(/backup_/g, '').replace(/-/g, ' ').slice(0, 19)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {backup.created_at ? new Date(backup.created_at).toLocaleString("ar-SA") : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => restoreFromStorage(backup.name)}
                        >
                          <Upload className="h-3 w-3" />
                          استعادة
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive gap-1 text-xs"
                          onClick={() => deleteBackupFromStorage(backup.name)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إغلاق</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">
          إدارة إعدادات النظام والنسخ الاحتياطية
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="university" className="space-y-6">
        <TabsList className="bg-card shadow-card p-1 h-auto flex-wrap">
          <TabsTrigger value="university" className="gap-2 py-2">
            <Building2 className="h-4 w-4" />
            معلومات الجامعة
          </TabsTrigger>
          <TabsTrigger value="dateformat" className="gap-2 py-2">
            <Calendar className="h-4 w-4" />
            تنسيق التواريخ
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 py-2">
            <Database className="h-4 w-4" />
            النسخ الاحتياطية
          </TabsTrigger>
          <TabsTrigger value="print" className="gap-2 py-2">
            <Printer className="h-4 w-4" />
            إعدادات الطباعة
          </TabsTrigger>
          <TabsTrigger value="customfields" className="gap-2 py-2">
            <Settings2 className="h-4 w-4" />
            إدارة حقول قاعدة البيانات
          </TabsTrigger>
        </TabsList>

        {/* Date Format Tab */}
        <TabsContent value="dateformat">
          <DateFormatSettings />
        </TabsContent>

        {/* University Info Tab */}
        <TabsContent value="university">
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">معلومات الجامعة</h3>
              <p className="text-sm text-muted-foreground mb-6">
                هذه المعلومات ستظهر في الشهادات المطبوعة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="universityName">اسم الجامعة</Label>
                <Input
                  id="universityName"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  placeholder="أدخل اسم الجامعة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="universityNameEn">اسم الجامعة (إنجليزي)</Label>
                <Input
                  id="universityNameEn"
                  value={universityNameEn}
                  onChange={(e) => setUniversityNameEn(e.target.value)}
                  placeholder="Enter university name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">الموقع الإلكتروني</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="أدخل الموقع الإلكتروني"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>شعار الجامعة</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border overflow-hidden relative">
                  {universityLogo ? (
                    <>
                      <img src={universityLogo} alt="شعار الجامعة" className="w-full h-full object-contain" />
                      <button
                        onClick={removeLogo}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
                        title="حذف الشعار"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Image className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    رفع شعار جديد
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG أو SVG - الحد الأقصى 2 ميجابايت</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                className="gap-2"
                onClick={saveUniversitySettings}
                disabled={isSavingUniversity}
              >
                {isSavingUniversity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup">
          <div className="space-y-6">
            {/* تنبيه بضرورة الحفظ اليدوي */}
            <div className="bg-accent/50 border border-accent rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent-foreground">تنبيه: لا تنسَ حفظ نسخة احتياطية من بياناتك بشكل دوري</p>
                <p className="text-xs text-muted-foreground mt-1">
                  احرص على تنزيل أو حفظ نسخة احتياطية بانتظام لتجنب فقدان البيانات
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-semibold mb-2">النسخ الاحتياطي اليدوي</h3>
              <p className="text-sm text-muted-foreground mb-4">
                تنزيل ملف JSON يحتوي على جميع بيانات النظام: الشهادات، طلبة الدكتوراه، القوالب، الإعدادات، الألقاب الأكاديمية، الحقول المخصصة، وسجل الأنشطة
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  className="gap-2"
                  onClick={downloadBackup}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  تنزيل نسخة احتياطية
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={saveBackupToStorage}
                  disabled={isSavingNow}
                >
                  {isSavingNow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ في المجلد
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  استعادة من نسخة
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={loadSavedBackups}
                >
                  <FolderOpen className="h-4 w-4" />
                  فتح مجلد النسخ الاحتياطية
                </Button>
                {canUndo && (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={undoRestore}
                    disabled={isUndoing}
                  >
                    {isUndoing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    التراجع عن الاستعادة
                  </Button>
                )}
              </div>
              {canUndo && (
                <div className="mt-4 p-3 bg-accent/50 border border-accent rounded-lg flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm text-accent-foreground">
                    يمكنك التراجع عن الاستعادة الأخيرة - هذا الخيار متاح فقط خلال هذه الجلسة
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Print Settings Tab */}
        <TabsContent value="print">
          <TemplatePrintSettings />
        </TabsContent>

        {/* Custom Fields Tab - Last after Print Settings */}
        <TabsContent value="customfields">
          <CustomFieldsManager />
        </TabsContent>

      </Tabs>
    </div>
  );
}

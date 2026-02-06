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
  Check,
  AlertTriangle,
  Image,
  X,
  Calendar,
  Settings2,
  FolderOpen,
  Clock,
} from "lucide-react";
import DateFormatSettings from "@/components/settings/DateFormatSettings";
import TemplatePrintSettings from "@/components/settings/TemplatePrintSettings";
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

// Paper sizes with dimensions in mm
const PAPER_SIZES = [
  { value: "a0", label: "A0", width: 841, height: 1189 },
  { value: "a1", label: "A1", width: 594, height: 841 },
  { value: "a2", label: "A2", width: 420, height: 594 },
  { value: "a3", label: "A3", width: 297, height: 420 },
  { value: "a4", label: "A4", width: 210, height: 297 },
  { value: "a5", label: "A5", width: 148, height: 210 },
  { value: "a6", label: "A6", width: 105, height: 148 },
  { value: "b4", label: "B4", width: 250, height: 353 },
  { value: "b5", label: "B5", width: 176, height: 250 },
  { value: "letter", label: "Letter", width: 216, height: 279 },
  { value: "legal", label: "Legal", width: 216, height: 356 },
  { value: "tabloid", label: "Tabloid", width: 279, height: 432 },
  { value: "executive", label: "Executive", width: 184, height: 267 },
  { value: "custom", label: "حجم مخصص", width: 0, height: 0 },
];

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
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [backupCount, setBackupCount] = useState("10");
  const [autoBackupCount, setAutoBackupCount] = useState("1");
  const [backupHour, setBackupHour] = useState("02");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
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

  // Print Settings State
  const [paperSize, setPaperSize] = useState("a4");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [orientation, setOrientation] = useState("portrait");
  const [marginTop, setMarginTop] = useState("20");
  const [marginBottom, setMarginBottom] = useState("20");
  const [marginRight, setMarginRight] = useState("15");
  const [marginLeft, setMarginLeft] = useState("15");
  const [isSaving, setIsSaving] = useState(false);

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
            case "auto_backup":
              setAutoBackup(setting.value === "true");
              break;
            case "backup_frequency":
              if (setting.value) setBackupFrequency(setting.value);
              break;
            case "backup_count":
              if (setting.value) setBackupCount(setting.value);
              break;
            case "auto_backup_count":
              if (setting.value) setAutoBackupCount(setting.value);
              break;
            case "backup_hour":
              if (setting.value) setBackupHour(setting.value);
              break;
            // Print settings
            case "print_paper_size":
              if (setting.value) setPaperSize(setting.value);
              break;
            case "print_custom_width":
              if (setting.value) setCustomWidth(setting.value);
              break;
            case "print_custom_height":
              if (setting.value) setCustomHeight(setting.value);
              break;
            case "print_orientation":
              if (setting.value) setOrientation(setting.value);
              break;
            case "print_margin_top":
              if (setting.value) setMarginTop(setting.value);
              break;
            case "print_margin_bottom":
              if (setting.value) setMarginBottom(setting.value);
              break;
            case "print_margin_right":
              if (setting.value) setMarginRight(setting.value);
              break;
            case "print_margin_left":
              if (setting.value) setMarginLeft(setting.value);
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

  const saveBackupSettings = async () => {
    try {
      await Promise.all([
        saveSetting("auto_backup", autoBackup.toString()),
        saveSetting("backup_frequency", backupFrequency),
        saveSetting("backup_count", backupCount),
        saveSetting("auto_backup_count", autoBackupCount),
        saveSetting("backup_hour", backupHour),
      ]);
    } catch (error) {
      console.error("Error saving backup settings:", error);
    }
  };

  // Save backup settings when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveBackupSettings();
    }, 500);
    return () => clearTimeout(timer);
  }, [autoBackup, backupFrequency, backupCount, autoBackupCount, backupHour]);

  const getCurrentBackupData = async () => {
    const [
      phdLmd,
      phdScience,
      master,
      templates,
      templateFields,
      settings,
      userSettings,
      dropdownOptions,
      customFonts,
      activityLog,
      phdLmdStudents,
      phdScienceStudents,
      academicTitles,
      customFields,
      customFieldValues,
      customFieldOptions,
      printHistory,
    ] = await Promise.all([
      supabase.from("phd_lmd_certificates").select("*"),
      supabase.from("phd_science_certificates").select("*"),
      supabase.from("master_certificates").select("*"),
      supabase.from("certificate_templates").select("*"),
      supabase.from("certificate_template_fields").select("*"),
      supabase.from("settings").select("*"),
      supabase.from("user_settings").select("*"),
      supabase.from("dropdown_options").select("*"),
      supabase.from("custom_fonts").select("*"),
      supabase.from("activity_log").select("*"),
      supabase.from("phd_lmd_students").select("*"),
      supabase.from("phd_science_students").select("*"),
      supabase.from("academic_titles").select("*"),
      supabase.from("custom_fields").select("*"),
      supabase.from("custom_field_values").select("*"),
      supabase.from("custom_field_options").select("*"),
      supabase.from("print_history").select("*"),
    ]);

    return {
      version: "2.0",
      created_at: new Date().toISOString(),
      data: {
        phd_lmd_certificates: phdLmd.data || [],
        phd_science_certificates: phdScience.data || [],
        master_certificates: master.data || [],
        certificate_templates: templates.data || [],
        certificate_template_fields: templateFields.data || [],
        settings: settings.data || [],
        user_settings: userSettings.data || [],
        dropdown_options: dropdownOptions.data || [],
        custom_fonts: customFonts.data || [],
        activity_log: activityLog.data || [],
        phd_lmd_students: phdLmdStudents.data || [],
        phd_science_students: phdScienceStudents.data || [],
        academic_titles: academicTitles.data || [],
        custom_fields: customFields.data || [],
        custom_field_values: customFieldValues.data || [],
        custom_field_options: customFieldOptions.data || [],
        print_history: printHistory.data || [],
      },
    };
  };

  const downloadBackup = async () => {
    setIsDownloading(true);
    try {
      const backupData = await getCurrentBackupData();

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("تم تنزيل النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error("Error downloading backup:", error);
      toast.error("حدث خطأ أثناء تنزيل النسخة الاحتياطية");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performRestore = async (tableData: Record<string, any[]>) => {
    // Clear existing data and restore from backup
    // Note: Order matters due to foreign key constraints

    // First, delete dependent tables
    await supabase.from("custom_field_values").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custom_field_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("certificate_template_fields").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("print_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Then delete parent tables
    await supabase.from("certificate_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custom_fields").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete certificate tables
    await supabase.from("phd_lmd_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("phd_science_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("master_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("phd_lmd_students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("phd_science_students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("dropdown_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custom_fonts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("academic_titles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("user_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Restore in order - independent tables first
    const restoreTable = async (tableName: string) => {
      if (tableData[tableName]?.length > 0) {
        await supabase.from(tableName as "phd_lmd_certificates").insert(tableData[tableName]);
      }
    };

    // Independent tables
    await Promise.all([
      restoreTable("phd_lmd_certificates"),
      restoreTable("phd_science_certificates"),
      restoreTable("master_certificates"),
      restoreTable("phd_lmd_students"),
      restoreTable("phd_science_students"),
      restoreTable("dropdown_options"),
      restoreTable("custom_fonts"),
      restoreTable("academic_titles"),
      restoreTable("activity_log"),
      restoreTable("settings"),
      restoreTable("user_settings"),
    ]);

    // Parent tables that have dependents
    await restoreTable("certificate_templates");
    await restoreTable("custom_fields");

    // Dependent tables
    await Promise.all([
      restoreTable("certificate_template_fields"),
      restoreTable("custom_field_values"),
      restoreTable("custom_field_options"),
      restoreTable("print_history"),
    ]);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        toast.error("ملف النسخة الاحتياطية غير صالح");
        return;
      }

      const { data: tableData } = backupData;

      // Get backup summary
      const backupSummary: BackupSummary = {
        phdLmdCount: tableData.phd_lmd_certificates?.length || 0,
        phdScienceCount: tableData.phd_science_certificates?.length || 0,
        masterCount: tableData.master_certificates?.length || 0,
        templatesCount: tableData.certificate_templates?.length || 0,
        phdLmdStudentsCount: tableData.phd_lmd_students?.length || 0,
        phdScienceStudentsCount: tableData.phd_science_students?.length || 0,
        createdAt: backupData.created_at,
      };

      // Get current data summary
      const currentBackup = await getCurrentBackupData();
      const currentSummary: BackupSummary = {
        phdLmdCount: currentBackup.data.phd_lmd_certificates?.length || 0,
        phdScienceCount: currentBackup.data.phd_science_certificates?.length || 0,
        masterCount: currentBackup.data.master_certificates?.length || 0,
        templatesCount: currentBackup.data.certificate_templates?.length || 0,
        phdLmdStudentsCount: currentBackup.data.phd_lmd_students?.length || 0,
        phdScienceStudentsCount: currentBackup.data.phd_science_students?.length || 0,
      };

      setPendingBackupData({ data: tableData, summary: backupSummary });
      setCurrentDataSummary(currentSummary);
      setShowRestoreConfirm(true);
    } catch (error) {
      console.error("Error reading backup file:", error);
      toast.error("حدث خطأ أثناء قراءة ملف النسخة الاحتياطية");
    } finally {
      // Reset file input
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
      const currentBackup = await getCurrentBackupData();
      setPreviousBackup(JSON.stringify(currentBackup));

      await performRestore(pendingBackupData.data as Record<string, unknown[]>);

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
      const backupData = JSON.parse(previousBackup);
      const { data: tableData } = backupData;

      await performRestore(tableData);

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

  const savePrintSettings = async () => {
    setIsSaving(true);
    try {
      const settings = [
        { key: "print_paper_size", value: paperSize },
        { key: "print_custom_width", value: customWidth },
        { key: "print_custom_height", value: customHeight },
        { key: "print_orientation", value: orientation },
        { key: "print_margin_top", value: marginTop },
        { key: "print_margin_bottom", value: marginBottom },
        { key: "print_margin_right", value: marginRight },
        { key: "print_margin_left", value: marginLeft },
      ];

      for (const setting of settings) {
        await saveSetting(setting.key, setting.value);
      }

      toast.success("تم حفظ إعدادات الطباعة بنجاح");
    } catch (error) {
      console.error("Error saving print settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
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
                    <li>• شهادات ماستر: {currentDataSummary?.masterCount || 0}</li>
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
                    <li>• شهادات ماستر: {pendingBackupData?.summary.masterCount || 0}</li>
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
            <div className="bg-card rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">النسخ الاحتياطي التلقائي</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    إنشاء نسخ احتياطية تلقائية للبيانات
                  </p>
                </div>
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
              </div>

              {autoBackup && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>تكرار النسخ</Label>
                    <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">كل ساعة</SelectItem>
                        <SelectItem value="daily">يومياً</SelectItem>
                        <SelectItem value="weekly">أسبوعياً</SelectItem>
                        <SelectItem value="monthly">شهرياً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>عدد النسخ التلقائية يومياً</Label>
                    <Select value={autoBackupCount} onValueChange={setAutoBackupCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">01 نسخة</SelectItem>
                        <SelectItem value="2">02 نسختان</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      ساعة الحفظ التلقائي
                    </Label>
                    <Select value={backupHour} onValueChange={setBackupHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, "0");
                          return (
                            <SelectItem key={hour} value={hour}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {autoBackupCount === "2" && (
                      <p className="text-xs text-muted-foreground">
                        النسخة الثانية ستكون الساعة {((parseInt(backupHour) + 12) % 24).toString().padStart(2, "0")}:00
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>عدد النسخ المحفوظة (الأقصى)</Label>
                    <Select value={backupCount} onValueChange={setBackupCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 نسخ</SelectItem>
                        <SelectItem value="10">10 نسخ</SelectItem>
                        <SelectItem value="20">20 نسخة</SelectItem>
                        <SelectItem value="30">30 نسخة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {autoBackup && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      تم تفعيل النسخ الاحتياطي التلقائي - يتم الحفظ {backupFrequency === "hourly" ? "كل ساعة" : backupFrequency === "daily" ? "يومياً" : backupFrequency === "weekly" ? "أسبوعياً" : "شهرياً"} الساعة {backupHour}:00 ({autoBackupCount === "2" ? "نسختان يومياً" : "نسخة واحدة يومياً"})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 shrink-0"
                    onClick={downloadBackup}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    حفظ الآن
                  </Button>
                </div>
              )}
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
                  onClick={() => {
                    toast.info("مجلد النسخ الاحتياطية التلقائية متاح فقط في النسخة المكتبية من التطبيق");
                  }}
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

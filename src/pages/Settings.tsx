import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// @ts-ignore
import UserManagement from "@/components/settings/UserManagement";
import { useSearchParams } from "react-router-dom";
import { isElectron, getDbClient } from "@/lib/database/db-client";
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
  FileText,
  Network,
  Lock,
  Unlock,
  Timer,
  Users,
} from "lucide-react";
import DateFormatSettings from "@/components/settings/DateFormatSettings";
import TemplatePrintSettings from "@/components/settings/TemplatePrintSettings";
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";
import DefenseDocTemplateEditor from "@/components/settings/DefenseDocTemplateEditor";
import NetworkManagement from "@/components/settings/NetworkManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toWesternNumerals } from "@/lib/numerals";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useNetworkInfo } from "@/hooks/useNetworkInfo";
import { toast } from "sonner";

interface BackupSummary {
  phdLmdCount: number;
  phdScienceCount: number;
  masterCount: number;
  templatesCount: number;
  phdLmdStudentsCount: number;
  phdScienceStudentsCount: number;
  defenseDocTemplatesCount?: number;
  defenseStageLmdCount?: number;
  defenseStageScienceCount?: number;
  createdAt?: string;
}


export default function Settings() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeSettingsTab, setActiveSettingsTab] = useState(tabFromUrl || "university");

  useEffect(() => {
    if (tabFromUrl) setActiveSettingsTab(tabFromUrl);
  }, [tabFromUrl]);

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
  const [showRestoreOptions, setShowRestoreOptions] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<{
    data: Record<string, unknown[]>;
    summary: BackupSummary;
  } | null>(null);
  const [currentDataSummary, setCurrentDataSummary] = useState<BackupSummary | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<{ step: string; current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isNetworkBackup, setIsNetworkBackup] = useState(false);
  const { data: networkInfo } = useNetworkInfo();

  // Password management
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newAppPassword, setNewAppPassword] = useState("");
  const [confirmAppPassword, setConfirmAppPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  // Auto-logout
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState<string>("0");

  // Selective restore state
  const [selectedRestoreGroups, setSelectedRestoreGroups] = useState<Record<string, boolean>>({});

  const RESTORE_GROUPS = useMemo(() => [
    {
      id: "phd_lmd_certs",
      label: "شهادات دكتوراه ل م د",
      tables: ["phd_lmd_certificates"],
      countKey: "phdLmdCount" as keyof BackupSummary,
    },
    {
      id: "phd_science_certs",
      label: "شهادات دكتوراه علوم",
      tables: ["phd_science_certificates"],
      countKey: "phdScienceCount" as keyof BackupSummary,
    },
    {
      id: "master_certs",
      label: "شهادات الماستر",
      tables: ["master_certificates"],
      countKey: "masterCount" as keyof BackupSummary,
    },
    {
      id: "phd_lmd_students",
      label: "طلبة دكتوراه ل م د",
      tables: ["phd_lmd_students"],
      countKey: "phdLmdStudentsCount" as keyof BackupSummary,
    },
    {
      id: "phd_science_students",
      label: "طلبة دكتوراه علوم",
      tables: ["phd_science_students"],
      countKey: "phdScienceStudentsCount" as keyof BackupSummary,
    },
    {
      id: "templates",
      label: "القوالب وحقولها",
      tables: ["certificate_templates", "certificate_template_fields"],
      countKey: "templatesCount" as keyof BackupSummary,
    },
    {
      id: "settings",
      label: "الإعدادات",
      tables: ["settings", "user_settings"],
      countKey: null,
    },
    {
      id: "dropdown_options",
      label: "خيارات القوائم المنسدلة",
      tables: ["dropdown_options"],
      countKey: null,
    },
    {
      id: "custom_fields",
      label: "الحقول المخصصة وقيمها",
      tables: ["custom_fields", "custom_field_values", "custom_field_options"],
      countKey: null,
    },
    {
      id: "academic_titles",
      label: "الألقاب العلمية",
      tables: ["academic_titles"],
      countKey: null,
    },
    {
      id: "custom_fonts",
      label: "الخطوط المخصصة",
      tables: ["custom_fonts"],
      countKey: null,
    },
    {
      id: "activity_log",
      label: "سجل النشاطات",
      tables: ["activity_log"],
      countKey: null,
    },
    {
      id: "print_history",
      label: "سجل الطباعة",
      tables: ["print_history"],
      countKey: null,
    },
    {
      id: "notes",
      label: "الملاحظات",
      tables: ["notes"],
      countKey: null,
    },
    {
      id: "defense_doc_templates",
      label: "قوالب وثائق المناقشة",
      tables: ["defense_document_templates"],
      countKey: "defenseDocTemplatesCount" as keyof BackupSummary,
    },
    {
      id: "defense_stage_lmd",
      label: "طور المناقشة - دكتوراه ل م د",
      tables: ["defense_stage_lmd"],
      countKey: "defenseStageLmdCount" as keyof BackupSummary,
    },
    {
      id: "defense_stage_science",
      label: "طور المناقشة - دكتوراه علوم",
      tables: ["defense_stage_science"],
      countKey: "defenseStageScienceCount" as keyof BackupSummary,
    },
  ], []);

  // Logo state
  const [universityLogo, setUniversityLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);


  // Load all settings from database
  useEffect(() => {
    const loadSettings = async () => {
      let settingsData: Array<{ key: string; value: string | null }> = [];
      
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.getAllSettings();
        if (result.success && result.data) {
          settingsData = result.data as Array<{ key: string; value: string | null }>;
        }
      } else {
        const { data, error } = await supabase
          .from("settings")
          .select("*");
        if (!error && data) {
          settingsData = data as Array<{ key: string; value: string | null }>;
        }
      }

      settingsData.forEach((setting) => {
        switch (setting.key) {
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
          case "backup_count":
            if (setting.value) setBackupCount(setting.value);
            break;
          case "app_password_hash":
            if (setting.value) setHasExistingPassword(true);
            break;
          case "auto_logout_minutes":
            if (setting.value) setAutoLogoutMinutes(setting.value);
            break;
        }
      });
    };

    loadSettings();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    if (isElectron()) {
      const db = getDbClient()!;
      await db.setSetting(key, value);
      return;
    }

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
    defenseDocTemplatesCount: data.defense_document_templates?.length || 0,
    defenseStageLmdCount: data.defense_stage_lmd?.length || 0,
    defenseStageScienceCount: data.defense_stage_science?.length || 0,
  });

  const downloadBackup = async () => {
    setIsDownloading(true);
    try {
      const { data: backupData, error } = await BackupService.exportAll();
      if (error || !backupData) throw error || new Error("فشل التصدير");

      const saved = await BackupService.downloadBackupFile(backupData);
      if (saved) {
        toast.success("تم تنزيل النسخة الاحتياطية بنجاح");
      }
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

      if (isElectron()) {
        const db = getDbClient()!;
        const maxCount = parseInt(backupCount) || 10;
        const result = await db.saveBackupToFolder(maxCount);
        if (result.success) {
          toast.success("تم حفظ النسخة الاحتياطية بنجاح في مجلد البرنامج");
        } else {
          throw new Error(result.error || "فشل الحفظ");
        }
        return;
      }

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
    if (isElectron()) {
      try {
        const db = getDbClient()!;
        const result = await db.listBackups();
        if (result.success && result.data) {
          setSavedBackups(result.data as { name: string; created_at: string }[]);
          setShowBackupsList(true);
        } else {
          toast.error("فشل في تحميل قائمة النسخ الاحتياطية");
        }
      } catch (error) {
        console.error("Error loading local backups:", error);
        toast.error("حدث خطأ أثناء تحميل قائمة النسخ الاحتياطية");
      }
      return;
    }
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
      ...getBackupSummary(tableData || {} as BackupData['data']),
      createdAt,
    };

    let currentSummary: BackupSummary = { phdLmdCount: 0, phdScienceCount: 0, masterCount: 0, templatesCount: 0, phdLmdStudentsCount: 0, phdScienceStudentsCount: 0, defenseDocTemplatesCount: 0, defenseStageLmdCount: 0, defenseStageScienceCount: 0 };
    try {
      const { data: currentExport } = await BackupService.exportAll();
      if (currentExport) {
        currentSummary = getBackupSummary(currentExport.data);
      }
    } catch (e) {
      console.warn("Could not fetch current data for comparison:", e);
    }

    // Initialize all groups as selected
    const initialSelection: Record<string, boolean> = {};
    RESTORE_GROUPS.forEach(g => { initialSelection[g.id] = true; });
    setSelectedRestoreGroups(initialSelection);

    setPendingBackupData({ data: tableData as unknown as Record<string, unknown[]>, summary: backupSummary });
    setCurrentDataSummary(currentSummary);
    return true;
  };

  const restoreFromStorage = async (fileName: string) => {
    try {
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.loadBackupFromFolder(fileName);
        if (!result.success || !result.data) {
          toast.error("فشل في قراءة النسخة الاحتياطية");
          return;
        }
        const backupData = result.data as { version?: string; data?: Record<string, unknown[]>; created_at?: string };
        if (!backupData.data) {
          toast.error("ملف النسخة الاحتياطية غير صالح");
          return;
        }
        await prepareRestoreConfirmation(backupData.data as BackupData['data'], backupData.created_at);
        setShowBackupsList(false);
        setShowRestoreConfirm(true);
        return;
      }

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
      if (isElectron()) {
        const db = getDbClient()!;
        const result = await db.deleteBackupFromFolder(fileName);
        if (result.success) {
          setSavedBackups((prev) => prev.filter((b) => b.name !== fileName));
          toast.success("تم حذف النسخة الاحتياطية");
        }
        return;
      }
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
    setShowRestoreOptions(true);
  };

  const handleRestoreFromComputer = () => {
    setShowRestoreOptions(false);
    fileInputRef.current?.click();
  };

  const handleRestoreFromFolder = async () => {
    setShowRestoreOptions(false);
    await loadSavedBackups();
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
      const message = error instanceof Error ? error.message : "حدث خطأ أثناء قراءة ملف النسخة الاحتياطية";
      toast.error(message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const confirmRestore = async () => {
    if (!pendingBackupData) return;

    // Collect selected tables from groups
    const selectedTables: string[] = [];
    RESTORE_GROUPS.forEach(g => {
      if (selectedRestoreGroups[g.id]) {
        selectedTables.push(...g.tables);
      }
    });

    if (selectedTables.length === 0) {
      toast.error("يرجى اختيار عنصر واحد على الأقل للاستعادة");
      return;
    }

    const isFullRestore = selectedTables.length === RESTORE_GROUPS.flatMap(g => g.tables).length;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setRestoreProgress({ step: "حفظ البيانات الحالية...", current: 0, total: 1 });

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

      const { error } = await BackupService.importAll(
        backupToRestore,
        (step, current, total) => { setRestoreProgress({ step, current, total }); },
        isFullRestore ? undefined : selectedTables
      );
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
      setRestoreProgress(null);
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
    const formatted = new Date(dateString).toLocaleString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatted;
  };

  // Network-wide backup
  const handleNetworkBackup = async () => {
    if (!isElectron()) return;
    setIsNetworkBackup(true);
    try {
      const db = getDbClient()!;
      const maxCount = parseInt(backupCount) || 10;
      const result = await db.saveBackupToFolder(maxCount);
      if (result.success) {
        toast.success("تم حفظ النسخة الاحتياطية الشبكية بنجاح");
      } else {
        throw new Error(result.error || "فشل الحفظ");
      }
    } catch (error) {
      console.error("Network backup error:", error);
      toast.error("حدث خطأ أثناء النسخ الاحتياطي الشبكي");
    } finally {
      setIsNetworkBackup(false);
    }
  };

  // Password management
  const hashPasswordLocal = async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleChangePassword = async () => {
    if (!isElectron()) return;
    
    if (hasExistingPassword && !currentPassword.trim()) {
      toast.error("يرجى إدخال كلمة المرور الحالية");
      return;
    }
    if (!newAppPassword.trim() || newAppPassword.length < 4) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    if (newAppPassword !== confirmAppPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsSavingPassword(true);
    try {
      const db = getDbClient()!;

      // تحقق من كلمة المرور الحالية إذا كانت موجودة
      if (hasExistingPassword) {
        const saltResult = await db.getSetting("app_password_salt");
        const hashResult = await db.getSetting("app_password_hash");
        const salt = (saltResult?.data as any)?.value || "";
        const storedHash = (hashResult?.data as any)?.value || "";
        const inputHash = await hashPasswordLocal(currentPassword, salt);
        if (inputHash !== storedHash) {
          toast.error("كلمة المرور الحالية غير صحيحة");
          setIsSavingPassword(false);
          return;
        }
      }

      // تعيين كلمة المرور الجديدة
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const newSalt = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
      const newHash = await hashPasswordLocal(newAppPassword, newSalt);

      await db.setSetting("app_password_salt", newSalt);
      await db.setSetting("app_password_hash", newHash);

      setHasExistingPassword(true);
      setCurrentPassword("");
      setNewAppPassword("");
      setConfirmAppPassword("");
      setShowPasswordSection(false);
      toast.success("تم تغيير كلمة المرور بنجاح");
    } catch (e) {
      console.error("Change password error:", e);
      toast.error("حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!isElectron()) return;
    setIsSavingPassword(true);
    try {
      const db = getDbClient()!;
      await db.setSetting("app_password_hash", "");
      await db.setSetting("app_password_salt", "");
      setHasExistingPassword(false);
      setShowPasswordSection(false);
      toast.success("تم إزالة كلمة المرور");
    } catch (e) {
      toast.error("حدث خطأ");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد الاستعادة
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-right space-y-4">
                <p>اختر العناصر التي تريد استعادتها من النسخة الاحتياطية. سيتم استبدال البيانات الحالية فقط للعناصر المحددة.</p>
                
                {pendingBackupData?.summary.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    تاريخ النسخة: {formatDate(pendingBackupData.summary.createdAt)}
                  </p>
                )}

                {/* Select All / Deselect All */}
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      RESTORE_GROUPS.forEach(g => { all[g.id] = true; });
                      setSelectedRestoreGroups(all);
                    }}
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const none: Record<string, boolean> = {};
                      RESTORE_GROUPS.forEach(g => { none[g.id] = false; });
                      setSelectedRestoreGroups(none);
                    }}
                  >
                    إلغاء تحديد الكل
                  </Button>
                </div>

                {/* Table groups with checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RESTORE_GROUPS.map(group => {
                    const backupCount = group.countKey ? (pendingBackupData?.summary[group.countKey] as number || 0) : null;
                    const currentCount = group.countKey ? (currentDataSummary?.[group.countKey] as number || 0) : null;
                    const isChecked = selectedRestoreGroups[group.id] ?? true;
                    
                    return (
                      <label
                        key={group.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-border opacity-60"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSelectedRestoreGroups(prev => ({ ...prev, [group.id]: !!checked }));
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{group.label}</p>
                          {backupCount !== null && (
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>في النسخة: <span className="text-primary font-medium">{toWesternNumerals(backupCount)}</span></span>
                              <span>الحالي: <span className="text-destructive font-medium">{toWesternNumerals(currentCount || 0)}</span></span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                
                <p className="text-destructive text-sm">
                  ⚠️ يمكنك التراجع عن هذا الإجراء خلال نفس الجلسة فقط
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel onClick={cancelRestore}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!Object.values(selectedRestoreGroups).some(Boolean)}
            >
              استعادة المحدد ({Object.values(selectedRestoreGroups).filter(Boolean).length} من {RESTORE_GROUPS.length})
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
                          {backup.created_at ? new Date(backup.created_at).toLocaleString("ar-EG-u-nu-latn") : ""}
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

      {/* Restore Options Dialog */}
      <AlertDialog open={showRestoreOptions} onOpenChange={setShowRestoreOptions}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <Upload className="h-5 w-5 text-primary" />
              اختر مصدر الاستعادة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              حدد من أين تريد استعادة النسخة الاحتياطية
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleRestoreFromFolder}
            >
              <FolderOpen className="h-8 w-8 text-primary" />
              <span className="font-semibold">من مجلد النسخ الاحتياطية</span>
              <span className="text-xs text-muted-foreground">
                عرض النسخ المحفوظة مسبقاً مرتبة حسب التاريخ
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleRestoreFromComputer}
            >
              <Upload className="h-8 w-8 text-secondary-foreground" />
              <span className="font-semibold">من ملف على الكمبيوتر</span>
              <span className="text-xs text-muted-foreground">
                اختيار ملف JSON من جهازك
              </span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
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
      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6">
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
          <TabsTrigger value="defensedocs" className="gap-2 py-2">
            <FileText className="h-4 w-4" />
            قوالب وثائق المناقشة
          </TabsTrigger>
          <TabsTrigger value="customfields" className="gap-2 py-2">
            <Settings2 className="h-4 w-4" />
            إدارة حقول قاعدة البيانات
          </TabsTrigger>
          {isElectron() && (
            <TabsTrigger value="network" className="gap-2 py-2">
              <Network className="h-4 w-4" />
              إدارة الشبكة
            </TabsTrigger>
          )}
          {isElectron() && (
            <TabsTrigger value="users" className="gap-2 py-2">
              <Users className="h-4 w-4" />
              إدارة المستخدمين
            </TabsTrigger>
          )}
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
              {isRestoring && restoreProgress && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {restoreProgress.step}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((restoreProgress.current / restoreProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-left" dir="ltr">
                    {restoreProgress.current} / {restoreProgress.total}
                  </p>
                </div>
              )}
              {canUndo && (
                <div className="mt-4 p-3 bg-accent/50 border border-accent rounded-lg flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm text-accent-foreground">
                    يمكنك التراجع عن الاستعادة الأخيرة - هذا الخيار متاح فقط خلال هذه الجلسة
                  </span>
                </div>
              )}
            </div>

            {/* Network Backup Section - Electron only */}
            {isElectron() && networkInfo?.isNetwork && (
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  نسخ احتياطي شبكي
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  حفظ نسخة احتياطية كاملة من جميع البيانات المشتركة على الشبكة في مجلد بتاريخ
                </p>
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span>المسار المشترك: <span className="font-mono text-xs">{networkInfo.sharedPath}</span></span>
                </div>
                <Button
                  className="gap-2"
                  onClick={handleNetworkBackup}
                  disabled={isNetworkBackup}
                >
                  {isNetworkBackup ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Network className="h-4 w-4" />
                  )}
                  نسخ احتياطي شبكي الآن
                </Button>
              </div>
            )}

            {/* Password Management - Electron only */}
            {/* Auto-Logout Setting - Electron only */}
            {isElectron() && (
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  قفل تلقائي عند عدم النشاط
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  قفل التطبيق تلقائياً بعد فترة عدم نشاط لحماية البيانات
                </p>
                <div className="flex items-center gap-3 max-w-xs">
                  <Select
                    value={autoLogoutMinutes}
                    onValueChange={async (val) => {
                      setAutoLogoutMinutes(val);
                      await saveSetting("auto_logout_minutes", val);
                      window.dispatchEvent(new Event("auto-logout-setting-changed"));
                      toast.success(val === "0" ? "تم تعطيل القفل التلقائي" : `سيتم قفل التطبيق بعد ${val} دقيقة من عدم النشاط`);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">معطل</SelectItem>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isElectron() && (
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {hasExistingPassword ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
                  حماية التطبيق بكلمة مرور
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasExistingPassword ? "التطبيق محمي بكلمة مرور. يمكنك تغييرها أو إزالتها." : "لم يتم تعيين كلمة مرور بعد."}
                </p>
                
                {!showPasswordSection ? (
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setShowPasswordSection(true)}>
                      <Lock className="h-4 w-4" />
                      {hasExistingPassword ? "تغيير كلمة المرور" : "تعيين كلمة مرور"}
                    </Button>
                    {hasExistingPassword && (
                      <Button variant="ghost" className="gap-2 text-destructive" onClick={handleRemovePassword} disabled={isSavingPassword}>
                        <Unlock className="h-4 w-4" />
                        إزالة كلمة المرور
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    {hasExistingPassword && (
                      <div className="space-y-2">
                        <Label>كلمة المرور الحالية</Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور الحالية"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>كلمة المرور الجديدة</Label>
                      <Input
                        type="password"
                        value={newAppPassword}
                        onChange={(e) => setNewAppPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تأكيد كلمة المرور</Label>
                      <Input
                        type="password"
                        value={confirmAppPassword}
                        onChange={(e) => setConfirmAppPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button className="gap-2" onClick={handleChangePassword} disabled={isSavingPassword}>
                        {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowPasswordSection(false);
                        setCurrentPassword("");
                        setNewAppPassword("");
                        setConfirmAppPassword("");
                      }}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Print Settings Tab */}
        <TabsContent value="print">
          <TemplatePrintSettings />
        </TabsContent>

        {/* Defense Document Templates Tab */}
        <TabsContent value="defensedocs">
          <DefenseDocTemplateEditor />
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="customfields">
          <CustomFieldsManager />
        </TabsContent>

        {/* Network Management Tab */}
        {isElectron() && (
          <TabsContent value="network">
            <NetworkManagement />
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}

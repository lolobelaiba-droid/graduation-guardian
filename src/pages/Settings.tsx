import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Database,
  Shield,
  Printer,
  Download,
  Upload,
  Save,
  RefreshCw,
  Loader2,
  Check,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [previousBackup, setPreviousBackup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const saveBackupSettings = async () => {
    try {
      await Promise.all([
        saveSetting("auto_backup", autoBackup.toString()),
        saveSetting("backup_frequency", backupFrequency),
        saveSetting("backup_count", backupCount),
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
  }, [autoBackup, backupFrequency, backupCount]);

  const getCurrentBackupData = async () => {
    const [
      phdLmd,
      phdScience,
      master,
      templates,
      templateFields,
      settings,
      dropdownOptions,
      customFonts,
      activityLog,
    ] = await Promise.all([
      supabase.from("phd_lmd_certificates").select("*"),
      supabase.from("phd_science_certificates").select("*"),
      supabase.from("master_certificates").select("*"),
      supabase.from("certificate_templates").select("*"),
      supabase.from("certificate_template_fields").select("*"),
      supabase.from("settings").select("*"),
      supabase.from("dropdown_options").select("*"),
      supabase.from("custom_fonts").select("*"),
      supabase.from("activity_log").select("*"),
    ]);

    return {
      version: "1.0",
      created_at: new Date().toISOString(),
      data: {
        phd_lmd_certificates: phdLmd.data || [],
        phd_science_certificates: phdScience.data || [],
        master_certificates: master.data || [],
        certificate_templates: templates.data || [],
        certificate_template_fields: templateFields.data || [],
        settings: settings.data || [],
        dropdown_options: dropdownOptions.data || [],
        custom_fonts: customFonts.data || [],
        activity_log: activityLog.data || [],
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
    await supabase.from("certificate_template_fields").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Then delete parent tables
    await supabase.from("certificate_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete certificate tables
    await supabase.from("phd_lmd_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("phd_science_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("master_certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("dropdown_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("custom_fonts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Restore in order
    if (tableData.phd_lmd_certificates?.length > 0) {
      await supabase.from("phd_lmd_certificates").insert(tableData.phd_lmd_certificates);
    }

    if (tableData.phd_science_certificates?.length > 0) {
      await supabase.from("phd_science_certificates").insert(tableData.phd_science_certificates);
    }

    if (tableData.master_certificates?.length > 0) {
      await supabase.from("master_certificates").insert(tableData.master_certificates);
    }

    if (tableData.certificate_templates?.length > 0) {
      await supabase.from("certificate_templates").insert(tableData.certificate_templates);
    }

    if (tableData.certificate_template_fields?.length > 0) {
      await supabase.from("certificate_template_fields").insert(tableData.certificate_template_fields);
    }

    if (tableData.dropdown_options?.length > 0) {
      await supabase.from("dropdown_options").insert(tableData.dropdown_options);
    }

    if (tableData.custom_fonts?.length > 0) {
      await supabase.from("custom_fonts").insert(tableData.custom_fonts);
    }
  };

  const restoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        throw new Error("ملف النسخة الاحتياطية غير صالح");
      }

      // Save current state before restoring
      const currentBackup = await getCurrentBackupData();
      setPreviousBackup(JSON.stringify(currentBackup));

      const { data: tableData } = backupData;

      await performRestore(tableData);

      setCanUndo(true);
      toast.success("تم استعادة النسخة الاحتياطية بنجاح - يمكنك التراجع خلال هذه الجلسة");
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
    } finally {
      setIsRestoring(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={restoreBackup}
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
          <TabsTrigger value="backup" className="gap-2 py-2">
            <Database className="h-4 w-4" />
            النسخ الاحتياطية
          </TabsTrigger>
          <TabsTrigger value="print" className="gap-2 py-2">
            <Printer className="h-4 w-4" />
            إعدادات الطباعة
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 py-2">
            <Shield className="h-4 w-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

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
                <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  رفع شعار جديد
                </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label>عدد النسخ المحفوظة</Label>
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
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    تم تفعيل النسخ الاحتياطي التلقائي - يتم الحفظ {backupFrequency === "hourly" ? "كل ساعة" : backupFrequency === "daily" ? "يومياً" : backupFrequency === "weekly" ? "أسبوعياً" : "شهرياً"}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-semibold mb-4">النسخ الاحتياطي اليدوي</h3>
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
              <p className="text-sm text-muted-foreground mt-4">
                سيتم تنزيل ملف JSON يحتوي على جميع بيانات النظام بما في ذلك الطلاب والقوالب والإعدادات
              </p>
              {canUndo && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">
                    يمكنك التراجع عن الاستعادة الأخيرة - هذا الخيار متاح فقط خلال هذه الجلسة
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Print Settings Tab */}
        <TabsContent value="print">
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">إعدادات الطباعة الافتراضية</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>حجم الورق الافتراضي</Label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label} {size.width > 0 && `(${size.width}×${size.height} مم)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paperSize === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>العرض المخصص (مم)</Label>
                    <Input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      min="50"
                      max="2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الارتفاع المخصص (مم)</Label>
                    <Input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      min="50"
                      max="2000"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>الاتجاه الافتراضي</Label>
                <Select value={orientation} onValueChange={setOrientation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">عمودي</SelectItem>
                    <SelectItem value="landscape">أفقي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الهامش العلوي (مم)</Label>
                <Input
                  type="number"
                  value={marginTop}
                  onChange={(e) => setMarginTop(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الهامش السفلي (مم)</Label>
                <Input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الهامش الأيمن (مم)</Label>
                <Input
                  type="number"
                  value={marginRight}
                  onChange={(e) => setMarginRight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>الهامش الأيسر (مم)</Label>
                <Input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gap-2" onClick={savePrintSettings} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">إعدادات الأمان</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                تحديث كلمة المرور
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

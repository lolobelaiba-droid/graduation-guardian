import { useState, useEffect } from "react";
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
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [paperSize, setPaperSize] = useState("a4");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [orientation, setOrientation] = useState("portrait");
  const [marginTop, setMarginTop] = useState("20");
  const [marginBottom, setMarginBottom] = useState("20");
  const [marginRight, setMarginRight] = useState("15");
  const [marginLeft, setMarginLeft] = useState("15");
  const [isSaving, setIsSaving] = useState(false);

  // Load print settings from database
  useEffect(() => {
    const loadPrintSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .in("key", [
          "print_paper_size",
          "print_custom_width",
          "print_custom_height",
          "print_orientation",
          "print_margin_top",
          "print_margin_bottom",
          "print_margin_right",
          "print_margin_left",
        ]);

      if (!error && data) {
        data.forEach((setting) => {
          switch (setting.key) {
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

    loadPrintSettings();
  }, []);

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
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("key", setting.key)
          .single();

        if (existing) {
          await supabase
            .from("settings")
            .update({ value: setting.value })
            .eq("id", existing.id);
        } else {
          await supabase.from("settings").insert([setting]);
        }
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
                  defaultValue="جامعة التقنية والعلوم التطبيقية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="universityNameEn">اسم الجامعة (إنجليزي)</Label>
                <Input
                  id="universityNameEn"
                  defaultValue="University of Technology and Applied Sciences"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input id="address" defaultValue="عمان - سلطنة عمان" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input id="phone" defaultValue="+968 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" defaultValue="info@utas.edu.om" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">الموقع الإلكتروني</Label>
                <Input id="website" defaultValue="https://www.utas.edu.om" />
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
              <Button className="gap-2">
                <Save className="h-4 w-4" />
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
                    <Select defaultValue="10">
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
            </div>

            <div className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-semibold mb-4">النسخ الاحتياطي اليدوي</h3>
              <div className="flex flex-wrap gap-4">
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  تنزيل نسخة احتياطية
                </Button>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  استعادة من نسخة
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-semibold mb-4">آخر النسخ الاحتياطية</h3>
              <div className="space-y-3">
                {[
                  { date: "2024-01-20 10:30", size: "2.5 MB" },
                  { date: "2024-01-19 10:30", size: "2.4 MB" },
                  { date: "2024-01-18 10:30", size: "2.3 MB" },
                ].map((backup, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">{backup.date}</p>
                      <p className="text-sm text-muted-foreground">{backup.size}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Download className="h-4 w-4" />
                        تنزيل
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <RefreshCw className="h-4 w-4" />
                        استعادة
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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

import { useState } from "react";
import {
  Building2,
  Database,
  Shield,
  Printer,
  Download,
  Upload,
  Save,
  RefreshCw,
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

export default function Settings() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");

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
                <Select defaultValue="a4">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الاتجاه الافتراضي</Label>
                <Select defaultValue="portrait">
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
                <Input type="number" defaultValue="20" />
              </div>
              <div className="space-y-2">
                <Label>الهامش السفلي (مم)</Label>
                <Input type="number" defaultValue="20" />
              </div>
              <div className="space-y-2">
                <Label>الهامش الأيمن (مم)</Label>
                <Input type="number" defaultValue="15" />
              </div>
              <div className="space-y-2">
                <Label>الهامش الأيسر (مم)</Label>
                <Input type="number" defaultValue="15" />
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

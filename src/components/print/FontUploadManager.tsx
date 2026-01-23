import { useState, useRef } from "react";
import { Upload, Trash2, Type, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useCustomFonts, useCreateCustomFont, useDeleteCustomFont, loadCustomFont, type CustomFont } from "@/hooks/useCustomFonts";
import { toast } from "sonner";

export function FontUploadManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fontToDelete, setFontToDelete] = useState<CustomFont | null>(null);
  const [fontName, setFontName] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [isArabic, setIsArabic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fonts = [], isLoading } = useCustomFonts();
  const createFont = useCreateCustomFont();
  const deleteFont = useDeleteCustomFont();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.ttf', '.otf', '.woff', '.woff2'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(extension)) {
        toast.error("يرجى اختيار ملف خط صالح (TTF, OTF, WOFF, WOFF2)");
        return;
      }

      setSelectedFile(file);
      
      // Auto-fill font name from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      if (!fontName) setFontName(nameWithoutExt);
      if (!fontFamily) setFontFamily(nameWithoutExt.replace(/\s+/g, '-'));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fontName || !fontFamily) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${fontFamily}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-fonts')
        .upload(fileName, selectedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('custom-fonts')
        .getPublicUrl(fileName);

      // Create font record
      await createFont.mutateAsync({
        font_name: fontName,
        font_family: fontFamily,
        font_url: publicUrl,
        font_weight: 'normal',
        font_style: 'normal',
        is_arabic: isArabic,
      });

      // Load the font immediately
      await loadCustomFont({
        id: '',
        font_name: fontName,
        font_family: fontFamily,
        font_url: publicUrl,
        font_weight: 'normal',
        font_style: 'normal',
        is_arabic: isArabic,
        created_at: '',
      });

      // Reset form
      setFontName("");
      setFontFamily("");
      setIsArabic(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("فشل في رفع الخط: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!fontToDelete) return;

    try {
      // Extract filename from URL
      const urlParts = fontToDelete.font_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('custom-fonts')
        .remove([fileName]);

      // Delete from database
      await deleteFont.mutateAsync(fontToDelete.id);
    } catch (error) {
      console.error("Error deleting font:", error);
    } finally {
      setFontToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Type className="h-4 w-4" />
          الخطوط المخصصة
        </h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 ml-1" />
              رفع خط جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفع خط مخصص</DialogTitle>
              <DialogDescription>
                ارفع ملف خط (TTF, OTF, WOFF, WOFF2) لاستخدامه في الشهادات
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* File Input */}
              <div className="space-y-2">
                <Label>ملف الخط *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-success" />
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Font Name */}
              <div className="space-y-2">
                <Label>اسم الخط (للعرض) *</Label>
                <Input
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  placeholder="مثال: خط أميري"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label>اسم العائلة (للكود) *</Label>
                <Input
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  placeholder="مثال: Amiri"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  سيُستخدم هذا الاسم في CSS و PDF
                </p>
              </div>

              {/* Arabic Font Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is-arabic">خط عربي</Label>
                <Switch
                  id="is-arabic"
                  checked={isArabic}
                  onCheckedChange={setIsArabic}
                />
              </div>

              {/* Preview */}
              {fontName && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
                  <p className="text-lg" style={{ fontFamily: fontFamily }}>
                    {isArabic ? "بسم الله الرحمن الرحيم" : "The quick brown fox jumps over the lazy dog"}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || !selectedFile || !fontName || !fontFamily}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ml-2" />
                    رفع الخط
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Font List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fonts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>لا توجد خطوط مخصصة</p>
          <p className="text-xs mt-1">ارفع خطاً جديداً لاستخدامه في الشهادات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fonts.map((font) => (
            <div
              key={font.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium" style={{ fontFamily: font.font_family }}>
                    {font.font_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {font.font_family}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {font.is_arabic && (
                  <Badge variant="secondary" className="text-xs">
                    عربي
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setFontToDelete(font)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!fontToDelete} onOpenChange={() => setFontToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الخط</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الخط "{fontToDelete?.font_name}"؟ 
              قد يؤثر هذا على القوالب التي تستخدم هذا الخط.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useRef } from "react";
import { Upload, Plus, Trash2, FileType, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CustomFont {
  id: string;
  font_name: string;
  font_family: string;
  font_url: string;
  is_arabic: boolean;
  font_weight: string;
  font_style: string;
}

export function FontManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const [newFontName, setNewFontName] = useState("");
  const [newFontFamily, setNewFontFamily] = useState("");
  const [isArabic, setIsArabic] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch custom fonts from database
  const { data: customFonts = [], isLoading } = useQuery({
    queryKey: ["custom_fonts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fonts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomFont[];
    },
  });

  // Delete font mutation
  const deleteFont = useMutation({
    mutationFn: async (fontId: string) => {
      const font = customFonts.find(f => f.id === fontId);
      if (font?.font_url) {
        // Extract file path from URL
        const urlParts = font.font_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `fonts/${fileName}`;
        
        // Delete from storage
        await supabase.storage.from("custom-fonts").remove([filePath]);
      }
      
      const { error } = await supabase
        .from("custom_fonts")
        .delete()
        .eq("id", fontId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fonts"] });
      toast.success("تم حذف الخط بنجاح");
    },
    onError: (error) => {
      toast.error("فشل في حذف الخط: " + (error as Error).message);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".ttf") && !file.name.endsWith(".otf") && !file.name.endsWith(".woff") && !file.name.endsWith(".woff2")) {
      toast.error("يرجى اختيار ملف خط صالح (TTF, OTF, WOFF, WOFF2)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    if (!newFontName.trim() || !newFontFamily.trim()) {
      toast.error("يرجى إدخال اسم الخط واسم العائلة");
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const fileName = `${newFontFamily.replace(/\s+/g, "-")}_${timestamp}.${ext}`;
      const filePath = `fonts/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("custom-fonts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("custom-fonts")
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from("custom_fonts")
        .insert({
          font_name: newFontName.trim(),
          font_family: newFontFamily.trim(),
          font_url: urlData.publicUrl,
          is_arabic: isArabic,
          font_weight: "normal",
          font_style: "normal",
        });

      if (dbError) throw dbError;

      // Reset form
      setNewFontName("");
      setNewFontFamily("");
      setIsArabic(true);
      if (fileInputRef.current) fileInputRef.current.value = "";

      queryClient.invalidateQueries({ queryKey: ["custom_fonts"] });
      toast.success("تم رفع الخط بنجاح");
    } catch (error) {
      toast.error("فشل في رفع الخط: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload New Font */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إضافة خط جديد
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم الخط (للعرض)</Label>
            <Input
              placeholder="مثال: خط المجلة"
              value={newFontName}
              onChange={(e) => setNewFontName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>اسم العائلة (Font Family)</Label>
            <Input
              placeholder="مثال: SakkalMajalla"
              value={newFontFamily}
              onChange={(e) => setNewFontFamily(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={isArabic} onCheckedChange={setIsArabic} />
            <Label>خط عربي</Label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !newFontName.trim() || !newFontFamily.trim()}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploading ? "جاري الرفع..." : "رفع ملف الخط"}
          </Button>
          <span className="text-xs text-muted-foreground">
            TTF, OTF, WOFF, WOFF2 (حتى 5 ميجابايت)
          </span>
        </div>
      </div>

      {/* Font List */}
      <div className="space-y-3">
        <h4 className="font-semibold">الخطوط المضافة</h4>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : customFonts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 border rounded-lg">
            <FileType className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>لا توجد خطوط مضافة</p>
            <p className="text-sm">ارفع خطوطاً جديدة لاستخدامها في الشهادات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFonts.map((font) => (
              <div
                key={font.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileType className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium" style={{ fontFamily: font.font_family }}>
                      {font.font_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {font.font_family}
                    </p>
                  </div>
                  <Badge variant={font.is_arabic ? "default" : "secondary"}>
                    {font.is_arabic ? "عربي" : "لاتيني"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteFont.mutate(font.id)}
                  disabled={deleteFont.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

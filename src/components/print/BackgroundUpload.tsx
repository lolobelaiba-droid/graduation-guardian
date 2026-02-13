import { useState, useRef } from "react";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isElectron } from "@/lib/database/db-client";

interface BackgroundUploadProps {
  templateId: string;
  currentImageUrl: string | null;
  onUploadComplete: (url: string | null) => void;
}

export function BackgroundUpload({
  templateId,
  currentImageUrl,
  onUploadComplete,
}: BackgroundUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setIsUploading(true);

    try {
      if (isElectron()) {
        // In Electron: convert to base64 and store directly
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onUploadComplete(base64);
          toast.success("تم رفع صورة الخلفية بنجاح");
          setIsUploading(false);
        };
        reader.onerror = () => {
          toast.error("فشل في قراءة الصورة");
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Web: upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${templateId}_${Date.now()}.${fileExt}`;
        const filePath = `backgrounds/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("template-backgrounds")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("template-backgrounds")
          .getPublicUrl(filePath);

        onUploadComplete(publicUrl);
        toast.success("تم رفع صورة الخلفية بنجاح");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("فشل في رفع الصورة");
    } finally {
      if (!isElectron()) {
        setIsUploading(false);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    try {
      if (!isElectron()) {
        // Only try to remove from Supabase storage if it's a URL (not base64)
        if (currentImageUrl.startsWith('http')) {
          const urlParts = currentImageUrl.split("/template-backgrounds/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from("template-backgrounds").remove([filePath]);
          }
        }
      }

      onUploadComplete(null);
      toast.success("تم حذف صورة الخلفية");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("فشل في حذف الصورة");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">صورة الخلفية</span>
      </div>

      {currentImageUrl ? (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="خلفية القالب"
            className="w-full h-32 object-contain rounded-lg border bg-muted/20"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري الرفع...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                اضغط لرفع صورة الخلفية
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG حتى 5MB
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </div>
  );
}

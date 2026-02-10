import { useState, useRef } from "react";
import { Upload, Plus, Trash2, FileType, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ParsedFontInfo {
  fontName: string;
  fontFamily: string;
  isArabic: boolean;
  fontStyle: 'normal' | 'bold' | 'italic';
  fontWeight: 'normal' | 'bold';
}

/**
 * Parse font metadata from TTF/OTF file
 * Reads the 'name' table to extract font name and family
 */
async function parseFontFile(file: File): Promise<ParsedFontInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new DataView(buffer);
        
        // Read offset table
        const numTables = data.getUint16(4);
        
        let nameTableOffset = 0;
        let nameTableLength = 0;
        let os2TableOffset = 0;
        let headTableOffset = 0;
        
        // Find 'name', 'OS/2', and 'head' tables
        for (let i = 0; i < numTables; i++) {
          const tableOffset = 12 + i * 16;
          const tag = String.fromCharCode(
            data.getUint8(tableOffset),
            data.getUint8(tableOffset + 1),
            data.getUint8(tableOffset + 2),
            data.getUint8(tableOffset + 3)
          );
          
          if (tag === 'name') {
            nameTableOffset = data.getUint32(tableOffset + 8);
            nameTableLength = data.getUint32(tableOffset + 12);
          } else if (tag === 'OS/2') {
            os2TableOffset = data.getUint32(tableOffset + 8);
          } else if (tag === 'head') {
            headTableOffset = data.getUint32(tableOffset + 8);
          }
        }
        
        // Detect bold/italic from OS/2 table (fsSelection field at offset 62)
        let isBoldFromTable = false;
        let isItalicFromTable = false;
        
        if (os2TableOffset > 0) {
          try {
            const fsSelection = data.getUint16(os2TableOffset + 62);
            isBoldFromTable = !!(fsSelection & 0x0020); // bit 5 = BOLD
            isItalicFromTable = !!(fsSelection & 0x0001); // bit 0 = ITALIC
          } catch { /* ignore */ }
        }
        
        // Fallback: detect from head table (macStyle at offset 44)
        if (!isBoldFromTable && !isItalicFromTable && headTableOffset > 0) {
          try {
            const macStyle = data.getUint16(headTableOffset + 44);
            isBoldFromTable = !!(macStyle & 0x0001); // bit 0 = Bold
            isItalicFromTable = !!(macStyle & 0x0002); // bit 1 = Italic
          } catch { /* ignore */ }
        }
        
        if (nameTableOffset === 0) {
          const baseName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
          const isBoldByName = /bold|عريض/i.test(baseName);
          resolve({
            fontName: baseName,
            fontFamily: baseName.replace(/[-_\s]+/g, ''),
            isArabic: false,
            fontStyle: isBoldByName || isBoldFromTable ? 'bold' : 'normal',
            fontWeight: isBoldByName || isBoldFromTable ? 'bold' : 'normal',
          });
          return;
        }
        
        // Parse name table
        const format = data.getUint16(nameTableOffset);
        const count = data.getUint16(nameTableOffset + 2);
        const stringOffset = data.getUint16(nameTableOffset + 4);
        
        let fontFamily = '';
        let fontName = '';
        let fontSubfamily = ''; // nameID 2 = Font Subfamily (Regular, Bold, Italic, etc.)
        let hasArabicGlyphs = false;
        
        for (let i = 0; i < count; i++) {
          const recordOffset = nameTableOffset + 6 + i * 12;
          const platformID = data.getUint16(recordOffset);
          const encodingID = data.getUint16(recordOffset + 2);
          const languageID = data.getUint16(recordOffset + 4);
          const nameID = data.getUint16(recordOffset + 6);
          const length = data.getUint16(recordOffset + 8);
          const offset = data.getUint16(recordOffset + 10);
          
          // nameID 1 = Font Family, nameID 2 = Subfamily, nameID 4 = Full Font Name
          if (nameID === 1 || nameID === 2 || nameID === 4) {
            const stringStart = nameTableOffset + stringOffset + offset;
            let str = '';
            
            // Platform 3 (Windows) uses UTF-16BE
            if (platformID === 3 && encodingID === 1) {
              for (let j = 0; j < length; j += 2) {
                const charCode = data.getUint16(stringStart + j);
                if (charCode > 0) str += String.fromCharCode(charCode);
                
                // Check for Arabic Unicode range
                if (charCode >= 0x0600 && charCode <= 0x06FF) {
                  hasArabicGlyphs = true;
                }
              }
            }
            // Platform 1 (Macintosh) uses single-byte encoding
            else if (platformID === 1) {
              for (let j = 0; j < length; j++) {
                const charCode = data.getUint8(stringStart + j);
                if (charCode > 0) str += String.fromCharCode(charCode);
              }
            }
            
            if (str && nameID === 1 && !fontFamily) {
              fontFamily = str;
            }
            if (str && nameID === 2 && !fontSubfamily) {
              fontSubfamily = str;
            }
            if (str && nameID === 4 && !fontName) {
              fontName = str;
            }
          }
        }
        
        // Fallback to filename if parsing failed
        if (!fontFamily && !fontName) {
          const baseName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
          fontFamily = baseName.replace(/[-_\s]+/g, '');
          fontName = baseName;
        }
        
        // Use fontFamily as fontName if fontName is empty
        if (!fontName) fontName = fontFamily;
        if (!fontFamily) fontFamily = fontName.replace(/[-_\s]+/g, '');
        
        // Detect bold/italic from subfamily name or font name
        const isBoldByName = /bold|عريض|gras|heavy|black/i.test(fontSubfamily) || 
                             /bold|عريض/i.test(fontName);
        const isItalicByName = /italic|oblique|مائل/i.test(fontSubfamily) || 
                               /italic|oblique/i.test(fontName);
        
        const isBold = isBoldFromTable || isBoldByName;
        const isItalic = isItalicFromTable || isItalicByName;
        
        // Detect Arabic fonts by common naming patterns
        const arabicPatterns = /arabic|عربي|naskh|kufi|majalla|amiri|cairo|tajawal|noto.*arab|scheherazade|lateef|harmattan/i;
        const isArabicByName = arabicPatterns.test(fontName) || arabicPatterns.test(fontFamily);
        
        resolve({
          fontName,
          fontFamily: fontFamily.replace(/\s+/g, ''),
          isArabic: hasArabicGlyphs || isArabicByName,
          fontStyle: isBold ? 'bold' : isItalic ? 'italic' : 'normal',
          fontWeight: isBold ? 'bold' : 'normal',
        });
        
      } catch (error) {
        // Fallback to filename
        const baseName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
        const isBoldByName = /bold|عريض/i.test(baseName);
        resolve({
          fontName: baseName,
          fontFamily: baseName.replace(/[-_\s]+/g, ''),
          isArabic: false,
          fontStyle: isBoldByName ? 'bold' : 'normal',
          fontWeight: isBoldByName ? 'bold' : 'normal',
        });
      }
    };
    
    reader.onerror = () => {
      const baseName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
      const isBoldByName = /bold|عريض/i.test(baseName);
      resolve({
        fontName: baseName,
        fontFamily: baseName.replace(/[-_\s]+/g, ''),
        isArabic: false,
        fontStyle: isBoldByName ? 'bold' : 'normal',
        fontWeight: isBoldByName ? 'bold' : 'normal',
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function FontManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedFont, setParsedFont] = useState<ParsedFontInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isArabicOverride, setIsArabicOverride] = useState<boolean | null>(null);
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

    // Parse font metadata
    toast.info("جاري قراءة معلومات الخط...");
    const fontInfo = await parseFontFile(file);
    
    setParsedFont(fontInfo);
    setSelectedFile(file);
    setIsArabicOverride(null); // Reset override
    
    toast.success(`تم التعرف على الخط: ${fontInfo.fontName}`);
  };

  const handleUpload = async () => {
    if (!selectedFile || !parsedFont) return;

    setIsUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = selectedFile.name.split(".").pop();
      const fileName = `${parsedFont.fontFamily}_${timestamp}.${ext}`;
      const filePath = `fonts/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("custom-fonts")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("custom-fonts")
        .getPublicUrl(filePath);

      // Use override if set, otherwise use parsed value
      const isArabic = isArabicOverride !== null ? isArabicOverride : parsedFont.isArabic;

      // For bold/italic variants, ensure the font_name includes a style suffix
      // so the style lookup system can find bold variants by name pattern
      let saveFontName = parsedFont.fontName;
      if (parsedFont.fontStyle === 'bold' && !saveFontName.includes('Bold') && !saveFontName.includes('عريض')) {
        saveFontName = `${parsedFont.fontName} Bold`;
      }

      // Save to database
      const { error: dbError } = await supabase
        .from("custom_fonts")
        .insert({
          font_name: saveFontName,
          font_family: parsedFont.fontFamily,
          font_url: urlData.publicUrl,
          is_arabic: isArabic,
          font_weight: parsedFont.fontWeight,
          font_style: parsedFont.fontStyle,
        });

      if (dbError) throw dbError;

      // Reset form
      setParsedFont(null);
      setSelectedFile(null);
      setIsArabicOverride(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      queryClient.invalidateQueries({ queryKey: ["custom_fonts"] });
      toast.success("تم رفع الخط بنجاح");
    } catch (error) {
      toast.error("فشل في رفع الخط: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setParsedFont(null);
    setSelectedFile(null);
    setIsArabicOverride(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const effectiveIsArabic = isArabicOverride !== null ? isArabicOverride : parsedFont?.isArabic ?? true;

  return (
    <div className="space-y-6">
      {/* Upload New Font */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إضافة خط جديد
        </h4>
        
        {!parsedFont ? (
          // Step 1: Select file
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اختر ملف الخط وسيتم قراءة المعلومات تلقائياً
            </p>
            
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
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                اختر ملف الخط
              </Button>
              <span className="text-xs text-muted-foreground">
                TTF, OTF, WOFF, WOFF2 (حتى 5 ميجابايت)
              </span>
            </div>
          </div>
        ) : (
          // Step 2: Confirm parsed info
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">تم قراءة معلومات الخط</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">اسم الخط:</span>
                  <p className="font-medium">{parsedFont.fontName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">اسم العائلة:</span>
                  <p className="font-medium font-mono">{parsedFont.fontFamily}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">النمط:</span>
                  <p className="font-medium">
                    {parsedFont.fontStyle === 'bold' ? 'غامق (Bold)' : parsedFont.fontStyle === 'italic' ? 'مائل (Italic)' : 'عادي (Regular)'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={effectiveIsArabic} 
                    onCheckedChange={(checked) => setIsArabicOverride(checked)} 
                  />
                  <Label>خط عربي</Label>
                </div>
                {parsedFont.isArabic && isArabicOverride === null && (
                  <Badge variant="outline" className="text-xs">
                    تم الكشف تلقائياً
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "جاري الرفع..." : "رفع الخط"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
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
                  {font.font_style === 'bold' && (
                    <Badge variant="outline" className="text-xs">غامق</Badge>
                  )}
                  {font.font_style === 'italic' && (
                    <Badge variant="outline" className="text-xs">مائل</Badge>
                  )}
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

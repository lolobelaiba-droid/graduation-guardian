import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, Printer, Eye, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Type, Fullscreen, Search, Clock, FileType, User, Hash, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useCertificateTemplates,
  useTemplateFields,
  useUpdateTemplateField,
  useDeleteTemplateField,
  useUpdateTemplate,
  usePhdLmdCertificates,
  usePhdScienceCertificates,
  useMasterCertificates,
} from "@/hooks/useCertificates";
import { useSaveSetting, useUserSettings } from "@/hooks/useUserSettings";
import {
  certificateTypeLabels,
  languageLabels,
  mentionLabels,
  type CertificateType,
  type TemplateLanguage,
  type MentionType,
} from "@/types/certificates";
import { CertificatePreview } from "@/components/print/CertificatePreview";
import { AddStudentDialog } from "@/components/print/AddStudentDialog";
import { CreateTemplateDialog } from "@/components/print/CreateTemplateDialog";
import { generatePDF, generatePDFBlob } from "@/lib/pdfGenerator";
import { BackgroundUpload } from "@/components/print/BackgroundUpload";
import { ImportExcelDialog } from "@/components/print/import";
import { AddFieldDialog } from "@/components/print/AddFieldDialog";
import { BrowseDatabaseDialog } from "@/components/print/BrowseDatabaseDialog";
import { FullPreviewDialog } from "@/components/print/FullPreviewDialog";
import { FontManagement } from "@/components/print/FontManagement";
import { PrintableCSS } from "@/components/print/PrintableCSS";
import { getFontOptions, getAllFonts, setCustomFonts, type FontConfig } from "@/lib/arabicFonts";
import { toWesternNumerals } from "@/lib/numerals";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCssPrint } from "@/hooks/useCssPrint";
import { usePrintSettings, getPaperDimensions, PAPER_SIZES, DEFAULT_PRINT_SETTINGS } from "@/hooks/usePrintSettings";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";

export default function PrintCertificates() {
  const [selectedType, setSelectedType] = useState<CertificateType>("phd_lmd");
  const [selectedLanguage, setSelectedLanguage] = useState<TemplateLanguage>("ar");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [stepSize, setStepSize] = useState<number>(1);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  
  // Background offset state for visual alignment
  const [backgroundOffsetX, setBackgroundOffsetX] = useState(0);
  const [backgroundOffsetY, setBackgroundOffsetY] = useState(0);
  const [backgroundScale, setBackgroundScale] = useState(100);
  const [backgroundScaleX, setBackgroundScaleX] = useState(100);
  const [backgroundScaleY, setBackgroundScaleY] = useState(100);
  const [showBackgroundControls, setShowBackgroundControls] = useState(false);
  
  // Track original background values for detecting unsaved changes
  const [originalBackgroundOffsetX, setOriginalBackgroundOffsetX] = useState(0);
  const [originalBackgroundOffsetY, setOriginalBackgroundOffsetY] = useState(0);

  // Undo stack for field changes
  const [fieldChangeHistory, setFieldChangeHistory] = useState<Array<{
    fieldId: string;
    fieldName: string;
    oldX: number;
    oldY: number;
    newX: number;
    newY: number;
  }>>([]);

  // Student search
  // Student search with suggestions
  const [studentSearch, setStudentSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Desktop printing (Electron) state - detect via isElectron flag or getPrinters
  const isDesktop = typeof window !== 'undefined' && (
    window.electronAPI?.isElectron === true || !!window.electronAPI?.getPrinters
  );
  const [printers, setPrinters] = useState<Array<{ name: string; displayName?: string; isDefault?: boolean }>>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string>('');
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);

  // Data hooks
  const { data: templates = [], isLoading: loadingTemplates } = useCertificateTemplates();
  const { data: templateFields = [], isLoading: loadingFields } = useTemplateFields(selectedTemplateId);
  const { data: phdLmdData = [] } = usePhdLmdCertificates();
  const { data: phdScienceData = [] } = usePhdScienceCertificates();
  const { data: masterData = [] } = useMasterCertificates();
  
  // CSS print hook for native printing
  const { print: cssPrint } = useCssPrint();
  const { data: printSettings } = usePrintSettings();
  const { settings: dateFormatSettings } = useDateFormatSettings();
  const { data: savedSettings } = useUserSettings();

  // Load custom fonts from database
  const { data: customFontsData = [] } = useQuery({
    queryKey: ["custom_fonts"],
    queryFn: async () => {
      if (isDesktop && window.electronAPI?.db) {
        const result = await window.electronAPI.db.getAll('custom_fonts', 'created_at', 'DESC');
        if (result.success) return (result.data || []) as Array<{ font_name: string; font_family: string; font_url: string; font_style: string | null; is_arabic: boolean | null }>;
        return [];
      }
      const { data, error } = await supabase
        .from("custom_fonts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Update custom fonts in the arabicFonts module when they change
  useEffect(() => {
    const fontConfigs: FontConfig[] = customFontsData.map(f => ({
      name: f.font_name,
      displayName: f.font_name,
      displayNameAr: f.font_name,
      family: f.font_family,
      url: f.font_url,
      style: (f.font_style || 'normal') as 'normal' | 'bold' | 'italic',
      isArabic: f.is_arabic || false,
      isSystem: false,
    }));
    setCustomFonts(fontConfigs);
  }, [customFontsData]);

  // Load printers (desktop app only)
  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingPrinters(true);
        const list = (await window.electronAPI!.getPrinters!()) as Array<{
          name: string;
          displayName?: string;
          isDefault?: boolean;
        }>;
        if (cancelled) return;
        setPrinters(list || []);
        const defaultPrinter = list?.find((p) => p.isDefault)?.name || list?.[0]?.name || '';
        setSelectedPrinterName((prev) => prev || defaultPrinter);
      } catch {
        if (!cancelled) setPrinters([]);
      } finally {
        if (!cancelled) setLoadingPrinters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  const applyToAllFields = async (patch: { font_name?: string; font_size?: number; font_color?: string }, successMsg: string) => {
    if (!selectedTemplateId) return;
    if (templateFields.length === 0) return;
    try {
      setIsApplyingToAll(true);
      await Promise.all(
        templateFields.map((field) =>
          updateField.mutateAsync({
            id: field.id,
            template_id: selectedTemplateId,
            ...patch,
          })
        )
      );
      toast.success(successMsg);
    } catch (e) {
      toast.error('فشل في تطبيق التغييرات على جميع الحقول');
    } finally {
      setIsApplyingToAll(false);
    }
  };
  
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();
  const updateTemplate = useUpdateTemplate();
  const saveSetting = useSaveSetting();

  // Extended student type with certificate type info
  type StudentWithType = {
    id: string;
    full_name_ar: string;
    full_name_fr?: string | null;
    student_number: string;
    specialty_ar: string;
    mention: string;
    created_at?: string | null;
    notes?: string | null;
    certificateType: CertificateType;
  };

  // Get ALL students from all certificate types, each tagged with their type
  const getAllStudents = (): StudentWithType[] => {
    const phdLmdStudents: StudentWithType[] = phdLmdData.map(s => ({
      ...s,
      certificateType: 'phd_lmd' as CertificateType,
    }));
    const phdScienceStudents: StudentWithType[] = phdScienceData.map(s => ({
      ...s,
      certificateType: 'phd_science' as CertificateType,
    }));
    const masterStudents: StudentWithType[] = masterData.map(s => ({
      ...s,
      certificateType: 'master' as CertificateType,
    }));

    // Combine all students and sort by created_at descending (newest first)
    return [...phdLmdStudents, ...phdScienceStudents, ...masterStudents].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  };

  const allStudents = getAllStudents();

  // Filter students by search with smart matching
  const getSearchSuggestions = () => {
    if (!studentSearch.trim()) return [];
    const search = studentSearch.toLowerCase().trim();
    const words = search.split(/\s+/);
    
    return allStudents
      .map(student => {
        let score = 0;
        const matchedFields: string[] = [];
        
        // Check name matches (highest priority)
        const nameAr = student.full_name_ar?.toLowerCase() || '';
        const nameFr = student.full_name_fr?.toLowerCase() || '';
        
        // Exact match at start of name
        if (nameAr.startsWith(search) || nameFr.startsWith(search)) {
          score += 100;
          matchedFields.push('name');
        } 
        // Contains full search term
        else if (nameAr.includes(search) || nameFr.includes(search)) {
          score += 50;
          matchedFields.push('name');
        }
        // Check each word
        else {
          words.forEach(word => {
            if (nameAr.includes(word) || nameFr.includes(word)) {
              score += 20;
              if (!matchedFields.includes('name')) matchedFields.push('name');
            }
          });
        }
        
        // Check student number (high priority)
        const studentNum = student.student_number?.toLowerCase() || '';
        if (studentNum.includes(search)) {
          score += 80;
          matchedFields.push('number');
        }
        
        // Check specialty
        const specialty = student.specialty_ar?.toLowerCase() || '';
        if (specialty.includes(search)) {
          score += 30;
          matchedFields.push('specialty');
        }
        
        return { student, score, matchedFields };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Limit to 8 suggestions
  };
  
  const searchSuggestions = getSearchSuggestions();

  // Filter students by search (for main list)
  const filteredStudents = allStudents.filter(student => {
    if (!studentSearch.trim()) return true;
    const search = studentSearch.toLowerCase();
    return (
      student.full_name_ar?.toLowerCase().includes(search) ||
      student.full_name_fr?.toLowerCase().includes(search) ||
      student.student_number?.toLowerCase().includes(search) ||
      student.specialty_ar?.toLowerCase().includes(search)
    );
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a suggestion
  const handleSelectSuggestion = (student: StudentWithType) => {
    setStudentSearch(student.full_name_ar);
    setShowSearchSuggestions(false);
    
    // Auto-switch to matching template
    const matchingTemplate = templates.find(
      t => t.certificate_type === student.certificateType && t.is_active
    );
    if (matchingTemplate) {
      setSelectedTemplateId(matchingTemplate.id);
      setSelectedType(student.certificateType);
      setSelectedLanguage(matchingTemplate.language);
    } else {
      setSelectedType(student.certificateType);
    }
    
    setSelectedStudentIds([student.id]);
    setPreviewStudentId(student.id);
  };

  // Get the 5 most recently added students (for highlighting)
  const recentStudentIds = allStudents.slice(0, 5).map(s => s.id);

  // Helper to find student and their type by ID
  const findStudentById = (id: string): StudentWithType | undefined => {
    return allStudents.find(s => s.id === id);
  };

  // Find matching template
  useEffect(() => {
    const matchingTemplate = templates.find(
      t => t.certificate_type === selectedType && t.language === selectedLanguage && t.is_active
    );
    if (matchingTemplate) {
      setSelectedTemplateId(matchingTemplate.id);
    } else {
      setSelectedTemplateId(null);
    }
  }, [selectedType, selectedLanguage, templates]);

  // Load background settings from template when it changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Load saved offsets from database or use defaults
        const offsetX = (template as any).background_offset_x || 0;
        const offsetY = (template as any).background_offset_y || 0;
        setBackgroundOffsetX(offsetX);
        setBackgroundOffsetY(offsetY);
        setBackgroundScale((template as any).background_scale || 100);
        setBackgroundScaleX((template as any).background_scale_x || (template as any).background_scale || 100);
        setBackgroundScaleY((template as any).background_scale_y || (template as any).background_scale || 100);
        // Track original values
        setOriginalBackgroundOffsetX(offsetX);
        setOriginalBackgroundOffsetY(offsetY);
      }
    } else {
      setBackgroundOffsetX(0);
      setBackgroundOffsetY(0);
      setBackgroundScale(100);
      setBackgroundScaleX(100);
      setBackgroundScaleY(100);
      setOriginalBackgroundOffsetX(0);
      setOriginalBackgroundOffsetY(0);
    }
  }, [selectedTemplateId, templates]);

  // Load saved settings
  useEffect(() => {
    if (savedSettings) {
      if (savedSettings.selectedCertificateType) {
        setSelectedType(savedSettings.selectedCertificateType);
      }
      if (savedSettings.selectedLanguage) {
        setSelectedLanguage(savedSettings.selectedLanguage);
      }
    }
  }, [savedSettings]);

  // Auto-save settings
  useEffect(() => {
    saveSetting.mutate({ key: 'selectedCertificateType', value: selectedType });
  }, [selectedType]);

  useEffect(() => {
    saveSetting.mutate({ key: 'selectedLanguage', value: selectedLanguage });
  }, [selectedLanguage]);

  // Don't auto-select a student - let user choose or show placeholders
  useEffect(() => {
    if (allStudents.length === 0) {
      setPreviewStudentId(null);
    }
  }, [allStudents]);

  const handleMoveField = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedFieldId || !selectedTemplateId) return;

    const field = templateFields.find(f => f.id === selectedFieldId);
    if (!field) return;

    let newX = field.position_x;
    let newY = field.position_y;

    switch (direction) {
      case 'up': newY -= stepSize; break;
      case 'down': newY += stepSize; break;
      case 'left': newX += stepSize; break; // RTL
      case 'right': newX -= stepSize; break; // RTL
    }

    updateField.mutate({
      id: selectedFieldId,
      template_id: selectedTemplateId,
      position_x: newX,
      position_y: newY,
    });
  };

  // Check if there are unsaved background changes
  const hasUnsavedBackgroundChanges = 
    backgroundOffsetX !== originalBackgroundOffsetX || 
    backgroundOffsetY !== originalBackgroundOffsetY;

  // Save all changes (background offset)
  const handleSaveAll = () => {
    if (!selectedTemplateId) return;
    
    if (hasUnsavedBackgroundChanges) {
      updateTemplate.mutate({
        id: selectedTemplateId,
        background_offset_x: backgroundOffsetX,
        background_offset_y: backgroundOffsetY,
        background_scale: backgroundScale,
      } as any);
      
      // Update original values after save
      setOriginalBackgroundOffsetX(backgroundOffsetX);
      setOriginalBackgroundOffsetY(backgroundOffsetY);
      
      toast.success("تم حفظ جميع التغييرات");
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      // Find the student to get their certificate type
      const student = findStudentById(studentId);
      if (student) {
        // Auto-switch to the template matching this student's certificate type
        const matchingTemplate = templates.find(
          t => t.certificate_type === student.certificateType && t.is_active
        );
        if (matchingTemplate) {
          setSelectedTemplateId(matchingTemplate.id);
          setSelectedType(student.certificateType);
          setSelectedLanguage(matchingTemplate.language);
        } else {
          // Update type even if no template exists
          setSelectedType(student.certificateType);
        }
      }
      
      // Single selection mode - replace the current selection
      setSelectedStudentIds([studentId]);
      setPreviewStudentId(studentId);
      return;
    }

    // Unselecting - clear both selection and preview
    setSelectedStudentIds([]);
    setPreviewStudentId(null);
  };

  // Helper: Get template paper dimensions in mm
  const getTemplatePaperDimensions = (tmpl: typeof templates[0]) => {
    // First try template-specific print settings
    const paperSize = (tmpl.print_paper_size || tmpl.page_size || 'a4').toLowerCase();
    let width: number;
    let height: number;

    if (paperSize === 'custom') {
      width = tmpl.print_custom_width || 210;
      height = tmpl.print_custom_height || 297;
    } else {
      const size = PAPER_SIZES[paperSize];
      if (size) {
        width = size.width;
        height = size.height;
      } else {
        // Fall back to global print settings
        const globalSettings = printSettings || DEFAULT_PRINT_SETTINGS;
        const dims = getPaperDimensions(globalSettings);
        width = dims.width;
        height = dims.height;
      }
    }

    // Apply orientation
    const isLandscape = tmpl.page_orientation === 'landscape';
    if (isLandscape) {
      return { width: height, height: width };
    }
    return { width, height };
  };

  const handlePrint = async () => {
    if (updateField.isPending || isApplyingToAll) {
      toast.error("يرجى الانتظار حتى يتم حفظ تغييرات الحقول/الخطوط قبل الطباعة");
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error("يرجى اختيار طالب واحد على الأقل");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("يرجى إنشاء قالب أولاً");
      return;
    }

    const selectedStudents = allStudents.filter(s => selectedStudentIds.includes(s.id));
    const template = templates.find(t => t.id === selectedTemplateId);

    if (!template) {
      toast.error("القالب غير موجود");
      return;
    }

    try {
      setIsPrinting(true);

      // Use CSS-based native print with window.print()
      // This provides full print preview and correct paper dimensions
      const dims = getTemplatePaperDimensions(template);
      await cssPrint({
        widthMm: dims.width,
        heightMm: dims.height,
        orientation: template.page_orientation === 'landscape' ? 'landscape' : 'portrait',
      });
      toast.success(`تم إرسال الشهادة إلى الطباعة`);
    } catch (error) {
      toast.error("فشل في الطباعة: " + (error as Error).message);
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle PDF download (separate from CSS print)
  const handleDownloadPdf = async () => {
    if (selectedStudentIds.length === 0 || !selectedTemplateId) return;
    const selectedStudents = allStudents.filter(s => selectedStudentIds.includes(s.id));
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;
    
    try {
      setIsPrinting(true);
      await generatePDF(selectedStudents as unknown as Record<string, unknown>[], templateFields, template, selectedType);
      toast.success(`تم إنشاء PDF لـ ${selectedStudents.length} طالب`);
    } catch (error) {
      toast.error("فشل في إنشاء PDF: " + (error as Error).message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenPrinterSettings = async () => {
    if (!isDesktop) return;
    const ok = await window.electronAPI?.openPrintersSettings?.();
    if (!ok) toast.info('خصائص الطابعات غير مدعومة تلقائياً على هذا النظام');
  };

  const previewStudent = findStudentById(previewStudentId || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">طباعة الشهادات</h1>
          <p className="text-muted-foreground mt-1">
            معاينة وطباعة شهادات الطلاب
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isDesktop && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedPrinterName} onValueChange={setSelectedPrinterName}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={loadingPrinters ? "تحميل الطابعات..." : "اختر طابعة"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {printers.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">لا توجد طابعات</div>
                  ) : (
                    printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName || p.name}
                        {p.isDefault ? ' (افتراضية)' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenPrinterSettings}>
                <Settings2 className="h-4 w-4" />
                خصائص الطابعة
              </Button>
            </div>
          )}
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-2" 
            onClick={() => setIsFullPreviewOpen(true)}
            disabled={!selectedTemplateId || !previewStudent}
          >
            <Fullscreen className="h-4 w-4" />
            معاينة كاملة
          </Button>
          {isDesktop && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownloadPdf}
              disabled={selectedStudentIds.length === 0 || updateField.isPending || isApplyingToAll || isPrinting}
            >
              <FileType className="h-4 w-4" />
              تحميل PDF
            </Button>
          )}
          <Button
            size="sm"
            className="gap-2"
            onClick={handlePrint}
            disabled={selectedStudentIds.length === 0 || updateField.isPending || isApplyingToAll || isPrinting}
          >
            <Printer className="h-4 w-4" />
            طباعة ({toWesternNumerals(selectedStudentIds.length)})
          </Button>
        </div>
      </div>


      {/* Students List - Horizontal at top */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              قائمة الطلاب
              {recentStudentIds.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  آخر {toWesternNumerals(Math.min(5, allStudents.length))} إضافة
                </Badge>
              )}
            </span>
            <Badge variant="secondary">{toWesternNumerals(filteredStudents.length)}/{toWesternNumerals(allStudents.length)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allStudents.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p>لا يوجد طلاب</p>
              <Button size="sm" className="mt-2" onClick={() => setIsAddStudentOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة طالب
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Box with Smart Suggestions */}
              <div className="flex gap-2 items-start">
                <div className="relative flex-1" ref={searchContainerRef}>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="بحث بالاسم أو اللقب أو رقم الشهادة..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    className="pr-9"
                  />
                
                {/* Smart Suggestions Dropdown */}
                {showSearchSuggestions && studentSearch.trim() && searchSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2 text-xs text-muted-foreground border-b bg-muted/30">
                      اقتراحات ذكية ({toWesternNumerals(searchSuggestions.length)})
                    </div>
                    {searchSuggestions.map(({ student, matchedFields }) => (
                      <div
                        key={student.id}
                        className="flex items-start gap-3 p-3 hover:bg-accent cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                        onClick={() => handleSelectSuggestion(student)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {student.full_name_ar}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] shrink-0 ${
                                student.certificateType === 'phd_lmd' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                student.certificateType === 'phd_science' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                                'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {certificateTypeLabels[student.certificateType].ar}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {matchedFields.includes('number') && (
                              <span className="flex items-center gap-1 text-primary">
                                <Hash className="h-3 w-3" />
                                {student.student_number}
                              </span>
                            )}
                            {!matchedFields.includes('number') && student.student_number && (
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {student.student_number}
                              </span>
                            )}
                            {matchedFields.includes('specialty') && (
                              <span className="flex items-center gap-1 text-primary">
                                <BookOpen className="h-3 w-3" />
                                {student.specialty_ar}
                              </span>
                            )}
                            {!matchedFields.includes('specialty') && student.specialty_ar && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {student.specialty_ar}
                              </span>
                            )}
                          </div>
                          
                          {student.full_name_fr && (
                            <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                              {student.full_name_fr}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {filteredStudents.length > searchSuggestions.length && (
                      <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
                        و {toWesternNumerals(filteredStudents.length - searchSuggestions.length)} نتائج أخرى...
                      </div>
                    )}
                  </div>
                )}
                
                {/* No results message */}
                {showSearchSuggestions && studentSearch.trim() && searchSuggestions.length === 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">لا توجد نتائج لـ "{studentSearch}"</p>
                  </div>
                )}
                </div>
                <BrowseDatabaseDialog
                  students={allStudents.map(s => ({
                    ...s,
                    faculty_ar: (s as any).faculty_ar,
                    supervisor_ar: (s as any).supervisor_ar,
                  }))}
                  onSelect={(student) => handleSelectSuggestion(student as any)}
                />
              </div>

              {selectedStudentIds.length === 1 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Badge variant="default" className="text-xs">
                    طالب محدد: {findStudentById(selectedStudentIds[0])?.full_name_ar}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => {
                      setSelectedStudentIds([]);
                      setPreviewStudentId(null);
                    }}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              )}
              {studentSearch && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <span className="text-xs text-muted-foreground">
                    ({toWesternNumerals(filteredStudents.length)} نتيجة)
                  </span>
                </div>
              )}

              {filteredStudents.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <p>لا توجد نتائج للبحث "{studentSearch}"</p>
                  <Button variant="ghost" size="sm" onClick={() => setStudentSearch('')} className="mt-2">
                    مسح البحث
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {filteredStudents.map((student) => {
                    const isPreviewSelected = previewStudentId === student.id;
                    const isRecent = recentStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all shrink-0 border-2 relative ${
                          isPreviewSelected 
                            ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/20' 
                            : isRecent
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 hover:border-green-400'
                              : 'hover:bg-muted border-transparent hover:border-muted-foreground/20'
                        }`}
                        onClick={() => {
                          if (isPreviewSelected) {
                            setPreviewStudentId(null);
                          } else {
                            // Auto-switch to matching template when clicking for preview
                            const matchingTemplate = templates.find(
                              t => t.certificate_type === student.certificateType && t.is_active
                            );
                            if (matchingTemplate) {
                              setSelectedTemplateId(matchingTemplate.id);
                              setSelectedType(student.certificateType);
                              setSelectedLanguage(matchingTemplate.language);
                            } else {
                              setSelectedType(student.certificateType);
                            }
                            setPreviewStudentId(student.id);
                          }
                        }}
                      >
                        {isRecent && !isPreviewSelected && (
                          <div className="absolute -top-1 -right-1">
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                          </div>
                        )}
                        <Checkbox
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0">
                          <p className={`font-medium truncate max-w-[150px] ${isPreviewSelected ? 'text-primary' : ''}`}>
                            {student.full_name_ar}
                          </p>
                          <p className="text-xs text-muted-foreground">{student.student_number}</p>
                        </div>
                        {isPreviewSelected && (
                          <Badge variant="default" className="text-xs">
                            معاينة
                          </Badge>
                        )}
                        {isRecent && !isPreviewSelected && (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            جديد
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {certificateTypeLabels[student.certificateType]?.ar}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mentionLabels[student.mention as MentionType]?.ar || student.mention}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview - Full height */}
      <Card className="flex-1" data-print-hide>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة الشهادة
            </span>
            {previewStudent && (
              <span className="text-sm font-normal text-muted-foreground">
                {previewStudent.full_name_ar}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Notes Alert */}
          {previewStudent?.notes && previewStudent.notes.trim() !== '' && (
            <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">ملاحظات هامة</p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-1" dir="auto">{previewStudent.notes}</p>
              </div>
            </div>
          )}
          <Tabs defaultValue="preview">
            <TabsList className="mb-4">
              <TabsTrigger value="preview">المعاينة</TabsTrigger>
              <TabsTrigger value="fields">خصائص الحقول</TabsTrigger>
              <TabsTrigger value="font-properties" className="gap-1">
                <Type className="h-3 w-3" />
                خصائص الخطوط
              </TabsTrigger>
              <TabsTrigger value="background">صورة الخلفية</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="min-h-[calc(100vh-400px)]">
              {loadingTemplates || loadingFields ? (
                <div className="flex items-center justify-center h-full min-h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !selectedTemplateId ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-muted-foreground">
                  <Settings2 className="h-12 w-12 mb-4 opacity-50" />
                  <p>لا يوجد قالب محدد</p>
                  <p className="text-sm mt-2">اختر قالباً من القائمة أعلاه أو أنشئ قالباً جديداً</p>
                  <Select 
                    value={undefined} 
                    onValueChange={(v) => {
                      if (v) {
                        const template = templates.find(t => t.id === v);
                        if (template) {
                          setSelectedTemplateId(v);
                          setSelectedType(template.certificate_type);
                          setSelectedLanguage(template.language);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-64 mt-4">
                      <SelectValue placeholder="اختر قالباً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <Button size="sm" className="mt-4" onClick={() => setIsCreateTemplateOpen(true)}>
                      إنشاء قالب جديد
                    </Button>
                  )}
                </div>
              ) : (
                <CertificatePreview
                  student={(previewStudent || {}) as unknown as Record<string, unknown>}
                  fields={templateFields}
                  template={templates.find(t => t.id === selectedTemplateId)!}
                  certificateType={selectedType}
                  selectedFieldId={selectedFieldId}
                  onFieldClick={setSelectedFieldId}
                  onFieldMove={(fieldId, direction, step) => {
                    const field = templateFields.find(f => f.id === fieldId);
                    if (!field || !selectedTemplateId) return;
                    
                    let newX = field.position_x;
                    let newY = field.position_y;
                    
                    switch (direction) {
                      case 'up': newY -= step; break;
                      case 'down': newY += step; break;
                      case 'left': newX += step; break; // RTL
                      case 'right': newX -= step; break; // RTL
                    }
                    
                    // Track change for undo
                    setFieldChangeHistory(prev => [...prev, {
                      fieldId,
                      fieldName: field.field_name_ar,
                      oldX: field.position_x,
                      oldY: field.position_y,
                      newX,
                      newY,
                    }]);
                    
                    updateField.mutate({
                      id: fieldId,
                      template_id: selectedTemplateId,
                      position_x: newX,
                      position_y: newY,
                    });
                  }}
                  onFieldDrag={(fieldId, newX, newY) => {
                    if (!selectedTemplateId) return;
                    const field = templateFields.find(f => f.id === fieldId);
                    if (!field) return;
                    
                    // Track change for undo
                    setFieldChangeHistory(prev => [...prev, {
                      fieldId,
                      fieldName: field.field_name_ar,
                      oldX: field.position_x,
                      oldY: field.position_y,
                      newX,
                      newY,
                    }]);
                    
                    updateField.mutate({
                      id: fieldId,
                      template_id: selectedTemplateId,
                      position_x: newX,
                      position_y: newY,
                    });
                  }}
                  onToggleFieldVisibility={(fieldId, visible) => {
                    if (!selectedTemplateId) return;
                    updateField.mutate({
                      id: fieldId,
                      template_id: selectedTemplateId,
                      is_visible: visible,
                    });
                  }}
                  onDeleteField={(fieldId) => {
                    if (!selectedTemplateId) return;
                    deleteField.mutate(
                      { id: fieldId, template_id: selectedTemplateId },
                      {
                        onSuccess: () => {
                          if (selectedFieldId === fieldId) {
                            setSelectedFieldId(null);
                          }
                        },
                      }
                    );
                  }}
                  onAddField={() => setIsAddFieldOpen(true)}
                  onFieldResize={(fieldId, newWidth) => {
                    if (!selectedTemplateId) return;
                    updateField.mutate({
                      id: fieldId,
                      template_id: selectedTemplateId,
                      field_width: newWidth,
                    });
                  }}
                  stepSize={stepSize}
                  isMoving={updateField.isPending}
                   backgroundOffsetX={backgroundOffsetX}
                   backgroundOffsetY={backgroundOffsetY}
                   backgroundScaleX={backgroundScaleX}
                   backgroundScaleY={backgroundScaleY}
                  onBackgroundOffsetChange={(x, y) => {
                    setBackgroundOffsetX(x);
                    setBackgroundOffsetY(y);
                  }}
                  showBackgroundControls={showBackgroundControls}
                  onToggleBackgroundControls={() => setShowBackgroundControls(!showBackgroundControls)}
                  canUndo={fieldChangeHistory.length > 0}
                  hasUnsavedChanges={hasUnsavedBackgroundChanges}
                  onUndo={() => {
                    if (fieldChangeHistory.length === 0 || !selectedTemplateId) return;
                    const lastChange = fieldChangeHistory[fieldChangeHistory.length - 1];
                    
                    // Restore old position
                    updateField.mutate({
                      id: lastChange.fieldId,
                      template_id: selectedTemplateId,
                      position_x: lastChange.oldX,
                      position_y: lastChange.oldY,
                    });
                    
                    // Remove from history
                    setFieldChangeHistory(prev => prev.slice(0, -1));
                  }}
                  onSaveAll={handleSaveAll}
                />
              )}
            </TabsContent>

            <TabsContent value="fields">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Field List */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">الحقول المتاحة</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {templateFields.map((field) => (
                        <div
                          key={field.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedFieldId === field.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedFieldId(field.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{field.field_name_ar}</span>
                            <Badge variant="outline" className="text-xs">
                              X: {toWesternNumerals(field.position_x)} | Y: {toWesternNumerals(field.position_y)}
                              {field.field_width != null && ` | W: ${toWesternNumerals(field.field_width)}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.field_key} • {toWesternNumerals(field.font_size)}px
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Field Properties */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      خصائص الحقل المحدد
                    </h4>
                    {selectedFieldId && selectedTemplateId ? (
                      <div className="space-y-4">
                        {/* Font Selection */}
                        <div>
                          <Label>نوع الخط</Label>
                          <Select
                            value={templateFields.find(f => f.id === selectedFieldId)?.font_name || 'Cairo'}
                            onValueChange={(v) => {
                              updateField.mutate({
                                id: selectedFieldId,
                                template_id: selectedTemplateId,
                                font_name: v,
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {/* Arabic Fonts */}
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                خطوط عربية
                              </div>
                              {getFontOptions().filter(f => f.isArabic).map((font) => (
                                <SelectItem 
                                  key={font.value} 
                                  value={font.value}
                                  style={{ fontFamily: font.value }}
                                >
                                  {font.labelAr} ({font.label})
                                </SelectItem>
                              ))}
                              {/* System/Latin Fonts */}
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">
                                خطوط لاتينية
                              </div>
                              {getFontOptions().filter(f => !f.isArabic).map((font) => (
                                <SelectItem 
                                  key={font.value} 
                                  value={font.value}
                                  style={{ fontFamily: font.value }}
                                >
                                  {font.labelAr} ({font.label})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Font Size */}
                        <div>
                          <Label>حجم الخط</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="number"
                              min={8}
                              max={72}
                              value={templateFields.find(f => f.id === selectedFieldId)?.font_size || 14}
                              onChange={(e) => {
                                const size = parseInt(e.target.value);
                                if (size >= 8 && size <= 72) {
                                  updateField.mutate({
                                    id: selectedFieldId,
                                    template_id: selectedTemplateId,
                                    font_size: size,
                                  });
                                }
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground self-center">نقطة</span>
                          </div>
                        </div>

                        {/* Font Color */}
                        <div>
                          <Label>لون الخط</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={templateFields.find(f => f.id === selectedFieldId)?.font_color || '#000000'}
                              onChange={(e) => {
                                updateField.mutate({
                                  id: selectedFieldId,
                                  template_id: selectedTemplateId,
                                  font_color: e.target.value,
                                });
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={templateFields.find(f => f.id === selectedFieldId)?.font_color || '#000000'}
                              onChange={(e) => {
                                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  updateField.mutate({
                                    id: selectedFieldId,
                                    template_id: selectedTemplateId,
                                    font_color: e.target.value,
                                  });
                                }
                              }}
                              className="w-28 font-mono"
                              placeholder="#000000"
                            />
                          </div>
                        </div>

                        {/* Field Width for resizable fields */}
                        {(() => {
                          const selectedF = templateFields.find(f => f.id === selectedFieldId);
                          const isResizable = selectedF && (
                            selectedF.field_key.startsWith('thesis_title') || 
                            selectedF.field_key.startsWith('static_text_')
                          );
                          if (!isResizable) return null;
                          return (
                            <div>
                              <Label>عرض الحقل (مم)</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  min="20"
                                  max="200"
                                  step="1"
                                  value={selectedF?.field_width ?? ''}
                                  placeholder="تلقائي"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const width = val ? parseFloat(val) : null;
                                    if (width !== null && (width < 20 || width > 200)) return;
                                    updateField.mutate({
                                      id: selectedFieldId,
                                      template_id: selectedTemplateId,
                                      field_width: width,
                                    });
                                  }}
                                  className="w-24 font-mono"
                                />
                                {selectedF?.field_width != null && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      updateField.mutate({
                                        id: selectedFieldId,
                                        template_id: selectedTemplateId,
                                        field_width: null,
                                      });
                                    }}
                                  >
                                    إزالة
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                حدد عرضاً لتفعيل التفاف النص تلقائياً أو اسحب حافة الحقل في المعاينة
                              </p>
                            </div>
                          );
                        })()}

                        {/* Step Size for Movement */}
                        <div>
                          <Label>مقدار الحركة (مم)</Label>
                          <Select value={stepSize.toString()} onValueChange={(v) => setStepSize(parseFloat(v))}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.5">0.5 مم</SelectItem>
                              <SelectItem value="1">1 مم</SelectItem>
                              <SelectItem value="2">2 مم</SelectItem>
                              <SelectItem value="5">5 مم</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Movement Controls */}
                        <div className="flex flex-col items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveField('up')}
                            disabled={updateField.isPending}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveField('right')}
                              disabled={updateField.isPending}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="w-10 h-10 rounded-md border flex items-center justify-center text-sm font-mono">
                              {stepSize}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveField('left')}
                              disabled={updateField.isPending}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveField('down')}
                            disabled={updateField.isPending}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          استخدم الأسهم لتحريك الحقل أو اسحبه بالماوس في المعاينة
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        اختر حقلاً من القائمة
                      </div>
                    )}
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="background">
              <div className="space-y-6">
                {/* Template Selection and Background Upload in same row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Template Selection */}
                  <div className="space-y-3">
                    <Label>القالب المستخدم</Label>
                    <Select 
                      value={selectedTemplateId || undefined} 
                      onValueChange={(v) => {
                        if (v) {
                          const template = templates.find(t => t.id === v);
                          if (template) {
                            setSelectedTemplateId(v);
                            setSelectedType(template.certificate_type);
                            setSelectedLanguage(template.language);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر قالباً..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.is_active).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.template_name} ({certificateTypeLabels[template.certificate_type]?.ar} - {languageLabels[template.language]?.ar})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedTemplateId && (
                      <p className="text-sm text-muted-foreground">
                        يرجى اختيار قالب لإدارة صورة الخلفية
                      </p>
                    )}
                  </div>

                  {/* Background Upload */}
                  {selectedTemplateId && (
                    <div>
                      <BackgroundUpload
                        templateId={selectedTemplateId}
                        currentImageUrl={templates.find(t => t.id === selectedTemplateId)?.background_image_url || null}
                        onUploadComplete={(url) => {
                          updateTemplate.mutate({
                            id: selectedTemplateId,
                            background_image_url: url,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    ارفع صورة الشهادة الفارغة (بدون بيانات الطالب) لاستخدامها كخلفية للمعاينة فقط.
                    <br />
                    <strong>ملاحظة:</strong> الخلفية لا تُطبع - تُستخدم فقط لضبط مواقع الحقول على الورقة المحضرة مسبقاً.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="font-properties">
              <div className="space-y-6">
                {/* Global Font Settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    تطبيق خصائص الخط على جميع الحقول
                  </h4>
                  
                {selectedTemplateId ? (() => {
                    // Compute common values across all fields for controlled display
                    const rawCommonFont = templateFields.length > 0 && templateFields.every(f => f.font_name === templateFields[0].font_name)
                      ? templateFields[0].font_name || "" : "";
                    const commonSize = templateFields.length > 0 && templateFields.every(f => f.font_size === templateFields[0].font_size)
                      ? templateFields[0].font_size : null;
                    const commonColor = templateFields.length > 0 && templateFields.every(f => f.font_color === templateFields[0].font_color)
                      ? templateFields[0].font_color || "#000000" : "#000000";

                    const allFontsList = getAllFonts();
                    // Detect if current common font is a bold variant
                    const matchedRawFont = allFontsList.find(f => f.name === rawCommonFont);
                    const isBoldVariant = matchedRawFont ? matchedRawFont.style === 'bold' : 
                      (rawCommonFont ? (rawCommonFont.includes('-Bold') || rawCommonFont.includes(' Bold')) : false);
                    const currentStyle = isBoldVariant ? "bold" : "normal";
                    
                    // Normalize font name for the family dropdown (strip bold suffix to match getFontOptions values)
                    const baseFontFamily = isBoldVariant 
                      ? rawCommonFont.replace(/-Bold$/, '').replace(/\s+Bold$/, '') 
                      : rawCommonFont;
                    // Map to the family value used by getFontOptions - check getAllFonts for the actual family
                    const matchedFont = allFontsList.find(f => f.name === rawCommonFont || f.family === rawCommonFont);
                    const commonFontForDropdown = matchedFont?.family || baseFontFamily;

                    return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Font Family */}
                      <div className="space-y-2">
                        <Label>نوع الخط</Label>
                        <Select
                          value={commonFontForDropdown || undefined}
                          onValueChange={(v) => {
                            // When changing font family, respect current bold style
                            if (currentStyle === "bold") {
                              const boldFont = allFontsList.find(f => f.family === v && f.style === 'bold');
                              if (boldFont) {
                                void applyToAllFields({ font_name: boldFont.name }, "تم تطبيق الخط على جميع الحقول");
                                return;
                              }
                            }
                            // Use normal variant or family name directly
                            const normalFont = allFontsList.find(f => f.family === v && f.style === 'normal');
                            void applyToAllFields({ font_name: normalFont?.name || v }, "تم تطبيق الخط على جميع الحقول");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الخط..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                              خطوط عربية
                            </div>
                            {getFontOptions().filter(f => f.isArabic).map((font) => (
                              <SelectItem 
                                key={font.value} 
                                value={font.value}
                                style={{ fontFamily: font.value }}
                              >
                                {font.labelAr} ({font.label})
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">
                              خطوط لاتينية
                            </div>
                            {getFontOptions().filter(f => !f.isArabic).map((font) => (
                              <SelectItem 
                                key={font.value} 
                                value={font.value}
                                style={{ fontFamily: font.value }}
                              >
                                {font.labelAr} ({font.label})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Font Size */}
                      <div className="space-y-2">
                        <Label>حجم الخط</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={8}
                            max={72}
                            placeholder="14"
                            defaultValue={commonSize ?? ""}
                            key={`font-size-${commonSize}`}
                            className="w-20"
                            onBlur={(e) => {
                              const size = parseInt(e.target.value);
                              if (size >= 8 && size <= 72 && selectedTemplateId) {
                                void applyToAllFields({ font_size: size }, "تم تطبيق الحجم على جميع الحقول");
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                          <span className="text-sm text-muted-foreground self-center">نقطة</span>
                        </div>
                      </div>
                      
                      {/* Font Color */}
                      <div className="space-y-2">
                        <Label>لون الخط</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={commonColor}
                            key={`font-color-${commonColor}`}
                            className="w-12 h-10 p-1 cursor-pointer"
                            onChange={(e) => {
                              void applyToAllFields({ font_color: e.target.value }, "تم تطبيق اللون على جميع الحقول");
                            }}
                          />
                        </div>
                      </div>

                      {/* Font Style (Bold) */}
                      <div className="space-y-2">
                        <Label>نمط الخط</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStyle === 'normal' ? 'default' : 'outline'}
                            className="h-10 flex-1"
                            onClick={() => {
                              if (!selectedTemplateId || !commonFontForDropdown) {
                                toast.error("يرجى اختيار نوع الخط أولاً");
                                return;
                              }
                              const baseFamily = commonFontForDropdown;
                              const normalFont = allFontsList.find((f) => 
                                f.family === baseFamily && f.style === 'normal'
                              );
                              if (normalFont) {
                                void applyToAllFields({ font_name: normalFont.name }, "تم تطبيق النمط العادي على جميع الحقول");
                              } else {
                                void applyToAllFields({ font_name: baseFamily }, "تم تطبيق النمط العادي على جميع الحقول");
                              }
                            }}
                          >
                            عادي
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStyle === 'bold' ? 'default' : 'outline'}
                            className="h-10 flex-1 font-bold"
                            onClick={() => {
                              if (!selectedTemplateId || !commonFontForDropdown) {
                                toast.error("يرجى اختيار نوع الخط أولاً");
                                return;
                              }
                              const baseFamily = commonFontForDropdown;
                              const boldFont = allFontsList.find((f) => 
                                f.name === `${baseFamily}-Bold` || 
                                (f.family === baseFamily && f.style === 'bold')
                              );
                              if (boldFont) {
                                void applyToAllFields({ font_name: boldFont.name }, "تم تطبيق النمط الغامق على جميع الحقول");
                              } else {
                                toast.error(`لا يوجد نمط غامق متاح لخط ${baseFamily}`);
                              }
                            }}
                          >
                            غامق
                          </Button>
                        </div>
                      </div>
                    </div>
                    );
                  })()
                  : (
                    <div className="text-center text-muted-foreground py-4">
                      يرجى اختيار قالب أولاً
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    استخدم هذه الإعدادات لتطبيق خصائص الخط على جميع حقول الشهادة دفعة واحدة
                  </p>
                </div>
                
                {/* Font Management Section */}
                <FontManagement />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Dialogs */}
      <AddStudentDialog
        open={isAddStudentOpen}
        onOpenChange={setIsAddStudentOpen}
        certificateType={selectedType}
      />
      <CreateTemplateDialog
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        defaultType={selectedType}
        defaultLanguage={selectedLanguage}
      />
      <ImportExcelDialog
        open={isImportExcelOpen}
        onOpenChange={setIsImportExcelOpen}
        certificateType={selectedType}
      />
      {selectedTemplateId && (
        <AddFieldDialog
          open={isAddFieldOpen}
          onOpenChange={setIsAddFieldOpen}
          templateId={selectedTemplateId}
          certificateType={selectedType}
          existingFieldKeys={templateFields.map(f => f.field_key)}
        />
      )}
      {selectedTemplateId && previewStudent && (
        <FullPreviewDialog
          open={isFullPreviewOpen}
          onOpenChange={setIsFullPreviewOpen}
          student={previewStudent as unknown as Record<string, unknown>}
          fields={templateFields}
          template={templates.find(t => t.id === selectedTemplateId)!}
          initialOffsetX={backgroundOffsetX}
          initialOffsetY={backgroundOffsetY}
          initialScale={backgroundScale}
          initialScaleX={backgroundScaleX}
          initialScaleY={backgroundScaleY}
          onSaveSettings={(settings) => {
            updateTemplate.mutate({
              id: selectedTemplateId,
              background_offset_x: settings.background_offset_x,
              background_offset_y: settings.background_offset_y,
              background_scale: settings.background_scale,
              background_scale_x: settings.background_scale_x,
              background_scale_y: settings.background_scale_y,
            } as any);
            setBackgroundOffsetX(settings.background_offset_x);
            setBackgroundOffsetY(settings.background_offset_y);
            setBackgroundScale(settings.background_scale);
            if (settings.background_scale_x !== undefined) setBackgroundScaleX(settings.background_scale_x);
            if (settings.background_scale_y !== undefined) setBackgroundScaleY(settings.background_scale_y);
          }}
          onFieldMove={(fieldId, newX, newY) => {
            updateField.mutate({
              id: fieldId,
              template_id: selectedTemplateId,
              position_x: newX,
              position_y: newY,
            });
          }}
          onFieldResize={(fieldId, newWidth) => {
            updateField.mutate({
              id: fieldId,
              template_id: selectedTemplateId,
              field_width: newWidth,
            });
          }}
          onPrint={handlePrint}
        />
      )}

      {/* Hidden Printable Certificate for CSS-based native printing.
          Hidden on screen via overflow:hidden + zero size, but the
          #printable-certificate inside uses position:fixed in print CSS
          so it becomes visible and fills the page. */}
      {selectedTemplateId && previewStudent && (() => {
        const currentTemplate = templates.find(t => t.id === selectedTemplateId);
        if (!currentTemplate) return null;
        const dims = getTemplatePaperDimensions(currentTemplate);
        return createPortal(
          <div
            id="printable-certificate-wrapper"
            aria-hidden="true"
            className="hidden print:!block"
            style={{ 
              pointerEvents: 'none',
            }}
          >
            <PrintableCSS
              student={previewStudent as unknown as Record<string, unknown>}
              fields={templateFields}
              template={currentTemplate}
              certificateType={selectedType}
              pageWidthMm={dims.width}
              pageHeightMm={dims.height}
              backgroundOffsetX={backgroundOffsetX}
              backgroundOffsetY={backgroundOffsetY}
              backgroundScaleX={backgroundScaleX}
              backgroundScaleY={backgroundScaleY}
              dateFormatSettings={dateFormatSettings}
            />
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

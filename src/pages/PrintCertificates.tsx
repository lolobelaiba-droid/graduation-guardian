import { useState, useEffect } from "react";
import { Loader2, Plus, Printer, Eye, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Type, Fullscreen, Search, Clock, FileType } from "lucide-react";
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
import { FullPreviewDialog } from "@/components/print/FullPreviewDialog";
import { FontManagement } from "@/components/print/FontManagement";
import { getFontOptions, setCustomFonts, type FontConfig } from "@/lib/arabicFonts";
import { toWesternNumerals } from "@/lib/numerals";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [studentSearch, setStudentSearch] = useState('');

  // Desktop printing (Electron) state
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI?.getPrinters;
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
  const { data: savedSettings } = useUserSettings();

  // Load custom fonts from database
  const { data: customFontsData = [] } = useQuery({
    queryKey: ["custom_fonts"],
    queryFn: async () => {
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
    if (customFontsData.length > 0) {
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
    }
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

  // Get current students based on type and sort by created_at (newest first)
  const getCurrentStudents = () => {
    let students: Array<{ id: string; full_name_ar: string; full_name_fr?: string | null; student_number: string; specialty_ar: string; mention: string; created_at?: string | null }> = [];
    switch (selectedType) {
      case "phd_lmd": students = phdLmdData as typeof students; break;
      case "phd_science": students = phdScienceData as typeof students; break;
      case "master": students = masterData as typeof students; break;
    }
    // Sort by created_at descending (newest first)
    return [...students].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  };

  const currentStudents = getCurrentStudents();

  // Filter students by search
  const filteredStudents = currentStudents.filter(student => {
    if (!studentSearch.trim()) return true;
    const search = studentSearch.toLowerCase();
    return (
      student.full_name_ar?.toLowerCase().includes(search) ||
      student.full_name_fr?.toLowerCase().includes(search) ||
      student.student_number?.toLowerCase().includes(search) ||
      student.specialty_ar?.toLowerCase().includes(search)
    );
  });

  // Get the 5 most recently added students (for highlighting)
  const recentStudentIds = currentStudents.slice(0, 5).map(s => s.id);

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
        // Track original values
        setOriginalBackgroundOffsetX(offsetX);
        setOriginalBackgroundOffsetY(offsetY);
      }
    } else {
      setBackgroundOffsetX(0);
      setBackgroundOffsetY(0);
      setBackgroundScale(100);
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

  // Reset preview student when certificate type changes
  useEffect(() => {
    setPreviewStudentId(null);
    setSelectedStudentIds([]);
  }, [selectedType]);

  // Don't auto-select a student - let user choose or show placeholders
  useEffect(() => {
    if (currentStudents.length === 0) {
      setPreviewStudentId(null);
    }
  }, [currentStudents]);

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
      // Selecting via checkbox should also update preview
      setSelectedStudentIds((prev) => {
        const next = prev.includes(studentId) ? prev : [...prev, studentId];
        return next;
      });
      setPreviewStudentId(studentId);
      return;
    }

    // Unselecting should clear preview if it was showing this student
    setSelectedStudentIds((prev) => {
      const next = prev.filter((id) => id !== studentId);

      // If no one is selected anymore, clear preview
      if (next.length === 0) {
        setPreviewStudentId(null);
      } else if (previewStudentId === studentId) {
        // If the previewed student was unchecked, clear preview so placeholders show
        setPreviewStudentId(null);
      }

      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only filtered students when searching
      const allIds = filteredStudents.map((s) => s.id);
      setSelectedStudentIds(allIds);
      // Keep current preview if exists, otherwise set to first
      if (!previewStudentId && allIds.length > 0) {
        setPreviewStudentId(allIds[0]);
      }
    } else {
      setSelectedStudentIds([]);
      setPreviewStudentId(null);
    }
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

    const selectedStudents = currentStudents.filter(s => selectedStudentIds.includes(s.id));
    const template = templates.find(t => t.id === selectedTemplateId);

    if (!template) {
      toast.error("القالب غير موجود");
      return;
    }

    try {
      setIsPrinting(true);
      // Desktop app: print directly with native print dialog + printer selection.
      if (isDesktop && window.electronAPI?.printPdf) {
        const blob = await generatePDFBlob(
          selectedStudents as unknown as Record<string, unknown>[],
          templateFields,
          template,
          selectedType
        );
        const buf = await blob.arrayBuffer();
        const result = await window.electronAPI.printPdf(buf, {
          deviceName: selectedPrinterName || undefined,
        });
        if (result?.success) {
          toast.success(`تم إرسال ${selectedStudents.length} شهادة إلى الطباعة`);
        } else {
          toast.error(result?.error || 'فشل في الطباعة');
        }
        return;
      }

      // Web: download PDF (user can print via system dialog from the PDF viewer)
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

  const previewStudent = currentStudents.find(s => s.id === previewStudentId);

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

      {/* Type and Language Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>نوع الشهادة</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CertificateType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(certificateTypeLabels).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>لغة القالب</Label>
              <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as TemplateLanguage)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageLabels).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>القالب المستخدم</Label>
              <Select 
                value={selectedTemplateId || ""} 
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
                <SelectTrigger className="mt-1">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List - Horizontal at top */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              قائمة الطلاب
              {recentStudentIds.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  آخر {toWesternNumerals(Math.min(5, currentStudents.length))} إضافة
                </Badge>
              )}
            </span>
            <Badge variant="secondary">{toWesternNumerals(filteredStudents.length)}/{toWesternNumerals(currentStudents.length)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStudents.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p>لا يوجد طلاب</p>
              <Button size="sm" className="mt-2" onClick={() => setIsAddStudentOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة طالب
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن طالب بالاسم أو الرقم أو التخصص..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pr-9"
                />
              </div>

              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">تحديد الكل</span>
                {studentSearch && (
                  <span className="text-xs text-muted-foreground">
                    ({toWesternNumerals(filteredStudents.length)} نتيجة)
                  </span>
                )}
              </div>

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
                        onClick={() => setPreviewStudentId(isPreviewSelected ? null : student.id)}
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
      <Card className="flex-1">
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
                    value="" 
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
                  stepSize={stepSize}
                  isMoving={updateField.isPending}
                  backgroundOffsetX={backgroundOffsetX}
                  backgroundOffsetY={backgroundOffsetY}
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
              {selectedTemplateId ? (
                <div className="space-y-6">
                  <div className="max-w-md">
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
                    <p className="text-xs text-muted-foreground mt-4">
                      ارفع صورة الشهادة الفارغة (بدون بيانات الطالب) لاستخدامها كخلفية للمعاينة فقط.
                      <br />
                      <strong>ملاحظة:</strong> الخلفية لا تُطبع - تُستخدم فقط لضبط مواقع الحقول على الورقة المحضرة مسبقاً.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  يرجى اختيار قالب أولاً
                </div>
              )}
            </TabsContent>

            <TabsContent value="font-properties">
              <div className="space-y-6">
                {/* Global Font Settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    تطبيق خصائص الخط على جميع الحقول
                  </h4>
                  
                  {selectedTemplateId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Font Family */}
                      <div className="space-y-2">
                        <Label>نوع الخط</Label>
                        <Select
                          onValueChange={(v) => {
                            void applyToAllFields({ font_name: v }, "تم تطبيق الخط على جميع الحقول");
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
                            defaultValue="#000000"
                            className="w-12 h-10 p-1 cursor-pointer"
                            onChange={(e) => {
                              void applyToAllFields({ font_color: e.target.value }, "تم تطبيق اللون على جميع الحقول");
                            }}
                          />
                        </div>
                      </div>

                      {/* Font Style */}
                      <div className="space-y-2">
                        <Label>نمط الخط</Label>
                        <Select
                          onValueChange={(v) => {
                            if (!selectedTemplateId) return;
                            // Note: font_style is not in the current schema, 
                            // but we can simulate with font_name variations
                            toast.info("سيتم دعم أنماط الخط قريباً");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="عادي" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">عادي</SelectItem>
                            <SelectItem value="bold">غامق</SelectItem>
                            <SelectItem value="italic">مائل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
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
          onSaveSettings={(settings) => {
            updateTemplate.mutate({
              id: selectedTemplateId,
              background_offset_x: settings.background_offset_x,
              background_offset_y: settings.background_offset_y,
              background_scale: settings.background_scale,
            } as any);
            setBackgroundOffsetX(settings.background_offset_x);
            setBackgroundOffsetY(settings.background_offset_y);
            setBackgroundScale(settings.background_scale);
          }}
          onFieldMove={(fieldId, newX, newY) => {
            updateField.mutate({
              id: fieldId,
              template_id: selectedTemplateId,
              position_x: newX,
              position_y: newY,
            });
          }}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}

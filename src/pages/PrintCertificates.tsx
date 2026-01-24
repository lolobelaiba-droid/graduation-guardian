import { useState, useEffect } from "react";
import { Loader2, Plus, Printer, Eye, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Type } from "lucide-react";
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
import { generatePDF } from "@/lib/pdfGenerator";
import { BackgroundUpload } from "@/components/print/BackgroundUpload";
import { ImportExcelDialog } from "@/components/print/ImportExcelDialog";
import { AddFieldDialog } from "@/components/print/AddFieldDialog";
import { getFontOptions } from "@/lib/arabicFonts";
import { toWesternNumerals } from "@/lib/numerals";

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
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  
  // Background offset state for visual alignment
  const [backgroundOffsetX, setBackgroundOffsetX] = useState(0);
  const [backgroundOffsetY, setBackgroundOffsetY] = useState(0);
  const [showBackgroundControls, setShowBackgroundControls] = useState(false);

  // Data hooks
  const { data: templates = [], isLoading: loadingTemplates } = useCertificateTemplates();
  const { data: templateFields = [], isLoading: loadingFields } = useTemplateFields(selectedTemplateId);
  const { data: phdLmdData = [] } = usePhdLmdCertificates();
  const { data: phdScienceData = [] } = usePhdScienceCertificates();
  const { data: masterData = [] } = useMasterCertificates();
  const { data: savedSettings } = useUserSettings();
  
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();
  const updateTemplate = useUpdateTemplate();
  const saveSetting = useSaveSetting();

  // Get current students based on type
  const getCurrentStudents = () => {
    switch (selectedType) {
      case "phd_lmd": return phdLmdData;
      case "phd_science": return phdScienceData;
      case "master": return masterData;
    }
  };

  const currentStudents = getCurrentStudents();

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
      const allIds = currentStudents.map((s) => s.id);
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
      await generatePDF(selectedStudents as unknown as Record<string, unknown>[], templateFields, template, selectedType);
      toast.success(`تم إنشاء PDF لـ ${selectedStudents.length} طالب`);
    } catch (error) {
      toast.error("فشل في إنشاء PDF: " + (error as Error).message);
    }
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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsCreateTemplateOpen(true)}>
            <Plus className="h-4 w-4" />
            إنشاء قالب
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsAddStudentOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة طالب
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsImportExcelOpen(true)}>
            <Plus className="h-4 w-4" />
            استيراد Excel
          </Button>
          <Button size="sm" className="gap-2" onClick={handlePrint} disabled={selectedStudentIds.length === 0}>
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
            <span>قائمة الطلاب</span>
            <Badge variant="secondary">{toWesternNumerals(currentStudents.length)}</Badge>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedStudentIds.length === currentStudents.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">تحديد الكل</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {currentStudents.map((student) => {
                  const isPreviewSelected = previewStudentId === student.id;
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all shrink-0 border-2 ${
                        isPreviewSelected 
                          ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/20' 
                          : 'hover:bg-muted border-transparent hover:border-muted-foreground/20'
                      }`}
                      onClick={() => setPreviewStudentId(isPreviewSelected ? null : student.id)}
                    >
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
                      <Badge variant="outline" className="text-xs">
                        {mentionLabels[student.mention as MentionType]?.ar || student.mention}
                      </Badge>
                    </div>
                  );
                })}
              </div>
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
              <TabsTrigger value="fields">تحريك الحقول</TabsTrigger>
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
                    
                    updateField.mutate({
                      id: fieldId,
                      template_id: selectedTemplateId,
                      position_x: newX,
                      position_y: newY,
                    });
                  }}
                  onFieldDrag={(fieldId, newX, newY) => {
                    if (!selectedTemplateId) return;
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
    </div>
  );
}

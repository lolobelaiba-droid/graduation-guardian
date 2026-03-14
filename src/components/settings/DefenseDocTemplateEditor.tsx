import { useState, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Type,
  Variable,
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDefenseDocTemplates,
  useUpdateDefenseDocTemplate,
  AVAILABLE_VARIABLES,
  type DefenseDocTemplate,
} from "@/hooks/useDefenseDocTemplates";

const FONT_OPTIONS = [
  "IBM Plex Sans Arabic",
  "Amiri",
  "Cairo",
  "Tajawal",
  "Noto Sans Arabic",
  "Arial",
  "Times New Roman",
];

const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32];

const typeColors: Record<string, string> = {
  jury_decision_lmd: "bg-primary/10 text-primary border-primary/20",
  jury_decision_science: "bg-success/10 text-success border-success/20",
  defense_auth_lmd: "bg-warning/10 text-warning border-warning/20",
  defense_auth_science: "bg-accent/10 text-accent-foreground border-accent/20",
};

const typeLabels: Record<string, string> = {
  jury_decision_lmd: "مقرر اللجنة - ل م د",
  jury_decision_science: "مقرر اللجنة - علوم",
  defense_auth_lmd: "ترخيص المناقشة - ل م د",
  defense_auth_science: "ترخيص المناقشة - علوم",
};

export default function DefenseDocTemplateEditor() {
  const { data: templates = [], isLoading } = useDefenseDocTemplates();
  const updateTemplate = useUpdateDefenseDocTemplate();

  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [savingTemplates, setSavingTemplates] = useState<Set<string>>(new Set());
  const [localSettings, setLocalSettings] = useState<Record<string, {
    title: string;
    content: string;
    font_family: string;
    font_size: number;
    line_height: number;
  }>>({});
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (templates.length > 0) {
      const initial: typeof localSettings = {};
      templates.forEach((t) => {
        initial[t.id] = {
          title: t.title,
          content: t.content,
          font_family: t.font_family || "IBM Plex Sans Arabic",
          font_size: t.font_size || 14,
          line_height: t.line_height || 1.8,
        };
      });
      setLocalSettings(initial);
    }
  }, [templates]);

  // Sync editor content when localSettings change from template load
  useEffect(() => {
    Object.entries(editorRefs.current).forEach(([id, ref]) => {
      if (ref && localSettings[id] && !ref.innerHTML) {
        ref.innerHTML = localSettings[id].content;
      }
    });
  }, [localSettings]);

  const toggleTemplate = (id: string) => {
    setOpenTemplates((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const updateLocal = (id: string, key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  const handleEditorInput = useCallback((id: string) => {
    const ref = editorRefs.current[id];
    if (!ref) return;
    updateLocal(id, "content", ref.innerHTML);
  }, []);

  const execCmd = (id: string, cmd: string, value?: string) => {
    editorRefs.current[id]?.focus();
    document.execCommand(cmd, false, value);
    handleEditorInput(id);
  };

  const insertVariable = (id: string, varKey: string) => {
    const ref = editorRefs.current[id];
    if (!ref) return;
    ref.focus();
    document.execCommand("insertHTML", false, `<span class="variable-tag" contenteditable="false" style="background: hsl(var(--primary) / 0.15); color: hsl(var(--primary)); padding: 1px 6px; border-radius: 4px; font-size: 12px; cursor: default;">{{${varKey}}}</span>&nbsp;`);
    handleEditorInput(id);
  };

  const saveTemplate = async (id: string) => {
    const settings = localSettings[id];
    if (!settings) return;

    setSavingTemplates((prev) => new Set(prev).add(id));
    try {
      await updateTemplate.mutateAsync({
        id,
        title: settings.title,
        content: settings.content,
        font_family: settings.font_family,
        font_size: settings.font_size,
        line_height: settings.line_height,
      });
      toast.success("تم حفظ القالب بنجاح");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("حدث خطأ أثناء حفظ القالب");
    } finally {
      setSavingTemplates((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">قوالب وثائق المناقشة</h3>
          <p className="text-sm text-muted-foreground">
            تخصيص قوالب مقرر اللجنة وترخيص المناقشة
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {templates.map((template) => {
          const settings = localSettings[template.id];
          const isOpen = openTemplates.has(template.id);
          const isSaving = savingTemplates.has(template.id);
          const isPreview = previewMode[template.id];

          if (!settings) return null;

          return (
            <Collapsible
              key={template.id}
              open={isOpen}
              onOpenChange={() => toggleTemplate(template.id)}
            >
              <div
                className={cn(
                  "border rounded-xl transition-all",
                  isOpen ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-medium">{settings.title}</h4>
                        <Badge
                          variant="outline"
                          className={cn("text-xs mt-1", typeColors[template.document_type])}
                        >
                          {typeLabels[template.document_type]}
                        </Badge>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4">
                    <Separator />

                    {/* Title */}
                    <div className="space-y-2">
                      <Label>عنوان القالب</Label>
                      <Input
                        value={settings.title}
                        onChange={(e) => updateLocal(template.id, "title", e.target.value)}
                      />
                    </div>

                    {/* Font Settings Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Type className="h-3.5 w-3.5" />
                          الخط
                        </Label>
                        <Select
                          value={settings.font_family}
                          onValueChange={(v) => updateLocal(template.id, "font_family", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f}>
                                <span style={{ fontFamily: f }}>{f}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>حجم الخط</Label>
                        <Select
                          value={String(settings.font_size)}
                          onValueChange={(v) => updateLocal(template.id, "font_size", parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_SIZE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                {s}px
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>تباعد الأسطر</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="3"
                          value={settings.line_height}
                          onChange={(e) =>
                            updateLocal(template.id, "line_height", parseFloat(e.target.value) || 1.8)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-1 flex-wrap border rounded-lg p-2 bg-muted/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "bold")}
                        title="عريض"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "italic")}
                        title="مائل"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "underline")}
                        title="تسطير"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "justifyRight")}
                        title="محاذاة يمين"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "justifyCenter")}
                        title="محاذاة وسط"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "justifyLeft")}
                        title="محاذاة يسار"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "undo")}
                        title="تراجع"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => execCmd(template.id, "redo")}
                        title="إعادة"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      {/* Font size in toolbar */}
                      <Select
                        value=""
                        onValueChange={(v) => execCmd(template.id, "fontSize", v)}
                      >
                        <SelectTrigger className="h-8 w-20 text-xs">
                          <span className="text-xs">حجم</span>
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="w-px h-5 bg-border mx-1" />

                      {/* Insert Variable */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                          >
                            <Variable className="h-3.5 w-3.5" />
                            إدراج متغير
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {AVAILABLE_VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                type="button"
                                className="w-full text-right px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                                onClick={() => insertVariable(template.id, v.key)}
                              >
                                <span className="text-muted-foreground text-xs font-mono">
                                  {`{{${v.key}}}`}
                                </span>
                                <span>{v.label}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="flex-1" />

                      {/* Preview Toggle */}
                      <Button
                        type="button"
                        variant={isPreview ? "default" : "ghost"}
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() =>
                          setPreviewMode((prev) => ({
                            ...prev,
                            [template.id]: !prev[template.id],
                          }))
                        }
                      >
                        {isPreview ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        {isPreview ? "تحرير" : "معاينة"}
                      </Button>
                    </div>

                    {/* Editor / Preview */}
                    {isPreview ? (
                      <div
                        className="border rounded-lg p-8 bg-white min-h-[500px]"
                        style={{
                          fontFamily: settings.font_family,
                          fontSize: `${settings.font_size}px`,
                          lineHeight: settings.line_height,
                          direction: "rtl",
                          width: "210mm",
                          maxWidth: "100%",
                          margin: "0 auto",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: settings.content.replace(
                            /\{\{(\w+)\}\}/g,
                            '<span style="background: hsl(var(--primary) / 0.15); color: hsl(var(--primary)); padding: 1px 6px; border-radius: 4px; font-size: 12px;">$1</span>'
                          ),
                        }}
                      />
                    ) : (
                      <div
                        ref={(el) => {
                          editorRefs.current[template.id] = el;
                          if (el && !el.innerHTML && settings.content) {
                            el.innerHTML = settings.content;
                          }
                        }}
                        contentEditable
                        dir="rtl"
                        className="border rounded-lg p-6 bg-background min-h-[400px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          fontFamily: settings.font_family,
                          fontSize: `${settings.font_size}px`,
                          lineHeight: settings.line_height,
                        }}
                        onInput={() => handleEditorInput(template.id)}
                        suppressContentEditableWarning
                      />
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => saveTemplate(template.id)}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        حفظ القالب
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

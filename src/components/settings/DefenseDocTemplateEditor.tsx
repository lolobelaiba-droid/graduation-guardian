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
  Plus,
  Trash2,
  Table,
  Settings2,
  ArrowRightLeft,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DEFAULT_VARIABLES,
  getTemplateVariables,
  type DefenseDocTemplate,
  type CustomVariable,
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

interface LocalSettings {
  title: string;
  content: string;
  font_family: string;
  font_size: number;
  line_height: number;
  custom_variables: CustomVariable[];
}

export default function DefenseDocTemplateEditor() {
  const { data: templates = [], isLoading } = useDefenseDocTemplates();
  const updateTemplate = useUpdateDefenseDocTemplate();

  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [savingTemplates, setSavingTemplates] = useState<Set<string>>(new Set());
  const [localSettings, setLocalSettings] = useState<Record<string, LocalSettings>>({});
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Variable management dialog
  const [variableDialog, setVariableDialog] = useState<{ open: boolean; templateId: string }>({
    open: false,
    templateId: "",
  });
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");

  // Table insertion/editing dialog
  const [tableDialog, setTableDialog] = useState<{ open: boolean; templateId: string; editMode: boolean }>({
    open: false,
    templateId: "",
    editMode: false,
  });
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const savedSelectionRef = useRef<Range | null>(null);
  const editingTableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    if (templates.length > 0) {
      const initial: Record<string, LocalSettings> = {};
      templates.forEach((t) => {
        initial[t.id] = {
          title: t.title,
          content: t.content,
          font_family: t.font_family || "IBM Plex Sans Arabic",
          font_size: t.font_size || 14,
          line_height: t.line_height || 1.8,
          custom_variables: Array.isArray(t.custom_variables) ? t.custom_variables : [],
        };
      });
      setLocalSettings(initial);
    }
  }, [templates]);

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
    document.execCommand(
      "insertHTML",
      false,
      `<span class="variable-tag" contenteditable="false" style="background: hsl(var(--primary) / 0.15); color: hsl(var(--primary)); padding: 1px 6px; border-radius: 4px; font-size: 12px; cursor: default;">{{${varKey}}}</span>&nbsp;`
    );
    handleEditorInput(id);
  };

  const addCustomVariable = () => {
    const { templateId } = variableDialog;
    if (!newVarKey.trim() || !newVarLabel.trim()) {
      toast.error("يرجى ملء المفتاح والتسمية");
      return;
    }
    const key = newVarKey.trim().replace(/\s+/g, "_").toLowerCase();
    const settings = localSettings[templateId];
    if (!settings) return;

    const allVars = [...DEFAULT_VARIABLES, ...settings.custom_variables];
    if (allVars.some((v) => v.key === key)) {
      toast.error("هذا المتغير موجود مسبقاً");
      return;
    }

    updateLocal(templateId, "custom_variables", [
      ...settings.custom_variables,
      { key, label: newVarLabel.trim() },
    ]);
    setNewVarKey("");
    setNewVarLabel("");
    toast.success("تمت إضافة المتغير");
  };

  const removeCustomVariable = (templateId: string, key: string) => {
    const settings = localSettings[templateId];
    if (!settings) return;
    updateLocal(
      templateId,
      "custom_variables",
      settings.custom_variables.filter((v) => v.key !== key)
    );
    toast.success("تم حذف المتغير");
  };

  const buildTableHtml = () => {
    let html = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; direction: rtl;" border="1">';
    if (tableHeaders.some((h) => h.trim())) {
      html += "<thead><tr>";
      for (let c = 0; c < tableCols; c++) {
        html += `<th style="border: 1px solid #333; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold;">${tableHeaders[c] || `عمود ${c + 1}`}</th>`;
      }
      html += "</tr></thead>";
    }
    html += "<tbody>";
    for (let r = 0; r < tableRows; r++) {
      html += "<tr>";
      for (let c = 0; c < tableCols; c++) {
        html += '<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    return html;
  };

  const insertTable = (templateId: string) => {
    const ref = editorRefs.current[templateId];
    if (!ref) return;
    ref.focus();

    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
        savedSelectionRef.current = null;
      }
    }

    document.execCommand("insertHTML", false, buildTableHtml() + "<br/>");
    handleEditorInput(templateId);
    setTableDialog({ open: false, templateId: "", editMode: false });
    toast.success("تم إدراج الجدول");
  };

  const updateExistingTable = (templateId: string) => {
    if (!editingTableRef.current) return;
    const newTable = document.createElement("div");
    newTable.innerHTML = buildTableHtml();
    const tableEl = newTable.querySelector("table");
    if (tableEl) {
      editingTableRef.current.replaceWith(tableEl);
    }
    editingTableRef.current = null;
    handleEditorInput(templateId);
    setTableDialog({ open: false, templateId: "", editMode: false });
    toast.success("تم تحديث الجدول");
  };

  const deleteTable = (templateId: string) => {
    if (!editingTableRef.current) return;
    editingTableRef.current.remove();
    editingTableRef.current = null;
    handleEditorInput(templateId);
    setTableDialog({ open: false, templateId: "", editMode: false });
    toast.success("تم حذف الجدول");
  };

  const handleEditorClick = (templateId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const table = target.closest("table");
    if (!table) return;

    editingTableRef.current = table as HTMLTableElement;
    const rows = table.querySelectorAll("tbody tr");
    const headerCells = table.querySelectorAll("thead th");
    const firstRow = table.querySelector("tr");
    const cols = firstRow ? firstRow.children.length : 3;
    const headers: string[] = [];
    headerCells.forEach((th) => headers.push(th.textContent || ""));

    setTableRows(rows.length || 1);
    setTableCols(cols);
    setTableHeaders(headers);
    setTableDialog({ open: true, templateId, editMode: true });
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
        custom_variables: settings.custom_variables,
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

          const allVariables = [
            ...DEFAULT_VARIABLES,
            ...settings.custom_variables,
          ];

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
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "bold")} title="عريض">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "italic")} title="مائل">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "underline")} title="تسطير">
                        <Underline className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "justifyRight")} title="محاذاة يمين">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "justifyCenter")} title="محاذاة وسط">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "justifyLeft")} title="محاذاة يسار">
                        <AlignLeft className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "undo")} title="تراجع">
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd(template.id, "redo")} title="إعادة">
                        <Redo2 className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      {/* Inline font family for selection */}
                      <Select value="" onValueChange={(v) => execCmd(template.id, "fontName", v)}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <span className="text-xs">خط التحديد</span>
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f} value={f}>
                              <span style={{ fontFamily: f }} className="text-xs">{f}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Inline font size for selection */}
                      <Select value="" onValueChange={(v) => execCmd(template.id, "fontSize", v)}>
                        <SelectTrigger className="h-8 w-20 text-xs">
                          <span className="text-xs">حجم</span>
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {s === 1 ? "8px" : s === 2 ? "10px" : s === 3 ? "12px" : s === 4 ? "14px" : s === 5 ? "18px" : s === 6 ? "24px" : "36px"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Text direction toggle */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          const ref = editorRefs.current[template.id];
                          if (!ref) return;
                          const sel = window.getSelection();
                          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                            // Toggle whole editor direction
                            const current = ref.dir || "rtl";
                            ref.dir = current === "rtl" ? "ltr" : "rtl";
                            ref.style.direction = ref.dir;
                            ref.style.textAlign = ref.dir === "rtl" ? "right" : "left";
                          } else {
                            // Wrap selection in a span with opposite direction
                            const range = sel.getRangeAt(0);
                            const parentEl = range.commonAncestorContainer.parentElement;
                            const currentDir = parentEl?.closest("[dir]")?.getAttribute("dir") || "rtl";
                            const newDir = currentDir === "rtl" ? "ltr" : "rtl";
                            document.execCommand(
                              "insertHTML",
                              false,
                              `<span dir="${newDir}" style="direction: ${newDir}; unicode-bidi: embed;">${sel.toString()}</span>`
                            );
                          }
                          handleEditorInput(template.id);
                        }}
                        title="تبديل اتجاه النص (RTL/LTR)"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        اتجاه
                      </Button>

                      <div className="w-px h-5 bg-border mx-1" />

                      {/* Insert Variable */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
                            <Variable className="h-3.5 w-3.5" />
                            إدراج متغير
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2" align="start">
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {DEFAULT_VARIABLES.length > 0 && (
                              <p className="text-xs font-medium text-muted-foreground px-3 py-1">متغيرات أساسية</p>
                            )}
                            {DEFAULT_VARIABLES.map((v) => (
                              <button
                                key={v.key}
                                type="button"
                                className="w-full text-right px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                                onClick={() => insertVariable(template.id, v.key)}
                              >
                                <span className="text-muted-foreground text-xs font-mono">{`{{${v.key}}}`}</span>
                                <span>{v.label}</span>
                              </button>
                            ))}
                            {settings.custom_variables.length > 0 && (
                              <>
                                <Separator className="my-1" />
                                <p className="text-xs font-medium text-primary px-3 py-1">متغيرات مخصصة</p>
                                {settings.custom_variables.map((v) => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    className="w-full text-right px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                                    onClick={() => insertVariable(template.id, v.key)}
                                  >
                                    <span className="text-muted-foreground text-xs font-mono">{`{{${v.key}}}`}</span>
                                    <span>{v.label}</span>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Manage Variables */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          setVariableDialog({ open: true, templateId: template.id });
                          setNewVarKey("");
                          setNewVarLabel("");
                        }}
                        title="إدارة المتغيرات"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        المتغيرات
                      </Button>

                      {/* Insert Table */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          // Save current selection before dialog steals focus
                          const sel = window.getSelection();
                          if (sel && sel.rangeCount > 0) {
                            savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
                          }
                          setTableDialog({ open: true, templateId: template.id, editMode: false });
                          setTableRows(3);
                          setTableCols(3);
                          setTableHeaders([]);
                        }}
                      >
                        <Table className="h-3.5 w-3.5" />
                        إدراج جدول
                      </Button>

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
                        {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isPreview ? "تحرير" : "معاينة"}
                      </Button>
                    </div>

                    {/* Editor / Preview */}
                    {isPreview ? (
                      <div
                        className="border rounded-lg p-8 bg-white min-h-[500px] text-foreground"
                        style={{
                          fontFamily: settings.font_family,
                          fontSize: `${settings.font_size}px`,
                          lineHeight: settings.line_height,
                          direction: "rtl",
                          width: "210mm",
                          maxWidth: "100%",
                          margin: "0 auto",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                          color: "#000",
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
                        onClick={(e) => handleEditorClick(template.id, e)}
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
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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

      {/* Variable Management Dialog */}
      <Dialog
        open={variableDialog.open}
        onOpenChange={(open) => setVariableDialog({ open, templateId: variableDialog.templateId })}
      >
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Variable className="h-5 w-5 text-primary" />
              إدارة المتغيرات المخصصة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new variable */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">المفتاح (إنجليزي)</Label>
                <Input
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  placeholder="custom_field"
                  dir="ltr"
                  className="text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">التسمية (عربي)</Label>
                <Input
                  value={newVarLabel}
                  onChange={(e) => setNewVarLabel(e.target.value)}
                  placeholder="الحقل المخصص"
                  className="text-sm"
                />
              </div>
              <Button size="sm" className="gap-1 shrink-0" onClick={addCustomVariable}>
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>

            <Separator />

            {/* Default variables (read-only list) */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">المتغيرات الأساسية ({DEFAULT_VARIABLES.length})</p>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {DEFAULT_VARIABLES.map((v) => (
                  <div key={v.key} className="text-xs px-2 py-1 bg-muted rounded flex items-center justify-between">
                    <span className="text-muted-foreground font-mono">{v.key}</span>
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom variables (editable) */}
            {variableDialog.templateId && localSettings[variableDialog.templateId]?.custom_variables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-primary mb-2">
                  المتغيرات المخصصة ({localSettings[variableDialog.templateId].custom_variables.length})
                </p>
                <div className="space-y-1">
                  {localSettings[variableDialog.templateId].custom_variables.map((v) => (
                    <div
                      key={v.key}
                      className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeCustomVariable(variableDialog.templateId, v.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{v.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{`{{${v.key}}}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVariableDialog({ open: false, templateId: "" })}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Insertion Dialog */}
      <Dialog
        open={tableDialog.open}
        onOpenChange={(open) => setTableDialog({ open, templateId: tableDialog.templateId, editMode: tableDialog.editMode })}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              {tableDialog.editMode ? "تعديل الجدول" : "إدراج جدول"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عدد الصفوف</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>عدد الأعمدة</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => {
                    const cols = parseInt(e.target.value) || 1;
                    setTableCols(cols);
                    setTableHeaders((prev) => {
                      const newHeaders = [...prev];
                      while (newHeaders.length < cols) newHeaders.push("");
                      return newHeaders.slice(0, cols);
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>عناوين الأعمدة (اختياري)</Label>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: tableCols }, (_, i) => (
                  <Input
                    key={i}
                    value={tableHeaders[i] || ""}
                    onChange={(e) => {
                      setTableHeaders((prev) => {
                        const newH = [...prev];
                        while (newH.length <= i) newH.push("");
                        newH[i] = e.target.value;
                        return newH;
                      });
                    }}
                    placeholder={`عمود ${i + 1}`}
                    className="text-sm"
                  />
                ))}
              </div>
            </div>

            {/* Table Preview */}
            <div className="border rounded-lg p-3 bg-muted/30 overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr>
                    {Array.from({ length: tableCols }, (_, c) => (
                      <th
                        key={c}
                        style={{
                          border: "1px solid hsl(var(--border))",
                          padding: "6px",
                          textAlign: "center",
                          fontSize: "12px",
                          background: "hsl(var(--muted))",
                        }}
                      >
                        {tableHeaders[c] || `عمود ${c + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(tableRows, 3) }, (_, r) => (
                    <tr key={r}>
                      {Array.from({ length: tableCols }, (_, c) => (
                        <td
                          key={c}
                          style={{
                            border: "1px solid hsl(var(--border))",
                            padding: "6px",
                            textAlign: "center",
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          ...
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {tableRows > 3 && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  + {tableRows - 3} صفوف أخرى
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog({ open: false, templateId: "", editMode: false })}>
              إلغاء
            </Button>
            {tableDialog.editMode && (
              <Button variant="destructive" onClick={() => deleteTable(tableDialog.templateId)} className="gap-1">
                <Trash2 className="h-4 w-4" />
                حذف الجدول
              </Button>
            )}
            <Button onClick={() => tableDialog.editMode ? updateExistingTable(tableDialog.templateId) : insertTable(tableDialog.templateId)} className="gap-1">
              <Table className="h-4 w-4" />
              {tableDialog.editMode ? "تحديث" : "إدراج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

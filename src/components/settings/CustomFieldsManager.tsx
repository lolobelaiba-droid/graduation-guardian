import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Loader2,
  Database,
  Settings2,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCustomFields,
  useAllCustomFieldOptions,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  useUpdateFieldOptions,
  type CustomField,
  type FieldType,
  type TargetTable,
} from "@/hooks/useCustomFields";

const fieldTypeLabels: Record<FieldType, string> = {
  text: "نص",
  number: "رقم",
  date: "تاريخ",
  select: "قائمة اختيار",
};

const targetTableLabels: Record<TargetTable, string> = {
  phd_candidates: "قاعدة بيانات طلبة الدكتوراه",
  defended_students: "قاعدة بيانات الطلبة المناقشين",
};

interface FieldFormData {
  field_key: string;
  field_name_ar: string;
  field_name_fr: string;
  field_type: FieldType;
  target_table: TargetTable;
  is_required: boolean;
  options: string[];
}

const initialFormData: FieldFormData = {
  field_key: "",
  field_name_ar: "",
  field_name_fr: "",
  field_type: "text",
  target_table: "phd_candidates",
  is_required: false,
  options: [],
};

export function CustomFieldsManager() {
  const [activeTab, setActiveTab] = useState<TargetTable>("phd_candidates");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState<FieldFormData>(initialFormData);
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const { data: allFields = [], isLoading } = useCustomFields();
  const { data: allOptions = [] } = useAllCustomFieldOptions();
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();
  const updateOptions = useUpdateFieldOptions();

  const fieldsForTab = allFields.filter((f) => f.target_table === activeTab);

  const getFieldOptions = (fieldId: string) => {
    return allOptions.filter((o) => o.field_id === fieldId);
  };

  const generateFieldKey = (nameAr: string) => {
    return `custom_${nameAr
      .toLowerCase()
      .replace(/[\s\u0621-\u064A]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 30)}_${Date.now().toString(36)}`;
  };

  const handleAddField = async () => {
    const fieldKey = generateFieldKey(formData.field_name_ar);
    await createField.mutateAsync({
      field_key: fieldKey,
      field_name_ar: formData.field_name_ar,
      field_name_fr: formData.field_name_fr || null,
      field_type: formData.field_type,
      target_table: formData.target_table,
      is_required: formData.is_required,
      options: formData.field_type === "select" ? formData.options : undefined,
    });
    setShowAddDialog(false);
    setFormData(initialFormData);
  };

  const handleEditField = async () => {
    if (!selectedField) return;
    await updateField.mutateAsync({
      id: selectedField.id,
      field_name_ar: formData.field_name_ar,
      field_name_fr: formData.field_name_fr || null,
      is_required: formData.is_required,
    });
    setShowEditDialog(false);
    setSelectedField(null);
  };

  const handleDeleteField = async () => {
    if (!selectedField) return;
    await deleteField.mutateAsync(selectedField.id);
    setShowDeleteDialog(false);
    setSelectedField(null);
  };

  const handleToggleActive = async (field: CustomField) => {
    await updateField.mutateAsync({
      id: field.id,
      is_active: !field.is_active,
    });
  };

  const openEditDialog = (field: CustomField) => {
    setSelectedField(field);
    setFormData({
      field_key: field.field_key,
      field_name_ar: field.field_name_ar,
      field_name_fr: field.field_name_fr || "",
      field_type: field.field_type as FieldType,
      target_table: field.target_table as TargetTable,
      is_required: field.is_required,
      options: [],
    });
    setShowEditDialog(true);
  };

  const openOptionsDialog = (field: CustomField) => {
    setSelectedField(field);
    const options = getFieldOptions(field.id);
    setEditOptions(options.map((o) => o.option_value));
    setShowOptionsDialog(true);
  };

  const handleSaveOptions = async () => {
    if (!selectedField) return;
    await updateOptions.mutateAsync({
      fieldId: selectedField.id,
      options: editOptions,
    });
    setShowOptionsDialog(false);
    setSelectedField(null);
  };

  const addOption = () => {
    if (newOption.trim() && !editOptions.includes(newOption.trim())) {
      setEditOptions([...editOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setEditOptions(editOptions.filter((_, i) => i !== index));
  };

  const addFormOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const removeFormOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                إدارة حقول قاعدة البيانات
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                إضافة حقول مخصصة لقواعد البيانات دون المساس بالحقول الأساسية
              </p>
            </div>
          <Button
            className="gap-2"
            onClick={() => {
              setFormData({ ...initialFormData, target_table: activeTab });
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4" />
            إضافة حقل جديد
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TargetTable)}>
          <TabsList className="mb-4">
            <TabsTrigger value="phd_candidates" className="gap-2">
              <Database className="h-4 w-4" />
              طلبة الدكتوراه
            </TabsTrigger>
            <TabsTrigger value="defended_students" className="gap-2">
              <Database className="h-4 w-4" />
              الطلبة المناقشين
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : fieldsForTab.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد حقول مخصصة</p>
                <p className="text-sm">اضغط على "إضافة حقل جديد" لإنشاء حقل</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fieldsForTab.map((field) => {
                  const options = getFieldOptions(field.id);
                  return (
                    <div
                      key={field.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        field.is_active
                          ? "bg-background border-border"
                          : "bg-muted/50 border-muted opacity-60"
                      }`}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{field.field_name_ar}</span>
                          {field.field_name_fr && (
                            <span className="text-sm text-muted-foreground">
                              ({field.field_name_fr})
                            </span>
                          )}
                          {field.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              مطلوب
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {fieldTypeLabels[field.field_type as FieldType]}
                          </Badge>
                          {field.field_type === "select" && options.length > 0 && (
                            <span>{options.length} خيار</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.is_active}
                          onCheckedChange={() => handleToggleActive(field)}
                        />

                        {field.field_type === "select" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openOptionsDialog(field)}
                            title="إدارة الخيارات"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(field)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedField(field);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة حقل جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>قاعدة البيانات *</Label>
              <Select
                value={formData.target_table}
                onValueChange={(v) =>
                  setFormData({ ...formData, target_table: v as TargetTable })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(targetTableLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الحقل (عربي) *</Label>
                <Input
                  value={formData.field_name_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, field_name_ar: e.target.value })
                  }
                  placeholder="مثال: رقم الملف"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم الحقل (فرنسي)</Label>
                <Input
                  value={formData.field_name_fr}
                  onChange={(e) =>
                    setFormData({ ...formData, field_name_fr: e.target.value })
                  }
                  placeholder="Ex: Numéro de dossier"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع البيانات *</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      field_type: v as FieldType,
                      options: v === "select" ? formData.options : [],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked })
                  }
                />
                <Label htmlFor="is_required">حقل مطلوب</Label>
              </div>
            </div>

            {formData.field_type === "select" && (
              <div className="space-y-2">
                <Label>خيارات القائمة</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="أضف خيار جديد"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFormOption())}
                  />
                  <Button type="button" variant="outline" onClick={addFormOption}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    <div className="space-y-1">
                      {formData.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded"
                        >
                          <span>{opt}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFormOption(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddField}
              disabled={!formData.field_name_ar || createField.isPending}
            >
              {createField.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الحقل</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الحقل (عربي) *</Label>
                <Input
                  value={formData.field_name_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, field_name_ar: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>اسم الحقل (فرنسي)</Label>
                <Input
                  value={formData.field_name_fr}
                  onChange={(e) =>
                    setFormData({ ...formData, field_name_fr: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit_is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked })
                }
              />
              <Label htmlFor="edit_is_required">حقل مطلوب</Label>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>نوع البيانات: {fieldTypeLabels[formData.field_type]}</p>
              <p>قاعدة البيانات: {targetTableLabels[formData.target_table]}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleEditField}
              disabled={!formData.field_name_ar || updateField.isPending}
            >
              {updateField.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة خيارات: {selectedField?.field_name_ar}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="أضف خيار جديد"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
              />
              <Button type="button" variant="outline" onClick={addOption}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {editOptions.length > 0 ? (
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-1">
                  {editOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                    >
                      <span>{opt}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeOption(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد خيارات
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptionsDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveOptions} disabled={updateOptions.isPending}>
              {updateOptions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ الخيارات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف الحقل
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium text-foreground">
                هل أنت متأكد من حذف الحقل "{selectedField?.field_name_ar}"؟
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
                <p className="font-semibold text-destructive mb-1">⚠️ تحذير:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>سيتم حذف الحقل نهائياً ولا يمكن التراجع عن هذا الإجراء</li>
                  <li>سيتم حذف جميع البيانات المخزنة في هذا الحقل لجميع السجلات</li>
                  <li>لن يظهر هذا الحقل في نماذج الإدخال أو التصدير بعد الحذف</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteField.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف نهائي
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

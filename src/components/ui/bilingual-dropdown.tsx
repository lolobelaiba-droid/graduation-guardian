import { useState } from "react";
import { Plus, Trash2, Check, X, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBilingualDropdownOptions,
  useAddBilingualOption,
  useDeleteBilingualOption,
  useUpdateBilingualOption,
  type BilingualOptionType,
  type BilingualOption,
} from "@/hooks/useBilingualDropdownOptions";

interface BilingualDropdownProps {
  valueAr: string;
  valueFr: string;
  onChangeAr: (value: string) => void;
  onChangeFr: (value: string) => void;
  optionType: BilingualOptionType;
  labelAr?: string;
  labelFr?: string;
  placeholderAr?: string;
  placeholderFr?: string;
  required?: boolean;
}

export function BilingualDropdown({
  valueAr,
  valueFr,
  onChangeAr,
  onChangeFr,
  optionType,
  labelAr = "بالعربية",
  labelFr = "بالفرنسية",
  placeholderAr = "اختر...",
  placeholderFr = "Choisir...",
  required = false,
}: BilingualDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newValueAr, setNewValueAr] = useState("");
  const [newValueFr, setNewValueFr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValueAr, setEditValueAr] = useState("");
  const [editValueFr, setEditValueFr] = useState("");

  const { data: options = [], isLoading } = useBilingualDropdownOptions(optionType);
  const addOption = useAddBilingualOption();
  const deleteOption = useDeleteBilingualOption();
  const updateOption = useUpdateBilingualOption();

  // When selecting Arabic, auto-select French and vice versa
  const handleSelectAr = (selectedValueAr: string) => {
    const option = options.find(opt => opt.value_ar === selectedValueAr);
    if (option) {
      onChangeAr(option.value_ar || '');
      onChangeFr(option.value_fr || '');
    }
  };

  const handleSelectFr = (selectedValueFr: string) => {
    const option = options.find(opt => opt.value_fr === selectedValueFr);
    if (option) {
      onChangeAr(option.value_ar || '');
      onChangeFr(option.value_fr || '');
    }
  };

  const handleAdd = async () => {
    if (!newValueAr.trim() || !newValueFr.trim()) return;
    
    const optionValue = newValueAr.trim().toLowerCase().replace(/\s+/g, '_');
    
    await addOption.mutateAsync({
      optionType,
      optionValue,
      valueAr: newValueAr.trim(),
      valueFr: newValueFr.trim(),
    });
    
    setNewValueAr("");
    setNewValueFr("");
  };

  const handleDelete = async (id: string) => {
    await deleteOption.mutateAsync({ id, optionType });
  };

  const handleStartEdit = (opt: BilingualOption) => {
    setEditingId(opt.id);
    setEditValueAr(opt.value_ar || '');
    setEditValueFr(opt.value_fr || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValueAr.trim() || !editValueFr.trim()) return;
    
    const optionValue = editValueAr.trim().toLowerCase().replace(/\s+/g, '_');
    
    await updateOption.mutateAsync({
      id: editingId,
      optionType,
      optionValue,
      valueAr: editValueAr.trim(),
      valueFr: editValueFr.trim(),
    });
    
    setEditingId(null);
    setEditValueAr("");
    setEditValueFr("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValueAr("");
    setEditValueFr("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* Arabic Select */}
        <div className="space-y-2">
          <Label>{labelAr} {required && '*'}</Label>
          <Select value={valueAr} onValueChange={handleSelectAr}>
            <SelectTrigger>
              <SelectValue placeholder={placeholderAr} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.value_ar || opt.option_value}>
                  {opt.value_ar || opt.option_value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* French Select */}
        <div className="space-y-2">
          <Label>{labelFr}</Label>
          <div className="flex gap-2">
            <Select value={valueFr} onValueChange={handleSelectFr}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={placeholderFr} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value_fr || opt.option_value}>
                    {opt.value_fr || opt.option_value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Settings Button */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="إدارة الخيارات"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <Tabs defaultValue="add" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="add">إضافة</TabsTrigger>
                    <TabsTrigger value="manage">إدارة</TabsTrigger>
                  </TabsList>
                  
                  {/* Add Tab */}
                  <TabsContent value="add" className="p-3">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        أضف خياراً جديداً (بالعربية والفرنسية)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={newValueAr}
                          onChange={(e) => setNewValueAr(e.target.value)}
                          placeholder="القيمة بالعربية"
                          dir="rtl"
                        />
                        <Input
                          value={newValueFr}
                          onChange={(e) => setNewValueFr(e.target.value)}
                          placeholder="Valeur en français"
                          dir="ltr"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAdd}
                        disabled={!newValueAr.trim() || !newValueFr.trim() || addOption.isPending}
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Manage Tab */}
                  <TabsContent value="manage" className="p-3">
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {isLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          جاري التحميل...
                        </p>
                      ) : options.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          لا توجد خيارات للإدارة
                        </p>
                      ) : (
                        options.map((opt) => (
                          <div
                            key={opt.id}
                            className="p-2 rounded-md bg-muted/50 border space-y-2"
                          >
                            {editingId === opt.id ? (
                              // Edit mode
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={editValueAr}
                                    onChange={(e) => setEditValueAr(e.target.value)}
                                    dir="rtl"
                                    className="h-8"
                                    placeholder="بالعربية"
                                  />
                                  <Input
                                    value={editValueFr}
                                    onChange={(e) => setEditValueFr(e.target.value)}
                                    dir="ltr"
                                    className="h-8"
                                    placeholder="En français"
                                  />
                                </div>
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary"
                                    onClick={handleSaveEdit}
                                    disabled={updateOption.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" dir="rtl">
                                    {opt.value_ar}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                                    {opt.value_fr}
                                  </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => handleStartEdit(opt)}
                                    title="تعديل"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        title="حذف"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          هل أنت متأكد من حذف "{opt.value_ar}"؟
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="gap-2">
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(opt.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          حذف
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Plus, Trash2, Check, X, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useDropdownOptions,
  useAddDropdownOption,
  useDeleteDropdownOption,
  useUpdateDropdownOption,
  type OptionType,
} from "@/hooks/useDropdownOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DropdownWithAddProps {
  value: string;
  onChange: (value: string) => void;
  optionType: OptionType;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}

export function DropdownWithAdd({
  value,
  onChange,
  optionType,
  placeholder = "اختر...",
  dir = "rtl",
}: DropdownWithAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: options = [], isLoading } = useDropdownOptions(optionType);
  const addOption = useAddDropdownOption();
  const deleteOption = useDeleteDropdownOption();
  const updateOption = useUpdateDropdownOption();

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    await addOption.mutateAsync({
      optionType,
      optionValue: newValue.trim(),
    });
    
    setNewValue("");
  };

  const handleDelete = async (id: string) => {
    await deleteOption.mutateAsync({ id, optionType });
  };

  const handleStartEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    
    await updateOption.mutateAsync({
      id: editingId,
      optionType,
      optionValue: editValue.trim(),
    });
    
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          list={`${optionType}-options`}
        />
        <datalist id={`${optionType}-options`}>
          {options.map((opt) => (
            <option key={opt.id} value={opt.option_value} />
          ))}
        </datalist>
      </div>

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
        <PopoverContent className="w-80 p-0" align="end">
          <Tabs defaultValue="select" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="select">اختيار</TabsTrigger>
              <TabsTrigger value="add">إضافة</TabsTrigger>
              <TabsTrigger value="manage">إدارة</TabsTrigger>
            </TabsList>
            
            {/* Select Tab */}
            <TabsContent value="select" className="p-3">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    جاري التحميل...
                  </p>
                ) : options.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد خيارات محفوظة
                  </p>
                ) : (
                  options.map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      variant={value === opt.option_value ? "secondary" : "ghost"}
                      className="w-full justify-start text-start"
                      onClick={() => handleSelectOption(opt.option_value)}
                    >
                      <span className="truncate" dir={dir}>
                        {opt.option_value}
                      </span>
                    </Button>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Add Tab */}
            <TabsContent value="add" className="p-3">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  أضف خياراً جديداً للقائمة
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="أدخل القيمة..."
                    dir={dir}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAdd}
                    disabled={!newValue.trim() || addOption.isPending}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="p-3">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد خيارات للإدارة
                  </p>
                ) : (
                  options.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
                    >
                      {editingId === opt.id ? (
                        // Edit mode
                        <>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            dir={dir}
                            className="flex-1 h-8"
                            autoFocus
                          />
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
                        </>
                      ) : (
                        // View mode
                        <>
                          <span className="text-sm truncate flex-1" dir={dir}>
                            {opt.option_value}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleStartEdit(opt.id, opt.option_value)}
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
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف "{opt.option_value}"؟ لن يؤثر هذا على البيانات المحفوظة مسبقاً.
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
                        </>
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
  );
}

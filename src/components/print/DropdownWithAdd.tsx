import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type OptionType,
} from "@/hooks/useDropdownOptions";

interface DropdownWithAddProps {
  value: string;
  onChange: (value: string) => void;
  optionType: OptionType;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  allowCustomInput?: boolean;
}

export function DropdownWithAdd({
  value,
  onChange,
  optionType,
  placeholder = "اختر...",
  dir = "rtl",
  allowCustomInput = true,
}: DropdownWithAddProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [isManageMode, setIsManageMode] = useState(false);

  const { data: options = [], isLoading } = useDropdownOptions(optionType);
  const addOption = useAddDropdownOption();
  const deleteOption = useDeleteDropdownOption();

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    await addOption.mutateAsync({
      optionType,
      optionValue: newValue.trim(),
    });
    
    setNewValue("");
    setIsAddOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteOption.mutateAsync({ id, optionType });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setIsAddOpen(false);
      setNewValue("");
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        {allowCustomInput ? (
          <div className="relative">
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
        ) : (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger dir={dir}>
              <SelectValue placeholder={isLoading ? "جاري التحميل..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.option_value}>
                  {opt.option_value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="إضافة خيار جديد"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {isManageMode ? "إدارة الخيارات" : "إضافة خيار جديد"}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsManageMode(!isManageMode)}
              >
                {isManageMode ? "إضافة" : "إدارة"}
              </Button>
            </div>

            {isManageMode ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد خيارات محفوظة
                  </p>
                ) : (
                  options.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <span className="text-sm truncate flex-1" dir={dir}>
                        {opt.option_value}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف هذا الخيار؟ لن يؤثر هذا على البيانات المحفوظة مسبقاً.
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
                  ))
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="أدخل القيمة..."
                  dir={dir}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAdd}
                  disabled={!newValue.trim() || addOption.isPending}
                  className="shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsAddOpen(false);
                    setNewValue("");
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReorderDropdownOptions, type OptionType } from "@/hooks/useDropdownOptions";

interface DecreeDropdownFieldProps {
  form: any;
  name: string;
  label: string;
  optionType: OptionType;
  options: { id: string; option_value: string; display_order: number | null }[];
  addOption: any;
  deleteOption: any;
  updateOption: any;
}

export function DecreeDropdownField({
  form,
  name,
  label,
  optionType,
  options,
  addOption,
  deleteOption,
  updateOption,
}: DecreeDropdownFieldProps) {
  const [newValue, setNewValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const reorderOptions = useReorderDropdownOptions();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;

    return options.filter((option) => option.option_value.toLowerCase().includes(normalizedQuery));
  }, [options, normalizedQuery]);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    addOption.mutate({ optionType, optionValue: newValue.trim() });
    setNewValue("");
  };

  const handleDelete = (id: string) => {
    deleteOption.mutate({ id, optionType });
  };

  const handleStartEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleUpdate = (id: string) => {
    if (!editValue.trim()) return;
    updateOption.mutate({ id, optionType, optionValue: editValue.trim() });
    handleCancelEdit();
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const currentIndex = options.findIndex((option) => option.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const reordered = [...options];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

    reorderOptions.mutate({
      optionType,
      reorderedIds: reordered.map((option, index) => ({ id: option.id, display_order: index })),
    });
  };

  const isBusy = addOption.isPending || deleteOption.isPending || updateOption.isPending || reorderOptions.isPending;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between gap-2">
            <FormLabel>{label}</FormLabel>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setManageOpen(true)}>
              <Pencil className="h-3 w-3" />
              إدارة القرارات
            </Button>
          </div>

          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl overflow-hidden p-0 sm:w-full">
              <DialogHeader className="border-b px-4 py-4 text-right sm:px-6">
                <DialogTitle>إدارة قائمة القرارات</DialogTitle>
                <DialogDescription>
                  يمكنك البحث، التعديل، الحذف، وإعادة الترتيب اليدوي بسهولة حتى مع وجود عدد كبير من القرارات.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="ابحث داخل القرارات..."
                      className="pr-9"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[360px]">
                    <Input
                      value={newValue}
                      onChange={(event) => setNewValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAdd();
                        }
                      }}
                      placeholder="أضف قراراً جديداً..."
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAdd} disabled={!newValue.trim() || isBusy}>
                      <Plus className="h-4 w-4" />
                      إضافة قرار
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>إجمالي القرارات: {options.length}</span>
                  <span>المعروض حالياً: {filteredOptions.length}</span>
                </div>

                {isFiltering && (
                  <p className="text-xs text-muted-foreground">
                    لإعادة الترتيب اليدوي، امسح البحث أولاً حتى يظهر التسلسل الكامل للقرارات.
                  </p>
                )}
              </div>

              <ScrollArea className="h-[min(60vh,540px)] border-t px-4 py-4 sm:px-6">
                <div className="space-y-2">
                  {filteredOptions.map((option) => {
                    const absoluteIndex = options.findIndex((item) => item.id === option.id);
                    const isEditing = editingId === option.id;

                    return (
                      <div key={option.id} className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={editValue}
                              onChange={(event) => setEditValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleUpdate(option.id);
                                }
                              }}
                              className="flex-1"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={() => handleUpdate(option.id)} disabled={!editValue.trim() || isBusy}>
                                حفظ
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit}>
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex shrink-0 flex-col gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={absoluteIndex <= 0 || isFiltering || isBusy}
                                onClick={() => handleMove(option.id, "up")}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={absoluteIndex === options.length - 1 || isFiltering || isBusy}
                                onClick={() => handleMove(option.id, "down")}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 text-xs text-muted-foreground">الترتيب: {absoluteIndex + 1}</div>
                              <p className="whitespace-normal break-words text-sm leading-6">{option.option_value}</p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleStartEdit(option.id, option.option_value)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                disabled={isBusy}
                                onClick={() => handleDelete(option.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredOptions.length === 0 && (
                    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                      {options.length === 0 ? "لا توجد قرارات مسجلة حالياً." : "لا توجد نتائج مطابقة للبحث."}
                    </div>
                  )}
                </div>
              </ScrollArea>
          </DialogContent>
          </Dialog>

          <FormControl>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر القرار..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.option_value}>
                    <span className="whitespace-normal text-xs leading-relaxed">{option.option_value}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

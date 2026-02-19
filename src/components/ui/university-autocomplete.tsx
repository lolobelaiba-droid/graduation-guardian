import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManageUniversitiesDialog } from "@/components/ui/manage-universities-dialog";
import { useUniversityOptions } from "@/hooks/useUniversityOptions";
import { Check, ChevronDown } from "lucide-react";

interface UniversityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  className?: string;
}

export const UniversityAutocomplete: React.FC<UniversityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "اختر أو أدخل اسم الجامعة",
  dir = "rtl",
  className,
}) => {
  const { universityNames } = useUniversityOptions();
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync with external value
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Filter suggestions
  const filtered = React.useMemo(() => {
    if (!inputValue.trim()) return universityNames;
    const lower = inputValue.toLowerCase();
    return universityNames.filter(s => s.toLowerCase().includes(lower));
  }, [universityNames, inputValue]);

  // Click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (name: string) => {
    setInputValue(name);
    onChange(name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className={cn("flex gap-2", className)} ref={containerRef}>
      <div className="flex-1 relative">
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            dir={dir}
            className="pl-8"
            autoComplete="off"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            <ScrollArea className="max-h-[220px]">
              <div className="p-1">
                {filtered.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
                      highlightedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted hover:text-foreground",
                      value === name && "text-primary font-medium"
                    )}
                    onClick={() => handleSelect(name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="truncate flex-1" dir={dir}>
                      {name}
                    </span>
                    {value === name && (
                      <Check className="h-4 w-4 mr-auto shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {isOpen && filtered.length === 0 && inputValue.trim() && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md p-3">
            <p className="text-sm text-muted-foreground text-center">لا توجد نتائج مطابقة</p>
          </div>
        )}
      </div>

      <ManageUniversitiesDialog
        onSelect={handleSelect}
      />
    </div>
  );
};

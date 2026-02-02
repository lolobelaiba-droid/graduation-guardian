import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AcademicTitleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  dir?: "auto" | "ltr" | "rtl";
}

// الرتب العلمية المعروفة
const ACADEMIC_TITLES = [
  "أد", "د", "أ.د", "د.", "أ", "بروفيسور", 
  "Prof", "Dr", "Pr", "Prof.", "Dr.", "Pr."
];

const AcademicTitleInput = React.forwardRef<HTMLInputElement, AcademicTitleInputProps>(
  ({ value, onChange, suggestions = [], placeholder = "اكتب الرتبة ثم الاسم", className, dir = "auto", ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
      if (!value.trim()) return [];
      const lower = value.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower) && s !== value)
        .slice(0, 8);
    }, [suggestions, value]);

    // Handle click outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // التحقق من أن النص الحالي هو رتبة علمية فقط
    const isJustAcademicTitle = (text: string): boolean => {
      const trimmed = text.trim();
      return ACADEMIC_TITLES.some(
        title => trimmed === title || trimmed === title + " "
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        
        // إذا كان هناك اقتراح مميز، اخترها
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          onChange(filteredSuggestions[highlightedIndex]);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
        }
        
        // إذا كان المدخل رتبة علمية فقط، أضف مسافة ولا تنهي الإدخال
        if (isJustAcademicTitle(value)) {
          if (!value.endsWith(" ")) {
            onChange(value + " ");
          }
          return;
        }
        
        // في الحالات الأخرى، دع النموذج يتعامل مع الـ Enter
        setShowSuggestions(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (showSuggestions && filteredSuggestions.length > 0) {
          setHighlightedIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    };

    const handleSuggestionClick = (suggestion: string) => {
      onChange(suggestion);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <Input
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          dir={dir}
          className={cn(className)}
          {...props}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion}
                    className={cn(
                      "px-3 py-2 cursor-pointer rounded-sm text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === index && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-1">
          اكتب الرتبة (أد، د) ثم اضغط Enter لإضافة مسافة، ثم أكمل الاسم
        </p>
      </div>
    );
  }
);

AcademicTitleInput.displayName = "AcademicTitleInput";

export { AcademicTitleInput };

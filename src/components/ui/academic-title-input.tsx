import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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
  { label: "أد", value: "أد" },
  { label: "د", value: "د" },
  { label: "أ", value: "أ" },
  { label: "Prof", value: "Prof" },
  { label: "Dr", value: "Dr" },
  { label: "Pr", value: "Pr" },
];

const TITLE_VALUES = ACADEMIC_TITLES.map(t => t.value);

// استخراج الرتبة من النص
const extractTitleAndName = (text: string): { title: string | null; name: string } => {
  const trimmed = text.trim();
  // البحث عن الرتبة في بداية النص
  const titlePattern = /^(أد|د|أ|أ\.د|د\.|Prof\.|Dr\.|Pr\.|Prof|Dr|Pr)\s*/i;
  const match = trimmed.match(titlePattern);
  
  if (match) {
    return {
      title: match[1],
      name: trimmed.slice(match[0].length).trim()
    };
  }
  
  return { title: null, name: trimmed };
};

const AcademicTitleInput = React.forwardRef<HTMLInputElement, AcademicTitleInputProps>(
  ({ value, onChange, suggestions = [], placeholder = "اختر الرتبة ثم اكتب الاسم", className, dir = "auto", ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
    const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // تحليل القيمة الأولية
    React.useEffect(() => {
      if (value) {
        const { title, name } = extractTitleAndName(value);
        setSelectedTitle(title);
        setInputValue(name);
      } else {
        setSelectedTitle(null);
        setInputValue("");
      }
    }, []);

    // تحديث القيمة الأم
    const updateValue = React.useCallback((title: string | null, name: string) => {
      if (title && name) {
        onChange(`${title} ${name}`);
      } else if (title) {
        onChange(title);
      } else {
        onChange(name);
      }
    }, [onChange]);

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
      const searchText = selectedTitle ? `${selectedTitle} ${inputValue}` : inputValue;
      if (!searchText.trim()) return [];
      const lower = searchText.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower) && s !== value)
        .slice(0, 8);
    }, [suggestions, inputValue, selectedTitle, value]);

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

    // اختيار رتبة
    const selectTitle = (title: string) => {
      setSelectedTitle(title);
      updateValue(title, inputValue);
      inputRef.current?.focus();
    };

    // إزالة الرتبة
    const removeTitle = () => {
      setSelectedTitle(null);
      updateValue(null, inputValue);
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          const { title, name } = extractTitleAndName(filteredSuggestions[highlightedIndex]);
          setSelectedTitle(title);
          setInputValue(name);
          onChange(filteredSuggestions[highlightedIndex]);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
        }
        
        // إذا كتب المستخدم رتبة في حقل الإدخال
        const trimmedInput = inputValue.trim().toLowerCase();
        const matchedTitle = TITLE_VALUES.find(t => t.toLowerCase() === trimmedInput);
        if (matchedTitle && !selectedTitle) {
          setSelectedTitle(matchedTitle);
          setInputValue("");
          updateValue(matchedTitle, "");
          return;
        }
        
        setShowSuggestions(false);
      } else if (e.key === "Backspace" && !inputValue && selectedTitle) {
        // حذف الرتبة عند الضغط على Backspace في حقل فارغ
        removeTitle();
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
      const newValue = e.target.value;
      setInputValue(newValue);
      updateValue(selectedTitle, newValue);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    };

    const handleSuggestionClick = (suggestion: string) => {
      const { title, name } = extractTitleAndName(suggestion);
      setSelectedTitle(title);
      setInputValue(name);
      onChange(suggestion);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div 
          className={cn(
            "flex items-center gap-1.5 p-2 min-h-[42px] rounded-md border border-input bg-background",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            className
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* الرتبة المختارة */}
          {selectedTitle && (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-1 text-sm shrink-0"
            >
              {selectedTitle}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTitle();
                }}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {/* حقل الإدخال */}
          <Input
            ref={(node) => {
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={selectedTitle ? "اكتب الاسم واللقب..." : placeholder}
            dir={dir}
            className="flex-1 border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
            {...props}
          />
        </div>

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

        {/* Academic titles badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs text-muted-foreground ml-1">الرتبة:</span>
          {ACADEMIC_TITLES.map((title) => (
            <Badge
              key={title.label}
              variant={selectedTitle === title.value ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors text-xs px-2 py-0.5",
                selectedTitle === title.value 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={() => selectTitle(title.value)}
            >
              {title.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  }
);

AcademicTitleInput.displayName = "AcademicTitleInput";

export { AcademicTitleInput };

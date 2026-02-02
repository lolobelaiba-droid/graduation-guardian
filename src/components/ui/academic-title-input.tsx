import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Settings } from "lucide-react";
import { useAcademicTitles } from "@/hooks/useAcademicTitles";
import { ManageAcademicTitlesDialog } from "@/components/ui/manage-academic-titles-dialog";

interface AcademicTitleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  dir?: "auto" | "ltr" | "rtl";
}

// تنسيق مع الرتبة
const formatWithTitle = (title: string | null, name: string): string => {
  if (title && name) {
    return `${title} ${name}`;
  } else if (title) {
    return title;
  }
  return name;
};

const AcademicTitleInput = React.forwardRef<HTMLInputElement, AcademicTitleInputProps>(
  ({ value, onChange, suggestions = [], placeholder = "اختر الرتبة ثم اكتب الاسم واضغط Enter", className, dir = "auto", ...props }, ref) => {
    const { titles, isLoading } = useAcademicTitles();
    const abbreviations = React.useMemo(() => titles.map(t => t.abbreviation), [titles]);
    
    const [inputValue, setInputValue] = React.useState("");
    const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
    const [confirmedEntry, setConfirmedEntry] = React.useState<{ title: string | null; name: string } | null>(null);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // استخراج الرتبة من النص ديناميكياً
    const extractTitleAndName = React.useCallback((text: string): { title: string | null; name: string } => {
      const trimmed = text.trim();
      
      // إنشاء نمط regex ديناميكي من الاختصارات
      if (abbreviations.length === 0) {
        return { title: null, name: trimmed };
      }
      
      const escapedAbbrs = abbreviations.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = new RegExp(`^(${escapedAbbrs.join('|')})\\.?\\s*`, 'i');
      const match = trimmed.match(pattern);
      
      if (match) {
        return {
          title: match[1],
          name: trimmed.slice(match[0].length).trim()
        };
      }
      
      return { title: null, name: trimmed };
    }, [abbreviations]);

    // تحليل القيمة الأولية
    React.useEffect(() => {
      if (value && abbreviations.length > 0) {
        const { title, name } = extractTitleAndName(value);
        if (name) {
          setConfirmedEntry({ title, name });
          setSelectedTitle(null);
          setInputValue("");
        } else if (title) {
          setSelectedTitle(title);
          setConfirmedEntry(null);
          setInputValue("");
        }
      } else if (!value) {
        setConfirmedEntry(null);
        setSelectedTitle(null);
        setInputValue("");
      }
    }, [abbreviations.length]);

    // تحديث القيمة الأم
    const updateValue = React.useCallback((entry: { title: string | null; name: string } | null) => {
      if (entry && entry.name) {
        onChange(formatWithTitle(entry.title, entry.name));
      } else {
        onChange("");
      }
    }, [onChange]);

    // Filter suggestions based on input (only name, not title)
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return [];
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => {
          const { name } = extractTitleAndName(s);
          return name.toLowerCase().includes(lower) && s !== value;
        })
        .slice(0, 8);
    }, [suggestions, inputValue, value, extractTitleAndName]);

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
      if (confirmedEntry) {
        const newEntry = { ...confirmedEntry, title };
        setConfirmedEntry(newEntry);
        updateValue(newEntry);
      } else {
        setSelectedTitle(title);
      }
      inputRef.current?.focus();
    };

    // إزالة الرتبة المختارة
    const removeSelectedTitle = () => {
      setSelectedTitle(null);
      inputRef.current?.focus();
    };

    // تأكيد الإدخال
    const confirmEntry = (title: string | null, name: string) => {
      if (name.trim()) {
        const entry = { title, name: name.trim() };
        setConfirmedEntry(entry);
        setSelectedTitle(null);
        setInputValue("");
        updateValue(entry);
      }
    };

    // إزالة الإدخال المؤكد
    const removeConfirmedEntry = () => {
      setConfirmedEntry(null);
      onChange("");
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          const { name } = extractTitleAndName(filteredSuggestions[highlightedIndex]);
          const titleToUse = selectedTitle || extractTitleAndName(filteredSuggestions[highlightedIndex]).title;
          confirmEntry(titleToUse, name);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
        }
        
        // إذا كتب المستخدم رتبة في حقل الإدخال
        const trimmedInput = inputValue.trim().toLowerCase();
        const matchedTitle = abbreviations.find(a => a.toLowerCase() === trimmedInput);
        if (matchedTitle && !selectedTitle) {
          setSelectedTitle(matchedTitle);
          setInputValue("");
          return;
        }
        
        // إذا كان هناك رتبة مختارة واسم
        if (selectedTitle && inputValue.trim()) {
          confirmEntry(selectedTitle, inputValue.trim());
          return;
        }
        
        // إذا كان هناك اسم بدون رتبة
        if (inputValue.trim()) {
          confirmEntry(null, inputValue.trim());
        }
        
        setShowSuggestions(false);
      } else if (e.key === "Backspace") {
        if (!inputValue && selectedTitle) {
          removeSelectedTitle();
        } else if (!inputValue && !selectedTitle && confirmedEntry) {
          setSelectedTitle(confirmedEntry.title);
          setInputValue(confirmedEntry.name);
          setConfirmedEntry(null);
          onChange("");
        }
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
      setInputValue(e.target.value);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    };

    const handleSuggestionClick = (suggestion: string) => {
      const { name } = extractTitleAndName(suggestion);
      const titleToUse = selectedTitle || extractTitleAndName(suggestion).title;
      confirmEntry(titleToUse, name);
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
          {/* الإدخال المؤكد */}
          {confirmedEntry && (
            <div className="flex items-center gap-0 bg-muted rounded-md overflow-hidden border border-border">
              {confirmedEntry.title && (
                <span className="bg-blue-600 text-white px-2 py-1 text-sm font-medium">
                  {confirmedEntry.title}
                </span>
              )}
              <span className="px-2 py-1 text-sm text-foreground bg-amber-100 dark:bg-amber-900/30">
                {confirmedEntry.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConfirmedEntry();
                }}
                className="hover:bg-destructive/20 rounded-full p-0.5 mx-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* الرتبة المختارة */}
          {!confirmedEntry && selectedTitle && (
            <Badge className="gap-1 px-2 py-1 text-sm shrink-0 bg-blue-600 text-white hover:bg-blue-700">
              {selectedTitle}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSelectedTitle();
                }}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {/* حقل الإدخال */}
          {!confirmedEntry && (
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
              placeholder={selectedTitle ? "اكتب الاسم واللقب ثم Enter..." : placeholder}
              dir={dir}
              className="flex-1 border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
              {...props}
            />
          )}

          {/* حقل للتعديل */}
          {confirmedEntry && (
            <Input
              ref={(node) => {
                if (typeof ref === 'function') {
                  ref(node);
                } else if (ref) {
                  ref.current = node;
                }
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
              }}
              value=""
              onFocus={() => {
                setSelectedTitle(confirmedEntry.title);
                setInputValue(confirmedEntry.name);
                setConfirmedEntry(null);
                onChange("");
              }}
              placeholder="اضغط للتعديل..."
              dir={dir}
              className="flex-1 border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0 opacity-50"
              {...props}
            />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && !confirmedEntry && (
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
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-xs text-muted-foreground ml-1">الرتبة:</span>
          {isLoading ? (
            <span className="text-xs text-muted-foreground">جاري التحميل...</span>
          ) : (
            <>
              {titles.map((title) => (
                <Badge
                  key={title.id}
                  variant={selectedTitle === title.abbreviation || confirmedEntry?.title === title.abbreviation ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors text-xs px-2 py-0.5",
                    (selectedTitle === title.abbreviation || confirmedEntry?.title === title.abbreviation)
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-blue-600 hover:text-white"
                  )}
                  onClick={() => selectTitle(title.abbreviation)}
                  title={title.full_name}
                >
                  {title.abbreviation}
                </Badge>
              ))}
              <ManageAcademicTitlesDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:text-primary transition-colors"
                    title="إدارة الرتب العلمية"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                }
              />
            </>
          )}
        </div>
      </div>
    );
  }
);

AcademicTitleInput.displayName = "AcademicTitleInput";

export { AcademicTitleInput };

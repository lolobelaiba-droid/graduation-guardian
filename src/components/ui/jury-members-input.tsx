import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JuryMembersInputProps {
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

// تنسيق العضو مع الرتبة
const formatMember = (title: string | null, name: string): string => {
  if (title && name) {
    return `${title} ${name}`;
  } else if (title) {
    return title;
  }
  return name;
};

// مكون لعرض عضو واحد مع فصل الرتبة
interface MemberBadgeProps {
  member: string;
  onRemove: () => void;
}

const MemberBadge: React.FC<MemberBadgeProps> = ({ member, onRemove }) => {
  const { title, name } = extractTitleAndName(member);
  
  return (
    <div className="flex items-center gap-0 bg-muted rounded-md overflow-hidden border border-border">
      {title && (
        <span className="bg-blue-600 text-white px-2 py-1 text-sm font-medium">
          {title}
        </span>
      )}
      <span className="px-2 py-1 text-sm text-foreground bg-amber-100 dark:bg-amber-900/30">
        {name || (title ? "" : member)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:bg-destructive/20 rounded-full p-0.5 mx-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

const JuryMembersInput = React.forwardRef<HTMLInputElement, JuryMembersInputProps>(
  ({ value, onChange, suggestions = [], placeholder = "اختر الرتبة ثم اكتب الاسم واضغط Enter", className, dir = "auto" }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
    const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
    const [members, setMembers] = React.useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Parse initial value into members array
    React.useEffect(() => {
      if (value) {
        const parsed = value.split(/[،,]/).map(m => m.trim()).filter(Boolean);
        setMembers(parsed);
      } else {
        setMembers([]);
      }
    }, []);

    // Update parent value when members change
    const updateValue = React.useCallback((newMembers: string[]) => {
      const newValue = newMembers.join("، ");
      onChange(newValue);
    }, [onChange]);

    // Filter suggestions based on input (only name, not title)
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return [];
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => {
          // استخراج الاسم من الاقتراح للمقارنة
          const { name } = extractTitleAndName(s);
          return name.toLowerCase().includes(lower) && !members.includes(s);
        })
        .slice(0, 8);
    }, [suggestions, inputValue, members]);

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
      inputRef.current?.focus();
    };

    // إزالة الرتبة المختارة
    const removeSelectedTitle = () => {
      setSelectedTitle(null);
      inputRef.current?.focus();
    };

    // إضافة عضو
    const addMember = (memberName: string) => {
      const trimmed = memberName.trim();
      if (trimmed && !members.includes(trimmed)) {
        const newMembers = [...members, trimmed];
        setMembers(newMembers);
        updateValue(newMembers);
      }
      setInputValue("");
      setSelectedTitle(null);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    };

    const removeMember = (index: number) => {
      const newMembers = members.filter((_, i) => i !== index);
      setMembers(newMembers);
      updateValue(newMembers);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          const { name } = extractTitleAndName(filteredSuggestions[highlightedIndex]);
          // استخدم الرتبة المختارة من المستخدم إذا وجدت، وإلا استخدم الرتبة من الاقتراح
          const titleToUse = selectedTitle || extractTitleAndName(filteredSuggestions[highlightedIndex]).title;
          addMember(formatMember(titleToUse, name));
          return;
        }
        
        // إذا كتب المستخدم رتبة في حقل الإدخال
        const trimmedInput = inputValue.trim().toLowerCase();
        const matchedTitle = TITLE_VALUES.find(t => t.toLowerCase() === trimmedInput);
        if (matchedTitle && !selectedTitle) {
          setSelectedTitle(matchedTitle);
          setInputValue("");
          return;
        }
        
        // إذا كان هناك رتبة مختارة واسم
        if (selectedTitle && inputValue.trim()) {
          addMember(formatMember(selectedTitle, inputValue.trim()));
          return;
        }
        
        // إذا كان هناك اسم بدون رتبة
        if (inputValue.trim()) {
          addMember(inputValue.trim());
        }
      } else if (e.key === "Backspace") {
        if (!inputValue && selectedTitle) {
          removeSelectedTitle();
        } else if (!inputValue && !selectedTitle && members.length > 0) {
          removeMember(members.length - 1);
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
      // استخدم الرتبة المختارة من المستخدم إذا وجدت، وإلا استخدم الرتبة من الاقتراح
      const titleToUse = selectedTitle || extractTitleAndName(suggestion).title;
      addMember(formatMember(titleToUse, name));
      inputRef.current?.focus();
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div 
          className={cn(
            "flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-md border border-input bg-background",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            className
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* الأعضاء المضافون */}
          {members.map((member, index) => (
            <MemberBadge
              key={index}
              member={member}
              onRemove={() => removeMember(index)}
            />
          ))}
          
          {/* الرتبة المختارة للعضو الجديد */}
          {selectedTitle && (
            <Badge
              className="gap-1 px-2 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
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
            placeholder={
              selectedTitle 
                ? "اكتب الاسم واللقب ثم Enter..." 
                : members.length === 0 
                  ? placeholder 
                  : "أضف عضو آخر..."
            }
            dir={dir}
            className="flex-1 min-w-[150px] border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
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

JuryMembersInput.displayName = "JuryMembersInput";

export { JuryMembersInput };

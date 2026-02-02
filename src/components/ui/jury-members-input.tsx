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

const ACADEMIC_TITLES = ["أد", "د", "أ.د", "د.", "أ", "بروفيسور", "Prof", "Dr", "Pr"];

const JuryMembersInput = React.forwardRef<HTMLInputElement, JuryMembersInputProps>(
  ({ value, onChange, suggestions = [], placeholder = "اكتب الرتبة ثم الاسم واضغط Enter", className, dir = "auto" }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
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

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return [];
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower) && !members.includes(s))
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

    const addMember = (memberName: string) => {
      const trimmed = memberName.trim();
      if (trimmed && !members.includes(trimmed)) {
        const newMembers = [...members, trimmed];
        setMembers(newMembers);
        updateValue(newMembers);
      }
      setInputValue("");
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
          addMember(filteredSuggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          // Check if input is just an academic title
          const isJustTitle = ACADEMIC_TITLES.some(
            title => inputValue.trim() === title || inputValue.trim() === title + " "
          );
          
          if (isJustTitle) {
            // Don't add yet, just add a space if not already there
            if (!inputValue.endsWith(" ")) {
              setInputValue(inputValue + " ");
            }
          } else {
            // Full entry, add it
            addMember(inputValue);
          }
        }
      } else if (e.key === "Backspace" && !inputValue && members.length > 0) {
        // Remove last member when backspace on empty input
        removeMember(members.length - 1);
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
      addMember(suggestion);
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
          {members.map((member, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="gap-1 px-2 py-1 text-sm"
            >
              {member}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMember(index);
                }}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
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
            placeholder={members.length === 0 ? placeholder : "أضف عضو آخر..."}
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

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-1">
          اكتب الرتبة (أد، د) ثم الاسم واضغط Enter لإضافة كل عضو
        </p>
      </div>
    );
  }
);

JuryMembersInput.displayName = "JuryMembersInput";

export { JuryMembersInput };

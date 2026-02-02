import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange?: (value: string) => void;
  emptyMessage?: string;
}

const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ className, suggestions, onValueChange, value, onChange, emptyMessage = "لا توجد اقتراحات", ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value?.toString() || "");
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Sync input value with prop
    React.useEffect(() => {
      setInputValue(value?.toString() || "");
    }, [value]);

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return suggestions.slice(0, 10);
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower))
        .slice(0, 10);
    }, [suggestions, inputValue]);

    // Handle click outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsOpen(true);
      setHighlightedIndex(-1);
      
      onChange?.(e);
      onValueChange?.(newValue);
    };

    const handleSelect = (suggestion: string) => {
      setInputValue(suggestion);
      setIsOpen(false);
      
      // Create a synthetic event for onChange
      const syntheticEvent = {
        target: { value: suggestion },
        currentTarget: { value: suggestion },
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange?.(syntheticEvent);
      onValueChange?.(suggestion);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          setHighlightedIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
            handleSelect(filteredSuggestions[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    const handleFocus = () => {
      if (suggestions.length > 0) {
        setIsOpen(true);
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <Input
          ref={(node) => {
            // Handle both refs
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          className={cn(className)}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          autoComplete="off"
          {...props}
        />
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
            <ScrollArea className="max-h-[200px]">
              {filteredSuggestions.length > 0 ? (
                <div className="p-1">
                  {filteredSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={cn(
                        "px-3 py-2 cursor-pointer rounded-sm text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        highlightedIndex === index && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleSelect(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              ) : inputValue.trim() ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : null}
            </ScrollArea>
          </div>
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };

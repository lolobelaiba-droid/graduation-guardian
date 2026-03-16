import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Calculate dropdown position relative to viewport
    const updateDropdownPosition = React.useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 220; // max-h approximate
      const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      
      setDropdownStyle({
        position: 'fixed',
        width: rect.width,
        left: rect.left,
        top: openAbove ? undefined : rect.bottom + 2,
        bottom: openAbove ? window.innerHeight - rect.top + 2 : undefined,
        zIndex: 9999,
      });
    }, []);

    // Keep position updated continuously while open
    React.useEffect(() => {
      if (!isOpen) return;
      
      updateDropdownPosition();
      
      // Listen to scroll on all ancestors (capture phase) and window resize
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      
      // Use RAF loop to handle smooth repositioning during scroll/resize
      let rafId: number;
      const tick = () => {
        updateDropdownPosition();
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
        cancelAnimationFrame(rafId);
      };
    }, [isOpen, updateDropdownPosition]);

    React.useEffect(() => {
      setInputValue(value?.toString() || "");
    }, [value]);

    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return suggestions.slice(0, 10);
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower))
        .slice(0, 10);
    }, [suggestions, inputValue]);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current && !containerRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollToIndex = (index: number) => {
      requestAnimationFrame(() => {
        listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
      });
    };

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
          setHighlightedIndex(prev => {
            const next = prev < filteredSuggestions.length - 1 ? prev + 1 : prev;
            scrollToIndex(next);
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev => {
            const next = prev > 0 ? prev - 1 : -1;
            if (next >= 0) scrollToIndex(next);
            return next;
          });
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
        
        {isOpen && createPortal(
          <div ref={dropdownRef} style={dropdownStyle} className="bg-popover border border-border rounded-md shadow-lg animate-in fade-in-0 zoom-in-95">
            <div ref={listRef} className="max-h-[200px] overflow-y-auto">
              {filteredSuggestions.length > 0 ? (
                <div className="p-1">
                  {filteredSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      data-index={index}
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
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };

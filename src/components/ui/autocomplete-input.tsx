import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setInputValue(value?.toString() || "");
    }, [value]);

    const filteredSuggestions = React.useMemo(() => {
      if (!inputValue.trim()) return suggestions;
      const lower = inputValue.toLowerCase();
      return suggestions
        .filter(s => s.toLowerCase().includes(lower));
    }, [suggestions, inputValue]);

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
      <Popover open={isOpen && (filteredSuggestions.length > 0 || !!inputValue.trim())} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
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
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // Don't close if clicking inside the input
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          <div ref={listRef} className="max-h-[250px] overflow-y-auto">
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
        </PopoverContent>
      </Popover>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };

import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

/**
 * Custom date input that displays dates in dd/mm/yyyy format
 * while storing values in yyyy-mm-dd (ISO) format for form compatibility.
 */

interface DateInputProps {
  value: string; // ISO format: yyyy-mm-dd
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function toDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toISO(display: string): string {
  const parts = display.split("/");
  if (parts.length !== 3) return display;
  const [dd, mm, yyyy] = parts;
  if (dd.length === 2 && mm.length === 2 && yyyy.length === 4) {
    return `${yyyy}-${mm}-${dd}`;
  }
  return display;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, placeholder = "dd/mm/yyyy", disabled }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(toDisplay(value));
    const hiddenRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setDisplayValue(toDisplay(value));
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/[^\d/]/g, "");

      // Auto-insert slashes
      const digits = input.replace(/\//g, "");
      if (digits.length <= 2) {
        input = digits;
      } else if (digits.length <= 4) {
        input = digits.slice(0, 2) + "/" + digits.slice(2);
      } else {
        input = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
      }

      setDisplayValue(input);

      // Only emit change when we have a complete date
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
        const iso = toISO(input);
        // Validate the date is real
        const date = new Date(iso);
        if (!isNaN(date.getTime())) {
          onChange(iso);
        }
      } else if (input === "") {
        onChange("");
      }
    };

    const handleCalendarClick = () => {
      hiddenRef.current?.showPicker?.();
    };

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const iso = e.target.value;
      onChange(iso);
      setDisplayValue(toDisplay(iso));
    };

    return (
      <div className="relative" dir="ltr">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          dir="ltr"
          maxLength={10}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-left",
            className,
          )}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          disabled={disabled}
          className="absolute right-auto left-0 top-0 h-full px-2.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={handleNativeChange}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };

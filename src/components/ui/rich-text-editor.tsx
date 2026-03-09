/**
 * RichTextEditor - A simple rich text editor for thesis titles
 * Supports bold, italic formatting and special symbol insertion
 * Stores content as HTML string
 * 
 * Direction is determined dynamically: Arabic → RTL, Latin → LTR
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { Bold, Italic, Omega } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Scientific symbols organized by category
const SYMBOL_CATEGORIES = [
  {
    label: "يونانية",
    symbols: ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Λ", "Μ", "Ξ", "Π", "Σ", "Φ", "Ψ", "Ω"],
  },
  {
    label: "رياضية",
    symbols: ["±", "×", "÷", "≠", "≤", "≥", "≈", "∞", "√", "∑", "∏", "∫", "∂", "∇", "∈", "∉", "∩", "∪", "⊂", "⊃", "∅", "∀", "∃", "¬", "∧", "∨"],
  },
  {
    label: "أرقام",
    symbols: ["²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁰", "¹", "₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"],
  },
  {
    label: "أخرى",
    symbols: ["°", "‰", "†", "‡", "•", "→", "←", "↑", "↓", "↔", "⇒", "⇐", "©", "®", "™", "µ"],
  },
];

// Detect text direction from first strong directional character
function detectDirection(html: string): "rtl" | "ltr" {
  const plain = html.replace(/<[^>]+>/g, "").trim();
  if (!plain) return "rtl"; // default RTL for Arabic UI
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const ltrRegex = /[A-Za-z\u00C0-\u024F]/;
  for (const char of plain) {
    if (rtlRegex.test(char)) return "rtl";
    if (ltrRegex.test(char)) return "ltr";
  }
  return "rtl";
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: string;
  rows?: number;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  dir = "auto",
  rows = 2,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const isInternalChange = useRef(false);
  const [effectiveDir, setEffectiveDir] = useState<"rtl" | "ltr">(() =>
    dir === "auto" ? detectDirection(value) : (dir === "ltr" ? "ltr" : "rtl")
  );

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g., form reset)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      if (currentHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    if (dir === "auto") {
      setEffectiveDir(detectDirection(value));
    }
  }, [value, dir]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML;
    // Normalize: if only <br> or empty tags, treat as empty
    const cleaned = html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]+>/g, "").trim();
    const newValue = cleaned ? html : "";
    
    // Update direction dynamically
    if (dir === "auto") {
      setEffectiveDir(detectDirection(newValue));
    }
    
    isInternalChange.current = true;
    onChange(newValue);
  }, [onChange, dir]);

  const execCommand = useCallback((command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleInput();
  }, [handleInput]);

  const insertSymbol = useCallback((symbol: string) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, symbol);
    handleInput();
    setSymbolsOpen(false);
  }, [handleInput]);

  const isFormatActive = useCallback((command: string): boolean => {
    return document.queryCommandState(command);
  }, []);

  const minHeight = Math.max(rows * 1.5, 3);

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-input px-2 py-1 bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => execCommand("bold")}
          title="عريض (Bold)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => execCommand("italic")}
          title="مائل (Italic)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Popover open={symbolsOpen} onOpenChange={setSymbolsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              title="إدراج رمز"
            >
              <Omega className="h-3.5 w-3.5" />
              <span className="text-[10px]">رموز</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {SYMBOL_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-0.5">
                    {cat.symbols.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        className="w-7 h-7 text-sm rounded hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                        onClick={() => insertSymbol(sym)}
                        title={sym}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editable area - NO dangerouslySetInnerHTML to avoid React bidi interference */}
      <div
        ref={editorRef}
        contentEditable
        dir={effectiveDir}
        className="px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-b-md"
        style={{
          minHeight: `${minHeight}rem`,
          lineHeight: "1.6",
          direction: effectiveDir,
          textAlign: effectiveDir === "rtl" ? "right" : "left",
        }}
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

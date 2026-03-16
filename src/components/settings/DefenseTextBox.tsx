import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical, Settings2, Trash2, X } from "lucide-react";

export interface TextBoxData {
  id: string;
  content: string;
  x: number; // mm from left edge of page
  y: number; // mm from top edge of page
  width: number; // mm
  minHeight: number; // mm
  borderWidth: number;
  borderColor: string;
  padding: number; // px
  bgColor: string;
  fontSize: number; // px
  fontFamily: string;
  textAlign: "right" | "center" | "left";
}

export const DEFAULT_TEXT_BOX: Omit<TextBoxData, "id"> = {
  content: "",
  x: 40,
  y: 60,
  width: 60,
  minHeight: 25,
  borderWidth: 1,
  borderColor: "#333333",
  padding: 8,
  bgColor: "#ffffff",
  fontSize: 14,
  fontFamily: "IBM Plex Sans Arabic",
  textAlign: "right",
};

interface DefenseTextBoxProps {
  data: TextBoxData;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  onChange: (data: TextBoxData) => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  readOnly?: boolean;
}

export function DefenseTextBox({
  data,
  containerRef,
  selected,
  onSelect,
  onChange,
  onDelete,
  onOpenSettings,
  readOnly = false,
}: DefenseTextBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const getMmPerPx = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 0.264583, y: 0.264583 }; // fallback 96dpi
    const rect = container.getBoundingClientRect();
    // Container is 210mm wide
    return { x: 210 / rect.width, y: 297 / rect.height };
  }, [containerRef]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: data.x,
      boxY: data.y,
    };
  }, [data.x, data.y, onSelect, readOnly]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const mm = getMmPerPx();
      const dx = (e.clientX - dragStartRef.current.mouseX) * mm.x;
      const dy = (e.clientY - dragStartRef.current.mouseY) * mm.y;
      onChange({
        ...data,
        x: Math.max(0, Math.min(210 - data.width, dragStartRef.current.boxX + dx)),
        y: Math.max(0, Math.min(280, dragStartRef.current.boxY + dy)),
      });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, data, onChange, getMmPerPx]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: data.width,
      height: data.minHeight,
    };
  }, [data.width, data.minHeight, readOnly]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const mm = getMmPerPx();
      const dx = (e.clientX - resizeStartRef.current.mouseX) * mm.x;
      const dy = (e.clientY - resizeStartRef.current.mouseY) * mm.y;
      onChange({
        ...data,
        width: Math.max(15, Math.min(210 - data.x, resizeStartRef.current.width + dx)),
        minHeight: Math.max(10, resizeStartRef.current.height + dy),
      });
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing, data, onChange, getMmPerPx]);

  const handleContentChange = useCallback(() => {
    if (readOnly) return;
    const el = boxRef.current?.querySelector(".text-box-content") as HTMLDivElement;
    if (el) {
      onChange({ ...data, content: el.innerHTML });
    }
  }, [data, onChange, readOnly]);

  return (
    <div
      ref={boxRef}
      className="defense-text-box-wrapper"
      style={{
        position: "absolute",
        left: `${data.x}mm`,
        top: `${data.y}mm`,
        width: `${data.width}mm`,
        minHeight: `${data.minHeight}mm`,
        zIndex: selected ? 20 : 10,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Selection outline */}
      {selected && !readOnly && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            border: "2px dashed hsl(var(--primary))",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Drag handle bar */}
      {selected && !readOnly && (
        <div
          onMouseDown={handleDragStart}
          style={{
            position: "absolute",
            top: -24,
            right: 0,
            left: 0,
            height: 22,
            background: "hsl(var(--primary))",
            borderRadius: "4px 4px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
            cursor: "grab",
            direction: "ltr",
          }}
        >
          <div className="flex items-center gap-0.5">
            <GripVertical className="h-3.5 w-3.5 text-primary-foreground rotate-90" />
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              className="p-0.5 rounded hover:bg-primary-foreground/20 transition-colors"
              title="إعدادات"
            >
              <Settings2 className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-0.5 rounded hover:bg-destructive/80 transition-colors"
              title="حذف"
            >
              <Trash2 className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div
        className="text-box-content"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        style={{
          width: "100%",
          minHeight: `${data.minHeight}mm`,
          border: `${data.borderWidth}px solid ${data.borderColor}`,
          padding: `${data.padding}px`,
          background: data.bgColor,
          fontSize: `${data.fontSize}px`,
          fontFamily: data.fontFamily,
          textAlign: data.textAlign,
          direction: "rtl",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.6,
          wordBreak: "break-word",
        }}
        onInput={handleContentChange}
        dangerouslySetInnerHTML={readOnly ? { __html: data.content } : undefined}
        ref={(el) => {
          if (el && !readOnly && !el.innerHTML && data.content) {
            el.innerHTML = data.content;
          }
        }}
      />

      {/* Resize handle (bottom-left for RTL) */}
      {selected && !readOnly && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: "absolute",
            bottom: -4,
            left: -4,
            width: 10,
            height: 10,
            background: "hsl(var(--primary))",
            borderRadius: 2,
            cursor: "nwse-resize",
            border: "1px solid hsl(var(--primary-foreground))",
          }}
        />
      )}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";

interface EditorRulerProps {
  /** Total page width in mm (default A4 = 210) */
  pageWidthMm?: number;
  /** Right margin in mm */
  marginRight: number;
  /** Left margin in mm */
  marginLeft: number;
  /** First-line indent in mm (optional) */
  firstLineIndent?: number;
  /** Hanging indent in mm (optional) */
  hangingIndent?: number;
  onMarginRightChange?: (val: number) => void;
  onMarginLeftChange?: (val: number) => void;
  onFirstLineIndentChange?: (val: number) => void;
  onHangingIndentChange?: (val: number) => void;
  /** Direction: rtl for Arabic */
  dir?: "rtl" | "ltr";
}

type DragTarget =
  | "margin-right"
  | "margin-left"
  | "first-line-indent"
  | "hanging-indent"
  | null;

/**
 * Word-like horizontal ruler with draggable margin markers.
 * Displays centimeter (cm) ticks on a light ruler background.
 */
export default function EditorRuler({
  pageWidthMm = 210,
  marginRight,
  marginLeft,
  firstLineIndent = 0,
  hangingIndent = 0,
  onMarginRightChange,
  onMarginLeftChange,
  onFirstLineIndentChange,
  onHangingIndentChange,
  dir = "rtl",
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  // Convert mm position to pixel position on the ruler
  const mmToPx = useCallback(
    (mm: number) => {
      if (!rulerRef.current) return 0;
      const rulerWidth = rulerRef.current.offsetWidth;
      return (mm / pageWidthMm) * rulerWidth;
    },
    [pageWidthMm]
  );

  // Convert pixel delta to mm delta
  const pxToMm = useCallback(
    (px: number) => {
      if (!rulerRef.current) return 0;
      const rulerWidth = rulerRef.current.offsetWidth;
      return (px / rulerWidth) * pageWidthMm;
    },
    [pageWidthMm]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, target: DragTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setDragTarget(target);
      dragStartX.current = e.clientX;

      switch (target) {
        case "margin-right":
          dragStartValue.current = marginRight;
          break;
        case "margin-left":
          dragStartValue.current = marginLeft;
          break;
        case "first-line-indent":
          dragStartValue.current = firstLineIndent;
          break;
        case "hanging-indent":
          dragStartValue.current = hangingIndent;
          break;
      }
    },
    [marginRight, marginLeft, firstLineIndent, hangingIndent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragTarget) return;

      let deltaPx = e.clientX - dragStartX.current;
      // In RTL, dragging right means decreasing margin-right
      const isRtl = dir === "rtl";

      const deltaMm = pxToMm(deltaPx);
      let newValue: number;

      switch (dragTarget) {
        case "margin-right":
          // RTL: right margin is on the right side. Drag right = decrease, drag left = increase
          newValue = isRtl
            ? dragStartValue.current - deltaMm
            : dragStartValue.current + deltaMm;
          newValue = Math.max(0, Math.min(pageWidthMm - marginLeft - 20, Math.round(newValue)));
          onMarginRightChange?.(newValue);
          break;
        case "margin-left":
          // RTL: left margin is on the left side. Drag left = decrease, drag right = increase
          newValue = isRtl
            ? dragStartValue.current + deltaMm
            : dragStartValue.current - deltaMm;
          newValue = Math.max(0, Math.min(pageWidthMm - marginRight - 20, Math.round(newValue)));
          onMarginLeftChange?.(newValue);
          break;
        case "first-line-indent":
          newValue = isRtl
            ? dragStartValue.current - deltaMm
            : dragStartValue.current + deltaMm;
          newValue = Math.max(0, Math.min(80, Math.round(newValue)));
          onFirstLineIndentChange?.(newValue);
          break;
        case "hanging-indent":
          newValue = isRtl
            ? dragStartValue.current - deltaMm
            : dragStartValue.current + deltaMm;
          newValue = Math.max(0, Math.min(80, Math.round(newValue)));
          onHangingIndentChange?.(newValue);
          break;
      }
    },
    [dragTarget, dir, pxToMm, pageWidthMm, marginRight, marginLeft, onMarginRightChange, onMarginLeftChange, onFirstLineIndentChange, onHangingIndentChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  useEffect(() => {
    if (dragTarget) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragTarget, handleMouseMove, handleMouseUp]);

  // Total cm marks
  const totalCm = pageWidthMm / 10;

  // Generate tick marks
  const ticks: { position: number; type: "cm" | "half" | "quarter"; label?: string }[] = [];
  for (let cm = 0; cm <= totalCm; cm++) {
    ticks.push({ position: cm * 10, type: "cm", label: cm > 0 ? `${cm}` : undefined });
    if (cm < totalCm) {
      // Quarter marks
      ticks.push({ position: cm * 10 + 2.5, type: "quarter" });
      ticks.push({ position: cm * 10 + 5, type: "half" });
      ticks.push({ position: cm * 10 + 7.5, type: "quarter" });
    }
  }

  const isRtl = dir === "rtl";

  // Calculate positions as percentages
  const rightMarginPct = (marginRight / pageWidthMm) * 100;
  const leftMarginPct = (marginLeft / pageWidthMm) * 100;

  return (
    <div className="select-none" style={{ direction: "ltr" }}>
      {/* Ruler bar */}
      <div
        ref={rulerRef}
        className="relative h-7 border border-border/60 rounded-sm overflow-visible"
        style={{
          background: "linear-gradient(180deg, hsl(var(--muted) / 0.6) 0%, hsl(var(--muted) / 0.3) 100%)",
          cursor: dragTarget ? "col-resize" : "default",
        }}
      >
        {/* Gray margin zones */}
        {/* Left margin zone (in LTR coords) */}
        <div
          className="absolute top-0 bottom-0 rounded-l-sm"
          style={{
            left: 0,
            width: `${isRtl ? leftMarginPct : rightMarginPct}%`,
            background: "hsl(var(--muted-foreground) / 0.15)",
          }}
        />
        {/* Right margin zone (in LTR coords) */}
        <div
          className="absolute top-0 bottom-0 rounded-r-sm"
          style={{
            right: 0,
            width: `${isRtl ? rightMarginPct : leftMarginPct}%`,
            background: "hsl(var(--muted-foreground) / 0.15)",
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => {
          const leftPct = (tick.position / pageWidthMm) * 100;
          const tickHeight =
            tick.type === "cm" ? 12 : tick.type === "half" ? 8 : 4;

          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: `${leftPct}%`,
                width: "1px",
                height: `${tickHeight}px`,
                background: "hsl(var(--muted-foreground) / 0.5)",
              }}
            >
              {tick.label && (
                <span
                  className="absolute text-muted-foreground select-none pointer-events-none"
                  style={{
                    fontSize: "9px",
                    top: "-1px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    lineHeight: 1,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {tick.label}
                </span>
              )}
            </div>
          );
        })}

        {/* Right margin marker (triangle at top) */}
        <div
          className="absolute top-0 z-10 group"
          style={{
            [isRtl ? "right" : "left"]: `${rightMarginPct}%`,
            transform: "translateX(-50%)",
            cursor: "col-resize",
          }}
          onMouseDown={(e) => handleMouseDown(e, "margin-right")}
          title={`الهامش الأيمن: ${marginRight} مم`}
        >
          {/* Top triangle marker */}
          <svg width="14" height="14" viewBox="0 0 14 14" className="drop-shadow-sm">
            <polygon
              points="2,0 12,0 7,10"
              fill={dragTarget === "margin-right" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.7)"}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              className="group-hover:fill-[hsl(var(--primary))] transition-colors"
            />
          </svg>
          {/* Drag guide line */}
          {dragTarget === "margin-right" && (
            <div
              className="absolute top-3 w-px bg-primary/50"
              style={{ height: "500px", left: "50%" }}
            />
          )}
        </div>

        {/* Left margin marker (triangle at top) */}
        <div
          className="absolute top-0 z-10 group"
          style={{
            [isRtl ? "left" : "right"]: `${leftMarginPct}%`,
            transform: "translateX(50%)",
            cursor: "col-resize",
          }}
          onMouseDown={(e) => handleMouseDown(e, "margin-left")}
          title={`الهامش الأيسر: ${marginLeft} مم`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" className="drop-shadow-sm">
            <polygon
              points="2,0 12,0 7,10"
              fill={dragTarget === "margin-left" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.7)"}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              className="group-hover:fill-[hsl(var(--primary))] transition-colors"
            />
          </svg>
          {dragTarget === "margin-left" && (
            <div
              className="absolute top-3 w-px bg-primary/50"
              style={{ height: "500px", left: "50%" }}
            />
          )}
        </div>

        {/* First-line indent marker (small down-triangle at the right margin edge) */}
        <div
          className="absolute z-10 group"
          style={{
            top: "0px",
            [isRtl ? "right" : "left"]: `${((marginRight + firstLineIndent) / pageWidthMm) * 100}%`,
            transform: "translateX(-50%)",
            cursor: "col-resize",
            display: onFirstLineIndentChange ? "block" : "none",
          }}
          onMouseDown={(e) => handleMouseDown(e, "first-line-indent")}
          title={`المسافة البادئة للسطر الأول: ${firstLineIndent} مم`}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" className="drop-shadow-sm" style={{ marginTop: "1px" }}>
            <polygon
              points="1,0 9,0 5,7"
              fill={dragTarget === "first-line-indent" ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)"}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              className="group-hover:fill-[hsl(var(--primary))] transition-colors"
            />
          </svg>
        </div>

        {/* Hanging indent marker (small up-triangle below first-line indent) */}
        <div
          className="absolute z-10 group"
          style={{
            bottom: "0px",
            [isRtl ? "right" : "left"]: `${((marginRight + hangingIndent) / pageWidthMm) * 100}%`,
            transform: "translateX(-50%)",
            cursor: "col-resize",
            display: onHangingIndentChange ? "block" : "none",
          }}
          onMouseDown={(e) => handleMouseDown(e, "hanging-indent")}
          title={`المسافة البادئة المعلقة: ${hangingIndent} مم`}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" className="drop-shadow-sm">
            <polygon
              points="1,7 9,7 5,0"
              fill={dragTarget === "hanging-indent" ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)"}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              className="group-hover:fill-[hsl(var(--primary))] transition-colors"
            />
          </svg>
        </div>

        {/* Active drag value tooltip */}
        {dragTarget && (
          <div
            className="absolute -top-7 bg-popover text-popover-foreground text-xs px-2 py-0.5 rounded shadow-md border border-border z-20 whitespace-nowrap"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {dragTarget === "margin-right" && `${marginRight} مم`}
            {dragTarget === "margin-left" && `${marginLeft} مم`}
            {dragTarget === "first-line-indent" && `${firstLineIndent} مم`}
            {dragTarget === "hanging-indent" && `${hangingIndent} مم`}
          </div>
        )}
      </div>
    </div>
  );
}

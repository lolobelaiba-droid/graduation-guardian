/**
 * Parse flexible date strings into YYYY-MM-DD format.
 * Handles common malformed formats from Excel imports like:
 * - "20/112024" (missing separator)
 * - "20/11/2024" (DD/MM/YYYY)
 * - "2024-11-20" (ISO)
 * - "20-11-2024" (DD-MM-YYYY)
 */
export function parseFlexibleDate(value: string): string {
  const v = value.trim();
  if (!v) return v;

  // Already ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // DD/MM/YYYY or DD-MM-YYYY
  const stdMatch = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (stdMatch) {
    const [, d, m, y] = stdMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const isoLike = v.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (isoLike) {
    const [, y, m, d] = isoLike;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Malformed: DD/MMYYYY (missing second separator, e.g. "20/112024")
  const partial1 = v.match(/^(\d{1,2})\/(\d{2})(\d{4})$/);
  if (partial1) {
    const [, d, m, y] = partial1;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Malformed: DDMM/YYYY (missing first separator)
  const partial2 = v.match(/^(\d{2})(\d{2})\/(\d{4})$/);
  if (partial2) {
    const [, d, m, y] = partial2;
    return `${y}-${m}-${d}`;
  }

  // Malformed: DDMMYYYY (no separators at all)
  const noSep = v.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (noSep) {
    const [, d, m, y] = noSep;
    return `${y}-${m}-${d}`;
  }

  // Fallback: try native Date parsing
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  // Return as-is if nothing works
  return v;
}

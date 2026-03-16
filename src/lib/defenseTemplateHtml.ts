const DEFENSE_AUTH_TYPES = new Set(["defense_auth_lmd", "defense_auth_science"]);

const INDENT_PROPERTIES = new Set([
  "text-indent",
  "margin-inline-start",
  "padding-inline-start",
  "margin-right",
  "padding-right",
]);

function cleanStyleValue(styleValue: string): string {
  const declarations = styleValue
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const property = rule.split(":")[0]?.trim().toLowerCase();
      return property && !INDENT_PROPERTIES.has(property);
    });

  const hasRightAlign = declarations.some((rule) => /^text-align\s*:\s*right$/i.test(rule));
  const hasDirection = declarations.some((rule) => /^direction\s*:/i.test(rule));
  const hasUnicodeBidi = declarations.some((rule) => /^unicode-bidi\s*:/i.test(rule));

  if (hasRightAlign && !hasDirection) declarations.push("direction: rtl");
  if (hasRightAlign && !hasUnicodeBidi) declarations.push("unicode-bidi: isolate");

  return declarations.join("; ");
}

export function normalizeDefenseTemplateHtml(content: string, documentType?: string): string {
  if (!content) return "";
  if (!documentType || !DEFENSE_AUTH_TYPES.has(documentType)) return content;

  const withCleanDoubleQuotes = content.replace(/style="([^"]*)"/gi, (_match, styleValue: string) => {
    const cleaned = cleanStyleValue(styleValue);
    return cleaned ? `style="${cleaned}"` : "";
  });

  const withCleanSingleQuotes = withCleanDoubleQuotes.replace(/style='([^']*)'/gi, (_match, styleValue: string) => {
    const cleaned = cleanStyleValue(styleValue);
    return cleaned ? `style='${cleaned}'` : "";
  });

  // Replace blockquotes with paragraphs, preserving any text-align from inline styles
  return withCleanSingleQuotes
    .replace(/<blockquote\b([^>]*)>/gi, (_match, attrs: string) => {
      // Try to extract text-align from existing inline style
      const alignMatch = attrs.match(/style=["'][^"']*text-align\s*:\s*(\w+)/i);
      const align = alignMatch ? alignMatch[1] : "right";
      return `<p style="text-align: ${align}; direction: rtl; unicode-bidi: isolate">`;
    })
    .replace(/<\/blockquote>/gi, "</p>");
}

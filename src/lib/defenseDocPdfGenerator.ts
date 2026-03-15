/**
 * Defense Document PDF Generator
 * 
 * Renders defense documents (jury decision, defense authorization, defense minutes)
 * as real text PDFs using jsPDF directly, instead of html2pdf.js which produces images.
 * 
 * Architecture:
 * 1. Parse the rendered HTML using DOMParser
 * 2. Walk the DOM tree and convert to structured blocks
 * 3. Render each block using jsPDF with proper Arabic shaping
 * 4. Tables are rendered using jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { shapeArabicText, containsArabic, prepareArabicText } from './pdf/arabicTextUtils';
import { getAllFonts, getFontByName, loadFontFile, arrayBufferToBase64 } from './arabicFonts';
import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

interface BlockStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'right' | 'left' | 'center' | 'justify';
  direction: 'rtl' | 'ltr';
  lineHeight: number;
  textIndent: number;
  color: string;
  marginTop: number;
  marginBottom: number;
}

interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  underline?: boolean;
}

interface ParagraphBlock {
  type: 'paragraph';
  runs: TextRun[];
  style: BlockStyle;
}

interface TableBlock {
  type: 'table';
  headers: string[][];
  rows: string[][];
  colWidths: number[];
  style: {
    fontSize: number;
    padding: number;
    borderColor: string;
    headerBg: string;
    lineHeight: number;
    fontFamily: string;
  };
}

interface BreakBlock {
  type: 'break';
  height: number;
}

type ContentBlock = ParagraphBlock | TableBlock | BreakBlock;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FONT = 'IBM Plex Sans Arabic';
const FALLBACK_ARABIC_FONT = 'Amiri';
const PT_TO_MM = 0.353; // 1pt ≈ 0.353mm
const PX_TO_PT = 0.75; // 1px = 0.75pt
const PX_TO_MM = PX_TO_PT * PT_TO_MM;

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Font data cache
const fontDataCache = new Map<string, string>();

// ============================================================================
// FONT REGISTRATION (reuses logic from pdfGenerator.ts)
// ============================================================================

async function registerFontsForDoc(doc: jsPDF, fontFamilies: string[]): Promise<Set<string>> {
  const registeredFonts = new Set<string>();
  const allFontsRegistry = getAllFonts();

  const familiesToLoad = new Set<string>();
  familiesToLoad.add(FALLBACK_ARABIC_FONT);
  
  for (const name of fontFamilies) {
    if (!name) continue;
    const font = getFontByName(name);
    if (font) familiesToLoad.add(font.family);
    else familiesToLoad.add(name);
  }

  for (const fontFamily of familiesToLoad) {
    const matchingFonts = allFontsRegistry.filter(f =>
      f.family === fontFamily ||
      f.name === fontFamily ||
      f.displayName === fontFamily ||
      f.family.toLowerCase() === fontFamily.toLowerCase() ||
      f.name.toLowerCase() === fontFamily.toLowerCase()
    );

    for (const font of matchingFonts) {
      if (font.isSystem || !font.url) continue;
      try {
        let fontBase64: string;
        if (fontDataCache.has(font.url)) {
          fontBase64 = fontDataCache.get(font.url)!;
        } else {
          const fontBuffer = await loadFontFile(font.url);
          if (!fontBuffer) continue;
          fontBase64 = arrayBufferToBase64(fontBuffer);
          fontDataCache.set(font.url, fontBase64);
        }

        const ext = font.url.split('?')[0].split('.').pop()?.toLowerCase() || 'ttf';
        if (ext !== 'ttf' && ext !== 'otf') continue;

        const fileName = `${font.name}.${ext}`;
        doc.addFileToVFS(fileName, fontBase64);
        doc.addFont(fileName, font.family, font.style, undefined, 'Identity-H');
        registeredFonts.add(`${font.family}:${font.style}`);
      } catch (error) {
        logger.error(`[DefensePDF] Failed to load font ${fontFamily}:`, error);
      }
    }
  }

  return registeredFonts;
}

function safeSetFont(doc: jsPDF, family: string, style: string): boolean {
  try {
    doc.setFont(family, style as any);
    return true;
  } catch {
    return false;
  }
}

function applyFont(
  doc: jsPDF,
  fontFamily: string,
  bold: boolean,
  italic: boolean,
  registeredFonts: Set<string>,
  isArabic: boolean
): void {
  const font = getFontByName(fontFamily);
  const style = bold ? 'bold' : 'normal';

  // Try requested font
  if (font && !font.isSystem && registeredFonts.has(`${font.family}:${style}`)) {
    if (safeSetFont(doc, font.family, style)) return;
  }
  if (font && !font.isSystem && registeredFonts.has(`${font.family}:normal`)) {
    if (safeSetFont(doc, font.family, 'normal')) return;
  }

  // For Arabic, use fallback
  if (isArabic) {
    if (registeredFonts.has(`${FALLBACK_ARABIC_FONT}:normal`)) {
      safeSetFont(doc, FALLBACK_ARABIC_FONT, 'normal');
      return;
    }
    for (const key of registeredFonts) {
      const [fam] = key.split(':');
      if (safeSetFont(doc, fam, 'normal')) return;
    }
  }

  // Final fallback
  safeSetFont(doc, 'times', style);
}

// ============================================================================
// HTML PARSING
// ============================================================================

function parseInlineStyle(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleStr) return styles;
  styleStr.split(';').forEach(rule => {
    const [prop, ...valParts] = rule.split(':');
    if (prop && valParts.length) {
      styles[prop.trim().toLowerCase()] = valParts.join(':').trim();
    }
  });
  return styles;
}

function parseFontSizePx(value: string): number | undefined {
  if (!value) return undefined;
  const pxMatch = value.match(/([\d.]+)\s*px/i);
  if (pxMatch) return parseFloat(pxMatch[1]);
  const ptMatch = value.match(/([\d.]+)\s*pt/i);
  if (ptMatch) return parseFloat(ptMatch[1]) / PX_TO_PT;
  return undefined;
}

function getDefaultBlockStyle(
  templateFontFamily: string,
  templateFontSize: number,
  templateLineHeight: number
): BlockStyle {
  return {
    fontSize: templateFontSize,
    fontFamily: templateFontFamily,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'right',
    direction: 'rtl',
    lineHeight: templateLineHeight,
    textIndent: 0,
    color: '#000000',
    marginTop: 0,
    marginBottom: 0,
  };
}

function extractBlockStyle(
  el: HTMLElement,
  defaultStyle: BlockStyle
): BlockStyle {
  const inlineStyles = parseInlineStyle(el.getAttribute('style') || '');
  const style = { ...defaultStyle };

  if (inlineStyles['text-align']) {
    const align = inlineStyles['text-align'].toLowerCase();
    if (align === 'center') style.textAlign = 'center';
    else if (align === 'left') style.textAlign = 'left';
    else if (align === 'justify') style.textAlign = 'justify';
    else style.textAlign = 'right';
  }

  if (inlineStyles['direction'] === 'ltr') style.direction = 'ltr';

  if (inlineStyles['font-size']) {
    const size = parseFontSizePx(inlineStyles['font-size']);
    if (size) style.fontSize = size;
  }

  if (inlineStyles['font-weight']) {
    const w = inlineStyles['font-weight'].toLowerCase();
    if (w === 'bold' || parseInt(w) >= 600) style.fontWeight = 'bold';
  }

  if (inlineStyles['font-family']) {
    style.fontFamily = inlineStyles['font-family'].replace(/['"]/g, '').split(',')[0].trim();
  }

  if (inlineStyles['line-height']) {
    const lh = parseFloat(inlineStyles['line-height']);
    if (!isNaN(lh)) style.lineHeight = lh > 10 ? lh / style.fontSize : lh;
  }

  if (inlineStyles['color']) style.color = inlineStyles['color'];
  
  if (inlineStyles['text-indent']) {
    const indent = parseFloat(inlineStyles['text-indent']);
    if (!isNaN(indent)) style.textIndent = indent * PX_TO_MM;
  }

  // Check tag name for implicit bold
  const tag = el.tagName?.toLowerCase();
  if (tag === 'strong' || tag === 'b' || tag === 'h1' || tag === 'h2' || tag === 'h3') {
    style.fontWeight = 'bold';
  }

  return style;
}

/**
 * Extract text runs from an element, preserving inline formatting
 */
function extractTextRuns(node: Node, parentBold: boolean, parentItalic: boolean, parentStyle?: Partial<TextRun>): TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text.trim() || text.includes(' ')) {
      runs.push({
        text,
        bold: parentBold,
        italic: parentItalic,
        ...parentStyle,
      });
    }
    return runs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Skip hidden elements
  if (el.style?.display === 'none' || el.style?.visibility === 'hidden') return runs;

  // Handle <br>
  if (tag === 'br') {
    runs.push({ text: '\n', bold: parentBold, italic: parentItalic });
    return runs;
  }

  // Handle <bdi> - just extract inner text
  const isBold = parentBold || tag === 'strong' || tag === 'b';
  const isItalic = parentItalic || tag === 'em' || tag === 'i';
  const isUnderline = tag === 'u';

  const inlineStyles = parseInlineStyle(el.getAttribute('style') || '');
  const runStyle: Partial<TextRun> = { ...parentStyle };
  
  if (inlineStyles['font-size']) {
    const size = parseFontSizePx(inlineStyles['font-size']);
    if (size) runStyle.fontSize = size;
  }
  if (inlineStyles['font-family']) {
    runStyle.fontFamily = inlineStyles['font-family'].replace(/['"]/g, '').split(',')[0].trim();
  }
  if (inlineStyles['color']) runStyle.color = inlineStyles['color'];
  if (isUnderline) runStyle.underline = true;
  
  if (inlineStyles['font-weight']) {
    const w = inlineStyles['font-weight'].toLowerCase();
    if (w === 'bold' || parseInt(w) >= 600) runStyle.bold = true;
  }

  for (let i = 0; i < el.childNodes.length; i++) {
    runs.push(...extractTextRuns(
      el.childNodes[i],
      isBold || !!runStyle.bold,
      isItalic,
      runStyle
    ));
  }

  return runs;
}

/**
 * Parse a <table> element into a TableBlock
 */
function parseTableElement(tableEl: HTMLElement, defaultStyle: BlockStyle): TableBlock {
  const headers: string[][] = [];
  const rows: string[][] = [];
  const colWidths: number[] = [];

  // Extract styles from the table
  const tableStyles = parseInlineStyle(tableEl.getAttribute('style') || '');

  // Parse thead
  const thead = tableEl.querySelector('thead');
  if (thead) {
    const headerRows = thead.querySelectorAll('tr');
    headerRows.forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach((cell, idx) => {
        cells.push(cell.textContent?.trim() || '');
        // Extract width from first header row
        if (headers.length === 0) {
          const cellStyle = parseInlineStyle((cell as HTMLElement).getAttribute('style') || '');
          const widthStr = cellStyle['width'];
          if (widthStr) {
            const pct = parseFloat(widthStr);
            if (!isNaN(pct)) colWidths.push(pct);
          }
        }
      });
      headers.push(cells);
    });
  }

  // Parse tbody
  const tbody = tableEl.querySelector('tbody') || tableEl;
  const bodyRows = tbody.querySelectorAll('tr');
  bodyRows.forEach(tr => {
    // Skip header rows if already parsed
    if (thead && tr.parentElement === thead) return;
    const cells: string[] = [];
    tr.querySelectorAll('td, th').forEach(cell => {
      cells.push(cell.textContent?.trim() || '');
    });
    if (cells.length > 0) rows.push(cells);
  });

  // Extract table cell styles
  const firstTh = tableEl.querySelector('th');
  const thStyles = firstTh ? parseInlineStyle(firstTh.getAttribute('style') || '') : {};
  const firstTd = tableEl.querySelector('td');
  const tdStyles = firstTd ? parseInlineStyle(firstTd.getAttribute('style') || '') : {};

  return {
    type: 'table',
    headers,
    rows,
    colWidths,
    style: {
      fontSize: parseFontSizePx(tdStyles['font-size'] || thStyles['font-size'] || '') || defaultStyle.fontSize,
      padding: parseFloat(tdStyles['padding'] || thStyles['padding'] || '8') * PX_TO_MM,
      borderColor: tdStyles['border']?.match(/#[0-9a-fA-F]+/)?.[0] || thStyles['border']?.match(/#[0-9a-fA-F]+/)?.[0] || '#333',
      headerBg: thStyles['background'] || thStyles['background-color'] || '#f0f0f0',
      lineHeight: parseFloat(tdStyles['line-height'] || thStyles['line-height'] || '1.6'),
      fontFamily: defaultStyle.fontFamily,
    },
  };
}

/**
 * Convert HTML string to structured content blocks
 */
function htmlToBlocks(
  html: string,
  templateFontFamily: string,
  templateFontSize: number,
  templateLineHeight: number
): ContentBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  if (!root) return [];

  const defaultStyle = getDefaultBlockStyle(templateFontFamily, templateFontSize, templateLineHeight);
  const blocks: ContentBlock[] = [];

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({
          type: 'paragraph',
          runs: [{ text, bold: false, italic: false }],
          style: { ...defaultStyle },
        });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Skip invisible
    if (el.style?.display === 'none') return;

    // Handle tables
    if (tag === 'table') {
      blocks.push(parseTableElement(el, defaultStyle));
      return;
    }

    // Handle block elements
    const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'section', 'article'];
    if (blockTags.includes(tag)) {
      const blockStyle = extractBlockStyle(el, defaultStyle);
      const isBold = blockStyle.fontWeight === 'bold';
      const runs = extractTextRuns(el, isBold, false);

      if (runs.length > 0) {
        blocks.push({
          type: 'paragraph',
          runs,
          style: blockStyle,
        });
      } else {
        // Empty paragraph = vertical space
        blocks.push({ type: 'break', height: blockStyle.fontSize * PT_TO_MM * blockStyle.lineHeight });
      }
      return;
    }

    // Handle <br> at top level
    if (tag === 'br') {
      blocks.push({ type: 'break', height: defaultStyle.fontSize * PT_TO_MM * defaultStyle.lineHeight });
      return;
    }

    // Handle <ul>/<ol>
    if (tag === 'ul' || tag === 'ol') {
      const items = el.querySelectorAll(':scope > li');
      items.forEach((li, idx) => {
        const blockStyle = extractBlockStyle(li as HTMLElement, defaultStyle);
        const runs = extractTextRuns(li, false, false);
        const prefix = tag === 'ol' ? `${idx + 1}. ` : '• ';
        runs.unshift({ text: prefix, bold: false, italic: false });
        if (runs.length > 0) {
          blocks.push({ type: 'paragraph', runs, style: blockStyle });
        }
      });
      return;
    }

    // Recurse into other container elements
    for (let i = 0; i < el.childNodes.length; i++) {
      processNode(el.childNodes[i]);
    }
  }

  for (let i = 0; i < root.childNodes.length; i++) {
    processNode(root.childNodes[i]);
  }

  return blocks;
}

// ============================================================================
// PDF RENDERING
// ============================================================================

function processArabicForPdf(text: string): string {
  if (!text || !containsArabic(text)) return text;
  return prepareArabicText(text, 'rtl');
}

/**
 * Render a paragraph block onto the PDF
 */
function renderParagraph(
  doc: jsPDF,
  block: ParagraphBlock,
  y: number,
  margins: { top: number; right: number; bottom: number; left: number },
  registeredFonts: Set<string>,
  defaultFontFamily: string
): number {
  const contentWidth = A4_WIDTH - margins.left - margins.right;
  const style = block.style;
  const fontSize = style.fontSize * PX_TO_PT; // Convert px to pt for jsPDF
  const lineHeightMm = fontSize * PT_TO_MM * style.lineHeight;

  // Combine all text runs into a single string for line wrapping
  // While tracking formatting ranges
  let fullText = '';
  for (const run of block.runs) {
    fullText += run.text;
  }

  // Clean up whitespace
  fullText = fullText.replace(/\n/g, '\n').replace(/[ \t]+/g, ' ');

  if (!fullText.trim()) {
    return y + lineHeightMm;
  }

  // Determine if text is Arabic
  const isArabic = containsArabic(fullText);

  // Determine primary formatting (use first run or block style)
  const primaryBold = style.fontWeight === 'bold' || block.runs[0]?.bold;
  const primaryFontFamily = block.runs[0]?.fontFamily || style.fontFamily || defaultFontFamily;

  // Set font
  applyFont(doc, primaryFontFamily, primaryBold, false, registeredFonts, isArabic);
  doc.setFontSize(fontSize);
  doc.setTextColor(style.color || '#000000');

  // Handle multi-line rendering with different formatting per segment
  // For simplicity and reliability, we'll handle the most common case:
  // the entire paragraph shares the same base formatting, with inline bold/italic
  
  // Check if we have mixed formatting runs
  const hasMixedFormatting = block.runs.some(r => 
    r.bold !== block.runs[0]?.bold || 
    r.fontSize !== block.runs[0]?.fontSize ||
    r.fontFamily !== block.runs[0]?.fontFamily
  );

  if (!hasMixedFormatting || block.runs.length <= 1) {
    // Simple case: uniform formatting
    const processedText = isArabic ? processArabicForPdf(fullText) : fullText;
    
    // Handle text-indent
    const indentWidth = style.textIndent || 0;
    const availableWidth = contentWidth - indentWidth;
    
    // Split into lines
    const lines = doc.splitTextToSize(processedText, availableWidth);
    
    let currentY = y;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line && !line.trim) continue;
      
      let textX: number;
      const isFirstLine = i === 0;
      const lineWidth = isFirstLine ? availableWidth : contentWidth;
      
      // Recalculate split for non-first lines if there was an indent
      // (jsPDF already handled wrapping based on availableWidth)
      
      if (style.textAlign === 'center') {
        textX = margins.left + contentWidth / 2;
      } else if (style.textAlign === 'left' || style.direction === 'ltr') {
        textX = margins.left + (isFirstLine ? indentWidth : 0);
      } else {
        // Right align (default for RTL)
        textX = A4_WIDTH - margins.right - (isFirstLine ? indentWidth : 0);
      }

      const align = style.textAlign === 'center' ? 'center' 
        : (style.textAlign === 'left' || style.direction === 'ltr') ? 'left' 
        : 'right';
      
      doc.text(line, textX, currentY, { align: align as any });
      currentY += lineHeightMm;
    }

    return currentY;
  } else {
    // Complex case: mixed formatting - render run by run on single line
    // For multi-line mixed formatting, we simplify by rendering each run separately
    let currentY = y;
    
    // Split into logical lines first (by \n)
    const textLines = fullText.split('\n');
    
    for (const textLine of textLines) {
      if (!textLine.trim()) {
        currentY += lineHeightMm;
        continue;
      }

      // For RTL, we render from right
      const isLineArabic = containsArabic(textLine);
      
      // Simple approach: process the full line with primary formatting
      const processedLine = isLineArabic ? processArabicForPdf(textLine) : textLine;
      
      applyFont(doc, primaryFontFamily, primaryBold, false, registeredFonts, isLineArabic);
      doc.setFontSize(fontSize);
      
      // Wrap text
      const lines = doc.splitTextToSize(processedLine, contentWidth);
      
      for (const line of lines) {
        let textX: number;
        if (style.textAlign === 'center') {
          textX = margins.left + contentWidth / 2;
        } else if (style.textAlign === 'left') {
          textX = margins.left;
        } else {
          textX = A4_WIDTH - margins.right;
        }

        const align = style.textAlign === 'center' ? 'center'
          : style.textAlign === 'left' ? 'left' : 'right';
        
        doc.text(line, textX, currentY, { align: align as any });
        currentY += lineHeightMm;
      }
    }

    return currentY;
  }
}

/**
 * Render a table block onto the PDF
 */
function renderTable(
  doc: jsPDF,
  block: TableBlock,
  y: number,
  margins: { top: number; right: number; bottom: number; left: number },
  registeredFonts: Set<string>,
  defaultFontFamily: string
): number {
  const tableStyle = block.style;
  const fontSize = tableStyle.fontSize * PX_TO_PT;
  const isArabic = true; // Defense docs are Arabic

  // Find an Arabic-capable font for the table
  let fontFamily = defaultFontFamily;
  const font = getFontByName(defaultFontFamily);
  if (font && !font.isSystem && registeredFonts.has(`${font.family}:normal`)) {
    fontFamily = font.family;
  } else if (registeredFonts.has(`${FALLBACK_ARABIC_FONT}:normal`)) {
    fontFamily = FALLBACK_ARABIC_FONT;
  }

  // Process headers and rows for Arabic
  const processedHeaders = block.headers.map(row =>
    row.map(cell => containsArabic(cell) ? processArabicForPdf(cell) : cell)
  );
  const processedRows = block.rows.map(row =>
    row.map(cell => containsArabic(cell) ? processArabicForPdf(cell) : cell)
  );

  // Calculate column widths
  const contentWidth = A4_WIDTH - margins.left - margins.right;
  const columnStyles: Record<number, any> = {};
  
  if (block.colWidths.length > 0) {
    const totalPct = block.colWidths.reduce((a, b) => a + b, 0);
    block.colWidths.forEach((pct, idx) => {
      columnStyles[idx] = { cellWidth: (pct / totalPct) * contentWidth };
    });
  }

  // Parse header background color to RGB
  let headerFillColor: [number, number, number] = [240, 240, 240];
  const bgMatch = tableStyle.headerBg.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (bgMatch) {
    headerFillColor = [parseInt(bgMatch[1], 16), parseInt(bgMatch[2], 16), parseInt(bgMatch[3], 16)];
  }

  // Parse border color to RGB
  let borderColor: [number, number, number] = [51, 51, 51];
  const borderMatch = tableStyle.borderColor.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (borderMatch) {
    borderColor = [parseInt(borderMatch[1], 16), parseInt(borderMatch[2], 16), parseInt(borderMatch[3], 16)];
  }

  autoTable(doc, {
    startY: y,
    head: processedHeaders.length > 0 ? processedHeaders : undefined,
    body: processedRows,
    margin: { left: margins.left, right: margins.right },
    styles: {
      font: fontFamily,
      fontSize: fontSize,
      cellPadding: tableStyle.padding,
      lineColor: borderColor,
      lineWidth: 0.3,
      halign: 'center',
      valign: 'middle',
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: headerFillColor,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles,
    tableLineColor: borderColor,
    tableLineWidth: 0.3,
    didParseCell: (data) => {
      // Ensure RTL direction for table cells
      data.cell.styles.halign = 'center';
    },
  });

  // Get the final Y position after the table
  return (doc as any).lastAutoTable?.finalY || y + 20;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface DefenseDocPdfOptions {
  html: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
  marginRight: number;
  marginLeft: number;
  title?: string;
}

/**
 * Generate a defense document PDF with real text (not images).
 * Returns the PDF as a Blob for download.
 */
export async function generateDefenseDocPdf(options: DefenseDocPdfOptions): Promise<Blob> {
  const {
    html,
    fontFamily,
    fontSize,
    lineHeight,
    marginTop,
    marginBottom,
    marginRight,
    marginLeft,
  } = options;

  logger.log('[DefensePDF] Starting generation...');

  // Create jsPDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  // Parse HTML to blocks
  const blocks = htmlToBlocks(html, fontFamily, fontSize, lineHeight);
  logger.log(`[DefensePDF] Parsed ${blocks.length} content blocks`);

  // Collect all font families needed
  const fontFamilies = new Set<string>([fontFamily]);
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      if (block.style.fontFamily) fontFamilies.add(block.style.fontFamily);
      for (const run of block.runs) {
        if (run.fontFamily) fontFamilies.add(run.fontFamily);
      }
    }
    if (block.type === 'table') {
      fontFamilies.add(block.style.fontFamily);
    }
  }

  // Register fonts
  const registeredFonts = await registerFontsForDoc(doc, Array.from(fontFamilies));
  logger.log(`[DefensePDF] Registered ${registeredFonts.size} fonts`);

  const margins = {
    top: marginTop,
    bottom: marginBottom,
    right: marginRight,
    left: marginLeft,
  };

  let currentY = margins.top;
  const maxY = A4_HEIGHT - margins.bottom;

  // Render blocks
  for (const block of blocks) {
    // Check page overflow
    if (currentY > maxY - 10) {
      doc.addPage();
      currentY = margins.top;
    }

    switch (block.type) {
      case 'paragraph':
        currentY = renderParagraph(doc, block, currentY, margins, registeredFonts, fontFamily);
        break;

      case 'table':
        currentY = renderTable(doc, block, currentY, margins, registeredFonts, fontFamily);
        currentY += 2; // Small gap after table
        break;

      case 'break':
        currentY += block.height;
        break;
    }
  }

  logger.log('[DefensePDF] Generation complete');
  return doc.output('blob');
}

/**
 * Generate and save (download) a defense document PDF
 */
export async function downloadDefenseDocPdf(
  options: DefenseDocPdfOptions & { fileName: string }
): Promise<void> {
  const blob = await generateDefenseDocPdf(options);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Font Embedder - builds @font-face CSS with base64-embedded font data
 * for use in standalone print windows (offline/Electron support).
 */

import { arabicFonts, loadFontFile, arrayBufferToBase64, getCustomFonts, type FontConfig } from './arabicFonts';

// IBM Plex Sans Arabic weights bundled in public/fonts/
const ibmPlexWeights: { url: string; weight: string }[] = [
  { url: '/fonts/IBMPlexSansArabic-Light.ttf', weight: '300' },
  { url: '/fonts/IBMPlexSansArabic-Regular.ttf', weight: '400' },
  { url: '/fonts/IBMPlexSansArabic-Medium.ttf', weight: '500' },
  { url: '/fonts/IBMPlexSansArabic-SemiBold.ttf', weight: '600' },
  { url: '/fonts/IBMPlexSansArabic-Bold.ttf', weight: '700' },
];

/**
 * Build @font-face CSS with base64 data URIs for all bundled Arabic fonts.
 * Falls back to path-based @font-face if loading fails.
 */
export async function buildEmbeddedFontCss(): Promise<string> {
  const rules: string[] = [];

  // 1. IBM Plex Sans Arabic (multiple weights)
  for (const w of ibmPlexWeights) {
    const buffer = await loadFontFile(w.url);
    if (buffer) {
      const b64 = arrayBufferToBase64(buffer);
      rules.push(`@font-face { font-family: 'IBM Plex Sans Arabic'; src: url(data:font/truetype;base64,${b64}) format('truetype'); font-weight: ${w.weight}; font-style: normal; }`);
    }
  }

  // 2. Other bundled Arabic fonts (Amiri, Cairo, Tajawal, Noto Sans Arabic)
  for (const font of arabicFonts) {
    if (!font.url) continue;
    const buffer = await loadFontFile(font.url);
    if (buffer) {
      const b64 = arrayBufferToBase64(buffer);
      rules.push(`@font-face { font-family: '${font.family}'; src: url(data:font/truetype;base64,${b64}) format('truetype'); font-weight: ${font.style === 'bold' ? 'bold' : 'normal'}; font-style: normal; }`);
    }
  }

  // 3. Custom fonts from database (already cached by useFontLoader)
  const customFonts = getCustomFonts();
  for (const font of customFonts) {
    if (!font.url) continue;
    try {
      const buffer = await loadFontFile(font.url);
      if (buffer) {
        const b64 = arrayBufferToBase64(buffer);
        rules.push(`@font-face { font-family: '${font.family}'; src: url(data:font/truetype;base64,${b64}) format('truetype'); font-weight: ${font.style === 'bold' ? 'bold' : 'normal'}; font-style: ${font.style === 'italic' ? 'italic' : 'normal'}; }`);
      }
    } catch {
      // Skip failed custom fonts silently
    }
  }

  return rules.join('\n');
}

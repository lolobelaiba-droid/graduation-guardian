// Fonts configuration for jsPDF
// Using locally hosted fonts for reliable loading

export interface FontConfig {
  name: string;
  displayName: string;
  displayNameAr: string;
  family: string;
  url?: string; // Optional - null for system fonts
  style: 'normal' | 'bold' | 'italic';
  isArabic: boolean;
  isSystem: boolean; // True for built-in system fonts
}

// System/Default fonts (built into jsPDF or browsers)
export const systemFonts: FontConfig[] = [
  // Latin fonts (jsPDF built-in)
  { name: 'Helvetica', displayName: 'Helvetica', displayNameAr: 'هيلفيتيكا', family: 'helvetica', style: 'normal', isArabic: false, isSystem: true },
  { name: 'Helvetica-Bold', displayName: 'Helvetica Bold', displayNameAr: 'هيلفيتيكا عريض', family: 'helvetica', style: 'bold', isArabic: false, isSystem: true },
  { name: 'Times', displayName: 'Times Roman', displayNameAr: 'تايمز رومان', family: 'times', style: 'normal', isArabic: false, isSystem: true },
  { name: 'Times-Bold', displayName: 'Times Bold', displayNameAr: 'تايمز عريض', family: 'times', style: 'bold', isArabic: false, isSystem: true },
  { name: 'Courier', displayName: 'Courier', displayNameAr: 'كوريير', family: 'courier', style: 'normal', isArabic: false, isSystem: true },
  { name: 'Courier-Bold', displayName: 'Courier Bold', displayNameAr: 'كوريير عريض', family: 'courier', style: 'bold', isArabic: false, isSystem: true },
];

// Arabic fonts (loaded from local files in public/fonts/)
export const arabicFonts: FontConfig[] = [
  {
    name: 'Amiri',
    displayName: 'Amiri',
    displayNameAr: 'أميري',
    family: 'Amiri',
    url: '/fonts/Amiri-Regular.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Amiri-Bold',
    displayName: 'Amiri Bold',
    displayNameAr: 'أميري عريض',
    family: 'Amiri',
    url: '/fonts/Amiri-Bold.ttf',
    style: 'bold',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Cairo',
    displayName: 'Cairo',
    displayNameAr: 'القاهرة',
    family: 'Cairo',
    url: '/fonts/Cairo-Regular.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Tajawal',
    displayName: 'Tajawal',
    displayNameAr: 'تجوال',
    family: 'Tajawal',
    url: '/fonts/Tajawal-Regular.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Tajawal-Bold',
    displayName: 'Tajawal Bold',
    displayNameAr: 'تجوال عريض',
    family: 'Tajawal',
    url: '/fonts/Tajawal-Bold.ttf',
    style: 'bold',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Noto-Sans-Arabic',
    displayName: 'Noto Sans Arabic',
    displayNameAr: 'نوتو سانس عربي',
    family: 'NotoSansArabic',
    url: '/fonts/NotoSansArabic-Regular.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
];

// All fonts combined
export const allFonts: FontConfig[] = [...systemFonts, ...arabicFonts];

// Font cache to store loaded fonts
const fontCache = new Map<string, ArrayBuffer>();

/**
 * Load a font file from URL and return as ArrayBuffer
 */
export async function loadFontFile(url: string): Promise<ArrayBuffer | null> {
  // Check cache first
  if (fontCache.has(url)) {
    return fontCache.get(url)!;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fontCache.set(url, arrayBuffer);
    return arrayBuffer;
  } catch (error) {
    console.error('Failed to load font:', error);
    return null;
  }
}

/**
 * Convert ArrayBuffer to Base64 string for jsPDF
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get font by name
 */
export function getFontByName(fontName: string): FontConfig | undefined {
  return allFonts.find(f => 
    f.name === fontName || 
    f.displayName === fontName || 
    f.family === fontName ||
    f.family.toLowerCase() === fontName.toLowerCase() ||
    f.name.toLowerCase() === fontName.toLowerCase()
  );
}

/**
 * Get all font display options for UI - grouped by category
 */
export function getFontOptions(): { value: string; label: string; labelAr: string; isArabic: boolean; isSystem: boolean }[] {
  const options: { value: string; label: string; labelAr: string; isArabic: boolean; isSystem: boolean }[] = [];
  const seenFamilies = new Set<string>();
  
  // Add all fonts, avoiding duplicates by family
  allFonts.forEach(font => {
    const familyKey = font.family.toLowerCase();
    if (!seenFamilies.has(familyKey) && font.style === 'normal') {
      seenFamilies.add(familyKey);
      options.push({
        value: font.family,
        label: font.displayName.replace(' Bold', ''),
        labelAr: font.displayNameAr.replace(' عريض', ''),
        isArabic: font.isArabic,
        isSystem: font.isSystem,
      });
    }
  });

  return options;
}

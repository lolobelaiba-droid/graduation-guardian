// Arabic fonts configuration for jsPDF
// Using Google Fonts CDN for reliable font loading

export interface ArabicFont {
  name: string;
  displayName: string;
  displayNameAr: string;
  family: string;
  url: string;
  style: 'normal' | 'bold' | 'italic';
  isArabic: boolean;
}

// Available Arabic fonts
export const arabicFonts: ArabicFont[] = [
  {
    name: 'Amiri',
    displayName: 'Amiri',
    displayNameAr: 'أميري',
    family: 'Amiri',
    url: 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf',
    style: 'normal',
    isArabic: true,
  },
  {
    name: 'Amiri-Bold',
    displayName: 'Amiri Bold',
    displayNameAr: 'أميري عريض',
    family: 'Amiri',
    url: 'https://fonts.gstatic.com/s/amiri/v27/J7acnpd8CGxBHp2VkZY4xJ9CGyAa.ttf',
    style: 'bold',
    isArabic: true,
  },
  {
    name: 'Cairo',
    displayName: 'Cairo',
    displayNameAr: 'القاهرة',
    family: 'Cairo',
    url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1ToLQ-HmkA.ttf',
    style: 'normal',
    isArabic: true,
  },
  {
    name: 'Cairo-Bold',
    displayName: 'Cairo Bold',
    displayNameAr: 'القاهرة عريض',
    family: 'Cairo',
    url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hD4-W1ToLQ-HmkA.ttf',
    style: 'bold',
    isArabic: true,
  },
  {
    name: 'Tajawal',
    displayName: 'Tajawal',
    displayNameAr: 'تجوال',
    family: 'Tajawal',
    url: 'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1rzaLCr5IlLA.ttf',
    style: 'normal',
    isArabic: true,
  },
  {
    name: 'Tajawal-Bold',
    displayName: 'Tajawal Bold',
    displayNameAr: 'تجوال عريض',
    family: 'Tajawal',
    url: 'https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gLrZjiLlJ-G0.ttf',
    style: 'bold',
    isArabic: true,
  },
  {
    name: 'Noto-Sans-Arabic',
    displayName: 'Noto Sans Arabic',
    displayNameAr: 'نوتو سانس عربي',
    family: 'Noto Sans Arabic',
    url: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf',
    style: 'normal',
    isArabic: true,
  },
  {
    name: 'IBM-Plex-Sans-Arabic',
    displayName: 'IBM Plex Sans Arabic',
    displayNameAr: 'IBM بلكس سانس عربي',
    family: 'IBM Plex Sans Arabic',
    url: 'https://fonts.gstatic.com/s/ibmplexsansarabic/v12/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfvBK.ttf',
    style: 'normal',
    isArabic: true,
  },
];

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
export function getFontByName(fontName: string): ArabicFont | undefined {
  return arabicFonts.find(f => f.name === fontName || f.displayName === fontName || f.family === fontName);
}

/**
 * Get all font display options for UI
 */
export function getFontOptions(): { value: string; label: string; labelAr: string }[] {
  // Return unique families with their display names
  const families = new Map<string, { label: string; labelAr: string }>();
  
  arabicFonts.forEach(font => {
    if (!families.has(font.family)) {
      families.set(font.family, {
        label: font.displayName.replace(' Bold', ''),
        labelAr: font.displayNameAr.replace(' عريض', ''),
      });
    }
  });

  return Array.from(families.entries()).map(([value, { label, labelAr }]) => ({
    value,
    label,
    labelAr,
  }));
}

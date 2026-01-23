// Fonts configuration for jsPDF
// Using Google Fonts CDN for reliable font loading

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

// Arabic fonts (loaded from Google Fonts)
export const arabicFonts: FontConfig[] = [
  {
    name: 'Amiri',
    displayName: 'Amiri',
    displayNameAr: 'أميري',
    family: 'Amiri',
    url: 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Amiri-Bold',
    displayName: 'Amiri Bold',
    displayNameAr: 'أميري عريض',
    family: 'Amiri',
    url: 'https://fonts.gstatic.com/s/amiri/v27/J7acnpd8CGxBHp2VkZY4xJ9CGyAa.ttf',
    style: 'bold',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Cairo',
    displayName: 'Cairo',
    displayNameAr: 'القاهرة',
    family: 'Cairo',
    url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1ToLQ-HmkA.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Cairo-Bold',
    displayName: 'Cairo Bold',
    displayNameAr: 'القاهرة عريض',
    family: 'Cairo',
    url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hD4-W1ToLQ-HmkA.ttf',
    style: 'bold',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Tajawal',
    displayName: 'Tajawal',
    displayNameAr: 'تجوال',
    family: 'Tajawal',
    url: 'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1rzaLCr5IlLA.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Tajawal-Bold',
    displayName: 'Tajawal Bold',
    displayNameAr: 'تجوال عريض',
    family: 'Tajawal',
    url: 'https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gLrZjiLlJ-G0.ttf',
    style: 'bold',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Noto-Sans-Arabic',
    displayName: 'Noto Sans Arabic',
    displayNameAr: 'نوتو سانس عربي',
    family: 'Noto Sans Arabic',
    url: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'IBM-Plex-Sans-Arabic',
    displayName: 'IBM Plex Sans Arabic',
    displayNameAr: 'IBM بلكس سانس عربي',
    family: 'IBM Plex Sans Arabic',
    url: 'https://fonts.gstatic.com/s/ibmplexsansarabic/v12/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfvBK.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Scheherazade',
    displayName: 'Scheherazade New',
    displayNameAr: 'شهرزاد',
    family: 'Scheherazade New',
    url: 'https://fonts.gstatic.com/s/scheherazadenew/v15/4UaZrFhTvxVnHDvUkUiHg8jprP4DCwNsOl4p5Is.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Lateef',
    displayName: 'Lateef',
    displayNameAr: 'لطيف',
    family: 'Lateef',
    url: 'https://fonts.gstatic.com/s/lateef/v30/hESw6XVnNCxEvkb8pCBl9GZ9.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Almarai',
    displayName: 'Almarai',
    displayNameAr: 'المراعي',
    family: 'Almarai',
    url: 'https://fonts.gstatic.com/s/almarai/v12/tssoApxBaigK_hnnS-anhnicoq72sXg.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'El-Messiri',
    displayName: 'El Messiri',
    displayNameAr: 'المسيري',
    family: 'El Messiri',
    url: 'https://fonts.gstatic.com/s/elmessiri/v22/K2F0fZBRmr9vQ1pHEey6GIGo8_pv3myYjuXwe55djw.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Rakkas',
    displayName: 'Rakkas',
    displayNameAr: 'رقاص',
    family: 'Rakkas',
    url: 'https://fonts.gstatic.com/s/rakkas/v19/Qw3cZQlNHiblL3j_lttPOeMc.ttf',
    style: 'normal',
    isArabic: true,
    isSystem: false,
  },
  {
    name: 'Reem-Kufi',
    displayName: 'Reem Kufi',
    displayNameAr: 'ريم كوفي',
    family: 'Reem Kufi',
    url: 'https://fonts.gstatic.com/s/reemkufi/v21/2sBcZGJLip7W2J7v7wJZT0MiFb5F.ttf',
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
    f.family.toLowerCase() === fontName.toLowerCase()
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

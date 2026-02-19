/**
 * استخراج الكلمات المفتاحية من عناوين الأطروحات العربية
 * يعمل أوفلاين بالكامل بدون مكتبات خارجية
 */

// كلمات التوقف العربية (حروف الجر، أدوات التعريف، ضمائر، إلخ)
const ARABIC_STOP_WORDS = new Set([
  // حروف الجر
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'بين', 'حول', 'خلال', 'عبر', 'دون', 'بدون',
  'ضد', 'نحو', 'تحت', 'فوق', 'أمام', 'وراء', 'قبل', 'بعد', 'عند', 'لدى', 'حتى', 'منذ',
  // أدوات
  'ال', 'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء', 'أولئك', 'الذي', 'التي', 'الذين', 'اللذان', 'اللتان',
  // ضمائر
  'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتم', 'أنتن',
  // أدوات ربط
  'و', 'أو', 'ثم', 'لكن', 'بل', 'لا', 'لم', 'لن', 'قد', 'قد', 'إن', 'أن', 'كان', 'كانت',
  'ما', 'لما', 'إذا', 'إذ', 'كي', 'كيف', 'أين', 'متى', 'كم', 'أي',
  // كلمات شائعة جداً
  'دراسة', 'بحث', 'حالة', 'أثر', 'دور', 'واقع', 'مدى', 'ضوء',
  'بعض', 'كل', 'جميع', 'أحد', 'غير', 'ذات', 'ذو', 'ذي',
  // حروف جر مركبة مع ال
  'بال', 'وال', 'فال', 'لل',
  // أفعال شائعة
  'يتم', 'تم', 'كانت', 'يكون', 'تكون', 'يمكن',
  // كلمات إنجليزية شائعة في العناوين
  'the', 'of', 'and', 'in', 'a', 'an', 'to', 'for', 'on', 'with', 'by', 'at', 'from', 'is', 'are', 'was', 'were',
  'study', 'case', 'analysis', 'research', 'impact', 'role', 'effect',
]);

// تنظيف وتطبيع النص العربي
function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '') // إزالة التشكيل
    .trim();
}

// تقسيم العنوان إلى كلمات واستخراج المصطلحات
function tokenize(title: string): string[] {
  // إزالة علامات الترقيم والأرقام
  const cleaned = title
    .replace(/[()[\]{}"'«»،؛:.!?؟\-–—/\\0-9٠-٩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length > 2) // تجاهل الكلمات القصيرة جداً
    .map(normalizeArabic)
    .filter(w => !ARABIC_STOP_WORDS.has(w) && w.length > 2);
}

export interface KeywordStat {
  keyword: string;
  count: number;
  percentage: number;
}

export interface YearTopicStat {
  year: string;
  topics: Record<string, number>;
}

/**
 * استخراج الكلمات المفتاحية الأكثر تكراراً
 */
export function extractKeywords(titles: string[], topN: number = 20): KeywordStat[] {
  const freq: Record<string, number> = {};
  
  titles.forEach(title => {
    if (!title) return;
    const words = tokenize(title);
    // حساب الكلمات الفريدة لكل عنوان (لا نحسب التكرار داخل نفس العنوان)
    const unique = new Set(words);
    unique.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
  });

  const total = titles.filter(t => !!t).length;
  
  return Object.entries(freq)
    .filter(([, count]) => count >= 2) // على الأقل ظهور في عنوانين
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({
      keyword,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

/**
 * تحليل تطور المواضيع عبر السنوات
 * يستخدم سنة المناقشة/التسجيل لتصنيف الكلمات
 */
export function analyzeTopicTrends(
  data: { title: string; year: string }[],
  topKeywords: string[],
): { year: string; [keyword: string]: string | number }[] {
  // تجميع حسب السنة
  const yearMap: Record<string, Record<string, number>> = {};

  data.forEach(({ title, year }) => {
    if (!title || !year) return;
    // استخراج السنة فقط (أول 4 أرقام)
    const y = year.match(/\d{4}/)?.[0];
    if (!y) return;

    if (!yearMap[y]) yearMap[y] = {};
    const words = new Set(tokenize(title));
    
    topKeywords.forEach(kw => {
      if (words.has(kw)) {
        yearMap[y][kw] = (yearMap[y][kw] || 0) + 1;
      }
    });
  });

  return Object.entries(yearMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, topics]) => ({
      year,
      ...topKeywords.reduce((acc, kw) => ({ ...acc, [kw]: topics[kw] || 0 }), {}),
    }));
}

/**
 * استخراج الكلمات المفتاحية من عناوين الأطروحات العربية
 * يستخدم خوارزمية TF-IDF مع استخراج العبارات (N-grams)
 * يعمل أوفلاين بالكامل بدون مكتبات خارجية
 */

// ═══════════════════════════════════════════════════════════════
// قائمة كلمات التوقف العربية الموسّعة (200+)
// ═══════════════════════════════════════════════════════════════
const ARABIC_STOP_WORDS = new Set([
  // حروف الجر
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'بين', 'حول', 'خلال', 'عبر', 'دون', 'بدون',
  'ضد', 'نحو', 'تحت', 'فوق', 'أمام', 'وراء', 'قبل', 'بعد', 'عند', 'لدى', 'حتى', 'منذ',
  'ضمن', 'لدي', 'كـ', 'لـ', 'بـ',
  // أدوات التعريف والإشارة
  'ال', 'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء', 'أولئك',
  'الذي', 'التي', 'الذين', 'اللذان', 'اللتان', 'اللواتي', 'اللائي',
  // ضمائر
  'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتم', 'أنتن', 'أنتِ',
  // أدوات ربط وعطف
  'و', 'أو', 'ثم', 'لكن', 'بل', 'لا', 'لم', 'لن', 'قد', 'إن', 'أن', 'إذ', 'إذا',
  'كان', 'كانت', 'يكون', 'تكون', 'ما', 'لما', 'كي', 'كيف', 'أين', 'متى', 'كم', 'أي',
  'مما', 'مما', 'حيث', 'بينما', 'عندما', 'كلما', 'لأن', 'لان',
  // أفعال مساعدة وشائعة
  'يتم', 'تم', 'يمكن', 'كانت', 'كان', 'يكون', 'تكون', 'يعد', 'تعد', 'يعتبر', 'تعتبر',
  'له', 'لها', 'لهم', 'لهن', 'فيه', 'فيها', 'عليه', 'عليها', 'منه', 'منها', 'به', 'بها',
  'ذات', 'ذو', 'ذي', 'ذا',
  // كميات وصفات عامة
  'بعض', 'كل', 'جميع', 'أحد', 'غير', 'كثير', 'قليل', 'عدة', 'عدد', 'أكثر', 'أقل',
  'أول', 'آخر', 'ثاني', 'ثالث', 'أخرى', 'أخر', 'نفس', 'مثل', 'سوى',
  // كلمات أكاديمية عامة جداً (غير مميزة)
  'دراسة', 'بحث', 'حالة', 'مساهمة', 'مقاربة', 'تحليل',
  'أثر', 'دور', 'واقع', 'مدى', 'ضوء', 'إطار', 'نموذج',
  'بحثية', 'دراسية', 'علمية', 'أكاديمية',
  'مقدمة', 'خاتمة', 'فصل', 'باب', 'جزء',
  'عام', 'عامة', 'خاص', 'خاصة', 'جديد', 'جديدة',
  'كبير', 'كبيرة', 'صغير', 'صغيرة',
  'أهم', 'أهمية', 'مهم', 'مهمة',
  // حروف جر مركبة
  'بال', 'وال', 'فال', 'لل', 'وفي', 'ومن', 'وعلى',
  // كلمات إنجليزية شائعة
  'the', 'of', 'and', 'in', 'a', 'an', 'to', 'for', 'on', 'with', 'by', 'at', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'study', 'case', 'analysis', 'research', 'impact', 'role', 'effect', 'approach',
  'contribution', 'between', 'through', 'based', 'using', 'about', 'within',
  // كلمات فرنسية شائعة
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'dans', 'sur', 'pour',
  'par', 'avec', 'au', 'aux', 'ce', 'cette', 'ces', 'son', 'sa', 'ses',
  'étude', 'cas', 'analyse', 'recherche', 'impact', 'rôle', 'effet', 'approche',
  'contribution', 'entre',
]);

// ═══════════════════════════════════════════════════════════════
// تطبيع النص العربي
// ═══════════════════════════════════════════════════════════════
function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '') // إزالة التشكيل
    .replace(/ـ/g, '')          // إزالة التطويل
    .trim();
}

// إزالة أداة التعريف "ال" من بداية الكلمة
function removeDefiniteArticle(word: string): string {
  if (word.startsWith('ال') && word.length > 3) {
    return word.substring(2);
  }
  return word;
}

// تقسيم النص إلى كلمات نظيفة
function tokenize(text: string): string[] {
  return text
    .replace(/[()[\]{}"'«»،؛:.!?؟\-–—/\\0-9٠-٩#@&*+=<>~`^|_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length > 1);
}

// تحقق هل الكلمة توقف
function isStopWord(word: string): boolean {
  const normalized = normalizeArabic(word.toLowerCase());
  const withoutAl = removeDefiniteArticle(normalized);
  return ARABIC_STOP_WORDS.has(word.toLowerCase()) ||
    ARABIC_STOP_WORDS.has(normalized) ||
    ARABIC_STOP_WORDS.has(withoutAl) ||
    word.length <= 2;
}

// ═══════════════════════════════════════════════════════════════
// استخراج N-grams (عبارات من كلمتين أو ثلاث)
// ═══════════════════════════════════════════════════════════════
function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n);
    // تجاهل N-gram إذا كانت كل كلماتها كلمات توقف
    const meaningfulCount = gram.filter(w => !isStopWord(w)).length;
    if (meaningfulCount >= Math.ceil(n / 2)) {
      ngrams.push(gram.join(' '));
    }
  }
  return ngrams;
}

// ═══════════════════════════════════════════════════════════════
// خوارزمية TF-IDF
// ═══════════════════════════════════════════════════════════════
interface TfIdfResult {
  term: string;
  score: number;
  docFreq: number; // عدد الوثائق التي ظهر فيها
}

function computeTfIdf(documents: string[][]): TfIdfResult[] {
  const totalDocs = documents.length;
  if (totalDocs === 0) return [];

  // حساب Document Frequency (عدد الوثائق لكل مصطلح)
  const docFreq: Record<string, number> = {};
  documents.forEach(doc => {
    const uniqueTerms = new Set(doc);
    uniqueTerms.forEach(term => {
      docFreq[term] = (docFreq[term] || 0) + 1;
    });
  });

  // حساب TF-IDF لكل مصطلح
  const aggregatedScores: Record<string, { score: number; docFreq: number }> = {};

  documents.forEach(doc => {
    const termCounts: Record<string, number> = {};
    doc.forEach(term => {
      termCounts[term] = (termCounts[term] || 0) + 1;
    });

    const docLength = doc.length;
    if (docLength === 0) return;

    for (const term in termCounts) {
      // TF: تكرار نسبي داخل الوثيقة
      const tf = termCounts[term] / docLength;
      // IDF: log(N / df) — كلما ظهر في وثائق أقل كلما كان أهم
      const idf = Math.log((totalDocs + 1) / (docFreq[term] + 1)) + 1; // smoothed IDF
      const tfIdf = tf * idf;

      if (!aggregatedScores[term]) {
        aggregatedScores[term] = { score: 0, docFreq: docFreq[term] };
      }
      aggregatedScores[term].score += tfIdf;
    }
  });

  return Object.entries(aggregatedScores)
    .map(([term, { score, docFreq: df }]) => ({ term, score, docFreq: df }))
    .sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════
// الواجهة العامة
// ═══════════════════════════════════════════════════════════════
export interface KeywordStat {
  keyword: string;
  count: number;       // عدد الأطروحات التي ظهرت فيها
  percentage: number;  // النسبة المئوية
  score: number;       // درجة TF-IDF
}

export interface YearTopicStat {
  year: string;
  topics: Record<string, number>;
}

/**
 * استخراج الكلمات المفتاحية باستخدام TF-IDF + N-grams
 */
export function extractKeywords(titles: string[], topN: number = 20): KeywordStat[] {
  const validTitles = titles.filter(t => !!t && t.trim().length > 3);
  if (validTitles.length < 2) return [];

  // تحضير الوثائق: استخراج unigrams + bigrams + trigrams
  const documents: string[][] = validTitles.map(title => {
    const tokens = tokenize(title);
    
    // Unigrams (كلمات مفردة غير توقف)
    const unigrams = tokens
      .map(t => normalizeArabic(t.toLowerCase()))
      .filter(t => !isStopWord(t) && t.length > 2);

    // Bigrams (عبارات من كلمتين)
    const normalizedTokens = tokens.map(t => normalizeArabic(t.toLowerCase()));
    const bigrams = extractNgrams(normalizedTokens, 2);
    
    // Trigrams (عبارات من 3 كلمات)
    const trigrams = extractNgrams(normalizedTokens, 3);

    // إعطاء وزن أكبر للعبارات (تكرارها مرتين في القائمة)
    return [...unigrams, ...bigrams, ...bigrams, ...trigrams, ...trigrams, ...trigrams];
  });

  // تطبيق TF-IDF
  const results = computeTfIdf(documents);

  // ترشيح: استبعاد المصطلحات التي ظهرت في وثيقة واحدة فقط
  const filtered = results.filter(r => r.docFreq >= 2);

  // إزالة التكرارات: إذا كانت عبارة bigram تحتوي على unigram بنفس الرتبة، أبقِ الأطول
  const finalResults: TfIdfResult[] = [];
  const addedTerms = new Set<string>();

  for (const result of filtered) {
    // تحقق هل هذا المصطلح جزء من عبارة أطول بدرجة أعلى
    const isSubsumed = finalResults.some(added => {
      if (added.term.includes(result.term) && added.term !== result.term) {
        return added.score >= result.score * 0.5;
      }
      return false;
    });

    if (!isSubsumed && !addedTerms.has(result.term)) {
      finalResults.push(result);
      addedTerms.add(result.term);
    }

    if (finalResults.length >= topN) break;
  }

  return finalResults.map(r => ({
    keyword: r.term,
    count: r.docFreq,
    percentage: validTitles.length > 0 ? Math.round((r.docFreq / validTitles.length) * 100) : 0,
    score: Math.round(r.score * 100) / 100,
  }));
}

/**
 * تحليل تطور المواضيع عبر السنوات
 */
export function analyzeTopicTrends(
  data: { title: string; year: string }[],
  topKeywords: string[],
): { year: string; [keyword: string]: string | number }[] {
  const yearMap: Record<string, Record<string, number>> = {};

  data.forEach(({ title, year }) => {
    if (!title || !year) return;
    const y = year.match(/\d{4}/)?.[0];
    if (!y) return;

    if (!yearMap[y]) yearMap[y] = {};

    const normalizedTitle = normalizeArabic(title.toLowerCase());

    topKeywords.forEach(kw => {
      // البحث عن الكلمة المفتاحية في العنوان المطبّع
      const normalizedKw = normalizeArabic(kw.toLowerCase());
      if (normalizedTitle.includes(normalizedKw)) {
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

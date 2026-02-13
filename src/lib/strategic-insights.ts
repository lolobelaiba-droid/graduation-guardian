/**
 * Strategic AI Insights Engine
 * Generates text-based diagnosis, cross-analysis, and recommendations
 * based on KPI values.
 */

import type { KpiResult } from "./kpi-calculator";

export interface InsightCard {
  type: "warning" | "success" | "info" | "strategy" | "recommendation";
  title: string;
  text: string;
}

interface InsightsInput {
  kpi: KpiResult;
  avgRegYearsLmd: number;
  avgRegYearsScience: number;
  avgDefYearsLmd: number;
  avgDefYearsScience: number;
  englishThesesCount: number;
  assistantProfessorsCount: number;
  /** % of delayed students among defended */
  delayedDefendedPercent: number;
}

export function generateStrategicInsights(input: InsightsInput): InsightCard[] {
  const cards: InsightCard[] = [];
  const { kpi } = input;

  // ─── 1. Individual KPI Diagnosis ───────────────────────────────

  // Flow Effectiveness
  if (kpi.flowEffectiveness < 10) {
    cards.push({
      type: "warning",
      title: "تنبيه: ركود في الفعالية التدفقية",
      text: "وجود ركود حاد في تخرّج الطلبة؛ الكلية تعاني من تراكم طلابي دون مخرجات فعلية، مما يستوجب مراجعة العوائق العلمية والإجرائية داخل المخابر.",
    });
  } else if (kpi.flowEffectiveness > 25) {
    cards.push({
      type: "success",
      title: "إشادة: تدفق طلابي ممتاز",
      text: "تدفق طلابي ممتاز يعكس ديناميكية عالية في تخرّج الكتلة الطلابية وتجديدها سنوياً.",
    });
  }

  // Speed of Achievement (Time-to-Degree)
  const avgDefAll = (input.avgDefYearsLmd + input.avgDefYearsScience) / 2;
  if (input.avgDefYearsLmd > 5 || input.avgDefYearsScience > 6) {
    cards.push({
      type: "warning",
      title: "تحليل: ترهل في زمن التكوين",
      text: "هناك ترهل في زمن التكوين؛ المسار الدكتورالي يستنزف وقتاً طويلاً. يوصى بتفعيل دور لجان المرافقة العلمية لتقليص مدة البحث.",
    });
  } else if (input.avgDefYearsLmd > 0 && input.avgDefYearsLmd < 4) {
    cards.push({
      type: "success",
      title: "تميز: كفاءة عالية في التأطير",
      text: "كفاءة عالية في التأطير والمتابعة؛ الطلبة ينهون أطروحاتهم في زمن قياسي مما يعزز كفاءة الإنتاج العلمي بالكلية.",
    });
  }

  // Time Quality
  if (input.delayedDefendedPercent > 40) {
    cards.push({
      type: "warning",
      title: "خلل: غلبة ثقافة التمديد الاستثنائي",
      text: "غلبة ثقافة التمديد الاستثنائي؛ يوصى بتفعيل الرقابة الصارمة على مسيرة الطالب من السنة الثانية وتبرير كل طلب تمديد.",
    });
  }

  // Administrative Effectiveness
  if (kpi.administrativeEffectiveness <= 40) {
    cards.push({
      type: "warning",
      title: "تشخيص: بطء إداري ملحوظ",
      text: "عدم وجود تسهيلات إدارية؛ يوصى بمتابعة إدارية لكل مراحل المناقشة ومتابعة مسار التقارير وتحديد سقف زمني ملزم للخبراء والمجالس العلمية.",
    });
  }

  // ─── 2. Cross-Analysis ─────────────────────────────────────────

  // Bureaucratic Gap: good students but slow administration
  if (kpi.timeQuality > 80 && kpi.administrativeEffectiveness <= 40) {
    cards.push({
      type: "strategy",
      title: "تحليل استراتيجي: الفجوة البيروقراطية",
      text: "إحباط للمكتسبات العلمية؛ الطلبة منضبطون علمياً لكن لا توجد تسهيلات إدارية. يجب تحسين سرعة المعالجة الإدارية حفاظاً على مكتسبات الجودة الزمنية.",
    });
  }

  // Pedagogical Stagnation: fast admin but slow research
  if (kpi.administrativeEffectiveness >= 70 && kpi.speedOfAchievement < 50) {
    cards.push({
      type: "strategy",
      title: "تحليل استراتيجي: الركود البيداغوجي",
      text: "البيئة الإدارية مثالية لكن الخلل يكمن في الإنتاجية العلمية؛ الإدارة مستعدة والملفات لا تصل من المخابر. يجب تنشيط دور المشرفين ولجان المرافقة.",
    });
  }

  // ─── 3. Executive Recommendations ──────────────────────────────

  if (input.englishThesesCount <= 2) {
    cards.push({
      type: "recommendation",
      title: "توصية: تعزيز المناقشات بالإنجليزية",
      text: "يوصى بزيادة عدد المناقشات باللغة الإنجليزية لتعزيز الانفتاح الدولي ورفع مستوى النشر في المجلات العالمية المصنفة.",
    });
  }

  if (input.assistantProfessorsCount > 0) {
    cards.push({
      type: "recommendation",
      title: "توصية: دعم الأساتذة المساعدين",
      text: "يوصى بدعم الأساتذة المساعدين (أ، ب) لتسريع مناقشاتهم وترقيتهم لتعزيز كتلة التأطير في الكلية والمخابر.",
    });
  }

  return cards;
}

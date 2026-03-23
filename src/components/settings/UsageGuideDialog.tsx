import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface GuideSection {
  title: string;
  content: string[];
}

interface UsageGuideDialogProps {
  title: string;
  sections: GuideSection[];
}

export default function UsageGuideDialog({ title, sections }: UsageGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BookOpen className="h-4 w-4 ml-1" />
        دليل الاستخدام
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-2">
              {sections.map((section, i) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  >
                    <span>{section.title}</span>
                    {expandedIndex === i ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedIndex === i && (
                    <div className="px-4 pb-3 space-y-2 text-sm text-muted-foreground animate-fade-in">
                      {section.content.map((line, j) => (
                        <p key={j} className="leading-relaxed">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============== بيانات الدليل ===============

export const networkGuide: GuideSection[] = [
  {
    title: "1. ما هو وضع الشبكة؟",
    content: [
      "وضع الشبكة يتيح لعدة أجهزة كمبيوتر في نفس الشبكة المحلية العمل على نفس قاعدة البيانات في آن واحد.",
      "يتم ذلك عبر مجلد مشترك (Shared Folder) يُنشأ على أحد الأجهزة أو على خادم الملفات.",
    ],
  },
  {
    title: "2. كيفية إعداد المجلد المشترك",
    content: [
      "• على الجهاز الرئيسي: أنشئ مجلداً جديداً (مثال: C:\\SharedDB) وشاركه على الشبكة مع صلاحيات القراءة والكتابة.",
      "• على Windows: انقر يمين → خصائص → مشاركة → مشاركة متقدمة → فعّل المشاركة وامنح صلاحيات كاملة.",
      "• انسخ مسار الشبكة الذي سيظهر (مثال: \\\\PC-NAME\\SharedDB).",
      "• الصق المسار في حقل 'مسار المجلد المشترك' واضغط 'اختبار' للتأكد من إمكانية الوصول والكتابة.",
      "• إذا نجح الاختبار، اضغط 'حفظ وتفعيل' ثم أعد تشغيل البرنامج.",
    ],
  },
  {
    title: "3. إعداد الأجهزة الفرعية",
    content: [
      "• على كل جهاز فرعي، افتح البرنامج واذهب إلى إعدادات الشبكة.",
      "• أدخل نفس مسار المجلد المشترك المستخدم في الجهاز الرئيسي.",
      "• اختبر الاتصال واحفظ الإعدادات ثم أعد التشغيل.",
      "• كل جهاز يتعرّف تلقائياً بمعرّف فريد (UUID) ثابت لا يتغير حتى لو تغيّر عنوان IP.",
    ],
  },
  {
    title: "4. لوحة الأجهزة المتصلة",
    content: [
      "• تعرض جميع الأجهزة التي اتصلت بالمجلد المشترك مع حالة كل جهاز (متصل / غير متصل).",
      "• يمكنك تعيين اسم مستعار لكل جهاز لسهولة التعرف عليه (مثال: 'جهاز الاستقبال').",
      "• الجهاز يُعتبر 'متصل' إذا كان نشطاً خلال آخر 5 دقائق.",
    ],
  },
  {
    title: "5. النسخ الاحتياطي المركزي",
    content: [
      "• يمكنك أخذ نسخة احتياطية من كامل المجلد المشترك وحفظها محلياً على جهازك.",
      "• يُنصح بعمل نسخ احتياطي دوري من الجهاز الرئيسي لضمان سلامة البيانات.",
    ],
  },
  {
    title: "6. فصل الاتصال بالشبكة",
    content: [
      "• يمكنك فصل الجهاز عن الشبكة والعودة للوضع المحلي في أي وقت.",
      "• بعد الفصل ستعمل على قاعدة بيانات محلية مستقلة.",
      "• أعد تشغيل البرنامج بعد الفصل لتفعيل التغيير.",
    ],
  },
  {
    title: "7. نصائح لتجنب المشاكل",
    content: [
      "• تأكد أن جدار الحماية (Firewall) يسمح بمشاركة الملفات على الشبكة.",
      "• لا تغلق الجهاز الذي يحتوي على المجلد المشترك أثناء عمل الأجهزة الأخرى.",
      "• في حال تغيّر اسم الكمبيوتر المضيف، قم بتحديث المسار في جميع الأجهزة.",
      "• استخدم كابل شبكة (Ethernet) بدلاً من Wi-Fi للحصول على أداء أفضل.",
    ],
  },
];

export const userManagementGuide: GuideSection[] = [
  {
    title: "1. نظرة عامة",
    content: [
      "يتيح لك نظام إدارة المستخدمين التحكم في من يمكنه الوصول للبرنامج وما هي صلاحياته.",
      "يوجد نوعان من الأدوار: مدير (صلاحيات كاملة) وموظف (صلاحيات محدودة).",
    ],
  },
  {
    title: "2. إضافة مستخدم جديد",
    content: [
      "• اضغط على زر 'إضافة مستخدم' في أعلى الصفحة.",
      "• أدخل الاسم الكامل واسم المستخدم (للدخول) وكلمة المرور (4 أحرف على الأقل).",
      "• اختر الدور: مدير أو موظف.",
      "• اضغط 'إضافة' لحفظ المستخدم الجديد.",
    ],
  },
  {
    title: "3. الفرق بين المدير والموظف",
    content: [
      "• المدير: يملك كافة الصلاحيات بما فيها الحذف، إدارة المستخدمين، الإعدادات، النسخ الاحتياطي، وإدارة الشبكة.",
      "• الموظف: يمكنه عرض البيانات، إضافة وتعديل السجلات، التصدير والاستيراد، وطباعة الشهادات.",
      "• الموظف لا يمكنه: الحذف، إدارة المستخدمين، تعديل الإعدادات العامة، أو إدارة الشبكة.",
      "• لعرض تفصيل الصلاحيات، اضغط على شارة الدور في جدول المستخدمين أو زر 'صلاحيات الموظف'.",
    ],
  },
  {
    title: "4. تعديل مستخدم",
    content: [
      "• اضغط على أيقونة التعديل (✏️) بجانب المستخدم المطلوب.",
      "• يمكنك تغيير الاسم، اسم المستخدم، الدور، أو كلمة المرور.",
      "• لتغيير كلمة المرور: أدخل كلمة جديدة. لتركها كما هي: اترك الحقل فارغاً.",
    ],
  },
  {
    title: "5. تفعيل / تعطيل مستخدم",
    content: [
      "• يمكن للمدير تعطيل حساب مستخدم دون حذفه عبر مفتاح التفعيل في عمود 'الحالة'.",
      "• المستخدم المعطّل لن يتمكن من تسجيل الدخول حتى يُعاد تفعيله.",
      "• لا يمكنك تعطيل حسابك الخاص.",
    ],
  },
  {
    title: "6. تغيير كلمة المرور الشخصية",
    content: [
      "• اضغط على زر 'تغيير كلمة المرور' في أعلى الصفحة.",
      "• أدخل كلمة المرور الحالية ثم الجديدة مع التأكيد.",
      "• يجب أن تكون كلمة المرور الجديدة 4 أحرف على الأقل.",
    ],
  },
  {
    title: "7. صورة المستخدم",
    content: [
      "• يمكنك تعيين صورة شخصية لكل مستخدم تظهر في القائمة الجانبية.",
      "• اضغط على أيقونة التعديل بجانب المستخدم ثم اختر صورة من جهازك.",
      "• الصور المدعومة: JPG, PNG, WEBP بحجم أقصى 500 كيلوبايت.",
      "• يمكنك إزالة الصورة في أي وقت والعودة للأيقونة الافتراضية.",
    ],
  },
  {
    title: "8. حذف مستخدم",
    content: [
      "• اضغط على أيقونة الحذف (🗑️) بجانب المستخدم واؤكد الحذف.",
      "• لا يمكنك حذف حسابك الخاص.",
      "• ⚠️ الحذف نهائي ولا يمكن التراجع عنه.",
    ],
  },
];

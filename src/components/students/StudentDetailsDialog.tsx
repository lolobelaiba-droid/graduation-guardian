import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CertificateType, MentionType, Certificate } from "@/types/certificates";
import { certificateTypeLabels, mentionLabels } from "@/types/certificates";
import { formatCertificateDate, formatDefenseDate, formatCertificateIssueDate } from "@/lib/numerals";
import { useDateFormatSettings } from "@/hooks/useDateFormatSettings";

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Certificate | null;
  certificateType: CertificateType;
}

interface DetailRowProps {
  label: string;
  value: string | null | undefined;
  isRtl?: boolean;
}

function DetailRow({ label, value, isRtl = true }: DetailRowProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-3">
      <Separator className="flex-1" />
      <span className="text-sm font-semibold text-primary">{children}</span>
      <Separator className="flex-1" />
    </div>
  );
}

const thesisLanguageLabels: Record<string, string> = {
  arabic: 'العربية',
  french: 'الفرنسية',
  english: 'الإنجليزية',
};

export default function StudentDetailsDialog({
  open,
  onOpenChange,
  student,
  certificateType,
}: StudentDetailsDialogProps) {
  const { settings: dateFormatSettings } = useDateFormatSettings();
  
  if (!student) return null;

  const formatBirthDate = (dateStr: string) => formatCertificateDate(dateStr, true, dateFormatSettings);
  const formatDefenseDateValue = (dateStr: string) => formatDefenseDate(dateStr, true, dateFormatSettings);
  const formatCertificateDateValue = (dateStr: string) => formatCertificateIssueDate(dateStr, true, dateFormatSettings);
  const formatSystemDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("ar-SA");

  const isPhdLmd = certificateType === "phd_lmd";
  const isPhdScience = certificateType === "phd_science";
  const hasThesis = isPhdLmd || isPhdScience;
  const hasJury = isPhdLmd || isPhdScience;
  const hasField = isPhdLmd;
  const isPhd = isPhdLmd || isPhdScience;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>تفاصيل الطالب</span>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {certificateTypeLabels[certificateType].ar}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {/* Personal Information */}
          <SectionTitle>المعلومات الشخصية</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <DetailRow label="رقم الشهادة" value={student.student_number} />
            {isPhd && student.registration_number && (
              <DetailRow label="رقم التسجيل" value={student.registration_number} />
            )}
            <DetailRow label="الاسم بالعربية" value={student.full_name_ar} />
            <DetailRow label="الاسم بالفرنسية" value={student.full_name_fr} isRtl={false} />
            <DetailRow label="الجنس" value={student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : student.gender} />
            <DetailRow label="تاريخ الميلاد" value={formatBirthDate(student.date_of_birth)} />
            <DetailRow label="مكان الميلاد بالعربية" value={student.birthplace_ar} />
            <DetailRow label="مكان الميلاد بالفرنسية" value={student.birthplace_fr} isRtl={false} />
          </div>

          {/* Academic Information */}
          <SectionTitle>المعلومات الأكاديمية</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <DetailRow label="الجامعة" value={student.university_ar} />
            <DetailRow label="الجامعة (فرنسي)" value={student.university_fr} isRtl={false} />
            <DetailRow label="الكلية" value={student.faculty_ar} />
            <DetailRow label="الكلية (فرنسي)" value={student.faculty_fr} isRtl={false} />
            {hasField && 'field_ar' in student && (
              <>
                <DetailRow label="الميدان بالعربية" value={student.field_ar} />
                <DetailRow label="الميدان بالفرنسية" value={student.field_fr} isRtl={false} />
              </>
            )}
            <DetailRow label="الشعبة بالعربية" value={student.branch_ar} />
            <DetailRow label="الشعبة بالفرنسية" value={student.branch_fr} isRtl={false} />
            <DetailRow label="التخصص بالعربية" value={student.specialty_ar} />
            <DetailRow label="التخصص بالفرنسية" value={student.specialty_fr} isRtl={false} />
            <DetailRow 
              label="التقدير" 
              value={mentionLabels[student.mention as MentionType]?.ar || student.mention} 
            />
            {isPhd && (
              <DetailRow label="سنة أول تسجيل" value={student.first_registration_year} />
            )}
          </div>

          {/* Thesis Information */}
          {hasThesis && 'thesis_title_ar' in student && (
            <>
              <SectionTitle>عنوان الأطروحة</SectionTitle>
              <div className="space-y-2">
                <DetailRow label="عنوان الأطروحة" value={student.thesis_title_ar} />
                {isPhd && student.thesis_language && (
                  <DetailRow 
                    label="لغة الأطروحة" 
                    value={thesisLanguageLabels[student.thesis_language] || student.thesis_language} 
                  />
                )}
              </div>
            </>
          )}

          {/* Jury Information */}
          {hasJury && 'jury_president_ar' in student && (
            <>
              <SectionTitle>لجنة المناقشة</SectionTitle>
              <div className="space-y-2">
                <DetailRow label="رئيس اللجنة" value={student.jury_president_ar} />
                <DetailRow label="أعضاء اللجنة" value={student.jury_members_ar} />
              </div>
            </>
          )}

          {/* Supervisor & Research Lab */}
          {isPhd && (
            <>
              <SectionTitle>المشرف ومخبر البحث</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {'supervisor_ar' in student && (
                  <DetailRow label="المشرف" value={student.supervisor_ar} />
                )}
                {student.supervisor_university && (
                  <DetailRow label="جامعة انتماء المشرف" value={student.supervisor_university} />
                )}
                {student.co_supervisor_ar && (
                  <DetailRow label="مساعد المشرف" value={student.co_supervisor_ar} />
                )}
                {student.co_supervisor_university && (
                  <DetailRow label="جامعة انتماء مساعد المشرف" value={student.co_supervisor_university} />
                )}
                {student.research_lab_ar && (
                  <DetailRow label="مخبر البحث" value={student.research_lab_ar} />
                )}
              </div>
            </>
          )}

          {/* PhD Reference Data */}
          {isPhd && (
            <>
              <SectionTitle>بيانات إضافية</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {student.employment_status && (
                  <DetailRow label="الحالة الوظيفية" value={student.employment_status} />
                )}
                {student.registration_type && (
                  <DetailRow label="نوع التسجيل" value={student.registration_type} />
                )}
                {student.inscription_status && (
                  <DetailRow label="حالة التسجيل" value={student.inscription_status} />
                )}
                {student.current_year && (
                  <DetailRow label="سنة التسجيل" value={student.current_year} />
                )}
                {student.registration_count && (
                  <DetailRow label="عدد التسجيلات" value={String(student.registration_count)} />
                )}
                {student.professional_email && (
                  <DetailRow label="البريد الإلكتروني" value={student.professional_email} isRtl={false} />
                )}
                {student.phone_number && (
                  <DetailRow label="رقم الهاتف" value={student.phone_number} isRtl={false} />
                )}
              </div>
              {student.notes && (
                <DetailRow label="ملاحظات" value={student.notes} />
              )}
            </>
          )}

          {/* Dates */}
          <SectionTitle>التواريخ</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <DetailRow label="تاريخ المناقشة" value={formatDefenseDateValue(student.defense_date)} />
            <DetailRow label="تاريخ الشهادة" value={formatCertificateDateValue(student.certificate_date)} />
            <DetailRow label="تاريخ الإنشاء" value={formatSystemDate(student.created_at)} />
            <DetailRow label="آخر تحديث" value={formatSystemDate(student.updated_at)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PhdStudent, PhdStudentType, PhdLmdStudent } from "@/types/phd-students";
import { phdStudentTypeLabels, studentStatusLabels } from "@/types/phd-students";
import { formatCertificateDate } from "@/lib/numerals";

interface ViewPhdStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: PhdStudent | null;
  studentType: PhdStudentType;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "-"}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Separator className="flex-1" />
      <span className="text-sm font-semibold text-primary whitespace-nowrap">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

export function ViewPhdStudentDialog({ open, onOpenChange, student, studentType }: ViewPhdStudentDialogProps) {
  if (!student) return null;

  const showFieldField = studentType === 'phd_lmd' || studentType === 'phd_science';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تفاصيل الطالب
            <Badge variant="secondary">{phdStudentTypeLabels[studentType].ar}</Badge>
            <Badge 
              variant="outline" 
              className={studentStatusLabels[student.status]?.color || ""}
            >
              {studentStatusLabels[student.status]?.ar || student.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* Basic Info */}
          <SectionHeader title="المعلومات الأساسية" />
          <InfoRow label="رقم التسجيل" value={student.registration_number} />
          <InfoRow label="سنة أول تسجيل" value={student.first_registration_year} />

          {/* Personal Info */}
          <SectionHeader title="المعلومات الشخصية" />
          <InfoRow label="الاسم بالعربية" value={student.full_name_ar} />
          <InfoRow label="الاسم بالفرنسية" value={student.full_name_fr} />
          <InfoRow label="الجنس" value={student.gender === 'male' ? 'ذكر' : 'أنثى'} />
          <InfoRow label="تاريخ الميلاد" value={formatCertificateDate(student.date_of_birth)} />
          <InfoRow label="مكان الميلاد" value={student.birthplace_ar} />
          <InfoRow label="مكان الميلاد (فرنسي)" value={student.birthplace_fr} />

          {/* Contact Info */}
          <SectionHeader title="معلومات الاتصال" />
          <InfoRow label="البريد الإلكتروني" value={student.professional_email} />
          <InfoRow label="رقم الهاتف" value={student.phone_number} />

          {/* Academic Info */}
          <SectionHeader title="المعلومات الأكاديمية" />
          <InfoRow label="الجامعة" value={student.university_ar} />
          <InfoRow label="الكلية" value={student.faculty_ar} />
          {showFieldField && <InfoRow label="الميدان" value={(student as PhdLmdStudent).field_ar} />}
          <InfoRow label="الشعبة" value={student.branch_ar} />
          <InfoRow label="التخصص" value={student.specialty_ar} />
          <InfoRow label="مخبر البحث" value={student.research_lab_ar} />

          {/* Supervisor */}
          <SectionHeader title="الإشراف" />
          <InfoRow label="المشرف" value={student.supervisor_ar} />

          {/* Thesis */}
          {student.thesis_title_ar && (
            <>
              <SectionHeader title="الأطروحة" />
              <div className="py-2">
                <span className="text-muted-foreground block mb-1">عنوان الأطروحة</span>
                <p className="font-medium text-foreground leading-relaxed" dir="auto">
                  {student.thesis_title_ar}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {student.notes && (
            <>
              <SectionHeader title="ملاحظات" />
              <div className="py-2">
                <p className="text-foreground leading-relaxed" dir="auto">
                  {student.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

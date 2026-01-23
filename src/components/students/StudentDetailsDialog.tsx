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

export default function StudentDetailsDialog({
  open,
  onOpenChange,
  student,
  certificateType,
}: StudentDetailsDialogProps) {
  if (!student) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA");
  };

  const isPhdLmd = certificateType === "phd_lmd";
  const isPhdScience = certificateType === "phd_science";
  const hasThesis = isPhdLmd || isPhdScience;
  const hasJury = isPhdLmd || isPhdScience;
  const hasField = isPhdLmd;

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
            <DetailRow label="رقم الطالب" value={student.student_number} />
            <DetailRow label="الاسم بالعربية" value={student.full_name_ar} />
            <DetailRow label="الاسم بالفرنسية" value={student.full_name_fr} isRtl={false} />
            <DetailRow label="تاريخ الميلاد" value={formatDate(student.date_of_birth)} />
            <DetailRow label="مكان الميلاد بالعربية" value={student.birthplace_ar} />
            <DetailRow label="مكان الميلاد بالفرنسية" value={student.birthplace_fr} isRtl={false} />
          </div>

          {/* Academic Information */}
          <SectionTitle>المعلومات الأكاديمية</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
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
          </div>

          {/* Thesis Information */}
          {hasThesis && 'thesis_title_ar' in student && (
            <>
              <SectionTitle>معلومات الأطروحة</SectionTitle>
              <div className="space-y-2">
                <DetailRow label="عنوان الأطروحة بالعربية" value={student.thesis_title_ar} />
                <DetailRow label="عنوان الأطروحة بالفرنسية" value={student.thesis_title_fr} isRtl={false} />
              </div>
            </>
          )}

          {/* Jury Information */}
          {hasJury && 'jury_president_ar' in student && (
            <>
              <SectionTitle>لجنة المناقشة</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailRow label="رئيس اللجنة بالعربية" value={student.jury_president_ar} />
                <DetailRow label="رئيس اللجنة بالفرنسية" value={student.jury_president_fr} isRtl={false} />
              </div>
              <div className="space-y-2">
                <DetailRow label="أعضاء اللجنة بالعربية" value={student.jury_members_ar} />
                <DetailRow label="أعضاء اللجنة بالفرنسية" value={student.jury_members_fr} isRtl={false} />
              </div>
            </>
          )}

          {/* Dates */}
          <SectionTitle>التواريخ</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <DetailRow label="تاريخ المناقشة" value={formatDate(student.defense_date)} />
            <DetailRow label="تاريخ الشهادة" value={formatDate(student.certificate_date)} />
            <DetailRow label="تاريخ الإنشاء" value={formatDate(student.created_at)} />
            <DetailRow label="آخر تحديث" value={formatDate(student.updated_at)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

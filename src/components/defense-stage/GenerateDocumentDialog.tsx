import { useState, useRef, useEffect } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  useUpdateDefenseStageLmd,
  useUpdateDefenseStageScience,
} from "@/hooks/useDefenseStage";
import {
  useDefenseDocTemplates,
  DEFAULT_VARIABLES,
  DEFAULT_JURY_TABLE_SETTINGS,
  type JuryTableSettings,
} from "@/hooks/useDefenseDocTemplates";
import { parseJury, type JuryMember } from "@/components/ui/jury-table-input";
import { useAcademicTitles } from "@/hooks/useAcademicTitles";
import { useProfessors } from "@/hooks/useProfessors";
import type { DefenseStageStudent, DefenseStageType } from "@/types/defense-stage";
import { toast } from "sonner";

const JURY_ROLE_DOC_LABELS: Record<string, string> = {
  president: "رئيسا",
  supervisor: "مشرفا ومقررا",
  co_supervisor: "مشرفا مساعدا",
  examiner: "ممتحنا",
  invited: "عضوا مدعوا",
};

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: DefenseStageStudent | null;
  studentType: DefenseStageType;
  documentType: "jury_decision" | "defense_auth";
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  student,
  studentType,
  documentType,
}: GenerateDocumentDialogProps) {
  // For jury_decision: decision_number + decision_date
  // For defense_auth: auth_decision_number + auth_decision_date + dean_letter_number + dean_letter_date
  const [decisionNumber, setDecisionNumber] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [deanLetterNumber, setDeanLetterNumber] = useState("");
  const [deanLetterDate, setDeanLetterDate] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const updateLmd = useUpdateDefenseStageLmd();
  const updateScience = useUpdateDefenseStageScience();
  const { data: templates = [] } = useDefenseDocTemplates();
  const { titles: academicTitles } = useAcademicTitles();
  const { findProfessor } = useProfessors();
  const ranks = academicTitles.map(t => ({ label: t.full_name, abbreviation: t.abbreviation }));

  const fullDocType = `${documentType}_${studentType === "phd_lmd" ? "lmd" : "science"}`;
  const template = templates.find((t) => t.document_type === fullDocType);

  const isJuryDecision = documentType === "jury_decision";

  useEffect(() => {
    if (open && student) {
      if (isJuryDecision) {
        setDecisionNumber(student.decision_number || "");
        setDecisionDate(student.decision_date || "");
      } else {
        setDecisionNumber(student.auth_decision_number || "");
        setDecisionDate(student.auth_decision_date || "");
        setDeanLetterNumber(student.dean_letter_number || "");
        setDeanLetterDate(student.dean_letter_date || "");
      }
      setShowPreview(false);
    }
  }, [open, student, isJuryDecision]);

  const handleGenerate = async () => {
    if (!isJuryDecision) {
      if (!decisionNumber.trim()) {
        toast.error("يرجى إدخال رقم المقرر");
        return;
      }
      if (!decisionDate.trim()) {
        toast.error("يرجى إدخال تاريخ المقرر");
        return;
      }
      if (!deanLetterNumber.trim()) {
        toast.error("يرجى إدخال رقم إرسال العميد");
        return;
      }
      if (!deanLetterDate.trim()) {
        toast.error("يرجى إدخال تاريخ إرسال العميد");
        return;
      }
    }
    if (!student) return;

    try {
      const mutation = studentType === "phd_lmd" ? updateLmd : updateScience;
      const updateData: Record<string, string> = {};

      if (isJuryDecision) {
        updateData.decision_number = decisionNumber.trim();
        updateData.decision_date = decisionDate.trim();
      } else {
        updateData.auth_decision_number = decisionNumber.trim();
        updateData.auth_decision_date = decisionDate.trim();
        updateData.dean_letter_number = deanLetterNumber.trim();
        updateData.dean_letter_date = deanLetterDate.trim();
      }

      await mutation.mutateAsync({ id: student.id, ...updateData });
      setShowPreview(true);
    } catch {
      // Error handled by hook
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة");
      return;
    }

    const content = printRef.current.innerHTML;
    const fontFamily = template?.font_family || "IBM Plex Sans Arabic";

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>${template?.title || "وثيقة"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 20mm; }
  body {
    font-family: '${fontFamily}', sans-serif;
    font-size: ${template?.font_size || 14}px;
    line-height: ${template?.line_height || 1.8};
    direction: rtl;
    color: #000;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #333; padding: 8px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  .variable-tag { background: transparent !important; color: inherit !important; padding: 0 !important; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>${content}</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const buildJuryTableHtml = (members: JuryMember[]): string => {
    const jts: JuryTableSettings = template?.jury_table_settings || DEFAULT_JURY_TABLE_SETTINGS;
    const thStyle = `border: 1px solid ${jts.border_color}; padding: ${jts.padding}px; text-align: center; background: ${jts.header_bg}; font-weight: bold; font-size: ${jts.font_size}px;`;
    const tdStyle = `border: 1px solid ${jts.border_color}; padding: ${jts.padding}px; text-align: center; font-size: ${jts.font_size}px;`;
    
    let html = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; direction: rtl;" border="1">
<thead><tr>`;
    if (jts.show_number) html += `<th style="${thStyle} width: ${jts.col_number_width}%;">رقم</th>`;
    html += `<th style="${thStyle} width: ${jts.col_name_width}%;">الاسم واللقب</th>`;
    if (jts.show_rank) html += `<th style="${thStyle} width: ${jts.col_rank_width}%;">الرتبة</th>`;
    if (jts.show_university) html += `<th style="${thStyle} width: ${jts.col_university_width}%;">مؤسسة الانتماء</th>`;
    if (jts.show_role) html += `<th style="${thStyle} width: ${jts.col_role_width}%;">الصفة</th>`;
    html += `</tr></thead><tbody>`;

    members.forEach((m, i) => {
      const displayName = (jts.include_abbreviation && m.rankAbbreviation)
        ? `${m.rankAbbreviation} ${m.name}`.trim() 
        : m.name;
      const roleLabel = JURY_ROLE_DOC_LABELS[m.role] || m.role;
      html += `<tr>`;
      if (jts.show_number) html += `<td style="${tdStyle}">${i + 1}</td>`;
      html += `<td style="${tdStyle}">${displayName || '&nbsp;'}</td>`;
      if (jts.show_rank) html += `<td style="${tdStyle}">${m.rankLabel || '&nbsp;'}</td>`;
      if (jts.show_university) html += `<td style="${tdStyle}">${m.university || '&nbsp;'}</td>`;
      if (jts.show_role) html += `<td style="${tdStyle}">${roleLabel}</td>`;
      html += `</tr>`;
    });

    html += '</tbody></table>';
    return html;
  };

  const getRenderedContent = () => {
    if (!template || !student) return "";

    const facultyAr = student.faculty_ar || "";
    const facultyHeadTitle = facultyAr.includes("معهد") ? "مدير" : "عميد";

    // Parse jury members dynamically
    const juryMembers = parseJury(
      student.jury_president_ar || "",
      student.jury_members_ar || "",
      student.supervisor_ar || "",
      student.supervisor_university || "",
      student.co_supervisor_ar || "",
      student.co_supervisor_university || "",
      ranks
    );

    // Enrich jury members with professor data (rank + university) from professor registry
    const enrichedJuryMembers = juryMembers.map((member) => {
      if (!member.name?.trim()) return member;
      const prof = findProfessor(member.name);
      if (!prof) return member;
      return {
        ...member,
        name: prof.full_name || member.name,
        rankLabel: member.rankLabel || prof.rank_label || "",
        rankAbbreviation: member.rankAbbreviation || prof.rank_abbreviation || "",
        university: member.university || prof.university || "",
      };
    });

    const variables: Record<string, string> = {
      decision_number: student.decision_number || "",
      decision_date: student.decision_date || "",
      auth_decision_number: isJuryDecision ? "" : decisionNumber,
      auth_decision_date: isJuryDecision ? "" : decisionDate,
      dean_letter_number: isJuryDecision ? "" : deanLetterNumber,
      dean_letter_date: isJuryDecision ? "" : deanLetterDate,
      faculty_head_title: facultyHeadTitle,
      full_name_ar: student.full_name_ar || "",
      full_name_fr: student.full_name_fr || "",
      gender: student.gender || "male",
      date_of_birth: student.date_of_birth || "",
      birthplace_ar: student.birthplace_ar || "",
      province: student.province || "",
      registration_number: student.registration_number || "",
      university_ar: student.university_ar || "",
      faculty_ar: facultyAr,
      field_ar: student.field_ar || "",
      branch_ar: student.branch_ar || "",
      specialty_ar: student.specialty_ar || "",
      thesis_title_ar: student.thesis_title_ar || "",
      thesis_title_fr: student.thesis_title_fr || "",
      supervisor_ar: student.supervisor_ar || "",
      supervisor_university: student.supervisor_university || "",
      co_supervisor_ar: student.co_supervisor_ar || "",
      co_supervisor_university: student.co_supervisor_university || "",
      jury_president_ar: student.jury_president_ar || "",
      jury_members_ar: student.jury_members_ar || "",
      jury_table: buildJuryTableHtml(enrichedJuryMembers),
      scientific_council_date: student.scientific_council_date || "",
      defense_date: student.defense_date || "",
      signature_title: student.signature_title || "",
      first_registration_year: student.first_registration_year || "",
      research_lab_ar: student.research_lab_ar || "",
      current_year: student.current_year || "",
      decree_training: student.decree_training || "",
      decree_accreditation: student.decree_accreditation || "",
    };

    // For jury decision, override with the just-entered values
    if (isJuryDecision) {
      variables.decision_number = decisionNumber;
      variables.decision_date = decisionDate;
    }

    let content = template.content;
    content = content.replace(
      /<span[^>]*class="variable-tag"[^>]*>\{\{(\w+)\}\}<\/span>/g,
      (_, key) => variables[key] ?? `{{${key}}}`
    );
    content = content.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => variables[key] ?? `{{${key}}}`
    );

    return content;
  };

  const docTitle = isJuryDecision ? "توليد مقرر تعيين لجنة المناقشة" : "توليد ترخيص المناقشة";
  const numberLabel = isJuryDecision ? "رقم مقرر اللجنة" : "رقم مقرر الترخيص *";
  const dateLabel = isJuryDecision ? "تاريخ مقرر اللجنة" : "تاريخ مقرر الترخيص *";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showPreview ? "max-w-4xl max-h-[95vh] overflow-y-auto" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {docTitle}
          </DialogTitle>
          <DialogDescription>
            {!showPreview
              ? `أدخل بيانات المقرر للطالب: ${student?.full_name_ar || ""}`
              : "معاينة الوثيقة قبل الطباعة"
            }
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{numberLabel}</Label>
              <Input
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                placeholder="أدخل رقم المقرر..."
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{dateLabel}</Label>
              <DateInput value={decisionDate} onChange={setDecisionDate} />
            </div>

            {!isJuryDecision && (
              <>
                <div className="space-y-2">
                  <Label>رقم إرسال العميد *</Label>
                  <Input
                    value={deanLetterNumber}
                    onChange={(e) => setDeanLetterNumber(e.target.value)}
                    placeholder="أدخل رقم إرسال العميد..."
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ إرسال العميد *</Label>
                  <DateInput value={deanLetterDate} onChange={setDeanLetterDate} />
                </div>
              </>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={updateLmd.isPending || updateScience.isPending}
                className="gap-2"
              >
                {(updateLmd.isPending || updateScience.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <FileText className="h-4 w-4" />
                توليد الوثيقة
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={printRef}
              className="border rounded-lg p-8 bg-white min-h-[500px]"
              style={{
                fontFamily: template?.font_family || "IBM Plex Sans Arabic",
                fontSize: `${template?.font_size || 14}px`,
                lineHeight: template?.line_height || 1.8,
                direction: "rtl",
                width: "210mm",
                maxWidth: "100%",
                margin: "0 auto",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                color: "#000",
              }}
              dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                تعديل البيانات
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

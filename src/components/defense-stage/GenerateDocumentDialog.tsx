import { useState, useRef, useEffect, useCallback } from "react";
import { stripHtml } from "@/lib/utils";
import { createPortal } from "react-dom";
import { formatCertificateDate } from "@/lib/numerals";
import { normalizeDefenseTemplateHtml } from "@/lib/defenseTemplateHtml";

/**
 * تنسيق تواريخ وثائق المناقشة العربية:
 * - توحيد الإدخال إلى dd/MM/yyyy
 * - عزل اتجاه اليونيكود عبر RLI (\u2067) و PDI (\u2069)
 * - تغليف التاريخ بوسم <bdi> لضمان العزل داخل النص العربي
 */
function formatArabicDocumentDate(dateStr: string | null | undefined, placeholder = ""): string {
  const raw = dateStr?.trim();
  if (!raw) return placeholder;

  let day = "";
  let month = "";
  let year = "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ymdSlashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  const dmySlashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (isoMatch) {
    year = isoMatch[1]; month = isoMatch[2]; day = isoMatch[3];
  } else if (ymdSlashMatch) {
    year = ymdSlashMatch[1]; month = ymdSlashMatch[2]; day = ymdSlashMatch[3];
  } else if (dmySlashMatch) {
    day = dmySlashMatch[1]; month = dmySlashMatch[2]; year = dmySlashMatch[3];
  } else {
    const normalized = formatCertificateDate(raw, true);
    const normalizedMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!normalizedMatch) return `\u2067<bdi dir="rtl" style="direction:rtl;unicode-bidi:isolate">${normalized}</bdi>\u2069`;
    day = normalizedMatch[1]; month = normalizedMatch[2]; year = normalizedMatch[3];
  }

  // عرض بصري RTL داخل النص العربي (مثال: 2025/04/10)
  const visualRtlDate = `${year}/${month}/${day}`;
  // RLI + BDI (RTL) + PDI لعزل الاتجاه داخل الجملة العربية
  return `\u2067<bdi dir="rtl" style="direction:rtl;unicode-bidi:isolate">${visualRtlDate}</bdi>\u2069`;
}
import { FileText, Loader2, Printer, Download } from "lucide-react";
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
  type TextBoxData,
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
  documentType: "jury_decision" | "defense_auth" | "defense_minutes";
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
  // For defense_minutes: minutes_number + defense_time + mention
  const [decisionNumber, setDecisionNumber] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [deanLetterNumber, setDeanLetterNumber] = useState("");
  const [deanLetterDate, setDeanLetterDate] = useState("");
  const [minutesNumber, setMinutesNumber] = useState("");
  const [defenseTime, setDefenseTime] = useState("");
  const [mention, setMention] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const updateLmd = useUpdateDefenseStageLmd();
  const updateScience = useUpdateDefenseStageScience();
  const { data: templates = [] } = useDefenseDocTemplates();
  const { titles: academicTitles } = useAcademicTitles();
  const { findProfessor } = useProfessors();
  const ranks = academicTitles.map(t => ({ label: t.full_name, abbreviation: t.abbreviation }));

  const fullDocType = documentType === "defense_minutes"
    ? `defense_minutes_${studentType === "phd_lmd" ? "lmd" : "science"}`
    : `${documentType}_${studentType === "phd_lmd" ? "lmd" : "science"}`;
  const template = templates.find((t) => t.document_type === fullDocType);

  const isJuryDecision = documentType === "jury_decision";
  const isDefenseMinutes = documentType === "defense_minutes";

  useEffect(() => {
    if (open && student) {
      if (isJuryDecision) {
        setDecisionNumber(student.decision_number || "");
        setDecisionDate(student.decision_date || "");
      } else if (isDefenseMinutes) {
        setMinutesNumber("");
        setDefenseTime("");
        setMention("");
      } else {
        setDecisionNumber(student.auth_decision_number || "");
        setDecisionDate(student.auth_decision_date || "");
        setDeanLetterNumber(student.dean_letter_number || "");
        setDeanLetterDate(student.dean_letter_date || "");
      }
      setShowPreview(false);
    }
  }, [open, student, isJuryDecision, isDefenseMinutes]);

  // For defense_auth: also load jury decision data
  const [juryDecisionNumber, setJuryDecisionNumber] = useState("");
  const [juryDecisionDate, setJuryDecisionDate] = useState("");

  useEffect(() => {
    if (open && student && !isJuryDecision && !isDefenseMinutes) {
      setJuryDecisionNumber(student.decision_number || "");
      setJuryDecisionDate(student.decision_date || "");
    }
  }, [open, student, isJuryDecision, isDefenseMinutes]);

  const handleGenerate = async () => {
    if (isDefenseMinutes) {
      // Defense minutes: just show preview, no DB updates needed
      if (!student) return;
      setShowPreview(true);
      return;
    }
    if (!isJuryDecision) {
      if (!juryDecisionNumber.trim()) {
        toast.error("يرجى إدخال رقم مقرر اللجنة");
        return;
      }
      if (!juryDecisionDate.trim()) {
        toast.error("يرجى إدخال تاريخ مقرر اللجنة");
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
        updateData.stage_status = 'under_review';
      } else {
        updateData.decision_number = juryDecisionNumber.trim();
        updateData.decision_date = juryDecisionDate.trim();
        updateData.auth_decision_number = decisionNumber.trim();
        updateData.auth_decision_date = decisionDate.trim();
        updateData.dean_letter_number = deanLetterNumber.trim();
        updateData.dean_letter_date = deanLetterDate.trim();
        updateData.stage_status = 'defended';
      }

      await mutation.mutateAsync({ id: student.id, ...updateData });
      setShowPreview(true);
    } catch {
      // Error handled by hook
    }
  };

  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const fontFamily = template?.font_family || "IBM Plex Sans Arabic";
    const jts: JuryTableSettings = template?.jury_table_settings
      ? { ...DEFAULT_JURY_TABLE_SETTINGS, ...(template.jury_table_settings as any) }
      : { ...DEFAULT_JURY_TABLE_SETTINGS };

    // Remove previous print styles if any
    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }

    // Inject dynamic @media print CSS
    const style = document.createElement('style');
    style.id = 'defense-doc-print-styles';
    const mt = template?.margin_top ?? 20;
    const mb = template?.margin_bottom ?? 20;
    const mr = template?.margin_right ?? 15;
    const ml = template?.margin_left ?? 15;

    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        /* Remove all non-print roots from document flow */
        body > *:not(#defense-doc-print-wrapper) {
          display: none !important;
        }

        /* Hide everything by default */
        body * {
          visibility: hidden !important;
        }
        [data-print-hide] {
          display: none !important;
        }

        /* Show the defense document wrapper and all descendants */
        #defense-doc-print-wrapper,
        #defense-doc-print-wrapper * {
          visibility: visible !important;
        }

        body, html {
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: white !important;
        }

        #defense-doc-print-wrapper {
          display: block !important;
          position: relative !important;
          left: auto !important;
          top: auto !important;
          width: 210mm !important;
          min-height: auto !important;
          z-index: auto !important;
          background: white !important;
          margin: 0 !important;
          padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm !important;
          font-family: '${fontFamily}', sans-serif !important;
          font-size: ${template?.font_size || 14}px !important;
          line-height: ${template?.line_height || 1.8} !important;
          direction: rtl !important;
          color: #000 !important;
          box-sizing: border-box !important;
          break-after: auto !important;
          page-break-after: auto !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #defense-doc-print-wrapper p,
        #defense-doc-print-wrapper div,
        #defense-doc-print-wrapper span,
        #defense-doc-print-wrapper blockquote {
          margin: 0;
          padding: 0;
        }

        #defense-doc-print-wrapper table {
          border-collapse: collapse !important;
          width: 100% !important;
        }

        #defense-doc-print-wrapper td,
        #defense-doc-print-wrapper th {
          border: 1px solid ${jts.border_color} !important;
          padding: ${jts.padding}px !important;
          text-align: center !important;
          font-size: ${jts.font_size}px !important;
          line-height: ${jts.line_height} !important;
        }

        #defense-doc-print-wrapper th {
          background: ${jts.header_bg} !important;
          font-weight: bold !important;
        }

        #defense-doc-print-wrapper .variable-tag {
          background: transparent !important;
          color: inherit !important;
          padding: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;

    // Temporarily clear document title to suppress browser header/footer
    const originalTitle = document.title;
    document.title = ' ';

    const cleanup = () => {
      document.title = originalTitle;
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
    };

    const isElectronEnv = !!(window as unknown as { electronAPI?: { printNative?: unknown } }).electronAPI?.printNative;

    if (isElectronEnv) {
      // Make the wrapper visible on-screen so Electron print captures vector content
      const wrapper = document.getElementById('defense-doc-print-wrapper');
      const restoreWrapper = () => {
        if (wrapper) {
          wrapper.style.left = '-9999px';
          wrapper.style.visibility = 'hidden';
          wrapper.style.zIndex = '';
        }
      };
      if (wrapper) {
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.visibility = 'visible';
        wrapper.style.position = 'fixed';
        wrapper.style.zIndex = '999999';
        wrapper.style.background = 'white';
      }

      requestAnimationFrame(() => {
        const electronAPI = (window as unknown as { electronAPI: { printNative: (opts: unknown) => Promise<{ success: boolean; error?: string }> } }).electronAPI;
        electronAPI.printNative({
          pageSize: { width: 210 * 1000, height: 297 * 1000 },
          landscape: false,
        }).then((result) => {
          restoreWrapper();
          cleanup();
          if (!result.success) {
            toast.error(result.error || "فشلت الطباعة");
          }
        }).catch(() => {
          restoreWrapper();
          cleanup();
          toast.error("فشلت الطباعة");
        });
      });
    } else {
      const afterPrint = () => {
        cleanup();
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      window.print();
    }
  }, [template]);

  const handleDownloadPdf = useCallback(() => {
    if (!printRef.current) return;

    const fontFamily = template?.font_family || "IBM Plex Sans Arabic";
    const jts: JuryTableSettings = template?.jury_table_settings
      ? { ...DEFAULT_JURY_TABLE_SETTINGS, ...(template.jury_table_settings as any) }
      : { ...DEFAULT_JURY_TABLE_SETTINGS };

    // Remove previous print styles if any
    if (printStyleRef.current) {
      printStyleRef.current.remove();
      printStyleRef.current = null;
    }

    const style = document.createElement('style');
    style.id = 'defense-doc-print-styles';
    const mt = template?.margin_top ?? 20;
    const mb = template?.margin_bottom ?? 20;
    const mr = template?.margin_right ?? 15;
    const ml = template?.margin_left ?? 15;

    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }
        body > *:not(#defense-doc-print-wrapper) {
          display: none !important;
        }
        body * { visibility: hidden !important; }
        [data-print-hide] { display: none !important; }
        body, html {
          margin: 0 !important; padding: 0 !important;
          overflow: visible !important; background: white !important;
        }
        #defense-doc-print-wrapper,
        #defense-doc-print-wrapper * { visibility: visible !important; }
        #defense-doc-print-wrapper {
          display: block !important;
          position: relative !important;
          left: auto !important; top: auto !important;
          width: 210mm !important; min-height: auto !important;
          z-index: auto !important; background: white !important;
          margin: 0 !important;
          padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm !important;
          font-family: '${fontFamily}', sans-serif !important;
          font-size: ${template?.font_size || 14}px !important;
          line-height: ${template?.line_height || 1.8} !important;
          direction: rtl !important; color: #000 !important;
          box-sizing: border-box !important;
          break-after: auto !important;
          page-break-after: auto !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #defense-doc-print-wrapper p,
        #defense-doc-print-wrapper div,
        #defense-doc-print-wrapper span,
        #defense-doc-print-wrapper blockquote { margin: 0; padding: 0; }
        #defense-doc-print-wrapper table { border-collapse: collapse !important; width: 100% !important; }
        #defense-doc-print-wrapper td,
        #defense-doc-print-wrapper th {
          border: 1px solid ${jts.border_color} !important;
          padding: ${jts.padding}px !important;
          text-align: center !important;
          font-size: ${jts.font_size}px !important;
          line-height: ${jts.line_height} !important;
        }
        #defense-doc-print-wrapper th { background: ${jts.header_bg} !important; font-weight: bold !important; }
        #defense-doc-print-wrapper .variable-tag { background: transparent !important; color: inherit !important; padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;

    const originalTitle = document.title;
    document.title = ' ';

    const cleanup = () => {
      document.title = originalTitle;
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
    };

    const studentName = student?.full_name_ar || "وثيقة";
    const docTitlePdf = documentType === "jury_decision" ? "مقرر_تعيين_اللجنة" : documentType === "defense_minutes" ? "محضر_مداولات_المناقشة" : "ترخيص_المناقشة";
    const fileName = `${docTitlePdf}_${studentName}.pdf`;

    const isElectronEnv = !!(window as unknown as { electronAPI?: { printToPdf?: unknown } }).electronAPI?.printToPdf;

    if (isElectronEnv) {
      // Make the wrapper visible on-screen so printToPDF can capture it
      const wrapper = document.getElementById('defense-doc-print-wrapper');
      if (wrapper) {
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.visibility = 'visible';
        wrapper.style.position = 'fixed';
        wrapper.style.zIndex = '999999';
        wrapper.style.background = 'white';
        wrapper.style.padding = `${template?.margin_top ?? 20}mm ${template?.margin_right ?? 15}mm ${template?.margin_bottom ?? 20}mm ${template?.margin_left ?? 15}mm`;
        wrapper.style.boxSizing = 'border-box';
        wrapper.style.direction = 'rtl';
        wrapper.style.fontFamily = `'${fontFamily}', sans-serif`;
        wrapper.style.fontSize = `${template?.font_size || 14}px`;
        wrapper.style.lineHeight = String(template?.line_height || 1.8);
        wrapper.style.color = '#000';
      }

      // Allow a frame for the layout to settle before capturing
      requestAnimationFrame(() => {
        const electronAPI = (window as unknown as { electronAPI: { printToPdf: (opts: unknown) => Promise<{ success: boolean; error?: string; filePath?: string }> } }).electronAPI;
        electronAPI.printToPdf({
          pageSize: { width: 210 * 1000, height: 297 * 1000 },
          landscape: false,
          defaultFileName: fileName,
        }).then((result) => {
          // Restore wrapper to hidden
          if (wrapper) {
            wrapper.style.left = '-9999px';
            wrapper.style.visibility = 'hidden';
            wrapper.style.zIndex = '';
            wrapper.style.padding = '';
            wrapper.style.boxSizing = '';
            wrapper.style.direction = '';
            wrapper.style.fontFamily = '';
            wrapper.style.fontSize = '';
            wrapper.style.lineHeight = '';
            wrapper.style.color = '';
          }
          cleanup();
          if (result.success) {
            toast.success("تم حفظ الوثيقة بنجاح");
          } else if (result.error !== 'cancelled') {
            toast.error(result.error || "فشل في حفظ الوثيقة");
          }
        }).catch(() => {
          if (wrapper) {
            wrapper.style.left = '-9999px';
            wrapper.style.visibility = 'hidden';
          }
          cleanup();
          toast.error("فشل في حفظ الوثيقة");
        });
      });
    } else {
      // Web: use window.print() — user can choose "Save as PDF" from browser dialog
      const afterPrint = () => {
        cleanup();
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      window.print();
    }
  }, [template, student, documentType]);

  const buildJuryTableHtml = (members: JuryMember[], withSignature = false): string => {
    const jts: JuryTableSettings = template?.jury_table_settings
      ? { ...DEFAULT_JURY_TABLE_SETTINGS, ...(template.jury_table_settings as any) }
      : { ...DEFAULT_JURY_TABLE_SETTINGS };

    const thStyle = `border: 1px solid ${jts.border_color}; padding: ${jts.padding}px; text-align: center; background: ${jts.header_bg}; font-weight: bold; font-size: ${jts.font_size}px; line-height: ${jts.line_height};`;
    const tdStyle = `border: 1px solid ${jts.border_color}; padding: ${jts.padding}px; text-align: center; font-size: ${jts.font_size}px; line-height: ${jts.line_height};`;
    
    const columns: { key: string; header: string; widthKey: keyof JuryTableSettings }[] = [];
    if (jts.show_number) columns.push({ key: "number", header: "رقم", widthKey: "col_number_width" });
    columns.push({ key: "name", header: "الاسم واللقب", widthKey: "col_name_width" });
    if (jts.show_rank) columns.push({ key: "rank", header: "الرتبة", widthKey: "col_rank_width" });
    if (jts.show_university) columns.push({ key: "university", header: "مؤسسة الانتماء", widthKey: "col_university_width" });
    if (jts.show_role) columns.push({ key: "role", header: "الصفة", widthKey: "col_role_width" });
    if (withSignature) columns.push({ key: "signature", header: "الإمضاء", widthKey: "col_number_width" });

    // Calculate total width and normalize so columns fit 100%
    const rawWidths = columns.map(col => col.key === "signature" ? (jts.col_signature_width || 20) : (jts[col.widthKey] as number));
    const totalRaw = rawWidths.reduce((a, b) => a + b, 0);

    let html = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; direction: rtl;" border="1">
<thead><tr>`;
    columns.forEach((col, idx) => {
      const w = Math.round((rawWidths[idx] / totalRaw) * 100);
      html += `<th style="${thStyle} width: ${w}%;">${col.header}</th>`;
    });
    html += `</tr></thead><tbody>`;

    members.forEach((m, i) => {
      const displayName = m.name;
      const roleLabel = JURY_ROLE_DOC_LABELS[m.role] || m.role;
      html += `<tr>`;
      columns.forEach((col) => {
        let value = '&nbsp;';
        if (col.key === "number") value = String(i + 1);
        else if (col.key === "name") value = displayName || '&nbsp;';
        else if (col.key === "rank") value = m.rankLabel || '&nbsp;';
        else if (col.key === "university") value = m.university || '&nbsp;';
        else if (col.key === "role") value = roleLabel;
        else if (col.key === "signature") value = '&nbsp;';
        html += `<td style="${tdStyle}">${value}</td>`;
      });
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
      decision_number: isJuryDecision ? (decisionNumber.trim() || ".....................") : (juryDecisionNumber.trim() || "....................."),
      decision_date: isJuryDecision
        ? formatArabicDocumentDate(decisionDate, ".....................")
        : formatArabicDocumentDate(juryDecisionDate, "....................."),
      auth_decision_number: isJuryDecision ? "" : (decisionNumber.trim() || "....................."),
      auth_decision_date: isJuryDecision ? "" : formatArabicDocumentDate(decisionDate, "....................."),
      dean_letter_number: isJuryDecision ? "" : (deanLetterNumber.trim() || "....................."),
      dean_letter_date: isJuryDecision ? "" : formatArabicDocumentDate(deanLetterDate, "....................."),
      faculty_head_title: facultyHeadTitle,
      full_name_ar: student.full_name_ar || "",
      full_name_fr: student.full_name_fr || "",
      gender: student.gender || "male",
      date_of_birth: formatArabicDocumentDate(student.date_of_birth),
      birthplace_ar: student.birthplace_ar || "",
      province: student.province || "",
      registration_number: student.registration_number || "",
      university_ar: student.university_ar || "",
      faculty_ar: facultyAr,
      field_ar: student.field_ar || "",
      branch_ar: student.branch_ar || "",
      specialty_ar: student.specialty_ar || "",
      thesis_title_ar: stripHtml(student.thesis_title_ar || ""),
      thesis_title_fr: stripHtml(student.thesis_title_fr || ""),
      supervisor_ar: student.supervisor_ar || "",
      supervisor_university: student.supervisor_university || "",
      co_supervisor_ar: student.co_supervisor_ar || "",
      co_supervisor_university: student.co_supervisor_university || "",
      jury_president_ar: student.jury_president_ar || "",
      jury_members_ar: student.jury_members_ar || "",
      jury_table: buildJuryTableHtml(enrichedJuryMembers),
      jury_table_with_signature: buildJuryTableHtml(enrichedJuryMembers, true),
      scientific_council_date: formatArabicDocumentDate(student.scientific_council_date),
      defense_date: formatArabicDocumentDate(student.defense_date, "....................."),
      signature_title: student.signature_title || "",
      first_registration_year: student.first_registration_year || "",
      research_lab_ar: student.research_lab_ar || "",
      current_year: student.current_year || "",
      decree_training: student.decree_training || "",
      decree_accreditation: student.decree_accreditation || "",
      minutes_number: minutesNumber.trim() || "......................",
      minutes_year: new Date().getFullYear().toString(),
      defense_time: defenseTime.trim() || "......................",
      mention: mention || "......................",
    };

    let content = normalizeDefenseTemplateHtml(template.content, template.document_type);
    // Replace variable-tag spans (robust: handles single/double quotes, extra classes, nested attributes)
    content = content.replace(
      /<span[^>]*class=["'][^"']*variable-tag[^"']*["'][^>]*>\{\{(\w+)\}\}<\/span>/g,
      (_, key) => variables[key] ?? `{{${key}}}`
    );
    // Replace any remaining plain {{variable}} placeholders
    content = content.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => variables[key] ?? `{{${key}}}`
    );

    return content;
  };

  const docTitle = isDefenseMinutes
    ? "توليد محضر مداولات لجنة المناقشة"
    : isJuryDecision ? "توليد مقرر تعيين لجنة المناقشة" : "توليد ترخيص المناقشة";
  const numberLabel = isJuryDecision ? "رقم مقرر اللجنة" : "رقم مقرر الترخيص";
  const dateLabel = isJuryDecision ? "تاريخ مقرر اللجنة" : "تاريخ مقرر الترخيص";

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
              ? isDefenseMinutes
                ? `أدخل بيانات المحضر للطالب: ${student?.full_name_ar || ""}`
                : `أدخل بيانات المقرر للطالب: ${student?.full_name_ar || ""}`
              : "معاينة الوثيقة قبل الطباعة"
            }
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 py-2">
            {isDefenseMinutes ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <p>سيتم توليد المحضر مع ترك الحقول التالية فارغة (نقاط) للتعبئة يدوياً:</p>
                <p className="mt-2 font-medium text-foreground">رقم المحضر • ساعة المناقشة • التقدير</p>
              </div>
            ) : (
              <>
                {!isJuryDecision && (
                  <>
                    <div className="space-y-2">
                      <Label>رقم مقرر اللجنة *</Label>
                      <Input
                        value={juryDecisionNumber}
                        onChange={(e) => setJuryDecisionNumber(e.target.value)}
                        placeholder="أدخل رقم مقرر اللجنة..."
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ مقرر اللجنة *</Label>
                      <DateInput value={juryDecisionDate} onChange={setJuryDecisionDate} />
                    </div>
                  </>
                )}
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
            <div data-print-hide style={{ position: "relative", width: "210mm", maxWidth: "100%", margin: "0 auto" }}>
              <div
                ref={printRef}
                className="defense-doc-editor border rounded-lg bg-white min-h-[500px]"
                style={{
                  fontFamily: template?.font_family || "IBM Plex Sans Arabic",
                  fontSize: `${template?.font_size || 14}px`,
                  lineHeight: template?.line_height || 1.8,
                  direction: "rtl",
                  width: "100%",
                  paddingTop: `${template?.margin_top ?? 20}mm`,
                  paddingBottom: `${template?.margin_bottom ?? 20}mm`,
                  paddingRight: `${template?.margin_right ?? 15}mm`,
                  paddingLeft: `${template?.margin_left ?? 15}mm`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  color: "#000",
                }}
                dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
              />
              {/* Text Box Overlays */}
              {(template?.text_boxes || []).map((tb: TextBoxData) => (
                <div
                  key={tb.id}
                  style={{
                    position: "absolute",
                    left: `${tb.x}mm`,
                    top: `${tb.y}mm`,
                    width: `${tb.width}mm`,
                    minHeight: `${tb.minHeight}mm`,
                    border: `${tb.borderWidth}px solid ${tb.borderColor}`,
                    padding: `${tb.padding}px`,
                    background: tb.bgColor,
                    fontSize: `${tb.fontSize}px`,
                    fontFamily: tb.fontFamily,
                    textAlign: tb.textAlign,
                    direction: "rtl",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    wordBreak: "break-word",
                  }}
                  dangerouslySetInnerHTML={{ __html: tb.content }}
                />
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                تعديل البيانات
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
                <Download className="h-4 w-4" />
                تحميل PDF
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      {/* Hidden portal for CSS-based printing - renders at document body root */}
      {showPreview && createPortal(
        <div
          id="defense-doc-print-wrapper"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '210mm',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: getRenderedContent() }} />
          {(template?.text_boxes || []).map((tb: TextBoxData) => (
            <div
              key={tb.id}
              style={{
                position: "absolute",
                left: `${tb.x}mm`,
                top: `${tb.y}mm`,
                width: `${tb.width}mm`,
                minHeight: `${tb.minHeight}mm`,
                border: `${tb.borderWidth}px solid ${tb.borderColor}`,
                padding: `${tb.padding}px`,
                background: tb.bgColor,
                fontSize: `${tb.fontSize}px`,
                fontFamily: tb.fontFamily,
                textAlign: tb.textAlign,
                direction: "rtl",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              dangerouslySetInnerHTML={{ __html: tb.content }}
            />
          ))}
        </div>,
        document.body
      )}
    </Dialog>
  );
}

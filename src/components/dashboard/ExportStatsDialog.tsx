import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, CalendarIcon, FileSpreadsheet, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { toWesternNumerals } from "@/lib/numerals";

type DataSource = "phd_candidates" | "defended_students";

const dataSourceLabels: Record<DataSource, string> = {
  phd_candidates: "قاعدة بيانات طلبة الدكتوراه",
  defended_students: "قاعدة بيانات الطلبة المناقشين",
};

type ExportType = "students" | "faculty" | "gender" | "certificate_type" | "supervisor" | "jury_stats" | "status_distribution" | "custom_pivot";

// Export types available for each data source
const exportTypesForSource: Record<DataSource, ExportType[]> = {
  phd_candidates: ["students", "faculty", "gender", "certificate_type", "supervisor", "status_distribution", "custom_pivot"],
  defended_students: ["students", "faculty", "gender", "certificate_type", "supervisor", "jury_stats", "custom_pivot"],
};

const exportTypeLabels: Record<ExportType, string> = {
  students: "قائمة الطلاب",
  faculty: "توزيع حسب الكليات",
  gender: "توزيع حسب الجنس",
  certificate_type: "توزيع حسب نوع الشهادة",
  supervisor: "إحصائيات المشرفين",
  jury_stats: "إحصائيات اللجان (مشرف/رئيس/عضو)",
  status_distribution: "توزيع حسب الحالة",
  custom_pivot: "إحصائيات مخصصة (جدول محوري)",
};

// Available fields for pivot table - varies by data source
type PivotFieldCandidates = "phd_type" | "faculty_ar" | "gender" | "branch_ar" | "specialty_ar" | "status" | "first_registration_year";
type PivotFieldDefended = "certificate_type" | "faculty_ar" | "gender" | "branch_ar" | "specialty_ar" | "mention" | "defense_year" | "first_registration_year";
type PivotField = PivotFieldCandidates | PivotFieldDefended;

const pivotFieldLabels: Record<PivotField, string> = {
  certificate_type: "نوع الشهادة",
  phd_type: "نوع الدكتوراه",
  faculty_ar: "الكلية",
  gender: "الجنس",
  branch_ar: "الشعبة",
  specialty_ar: "التخصص",
  mention: "التقدير",
  status: "الحالة",
  defense_year: "سنة المناقشة",
  first_registration_year: "سنة أول تسجيل",
};

// Pivot fields available for each data source
const pivotFieldsForSource: Record<DataSource, PivotField[]> = {
  phd_candidates: ["phd_type", "faculty_ar", "gender", "branch_ar", "specialty_ar", "status", "first_registration_year"],
  defended_students: ["certificate_type", "faculty_ar", "gender", "branch_ar", "specialty_ar", "mention", "defense_year", "first_registration_year"],
};

const certificateTypeLabels = {
  all: "الكل",
  phd_lmd: "دكتوراه ل م د",
  phd_science: "دكتوراه علوم",
  master: "ماستر",
};

const phdTypeLabels = {
  all: "الكل",
  phd_lmd: "دكتوراه ل م د",
  phd_science: "دكتوراه علوم",
};

const statusLabels = {
  all: "الكل",
  active: "نشط",
  suspended: "موقوف",
  withdrawn: "منسحب",
  graduated: "متخرج",
};

const genderLabels = {
  all: "الكل",
  male: "ذكور",
  female: "إناث",
};

export function ExportStatsDialog() {
  const [open, setOpen] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("defended_students");
  const [exportType, setExportType] = useState<ExportType>("students");
  const [certificateType, setCertificateType] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [faculty, setFaculty] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [faculties, setFaculties] = useState<string[]>([]);
  
  // Custom pivot states - now support multiple fields
  const getDefaultPivotFields = (source: DataSource) => {
    if (source === "phd_candidates") {
      return { rows: ["faculty_ar"] as PivotField[], cols: ["phd_type"] as PivotField[] };
    }
    return { rows: ["faculty_ar"] as PivotField[], cols: ["certificate_type"] as PivotField[] };
  };
  
  const [pivotRowFields, setPivotRowFields] = useState<PivotField[]>(["faculty_ar"]);
  const [pivotColFields, setPivotColFields] = useState<PivotField[]>(["certificate_type"]);

  // Helper to add a field
  const addRowField = (field: PivotField) => {
    if (!pivotRowFields.includes(field) && !pivotColFields.includes(field)) {
      setPivotRowFields([...pivotRowFields, field]);
    }
  };

  const addColField = (field: PivotField) => {
    if (!pivotColFields.includes(field) && !pivotRowFields.includes(field)) {
      setPivotColFields([...pivotColFields, field]);
    }
  };

  const removeRowField = (field: PivotField) => {
    setPivotRowFields(pivotRowFields.filter(f => f !== field));
  };

  const removeColField = (field: PivotField) => {
    setPivotColFields(pivotColFields.filter(f => f !== field));
  };

  // Check if pivot export is valid
  const isPivotValid = pivotRowFields.length > 0 && pivotColFields.length > 0;

  // Get available fields (not already selected) - filtered by data source
  const getAvailableFields = (): PivotField[] => {
    const usedFields = [...pivotRowFields, ...pivotColFields];
    const allowedFields = pivotFieldsForSource[dataSource];
    return allowedFields.filter(f => !usedFields.includes(f));
  };

  // Handle data source change
  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    // Reset export type if not available for new source
    const availableTypes = exportTypesForSource[source];
    if (!availableTypes.includes(exportType)) {
      setExportType(availableTypes[0]);
    }
    // Reset pivot fields
    const defaults = getDefaultPivotFields(source);
    setPivotRowFields(defaults.rows);
    setPivotColFields(defaults.cols);
    // Reset certificate type filter
    setCertificateType("all");
    // Reload faculties for new data source
    loadFacultiesForSource(source);
  };

  // Load faculties for a specific source
  const loadFacultiesForSource = async (source: DataSource) => {
    let queries;
    if (source === "phd_candidates") {
      queries = await Promise.all([
        supabase.from("phd_lmd_students").select("faculty_ar"),
        supabase.from("phd_science_students").select("faculty_ar"),
      ]);
    } else {
      queries = await Promise.all([
        supabase.from("phd_lmd_certificates").select("faculty_ar"),
        supabase.from("phd_science_certificates").select("faculty_ar"),
        supabase.from("master_certificates").select("faculty_ar"),
      ]);
    }

    const allFaculties = new Set<string>();
    queries.forEach((result) => {
      (result.data || []).forEach((s: any) => {
        if (s.faculty_ar) allFaculties.add(s.faculty_ar);
      });
    });
    setFaculties(Array.from(allFaculties));
  };

  // Load faculties when dialog opens - based on data source
  const loadFaculties = async () => {
    let queries;
    if (dataSource === "phd_candidates") {
      queries = await Promise.all([
        supabase.from("phd_lmd_students").select("faculty_ar"),
        supabase.from("phd_science_students").select("faculty_ar"),
      ]);
    } else {
      queries = await Promise.all([
        supabase.from("phd_lmd_certificates").select("faculty_ar"),
        supabase.from("phd_science_certificates").select("faculty_ar"),
        supabase.from("master_certificates").select("faculty_ar"),
      ]);
    }

    const allFaculties = new Set<string>();
    queries.forEach((result) => {
      (result.data || []).forEach((s: any) => {
        if (s.faculty_ar) allFaculties.add(s.faculty_ar);
      });
    });
    setFaculties(Array.from(allFaculties));
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadFaculties();
    }
  };

  // Fetch data based on data source
  const fetchStudentData = async () => {
    const results: any[] = [];

    if (dataSource === "phd_candidates") {
      // PhD candidates database
      const tables = certificateType === "all" 
        ? ["phd_lmd_students", "phd_science_students"] as const
        : [certificateType === "phd_lmd" ? "phd_lmd_students" : "phd_science_students"] as const;

      for (const table of tables) {
        let query = supabase.from(table).select("*");

        if (gender !== "all") {
          query = query.eq("gender", gender);
        }

        if (faculty !== "all") {
          query = query.eq("faculty_ar", faculty);
        }

        const { data } = await query;
        if (data) {
          results.push(...data.map((d: any) => ({
            ...d,
            phd_type: table === "phd_lmd_students" ? "دكتوراه ل م د" : "دكتوراه علوم",
          })));
        }
      }
    } else {
      // Defended students database (certificates)
      const tables = certificateType === "all" 
        ? ["phd_lmd_certificates", "phd_science_certificates", "master_certificates"] as const
        : [certificateType === "phd_lmd" ? "phd_lmd_certificates" : certificateType === "phd_science" ? "phd_science_certificates" : "master_certificates"] as const;

      for (const table of tables) {
        let query = supabase.from(table).select("*");

        if (gender !== "all") {
          query = query.eq("gender", gender);
        }

        if (faculty !== "all") {
          query = query.eq("faculty_ar", faculty);
        }

        if (useDateFilter && startDate) {
          query = query.gte("defense_date", startDate.toISOString().split('T')[0]);
        }

        if (useDateFilter && endDate) {
          query = query.lte("defense_date", endDate.toISOString().split('T')[0]);
        }

        const { data } = await query;
        if (data) {
          results.push(...data.map((d: any) => ({
            ...d,
            certificate_type: table === "phd_lmd_certificates" ? "دكتوراه ل م د" : table === "phd_science_certificates" ? "دكتوراه علوم" : "ماستر",
          })));
        }
      }
    }

    return results;
  };


  const handleExport = async () => {
    setIsExporting(true);
    try {
      let exportData: any[] = [];
      let fileName = "";

      switch (exportType) {
        case "students": {
          const students = await fetchStudentData();
          if (dataSource === "phd_candidates") {
            exportData = students.map((s) => ({
              "نوع الدكتوراه": s.phd_type,
              "رقم التسجيل": s.registration_number,
              "الاسم بالعربية": s.full_name_ar,
              "الاسم بالفرنسية": s.full_name_fr || "",
              "الجنس": s.gender === "male" ? "ذكر" : "أنثى",
              "الكلية": s.faculty_ar || "",
              "التخصص": s.specialty_ar,
              "الشعبة": s.branch_ar,
              "تاريخ الميلاد": s.date_of_birth,
              "سنة أول تسجيل": s.first_registration_year || "",
              "الحالة": statusLabels[s.status as keyof typeof statusLabels] || s.status,
              "المشرف": s.supervisor_ar || "",
            }));
            fileName = `طلبة_الدكتوراه_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          } else {
            exportData = students.map((s) => ({
              "نوع الشهادة": s.certificate_type,
              "رقم الطالب": s.student_number,
              "الاسم بالعربية": s.full_name_ar,
              "الاسم بالفرنسية": s.full_name_fr || "",
              "الجنس": s.gender === "male" ? "ذكر" : "أنثى",
              "الكلية": s.faculty_ar || "",
              "التخصص": s.specialty_ar,
              "الشعبة": s.branch_ar,
              "تاريخ الميلاد": s.date_of_birth,
              "تاريخ المناقشة": s.defense_date,
              "التقدير": s.mention === "very_honorable" ? "مشرف جدا" : "مشرف",
            }));
            fileName = `الطلاب_المناقشين_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          }
          break;
        }


        case "faculty": {
          const students = await fetchStudentData();
          const facultyCounts: Record<string, number> = {};
          students.forEach((s) => {
            const fac = s.faculty_ar || "غير محدد";
            facultyCounts[fac] = (facultyCounts[fac] || 0) + 1;
          });
          exportData = Object.entries(facultyCounts).map(([name, count]) => ({
            "الكلية": name,
            "عدد الطلاب": count,
          }));
          fileName = `توزيع_الكليات_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          break;
        }

        case "gender": {
          const students = await fetchStudentData();
          const maleCount = students.filter((s) => s.gender === "male").length;
          const femaleCount = students.filter((s) => s.gender === "female").length;
          exportData = [
            { "الجنس": "ذكور", "العدد": maleCount },
            { "الجنس": "إناث", "العدد": femaleCount },
          ];
          fileName = `توزيع_الجنس_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          break;
        }

        case "certificate_type": {
          if (dataSource === "phd_candidates") {
            const [phdLmd, phdScience] = await Promise.all([
              supabase.from("phd_lmd_students").select("*", { count: "exact", head: true }),
              supabase.from("phd_science_students").select("*", { count: "exact", head: true }),
            ]);
            exportData = [
              { "نوع الدكتوراه": "دكتوراه ل م د", "العدد": phdLmd.count || 0 },
              { "نوع الدكتوراه": "دكتوراه علوم", "العدد": phdScience.count || 0 },
            ];
            fileName = `توزيع_أنواع_الدكتوراه_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          } else {
            const [phdLmd, phdScience, master] = await Promise.all([
              supabase.from("phd_lmd_certificates").select("*", { count: "exact", head: true }),
              supabase.from("phd_science_certificates").select("*", { count: "exact", head: true }),
              supabase.from("master_certificates").select("*", { count: "exact", head: true }),
            ]);
            exportData = [
              { "نوع الشهادة": "دكتوراه ل م د", "العدد": phdLmd.count || 0 },
              { "نوع الشهادة": "دكتوراه علوم", "العدد": phdScience.count || 0 },
              { "نوع الشهادة": "ماستر", "العدد": master.count || 0 },
            ];
            fileName = `توزيع_أنواع_الشهادات_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          }
          break;
        }

        case "supervisor": {
          let allStudents: any[] = [];
          
          if (dataSource === "phd_candidates") {
            const [phdLmd, phdScience] = await Promise.all([
              supabase.from("phd_lmd_students").select("supervisor_ar, full_name_ar, specialty_ar, status"),
              supabase.from("phd_science_students").select("supervisor_ar, full_name_ar, specialty_ar, status"),
            ]);
            allStudents = [
              ...(phdLmd.data || []).map(s => ({ ...s, phd_type: "دكتوراه ل م د" })),
              ...(phdScience.data || []).map(s => ({ ...s, phd_type: "دكتوراه علوم" })),
            ];
          } else {
            const [phdLmd, phdScience, master] = await Promise.all([
              supabase.from("phd_lmd_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
              supabase.from("phd_science_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
              supabase.from("master_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
            ]);
            allStudents = [
              ...(phdLmd.data || []).map(s => ({ ...s, certificate_type: "دكتوراه ل م د" })),
              ...(phdScience.data || []).map(s => ({ ...s, certificate_type: "دكتوراه علوم" })),
              ...(master.data || []).map(s => ({ ...s, certificate_type: "ماستر" })),
            ];
          }

          // Group by supervisor
          const supervisorData: Record<string, { count: number; students: any[] }> = {};
          
          allStudents.forEach((s) => {
            const supervisor = s.supervisor_ar || "غير محدد";
            if (!supervisor.trim()) return;
            if (!supervisorData[supervisor]) {
              supervisorData[supervisor] = { count: 0, students: [] };
            }
            supervisorData[supervisor].count++;
            supervisorData[supervisor].students.push({
              name: s.full_name_ar,
              specialty: s.specialty_ar,
              type: dataSource === "phd_candidates" ? s.phd_type : s.certificate_type,
              dateOrStatus: dataSource === "phd_candidates" ? (statusLabels[s.status as keyof typeof statusLabels] || s.status) : s.defense_date,
            });
          });

          const summaryData = Object.entries(supervisorData)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, data], index) => ({
              "الترتيب": index + 1,
              "اسم المشرف": name,
              "عدد الطلاب": data.count,
            }));

          const detailedData: any[] = [];
          const lastColLabel = dataSource === "phd_candidates" ? "الحالة" : "تاريخ المناقشة";
          Object.entries(supervisorData)
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([supervisor, data]) => {
              data.students.forEach((student) => {
                detailedData.push({
                  "المشرف": supervisor,
                  "اسم الطالب": student.name,
                  "التخصص": student.specialty,
                  [dataSource === "phd_candidates" ? "نوع الدكتوراه" : "نوع الشهادة"]: student.type,
                  [lastColLabel]: student.dateOrStatus,
                });
              });
            });

          const wb = XLSX.utils.book_new();
          const wsSummary = XLSX.utils.json_to_sheet(summaryData);
          const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
          XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص المشرفين");
          XLSX.utils.book_append_sheet(wb, wsDetailed, "التفاصيل");
          const sourceLabel = dataSource === "phd_candidates" ? "طلبة_الدكتوراه" : "المناقشين";
          XLSX.writeFile(wb, `إحصائيات_المشرفين_${sourceLabel}_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`);

          toast.success(`تم تصدير بيانات ${toWesternNumerals(Object.keys(supervisorData).length)} مشرف بنجاح`);
          setOpen(false);
          setIsExporting(false);
          return;
        }

        case "status_distribution": {
          // Only for phd_candidates
          const [phdLmd, phdScience] = await Promise.all([
            supabase.from("phd_lmd_students").select("status"),
            supabase.from("phd_science_students").select("status"),
          ]);

          const allStudents = [...(phdLmd.data || []), ...(phdScience.data || [])];
          const statusCounts: Record<string, number> = {};
          
          allStudents.forEach((s: any) => {
            const status = s.status || "unknown";
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });

          exportData = Object.entries(statusCounts).map(([status, count]) => ({
            "الحالة": statusLabels[status as keyof typeof statusLabels] || status,
            "العدد": count,
          }));
          fileName = `توزيع_حالات_طلبة_الدكتوراه_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`;
          break;
        }

        case "jury_stats": {
          // Fetch all jury data (president, members, and supervisors)
          const [phdLmd, phdScience, master, academicTitles] = await Promise.all([
            supabase.from("phd_lmd_certificates").select("jury_president_ar, jury_members_ar, supervisor_ar, full_name_ar, specialty_ar, faculty_ar, defense_date"),
            supabase.from("phd_science_certificates").select("jury_president_ar, jury_members_ar, supervisor_ar, full_name_ar, specialty_ar, faculty_ar, defense_date"),
            supabase.from("master_certificates").select("supervisor_ar, full_name_ar, specialty_ar, faculty_ar, defense_date"),
            supabase.from("academic_titles").select("abbreviation, full_name"),
          ]);

          // Build titles map for extracting rank
          const titlesMap = new Map<string, string>();
          (academicTitles.data || []).forEach((t) => {
            titlesMap.set(t.abbreviation, t.full_name);
          });

          // Helper to extract title and name
          const extractTitleAndName = (fullName: string): { title: string; name: string } => {
            const trimmed = fullName.trim();
            for (const [abbr, fullTitle] of titlesMap) {
              if (trimmed.startsWith(abbr + " ") || trimmed.startsWith(abbr + ".") || trimmed.startsWith(abbr + "/")) {
                return { title: fullTitle, name: trimmed.substring(abbr.length).replace(/^[.\s/]+/, "").trim() };
              }
            }
            return { title: "", name: trimmed };
          };

          const allRecords = [
            ...(phdLmd.data || []).map(s => ({ ...s, certificate_type: "دكتوراه ل م د" })),
            ...(phdScience.data || []).map(s => ({ ...s, certificate_type: "دكتوراه علوم" })),
          ];

          const masterRecords = (master.data || []).map(s => ({ ...s, certificate_type: "ماجستير" }));

          // Track professor appearances
          const professorStats: Record<string, { 
            asPresident: number; 
            asMember: number; 
            asSupervisor: number;
            total: number;
            faculties: Set<string>;
            presidentDetails: Array<{ student: string; specialty: string; faculty: string; type: string; date: string }>;
            memberDetails: Array<{ student: string; specialty: string; faculty: string; type: string; date: string }>;
            supervisorDetails: Array<{ student: string; specialty: string; faculty: string; type: string; date: string }>;
          }> = {};

          const ensureProfessor = (name: string) => {
            if (!professorStats[name]) {
              professorStats[name] = { 
                asPresident: 0, asMember: 0, asSupervisor: 0, total: 0, 
                faculties: new Set(),
                presidentDetails: [], memberDetails: [], supervisorDetails: [] 
              };
            }
          };

          // Process PhD records (president, members, supervisor)
          allRecords.forEach((record) => {
            const faculty = record.faculty_ar || "";

            // Process president
            const president = (record as any).jury_president_ar?.trim();
            if (president) {
              ensureProfessor(president);
              professorStats[president].asPresident++;
              professorStats[president].total++;
              if (faculty) professorStats[president].faculties.add(faculty);
              professorStats[president].presidentDetails.push({
                student: record.full_name_ar,
                specialty: record.specialty_ar,
                faculty,
                type: record.certificate_type,
                date: record.defense_date,
              });
            }

            // Process members
            const membersStr = (record as any).jury_members_ar || "";
            const members = membersStr.split(/[،,]/).map((m: string) => m.trim()).filter(Boolean);
            
            members.forEach((member: string) => {
              if (!member) return;
              ensureProfessor(member);
              professorStats[member].asMember++;
              professorStats[member].total++;
              if (faculty) professorStats[member].faculties.add(faculty);
              professorStats[member].memberDetails.push({
                student: record.full_name_ar,
                specialty: record.specialty_ar,
                faculty,
                type: record.certificate_type,
                date: record.defense_date,
              });
            });

            // Process supervisor from PhD records
            const supervisor = (record as any).supervisor_ar?.trim();
            if (supervisor) {
              ensureProfessor(supervisor);
              professorStats[supervisor].asSupervisor++;
              professorStats[supervisor].total++;
              if (faculty) professorStats[supervisor].faculties.add(faculty);
              professorStats[supervisor].supervisorDetails.push({
                student: record.full_name_ar,
                specialty: record.specialty_ar,
                faculty,
                type: record.certificate_type,
                date: record.defense_date,
              });
            }
          });

          // Process Master records (supervisor only)
          masterRecords.forEach((record) => {
            const faculty = record.faculty_ar || "";
            const supervisor = (record as any).supervisor_ar?.trim();
            if (supervisor) {
              ensureProfessor(supervisor);
              professorStats[supervisor].asSupervisor++;
              professorStats[supervisor].total++;
              if (faculty) professorStats[supervisor].faculties.add(faculty);
              professorStats[supervisor].supervisorDetails.push({
                student: record.full_name_ar,
                specialty: record.specialty_ar,
                faculty,
                type: record.certificate_type,
                date: record.defense_date,
              });
            }
          });

          // Create summary sheet with title and faculties
          const summaryData = Object.entries(professorStats)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, stats], index) => {
              const { title, name: cleanName } = extractTitleAndName(name);
              return {
                "الترتيب": index + 1,
                "اسم الأستاذ": cleanName,
                "الرتبة": title,
                "الكليات": Array.from(stats.faculties).join(" | "),
                "مشرف": stats.asSupervisor,
                "رئيس لجنة": stats.asPresident,
                "عضو لجنة": stats.asMember,
                "المجموع": stats.total,
              };
            });

          // Create supervisor details sheet
          const supervisorDetails: any[] = [];
          Object.entries(professorStats)
            .sort((a, b) => b[1].asSupervisor - a[1].asSupervisor)
            .forEach(([professor, stats]) => {
              const { title, name: cleanName } = extractTitleAndName(professor);
              stats.supervisorDetails.forEach((detail) => {
                supervisorDetails.push({
                  "الأستاذ": cleanName,
                  "الرتبة": title,
                  "الدور": "مشرف",
                  "اسم الطالب": detail.student,
                  "الكلية": detail.faculty,
                  "التخصص": detail.specialty,
                  "نوع الشهادة": detail.type,
                  "تاريخ المناقشة": detail.date,
                });
              });
            });

          // Create president details sheet
          const presidentDetails: any[] = [];
          Object.entries(professorStats)
            .sort((a, b) => b[1].asPresident - a[1].asPresident)
            .forEach(([professor, stats]) => {
              const { title, name: cleanName } = extractTitleAndName(professor);
              stats.presidentDetails.forEach((detail) => {
                presidentDetails.push({
                  "الأستاذ": cleanName,
                  "الرتبة": title,
                  "الدور": "رئيس لجنة",
                  "اسم الطالب": detail.student,
                  "الكلية": detail.faculty,
                  "التخصص": detail.specialty,
                  "نوع الشهادة": detail.type,
                  "تاريخ المناقشة": detail.date,
                });
              });
            });

          // Create member details sheet
          const memberDetails: any[] = [];
          Object.entries(professorStats)
            .sort((a, b) => b[1].asMember - a[1].asMember)
            .forEach(([professor, stats]) => {
              const { title, name: cleanName } = extractTitleAndName(professor);
              stats.memberDetails.forEach((detail) => {
                memberDetails.push({
                  "الأستاذ": cleanName,
                  "الرتبة": title,
                  "الدور": "عضو لجنة",
                  "اسم الطالب": detail.student,
                  "الكلية": detail.faculty,
                  "التخصص": detail.specialty,
                  "نوع الشهادة": detail.type,
                  "تاريخ المناقشة": detail.date,
                });
              });
            });

          // Create workbook with four sheets
          const wb = XLSX.utils.book_new();
          const wsSummary = XLSX.utils.json_to_sheet(summaryData);
          const wsSupervisor = XLSX.utils.json_to_sheet(supervisorDetails);
          const wsPresident = XLSX.utils.json_to_sheet(presidentDetails);
          const wsMember = XLSX.utils.json_to_sheet(memberDetails);
          XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص الأساتذة");
          XLSX.utils.book_append_sheet(wb, wsSupervisor, "تفاصيل الإشراف");
          XLSX.utils.book_append_sheet(wb, wsPresident, "تفاصيل رئاسة اللجان");
          XLSX.utils.book_append_sheet(wb, wsMember, "تفاصيل عضوية اللجان");
          XLSX.writeFile(wb, `إحصائيات_اللجان_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`);

          toast.success(`تم تصدير بيانات ${toWesternNumerals(Object.keys(professorStats).length)} أستاذ بنجاح`);
          setOpen(false);
          setIsExporting(false);
          return;
        }

        case "custom_pivot": {
          let allStudents: any[] = [];
          
          if (dataSource === "phd_candidates") {
            const [phdLmd, phdScience] = await Promise.all([
              supabase.from("phd_lmd_students").select("*"),
              supabase.from("phd_science_students").select("*"),
            ]);
            allStudents = [
              ...(phdLmd.data || []).map(s => ({ ...s, phd_type: "دكتوراه ل م د" })),
              ...(phdScience.data || []).map(s => ({ ...s, phd_type: "دكتوراه علوم" })),
            ];
          } else {
            const [phdLmd, phdScience, master] = await Promise.all([
              supabase.from("phd_lmd_certificates").select("*"),
              supabase.from("phd_science_certificates").select("*"),
              supabase.from("master_certificates").select("*"),
            ]);
            allStudents = [
              ...(phdLmd.data || []).map(s => ({ ...s, certificate_type: "دكتوراه ل م د" })),
              ...(phdScience.data || []).map(s => ({ ...s, certificate_type: "دكتوراه علوم" })),
              ...(master.data || []).map(s => ({ ...s, certificate_type: "ماستر" })),
            ];
          }

          // Helper to get field value
          const getFieldValue = (student: any, field: PivotField): string => {
            switch (field) {
              case "certificate_type":
                return student.certificate_type || "غير محدد";
              case "phd_type":
                return student.phd_type || "غير محدد";
              case "faculty_ar":
                return student.faculty_ar || "غير محدد";
              case "gender":
                return student.gender === "male" ? "ذكور" : student.gender === "female" ? "إناث" : "غير محدد";
              case "branch_ar":
                return student.branch_ar || "غير محدد";
              case "specialty_ar":
                return student.specialty_ar || "غير محدد";
              case "mention":
                return student.mention === "very_honorable" ? "مشرف جدا" : student.mention === "honorable" ? "مشرف" : "غير محدد";
              case "status":
                return statusLabels[student.status as keyof typeof statusLabels] || student.status || "غير محدد";
              case "defense_year":
                return student.defense_date ? new Date(student.defense_date).getFullYear().toString() : "غير محدد";
              case "first_registration_year":
                return student.first_registration_year || "غير محدد";
              default:
                return "غير محدد";
            }
          };

          // Helper to get combined key for multiple fields
          const getCombinedKey = (student: any, fields: PivotField[]): string => {
            return fields.map(f => getFieldValue(student, f)).join(" | ");
          };

          // Get combined labels for headers
          const getRowHeaderLabel = (): string => {
            return pivotRowFields.map(f => pivotFieldLabels[f]).join(" / ");
          };

          // Collect unique combined values for rows and columns
          const rowValues = new Set<string>();
          const colValues = new Set<string>();

          allStudents.forEach((student) => {
            rowValues.add(getCombinedKey(student, pivotRowFields));
            colValues.add(getCombinedKey(student, pivotColFields));
          });

          const sortedRows = Array.from(rowValues).sort();
          const sortedCols = Array.from(colValues).sort();

          // Build pivot table data
          const pivotData: Record<string, Record<string, number>> = {};
          sortedRows.forEach((row) => {
            pivotData[row] = {};
            sortedCols.forEach((col) => {
              pivotData[row][col] = 0;
            });
          });

          // Count occurrences
          allStudents.forEach((student) => {
            const rowVal = getCombinedKey(student, pivotRowFields);
            const colVal = getCombinedKey(student, pivotColFields);
            pivotData[rowVal][colVal]++;
          });

          // Create export data
          const pivotExportData: any[] = [];
          sortedRows.forEach((rowValue) => {
            const row: any = { [getRowHeaderLabel()]: rowValue };
            let rowTotal = 0;
            sortedCols.forEach((colValue) => {
              row[colValue] = pivotData[rowValue][colValue];
              rowTotal += pivotData[rowValue][colValue];
            });
            row["المجموع"] = rowTotal;
            pivotExportData.push(row);
          });

          // Add total row
          const totalRow: any = { [getRowHeaderLabel()]: "المجموع الكلي" };
          let grandTotal = 0;
          sortedCols.forEach((colValue) => {
            const colTotal = sortedRows.reduce((sum, row) => sum + pivotData[row][colValue], 0);
            totalRow[colValue] = colTotal;
            grandTotal += colTotal;
          });
          totalRow["المجموع"] = grandTotal;
          pivotExportData.push(totalRow);

          // Create filename
          const rowFieldNames = pivotRowFields.map(f => pivotFieldLabels[f]).join("-");
          const colFieldNames = pivotColFields.map(f => pivotFieldLabels[f]).join("-");

          // Create workbook
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(pivotExportData);
          XLSX.utils.book_append_sheet(wb, ws, "جدول محوري");
          XLSX.writeFile(wb, `إحصائيات_مخصصة_${rowFieldNames}_×_${colFieldNames}_${toWesternNumerals(new Date().toLocaleDateString("ar-SA"))}.xlsx`);

          toast.success(`تم تصدير الجدول المحوري: ${toWesternNumerals(sortedRows.length)} صف × ${toWesternNumerals(sortedCols.length)} عمود`);
          setOpen(false);
          setIsExporting(false);
          return;
        }
      }

      if (exportData.length === 0) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "البيانات");
      XLSX.writeFile(wb, fileName);

      toast.success(`تم تصدير ${toWesternNumerals(exportData.length)} سجل بنجاح`);
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2 shadow-lg">
          <Download className="h-5 w-5" />
          تصدير الإحصائيات
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            تصدير الإحصائيات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Data Source Selection */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
            <Label className="text-base font-semibold">قاعدة البيانات</Label>
            <Select value={dataSource} onValueChange={(v) => handleDataSourceChange(v as DataSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dataSourceLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Type */}
          <div className="space-y-2">
            <Label>نوع التصدير</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportTypesForSource[dataSource].map((key) => (
                  <SelectItem key={key} value={key}>
                    {exportTypeLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certificate/PhD Type Filter */}
          {exportType === "students" && (
            <div className="space-y-2">
              <Label>{dataSource === "phd_candidates" ? "نوع الدكتوراه" : "نوع الشهادة"}</Label>
              <Select value={certificateType} onValueChange={setCertificateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataSource === "phd_candidates" ? (
                    Object.entries(phdTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))
                  ) : (
                    Object.entries(certificateTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gender Filter */}
          {exportType === "students" && (
            <div className="space-y-2">
              <Label>الجنس</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Faculty Filter */}
          {exportType === "students" && faculties.length > 0 && (
            <div className="space-y-2">
              <Label>الكلية</Label>
              <Select value={faculty} onValueChange={setFaculty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filter - Only for defended students */}
          {exportType === "students" && dataSource === "defended_students" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useDateFilter"
                  checked={useDateFilter}
                  onCheckedChange={(checked) => setUseDateFilter(checked as boolean)}
                />
                <Label htmlFor="useDateFilter" className="cursor-pointer">
                  تصفية حسب تاريخ المناقشة
                </Label>
              </div>

              {useDateFilter && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>من تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP", { locale: ar }) : "اختر التاريخ"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>إلى تاريخ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP", { locale: ar }) : "اختر التاريخ"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Pivot Configuration */}
          {exportType === "custom_pivot" && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">
                اختر الحقول لإنشاء جدول محوري مخصص (يمكنك إضافة أكثر من حقل)
              </div>
              
              {/* Row Fields */}
              <div className="space-y-2">
                <Label>حقول الصفوف (عموديًا)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {pivotRowFields.length === 0 ? (
                    <span className="text-xs text-destructive">يرجى إضافة حقل واحد على الأقل</span>
                  ) : (
                    pivotRowFields.map((field) => (
                      <Badge key={field} variant="secondary" className="gap-1 py-1">
                        {pivotFieldLabels[field]}
                        <button
                          type="button"
                          onClick={() => removeRowField(field)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                {getAvailableFields().length > 0 && (
                  <Select value="" onValueChange={(v) => addRowField(v as PivotField)}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        إضافة حقل صف
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFields().map((field) => (
                        <SelectItem key={field} value={field}>
                          {pivotFieldLabels[field]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Column Fields */}
              <div className="space-y-2">
                <Label>حقول الأعمدة (أفقيًا)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {pivotColFields.length === 0 ? (
                    <span className="text-xs text-destructive">يرجى إضافة حقل واحد على الأقل</span>
                  ) : (
                    pivotColFields.map((field) => (
                      <Badge key={field} variant="outline" className="gap-1 py-1">
                        {pivotFieldLabels[field]}
                        <button
                          type="button"
                          onClick={() => removeColField(field)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                {getAvailableFields().length > 0 && (
                  <Select value="" onValueChange={(v) => addColField(v as PivotField)}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        إضافة حقل عمود
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFields().map((field) => (
                        <SelectItem key={field} value={field}>
                          {pivotFieldLabels[field]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                <strong>مثال:</strong> يمكنك اختيار "الكلية + الشعبة" كصفوف و"نوع الشهادة + الجنس" كأعمدة 
                للحصول على جدول تفصيلي يوضح التوزيع المتقاطع للبيانات.
              </div>
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting || (exportType === "custom_pivot" && !isPivotValid)}
            className="w-full gap-2"
            size="lg"
          >
            {isExporting ? (
              <>جاري التصدير...</>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تصدير إلى Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

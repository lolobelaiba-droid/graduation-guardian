import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { toWesternNumerals } from "@/lib/numerals";

type ExportType = "students" | "faculty" | "gender" | "certificate_type" | "supervisor" | "jury_stats";

const exportTypeLabels: Record<ExportType, string> = {
  students: "قائمة الطلاب",
  faculty: "توزيع حسب الكليات",
  gender: "توزيع حسب الجنس",
  certificate_type: "توزيع حسب نوع الشهادة",
  supervisor: "إحصائيات المشرفين",
  jury_stats: "إحصائيات اللجان (مشرف/رئيس/عضو)",
};

const certificateTypeLabels = {
  all: "الكل",
  phd_lmd: "دكتوراه ل م د",
  phd_science: "دكتوراه علوم",
  master: "ماستر",
};

const genderLabels = {
  all: "الكل",
  male: "ذكور",
  female: "إناث",
};

export function ExportStatsDialog() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("students");
  const [certificateType, setCertificateType] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [faculty, setFaculty] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [faculties, setFaculties] = useState<string[]>([]);

  // Load faculties when dialog opens
  const loadFaculties = async () => {
    const [phdLmd, phdScience, master] = await Promise.all([
      supabase.from("phd_lmd_certificates").select("faculty_ar"),
      supabase.from("phd_science_certificates").select("faculty_ar"),
      supabase.from("master_certificates").select("faculty_ar"),
    ]);

    const allFaculties = new Set<string>();
    [...(phdLmd.data || []), ...(phdScience.data || []), ...(master.data || [])].forEach((s) => {
      if (s.faculty_ar) allFaculties.add(s.faculty_ar);
    });
    setFaculties(Array.from(allFaculties));
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadFaculties();
    }
  };

  const fetchStudentData = async () => {
    const tables = certificateType === "all" 
      ? ["phd_lmd_certificates", "phd_science_certificates", "master_certificates"] as const
      : [certificateType === "phd_lmd" ? "phd_lmd_certificates" : certificateType === "phd_science" ? "phd_science_certificates" : "master_certificates"] as const;

    const results: any[] = [];

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
        results.push(...data.map((d) => ({
          ...d,
          certificate_type: table === "phd_lmd_certificates" ? "دكتوراه ل م د" : table === "phd_science_certificates" ? "دكتوراه علوم" : "ماستر",
        })));
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
          fileName = `الطلاب_${new Date().toLocaleDateString("ar-SA")}.xlsx`;
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
          fileName = `توزيع_الكليات_${new Date().toLocaleDateString("ar-SA")}.xlsx`;
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
          fileName = `توزيع_الجنس_${new Date().toLocaleDateString("ar-SA")}.xlsx`;
          break;
        }

        case "certificate_type": {
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
          fileName = `توزيع_أنواع_الشهادات_${new Date().toLocaleDateString("ar-SA")}.xlsx`;
          break;
        }

        case "supervisor": {
          // Fetch all students with supervisor field
          const [phdLmd, phdScience, master] = await Promise.all([
            supabase.from("phd_lmd_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
            supabase.from("phd_science_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
            supabase.from("master_certificates").select("supervisor_ar, full_name_ar, specialty_ar, defense_date"),
          ]);

          const allStudents = [
            ...(phdLmd.data || []).map(s => ({ ...s, certificate_type: "دكتوراه ل م د" })),
            ...(phdScience.data || []).map(s => ({ ...s, certificate_type: "دكتوراه علوم" })),
            ...(master.data || []).map(s => ({ ...s, certificate_type: "ماستر" })),
          ];

          // Group by supervisor
          const supervisorData: Record<string, { count: number; students: Array<{ name: string; specialty: string; type: string; date: string }> }> = {};
          
          allStudents.forEach((s) => {
            const supervisor = (s as any).supervisor_ar || "غير محدد";
            if (!supervisor.trim()) return; // Skip empty supervisors
            if (!supervisorData[supervisor]) {
              supervisorData[supervisor] = { count: 0, students: [] };
            }
            supervisorData[supervisor].count++;
            supervisorData[supervisor].students.push({
              name: s.full_name_ar,
              specialty: s.specialty_ar,
              type: s.certificate_type,
              date: s.defense_date,
            });
          });

          // Create summary sheet data
          const summaryData = Object.entries(supervisorData)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, data], index) => ({
              "الترتيب": index + 1,
              "اسم المشرف": name,
              "عدد الطلاب": data.count,
            }));

          // Create detailed sheet data
          const detailedData: any[] = [];
          Object.entries(supervisorData)
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([supervisor, data]) => {
              data.students.forEach((student) => {
                detailedData.push({
                  "المشرف": supervisor,
                  "اسم الطالب": student.name,
                  "التخصص": student.specialty,
                  "نوع الشهادة": student.type,
                  "تاريخ المناقشة": student.date,
                });
              });
            });

          // Create workbook with two sheets
          const wb = XLSX.utils.book_new();
          const wsSummary = XLSX.utils.json_to_sheet(summaryData);
          const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
          XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص المشرفين");
          XLSX.utils.book_append_sheet(wb, wsDetailed, "التفاصيل");
          XLSX.writeFile(wb, `إحصائيات_المشرفين_${new Date().toLocaleDateString("ar-SA")}.xlsx`);

          toast.success(`تم تصدير بيانات ${toWesternNumerals(Object.keys(supervisorData).length)} مشرف بنجاح`);
          setOpen(false);
          setIsExporting(false);
          return;
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
                "الرتبة": title,
                "اسم الأستاذ": cleanName,
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
                  "الرتبة": title,
                  "الأستاذ": cleanName,
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
                  "الرتبة": title,
                  "الأستاذ": cleanName,
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
                  "الرتبة": title,
                  "الأستاذ": cleanName,
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
          XLSX.writeFile(wb, `إحصائيات_اللجان_${new Date().toLocaleDateString("ar-SA")}.xlsx`);

          toast.success(`تم تصدير بيانات ${toWesternNumerals(Object.keys(professorStats).length)} أستاذ بنجاح`);
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
          {/* Export Type */}
          <div className="space-y-2">
            <Label>نوع التصدير</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(exportTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certificate Type Filter */}
          {exportType === "students" && (
            <div className="space-y-2">
              <Label>نوع الشهادة</Label>
              <Select value={certificateType} onValueChange={setCertificateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(certificateTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
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

          {/* Date Range Filter */}
          {exportType === "students" && (
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

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
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

import { useState } from "react";
import {
  Printer,
  Download,
  Eye,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  name: string;
  specialty: string;
  gpa: number;
}

const students: Student[] = [
  { id: "1", studentId: "STU001", name: "أحمد محمد", specialty: "هندسة الحاسوب", gpa: 3.85 },
  { id: "2", studentId: "STU002", name: "فاطمة علي", specialty: "هندسة الحاسوب", gpa: 3.92 },
  { id: "3", studentId: "STU003", name: "محمود حسن", specialty: "الهندسة المدنية", gpa: 3.45 },
  { id: "4", studentId: "STU004", name: "عائشة خليل", specialty: "إدارة الأعمال", gpa: 3.78 },
  { id: "5", studentId: "STU005", name: "خالد يوسف", specialty: "الهندسة الكهربائية", gpa: 3.65 },
  { id: "6", studentId: "STU006", name: "نور محمود", specialty: "هندسة الحاسوب", gpa: 3.88 },
  { id: "7", studentId: "STU007", name: "سارة أحمد", specialty: "الصيدلة", gpa: 3.72 },
  { id: "8", studentId: "STU008", name: "علي إبراهيم", specialty: "القانون", gpa: 3.51 },
  { id: "9", studentId: "STU009", name: "هند سعد", specialty: "الطب البشري", gpa: 3.95 },
  { id: "10", studentId: "STU010", name: "إبراهيم فارس", specialty: "الهندسة المعمارية", gpa: 3.68 },
];

const templates = [
  { id: "1", name: "شهادة التخرج الجامعية" },
  { id: "2", name: "شهادة الدراسات العليا" },
  { id: "3", name: "شهادة الدكتوراه" },
  { id: "4", name: "شهادة الدورة التدريبية" },
  { id: "5", name: "شهادة التميز" },
];

export default function PrintCertificates() {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudents[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">طباعة الشهادات</h1>
          <p className="text-muted-foreground mt-1">
            اختر القالب والطلاب لإنشاء الشهادات
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">اختيار القالب</h3>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر قالب الشهادة..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Students Selection */}
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">اختيار الطلاب</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  تم اختيار {selectedStudents.length} طالب
                </span>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedStudents.length === students.length
                    ? "إلغاء الكل"
                    : "تحديد الكل"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.length === students.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="text-right font-semibold">رقم الطالب</TableHead>
                    <TableHead className="text-right font-semibold">الاسم</TableHead>
                    <TableHead className="text-right font-semibold">التخصص</TableHead>
                    <TableHead className="text-right font-semibold">المعدل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow
                      key={student.id}
                      className={cn(
                        "cursor-pointer transition-colors animate-fade-in",
                        selectedStudents.includes(student.id)
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.studentId}
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.specialty}</TableCell>
                      <TableCell className="font-semibold">{student.gpa.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Actions */}
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">معاينة الشهادة</h3>
            <div className="aspect-[3/4] bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
              {selectedTemplate && selectedStudent ? (
                <div className="text-center p-6">
                  <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="font-medium">{selectedStudent.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {templates.find((t) => t.id === selectedTemplate)?.name}
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">اختر قالب وطالب للمعاينة</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="text-lg font-semibold">الإجراءات</h3>
            <Button
              className="w-full gap-2"
              disabled={!selectedTemplate || selectedStudents.length === 0}
            >
              <Eye className="h-4 w-4" />
              معاينة PDF
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={!selectedTemplate || selectedStudents.length === 0}
            >
              <Download className="h-4 w-4" />
              تنزيل PDF
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={!selectedTemplate || selectedStudents.length === 0}
            >
              <Printer className="h-4 w-4" />
              طباعة مباشرة
            </Button>
          </div>

          {/* Print Options */}
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">خيارات الطباعة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">حجم الورق</label>
                <Select defaultValue="a4">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الاتجاه</label>
                <Select defaultValue="portrait">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">عمودي</SelectItem>
                    <SelectItem value="landscape">أفقي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  type: string;
  language: "ar" | "en" | "both";
  isActive: boolean;
  fieldsCount: number;
  createdAt: string;
}

const templates: Template[] = [
  { id: "1", name: "شهادة التخرج الجامعية", type: "Bachelor", language: "ar", isActive: true, fieldsCount: 8, createdAt: "2024-01-15" },
  { id: "2", name: "شهادة الدراسات العليا", type: "Master", language: "ar", isActive: true, fieldsCount: 10, createdAt: "2024-01-20" },
  { id: "3", name: "شهادة الدكتوراه", type: "PhD", language: "both", isActive: true, fieldsCount: 12, createdAt: "2024-02-01" },
  { id: "4", name: "شهادة الدورة التدريبية", type: "Training", language: "ar", isActive: true, fieldsCount: 6, createdAt: "2024-02-10" },
  { id: "5", name: "شهادة التميز", type: "Excellence", language: "ar", isActive: false, fieldsCount: 7, createdAt: "2024-02-15" },
  { id: "6", name: "شهادة المشاركة", type: "Participation", language: "both", isActive: true, fieldsCount: 5, createdAt: "2024-03-01" },
  { id: "7", name: "شهادة الحضور", type: "Attendance", language: "ar", isActive: true, fieldsCount: 4, createdAt: "2024-03-10" },
  { id: "8", name: "شهادة الإنجاز", type: "Achievement", language: "ar", isActive: false, fieldsCount: 6, createdAt: "2024-03-15" },
];

const typeColors: Record<string, string> = {
  Bachelor: "bg-primary/10 text-primary border-primary/20",
  Master: "bg-success/10 text-success border-success/20",
  PhD: "bg-warning/10 text-warning border-warning/20",
  Training: "bg-purple-100 text-purple-700 border-purple-200",
  Excellence: "bg-amber-100 text-amber-700 border-amber-200",
  Participation: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Attendance: "bg-rose-100 text-rose-700 border-rose-200",
  Achievement: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const languageLabels = {
  ar: "العربية",
  en: "الإنجليزية",
  both: "ثنائي اللغة",
};

export default function Templates() {
  const [templatesData, setTemplatesData] = useState(templates);

  const toggleActive = (id: string) => {
    setTemplatesData((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة القوالب</h1>
          <p className="text-muted-foreground mt-1">
            إنشاء وتعديل قوالب الشهادات الجامعية
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          إنشاء قالب جديد
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesData.map((template, index) => (
          <div
            key={template.id}
            className={cn(
              "bg-card rounded-2xl shadow-card p-6 transition-all duration-300 hover:shadow-elevated animate-fade-in",
              !template.isActive && "opacity-60"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem className="gap-2">
                    <Eye className="h-4 w-4" />
                    معاينة
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Edit className="h-4 w-4" />
                    تحرير
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => toggleActive(template.id)}
                  >
                    {template.isActive ? (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        تعطيل
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4" />
                        تفعيل
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className={typeColors[template.type]}>
                {template.type}
              </Badge>
              <Badge variant="outline" className="bg-muted">
                {languageLabels[template.language]}
              </Badge>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
              <span>{template.fieldsCount} حقل</span>
              <span>{new Date(template.createdAt).toLocaleDateString("ar-SA")}</span>
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  template.isActive ? "bg-success" : "bg-muted-foreground"
                )}
              />
              <span className="text-sm text-muted-foreground">
                {template.isActive ? "مفعّل" : "معطّل"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

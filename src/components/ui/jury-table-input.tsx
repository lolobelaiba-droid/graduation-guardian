import * as React from "react";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useAcademicTitles } from "@/hooks/useAcademicTitles";
import { ManageAcademicTitlesDialog } from "@/components/ui/manage-academic-titles-dialog";

// ======== Types ========

export type JuryRole =
  | "president"
  | "supervisor"
  | "co_supervisor"
  | "examiner"
  | "invited";

export const JURY_ROLE_LABELS: Record<JuryRole, string> = {
  president: "رئيس اللجنة",
  supervisor: "مشرف",
  co_supervisor: "مشرف مساعد",
  examiner: "عضو ممتحن",
  invited: "مدعو",
};

export interface AcademicRank {
  label: string;
  abbreviation: string;
}

// Fallback static ranks if DB is not loaded
export const DEFAULT_ACADEMIC_RANKS: AcademicRank[] = [
  { label: "أستاذ التعليم العالي", abbreviation: "أ.ت.ع" },
  { label: "أستاذ محاضر أ", abbreviation: "أ.م.أ" },
  { label: "أستاذ محاضر ب", abbreviation: "أ.م.ب" },
  { label: "أستاذ مساعد أ", abbreviation: "أ.م.س.أ" },
  { label: "أستاذ مساعد ب", abbreviation: "أ.م.س.ب" },
];

export interface JuryMember {
  id: string;
  role: JuryRole;
  name: string;
  rankLabel: string;
  rankAbbreviation: string;
  university: string;
}

// ======== Serialization ========

export function serializeJury(members: JuryMember[]): {
  jury_president_ar: string;
  jury_members_ar: string;
} {
  const formatMember = (m: JuryMember) => {
    const abbr = m.rankAbbreviation?.trim();
    const name = m.name?.trim();
    return abbr && name ? `${abbr} ${name}` : name || abbr || "";
  };

  const president = members.find((m) => m.role === "president");
  const others = members.filter((m) => m.role !== "president");

  return {
    jury_president_ar: president ? formatMember(president) : "",
    jury_members_ar: others.map(formatMember).filter(Boolean).join(" - "),
  };
}

export function parseJury(
  juryPresidentAr: string,
  juryMembersAr: string,
  supervisorAr?: string,
  supervisorUniversity?: string,
  coSupervisorAr?: string,
  coSupervisorUniversity?: string,
  ranks?: AcademicRank[]
): JuryMember[] {
  const makeId = () => Math.random().toString(36).slice(2);
  const effectiveRanks = ranks && ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS;

  const parseMember = (raw: string, role: JuryRole): JuryMember => {
    const trimmed = raw.trim();
    const knownRank = effectiveRanks.find((r) =>
      trimmed.startsWith(r.abbreviation + " ")
    );
    if (knownRank) {
      return {
        id: makeId(),
        role,
        name: trimmed.slice(knownRank.abbreviation.length + 1).trim(),
        rankLabel: knownRank.label,
        rankAbbreviation: knownRank.abbreviation,
        university: "",
      };
    }
    const parts = trimmed.split(" ");
    const maybeAbbr = parts[0] || "";
    const rest = parts.slice(1).join(" ");
    return {
      id: makeId(),
      role,
      name: rest || trimmed,
      rankLabel: "",
      rankAbbreviation: maybeAbbr && rest ? maybeAbbr : "",
      university: "",
    };
  };

  const rows: JuryMember[] = [];

  // Row 1: President (always)
  if (juryPresidentAr?.trim()) {
    rows.push(parseMember(juryPresidentAr.trim(), "president"));
  } else {
    rows.push({ id: makeId(), role: "president", name: "", rankLabel: "", rankAbbreviation: "", university: "" });
  }

  // Row 2: Supervisor (auto from supervisor fields)
  const supParsed = supervisorAr?.trim() ? parseMember(supervisorAr.trim(), "supervisor") : null;
  const supRow: JuryMember = supParsed
    ? { ...supParsed, role: "supervisor", university: supervisorUniversity || "" }
    : { id: makeId(), role: "supervisor", name: "", rankLabel: "", rankAbbreviation: "", university: supervisorUniversity || "" };
  rows.push(supRow);

  // Row 3: Co-supervisor (auto, only if present)
  if (coSupervisorAr?.trim()) {
    const coSupParsed = parseMember(coSupervisorAr.trim(), "co_supervisor");
    rows.push({ ...coSupParsed, role: "co_supervisor", university: coSupervisorUniversity || "" });
  }

  // Remaining rows: other jury members from jury_members_ar
  if (juryMembersAr?.trim()) {
    const parts = juryMembersAr
      .split(/\s*-\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    parts.forEach((p) => rows.push(parseMember(p, "examiner")));
  }

  return rows;
}

// ======== Sub-components ========

interface RankCellProps {
  rankLabel: string;
  rankAbbreviation: string;
  onChange: (label: string, abbreviation: string) => void;
  ranks: AcademicRank[];
}

const RankCell: React.FC<RankCellProps> = ({
  rankLabel,
  rankAbbreviation,
  onChange,
  ranks,
}) => {
  const [customAbbr, setCustomAbbr] = React.useState(rankAbbreviation);
  const effectiveRanks = ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS;

  const handleSelectRank = (label: string) => {
    const found = effectiveRanks.find((r) => r.label === label);
    const abbr = found ? found.abbreviation : customAbbr;
    setCustomAbbr(abbr);
    onChange(label, abbr);
  };

  const handleAbbrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAbbr(e.target.value);
    onChange(rankLabel, e.target.value);
  };

  React.useEffect(() => {
    setCustomAbbr(rankAbbreviation);
  }, [rankAbbreviation]);

  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <Select value={rankLabel} onValueChange={handleSelectRank}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="اختر الرتبة" />
        </SelectTrigger>
        <SelectContent>
          {effectiveRanks.map((r) => (
            <SelectItem key={r.label} value={r.label}>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-1 rounded">
                  {r.abbreviation}
                </span>
                {r.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// ======== Main JuryTableInput Component ========

export interface ProfessorInfo {
  full_name: string;
  rank_label?: string | null;
  rank_abbreviation?: string | null;
  university?: string | null;
}

export interface JuryTableInputProps {
  presidentValue: string;
  membersValue: string;
  onChange: (president: string, members: string) => void;
  /** supervisor fields for auto-population */
  supervisorAr?: string;
  supervisorUniversity?: string;
  coSupervisorAr?: string;
  coSupervisorUniversity?: string;
  nameSuggestions?: string[];
  universitySuggestions?: string[];
  className?: string;
  findProfessor?: (name: string) => ProfessorInfo | undefined;
  onProfessorDataChange?: (name: string, rankLabel?: string, rankAbbreviation?: string, university?: string) => void;
}

export const JuryTableInput: React.FC<JuryTableInputProps> = ({
  presidentValue,
  membersValue,
  onChange,
  supervisorAr = "",
  supervisorUniversity = "",
  coSupervisorAr = "",
  coSupervisorUniversity = "",
  nameSuggestions = [],
  universitySuggestions = [],
  className,
  findProfessor,
  onProfessorDataChange,
}) => {
  const { titles, isLoading: ranksLoading } = useAcademicTitles();
  const [manageOpen, setManageOpen] = React.useState(false);

  const ranks: AcademicRank[] = React.useMemo(
    () => titles.map((t) => ({ label: t.full_name, abbreviation: t.abbreviation })),
    [titles]
  );

  const [rows, setRows] = React.useState<JuryMember[]>(() =>
    parseJury(presidentValue, membersValue, supervisorAr, supervisorUniversity, coSupervisorAr, coSupervisorUniversity, ranks)
  );

  const prevPresidentRef = React.useRef(presidentValue);
  const prevMembersRef = React.useRef(membersValue);
  const prevSupRef = React.useRef(supervisorAr);
  const prevCoSupRef = React.useRef(coSupervisorAr);

  // Sync from outside when values change
  React.useEffect(() => {
    const changed =
      presidentValue !== prevPresidentRef.current ||
      membersValue !== prevMembersRef.current ||
      supervisorAr !== prevSupRef.current ||
      coSupervisorAr !== prevCoSupRef.current;

    if (changed) {
      prevPresidentRef.current = presidentValue;
      prevMembersRef.current = membersValue;
      prevSupRef.current = supervisorAr;
      prevCoSupRef.current = coSupervisorAr;

      setRows(
        parseJury(
          presidentValue,
          membersValue,
          supervisorAr,
          supervisorUniversity,
          coSupervisorAr,
          coSupervisorUniversity,
          ranks
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presidentValue, membersValue, supervisorAr, coSupervisorAr]);

  const notifyChange = React.useCallback(
    (newRows: JuryMember[]) => {
      // For serialization: exclude supervisor/co_supervisor rows (they are saved separately)
      const forSerial = newRows.filter(
        (r) => r.role !== "supervisor" && r.role !== "co_supervisor"
      );
      const { jury_president_ar, jury_members_ar } = serializeJury(forSerial);
      prevPresidentRef.current = jury_president_ar;
      prevMembersRef.current = jury_members_ar;
      onChange(jury_president_ar, jury_members_ar);
    },
    [onChange]
  );

  const updateRow = (id: string, patch: Partial<JuryMember>) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        // Save professor data when rank or university changes
        if (onProfessorDataChange && updated.name && (patch.rankLabel || patch.rankAbbreviation || patch.university)) {
          onProfessorDataChange(updated.name, updated.rankLabel, updated.rankAbbreviation, updated.university);
        }
        return updated;
      });
      notifyChange(next);
      return next;
    });
  };

  const addRow = () => {
    const newRow: JuryMember = {
      id: Math.random().toString(36).slice(2),
      role: "examiner",
      name: "",
      rankLabel: "",
      rankAbbreviation: "",
      university: "",
    };
    setRows((prev) => {
      const next = [...prev, newRow];
      notifyChange(next);
      return next;
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      notifyChange(next);
      return next;
    });
  };

  const isFixed = (role: JuryRole) =>
    role === "president";

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Header with manage button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          الصف 1 = رئيس اللجنة، الصف 2 = المشرف (تلقائي)، الصف 3 = المشرف المساعد (تلقائي إن وجد)
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setManageOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          إدارة الرتب
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground w-8">#</th>
              <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground w-20">الاختصار</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">الاسم واللقب</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-32">الصفة</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-44">الرتبة</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">جامعة الانتماء</th>
              <th className="py-2 px-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border last:border-0",
                  row.role === "president"
                    ? "bg-primary/5"
                    : row.role === "supervisor"
                    ? "bg-secondary/30"
                    : row.role === "co_supervisor"
                    ? "bg-accent/30"
                    : "hover:bg-muted/30"
                )}
              >
                {/* Number */}
                <td className="py-1.5 px-2 text-center text-muted-foreground font-mono text-xs align-middle">
                  {index + 1}
                </td>

                {/* Abbreviation - before name */}
                <td className="py-1.5 px-2 align-middle">
                  <Input
                    className="h-8 text-xs font-mono text-center w-16"
                    value={row.rankAbbreviation}
                    onChange={(e) =>
                      updateRow(row.id, { rankAbbreviation: e.target.value })
                    }
                    placeholder="—"
                    dir="rtl"
                  />
                </td>

                {/* Name */}
                <td className="py-1.5 px-2 align-middle">
                  <div className="relative">
                    <AutocompleteInput
                      value={row.name}
                      onValueChange={(v) => {
                        const patch: Partial<JuryMember> = { name: v };
                        // Auto-fill rank and university from professor database
                        if (findProfessor) {
                          const prof = findProfessor(v);
                          if (prof) {
                            if (prof.rank_label) patch.rankLabel = prof.rank_label;
                            if (prof.rank_abbreviation) patch.rankAbbreviation = prof.rank_abbreviation;
                            if (prof.university) patch.university = prof.university;
                          }
                        }
                        updateRow(row.id, patch);
                      }}
                      suggestions={nameSuggestions}
                      placeholder="الاسم واللقب"
                      className="h-8 text-xs"
                      dir="rtl"
                    />
                    {(row.role === "supervisor" || row.role === "co_supervisor") && (
                      <span className="absolute -top-2 end-1 text-[9px] text-muted-foreground bg-muted px-1 rounded leading-tight">
                        تلقائي
                      </span>
                    )}
                  </div>
                </td>

                {/* Role */}
                <td className="py-1.5 px-2 align-middle">
                  {isFixed(row.role) ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap bg-primary/10 text-primary">
                      {JURY_ROLE_LABELS[row.role]}
                    </span>
                  ) : row.role === "supervisor" || row.role === "co_supervisor" ? (
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap",
                      row.role === "supervisor" ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"
                    )}>
                      {JURY_ROLE_LABELS[row.role]}
                    </span>
                  ) : (
                    <Select
                      value={row.role}
                      onValueChange={(v) => updateRow(row.id, { role: v as JuryRole })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(JURY_ROLE_LABELS) as [JuryRole, string][])
                          .filter(([v]) => v !== "president" && v !== "supervisor" && v !== "co_supervisor")
                          .map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>

                {/* Rank */}
                <td className="py-1.5 px-2 align-middle">
                    <Select
                      value={row.rankLabel}
                      onValueChange={(label) => {
                        const found = (ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS).find((r) => r.label === label);
                        updateRow(row.id, { rankLabel: label, rankAbbreviation: found?.abbreviation || row.rankAbbreviation });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="اختر الرتبة" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS).map((r) => (
                          <SelectItem key={r.label} value={r.label}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </td>

                {/* University */}
                <td className="py-1.5 px-2 align-middle">
                    <AutocompleteInput
                      value={row.university}
                      onValueChange={(v) => updateRow(row.id, { university: v })}
                      suggestions={universitySuggestions}
                      placeholder="جامعة الانتماء"
                      className="h-8 text-xs"
                      dir="rtl"
                    />
                </td>

                {/* Delete */}
                <td className="py-1.5 px-1 align-middle">
                  {!isFixed(row.role) && row.role !== "supervisor" && row.role !== "co_supervisor" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة عضو
      </Button>

      {/* Summary preview */}
      {rows.length > 0 && (
        <div className="rounded-md bg-muted/40 border border-border p-2 text-xs space-y-1" dir="rtl">
          <p className="text-muted-foreground font-medium text-[11px] mb-1">معاينة البيانات المحفوظة:</p>
          {(() => {
            const forSerial = rows.filter(
              (r) => r.role !== "supervisor" && r.role !== "co_supervisor"
            );
            const { jury_president_ar, jury_members_ar } = serializeJury(forSerial);
            return (
              <>
                {jury_president_ar && (
                  <p>
                    <span className="text-muted-foreground">رئيس اللجنة: </span>
                    <span className="font-medium">{jury_president_ar}</span>
                  </p>
                )}
                {jury_members_ar && (
                  <p>
                    <span className="text-muted-foreground">الأعضاء: </span>
                    <span className="font-medium">{jury_members_ar}</span>
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      <ManageAcademicTitlesDialog />
    </div>
  );
};

JuryTableInput.displayName = "JuryTableInput";

// ======== SupervisorTableInput ========

export interface SupervisorPerson {
  name: string;
  rankLabel: string;
  rankAbbreviation: string;
  university: string;
}

export interface SupervisorTableInputProps {
  supervisorValue: string;
  supervisorUniversity: string;
  coSupervisorValue: string;
  coSupervisorUniversity: string;
  onSupervisorChange: (name: string, university: string) => void;
  onCoSupervisorChange: (name: string, university: string) => void;
  nameSuggestions?: string[];
  universitySuggestions?: string[];
  className?: string;
  showCoSupervisor?: boolean;
  findProfessor?: (name: string) => ProfessorInfo | undefined;
  onProfessorDataChange?: (name: string, rankLabel?: string, rankAbbreviation?: string, university?: string) => void;
}

function parseSupervisorString(raw: string, ranks: AcademicRank[]): SupervisorPerson {
  const trimmed = raw?.trim() || "";
  const effectiveRanks = ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS;
  const knownRank = effectiveRanks.find((r) => trimmed.startsWith(r.abbreviation + " "));
  if (knownRank) {
    return {
      name: trimmed.slice(knownRank.abbreviation.length + 1).trim(),
      rankLabel: knownRank.label,
      rankAbbreviation: knownRank.abbreviation,
      university: "",
    };
  }
  return { name: trimmed, rankLabel: "", rankAbbreviation: "", university: "" };
}

function serializeSupervisor(p: SupervisorPerson): string {
  const abbr = p.rankAbbreviation?.trim();
  const name = p.name?.trim();
  return abbr && name ? `${abbr} ${name}` : name || abbr || "";
}

export const SupervisorTableInput: React.FC<SupervisorTableInputProps> = ({
  supervisorValue,
  supervisorUniversity,
  coSupervisorValue,
  coSupervisorUniversity,
  onSupervisorChange,
  onCoSupervisorChange,
  nameSuggestions = [],
  universitySuggestions = [],
  className,
  showCoSupervisor = true,
  findProfessor,
  onProfessorDataChange,
}) => {
  const { titles } = useAcademicTitles();
  const [manageOpen, setManageOpen] = React.useState(false);

  const ranks: AcademicRank[] = React.useMemo(
    () => titles.map((t) => ({ label: t.full_name, abbreviation: t.abbreviation })),
    [titles]
  );

  const [supervisor, setSupervisor] = React.useState<SupervisorPerson>(() => ({
    ...parseSupervisorString(supervisorValue, ranks),
    university: supervisorUniversity,
  }));

  const [coSupervisor, setCoSupervisor] = React.useState<SupervisorPerson>(() => ({
    ...parseSupervisorString(coSupervisorValue, ranks),
    university: coSupervisorUniversity,
  }));

  // Sync from outside
  const prevSupRef = React.useRef(supervisorValue);
  const prevCoSupRef = React.useRef(coSupervisorValue);

  React.useEffect(() => {
    if (supervisorValue !== prevSupRef.current) {
      prevSupRef.current = supervisorValue;
      setSupervisor({ ...parseSupervisorString(supervisorValue, ranks), university: supervisorUniversity });
    }
  }, [supervisorValue, supervisorUniversity, ranks]);

  React.useEffect(() => {
    if (coSupervisorValue !== prevCoSupRef.current) {
      prevCoSupRef.current = coSupervisorValue;
      setCoSupervisor({ ...parseSupervisorString(coSupervisorValue, ranks), university: coSupervisorUniversity });
    }
  }, [coSupervisorValue, coSupervisorUniversity, ranks]);

  const handleSupervisorChange = (patch: Partial<SupervisorPerson>) => {
    setSupervisor((prev) => {
      const next = { ...prev, ...patch };
      onSupervisorChange(serializeSupervisor(next), next.university);
      // Save professor data when rank or university changes
      if (onProfessorDataChange && next.name && (patch.rankLabel || patch.rankAbbreviation || patch.university)) {
        onProfessorDataChange(next.name, next.rankLabel, next.rankAbbreviation, next.university);
      }
      return next;
    });
  };

  const handleCoSupervisorChange = (patch: Partial<SupervisorPerson>) => {
    setCoSupervisor((prev) => {
      const next = { ...prev, ...patch };
      onCoSupervisorChange(serializeSupervisor(next), next.university);
      // Save professor data when rank or university changes
      if (onProfessorDataChange && next.name && (patch.rankLabel || patch.rankAbbreviation || patch.university)) {
        onProfessorDataChange(next.name, next.rankLabel, next.rankAbbreviation, next.university);
      }
      return next;
    });
  };

  const handleRankSelect = (
    label: string,
    handler: (patch: Partial<SupervisorPerson>) => void
  ) => {
    const found = (ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS).find((r) => r.label === label);
    handler({ rankLabel: label, rankAbbreviation: found?.abbreviation || "" });
  };

  const effectiveRanks = ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setManageOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          إدارة الرتب
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-24">الصفة</th>
              <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground w-20">الاختصار</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">الاسم واللقب</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-44">الرتبة</th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">جامعة الانتماء</th>
            </tr>
          </thead>
          <tbody>
            {/* Supervisor row */}
            <tr className="border-b border-border bg-secondary/30">
              <td className="py-1.5 px-2 align-middle">
                <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md whitespace-nowrap">
                  المشرف *
                </span>
              </td>
              <td className="py-1.5 px-2 align-middle">
                <Input
                  className="h-8 text-xs font-mono text-center w-16"
                  value={supervisor.rankAbbreviation}
                  onChange={(e) => handleSupervisorChange({ rankAbbreviation: e.target.value })}
                  placeholder="—"
                  dir="rtl"
                />
              </td>
              <td className="py-1.5 px-2 align-middle">
                <AutocompleteInput
                  value={supervisor.name}
                  onValueChange={(v) => {
                    const patch: Partial<SupervisorPerson> = { name: v };
                    if (findProfessor) {
                      const prof = findProfessor(v);
                      if (prof) {
                        if (prof.rank_label) patch.rankLabel = prof.rank_label;
                        if (prof.rank_abbreviation) patch.rankAbbreviation = prof.rank_abbreviation;
                        if (prof.university) patch.university = prof.university;
                      }
                    }
                    handleSupervisorChange(patch);
                  }}
                  suggestions={nameSuggestions}
                  placeholder="اسم ولقب المشرف"
                  className="h-8 text-xs"
                  dir="rtl"
                />
              </td>
              <td className="py-1.5 px-2 align-middle">
                <Select
                  value={supervisor.rankLabel}
                  onValueChange={(v) => handleRankSelect(v, handleSupervisorChange)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر الرتبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveRanks.map((r) => (
                      <SelectItem key={r.label} value={r.label}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5 px-2 align-middle">
                <AutocompleteInput
                  value={supervisor.university}
                  onValueChange={(v) => handleSupervisorChange({ university: v })}
                  suggestions={universitySuggestions}
                  placeholder="جامعة الانتماء"
                  className="h-8 text-xs"
                  dir="rtl"
                />
              </td>
            </tr>

            {/* Co-supervisor row */}
            {showCoSupervisor && (
              <tr className="bg-accent/30">
                <td className="py-1.5 px-2 align-middle">
                  <span className="text-xs font-medium bg-accent text-accent-foreground px-2 py-1 rounded-md whitespace-nowrap">
                    المشرف المساعد
                  </span>
                </td>
                <td className="py-1.5 px-2 align-middle">
                  <Input
                    className="h-8 text-xs font-mono text-center w-16"
                    value={coSupervisor.rankAbbreviation}
                    onChange={(e) => handleCoSupervisorChange({ rankAbbreviation: e.target.value })}
                    placeholder="—"
                    dir="rtl"
                  />
                </td>
                <td className="py-1.5 px-2 align-middle">
                  <AutocompleteInput
                    value={coSupervisor.name}
                    onValueChange={(v) => {
                      const patch: Partial<SupervisorPerson> = { name: v };
                      if (findProfessor) {
                        const prof = findProfessor(v);
                        if (prof) {
                          if (prof.rank_label) patch.rankLabel = prof.rank_label;
                          if (prof.rank_abbreviation) patch.rankAbbreviation = prof.rank_abbreviation;
                          if (prof.university) patch.university = prof.university;
                        }
                      }
                      handleCoSupervisorChange(patch);
                    }}
                    suggestions={nameSuggestions}
                    placeholder="اسم ولقب المشرف المساعد (اختياري)"
                    className="h-8 text-xs"
                    dir="rtl"
                  />
                </td>
                <td className="py-1.5 px-2 align-middle">
                  <Select
                    value={coSupervisor.rankLabel}
                    onValueChange={(v) => handleRankSelect(v, handleCoSupervisorChange)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="اختر الرتبة" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveRanks.map((r) => (
                        <SelectItem key={r.label} value={r.label}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1.5 px-2 align-middle">
                  <AutocompleteInput
                    value={coSupervisor.university}
                    onValueChange={(v) => handleCoSupervisorChange({ university: v })}
                    suggestions={universitySuggestions}
                    placeholder="جامعة الانتماء"
                    className="h-8 text-xs"
                    dir="rtl"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ManageAcademicTitlesDialog />
    </div>
  );
};

SupervisorTableInput.displayName = "SupervisorTableInput";

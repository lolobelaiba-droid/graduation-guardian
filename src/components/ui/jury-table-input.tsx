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

// Fallback static ranks – these MUST match the abbreviations in the academic_titles DB table
export const DEFAULT_ACADEMIC_RANKS: AcademicRank[] = [];

// Legacy abbreviation patterns that may exist in old data.
// Maps legacy abbreviation → rank label so we can look up the correct DB abbreviation dynamically.
const LEGACY_ABBR_PATTERNS: { pattern: RegExp; rankLabel: string }[] = [
  { pattern: /^أ\.ت\.ع\s+/, rankLabel: "أستاذ التعليم العالي" },
  { pattern: /^أ\.م\.أ\s+/, rankLabel: "أستاذ محاضر أ" },
  { pattern: /^أ\.م\.ب\s+/, rankLabel: "أستاذ محاضر ب" },
  { pattern: /^أ\.م\.س\.أ\s+/, rankLabel: "أستاذ مساعد أ" },
  { pattern: /^أ\.م\.س\.ب\s+/, rankLabel: "أستاذ مساعد ب" },
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
    
    // Try exact match with known ranks (longest abbreviation first)
    const sortedRanks = [...effectiveRanks].sort((a, b) => b.abbreviation.length - a.abbreviation.length);
    for (const r of sortedRanks) {
      if (trimmed.startsWith(r.abbreviation + " ")) {
        return {
          id: makeId(),
          role,
          name: trimmed.slice(r.abbreviation.length + 1).trim(),
          rankLabel: r.label,
          rankAbbreviation: r.abbreviation,
          university: "",
        };
      }
    }

    // Try legacy patterns (map legacy abbreviation → rank label → correct DB abbreviation)
    for (const lp of LEGACY_ABBR_PATTERNS) {
      if (lp.pattern.test(trimmed)) {
        const cleanName = trimmed.replace(lp.pattern, "").trim();
        const matchedRank = lp.rankLabel ? effectiveRanks.find(r => r.label === lp.rankLabel) : undefined;
        return {
          id: makeId(),
          role,
          name: cleanName,
          rankLabel: matchedRank?.label || lp.rankLabel || "",
          rankAbbreviation: matchedRank?.abbreviation || "",
          university: "",
        };
      }
    }

    return {
      id: makeId(),
      role,
      name: trimmed,
      rankLabel: "",
      rankAbbreviation: "",
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
  // Skip entries that match the supervisor or co-supervisor to avoid duplicates
  if (juryMembersAr?.trim()) {
    const supName = supRow.name?.trim().toLowerCase() || "";
    const coSupName = coSupervisorAr?.trim() ? (() => {
      const parsed = parseMember(coSupervisorAr.trim(), "co_supervisor");
      return parsed.name?.trim().toLowerCase() || "";
    })() : "";

    const parts = juryMembersAr
      .split(/\s*-\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    parts.forEach((p) => {
      const parsed = parseMember(p, "examiner");
      const pName = parsed.name?.trim().toLowerCase() || "";
      // Skip if this member matches supervisor or co-supervisor
      if (supName && pName === supName) return;
      if (coSupName && pName === coSupName) return;
      rows.push(parsed);
    });
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
  /** Called when the supervisor row is edited inside the jury table */
  onSupervisorChange?: (name: string, university: string) => void;
  /** Called when the co-supervisor row is edited inside the jury table */
  onCoSupervisorChange?: (name: string, university: string) => void;
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
  onSupervisorChange,
  onCoSupervisorChange,
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

  // Flag to prevent circular re-parse when change originated from within the table
  const internalChangeRef = React.useRef(false);

  // Sync from outside when values change OR when ranks load from DB
  const prevRanksLenRef = React.useRef(ranks.length);

  React.useEffect(() => {
    const ranksJustLoaded = ranks.length > 0 && prevRanksLenRef.current === 0;
    prevRanksLenRef.current = ranks.length;

    const supChanged = supervisorAr !== prevSupRef.current;
    const coSupChanged = coSupervisorAr !== prevCoSupRef.current;
    const presChanged = presidentValue !== prevPresidentRef.current;
    const memChanged = membersValue !== prevMembersRef.current;

    const changed = ranksJustLoaded || presChanged || memChanged || supChanged || coSupChanged;

    if (!changed) return;

    // If the change was triggered internally (from jury table editing), skip full re-parse
    // to avoid wiping rank/university data that was just set
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      prevPresidentRef.current = presidentValue;
      prevMembersRef.current = membersValue;
      prevSupRef.current = supervisorAr;
      prevCoSupRef.current = coSupervisorAr;
      return;
    }

    prevPresidentRef.current = presidentValue;
    prevMembersRef.current = membersValue;
    prevSupRef.current = supervisorAr;
    prevCoSupRef.current = coSupervisorAr;

    // When only supervisor/co-supervisor changed (not president/members),
    // update just those rows instead of full re-parse to preserve rank data
    if ((supChanged || coSupChanged) && !presChanged && !memChanged && !ranksJustLoaded) {
      setRows((prev) => {
        return prev.map((row) => {
          if (row.role === "supervisor" && supChanged) {
            const parsed = parseSupervisorString(supervisorAr, ranks);
            return {
              ...row,
              name: parsed.name || supervisorAr,
              // Only overwrite rank if the new value actually has one
              rankLabel: parsed.rankLabel || row.rankLabel,
              rankAbbreviation: parsed.rankAbbreviation || row.rankAbbreviation,
              university: supervisorUniversity || row.university,
            };
          }
          if (row.role === "co_supervisor" && coSupChanged) {
            const parsed = parseSupervisorString(coSupervisorAr, ranks);
            return {
              ...row,
              name: parsed.name || coSupervisorAr,
              rankLabel: parsed.rankLabel || row.rankLabel,
              rankAbbreviation: parsed.rankAbbreviation || row.rankAbbreviation,
              university: coSupervisorUniversity || row.university,
            };
          }
          return row;
        });
      });
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presidentValue, membersValue, supervisorAr, coSupervisorAr, ranks]);

  // Enrich rows with professor data (rank, university) from the professor registry
  // This runs after initial parse and whenever findProfessor data becomes available
  const prevProfCountRef = React.useRef(0);
  React.useEffect(() => {
    if (!findProfessor) return;
    // Only run when professor data count changes (i.e., data loaded or updated)
    const currentCount = (nameSuggestions || []).length;
    if (currentCount === 0) return;
    if (currentCount === prevProfCountRef.current) return;
    prevProfCountRef.current = currentCount;

    setRows((prev) => {
      let changed = false;
      const enriched = prev.map((row) => {
        if (!row.name?.trim()) return row;
        const prof = findProfessor(row.name);
        if (!prof) return row;
        // Only fill in missing rank/university data, don't overwrite existing
        const updates: Partial<JuryMember> = {};
        if (!row.rankLabel && prof.rank_label) {
          updates.rankLabel = prof.rank_label;
          changed = true;
        }
        if (!row.rankAbbreviation && prof.rank_abbreviation) {
          updates.rankAbbreviation = prof.rank_abbreviation;
          changed = true;
        }
        if (!row.university && prof.university) {
          updates.university = prof.university;
          changed = true;
        }
        return changed ? { ...row, ...updates } : row;
      });
      if (!changed) return prev;
      // Don't call notifyChange here to avoid circular updates - this is just UI enrichment
      return enriched;
    });
  }, [findProfessor, nameSuggestions]);

  const notifyChange = React.useCallback(
    (newRows: JuryMember[]) => {
      // Serialize: president goes to jury_president_ar
      // All others (including supervisor & co_supervisor) go to jury_members_ar
      // Order: supervisor → co_supervisor → examiners/invited
      const president = newRows.find((r) => r.role === "president");
      const supervisor = newRows.find((r) => r.role === "supervisor");
      const coSupervisor = newRows.find((r) => r.role === "co_supervisor");
      const others = newRows.filter(
        (r) => r.role !== "president" && r.role !== "supervisor" && r.role !== "co_supervisor"
      );

      const formatMember = (m: JuryMember) => {
        const abbr = m.rankAbbreviation?.trim();
        const name = m.name?.trim();
        return abbr && name ? `${abbr} ${name}` : name || abbr || "";
      };

      const membersOrdered: JuryMember[] = [];
      if (supervisor && supervisor.name?.trim()) membersOrdered.push(supervisor);
      if (coSupervisor && coSupervisor.name?.trim()) membersOrdered.push(coSupervisor);
      membersOrdered.push(...others);

      const jury_president_ar = president ? formatMember(president) : "";
      const jury_members_ar = membersOrdered.map(formatMember).filter(Boolean).join(" - ");

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
        // Propagate supervisor/co-supervisor changes back to form (name only, no abbreviation)
        // Set internal flag to prevent the useEffect from re-parsing and wiping rank data
        if (updated.role === "supervisor" && onSupervisorChange && (patch.name !== undefined || patch.rankLabel !== undefined || patch.rankAbbreviation !== undefined || patch.university !== undefined)) {
          internalChangeRef.current = true;
          onSupervisorChange(updated.name?.trim() || "", updated.university || "");
        }
        if (updated.role === "co_supervisor" && onCoSupervisorChange && (patch.name !== undefined || patch.rankLabel !== undefined || patch.rankAbbreviation !== undefined || patch.university !== undefined)) {
          internalChangeRef.current = true;
          onCoSupervisorChange(updated.name?.trim() || "", updated.university || "");
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
            const formatMember = (m: JuryMember) => {
              const abbr = m.rankAbbreviation?.trim();
              const name = m.name?.trim();
              return abbr && name ? `${abbr} ${name}` : name || abbr || "";
            };
            const president = rows.find((r) => r.role === "president");
            const supervisor = rows.find((r) => r.role === "supervisor");
            const coSupervisor = rows.find((r) => r.role === "co_supervisor");
            const others = rows.filter(
              (r) => r.role !== "president" && r.role !== "supervisor" && r.role !== "co_supervisor"
            );
            const membersOrdered: JuryMember[] = [];
            if (supervisor && supervisor.name?.trim()) membersOrdered.push(supervisor);
            if (coSupervisor && coSupervisor.name?.trim()) membersOrdered.push(coSupervisor);
            membersOrdered.push(...others);
            const jury_president_ar = president ? formatMember(president) : "";
            const jury_members_ar = membersOrdered.map(formatMember).filter(Boolean).join(" - ");
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
  if (!trimmed) return { name: "", rankLabel: "", rankAbbreviation: "", university: "" };

  const effectiveRanks = ranks.length > 0 ? ranks : DEFAULT_ACADEMIC_RANKS;

  // First try exact match with known ranks (longest abbreviation first)
  const sortedRanks = [...effectiveRanks].sort((a, b) => b.abbreviation.length - a.abbreviation.length);
  for (const r of sortedRanks) {
    if (trimmed.startsWith(r.abbreviation + " ")) {
      return {
        name: trimmed.slice(r.abbreviation.length + 1).trim(),
        rankLabel: r.label,
        rankAbbreviation: r.abbreviation,
        university: "",
      };
    }
  }

  // Try legacy patterns (map legacy abbreviation → rank label → correct DB abbreviation)
  for (const lp of LEGACY_ABBR_PATTERNS) {
    if (lp.pattern.test(trimmed)) {
      const cleanName = trimmed.replace(lp.pattern, "").trim();
      const matchedRank = lp.rankLabel ? effectiveRanks.find(r => r.label === lp.rankLabel) : undefined;
      return {
        name: cleanName,
        rankLabel: matchedRank?.label || lp.rankLabel || "",
        rankAbbreviation: matchedRank?.abbreviation || "",
        university: "",
      };
    }
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
  const internalSupChangeRef = React.useRef(false);
  const internalCoSupChangeRef = React.useRef(false);

  React.useEffect(() => {
    if (supervisorValue !== prevSupRef.current) {
      prevSupRef.current = supervisorValue;
      // Skip re-parse if the change originated from within this component
      if (internalSupChangeRef.current) {
        internalSupChangeRef.current = false;
        return;
      }
      const parsed = parseSupervisorString(supervisorValue, ranks);
      setSupervisor((prev) => ({
        ...parsed,
        rankLabel: parsed.rankLabel || prev.rankLabel,
        rankAbbreviation: parsed.rankAbbreviation || prev.rankAbbreviation,
        university: supervisorUniversity,
      }));
    }
  }, [supervisorValue, supervisorUniversity, ranks]);

  React.useEffect(() => {
    if (coSupervisorValue !== prevCoSupRef.current) {
      prevCoSupRef.current = coSupervisorValue;
      if (internalCoSupChangeRef.current) {
        internalCoSupChangeRef.current = false;
        return;
      }
      const parsed = parseSupervisorString(coSupervisorValue, ranks);
      setCoSupervisor((prev) => ({
        ...parsed,
        rankLabel: parsed.rankLabel || prev.rankLabel,
        rankAbbreviation: parsed.rankAbbreviation || prev.rankAbbreviation,
        university: coSupervisorUniversity,
      }));
    }
  }, [coSupervisorValue, coSupervisorUniversity, ranks]);

  // Enrich supervisor/co-supervisor with professor data on load
  React.useEffect(() => {
    if (!findProfessor) return;
    
    setSupervisor((prev) => {
      if (!prev.name?.trim() || (prev.rankLabel && prev.rankAbbreviation)) return prev;
      const prof = findProfessor(prev.name);
      if (!prof) return prev;
      return {
        ...prev,
        rankLabel: prev.rankLabel || prof.rank_label || "",
        rankAbbreviation: prev.rankAbbreviation || prof.rank_abbreviation || "",
        university: prev.university || prof.university || "",
      };
    });

    setCoSupervisor((prev) => {
      if (!prev.name?.trim() || (prev.rankLabel && prev.rankAbbreviation)) return prev;
      const prof = findProfessor(prev.name);
      if (!prof) return prev;
      return {
        ...prev,
        rankLabel: prev.rankLabel || prof.rank_label || "",
        rankAbbreviation: prev.rankAbbreviation || prof.rank_abbreviation || "",
        university: prev.university || prof.university || "",
      };
    });
  }, [findProfessor, nameSuggestions]);

  const handleSupervisorChange = (patch: Partial<SupervisorPerson>) => {
    setSupervisor((prev) => {
      const next = { ...prev, ...patch };
      internalSupChangeRef.current = true;
      onSupervisorChange(next.name?.trim() || "", next.university);
      if (onProfessorDataChange && next.name && (patch.rankLabel || patch.rankAbbreviation || patch.university)) {
        onProfessorDataChange(next.name, next.rankLabel, next.rankAbbreviation, next.university);
      }
      return next;
    });
  };

  const handleCoSupervisorChange = (patch: Partial<SupervisorPerson>) => {
    setCoSupervisor((prev) => {
      const next = { ...prev, ...patch };
      internalCoSupChangeRef.current = true;
      onCoSupervisorChange(next.name?.trim() || "", next.university);
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

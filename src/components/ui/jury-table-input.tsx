import * as React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
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

/**
 * Converts jury rows into the two string fields stored in the DB:
 *   jury_president_ar  → the president row (role=president)
 *   jury_members_ar    → remaining rows joined by " - "
 *
 * Each member is formatted as: "الرتبة الاسم"
 */
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

/**
 * Parses the stored strings back into JuryMember rows for editing.
 * The president string goes to role=president, members string is split by " - ".
 */
export function parseJury(
  juryPresidentAr: string,
  juryMembersAr: string
): JuryMember[] {
  const makeId = () => Math.random().toString(36).slice(2);

  const parseMember = (raw: string, role: JuryRole): JuryMember => {
    const trimmed = raw.trim();
    // Try to match a known abbreviation at the start
    const knownAbbr = DEFAULT_ACADEMIC_RANKS.find((r) =>
      trimmed.startsWith(r.abbreviation + " ")
    );
    if (knownAbbr) {
      return {
        id: makeId(),
        role,
        name: trimmed.slice(knownAbbr.abbreviation.length + 1).trim(),
        rankLabel: knownAbbr.label,
        rankAbbreviation: knownAbbr.abbreviation,
        university: "",
      };
    }
    // Fallback: first token might be an abbreviation
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

  if (juryPresidentAr?.trim()) {
    rows.push(parseMember(juryPresidentAr.trim(), "president"));
  }

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
}

const RankCell: React.FC<RankCellProps> = ({
  rankLabel,
  rankAbbreviation,
  onChange,
}) => {
  const [customAbbr, setCustomAbbr] = React.useState(rankAbbreviation);

  const handleSelectRank = (label: string) => {
    const found = DEFAULT_ACADEMIC_RANKS.find((r) => r.label === label);
    const abbr = found ? found.abbreviation : customAbbr;
    setCustomAbbr(abbr);
    onChange(label, abbr);
  };

  const handleAbbrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAbbr(e.target.value);
    onChange(rankLabel, e.target.value);
  };

  // Sync external abbreviation changes
  React.useEffect(() => {
    setCustomAbbr(rankAbbreviation);
  }, [rankAbbreviation]);

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <Select value={rankLabel} onValueChange={handleSelectRank}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="اختر الرتبة" />
        </SelectTrigger>
        <SelectContent>
          {DEFAULT_ACADEMIC_RANKS.map((r) => (
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
      {/* Editable abbreviation */}
      <Input
        className="h-7 text-xs font-mono text-center"
        value={customAbbr}
        onChange={handleAbbrChange}
        placeholder="الاختصار"
        dir="rtl"
      />
    </div>
  );
};

// ======== Main Component ========

export interface JuryTableInputProps {
  /** Existing president string (from DB) */
  presidentValue: string;
  /** Existing members string (from DB) */
  membersValue: string;
  /** Called whenever the jury changes; receives serialized president + members */
  onChange: (president: string, members: string) => void;
  /** Suggestions for name autocomplete */
  nameSuggestions?: string[];
  /** University suggestions */
  universitySuggestions?: string[];
  className?: string;
}

export const JuryTableInput: React.FC<JuryTableInputProps> = ({
  presidentValue,
  membersValue,
  onChange,
  nameSuggestions = [],
  universitySuggestions = [],
  className,
}) => {
  const [rows, setRows] = React.useState<JuryMember[]>(() => {
    const parsed = parseJury(presidentValue, membersValue);
    // If empty (new form), start with one president row
    if (parsed.length === 0) {
      return [{
        id: Math.random().toString(36).slice(2),
        role: "president",
        name: "",
        rankLabel: "",
        rankAbbreviation: "",
        university: "",
      }];
    }
    return parsed;
  });

  // Sync from outside only on initial mount or if both values change (e.g. reset form)
  const prevPresidentRef = React.useRef(presidentValue);
  const prevMembersRef = React.useRef(membersValue);

  React.useEffect(() => {
    if (
      presidentValue !== prevPresidentRef.current ||
      membersValue !== prevMembersRef.current
    ) {
      prevPresidentRef.current = presidentValue;
      prevMembersRef.current = membersValue;
      const parsed = parseJury(presidentValue, membersValue);
      if (parsed.length > 0 || presidentValue || membersValue) {
        setRows(parsed);
      }
    }
  }, [presidentValue, membersValue]);

  const notifyChange = React.useCallback(
    (newRows: JuryMember[]) => {
      const { jury_president_ar, jury_members_ar } = serializeJury(newRows);
      prevPresidentRef.current = jury_president_ar;
      prevMembersRef.current = jury_members_ar;
      onChange(jury_president_ar, jury_members_ar);
    },
    [onChange]
  );

  const updateRow = (id: string, patch: Partial<JuryMember>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
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

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground w-8">
                #
              </th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-36">
                الصفة
              </th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">
                الاسم واللقب
              </th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground w-48">
                الرتبة
              </th>
              <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">
                جامعة الانتماء
              </th>
              <th className="py-2 px-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-6 text-muted-foreground text-xs"
                >
                  لا يوجد أعضاء، اضغط &quot;إضافة عضو&quot; لبدء الإدخال
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr
                key={row.id}
              className={cn(
                  "border-b border-border last:border-0",
                  row.role === "president"
                    ? "bg-primary/5"
                    : "hover:bg-muted/30"
                )}
              >
                {/* Number */}
                <td className="py-1.5 px-2 text-center text-muted-foreground font-mono text-xs align-middle">
                  {index + 1}
                </td>

                {/* Role */}
                <td className="py-1.5 px-2 align-middle">
                  <Select
                    value={row.role}
                    onValueChange={(v) =>
                      updateRow(row.id, { role: v as JuryRole })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(JURY_ROLE_LABELS) as [JuryRole, string][]
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Name */}
                <td className="py-1.5 px-2 align-middle">
                  <AutocompleteInput
                    value={row.name}
                    onValueChange={(v) => updateRow(row.id, { name: v })}
                    suggestions={nameSuggestions}
                    placeholder="الاسم واللقب"
                    className="h-8 text-xs"
                    dir="rtl"
                  />
                </td>

                {/* Rank */}
                <td className="py-1.5 px-2 align-middle">
                  <RankCell
                    rankLabel={row.rankLabel}
                    rankAbbreviation={row.rankAbbreviation}
                    onChange={(label, abbr) =>
                      updateRow(row.id, {
                        rankLabel: label,
                        rankAbbreviation: abbr,
                      })
                    }
                  />
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
            const { jury_president_ar, jury_members_ar } = serializeJury(rows);
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
    </div>
  );
};

JuryTableInput.displayName = "JuryTableInput";

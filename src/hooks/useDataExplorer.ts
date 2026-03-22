import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient, wrapElectronListResult } from "@/lib/database/db-client";

export interface SearchResult {
  id: string;
  type: "phd_student" | "defense_student" | "certificate" | "professor";
  typeLabel: string;
  subType?: string;
  name: string;
  details: string;
  raw: Record<string, unknown>;
}

const SEARCH_TABLES = [
  {
    table: "phd_lmd_students",
    type: "phd_student" as const,
    typeLabel: "طالب دكتوراه ل.م.د",
    subType: "LMD",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "registration_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.supervisor_ar || ""}`,
  },
  {
    table: "phd_science_students",
    type: "phd_student" as const,
    typeLabel: "طالب دكتوراه علوم",
    subType: "Science",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "registration_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.supervisor_ar || ""}`,
  },
  {
    table: "defense_stage_lmd",
    type: "defense_student" as const,
    typeLabel: "طور المناقشة ل.م.د",
    subType: "LMD",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "registration_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.stage_status || ""}`,
  },
  {
    table: "defense_stage_science",
    type: "defense_student" as const,
    typeLabel: "طور المناقشة علوم",
    subType: "Science",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "registration_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.stage_status || ""}`,
  },
  {
    table: "phd_lmd_certificates",
    type: "certificate" as const,
    typeLabel: "شهادة دكتوراه ل.م.د",
    subType: "LMD",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "student_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.defense_date || ""}`,
  },
  {
    table: "phd_science_certificates",
    type: "certificate" as const,
    typeLabel: "شهادة دكتوراه علوم",
    subType: "Science",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "student_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.defense_date || ""}`,
  },
  {
    table: "master_certificates",
    type: "certificate" as const,
    typeLabel: "شهادة ماستر",
    subType: "Master",
    nameField: "full_name_ar",
    searchFields: ["full_name_ar", "full_name_fr", "student_number", "supervisor_ar"],
    detailFn: (r: any) => `${r.specialty_ar || ""} | ${r.defense_date || ""}`,
  },
  {
    table: "professors",
    type: "professor" as const,
    typeLabel: "أستاذ",
    nameField: "full_name",
    searchFields: ["full_name"],
    detailFn: (r: any) => `${r.rank_label || ""} | ${r.university || ""}`,
  },
];

async function searchSupabase(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  const promises = SEARCH_TABLES.map(async (config) => {
    const { data, error } = await (supabase as any)
      .from(config.table)
      .select("*")
      .or(
        config.searchFields
          .map((f) => `${f}.ilike.%${query}%`)
          .join(",")
      )
      .limit(50);

    if (!error && data) {
      data.forEach((row: any) => {
        results.push({
          id: row.id,
          type: config.type,
          typeLabel: config.typeLabel,
          subType: config.subType,
          name: row[config.nameField] || "",
          details: config.detailFn(row),
          raw: row,
        });
      });
    }
  });

  await Promise.all(promises);
  return results;
}

async function searchElectron(query: string): Promise<SearchResult[]> {
  const db = getDbClient();
  if (!db) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const config of SEARCH_TABLES) {
    try {
      const result = await db.getAll(config.table);
      if (result?.success && result.data) {
        const filtered = result.data.filter((row: any) =>
          config.searchFields.some((field) => {
            const val = row[field];
            return val && String(val).toLowerCase().includes(lowerQuery);
          })
        );
        filtered.forEach((row: any) => {
          results.push({
            id: row.id,
            type: config.type,
            typeLabel: config.typeLabel,
            subType: config.subType,
            name: row[config.nameField] || "",
            details: config.detailFn(row),
            raw: row,
          });
        });
      }
    } catch {
      // skip table errors
    }
  }

  return results;
}

// البحث عن علاقات أستاذ معين
export async function getProfessorRelations(professorName: string) {
  const relations = {
    supervisedStudents: [] as any[],
    supervisedCertificates: [] as any[],
    juryParticipation: [] as any[],
  };

  if (!professorName) return relations;

  const studentTables = ["phd_lmd_students", "phd_science_students"];
  const defenseTables = ["defense_stage_lmd", "defense_stage_science"];
  const certTables = ["phd_lmd_certificates", "phd_science_certificates", "master_certificates"];
  const allTables = [...studentTables, ...defenseTables, ...certTables];

  if (isElectron()) {
    const db = getDbClient();
    if (!db) return relations;

    for (const table of allTables) {
      try {
        const result = await db.getAll(table);
        if (!result?.success || !result.data) continue;
        result.data.forEach((row: any) => {
          const isSupervisor =
            row.supervisor_ar?.includes(professorName) ||
            row.co_supervisor_ar?.includes(professorName);
          const isJury =
            row.jury_members_ar?.includes(professorName) ||
            row.jury_president_ar?.includes(professorName);

          if (isSupervisor) {
            if (certTables.includes(table)) {
              relations.supervisedCertificates.push({ ...row, _source: table });
            } else {
              relations.supervisedStudents.push({ ...row, _source: table });
            }
          }
          if (isJury) {
            relations.juryParticipation.push({ ...row, _source: table });
          }
        });
      } catch { /* skip */ }
    }
  } else {
    // Supabase
    const searchPromises = allTables.map(async (table) => {
      const hasSupervisor = true;
      const hasJury = certTables.includes(table) || defenseTables.includes(table);

      // Search supervisor
      const { data: supData } = await (supabase as any)
        .from(table)
        .select("*")
        .or(`supervisor_ar.ilike.%${professorName}%,co_supervisor_ar.ilike.%${professorName}%`);

      if (supData) {
        supData.forEach((row: any) => {
          if (certTables.includes(table)) {
            relations.supervisedCertificates.push({ ...row, _source: table });
          } else {
            relations.supervisedStudents.push({ ...row, _source: table });
          }
        });
      }

      // Search jury
      if (hasJury) {
        const { data: juryData } = await (supabase as any)
          .from(table)
          .select("*")
          .or(`jury_members_ar.ilike.%${professorName}%,jury_president_ar.ilike.%${professorName}%`);

        if (juryData) {
          juryData.forEach((row: any) => {
            // Avoid duplicates
            if (!relations.juryParticipation.find((r: any) => r.id === row.id && r._source === table)) {
              relations.juryParticipation.push({ ...row, _source: table });
            }
          });
        }
      }
    });

    await Promise.all(searchPromises);
  }

  return relations;
}

export function useDataExplorer() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = isElectron()
        ? await searchElectron(searchQuery.trim())
        : await searchSupabase(searchQuery.trim());
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const grouped = {
    professors: results.filter((r) => r.type === "professor"),
    students: results.filter((r) => r.type === "phd_student"),
    defense: results.filter((r) => r.type === "defense_student"),
    certificates: results.filter((r) => r.type === "certificate"),
  };

  return { results, grouped, loading, query, search };
}

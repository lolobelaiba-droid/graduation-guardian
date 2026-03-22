import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, User, GraduationCap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isElectron, getDbClient } from "@/lib/database/db-client";
import { SearchResult } from "@/hooks/useDataExplorer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NetworkNode {
  id: string;
  label: string;
  type: "professor" | "student" | "certificate";
  x: number;
  y: number;
  details?: string;
}

interface NetworkEdge {
  from: string;
  to: string;
  label: string;
}

async function fetchNetworkData(professorName?: string) {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const nodeSet = new Set<string>();

  const addNode = (id: string, label: string, type: NetworkNode["type"], details?: string) => {
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodes.push({ id, label, type, x: 0, y: 0, details });
    }
  };

  const tables = [
    { table: "phd_lmd_students", type: "student" as const },
    { table: "phd_science_students", type: "student" as const },
    { table: "defense_stage_lmd", type: "student" as const },
    { table: "defense_stage_science", type: "student" as const },
    { table: "phd_lmd_certificates", type: "certificate" as const },
    { table: "phd_science_certificates", type: "certificate" as const },
  ];

  for (const config of tables) {
    let records: any[] = [];
    if (isElectron()) {
      const db = getDbClient();
      if (db) {
        const result = await db.getAll(config.table);
        if (result?.success) records = result.data || [];
      }
    } else {
      let query = (supabase as any).from(config.table).select("id, full_name_ar, supervisor_ar, co_supervisor_ar, specialty_ar");
      if (professorName) {
        query = query.or(`supervisor_ar.ilike.%${professorName}%,co_supervisor_ar.ilike.%${professorName}%`);
      }
      const { data } = await query.limit(professorName ? 100 : 30);
      records = data || [];
    }

    for (const record of records) {
      if (professorName && !record.supervisor_ar?.includes(professorName) && !record.co_supervisor_ar?.includes(professorName)) continue;

      const studentId = `student-${record.id}`;
      addNode(studentId, record.full_name_ar, config.type, record.specialty_ar);

      if (record.supervisor_ar) {
        const profId = `prof-${record.supervisor_ar}`;
        addNode(profId, record.supervisor_ar, "professor");
        edges.push({ from: profId, to: studentId, label: "مشرف" });
      }
      if (record.co_supervisor_ar) {
        const coProfId = `prof-${record.co_supervisor_ar}`;
        addNode(coProfId, record.co_supervisor_ar, "professor");
        edges.push({ from: coProfId, to: studentId, label: "مشرف مساعد" });
      }
    }
  }

  // Layout: radial for professor-focused, force-directed-like for general
  layoutNodes(nodes, edges);

  return { nodes, edges };
}

function layoutNodes(nodes: NetworkNode[], edges: NetworkEdge[]) {
  const professors = nodes.filter(n => n.type === "professor");
  const others = nodes.filter(n => n.type !== "professor");

  if (professors.length === 1) {
    // Radial layout around single professor
    const center = { x: 400, y: 300 };
    professors[0].x = center.x;
    professors[0].y = center.y;

    const radius = 200;
    others.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
      node.x = center.x + radius * Math.cos(angle);
      node.y = center.y + radius * Math.sin(angle);
    });
  } else {
    // Multi-level layout
    const centerX = 400;
    const profY = 80;
    const studentY = 250;
    const certY = 420;

    professors.forEach((node, i) => {
      node.x = centerX + (i - (professors.length - 1) / 2) * 150;
      node.y = profY;
    });

    const students = others.filter(n => n.type === "student");
    const certs = others.filter(n => n.type === "certificate");

    students.forEach((node, i) => {
      node.x = centerX + (i - (students.length - 1) / 2) * 120;
      node.y = studentY + (i % 2) * 40;
    });

    certs.forEach((node, i) => {
      node.x = centerX + (i - (certs.length - 1) / 2) * 120;
      node.y = certY;
    });
  }
}

const NODE_COLORS = {
  professor: { fill: "#3b82f6", stroke: "#1d4ed8", text: "#fff" },
  student: { fill: "#10b981", stroke: "#059669", text: "#fff" },
  certificate: { fill: "#8b5cf6", stroke: "#6d28d9", text: "#fff" },
};

const NODE_ICONS = {
  professor: "أ",
  student: "ط",
  certificate: "ش",
};

export function RelationshipNetwork({ onSelectResult }: { onSelectResult?: (result: SearchResult) => void }) {
  const [data, setData] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<string>("__all__");
  const [professors, setProfessors] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Load professors list
  useEffect(() => {
    const loadProfs = async () => {
      if (isElectron()) {
        const db = getDbClient();
        if (db) {
          const result = await db.getAll("professors");
          if (result?.success) setProfessors(result.data || []);
        }
      } else {
        const { data } = await supabase.from("professors").select("*").order("full_name");
        setProfessors(data || []);
      }
    };
    loadProfs();
  }, []);

  const loadNetwork = useCallback(async (profName?: string) => {
    setLoading(true);
    try {
      const result = await fetchNetworkData(profName);
      setData(result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (err) {
      console.error("Network load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProfessor && selectedProfessor !== "__all__") {
      loadNetwork(selectedProfessor);
    } else if (selectedProfessor === "__all__") {
      loadNetwork();
    }
  }, [selectedProfessor]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { dragging.current = false; };

  const connectedNodes = hoveredNode
    ? new Set([hoveredNode, ...(data?.edges.filter(e => e.from === hoveredNode || e.to === hoveredNode).flatMap(e => [e.from, e.to]) || [])])
    : null;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={selectedProfessor} onValueChange={setSelectedProfessor}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="اختر أستاذاً لعرض شبكته..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">عرض الشبكة العامة (أول 30 سجل)</SelectItem>
            {professors.map(p => (
              <SelectItem key={p.id} value={p.full_name}>{p.full_name} {p.rank_abbreviation ? `(${p.rank_abbreviation})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(z + 0.2, 3))}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mr-auto text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /> أستاذ</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> طالب</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500" /> شهادة</div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && data && data.nodes.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">لا توجد بيانات لعرض الشبكة</p>
        </div>
      )}

      {!loading && data && data.nodes.length > 0 && (
        <Card className="overflow-hidden">
          <div className="relative" style={{ height: "calc(100vh - 300px)" }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {data.edges.map((edge, i) => {
                  const from = data.nodes.find(n => n.id === edge.from);
                  const to = data.nodes.find(n => n.id === edge.to);
                  if (!from || !to) return null;
                  const isHighlighted = !connectedNodes || (connectedNodes.has(edge.from) && connectedNodes.has(edge.to));
                  return (
                    <g key={i}>
                      <line
                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={isHighlighted ? "#94a3b8" : "#e2e8f0"}
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                        strokeDasharray={edge.label === "مشرف مساعد" ? "5,5" : "none"}
                        opacity={isHighlighted ? 1 : 0.2}
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 5}
                        textAnchor="middle"
                        className="text-[8px] fill-muted-foreground"
                        opacity={isHighlighted ? 0.7 : 0}
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {data.nodes.map((node) => {
                  const colors = NODE_COLORS[node.type];
                  const isHighlighted = !connectedNodes || connectedNodes.has(node.id);
                  const isHovered = hoveredNode === node.id;
                  const radius = node.type === "professor" ? 24 : 18;
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      opacity={isHighlighted ? 1 : 0.15}
                    >
                      {isHovered && (
                        <circle cx={node.x} cy={node.y} r={radius + 4} fill="none" stroke={colors.fill} strokeWidth={2} opacity={0.5} />
                      )}
                      <circle cx={node.x} cy={node.y} r={radius} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                      <text x={node.x} y={node.y + 4} textAnchor="middle" fill={colors.text} className="text-xs font-bold select-none" style={{ fontSize: "12px" }}>
                        {NODE_ICONS[node.type]}
                      </text>
                      <text x={node.x} y={node.y + radius + 14} textAnchor="middle" className="text-[10px] fill-foreground font-medium select-none">
                        {node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label}
                      </text>
                      {isHovered && node.details && (
                        <text x={node.x} y={node.y + radius + 26} textAnchor="middle" className="text-[8px] fill-muted-foreground select-none">
                          {node.details}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Info overlay */}
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded-lg p-2 text-xs text-muted-foreground">
              {data.nodes.filter(n => n.type === "professor").length} أستاذ · {data.nodes.filter(n => n.type === "student").length} طالب · {data.nodes.filter(n => n.type === "certificate").length} شهادة · {data.edges.length} رابط
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

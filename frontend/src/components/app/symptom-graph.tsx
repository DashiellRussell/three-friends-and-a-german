"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { apiFetch } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  neurological: "#8b5cf6",
  gastrointestinal: "#f59e0b",
  respiratory: "#0ea5e9",
  musculoskeletal: "#f43f5e",
  medication: "#10b981",
  cardiovascular: "#ef4444",
  medical: "#3b82f6",
  other: "#6b7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  neurological: "Neurological",
  gastrointestinal: "Digestive",
  respiratory: "Respiratory",
  musculoskeletal: "Musculoskeletal",
  medication: "Medication",
  cardiovascular: "Cardiovascular",
  medical: "Medical",
  other: "Other",
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: string;
  content: string;
  commonality: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function SymptomGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, d3.SimulationLinkDatum<GraphNode>> | null>(null);

  useEffect(() => {
    apiFetch("/api/checkin/graph")
      .then((r) => {
        if (!r.ok) throw new Error(`Graph fetch failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (d && Array.isArray(d.nodes) && Array.isArray(d.links)) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    if (data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = 280;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    // No filters needed for flat style

    // --- Scales ---
    const maxCommonality = Math.max(...data.nodes.map((n) => n.commonality), 1);
    const sizeScale = d3.scaleSqrt().domain([0, maxCommonality]).range([6, 18]);

    // Deep copy for D3 mutation
    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const links: GraphLink[] = data.links.map((l) => ({ ...l }));

    // --- Force simulation ---
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>(links as d3.SimulationLinkDatum<GraphNode>[])
          .id((d) => d.id)
          .distance(50)
          .strength((l: any) => l.similarity * 0.3)
      )
      .force("charge", d3.forceManyBody().strength(-80))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => sizeScale(d.commonality) + 4)
      )
      .force("x", d3.forceX(width / 2).strength(0.06))
      .force("y", d3.forceY(height / 2).strength(0.06));

    simulationRef.current = simulation;

    const g = svg.append("g");

    // --- Links ---
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(161, 161, 170, 0.2)")
      .attr("stroke-width", (d: any) => Math.max(0.3, (d.similarity - 0.8) * 6));

    // --- Node groups ---
    const nodeG = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer");

    // Flat circle
    nodeG
      .append("circle")
      .attr("class", "node-main")
      .attr("r", (d) => sizeScale(d.commonality))
      .attr("fill", (d) => CATEGORY_COLORS[d.category] || "#6b7280")
      .attr("opacity", 0.75)
      .attr("stroke", (d) => CATEGORY_COLORS[d.category] || "#6b7280")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.3);

    // Labels only for biggest nodes
    nodeG
      .filter((d) => sizeScale(d.commonality) >= 10)
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => sizeScale(d.commonality) + 12)
      .attr("fill", "#71717a")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none");

    // --- Tap to select (mobile-friendly) ---
    nodeG.on("click", function (event, d) {
      event.stopPropagation();

      // Reset all nodes
      nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
      linkSel
        .transition()
        .duration(150)
        .attr("stroke", "rgba(148, 163, 184, 0.12)")
        .attr("stroke-width", (l: any) => Math.max(0.3, (l.similarity - 0.8) * 6));

      // Highlight selected
      d3.select(this).select(".node-main").transition().duration(150).attr("opacity", 1);

      // Highlight connected links
      linkSel
        .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
        .transition()
        .duration(150)
        .attr("stroke", "rgba(113, 113, 122, 0.4)")
        .attr("stroke-width", (l: any) => Math.max(0.8, (l.similarity - 0.8) * 10));

      // Dim unconnected nodes
      const connectedIds = new Set<string>();
      connectedIds.add(d.id);
      links.forEach((l: any) => {
        if (l.source.id === d.id) connectedIds.add(l.target.id);
        if (l.target.id === d.id) connectedIds.add(l.source.id);
      });
      nodeG
        .filter((n) => !connectedIds.has(n.id))
        .select(".node-main")
        .transition()
        .duration(150)
        .attr("opacity", 0.3);

      setSelected(d);
    });

    // Tap background to deselect
    svg.on("click", () => {
      nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
      linkSel
        .transition()
        .duration(150)
        .attr("stroke", "rgba(148, 163, 184, 0.12)")
        .attr("stroke-width", (l: any) => Math.max(0.3, (l.similarity - 0.8) * 6));
      setSelected(null);
    });

    // --- Drag ---
    nodeG.call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // --- Tick ---
    simulation.on("tick", () => {
      nodes.forEach((d) => {
        const r = sizeScale(d.commonality) + 10;
        d.x = Math.max(r, Math.min(width - r, d.x!));
        d.y = Math.max(r, Math.min(height - r, d.y!));
      });

      linkSel
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  useEffect(() => {
    const cleanup = renderGraph();
    const handleResize = () => renderGraph();
    window.addEventListener("resize", handleResize);
    return () => {
      cleanup?.();
      window.removeEventListener("resize", handleResize);
    };
  }, [renderGraph]);

  if (loading) {
    return (
      <div className="mb-3 flex h-[380px] items-center justify-center rounded-2xl border border-zinc-100 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
          <span className="text-[11px] text-zinc-400">Mapping symptom network...</span>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return null;
  }

  const categories = [...new Set(data.nodes.map((n) => n.category))];

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-all hover:border-zinc-200 hover:shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <div className="mb-1 text-[13px] font-semibold text-zinc-900">Symptom Network</div>
        <p className="text-[11px] text-zinc-400">Tap a node to see details — larger nodes appear more frequently</p>
      </div>

      {/* Graph area */}
      <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/50">
        <div ref={containerRef} className="relative">
          <svg ref={svgRef} style={{ display: "block" }} />
        </div>
      </div>

      {/* Selected node detail — below graph */}
      {selected ? (
        <div className="mx-5 mb-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[selected.category] }}
            />
            <span className="text-[12px] font-semibold text-zinc-800">{selected.label}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-medium text-zinc-500">
              {CATEGORY_LABELS[selected.category]}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">{selected.content}</p>
        </div>
      ) : (
        <div className="mx-5 mb-4 rounded-xl border border-dashed border-zinc-200 p-3">
          <p className="text-center text-[11px] text-zinc-300">Tap a node to view event details</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-zinc-100 px-5 py-3">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            <span className="text-[10px] text-zinc-400">{CATEGORY_LABELS[cat] || cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

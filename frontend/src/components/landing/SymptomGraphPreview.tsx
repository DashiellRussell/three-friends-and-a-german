"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";

const CATEGORY_COLORS: Record<string, string> = {
  neurological: "#8b5cf6",
  gastrointestinal: "#f59e0b",
  respiratory: "#0ea5e9",
  musculoskeletal: "#f43f5e",
  cardiovascular: "#ef4444",
  other: "#6b7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  neurological: "Neurological",
  gastrointestinal: "Digestive",
  respiratory: "Respiratory",
  musculoskeletal: "Musculoskeletal",
  cardiovascular: "Cardiovascular",
  other: "Other",
};

interface DemoNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: string;
  size: number;
  description: string;
}

interface DemoLink {
  source: string | DemoNode;
  target: string | DemoNode;
  strength: number;
}

const DEMO_NODES: DemoNode[] = [
  { id: "headache", label: "Headache", category: "neurological", size: 18, description: "Recurring tension headaches, mostly in the afternoon. Often correlates with fatigue and insomnia." },
  { id: "fatigue", label: "Fatigue", category: "other", size: 16, description: "Persistent low energy levels, especially after poor sleep. Most frequent symptom overall." },
  { id: "nausea", label: "Nausea", category: "gastrointestinal", size: 12, description: "Mild nausea episodes, often alongside dizziness. Usually resolves within a few hours." },
  { id: "joint_pain", label: "Joint Pain", category: "musculoskeletal", size: 13, description: "Stiffness and discomfort in knees and wrists, worse in the morning." },
  { id: "insomnia", label: "Insomnia", category: "neurological", size: 11, description: "Difficulty falling asleep, averaging 5-6 hours. Strongly linked to next-day fatigue." },
  { id: "dizziness", label: "Dizziness", category: "neurological", size: 10, description: "Brief lightheaded episodes, usually when standing quickly. Co-occurs with headaches." },
  { id: "back_pain", label: "Back Pain", category: "musculoskeletal", size: 9, description: "Lower back tension from prolonged sitting. Related to joint pain pattern." },
  { id: "cough", label: "Cough", category: "respiratory", size: 8, description: "Dry cough, intermittent. Occasionally accompanied by mild chest tightness." },
  { id: "chest_pain", label: "Chest Pain", category: "cardiovascular", size: 7, description: "Mild chest tightness, non-cardiac. Usually follows coughing episodes." },
  { id: "bloating", label: "Bloating", category: "gastrointestinal", size: 8, description: "Post-meal bloating and discomfort. Often coincides with nausea episodes." },
  { id: "anxiety", label: "Anxiety", category: "neurological", size: 11, description: "Periodic anxious episodes, often triggered by insomnia and fatigue cycles." },
  { id: "neck_pain", label: "Neck Pain", category: "musculoskeletal", size: 9, description: "Tension in the neck and shoulders, frequently accompanies headaches." },
  { id: "heartburn", label: "Heartburn", category: "gastrointestinal", size: 7, description: "Acid reflux after meals, commonly paired with bloating and nausea." },
  { id: "shortness_breath", label: "Shortness of Breath", category: "respiratory", size: 6, description: "Mild breathlessness during exertion, often co-occurs with chest tightness." },
  { id: "brain_fog", label: "Brain Fog", category: "neurological", size: 10, description: "Difficulty concentrating and mental sluggishness, worst after poor sleep." },
  { id: "muscle_cramps", label: "Muscle Cramps", category: "musculoskeletal", size: 6, description: "Occasional leg cramps, mostly at night. May relate to hydration levels." },
];

const DEMO_LINKS: DemoLink[] = [
  { source: "headache", target: "fatigue", strength: 0.9 },
  { source: "headache", target: "dizziness", strength: 0.85 },
  { source: "headache", target: "insomnia", strength: 0.8 },
  { source: "headache", target: "neck_pain", strength: 0.88 },
  { source: "fatigue", target: "insomnia", strength: 0.88 },
  { source: "fatigue", target: "joint_pain", strength: 0.75 },
  { source: "fatigue", target: "brain_fog", strength: 0.92 },
  { source: "fatigue", target: "anxiety", strength: 0.78 },
  { source: "nausea", target: "dizziness", strength: 0.82 },
  { source: "nausea", target: "bloating", strength: 0.85 },
  { source: "nausea", target: "heartburn", strength: 0.8 },
  { source: "joint_pain", target: "back_pain", strength: 0.9 },
  { source: "joint_pain", target: "muscle_cramps", strength: 0.72 },
  { source: "cough", target: "chest_pain", strength: 0.7 },
  { source: "cough", target: "shortness_breath", strength: 0.78 },
  { source: "chest_pain", target: "shortness_breath", strength: 0.82 },
  { source: "fatigue", target: "dizziness", strength: 0.72 },
  { source: "insomnia", target: "anxiety", strength: 0.85 },
  { source: "insomnia", target: "brain_fog", strength: 0.88 },
  { source: "anxiety", target: "chest_pain", strength: 0.7 },
  { source: "neck_pain", target: "back_pain", strength: 0.76 },
  { source: "bloating", target: "heartburn", strength: 0.83 },
  { source: "brain_fog", target: "headache", strength: 0.8 },
  { source: "muscle_cramps", target: "back_pain", strength: 0.74 },
];

export function SymptomGraphPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<DemoNode | null>(null);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = 340;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const nodes: DemoNode[] = DEMO_NODES.map((n) => ({ ...n }));
    const links: DemoLink[] = DEMO_LINKS.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<DemoNode, d3.SimulationLinkDatum<DemoNode>>(links as d3.SimulationLinkDatum<DemoNode>[])
          .id((d) => d.id)
          .distance(55)
          .strength((l: any) => l.strength * 0.3)
      )
      .force("charge", d3.forceManyBody().strength(-90))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<DemoNode>().radius((d) => d.size + 4))
      .force("x", d3.forceX(width / 2).strength(0.06))
      .force("y", d3.forceY(height / 2).strength(0.06));

    const g = svg.append("g");

    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(161, 161, 170, 0.2)")
      .attr("stroke-width", (d: any) => Math.max(0.5, (d.strength - 0.7) * 4));

    const nodeG = g
      .append("g")
      .selectAll<SVGGElement, DemoNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer");

    nodeG
      .append("circle")
      .attr("class", "node-main")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => CATEGORY_COLORS[d.category] || "#6b7280")
      .attr("opacity", 0.75)
      .attr("stroke", (d) => CATEGORY_COLORS[d.category] || "#6b7280")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.3);

    nodeG
      .filter((d) => d.size >= 10)
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.size + 12)
      .attr("fill", "#a1a1aa")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none");

    // Click node to select
    nodeG.on("click", function (event, d) {
      event.stopPropagation();

      // Reset all
      nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
      linkSel
        .transition()
        .duration(150)
        .attr("stroke", "rgba(161, 161, 170, 0.2)")
        .attr("stroke-width", (l: any) => Math.max(0.5, (l.strength - 0.7) * 4));

      // Highlight selected
      d3.select(this).select(".node-main").transition().duration(150).attr("opacity", 1);

      // Highlight connected links
      linkSel
        .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
        .transition()
        .duration(150)
        .attr("stroke", "rgba(113, 113, 122, 0.5)")
        .attr("stroke-width", (l: any) => Math.max(1, (l.strength - 0.7) * 8));

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
        .attr("opacity", 0.25);

      setSelected(d);
    });

    // Click background to deselect
    svg.on("click", () => {
      nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
      linkSel
        .transition()
        .duration(150)
        .attr("stroke", "rgba(161, 161, 170, 0.2)")
        .attr("stroke-width", (l: any) => Math.max(0.5, (l.strength - 0.7) * 4));
      setSelected(null);
    });

    // Drag behavior
    nodeG.call(
      d3
        .drag<SVGGElement, DemoNode>()
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

    simulation.on("tick", () => {
      nodes.forEach((d) => {
        const r = d.size + 10;
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

    return () => simulation.stop();
  }, []);

  useEffect(() => {
    const cleanup = renderGraph();
    const handleResize = () => renderGraph();
    window.addEventListener("resize", handleResize);
    return () => {
      cleanup?.();
      window.removeEventListener("resize", handleResize);
    };
  }, [renderGraph]);

  const categories = [...new Set(DEMO_NODES.map((n) => n.category))];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="px-4 pt-4 pb-2">
        <div className="text-[13px] font-semibold text-zinc-200">Symptom Network</div>
        <p className="text-[11px] text-zinc-500">Tap a node to see details — drag to rearrange</p>
      </div>
      <div className="mx-3 mb-2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div ref={containerRef} className="relative">
          <svg ref={svgRef} style={{ display: "block" }} />
        </div>
      </div>

      {/* Selected node detail */}
      {selected ? (
        <div className="mx-3 mb-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-3" style={{ animation: "fadeUp 0.2s ease" }}>
          <div className="mb-1.5 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[selected.category] }}
            />
            <span className="text-[12px] font-semibold text-zinc-200">{selected.label}</span>
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[9px] font-medium text-zinc-400">
              {CATEGORY_LABELS[selected.category]}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">{selected.description}</p>
        </div>
      ) : (
        <div className="mx-3 mb-3 rounded-xl border border-dashed border-zinc-700 p-3">
          <p className="text-center text-[11px] text-zinc-600">Tap a node to view details</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800 px-4 py-2.5">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            <span className="text-[10px] text-zinc-500">{CATEGORY_LABELS[cat] || cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import {
  Mic,
  ArrowRight,
  Phone,
  PhoneCall,
  Activity,
  FileText,
  AlertTriangle,
  TrendingUp,
  Shield,
  ChevronDown,
  Check,
  Loader2,
  LogOut,
} from "lucide-react";
import { VoiceSphere } from "@/components/app/VoiceSphere";
import { Sparkline } from "@/components/app/shared";

// ─── Animate-on-scroll hook ──────────────────────────────────
function useInView(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Phone Frame ─────────────────────────────────────────────
function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[280px] overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-[#fafafa] shadow-2xl shadow-zinc-900/20 ${className}`} style={{ aspectRatio: "9/19.5" }}>
      {/* Dynamic Island */}
      <div className="relative flex h-7 items-center justify-center bg-zinc-900">
        <div className="h-[18px] w-[72px] rounded-full bg-zinc-800" />
      </div>
      <div className="flex h-[calc(100%-28px)] flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Typing animation ────────────────────────────────────────
function TypedText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [started, text]);
  return <>{displayed}<span className="animate-pulse">|</span></>;
}

// ─── Animated counter ────────────────────────────────────────
function Counter({ to, duration = 1500, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * progress * 10) / 10);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, to, duration]);
  return <span ref={ref}>{value}{suffix}</span>;
}

// ─── Section wrapper with fade-in ────────────────────────────
function Section({ children, className = "", dark = false, id }: { children: React.ReactNode; className?: string; dark?: boolean; id?: string }) {
  const { ref, visible } = useInView(0.15);
  return (
    <section
      ref={ref}
      id={id}
      className={`px-4 py-16 sm:px-6 sm:py-24 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${dark ? "bg-zinc-950 text-white" : ""} ${className}`}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

// ─── Demo: Voice Check-in ────────────────────────────────────
function DemoVoiceCheckin() {
  const messages = [
    { from: "ai", text: "Good morning, Margaret. How are you feeling today?", delay: 0 },
    { from: "user", text: "Not too bad. My knee's been playing up again though.", delay: 2200 },
    { from: "ai", text: "Sorry to hear that. Is it worse than last week?", delay: 4500 },
    { from: "user", text: "A bit worse. And I only got about five hours sleep.", delay: 6800 },
    { from: "ai", text: "I'll note that down. Have you taken your morning tablets?", delay: 9000 },
    { from: "user", text: "Yes, all taken with breakfast.", delay: 11000 },
  ];

  const [visibleCount, setVisibleCount] = useState(0);
  const { ref, visible } = useInView();

  useEffect(() => {
    if (!visible) return;
    messages.forEach((m, i) => {
      setTimeout(() => setVisibleCount(i + 1), m.delay);
    });
  }, [visible]);

  return (
    <div ref={ref}>
      <PhoneFrame>
        {/* App bar */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-2.5">
          <div className="w-8" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900">
              <Mic className="h-3 w-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-[12px] font-semibold text-zinc-900">Tessera</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Voice sphere */}
        <div className="flex flex-col items-center pb-2 pt-4">
          <VoiceSphere autoLoop size={60} />
          <div className="mt-2 text-[10px] font-medium text-zinc-400">Listening...</div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2 px-3 pb-4" style={{ minHeight: 220 }}>
          {messages.slice(0, visibleCount).map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              style={{ animation: "fadeUp 0.35s ease" }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed ${
                  m.from === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Extracted tags */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <div className="mb-1 text-[8px] font-semibold uppercase tracking-widest text-zinc-400">
            Auto-captured
          </div>
          <div className="flex flex-wrap gap-1">
            {["Knee pain ↑", "Sleep: 5h", "Mood: okay", "Meds: taken"].map((tag, i) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium text-zinc-600"
                style={{ animation: `fadeUp 0.3s ease ${0.1 * i}s both`, opacity: visibleCount >= 6 ? 1 : 0 }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

// ─── Demo: Dashboard ─────────────────────────────────────────
function DemoDashboard() {
  const energyData = [6, 7, 5, 7, 8, 6, 7, 8, 7, 9, 7, 8, 7, 8];
  const labels = Array(14).fill("").map((_, i) => i === 13 ? "Today" : "");

  return (
    <PhoneFrame>
      {/* App bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-white/80 px-4 py-2.5">
        <div className="w-8" />
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900">
            <Mic className="h-3 w-3 text-white" strokeWidth={2} />
          </div>
          <span className="text-[12px] font-semibold text-zinc-900">Tessera</span>
        </div>
        <div className="w-8" />
      </div>

      <div className="px-3 pt-4 pb-3">
        {/* Greeting */}
        <h2 className="text-[16px] font-semibold text-zinc-900">Good morning, Margaret</h2>
        <p className="mt-0.5 text-[11px] text-zinc-400">Here&apos;s your health snapshot</p>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            { label: "Streak", value: <Counter to={12} />, unit: "days", accent: "text-emerald-500" },
            { label: "Energy", value: <Counter to={7.2} />, unit: "/10", accent: "text-zinc-900" },
            { label: "Adherence", value: <Counter to={94} />, unit: "%", accent: "text-zinc-900" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-100 bg-white p-2">
              <div className="text-[8px] font-medium uppercase tracking-widest text-zinc-400">{s.label}</div>
              <div className={`text-[16px] font-semibold ${s.accent}`}>
                {s.value}
                <span className="text-[9px] text-zinc-400">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Energy sparkline */}
        <div className="mt-3 rounded-xl border border-zinc-100 bg-white p-3">
          <div className="mb-2 text-[11px] font-semibold text-zinc-900">Energy Over Time</div>
          <Sparkline data={energyData} labels={labels} color="#18181b" fill height={40} highlight={13} />
        </div>

        {/* Latest entry */}
        <div className="mt-2 rounded-xl border border-zinc-100 bg-white p-3">
          <div className="mb-1.5 text-[8px] font-medium uppercase tracking-widest text-zinc-400">Latest Check-in</div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <div className="text-[11px] font-medium text-zinc-900">Today <span className="text-zinc-400">· Good · 7/10 energy</span></div>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
            Mild knee stiffness. All meds taken. Slept 7.5 hours.
          </p>
        </div>

        {/* Alert */}
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-amber-700">1 Alert</span>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-amber-600">
            Increased thirst reported yesterday — may indicate elevated blood glucose.
          </p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around border-t border-zinc-100 bg-white px-2 py-2">
        {["Home", "Log", "", "Trends", "Profile"].map((label, i) =>
          label === "" ? (
            <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900">
              <span className="text-[14px] font-light text-white">+</span>
            </div>
          ) : (
            <div key={label} className={`text-[8px] font-medium ${i === 0 ? "text-zinc-900" : "text-zinc-300"}`}>
              {label}
            </div>
          ),
        )}
      </div>
    </PhoneFrame>
  );
}

// ─── Demo: Trends ────────────────────────────────────────────
function DemoTrends() {
  const sleepData = [7.5, 5, 7.5, 6, 7, 5.5, 8];
  const moodData = [3, 1, 3, 2, 2, 1, 3]; // Great=3, Okay=1, Good=2
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Sleep */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-1 text-[11px] font-semibold text-zinc-900">Sleep Pattern</div>
        <p className="mb-3 text-[10px] text-zinc-400">Hours per night — last 7 days</p>
        <Sparkline data={sleepData} labels={labels} color="#6366f1" fill height={50} highlight={6} />
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-indigo-600">Avg: 6.6h</div>
          <span className="text-[10px] text-zinc-400">Target: 7-8h</span>
        </div>
      </div>

      {/* Mood */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-1 text-[11px] font-semibold text-zinc-900">Mood Distribution</div>
        <p className="mb-3 text-[10px] text-zinc-400">This week</p>
        <div className="flex items-end gap-1.5" style={{ height: 50 }}>
          {[
            { label: "Great", count: 3, color: "bg-emerald-400" },
            { label: "Good", count: 2, color: "bg-sky-400" },
            { label: "Okay", count: 2, color: "bg-amber-400" },
          ].map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
              <div className={`w-full rounded-md ${m.color} transition-all duration-700`} style={{ height: `${(m.count / 3) * 50}px` }} />
              <span className="text-[8px] text-zinc-400">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600">Mostly positive</div>
        </div>
      </div>

      {/* Symptoms */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-5 sm:col-span-2">
        <div className="mb-1 text-[11px] font-semibold text-zinc-900">Top Symptoms</div>
        <p className="mb-3 text-[10px] text-zinc-400">Frequency this month</p>
        <div className="space-y-2">
          {[
            { name: "Knee pain", count: 8, pct: 80 },
            { name: "Fatigue", count: 5, pct: 50 },
            { name: "Headache", count: 3, pct: 30 },
            { name: "Increased thirst", count: 2, pct: 20 },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-24 text-[10px] text-zinc-600">{s.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-zinc-400 transition-all duration-1000" style={{ width: `${s.pct}%` }} />
              </div>
              <span className="w-4 text-right text-[10px] font-medium text-zinc-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Demo: Alerts ────────────────────────────────────────────
function DemoAlerts() {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const alerts = [
    { severity: "critical", title: "Increased thirst + fatigue", desc: "Reported together yesterday. May indicate elevated blood glucose levels. Consider checking HbA1c.", time: "Yesterday" },
    { severity: "warning", title: "Knee pain trending up", desc: "Worsening over 3 consecutive check-ins. Current severity: 5/10.", time: "3-day trend" },
    { severity: "info", title: "Sleep below target", desc: "Averaged 6.2 hours this week vs 7h target. Inconsistent sleep may affect glycaemic control.", time: "This week" },
  ];

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`rounded-2xl border p-4 transition-all duration-500 ${
            dismissed.has(i) ? "scale-95 opacity-30" : ""
          } ${
            a.severity === "critical"
              ? "border-red-200 bg-red-50"
              : a.severity === "warning"
                ? "border-amber-200 bg-amber-50"
                : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${
                  a.severity === "critical" ? "text-red-500" : a.severity === "warning" ? "text-amber-500" : "text-zinc-400"
                }`}
              />
              <div>
                <div className="text-[12px] font-semibold text-zinc-900">{a.title}</div>
                <div className="text-[10px] text-zinc-400">{a.time}</div>
              </div>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(i))}
              className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{a.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Demo: Interactive Symptom Network (D3) ──────────────────
function DemoSymptomNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<{ id: string; label: string; category: string; content: string; commonality: number; color: string } | null>(null);
  const rendered = useRef(false);

  const COLORS: Record<string, string> = {
    musculoskeletal: "#f43f5e",
    neurological: "#8b5cf6",
    gastrointestinal: "#f59e0b",
    respiratory: "#0ea5e9",
    cardiovascular: "#ef4444",
    medical: "#3b82f6",
    medication: "#10b981",
    other: "#6b7280",
  };

  const LABELS: Record<string, string> = {
    musculoskeletal: "Musculoskeletal",
    neurological: "Neurological",
    gastrointestinal: "Digestive",
    respiratory: "Respiratory",
    cardiovascular: "Cardiovascular",
    medical: "Medical",
    medication: "Medication",
    other: "Other",
  };

  const graphData = {
    nodes: [
      { id: "knee-pain", label: "Knee pain", category: "musculoskeletal", commonality: 8, content: "Reported in 8 of last 14 check-ins. Worsening trend over past 3 days. Severity increased from 3/10 to 5/10." },
      { id: "fatigue", label: "Fatigue", category: "neurological", commonality: 6, content: "Reported 6 times this month. Often co-occurs with poor sleep (<6h). Appeared alongside increased thirst yesterday." },
      { id: "headache", label: "Headache", category: "neurological", commonality: 4, content: "Reported 4 times. Mild severity (3/10). Usually follows poor sleep or neck stiffness." },
      { id: "thirst", label: "Increased thirst", category: "medical", commonality: 3, content: "Flagged as potential hyperglycaemia indicator. Co-occurred with fatigue. Last HbA1c was 6.8% (above target)." },
      { id: "stiffness", label: "Neck stiffness", category: "musculoskeletal", commonality: 3, content: "Reported 3 times. Usually on mornings after poor sleep. May be related to sleeping position." },
      { id: "poor-sleep", label: "Poor sleep", category: "other", commonality: 5, content: "Sleep below 6 hours on 4 of 7 nights. Average: 6.2h vs 7h target. Correlates with next-day fatigue." },
      { id: "dizziness", label: "Dizziness", category: "cardiovascular", commonality: 2, content: "Mild dizziness reported twice when standing quickly. May relate to blood pressure medication." },
      { id: "nausea", label: "Nausea", category: "gastrointestinal", commonality: 2, content: "Mild nausea twice after taking medication on an empty stomach." },
      { id: "blurred-vision", label: "Blurred vision", category: "medical", commonality: 1, content: "Reported once. May correlate with blood glucose fluctuations. Monitor closely." },
      { id: "ankle-swelling", label: "Ankle swelling", category: "cardiovascular", commonality: 2, content: "Mild bilateral ankle swelling noted twice. Could relate to prolonged sitting or cardiovascular factors." },
      { id: "back-pain", label: "Lower back pain", category: "musculoskeletal", commonality: 3, content: "Intermittent lower back pain, worse after sitting. Possibly related to reduced mobility from knee pain." },
      { id: "appetite-loss", label: "Reduced appetite", category: "gastrointestinal", commonality: 2, content: "Decreased appetite on 2 occasions, coinciding with nausea episodes." },
    ],
    links: [
      { source: "knee-pain", target: "stiffness", similarity: 0.88 },
      { source: "knee-pain", target: "back-pain", similarity: 0.85 },
      { source: "fatigue", target: "thirst", similarity: 0.92 },
      { source: "fatigue", target: "poor-sleep", similarity: 0.9 },
      { source: "headache", target: "stiffness", similarity: 0.82 },
      { source: "headache", target: "poor-sleep", similarity: 0.84 },
      { source: "poor-sleep", target: "dizziness", similarity: 0.83 },
      { source: "dizziness", target: "ankle-swelling", similarity: 0.86 },
      { source: "thirst", target: "blurred-vision", similarity: 0.91 },
      { source: "nausea", target: "appetite-loss", similarity: 0.89 },
      { source: "nausea", target: "dizziness", similarity: 0.84 },
      { source: "fatigue", target: "headache", similarity: 0.81 },
      { source: "back-pain", target: "poor-sleep", similarity: 0.82 },
    ],
  };

  useEffect(() => {
    if (rendered.current || !svgRef.current || !containerRef.current) return;
    rendered.current = true;

    import("d3").then((d3) => {
      const svg = d3.select(svgRef.current!);
      const width = containerRef.current!.clientWidth;
      const height = 320;

      svg.attr("width", width).attr("height", height);

      const maxC = Math.max(...graphData.nodes.map((n) => n.commonality), 1);
      const sizeScale = d3.scaleSqrt().domain([0, maxC]).range([6, 20]);

      type GNode = typeof graphData.nodes[number] & d3.SimulationNodeDatum;
      const nodes: GNode[] = graphData.nodes.map((n) => ({ ...n }));
      const links = graphData.links.map((l) => ({ ...l }));

      const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink<GNode, typeof links[number]>(links as any).id((d: any) => d.id).distance(55).strength((l: any) => l.similarity * 0.3))
        .force("charge", d3.forceManyBody().strength(-90))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide<GNode>().radius((d) => sizeScale(d.commonality) + 5))
        .force("x", d3.forceX(width / 2).strength(0.06))
        .force("y", d3.forceY(height / 2).strength(0.06));

      const g = svg.append("g");

      const linkSel = g.append("g").selectAll("line").data(links).join("line")
        .attr("stroke", "rgba(161,161,170,0.2)")
        .attr("stroke-width", (d: any) => Math.max(0.5, (d.similarity - 0.8) * 8));

      const nodeG = g.append("g").selectAll<SVGGElement, GNode>("g").data(nodes).join("g").style("cursor", "pointer");

      nodeG.append("circle").attr("class", "node-main")
        .attr("r", (d) => sizeScale(d.commonality))
        .attr("fill", (d) => COLORS[d.category] || "#6b7280")
        .attr("opacity", 0.75)
        .attr("stroke", (d) => COLORS[d.category] || "#6b7280")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.3);

      nodeG.filter((d) => sizeScale(d.commonality) >= 8)
        .append("text").text((d) => d.label)
        .attr("text-anchor", "middle")
        .attr("dy", (d) => sizeScale(d.commonality) + 13)
        .attr("fill", "#71717a").attr("font-size", "9px").attr("font-weight", "500")
        .attr("pointer-events", "none");

      nodeG.on("click", function (event, d) {
        event.stopPropagation();
        nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
        linkSel.transition().duration(150).attr("stroke", "rgba(161,161,170,0.12)").attr("stroke-width", (l: any) => Math.max(0.5, (l.similarity - 0.8) * 8));

        d3.select(this).select(".node-main").transition().duration(150).attr("opacity", 1);
        linkSel.filter((l: any) => l.source.id === d.id || l.target.id === d.id)
          .transition().duration(150).attr("stroke", "rgba(113,113,122,0.4)").attr("stroke-width", (l: any) => Math.max(1, (l.similarity - 0.8) * 12));

        const connectedIds = new Set([d.id]);
        links.forEach((l: any) => { if (l.source.id === d.id) connectedIds.add(l.target.id); if (l.target.id === d.id) connectedIds.add(l.source.id); });
        nodeG.filter((n) => !connectedIds.has(n.id)).select(".node-main").transition().duration(150).attr("opacity", 0.2);

        setSelected({ id: d.id, label: d.label, category: d.category, content: d.content, commonality: d.commonality, color: COLORS[d.category] || "#6b7280" });
      });

      svg.on("click", () => {
        nodeG.select(".node-main").transition().duration(150).attr("opacity", 0.75);
        linkSel.transition().duration(150).attr("stroke", "rgba(161,161,170,0.12)").attr("stroke-width", (l: any) => Math.max(0.5, (l.similarity - 0.8) * 8));
        setSelected(null);
      });

      nodeG.call(
        d3.drag<SVGGElement, GNode>()
          .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

      simulation.on("tick", () => {
        nodes.forEach((d) => { const r = sizeScale(d.commonality) + 10; d.x = Math.max(r, Math.min(width - r, d.x!)); d.y = Math.max(r, Math.min(height - r, d.y!)); });
        linkSel.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
        nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });
    });
  }, []);

  const categories = [...new Set(graphData.nodes.map((n) => n.category))];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
      <div className="px-5 pt-5 pb-2">
        <div className="mb-1 text-[13px] font-semibold text-zinc-900">Symptom Network</div>
        <p className="text-[11px] text-zinc-400">Drag nodes to explore — tap to see details — larger nodes appear more frequently</p>
      </div>

      <div ref={containerRef} className="mx-3 mb-3 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/50">
        <svg ref={svgRef} style={{ display: "block" }} />
      </div>

      {selected ? (
        <div className="mx-5 mb-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3" style={{ animation: "fadeUp 0.2s ease" }}>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="text-[12px] font-semibold text-zinc-800">{selected.label}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-medium text-zinc-500">{LABELS[selected.category]}</span>
            <span className="ml-auto text-[9px] text-zinc-400">{selected.commonality}x this month</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">{selected.content}</p>
        </div>
      ) : (
        <div className="mx-5 mb-4 rounded-xl border border-dashed border-zinc-200 p-3">
          <p className="text-center text-[11px] text-zinc-300">Tap a node to view details</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-zinc-100 px-5 py-3">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[cat] }} />
            <span className="text-[10px] text-zinc-400">{LABELS[cat] || cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Demo: Report Preview ────────────────────────────────────
function DemoReport() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
      {/* Report header */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <span className="text-[13px] font-semibold text-zinc-900">Health Report — Feb 2026</span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">Generated for Margaret Chen · GP appointment Mar 15</div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-5">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Key Findings</div>
          <ul className="space-y-1.5">
            {[
              "HbA1c increased from 6.5% to 6.8% over 3 months",
              "Vitamin D suboptimal at 22 ng/mL despite supplementation",
              "Increased thirst and fatigue reported, correlating with HbA1c trend",
              "Sleep inconsistent — 5 to 7.5 hours across reporting period",
              "Medication adherence: Metformin 100%, Vitamin D 75%",
            ].map((f, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-zinc-600">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Recommended Actions</div>
          <ul className="space-y-1.5">
            {[
              "Review Metformin dosage given HbA1c trajectory",
              "Consider Vitamin D dosage adjustment",
              "Discuss sleep hygiene — may affect glycaemic control",
              "Follow up on increased thirst symptom",
            ].map((a, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-zinc-600">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3">
        <p className="text-[9px] text-zinc-400">
          This report is AI-generated from daily check-in data. It does not constitute medical advice.
        </p>
      </div>
    </div>
  );
}

// ─── Demo: Try a Call ─────────────────────────────────────────
const DEMO_PERSONA = {
  name: "Margaret Chen",
  age: 73,
  conditions: ["Type 2 Diabetes", "Hypertension", "Osteoarthritis (knees)"],
  medications: ["Metformin 500mg (twice daily)", "Lisinopril 10mg (morning)", "Vitamin D 1000 IU (morning)"],
  recentContext: "Margaret has been experiencing increased knee pain over the past few days and reported increased thirst and fatigue yesterday, which may correlate with elevated blood glucose. She averaged 6.2 hours of sleep this week. Her HbA1c was 6.8% at her last blood test (slightly above target).",
};

function DemoCallSection() {
  const { isSignedIn, isLoaded } = useAuth();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const DEMO_CALL_KEY = "tessera_demo_call_used";

  const alreadyUsed = typeof window !== "undefined" && localStorage.getItem(DEMO_CALL_KEY) === "true";

  const handleCall = async () => {
    if (!phone.trim()) return;
    setStatus("calling");
    setError("");
    try {
      const res = await apiFetch("/api/voice/outbound-call", {
        method: "POST",
        body: JSON.stringify({
          phone_number: phone.trim(),
          dynamic_variables: {
            user_name: DEMO_PERSONA.name,
            conditions: DEMO_PERSONA.conditions.join(", "),
            allergies: "Penicillin, Sulfa",
            medications: DEMO_PERSONA.medications.join(", "),
            recent_health_summary: DEMO_PERSONA.recentContext,
            conversation_context: DEMO_PERSONA.recentContext,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to initiate call");
      }
      localStorage.setItem(DEMO_CALL_KEY, "true");
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
      {/* Persona card */}
      <div className="border-b border-zinc-100 bg-gradient-to-br from-emerald-50 to-sky-50 px-6 py-6 sm:px-8">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Demo Persona</div>
        <h3 className="text-[20px] font-semibold text-zinc-900">You are {DEMO_PERSONA.name}</h3>
        <p className="mt-1 text-[13px] text-zinc-500">{DEMO_PERSONA.age} years old · Sydney, Australia</p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Conditions</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PERSONA.conditions.map((c) => (
                <span key={c} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-sm">{c}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Medications</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PERSONA.medications.map((m) => (
                <span key={m} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-sm">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Recent Context</div>
            <p className="text-[12px] leading-relaxed text-zinc-600">{DEMO_PERSONA.recentContext}</p>
          </div>
        </div>
      </div>

      {/* Call action */}
      <div className="px-6 py-6 sm:px-8">
        {!isSignedIn ? (
          <div className="text-center">
            <p className="text-[13px] text-zinc-500">Sign in to try a free demo call</p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-800"
            >
              Sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : alreadyUsed || status === "done" ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-50 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-zinc-900">Demo call {status === "done" ? "initiated" : "already used"}</p>
              <p className="text-[11px] text-zinc-500">{status === "done" ? "Check your phone — Tessera is calling!" : "You've already tried the demo call."}</p>
            </div>
          </div>
        ) : (
          <>
            <h4 className="mb-1 text-[14px] font-semibold text-zinc-900">Try a demo call</h4>
            <p className="mb-4 text-[12px] leading-relaxed text-zinc-500">
              Enter your phone number and Tessera will call you as if you were {DEMO_PERSONA.name}. The AI will ask about your health based on the persona above. You get one free demo call.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+61 4XX XXX XXX"
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white"
              />
              <button
                onClick={handleCall}
                disabled={!phone.trim() || status === "calling"}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-[14px] font-medium text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
              >
                {status === "calling" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                Call me
              </button>
            </div>
            {status === "error" && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Demo Page ──────────────────────────────────────────
export default function DemoPage() {
  const { isSignedIn } = useAuth();
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
              <Mic className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Tessera</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              Interactive Demo
            </span>
            <a
              href="/#waitlist"
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-800"
            >
              Join waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center overflow-hidden px-4 pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/30 via-sky-100/20 to-transparent blur-3xl" />
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          See Tessera in action
        </h1>
        <p className="mt-4 max-w-lg text-[15px] text-zinc-500 leading-relaxed sm:text-lg">
          Explore how a daily voice check-in becomes actionable health data for doctors and families.
        </p>
        <ChevronDown className="mt-8 h-5 w-5 animate-bounce text-zinc-300" />
      </section>

      {/* 1 — Voice Check-in */}
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              <Phone className="h-3 w-3" /> Voice Check-in
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              A 2-minute call, not a questionnaire
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              Tessera calls at their preferred time. They just answer and chat naturally. Symptoms, sleep, mood, and medication adherence are captured automatically from the conversation.
            </p>
            <ul className="mt-4 space-y-2">
              {["Real-time transcription", "AI symptom extraction", "No app needed — just a phone"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <DemoVoiceCheckin />
        </div>
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* 2 — Dashboard */}
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <DemoDashboard />
          </div>
          <div className="order-1 md:order-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
              <Activity className="h-3 w-3" /> Dashboard
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Their health at a glance
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              See check-in streaks, energy trends, medication adherence, and critical alerts — all updated after every conversation.
            </p>
            <ul className="mt-4 space-y-2">
              {["Daily activity grid", "Energy sparklines", "Instant critical alerts"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* 3 — Trends */}
      <Section>
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
            <TrendingUp className="h-3 w-3" /> Trends & Patterns
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Patterns emerge over time
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] text-zinc-500">
            Sleep correlations, symptom frequency, mood patterns — all captured passively from conversations and surfaced visually.
          </p>
        </div>
        <DemoTrends />
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* 3.5 — Symptom Network */}
      <Section>
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700">
              <Activity className="h-3 w-3" /> Symptom Network
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              See how symptoms connect
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              An interactive graph that maps relationships between symptoms. Tap any node to explore — larger nodes appear more frequently, and connections reveal patterns a doctor can act on.
            </p>
            <ul className="mt-4 space-y-2">
              {["Frequency-weighted nodes", "Co-occurrence links", "Tap to explore details"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <DemoSymptomNetwork />
        </div>
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* 4 — Alerts */}
      <Section>
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
              <Shield className="h-3 w-3" /> Smart Alerts
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Nothing slips through
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              Critical symptoms are flagged immediately. Worsening trends trigger warnings before they become emergencies. Try dismissing an alert.
            </p>
          </div>
          <DemoAlerts />
        </div>
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* 5 — Reports */}
      <Section>
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <DemoReport />
          </div>
          <div className="order-1 md:order-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
              <FileText className="h-3 w-3" /> Doctor Reports
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Print and bring to the GP
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              One-page summaries with key findings, medication adherence, symptom trends, and recommended actions. Generated from weeks of check-in data.
            </p>
            <ul className="mt-4 space-y-2">
              {["AI-generated summary", "Structured health metrics", "Printable PDF format"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-zinc-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Try a Call */}
      <Section className="scroll-mt-20" id="try-call">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              <PhoneCall className="h-3 w-3" /> Try It Yourself
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Experience it firsthand
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
              Step into the shoes of Margaret Chen — a 73-year-old managing diabetes and knee pain. Tessera will call you and run a real check-in, just like it would for your loved one.
            </p>
          </div>
          <DemoCallSection />
        </div>
      </Section>

      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* CTA */}
      <section className="bg-zinc-950 px-4 py-16 text-center sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Ready to try it?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] text-zinc-400 sm:text-base">
          Join the waitlist and we&apos;ll set you up with a test call — so you can hear exactly what your loved one will experience.
        </p>
        <a
          href="/#waitlist"
          className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-zinc-900 transition-all hover:bg-zinc-100 active:scale-[0.98]"
        >
          Join the waitlist
          <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
                  <Mic className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
                <span className="text-[15px] font-semibold text-zinc-900">Tessera</span>
              </div>
              <p className="max-w-xs text-[13px] leading-relaxed text-zinc-400">
                AI-powered daily health check-ins for the people you care about. A phone call, not an app.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12 sm:gap-16">
              <div>
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/#waitlist" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">Join waitlist</Link></li>
                  <li><Link href="/" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">Home</Link></li>
                  <li><a href="#try-call" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">Try a call</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">Privacy</a></li>
                  <li><a href="#" className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">Terms</a></li>
                </ul>
              </div>
              {isSignedIn && (
                <div>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Account</h4>
                  <ul className="space-y-2">
                    <li>
                      <SignOutButton>
                        <button className="flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-900">
                          <LogOut className="h-3 w-3" />
                          Log out
                        </button>
                      </SignOutButton>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 flex flex-col items-center gap-2 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-between">
            <p className="text-[11px] text-zinc-400">
              &copy; {new Date().getFullYear()} Tessera. All rights reserved.
            </p>
            <p className="text-[11px] text-zinc-400">
              Tessera does not provide medical diagnoses or replace professional medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

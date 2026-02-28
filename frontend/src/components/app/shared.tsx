"use client";

import type { ReactNode } from "react";

const PILL_STYLES = {
  default: "bg-zinc-100 text-zinc-500",
  good: "bg-emerald-50 text-emerald-600",
  warn: "bg-amber-50 text-amber-600",
  bad: "bg-red-50 text-red-600",
} as const;

export function Pill({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: keyof typeof PILL_STYLES;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide ${PILL_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d4d4d8"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function Bar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color =
    value >= 7 ? "bg-emerald-400" : value >= 5 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[16px] text-right text-[11px] tabular-nums text-zinc-400">
        {value}
      </span>
    </div>
  );
}

export function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between py-3"
    >
      <span className="text-[13px] text-zinc-700">{label}</span>
      <div
        className={`flex h-[22px] w-10 items-center rounded-full p-0.5 transition-colors ${on ? "bg-zinc-900" : "bg-zinc-200"}`}
      >
        <div
          className={`h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-[18px]" : "translate-x-0"}`}
        />
      </div>
    </button>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-zinc-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
            value === o.value
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sparkline({
  data,
  color = "#18181b",
  height = 48,
  fill = false,
  labels,
  highlight,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  labels?: string[];
  highlight?: number;
}) {
  const w = 280;
  const h = height;
  const pad = 4;
  const min = Math.min(...data) - 0.5;
  const max = Math.max(...data) + 0.5;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / (max - min)) * (h - pad * 2),
    v,
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
        {fill && <path d={area} fill={color} opacity="0.05" />}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={highlight === i ? 4 : 2.5}
            fill={highlight === i ? color : "#fff"}
            stroke={color}
            strokeWidth={highlight === i ? 2 : 1.5}
          />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between px-1 pt-1.5">
          {labels.map((l, i) => (
            <span key={i} className="text-[9px] text-zinc-300">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

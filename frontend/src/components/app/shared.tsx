"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";

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
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${value === o.value
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

// ── Toast notification ──

type ToastVariant = "success" | "error" | "info";

const TOAST_ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
  ),
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  info: "border-blue-200 bg-blue-50",
};

const TOAST_TEXT: Record<ToastVariant, string> = {
  success: "text-emerald-800",
  error: "text-red-800",
  info: "text-blue-800",
};

export function Toast({
  message,
  subtitle,
  variant = "success",
  visible,
}: {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  visible: boolean;
}) {
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-5 z-[200] -translate-x-1/2 transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
    >
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-lg shadow-black/5 backdrop-blur-lg ${TOAST_STYLES[variant]}`}>
        <div className="shrink-0">{TOAST_ICONS[variant]}</div>
        <div>
          <div className={`text-[13px] font-semibold ${TOAST_TEXT[variant]}`}>{message}</div>
          {subtitle && <div className={`mt-0.5 text-[11px] ${TOAST_TEXT[variant]} opacity-60`}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

export function useToast(duration = 3500) {
  const [toast, setToast] = useState<{ message: string; subtitle?: string; variant: ToastVariant } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), duration);
    const clear = setTimeout(() => setToast(null), duration + 350);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [toast, duration]);

  const show = useCallback((message: string, variant: ToastVariant = "success", subtitle?: string) => {
    setToast({ message, subtitle, variant });
  }, []);

  const ToastEl = toast ? <Toast message={toast.message} subtitle={toast.subtitle} variant={toast.variant} visible={visible} /> : null;

  return { show, ToastEl };
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
  if (!data || data.length === 0) return null;

  const w = 280;
  const h = height;
  const pad = 4;

  if (data.length === 1) {
    const px = w / 2;
    const py = h / 2;
    return (
      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
          <circle
            cx={px}
            cy={py}
            r={highlight === 0 ? 4 : 2.5}
            fill={highlight === 0 ? color : "#fff"}
            stroke={color}
            strokeWidth={highlight === 0 ? 2 : 1.5}
          />
        </svg>
        {labels && labels.length > 0 && (
          <div className="flex justify-center px-1 pt-1.5">
            <span className="text-[9px] text-zinc-300">
              {labels[0]}
            </span>
          </div>
        )}
      </div>
    );
  }

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

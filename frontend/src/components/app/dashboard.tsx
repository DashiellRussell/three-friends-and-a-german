"use client";

import { CHECKINS } from "@/lib/mock-data";
import { Pill, Sparkline } from "./shared";

export function Dashboard({ goTo }: { goTo: (tab: string) => void }) {
  const last7 = CHECKINS.slice(0, 7).reverse();

  return (
    <div className="px-5 pt-8 pb-[100px]">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          February 28, 2026
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-zinc-900 leading-tight">
          Good morning
        </h1>
      </div>

      {/* Alert card */}
      <button
        onClick={() => goTo("log")}
        className="mb-6 w-full rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 text-left transition-all hover:shadow-md hover:shadow-amber-100/50"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Attention
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-stone-600">
          HbA1c trending up (6.5% → 6.8%). Fatigue and thirst reported.
        </p>
      </button>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { l: "Streak", v: "4", u: "days" },
          { l: "Energy", v: "6.5", u: "avg" },
          { l: "Adherence", v: "87", u: "%" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-2xl border border-zinc-100 bg-white p-3.5 transition-all hover:border-zinc-200 hover:shadow-sm"
          >
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              {s.l}
            </div>
            <div className="text-2xl font-semibold leading-none tracking-tight text-zinc-900">
              {s.v}
              <span className="ml-0.5 text-[11px] font-normal text-zinc-300">
                {s.u}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Energy sparkline */}
      <div className="mb-4 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900">Energy</span>
          <button
            onClick={() => goTo("trends")}
            className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
          >
            See trends →
          </button>
        </div>
        <Sparkline
          data={last7.map((c) => c.energy)}
          labels={last7.map((c) => c.date.split(" ")[1])}
          color="#18181b"
          fill
          highlight={last7.length - 1}
        />
      </div>

      {/* Latest entry */}
      <button
        onClick={() => goTo("log")}
        className="w-full rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
      >
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Latest
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium text-zinc-900">
              Morning check-in
            </div>
            <div className="mt-1 text-[12px] text-zinc-400">
              Today 8:15 AM · Mood: Good
            </div>
          </div>
          <Pill>2 symptoms</Pill>
        </div>
      </button>
    </div>
  );
}

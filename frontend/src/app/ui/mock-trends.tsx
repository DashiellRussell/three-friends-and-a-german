"use client";

import type { SeedData, SeedProfile } from "./seed-data";
import { Sparkline } from "@/components/app/shared";

export function MockTrends({ seed, profile }: { seed: SeedData; profile: SeedProfile }) {
  const checkIns = seed.checkIns
    .filter((ci) => ci.user_id === profile.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const energyD = checkIns.map((ci) => ci.energy);
  const sleepD = checkIns.map((ci) => ci.sleep_hours);
  const labels = checkIns.map((ci) =>
    new Date(ci.created_at).toLocaleDateString("en-AU", { month: "short", day: "numeric" })
  );

  const validEnergy = energyD.filter((e) => e != null);
  const validSleep = sleepD.filter((s) => s != null);

  const avgEnergy = validEnergy.length > 0
    ? (validEnergy.reduce((a, b) => a + b, 0) / validEnergy.length).toFixed(1)
    : "0.0";
  const avgSleep = validSleep.length > 0
    ? (validSleep.reduce((a, b) => a + b, 0) / validSleep.length).toFixed(1)
    : "0.0";

  // Symptom frequency
  const symptomCounts: Record<string, number> = {};
  checkIns.forEach((ci) =>
    ci.symptoms.forEach((s) => { symptomCounts[s.name] = (symptomCounts[s.name] || 0) + 1; })
  );
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  // Mood distribution
  const moodCounts: Record<string, number> = {};
  checkIns.forEach((ci) => { moodCounts[ci.mood] = (moodCounts[ci.mood] || 0) + 1; });
  const moodColors: Record<string, string> = { good: "bg-emerald-400", okay: "bg-amber-400", bad: "bg-red-400", great: "bg-emerald-500" };

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Trends
      </h2>
      <p className="mb-5 text-[13px] text-zinc-400" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        Patterns from {profile.display_name}&apos;s check-ins
      </p>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3" style={{ animation: "fadeUp 0.4s ease-out 0.1s both" }}>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Avg Energy</div>
          <div className="text-[28px] font-semibold tracking-tight text-zinc-900">
            {avgEnergy}<span className="text-xs text-zinc-300">/10</span>
          </div>
          <div className={`mt-1 text-[11px] font-medium ${parseFloat(avgEnergy) >= 6.5 ? "text-emerald-600" : "text-amber-600"}`}>
            {parseFloat(avgEnergy) >= 6.5 ? "Stable" : "Below baseline"}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Avg Sleep</div>
          <div className="text-[28px] font-semibold tracking-tight text-zinc-900">
            {avgSleep}<span className="text-xs text-zinc-300">hrs</span>
          </div>
          <div className={`mt-1 text-[11px] font-medium ${parseFloat(avgSleep) >= 7 ? "text-emerald-600" : "text-amber-600"}`}>
            {parseFloat(avgSleep) >= 7 ? "On target" : "Below 7hr target"}
          </div>
        </div>
      </div>

      {/* Energy chart */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.15s both" }}>
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Energy (1-10)</div>
        <Sparkline data={energyD} labels={labels} color="#18181b" fill height={52} highlight={energyD.length - 1} />
      </div>

      {/* Sleep chart */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.2s both" }}>
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Sleep (hrs)</div>
        <Sparkline data={sleepD} labels={labels} color="#818cf8" fill height={64} highlight={sleepD.length - 1} minStatic={0} maxStatic={12} />
      </div>

      {/* Mood distribution */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.25s both" }}>
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Mood Distribution</div>
        <div className="flex items-end gap-3 h-20">
          {Object.entries(moodCounts).map(([mood, count]) => {
            const pct = (count / checkIns.length) * 100;
            return (
              <div key={mood} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="w-full rounded-t-lg overflow-hidden bg-zinc-100" style={{ height: 80 }}>
                  <div
                    className={`w-full ${moodColors[mood] || "bg-zinc-300"} rounded-t-lg transition-all duration-700`}
                    style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                  />
                </div>
                <span className="text-[10px] capitalize text-zinc-500">{mood}</span>
                <span className="text-[9px] text-zinc-400">{count}x</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top symptoms */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.3s both" }}>
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Top Symptoms</div>
        {topSymptoms.length === 0 ? (
          <div className="text-[13px] text-zinc-400">No symptoms reported</div>
        ) : (
          topSymptoms.map(([name, count]) => (
            <div key={name} className="mb-3">
              <div className="mb-1.5 flex justify-between">
                <span className="text-[13px] text-zinc-700">{name}</span>
                <span className="text-[11px] text-zinc-400">{count}x</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-red-400 transition-all duration-500"
                  style={{ width: `${Math.min((count / checkIns.length) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

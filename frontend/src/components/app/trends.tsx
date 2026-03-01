"use client";

import { useState } from "react";
import { CHECKINS, MOOD_MAP } from "@/lib/mock-data";
import { SegmentedControl, Sparkline } from "./shared";
import { SymptomGraph } from "./symptom-graph";

export function Trends() {
  const [range, setRange] = useState("week");
  const data = CHECKINS.slice(0, 7).reverse();
  const labels = data.map((c) => c.date.split(" ")[1]);
  const energyD = data.map((c) => c.energy);
  const sleepD = data.map((c) => c.sleep);
  const moodD = data.map((c) => MOOD_MAP[c.mood] ?? 1);

  const moodCounts: Record<string, number> = { Great: 0, Good: 0, Okay: 0 };
  data.forEach((c) => {
    if (moodCounts[c.mood] !== undefined) moodCounts[c.mood]++;
  });
  const totalMoods = data.length;

  const symptomCounts: Record<string, number> = {};
  data.forEach((c) =>
    c.symptoms.forEach((s) => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    })
  );
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  const medNames = [...new Set(data.flatMap((c) => c.meds.map((m) => m.name)))];
  const medAdherence = medNames.map((name) => {
    const total = data.filter((c) => c.meds.find((m) => m.name === name)).length;
    const taken = data.filter((c) => c.meds.find((m) => m.name === name && m.taken)).length;
    return { name: name.split(" ")[0], pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
  });

  const avgEnergy = (energyD.reduce((a, b) => a + b, 0) / energyD.length).toFixed(1);
  const avgSleep = (sleepD.reduce((a, b) => a + b, 0) / sleepD.length).toFixed(1);

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">Trends</h2>
      <p className="mb-5 text-xs text-zinc-400">Patterns from your check-ins</p>

      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[
          { value: "week", label: "1 Week" },
          { value: "2weeks", label: "2 Weeks" },
          { value: "month", label: "Month" },
        ]}
      />

      {/* Summary cards */}
      <div className="mt-5 mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Avg Energy</div>
          <div className="text-[28px] font-semibold tracking-tight text-zinc-900">
            {avgEnergy}<span className="text-xs text-zinc-300">/10</span>
          </div>
          <div className={`mt-1 text-[11px] font-medium ${parseFloat(avgEnergy) >= 6.5 ? "text-emerald-600" : "text-amber-600"}`}>
            {parseFloat(avgEnergy) >= 6.5 ? "↑ Stable" : "↓ Below baseline"}
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

      {/* Energy */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Energy</div>
        <Sparkline data={energyD} labels={labels} color="#18181b" fill height={52} highlight={energyD.length - 1} />
      </div>

      {/* Sleep */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Sleep</div>
        <Sparkline data={sleepD} labels={labels} color="#818cf8" fill height={52} highlight={sleepD.length - 1} />
      </div>

      {/* Mood distribution */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Mood Distribution</div>
        <div className="mb-3 flex h-2.5 overflow-hidden rounded-full">
          {[
            { key: "Great", color: "bg-emerald-400" },
            { key: "Good", color: "bg-amber-400" },
            { key: "Okay", color: "bg-red-400" },
          ].map(
            (m) =>
              moodCounts[m.key] > 0 && (
                <div
                  key={m.key}
                  className={`${m.color} transition-all duration-500`}
                  style={{ width: `${(moodCounts[m.key] / totalMoods) * 100}%` }}
                />
              )
          )}
        </div>
        <div className="flex gap-5">
          {[
            { key: "Great", color: "bg-emerald-400", emoji: "😊" },
            { key: "Good", color: "bg-amber-400", emoji: "🙂" },
            { key: "Okay", color: "bg-red-400", emoji: "😐" },
          ].map((m) => (
            <div key={m.key} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-sm ${m.color}`} />
              <span className="text-xs text-zinc-500">{m.emoji} {m.key}</span>
              <span className="text-xs font-semibold text-zinc-900">{moodCounts[m.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mood trend */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Mood Trend</div>
        <Sparkline data={moodD} labels={labels} color="#f59e0b" height={40} highlight={moodD.length - 1} />
        <div className="mt-1.5 flex justify-between">
          <span className="text-[9px] text-zinc-300">Okay</span>
          <span className="text-[9px] text-zinc-300">Great</span>
        </div>
      </div>

      {/* Symptoms */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Top Symptoms</div>
        {topSymptoms.length === 0 ? (
          <div className="text-sm text-zinc-400">No symptoms reported</div>
        ) : (
          topSymptoms.map(([name, count]) => (
            <div key={name} className="mb-3">
              <div className="mb-1.5 flex justify-between">
                <span className="text-[13px] text-zinc-700">{name}</span>
                <span className="text-xs text-zinc-400">{count}x</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-red-400 transition-all duration-500"
                  style={{ width: `${(count / data.length) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Medication adherence */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">Medication Adherence</div>
        {medAdherence.map((med, i) => (
          <div key={med.name} className={i < medAdherence.length - 1 ? "mb-3" : ""}>
            <div className="mb-1.5 flex justify-between">
              <span className="text-[13px] text-zinc-700">{med.name}</span>
              <span className={`text-[13px] font-semibold ${med.pct >= 90 ? "text-emerald-600" : med.pct >= 70 ? "text-amber-600" : "text-red-500"}`}>
                {med.pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${med.pct >= 90 ? "bg-emerald-400" : med.pct >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${med.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="mb-3 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-blue-50/50 p-5">
        <div className="mb-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <span className="text-xs font-semibold text-sky-700">AI Insight</span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          Your energy dips correlate with nights under 6 hours sleep. Feb 27 shows the lowest energy (5/10) following 5 hours sleep, combined with missed Vitamin D and new symptoms (thirst, fatigue) that may relate to your elevated HbA1c.
        </p>
      </div>

      {/* Symptom Network Graph */}
      <SymptomGraph />
    </div>
  );
}

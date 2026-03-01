"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import { SegmentedControl, Sparkline } from "./shared";
import { SymptomGraph } from "./symptom-graph";

export function Trends() {
  const { user } = useUser();
  const [range, setRange] = useState("week");
  const [trendsData, setTrendsData] = useState<
    | {
        date: string;
        energy: number | null;
        sleep: number | null;
        symptoms?: string[];
      }[]
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    fetch(`${BACKEND_URL}/api/trends?range=${range}`, {
      headers: { "x-user-id": user.id },
    })
      .then((r) => r.json())
      .then((d) => {
        setTrendsData(d);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user?.id, range]);

  const energyD = trendsData ? trendsData.map((c) => c.energy) : [];
  const sleepD = trendsData ? trendsData.map((c) => c.sleep) : [];
  const trendLabels = trendsData
    ? trendsData.map((c, i) => {
        // c.date is like "Feb 23" or similar from the backend "month day" format
        const step = range === "month" ? 5 : range === "2weeks" ? 2 : 1;

        // Space labels backwards from the most recent day to ensure today is always labeled
        if ((trendsData.length - 1 - i) % step !== 0) return "";

        return c.date; // Use "Feb 23" instead of just "23"
      })
    : [];

  const validEnergy = energyD.filter((e) => e !== null) as number[];
  const validSleep = sleepD.filter((s) => s !== null) as number[];

  const avgEnergy =
    validEnergy.length > 0
      ? (validEnergy.reduce((a, b) => a + b, 0) / validEnergy.length).toFixed(1)
      : "0.0";
  const avgSleep =
    validSleep.length > 0
      ? (validSleep.reduce((a, b) => a + b, 0) / validSleep.length).toFixed(1)
      : "0.0";

  const symptomCounts: Record<string, number> = {};
  if (trendsData) {
    trendsData.forEach((c) =>
      c.symptoms?.forEach((s: string) => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      }),
    );
  }
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
        Trends
      </h2>
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
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Avg Energy
          </div>
          {isLoading ? (
            <div className="flex h-[36px] items-center">
              <div className="h-7 w-12 animate-pulse rounded bg-zinc-200/80" />
            </div>
          ) : (
            <>
              <div className="text-[28px] font-semibold tracking-tight text-zinc-900">
                {avgEnergy}
                <span className="text-xs text-zinc-300">/10</span>
              </div>
              <div
                className={`mt-1 text-[11px] font-medium ${parseFloat(avgEnergy) >= 6.5 ? "text-emerald-600" : "text-amber-600"}`}
              >
                {parseFloat(avgEnergy) >= 6.5 ? "↑ Stable" : "↓ Below baseline"}
              </div>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Avg Sleep
          </div>
          {isLoading ? (
            <div className="flex h-[36px] items-center">
              <div className="h-7 w-12 animate-pulse rounded bg-zinc-200/80" />
            </div>
          ) : (
            <>
              <div className="text-[28px] font-semibold tracking-tight text-zinc-900">
                {avgSleep}
                <span className="text-xs text-zinc-300">hrs</span>
              </div>
              <div
                className={`mt-1 text-[11px] font-medium ${parseFloat(avgSleep) >= 7 ? "text-emerald-600" : "text-amber-600"}`}
              >
                {parseFloat(avgSleep) >= 7 ? "On target" : "Below 7hr target"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Energy */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">
          Energy (1-10)
        </div>
        {isLoading ? (
          <div className="h-[52px] w-full animate-pulse rounded-xl bg-zinc-200/60" />
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-[9px] text-zinc-300">
              <span>10</span>
              <span>1</span>
            </div>
            <Sparkline
              data={energyD}
              labels={trendLabels}
              color="#18181b"
              fill
              height={52}
              highlight={energyD.length - 1}
            />
          </div>
        )}
      </div>

      {/* Sleep */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">
          Sleep (hrs)
        </div>
        {isLoading ? (
          <div className="h-[72px] w-full animate-pulse rounded-xl bg-zinc-200/60" />
        ) : (
          <div className="relative pl-6">
            {/* Guide lines & Labels */}
            <div className="absolute left-0 top-0 bottom-5 right-0 flex flex-col justify-between text-[9px] text-zinc-300">
              <div className="relative w-full flex items-center">
                <span className="absolute left-0 w-4 font-medium text-right mt-1">
                  12
                </span>
                <div className="ml-6 flex-1 border-t border-dashed border-zinc-200 mt-1" />
              </div>
              <div className="relative w-full flex items-center">
                <span className="absolute left-0 w-4 font-medium text-right mt-1">
                  9
                </span>
                <div className="ml-6 flex-1 mt-1 opacity-0" />
              </div>
              <div className="relative w-full flex items-center">
                <span className="absolute left-0 w-4 font-medium text-right mt-1">
                  6
                </span>
                <div className="ml-6 flex-1 border-t border-dashed border-zinc-200 mt-1" />
              </div>
              <div className="relative w-full flex items-center">
                <span className="absolute left-0 w-4 font-medium text-right mt-[3px]">
                  3
                </span>
                <div className="ml-6 flex-1 mt-[3px] opacity-0" />
              </div>
              <div className="relative w-full flex items-center pb-2">
                <span className="absolute left-0 w-4 font-medium text-right mt-[3px]">
                  0
                </span>
                <div className="ml-6 flex-1 border-t border-dashed border-zinc-200 mt-[3px]" />
              </div>
            </div>
            <div className="relative top-[4px] z-10">
              <Sparkline
                data={sleepD}
                labels={trendLabels}
                color="#818cf8"
                fill
                height={64}
                highlight={sleepD.length - 1}
                minStatic={0}
                maxStatic={12}
              />
            </div>
          </div>
        )}
      </div>

      {/* Symptoms */}
      <div className="mb-3 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 text-[13px] font-semibold text-zinc-900">
          Top Symptoms
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-[28px] w-full animate-pulse rounded bg-zinc-200/60" />
            <div className="h-[28px] w-full animate-pulse rounded bg-zinc-200/60" />
          </div>
        ) : topSymptoms.length === 0 ? (
          <div className="text-sm text-zinc-400">
            No symptoms reported this period
          </div>
        ) : (
          topSymptoms.map(([name, count]) => (
            <div key={name} className="mb-3">
              <div className="mb-1.5 flex justify-between">
                <span className="text-[13px] text-zinc-700 capitalize">
                  {name.replace("_", " ")}
                </span>
                <span className="text-xs text-zinc-400">{count}x</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-red-400 transition-all duration-500"
                  style={{
                    width: `${Math.min((count / (trendsData?.length || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Insight */}
      <div className="mb-3 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-blue-50/50 p-5">
        <div className="mb-2 flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-xs font-semibold text-sky-700">AI Insight</span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          Your energy dips correlate with nights under 6 hours sleep. Feb 27
          shows the lowest energy (5/10) following 5 hours sleep, combined with
          missed Vitamin D and new symptoms (thirst, fatigue) that may relate to
          your elevated HbA1c.
        </p>
      </div>

      {/* Symptom Network Graph */}
      <SymptomGraph />
    </div>
  );
}

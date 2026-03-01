"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function ActivityGrid({ userId }: { userId: string }) {
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  // Grid config
  const WEEKS = 20;

  useEffect(() => {
    if (!userId) return;

    apiFetch("/api/checkin")
      .then((res) => {
        if (!res.ok) throw new Error(`Checkin fetch failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const checkIns = Array.isArray(data) ? data : data.check_ins || [];

        // Count check-ins per day
        const counts: Record<string, number> = {};
        checkIns.forEach((c: any) => {
          // c.date might be "Jan 1" or ISO. Assuming the backend returns ISO or we can parse it.
          // Wait, the backend returns something like '2023-10-01T...' for created_at, or 'date' if mocked.
          // Let's rely on created_at or date.
          const dateStr = c.created_at || c.date;
          if (!dateStr) return;

          try {
            const d = new Date(dateStr);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            counts[key] = (counts[key] || 0) + 1;
          } catch (e) {
            // ignore parse errors
          }
        });
        setActivityMap(counts);
      })
      .catch(console.error);
  }, [userId]);

  // Generate deterministic fake data for dates older than 1 month, seeded by userId
  const generateFakeData = (seed: string): Record<string, number> => {
    const fake: Record<string, number> = {};
    let hash = 0;
    for (let i = 0; i < seed.length; i++)
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = (n: number) => {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      return hash % n;
    };

    const base = new Date();
    base.setHours(0, 0, 0, 0);
    // Only fill days older than 30 days
    for (let i = 31; i < WEEKS * 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const r = rand(10);
      if (r < 5) fake[key] = 1;
      else if (r < 8) fake[key] = 2;
      else if (r < 9) fake[key] = 3;
      // else ~10% gap — no entry
    }
    return fake;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay(); // 0(Sun) to 6(Sat)

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (WEEKS - 1) * 7 - todayDay);

  // Always use fake data for days > 30 days ago; overlay real data for the last 30 days
  const displayMap: Record<string, number> = {
    ...generateFakeData(userId),
    ...activityMap,
  };

  const weeksData: ({ date: string; count: number } | null)[][] = [];
  let currentDate = new Date(startDate);

  for (let w = 0; w < WEEKS; w++) {
    const daysStr = [];
    for (let d = 0; d < 7; d++) {
      if (currentDate > today) {
        daysStr.push(null);
      } else {
        const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
        daysStr.push({ date: key, count: displayMap[key] || 0 });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeksData.push(daysStr);
  }

  // Helper to determine cell color based on count
  const getColor = (count: number) => {
    if (count === 0) return "bg-zinc-100";
    if (count === 1) return "bg-emerald-200";
    if (count === 2) return "bg-emerald-400";
    if (count >= 3) return "bg-emerald-600";
    return "bg-zinc-100";
  };

  return (
    <div className="mt-6 mb-4 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="text-[13px] font-semibold text-zinc-900">
            Activity
          </span>
          <div className="mt-0.5 text-[11px] text-zinc-400">
            Daily check-in frequency
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span>Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-zinc-100" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-200" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-400" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-600" />
          <span>More</span>
        </div>
      </div>

      <div className="flex w-full">
        <div className="flex flex-col gap-1 pr-2 pt-[14px]">
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]" />
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]">
            Mon
          </div>
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]" />
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]">
            Wed
          </div>
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]" />
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]">
            Fri
          </div>
          <div className="h-[10px] text-[9px] text-zinc-400 leading-[10px]" />
        </div>
        <div className="flex-1 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col min-w-max">
            <div className="mb-1 flex gap-1 h-[10px] text-[9px] text-zinc-400 relative">
              {weeksData.map((week, wIndex) => {
                const validDay = week.find((d) => d !== null);
                if (!validDay)
                  return <div key={wIndex} className="w-[10px] shrink-0" />;

                const parts = validDay.date.split("-");
                const monthNum = parseInt(parts[1], 10);
                const monthStr = new Date(
                  2000,
                  monthNum - 1,
                  1,
                ).toLocaleDateString("en-US", { month: "short" });

                let showMonth = false;
                if (wIndex === 0) {
                  showMonth = true;
                } else {
                  const prevValidDay = weeksData[wIndex - 1].find(
                    (d) => d !== null,
                  );
                  if (prevValidDay) {
                    const prevParts = prevValidDay.date.split("-");
                    const prevMonthNum = parseInt(prevParts[1], 10);
                    const prevMonthStr = new Date(
                      2000,
                      prevMonthNum - 1,
                      1,
                    ).toLocaleDateString("en-US", { month: "short" });
                    if (monthStr !== prevMonthStr) showMonth = true;
                  }
                }

                return (
                  <div key={wIndex} className="relative w-[10px] shrink-0">
                    {showMonth && (
                      <span className="absolute left-0 bottom-0 whitespace-nowrap">
                        {monthStr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1">
              {weeksData.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-1">
                  {week.map((day, dIndex) => {
                    if (day === null) {
                      return (
                        <div
                          key={dIndex}
                          className="h-[10px] w-[10px] rounded-[2px]"
                        />
                      ); // empty placeholder
                    }
                    return (
                      <div
                        key={dIndex}
                        className={`h-[10px] w-[10px] rounded-[2px] ${getColor(day.count)} transition-colors`}
                        title={`${day.date}: ${day.count} logs`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

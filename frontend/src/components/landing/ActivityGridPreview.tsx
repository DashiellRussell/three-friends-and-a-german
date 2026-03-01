"use client";

// Static activity grid with demo data for the landing page
export function ActivityGridPreview() {
  const WEEKS = 20;

  // Deterministic pseudo-random from seed
  const seed = "tessera-demo";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = (n: number) => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash % n;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (WEEKS - 1) * 7 - todayDay);

  const activityMap: Record<string, number> = {};
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    if (d > today) break;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const r = rand(10);
    if (r < 4) activityMap[key] = 1;
    else if (r < 7) activityMap[key] = 2;
    else if (r < 9) activityMap[key] = 3;
  }

  const weeksData: ({ date: string; count: number } | null)[][] = [];
  const currentDate = new Date(startDate);
  for (let w = 0; w < WEEKS; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      if (currentDate > today) {
        days.push(null);
      } else {
        const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
        days.push({ date: key, count: activityMap[key] || 0 });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeksData.push(days);
  }

  const getColor = (count: number) => {
    if (count === 0) return "bg-zinc-800";
    if (count === 1) return "bg-emerald-800";
    if (count === 2) return "bg-emerald-600";
    return "bg-emerald-400";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="text-[13px] font-semibold text-zinc-200">Activity</span>
          <div className="mt-0.5 text-[11px] text-zinc-500">Daily check-in frequency</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span>Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-zinc-800" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-800" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-600" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-400" />
          <span>More</span>
        </div>
      </div>
      <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)`, gap: "3px" }}>
        {weeksData.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col" style={{ gap: "3px" }}>
            {week.map((day, dIndex) => (
              <div
                key={dIndex}
                className={`aspect-square w-full rounded-[2px] ${day ? getColor(day.count) : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export function ActivityGrid({ userId }: { userId: string }) {
    const [activityMap, setActivityMap] = useState<Record<string, number>>({});

    // Grid config
    const WEEKS = 20;

    useEffect(() => {
        if (!userId) return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        fetch(`${backendUrl}/api/checkin`, { headers: { "x-user-id": userId } })
            .then(res => res.json())
            .then(data => {
                const checkIns = Array.isArray(data) ? data : (data.check_ins || []);

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
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        counts[key] = (counts[key] || 0) + 1;
                    } catch (e) {
                        // ignore parse errors
                    }
                });
                setActivityMap(counts);
            })
            .catch(console.error);
    }, [userId]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDay = today.getDay(); // 0(Sun) to 6(Sat)

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (WEEKS - 1) * 7 - todayDay);

    const weeksData = [];
    let currentDate = new Date(startDate);

    for (let w = 0; w < WEEKS; w++) {
        const daysStr = [];
        for (let d = 0; d < 7; d++) {
            if (currentDate > today) {
                daysStr.push(null);
            } else {
                const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                daysStr.push({ date: key, count: activityMap[key] || 0 });
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
                    <span className="text-[13px] font-semibold text-zinc-900">Activity</span>
                    <div className="mt-0.5 text-[11px] text-zinc-400">Daily check-in frequency</div>
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

            <div className="flex justify-center">
                <div className="flex gap-1 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {weeksData.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => {
                                if (day === null) {
                                    return <div key={dIndex} className="h-[10px] w-[10px] rounded-[2px]" />; // empty placeholder
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
    );
}

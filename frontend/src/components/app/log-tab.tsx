"use client";

import { CheckIn } from "./types";

const MOOD_SCORE: Record<string, number> = {
  great: 10,
  good: 8,
  okay: 5,
  neutral: 5,
  bad: 2,
  terrible: 0,
};

function entryDotColor(mood: string | null, energy: number | null): string {
  const moodVal = MOOD_SCORE[(mood || "neutral").toLowerCase()] ?? 5;
  const energyVal = energy ?? 5;
  const score = (moodVal + energyVal) / 2;
  if (score >= 7) return "bg-emerald-400";
  if (score >= 4) return "bg-amber-400";
  return "bg-red-400";
}

interface LogTabProps {
  checkIns: CheckIn[];
  expanded: string | number | null;
  toggle: (id: string | number) => void;
  onViewDetail?: (checkIn: CheckIn) => void;
}

export function LogTab({
  checkIns,
  expanded,
  toggle,
  onViewDetail,
}: LogTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {checkIns.length === 0 && (
        <div className="text-center py-10 text-sm text-zinc-400">
          No entries recorded yet.
        </div>
      )}
      {checkIns.map((c) => {
        const date = new Date(c.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const time = new Date(c.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const isOpen = expanded === c.id;

        return (
          <div
            key={c.id}
            id={`checkin-${c.id}`}
            className={`w-full rounded-lg bg-white text-left transition-all ${c.flagged ? "border border-amber-200 hover:border-amber-300" : "border border-zinc-100 hover:border-zinc-200"}`}
          >
            <button
              onClick={() => toggle(c.id)}
              className="w-full px-3.5 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${entryDotColor(c.mood, c.energy)}`}
                  />
                  <div>
                    <div className="text-[13px] font-medium text-zinc-900">
                      {date}{" "}
                      <span className="text-zinc-300 font-normal">·</span>{" "}
                      <span className="text-zinc-500 font-normal">
                        {c.mood
                          ? c.mood.charAt(0).toUpperCase() + c.mood.slice(1)
                          : "Neutral"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {time} <span className="text-zinc-200">·</span> Energy{" "}
                      {c.energy || 0}/10{" "}
                      <span className="text-zinc-200">·</span>{" "}
                      {c.sleep_hours || 0}h sleep
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.flagged && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Alert
                    </span>
                  )}
                  {c.input_mode && (
                    <span className="text-[10px] text-zinc-300">
                      {c.input_mode === "voice" ? "Voice" : "Text"}
                    </span>
                  )}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {isOpen && (
              <div
                className="px-3.5 pb-3 border-t border-zinc-50"
                style={{ animation: "fadeUp 0.2s" }}
              >
                <div className="pt-2.5 grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-zinc-50 px-2.5 py-2">
                    <div className="text-[10px] text-zinc-400 mb-0.5">
                      Energy
                    </div>
                    <div className="text-sm font-medium text-zinc-900">
                      {c.energy || 0}
                      <span className="text-zinc-300 text-[10px] font-normal">
                        /10
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md bg-zinc-50 px-2.5 py-2">
                    <div className="text-[10px] text-zinc-400 mb-0.5">
                      Sleep
                    </div>
                    <div className="text-sm font-medium text-zinc-900">
                      {c.sleep_hours || 0}
                      <span className="text-zinc-300 text-[10px] font-normal">
                        h
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md bg-zinc-50 px-2.5 py-2">
                    <div className="text-[10px] text-zinc-400 mb-0.5">
                      Symptoms
                    </div>
                    <div
                      className={`text-sm font-medium ${c.symptoms && c.symptoms.length ? "text-red-500" : "text-emerald-500"}`}
                    >
                      {c.symptoms ? c.symptoms.length : 0}
                    </div>
                  </div>
                </div>

                {(c.summary || c.notes) && (
                  <p className="mt-2.5 text-[12px] leading-relaxed text-zinc-500 line-clamp-2">
                    {c.summary || c.notes}
                  </p>
                )}

                {c.flagged && c.flag_reason && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                    {c.flag_reason}
                  </div>
                )}

                {onViewDetail && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(c);
                    }}
                    className="mt-2.5 w-full rounded-md bg-zinc-900 py-2 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-700"
                  >
                    View details
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

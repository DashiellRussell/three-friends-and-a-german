"use client";

import { Chevron, Bar } from "./shared";
import { CheckIn } from "./types";

interface LogTabProps {
    checkIns: CheckIn[];
    expanded: string | number | null;
    toggle: (id: string | number) => void;
}

export function LogTab({ checkIns, expanded, toggle }: LogTabProps) {
    return (
        <div className="flex flex-col gap-2.5">
            {checkIns.length === 0 && (
                <div className="text-center py-10 text-sm text-zinc-400">No entries recorded yet.</div>
            )}
            {checkIns.map((c) => {
                const date = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const time = new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                return (
                    <button
                        key={c.id}
                        id={`checkin-${c.id}`}
                        onClick={() => toggle(c.id)}
                        className={`w-full rounded-2xl bg-white p-4 text-left transition-all hover:shadow-sm ${c.flagged ? "border border-amber-200/80 hover:border-amber-300" : "border border-zinc-100 hover:border-zinc-200"}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${c.flagged ? "bg-amber-50" : "bg-zinc-50"}`}>
                                    {c.mood === "Great" || c.mood === "Good" ? "😊" : "😐"}
                                </div>
                                <div>
                                    <div className="text-[13px] font-medium text-zinc-900">
                                        {date} · {c.mood ? c.mood.charAt(0).toUpperCase() + c.mood.slice(1) : "Neutral"}
                                    </div>
                                    <div className="text-[11px] text-zinc-400">
                                        {time} · E {c.energy || 0} · {c.sleep_hours || 0}h
                                    </div>
                                </div>
                            </div>
                            <Chevron open={expanded === c.id} />
                        </div>

                        {expanded === c.id && (
                            <div className="mt-4 border-t border-zinc-50 pt-3" style={{ animation: "fadeUp 0.2s" }}>
                                <div className="mb-3 grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="mb-1.5 text-[10px] font-medium text-zinc-400">Energy</div>
                                        <Bar value={c.energy || 0} />
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[10px] font-medium text-zinc-400">Symptoms</div>
                                        <div className={`text-xs font-medium ${c.symptoms && c.symptoms.length ? "text-red-500" : "text-emerald-500"}`}>
                                            {c.symptoms && c.symptoms.length ? c.symptoms.map(s => s.name).join(", ") : "None"}
                                        </div>
                                    </div>
                                </div>
                                {(c.summary || c.notes) && (
                                    <p className="mt-2 text-xs italic leading-relaxed text-zinc-500">
                                        &ldquo;{c.summary || c.notes}&rdquo;
                                    </p>
                                )}
                                {c.flagged && c.flag_reason && (
                                    <div className="mt-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 px-3 py-2 text-[11px] font-medium text-amber-700">
                                        ⚠ {c.flag_reason}
                                    </div>
                                )}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

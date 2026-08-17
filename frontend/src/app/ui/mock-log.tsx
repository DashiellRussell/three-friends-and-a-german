"use client";

import { useState } from "react";
import type { SeedData, SeedProfile, SeedCheckIn } from "./seed-data";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function moodEmoji(mood: string): string {
  return { good: "😊", okay: "😐", bad: "😟", great: "😄" }[mood] || "😐";
}

function CheckInEntry({ ci, expanded, onToggle }: { ci: SeedCheckIn; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`border-b border-zinc-50 ${expanded ? "bg-zinc-50/50" : ""}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50/50">
        <span className="text-xl">{moodEmoji(ci.mood)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-zinc-900 capitalize">{ci.mood}</span>
            {ci.flagged && (
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">FLAGGED</span>
            )}
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 capitalize">{ci.input_mode}</span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-zinc-400">{ci.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] text-zinc-400">{timeAgo(ci.created_at)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-300">
            <span>E:{ci.energy}</span>
            <span>S:{ci.sleep_hours}h</span>
          </div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round"
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1" style={{ animation: "fadeUp 0.2s ease-out both" }}>
          {/* Stats row */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { label: "Mood", value: ci.mood, icon: moodEmoji(ci.mood) },
              { label: "Energy", value: `${ci.energy}/10` },
              { label: "Sleep", value: `${ci.sleep_hours}h` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-2.5 text-center border border-zinc-100">
                <div className="text-[10px] text-zinc-400">{s.label}</div>
                <div className="mt-0.5 text-[14px] font-semibold text-zinc-900 capitalize">
                  {s.icon || ""} {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mb-3 rounded-xl bg-white border border-zinc-100 p-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Notes</div>
            <p className="text-[13px] leading-relaxed text-zinc-700">{ci.notes}</p>
          </div>

          {/* Symptoms */}
          {ci.symptoms.length > 0 && (
            <div className="rounded-xl bg-white border border-zinc-100 p-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Symptoms</div>
              <div className="space-y-2">
                {ci.symptoms.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${s.is_critical ? "bg-red-500" : "bg-amber-400"}`} />
                      <span className="text-[13px] text-zinc-700">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400">{s.severity}/10</span>
                      {s.is_critical && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600">Critical</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ci.flagged && ci.flag_reason && (
            <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-red-700">Flag reason</span>
              </div>
              <p className="text-[12px] text-red-700">{ci.flag_reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MockLog({ seed, profile }: { seed: SeedData; profile: SeedProfile }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const checkIns = seed.checkIns
    .filter((ci) => ci.user_id === profile.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Check-in Log
      </h2>
      <p className="mb-5 text-[13px] text-zinc-400" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        {checkIns.length} entries for {profile.display_name}
      </p>

      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white" style={{ animation: "fadeUp 0.3s ease-out 0.1s both" }}>
        {checkIns.map((ci) => (
          <CheckInEntry
            key={ci.id}
            ci={ci}
            expanded={expandedId === ci.id}
            onToggle={() => setExpandedId(expandedId === ci.id ? null : ci.id)}
          />
        ))}
        {checkIns.length === 0 && (
          <div className="py-12 text-center text-[13px] text-zinc-400">No check-ins yet</div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { SeedData, SeedCheckIn } from "./seed-data";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function moodColor(mood: string): string {
  const map: Record<string, string> = {
    good: "bg-emerald-400",
    okay: "bg-amber-400",
    bad: "bg-red-400",
    great: "bg-emerald-500",
  };
  return map[mood] || "bg-zinc-300";
}

function DependentSummaryCard({
  name,
  conditions,
  checkIns,
  permissions,
  level,
  accountClaimed,
  delay,
}: {
  name: string;
  conditions: string[];
  checkIns: SeedCheckIn[];
  permissions: Record<string, boolean>;
  level: string;
  accountClaimed: boolean;
  delay: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const recentCheckIns = checkIns.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const avgEnergy = checkIns.length > 0
    ? (checkIns.reduce((sum, ci) => sum + ci.energy, 0) / checkIns.length).toFixed(1)
    : "—";

  const avgSleep = checkIns.length > 0
    ? (checkIns.reduce((sum, ci) => sum + ci.sleep_hours, 0) / checkIns.length).toFixed(1)
    : "—";

  const flaggedCount = checkIns.filter((ci) => ci.flagged).length;
  const symptomCount = checkIns.flatMap((ci) => ci.symptoms).length;

  const enabledPerms = Object.entries(permissions)
    .filter(([, v]) => v)
    .map(([k]) => k.replace("view_", "").replace("initiate_", ""));

  return (
    <div
      className="rounded-2xl border border-zinc-100 bg-white overflow-hidden"
      style={{ animation: `fadeUp 0.4s ease-out ${delay}ms both` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-50/50"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[17px] font-semibold text-white">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-zinc-900">{name}</span>
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
              level === "primary" ? "bg-violet-50 text-violet-600" : "bg-zinc-100 text-zinc-500"
            }`}>
              {level}
            </span>
            {!accountClaimed && (
              <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Unclaimed
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-zinc-400">
            {conditions.join(", ") || "No conditions"}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="2"
          strokeLinecap="round"
          className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ animation: "fadeUp 0.2s ease-out both" }}>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-px bg-zinc-100 border-t border-zinc-100">
            {[
              { label: "Avg Energy", value: avgEnergy, color: "text-blue-600" },
              { label: "Avg Sleep", value: `${avgSleep}h`, color: "text-violet-600" },
              { label: "Symptoms", value: symptomCount.toString(), color: "text-amber-600" },
              { label: "Flagged", value: flaggedCount.toString(), color: flaggedCount > 0 ? "text-red-600" : "text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white px-3 py-3 text-center">
                <div className={`text-[16px] font-bold ${stat.color}`}>{stat.value}</div>
                <div className="mt-0.5 text-[10px] text-zinc-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Permissions overview */}
          <div className="border-t border-zinc-100 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
              Your access
            </div>
            <div className="flex flex-wrap gap-1.5">
              {enabledPerms.map((p) => (
                <span key={p} className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-medium capitalize text-emerald-600">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Mood timeline */}
          {permissions.view_checkins && recentCheckIns.length > 0 && (
            <div className="border-t border-zinc-100 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-2">
                Mood timeline (last 7)
              </div>
              <div className="flex items-center gap-1">
                {recentCheckIns.slice(0, 7).reverse().map((ci) => (
                  <div key={ci.id} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`h-3 w-full rounded-sm ${moodColor(ci.mood)} transition-all`}
                      title={`${ci.mood} — ${timeAgo(ci.created_at)}`}
                    />
                    <span className="text-[8px] text-zinc-400">
                      {new Date(ci.created_at).toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent entries */}
          {permissions.view_checkins && recentCheckIns.length > 0 && (
            <div className="border-t border-zinc-100">
              <div className="px-4 py-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                  Latest entries
                </span>
              </div>
              {recentCheckIns.slice(0, 3).map((ci, i) => (
                <div
                  key={ci.id}
                  className={`px-4 py-2.5 ${i < 2 ? "border-b border-zinc-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${moodColor(ci.mood)}`} />
                      <span className="text-[12px] font-medium capitalize text-zinc-700">{ci.mood}</span>
                      <span className="text-[11px] text-zinc-400">E:{ci.energy}</span>
                      <span className="text-[11px] text-zinc-400">S:{ci.sleep_hours}h</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{timeAgo(ci.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">{ci.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DependentView({ seed }: { seed: SeedData }) {
  const rels = seed.relationships.filter(
    (r) => r.caretaker_id === seed.currentUser.id && r.status === "active"
  );

  return (
    <div className="px-5 pt-6 pb-8">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Dependents
      </h2>
      <p className="mt-1 mb-6 text-[14px] text-zinc-400" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        People you&apos;re caring for
      </p>

      <div className="space-y-3">
        {rels.map((rel, i) => {
          const patient = seed.profiles.find((p) => p.id === rel.patient_id)!;
          const checkIns = seed.checkIns.filter((ci) => ci.user_id === rel.patient_id);

          return (
            <DependentSummaryCard
              key={rel.id}
              name={patient.display_name}
              conditions={patient.conditions}
              checkIns={checkIns}
              permissions={rel.permissions}
              level={rel.level}
              accountClaimed={patient.account_claimed}
              delay={i * 100}
            />
          );
        })}
      </div>

      {/* Empty state CTA */}
      {rels.length === 0 && (
        <div className="mt-12 text-center" style={{ animation: "fadeUp 0.4s ease-out both" }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">No dependents yet</h3>
          <p className="mt-1 text-[13px] text-zinc-400">
            Use an invite code to link with someone you care for
          </p>
        </div>
      )}
    </div>
  );
}

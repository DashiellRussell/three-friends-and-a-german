"use client";

import { useState } from "react";
import type { SeedData, SeedProfile, SeedSymptom } from "./seed-data";
import { Sparkline } from "@/components/app/shared";

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

export function MockDashboard({
  seed,
  profile,
  persona,
}: {
  seed: SeedData;
  profile: SeedProfile;
  persona: "patient" | "dependent";
}) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const firstName = profile.display_name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const checkIns = seed.checkIns
    .filter((ci) => ci.user_id === profile.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const last7 = checkIns.slice(0, 7).reverse();
  const energyData = last7.map((ci) => ci.energy);
  const energyLabels = last7.map((ci) =>
    new Date(ci.created_at).toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2)
  );

  const avgEnergy = checkIns.length > 0
    ? (checkIns.reduce((s, ci) => s + ci.energy, 0) / checkIns.length).toFixed(1)
    : "0";

  const streak = checkIns.length;
  const adherence = 85;

  const allAlerts = checkIns
    .flatMap((ci) => ci.symptoms.map((s) => ({ ...s, checkInTime: ci.created_at })))
    .filter((s) => s.is_critical && !s.dismissed && !dismissedAlerts.has(s.id));

  const latest = checkIns[0] || null;

  // If dependent, show who manages them
  const myCaretakers = seed.relationships.filter(
    (r) => r.patient_id === profile.id && r.status === "active"
  );

  return (
    <div className="px-5 pt-8 pb-25">
      {/* Greeting */}
      <div className="mb-6" style={{ animation: "fadeUp 0.4s ease-out both" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
              {greeting}, {firstName}
            </h1>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              {persona === "dependent"
                ? `Managed by ${myCaretakers.length} caretaker${myCaretakers.length !== 1 ? "s" : ""}`
                : "How are you feeling today?"}
            </p>
          </div>
          {allAlerts.length > 0 && (
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-100 bg-white transition-colors hover:bg-zinc-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {allAlerts.length}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {allAlerts.length > 0 && (
        <div className="mb-6 space-y-2" style={{ animation: "fadeUp 0.4s ease-out 0.05s both" }}>
          {allAlerts.slice(0, 2).map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-red-800">{alert.name}</div>
                {alert.alert_message && (
                  <p className="mt-0.5 text-[12px] text-red-600/70">{alert.alert_message}</p>
                )}
              </div>
              <button
                onClick={() => setDismissedAlerts((prev) => new Set(prev).add(alert.id))}
                className="shrink-0 rounded-lg p-1 text-red-300 hover:text-red-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-3 gap-2.5" style={{ animation: "fadeUp 0.4s ease-out 0.1s both" }}>
        {[
          { label: "Streak", value: `${streak}`, sub: "days", color: "text-zinc-900" },
          { label: "Energy", value: avgEnergy, sub: "/10", color: parseFloat(avgEnergy) >= 6 ? "text-emerald-600" : "text-amber-600" },
          { label: "Adherence", value: `${adherence}`, sub: "%", color: adherence >= 80 ? "text-emerald-600" : "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-100 bg-white p-3.5 transition-all hover:border-zinc-200 hover:shadow-sm">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">{stat.label}</div>
            <div className={`text-[22px] font-bold ${stat.color}`}>
              {stat.value}<span className="text-[11px] font-normal text-zinc-300">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Energy sparkline */}
      <div className="mb-5 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.15s both" }}>
        <div className="mb-3 text-[13px] font-semibold text-zinc-900">Energy (7 day)</div>
        <Sparkline
          data={energyData}
          labels={energyLabels}
          color="#18181b"
          fill
          height={52}
          highlight={energyData.length - 1}
        />
      </div>

      {/* Latest entry */}
      {latest && (
        <div className="mb-5 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm" style={{ animation: "fadeUp 0.4s ease-out 0.2s both" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-900">Latest check-in</span>
            <span className="text-[11px] text-zinc-400">{timeAgo(latest.created_at)}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{moodEmoji(latest.mood)}</span>
            <div className="flex-1">
              <p className="text-[13px] leading-relaxed text-zinc-600">{latest.summary}</p>
              {latest.symptoms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {latest.symptoms.map((s) => (
                    <span key={s.id} className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${s.is_critical ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dependent: show caretakers */}
      {persona === "dependent" && myCaretakers.length > 0 && (
        <div style={{ animation: "fadeUp 0.4s ease-out 0.25s both" }}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Your caretakers</div>
          <div className="space-y-2">
            {myCaretakers.map((rel) => {
              const caretaker = seed.profiles.find((p) => p.id === rel.caretaker_id)!;
              const permCount = Object.values(rel.permissions).filter(Boolean).length;
              return (
                <div key={rel.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-[14px] font-semibold text-white">
                    {caretaker.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-zinc-900">{caretaker.display_name}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {rel.level} &middot; {permCount} permissions &middot; {rel.managed_by === "patient" ? "You control" : "They control"}
                    </div>
                  </div>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                    rel.level === "primary" ? "bg-violet-50 text-violet-600" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {rel.level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { SeedData, SeedCheckIn, SeedSymptom } from "./seed-data";

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
  const map: Record<string, string> = { good: "😊", okay: "😐", bad: "😟", great: "😄" };
  return map[mood] || "😐";
}

function AlertCard({ symptom, patientName }: { symptom: SeedSymptom & { patientName: string; checkInTime: string }; patientName: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-4"
      style={{ animation: "fadeUp 0.4s ease-out both" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-red-800">{symptom.name}</div>
            <div className="text-[11px] text-red-600/70">{patientName} &middot; {timeAgo(symptom.checkInTime)}</div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-red-300 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {symptom.alert_message && (
        <p className="mt-2 text-[12px] leading-relaxed text-red-700/80">{symptom.alert_message}</p>
      )}
    </div>
  );
}

function DependentCard({
  name,
  conditions,
  latestCheckIn,
  alertCount,
  onClick,
  delay,
}: {
  name: string;
  conditions: string[];
  latestCheckIn: SeedCheckIn | null;
  alertCount: number;
  onClick: () => void;
  delay: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm active:scale-[0.98]"
      style={{ animation: `fadeUp 0.4s ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[15px] font-semibold text-white">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-zinc-900">{name}</span>
            {alertCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {alertCount}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-zinc-400">
            {conditions.length > 0 ? conditions.join(", ") : "No conditions"}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {latestCheckIn && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5">
          <span className="text-lg">{moodEmoji(latestCheckIn.mood)}</span>
          <div className="flex-1 min-w-0">
            <div className="truncate text-[12px] text-zinc-600">{latestCheckIn.summary}</div>
            <div className="mt-0.5 text-[11px] text-zinc-400">{timeAgo(latestCheckIn.created_at)}</div>
          </div>
          {latestCheckIn.flagged && (
            <div className="shrink-0 rounded-lg bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
              Flagged
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export function CaretakerDashboard({
  seed,
  onNavigate,
}: {
  seed: SeedData;
  onNavigate: (tab: "dashboard" | "dependents" | "invites" | "permissions") => void;
}) {
  const [selectedDependent, setSelectedDependent] = useState<string | null>(null);

  const activeRels = seed.relationships.filter(
    (r) => r.caretaker_id === seed.currentUser.id && r.status === "active"
  );

  // Gather all critical alerts across dependents
  const allAlerts: (SeedSymptom & { patientName: string; checkInTime: string })[] = [];
  for (const rel of activeRels) {
    const patient = seed.profiles.find((p) => p.id === rel.patient_id);
    if (!patient || !rel.permissions.view_alerts) continue;
    const checkIns = seed.checkIns.filter((ci) => ci.user_id === rel.patient_id);
    for (const ci of checkIns) {
      for (const s of ci.symptoms) {
        if (s.is_critical && !s.dismissed) {
          allAlerts.push({ ...s, patientName: patient.display_name, checkInTime: ci.created_at });
        }
      }
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-5 pt-6 pb-8">
      {/* Greeting */}
      <div style={{ animation: "fadeUp 0.4s ease-out both" }}>
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {greeting}, {seed.currentUser.display_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-[14px] text-zinc-400">
          You&apos;re caring for {activeRels.length} {activeRels.length === 1 ? "person" : "people"}
        </p>
      </div>

      {/* Critical Alerts */}
      {allAlerts.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" style={{ animation: "spherePulse 2s ease-in-out infinite" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-red-600">
              Critical Alerts
            </span>
            <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-700">
              {allAlerts.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {allAlerts.map((a) => (
              <AlertCard key={a.id} symptom={a} patientName={a.patientName} />
            ))}
          </div>
        </div>
      )}

      {/* Dependents */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Your dependents
          </span>
          <button
            onClick={() => onNavigate("invites")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        <div className="space-y-3">
          {activeRels.map((rel, i) => {
            const patient = seed.profiles.find((p) => p.id === rel.patient_id)!;
            const patientCheckIns = seed.checkIns.filter((ci) => ci.user_id === rel.patient_id);
            const latestCheckIn = patientCheckIns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
            const alertCount = patientCheckIns.flatMap((ci) => ci.symptoms).filter((s) => s.is_critical && !s.dismissed).length;

            return (
              <DependentCard
                key={rel.id}
                name={patient.display_name}
                conditions={patient.conditions}
                latestCheckIn={latestCheckIn}
                alertCount={alertCount}
                onClick={() => setSelectedDependent(rel.patient_id)}
                delay={i * 80}
              />
            );
          })}
        </div>

        {/* Pending relationships */}
        {seed.relationships.filter((r) => r.caretaker_id === seed.currentUser.id && r.status === "pending").length > 0 && (
          <div className="mt-4">
            <span className="text-[11px] font-medium text-zinc-400">Pending</span>
            {seed.relationships
              .filter((r) => r.caretaker_id === seed.currentUser.id && r.status === "pending")
              .map((rel) => {
                const patient = seed.profiles.find((p) => p.id === rel.patient_id);
                return (
                  <div
                    key={rel.id}
                    className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-4"
                    style={{ animation: "fadeUp 0.4s ease-out 0.3s both" }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-[14px] font-medium text-zinc-500">
                      {patient?.display_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-zinc-600">{patient?.display_name}</div>
                      <div className="text-[11px] text-zinc-400">Invite pending &middot; {timeAgo(rel.created_at)}</div>
                    </div>
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-600">
                      Pending
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Quick stats
        </span>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { label: "Check-ins today", value: seed.checkIns.filter((ci) => new Date(ci.created_at).toDateString() === new Date().toDateString()).length.toString(), color: "bg-blue-50 text-blue-700" },
            { label: "Active alerts", value: allAlerts.length.toString(), color: allAlerts.length > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700" },
            { label: "Dependents", value: activeRels.length.toString(), color: "bg-violet-50 text-violet-700" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-zinc-100 bg-white p-3.5 text-center"
              style={{ animation: `fadeUp 0.4s ease-out ${200 + i * 80}ms both` }}
            >
              <div className={`mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color} text-[18px] font-bold`}>
                {stat.value}
              </div>
              <div className="text-[10px] font-medium text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Recent activity
        </span>
        <div className="mt-3 space-y-1">
          {seed.auditLog
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((entry, i) => {
              const actor = seed.profiles.find((p) => p.id === entry.actor_id);
              const actionLabels: Record<string, string> = {
                relationship_created: "linked a new relationship",
                permissions_changed: "updated permissions",
                relationship_revoked: "revoked a relationship",
                account_claimed: "claimed their account",
              };
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl px-1 py-2.5"
                  style={{ animation: `fadeUp 0.3s ease-out ${300 + i * 60}ms both` }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-500">
                    {actor?.display_name.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-zinc-600">
                      <span className="font-medium text-zinc-900">{actor?.display_name || "Unknown"}</span>{" "}
                      {actionLabels[entry.action] || entry.action}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(entry.created_at)}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Selected dependent detail overlay */}
      {selectedDependent && (
        <DependentDetailOverlay
          seed={seed}
          patientId={selectedDependent}
          onClose={() => setSelectedDependent(null)}
        />
      )}
    </div>
  );
}

function DependentDetailOverlay({
  seed,
  patientId,
  onClose,
}: {
  seed: SeedData;
  patientId: string;
  onClose: () => void;
}) {
  const patient = seed.profiles.find((p) => p.id === patientId)!;
  const rel = seed.relationships.find(
    (r) => r.caretaker_id === seed.currentUser.id && r.patient_id === patientId && r.status === "active"
  )!;
  const checkIns = seed.checkIns
    .filter((ci) => ci.user_id === patientId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const energyData = checkIns.slice(0, 7).reverse();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fafafa]" style={{ animation: "slideUp 0.3s ease-out both" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
        <button onClick={onClose} className="flex items-center gap-1 text-[14px] font-medium text-zinc-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="text-[15px] font-semibold text-zinc-900">{patient.display_name}</span>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8">
        {/* Patient card */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4" style={{ animation: "fadeUp 0.4s ease-out both" }}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white">
            {patient.display_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold text-zinc-900">{patient.display_name}</div>
            <div className="mt-0.5 text-[12px] text-zinc-400">
              {patient.conditions.join(", ") || "No conditions"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                rel.level === "primary" ? "bg-violet-50 text-violet-600" : "bg-zinc-100 text-zinc-500"
              }`}>
                {rel.level} caretaker
              </span>
              {!patient.account_claimed && (
                <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                  Unclaimed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Energy sparkline */}
        {rel.permissions.view_checkins && energyData.length > 0 && (
          <div className="mb-6" style={{ animation: "fadeUp 0.4s ease-out 0.1s both" }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Energy (7 day)</span>
            <div className="mt-2 rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                {energyData.map((ci, i) => {
                  const pct = (ci.energy / 10) * 100;
                  const color = ci.energy >= 7 ? "bg-emerald-400" : ci.energy >= 5 ? "bg-amber-400" : "bg-red-400";
                  return (
                    <div key={ci.id} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-sm overflow-hidden bg-zinc-100" style={{ height: 48 }}>
                        <div
                          className={`w-full ${color} rounded-t-sm transition-all duration-700`}
                          style={{
                            height: `${pct}%`,
                            marginTop: `${100 - pct}%`,
                            animation: `fadeUp 0.5s ease-out ${i * 100}ms both`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] tabular-nums text-zinc-400">
                        {new Date(ci.created_at).toLocaleDateString("en-AU", { weekday: "short" }).charAt(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {rel.permissions.view_checkins && (
          <div className="mb-6" style={{ animation: "fadeUp 0.4s ease-out 0.2s both" }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Recent check-ins</span>
            <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-100 bg-white">
              {checkIns.slice(0, 5).map((ci, i) => (
                <div
                  key={ci.id}
                  className={`px-4 py-3 ${i < Math.min(checkIns.length, 5) - 1 ? "border-b border-zinc-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px]">{moodEmoji(ci.mood)}</span>
                      <span className="text-[13px] font-medium text-zinc-900 capitalize">{ci.mood}</span>
                      {ci.flagged && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">!</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400">{timeAgo(ci.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{ci.summary}</p>
                  {ci.symptoms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ci.symptoms.map((s) => (
                        <span
                          key={s.id}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                            s.is_critical ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health info */}
        <div style={{ animation: "fadeUp 0.4s ease-out 0.3s both" }}>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Health profile</span>
          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-100 bg-white">
            {[
              { l: "Blood type", v: patient.blood_type || "Unknown" },
              { l: "Conditions", v: patient.conditions.join(", ") || "None" },
              { l: "Allergies", v: patient.allergies.join(", ") || "None" },
              { l: "Emergency contact", v: patient.emergency_contact ? `${patient.emergency_contact.name} (${patient.emergency_contact.relationship})` : "Not set" },
            ].map((item, i) => (
              <div key={item.l} className={`flex justify-between px-4 py-3 ${i < 3 ? "border-b border-zinc-50" : ""}`}>
                <span className="text-[13px] text-zinc-500">{item.l}</span>
                <span className="text-right text-[13px] font-medium text-zinc-900 max-w-[55%]">{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

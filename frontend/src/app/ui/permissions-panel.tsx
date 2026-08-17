"use client";

import { useState } from "react";
import type { SeedData, SeedRelationship } from "./seed-data";

const PERMISSION_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  view_alerts: {
    label: "View alerts",
    desc: "Critical health alerts and flagged symptoms",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  view_checkins: {
    label: "View check-ins",
    desc: "Daily health check-in entries and transcripts",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  view_symptoms: {
    label: "View symptoms",
    desc: "Symptom history, severity, and trends",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  view_medications: {
    label: "View medications",
    desc: "Medication list and adherence tracking",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  },
  view_documents: {
    label: "View documents",
    desc: "Uploaded medical documents and analysis",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  view_reports: {
    label: "View reports",
    desc: "Generated health summary reports",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  view_trends: {
    label: "View trends",
    desc: "Health analytics, charts, and insights",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  initiate_calls: {
    label: "Initiate calls",
    desc: "Start proactive health check calls",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
};

function PermissionToggle({
  permKey,
  enabled,
  onToggle,
  disabled,
}: {
  permKey: string;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const config = PERMISSION_LABELS[permKey];
  if (!config) return null;

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`flex w-full items-center gap-3 py-3 transition-opacity ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
        enabled ? "bg-zinc-900" : "bg-zinc-100"
      }`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={enabled ? "#fff" : "#a1a1aa"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={config.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[13px] font-medium text-zinc-900">{config.label}</div>
        <div className="mt-0.5 text-[11px] text-zinc-400">{config.desc}</div>
      </div>
      <div
        className={`flex h-[22px] w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          enabled ? "bg-zinc-900" : "bg-zinc-200"
        }`}
      >
        <div
          className={`h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

function RelationshipPermissions({
  rel,
  patientName,
  delay,
}: {
  rel: SeedRelationship;
  patientName: string;
  delay: number;
}) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(rel.permissions);
  const [saved, setSaved] = useState(false);

  const isControlled = rel.managed_by === "patient";

  const handleToggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return (
    <div
      className="rounded-2xl border border-zinc-100 bg-white p-5"
      style={{ animation: `fadeUp 0.4s ease-out ${delay}ms both` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[15px] font-semibold text-white">
            {patientName.charAt(0)}
          </div>
          <div>
            <div className="text-[15px] font-semibold text-zinc-900">{patientName}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                rel.level === "primary" ? "bg-violet-50 text-violet-600" : "bg-zinc-100 text-zinc-500"
              }`}>
                {rel.level}
              </span>
              <span className="text-[11px] text-zinc-400">
                {enabledCount}/{totalCount} permissions
              </span>
            </div>
          </div>
        </div>

        {isControlled && (
          <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-600">
            Patient controlled
          </span>
        )}
      </div>

      {isControlled && (
        <div className="mt-3 rounded-xl bg-amber-50/50 px-3 py-2 text-[11px] text-amber-700">
          {patientName} controls these permissions. You can view but not change them.
        </div>
      )}

      {/* Permission toggles */}
      <div className="mt-4 divide-y divide-zinc-50">
        {Object.keys(PERMISSION_LABELS).map((key) => (
          <PermissionToggle
            key={key}
            permKey={key}
            enabled={permissions[key] ?? false}
            onToggle={() => handleToggle(key)}
            disabled={isControlled}
          />
        ))}
      </div>

      {/* Save / Revoke actions */}
      {!isControlled && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-all ${
              saved
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {saved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          <button className="rounded-xl border border-red-100 px-4 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50">
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

export function PermissionsPanel({ seed }: { seed: SeedData }) {
  const activeRels = seed.relationships.filter(
    (r) => r.caretaker_id === seed.currentUser.id && (r.status === "active" || r.status === "pending")
  );

  return (
    <div className="px-5 pt-6 pb-8">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Permissions
      </h2>
      <p className="mt-1 mb-6 text-[14px] text-zinc-400" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        Control what data each dependent shares with you
      </p>

      <div className="space-y-4">
        {activeRels.map((rel, i) => {
          const patient = seed.profiles.find((p) => p.id === rel.patient_id);
          return (
            <RelationshipPermissions
              key={rel.id}
              rel={rel}
              patientName={patient?.display_name || "Unknown"}
              delay={i * 100}
            />
          );
        })}
      </div>
    </div>
  );
}

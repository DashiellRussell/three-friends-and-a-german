"use client";

import { useState } from "react";
import type { SeedData, SeedProfile } from "./seed-data";
import { Toggle } from "@/components/app/shared";

export function MockProfile({
  seed,
  profile,
  persona,
}: {
  seed: SeedData;
  profile: SeedProfile;
  persona: "patient" | "dependent";
}) {
  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(false);

  const displayName = profile.display_name;
  const initial = displayName.charAt(0).toUpperCase();

  const healthInfo = [
    { l: "Date of birth", v: profile.date_of_birth || "Not set" },
    { l: "Blood type", v: profile.blood_type || "Not set" },
    { l: "Conditions", v: profile.conditions.length ? profile.conditions.join(", ") : "None reported" },
    { l: "Allergies", v: profile.allergies.length ? profile.allergies.join(", ") : "None reported" },
    { l: "Emergency contact", v: profile.emergency_contact ? `${profile.emergency_contact.name} — ${profile.emergency_contact.phone}` : "Not set" },
  ];

  const preferences = [
    { l: "Check-in time", v: profile.checkin_time || "8:00 AM" },
    { l: "Frequency", v: "Daily" },
    { l: "Voice", v: profile.voice_pref || "Sarah (calm)" },
    { l: "Language", v: profile.language === "en" ? "English" : profile.language },
  ];

  // Caretakers for this profile
  const myCaretakers = seed.relationships.filter(
    (r) => r.patient_id === profile.id && r.status === "active"
  );

  // If dependent, show claim account section
  const canClaim = persona === "dependent" && !profile.account_claimed;

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="mb-8 text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Settings
      </h2>

      {/* User card */}
      <div className="mb-7 flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-zinc-900">{displayName}</div>
          <div className="mt-0.5 text-[13px] text-zinc-400">{profile.email}</div>
          {!profile.account_claimed && (
            <span className="mt-1 inline-block rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
              Account not claimed
            </span>
          )}
        </div>
        <button className="shrink-0 rounded-xl border border-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:border-zinc-200 hover:text-zinc-700">
          Edit
        </button>
      </div>

      {/* Claim account (for dependents) */}
      {canClaim && (
        <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.1s both" }}>
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[14px] font-semibold text-violet-900">Claim your account</span>
            </div>
            <p className="text-[12px] text-violet-700/80 leading-relaxed mb-3">
              Your account was set up by a caretaker. Claim it to take control of your permissions and manage who can see your health data.
            </p>
            <button className="w-full rounded-xl bg-violet-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98]">
              Claim Account
            </button>
          </div>
        </div>
      )}

      {/* Caretakers (for dependents and patients who have them) */}
      {myCaretakers.length > 0 && (
        <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.12s both" }}>
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            My Caretakers
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
            {myCaretakers.map((rel, i) => {
              const caretaker = seed.profiles.find((p) => p.id === rel.caretaker_id)!;
              const permCount = Object.values(rel.permissions).filter(Boolean).length;
              return (
                <div
                  key={rel.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < myCaretakers.length - 1 ? "border-b border-zinc-50" : ""}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[13px] font-semibold text-violet-600">
                    {caretaker.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-zinc-900">{caretaker.display_name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="capitalize">{rel.level}</span>
                      <span className="text-zinc-200">&middot;</span>
                      <span>{permCount} permissions</span>
                      <span className="text-zinc-200">&middot;</span>
                      <span className={rel.managed_by === "patient" ? "text-emerald-600" : "text-amber-600"}>
                        {rel.managed_by === "patient" ? "You control" : "They control"}
                      </span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Profile */}
      <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.15s both" }}>
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Health Profile</div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {healthInfo.map((item, i) => (
            <div key={item.l} className={`flex justify-between px-4 py-3 ${i < healthInfo.length - 1 ? "border-b border-zinc-50" : ""}`}>
              <span className="text-[13px] text-zinc-500">{item.l}</span>
              <span className="text-right text-[13px] font-medium text-zinc-900 max-w-[55%]">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.2s both" }}>
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Check-in Preferences</div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {preferences.map((item, i) => (
            <div key={item.l} className={`flex justify-between px-4 py-3 ${i < preferences.length - 1 ? "border-b border-zinc-50" : ""}`}>
              <span className="text-[13px] text-zinc-500">{item.l}</span>
              <span className="text-[13px] font-medium text-zinc-900">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.25s both" }}>
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Notifications</div>
        <div className="rounded-2xl border border-zinc-100 bg-white px-4">
          <Toggle on={n1} onToggle={() => setN1(!n1)} label="Check-in reminders" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n2} onToggle={() => setN2(!n2)} label="Health alerts" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n3} onToggle={() => setN3(!n3)} label="Weekly summary" />
        </div>
      </div>

      {/* Account */}
      <div className="mb-7" style={{ animation: "fadeUp 0.4s ease-out 0.3s both" }}>
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Account</div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {["Export all data", "Privacy & permissions", "Help & support"].map((label, i) => (
            <button key={label} className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 ${i < 2 ? "border-b border-zinc-50" : ""}`}>
              <span className="text-[13px] font-medium text-zinc-900">{label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center text-[11px] text-zinc-300">Tessera Health v0.1.0</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MockAppShell } from "./mock-app-shell";
import { OnboardingPreview } from "./onboarding-preview";
import { SEED } from "./seed-data";
import type { SeedProfile } from "./seed-data";

type Persona = "patient" | "caretaker" | "dependent";

const PERSONAS: { id: Persona; label: string; desc: string; profile: SeedProfile }[] = [
  { id: "patient", label: "Margaret", desc: "Patient (regular user)", profile: SEED.profiles[0] },
  { id: "caretaker", label: "Sarah", desc: "Caretaker (manages others)", profile: SEED.profiles[1] },
  { id: "dependent", label: "James", desc: "Dependent (being cared for)", profile: SEED.profiles[3] },
];

export default function UIPlayground() {
  const [persona, setPersona] = useState<Persona>("patient");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentPersona = PERSONAS.find((p) => p.id === persona)!;

  if (showOnboarding) {
    return <OnboardingPreview onBack={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Floating persona switcher */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-50">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all hover:bg-amber-100 active:scale-[0.97]"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-200 text-[10px] font-bold text-amber-800">
            {currentPersona.profile.display_name.charAt(0)}
          </div>
          <span className="text-[11px] font-semibold text-amber-800">
            {currentPersona.label}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#92400e"
            strokeWidth="3"
            strokeLinecap="round"
            className={`transition-transform ${pickerOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown */}
        {pickerOpen && (
          <div
            className="absolute left-0 top-full mt-1.5 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            style={{ animation: "fadeUp 0.2s ease-out both" }}
          >
            <div className="px-3 pt-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                View as
              </span>
            </div>
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPersona(p.id); setPickerOpen(false); }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 ${
                  persona === p.id ? "bg-zinc-50" : ""
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-white ${
                  persona === p.id ? "bg-zinc-900" : "bg-zinc-400"
                }`}>
                  {p.profile.display_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-900">{p.profile.display_name}</div>
                  <div className="text-[11px] text-zinc-400">{p.desc}</div>
                </div>
                {persona === p.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}

            <div className="border-t border-zinc-100 p-2">
              <button
                onClick={() => { setShowOnboarding(true); setPickerOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-violet-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-violet-700">Onboarding Flow</div>
                  <div className="text-[11px] text-violet-400">Preview the setup wizard</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close picker on outside click */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
      )}

      <MockAppShell seed={SEED} persona={persona} profile={currentPersona.profile} />
    </div>
  );
}

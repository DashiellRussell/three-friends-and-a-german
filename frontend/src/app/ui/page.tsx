"use client";

import { useState } from "react";
import { CaretakerDashboard } from "./caretaker-dashboard";
import { InviteFlow } from "./invite-flow";
import { PermissionsPanel } from "./permissions-panel";
import { DependentView } from "./dependent-view";
import { SEED } from "./seed-data";

type Tab = "dashboard" | "dependents" | "invites" | "permissions";

export default function UIPlayground() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    { id: "dependents", label: "Dependents", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "invites", label: "Invites", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { id: "permissions", label: "Permissions", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  ];

  return (
    <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white/80 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
            <span className="text-[10px]">UI</span>
          </div>
          <span className="text-[11px] font-medium text-amber-600">Playground</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">Tessera</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <CaretakerDashboard seed={SEED} onNavigate={setTab} />}
        {tab === "dependents" && <DependentView seed={SEED} />}
        {tab === "invites" && <InviteFlow seed={SEED} />}
        {tab === "permissions" && <PermissionsPanel seed={SEED} />}
      </div>

      {/* Bottom tab bar */}
      <div className="sticky bottom-0 z-30 flex shrink-0 items-center justify-around border-t border-zinc-100 bg-white/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 transition-colors ${
              tab === item.id ? "text-zinc-900" : "text-zinc-300"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            <span className={`text-[10px] ${tab === item.id ? "font-semibold" : "font-normal"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

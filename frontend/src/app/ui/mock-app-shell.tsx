"use client";

import { useState } from "react";
import type { SeedData, SeedProfile } from "./seed-data";
import { MockDashboard } from "./mock-dashboard";
import { MockLog } from "./mock-log";
import { MockTrends } from "./mock-trends";
import { MockProfile } from "./mock-profile";
import { CaretakerDashboard } from "./caretaker-dashboard";
import { DependentView } from "./dependent-view";
import { InviteFlow } from "./invite-flow";
import { PermissionsPanel } from "./permissions-panel";

type AppTab = "dashboard" | "log" | "trends" | "profile";
type CaretakerTab = "dashboard" | "dependents" | "invites" | "permissions";

const APP_TABS: { id: AppTab; label: string; d: string }[] = [
  { id: "dashboard", label: "Home", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { id: "log", label: "Log", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "trends", label: "Trends", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { id: "profile", label: "Profile", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const CARETAKER_TABS: { id: CaretakerTab; label: string; d: string }[] = [
  { id: "dashboard", label: "Overview", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { id: "dependents", label: "People", d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "invites", label: "Invites", d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "permissions", label: "Access", d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
];

export function MockAppShell({
  seed,
  persona,
  profile,
}: {
  seed: SeedData;
  persona: "patient" | "caretaker" | "dependent";
  profile: SeedProfile;
}) {
  const [appTab, setAppTab] = useState<AppTab>("dashboard");
  const [caretakerTab, setCaretakerTab] = useState<CaretakerTab>("dashboard");

  const isCaretaker = persona === "caretaker";
  const tabs = isCaretaker ? CARETAKER_TABS : APP_TABS;
  const currentTab = isCaretaker ? caretakerTab : appTab;

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white/80 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
        <div className="w-20" /> {/* Space for persona switcher */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">Tessera</span>
        </div>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isCaretaker ? (
          <>
            {caretakerTab === "dashboard" && <CaretakerDashboard seed={seed} onNavigate={setCaretakerTab} />}
            {caretakerTab === "dependents" && <DependentView seed={seed} />}
            {caretakerTab === "invites" && <InviteFlow seed={seed} />}
            {caretakerTab === "permissions" && <PermissionsPanel seed={seed} />}
          </>
        ) : (
          <>
            {appTab === "dashboard" && <MockDashboard seed={seed} profile={profile} persona={persona} />}
            {appTab === "log" && <MockLog seed={seed} profile={profile} />}
            {appTab === "trends" && <MockTrends seed={seed} profile={profile} />}
            {appTab === "profile" && <MockProfile seed={seed} profile={profile} persona={persona} />}
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="sticky bottom-0 z-30 flex shrink-0 items-center justify-around border-t border-zinc-100 bg-white/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        {!isCaretaker && (
          <div className="contents">
            {(APP_TABS.slice(0, 2)).map((item) => (
              <TabButton key={item.id} item={item} active={appTab === item.id} onClick={() => setAppTab(item.id)} />
            ))}
            {/* Center + button */}
            <button className="flex h-12 w-12 -translate-y-1.5 items-center justify-center rounded-full bg-zinc-900 shadow-lg shadow-zinc-900/10 transition-transform active:scale-95">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {(APP_TABS.slice(2)).map((item) => (
              <TabButton key={item.id} item={item} active={appTab === item.id} onClick={() => setAppTab(item.id)} />
            ))}
          </div>
        )}
        {isCaretaker && CARETAKER_TABS.map((item) => (
          <TabButton key={item.id} item={item} active={caretakerTab === item.id} onClick={() => setCaretakerTab(item.id as CaretakerTab)} />
        ))}
      </div>
    </>
  );
}

function TabButton({ item, active, onClick }: { item: { id: string; label: string; d: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3.5 py-1.5 transition-colors ${active ? "text-zinc-900" : "text-zinc-300"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={item.d} />
      </svg>
      <span className={`text-[10px] ${active ? "font-semibold" : "font-normal"}`}>{item.label}</span>
    </button>
  );
}

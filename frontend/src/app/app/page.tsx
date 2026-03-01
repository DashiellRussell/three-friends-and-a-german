"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Dashboard } from "@/components/app/Dashboard";
import { Log } from "@/components/app/log";
import { Trends } from "@/components/app/trends";
import { Profile } from "@/components/app/profile";
import { InputOverlay } from "@/components/app/input-overlay";
import { NewEntryPopup } from "@/components/app/new-entry-popup";

type Tab = "dashboard" | "log" | "trends" | "profile";

const NAV_ITEMS: { id: Tab | "input"; label: string; d: string }[] = [
  {
    id: "dashboard",
    label: "Home",
    d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
  },
  {
    id: "log",
    label: "Log",
    d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  { id: "input", label: "", d: "" },
  {
    id: "trends",
    label: "Trends",
    d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    id: "profile",
    label: "Profile",
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

export default function AppPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [targetCheckinId, setTargetCheckinId] = useState<string | null>(null);
  const [logSubTab, setLogSubTab] = useState<"log" | "files" | "reports" | undefined>(undefined);
  const [inputOpen, setInputOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [callMode, setCallMode] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (user && user.onboarding_completed === false) {
      router.push("/onboarding");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#fafafa]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white/80 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
        <div className="w-12" />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            Tessera
          </span>
        </div>
        <div className="w-12" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <Dashboard goTo={(t, checkinId) => { setTab(t as Tab); setTargetCheckinId(checkinId ?? null); }} />}
        {tab === "log" && <Log targetCheckinId={targetCheckinId} onTargetConsumed={() => setTargetCheckinId(null)} initialSubTab={logSubTab} />}
        {tab === "trends" && <Trends />}
        {tab === "profile" && <Profile />}
      </div>

      {/* Bottom tab bar */}
      <div className="sticky bottom-0 z-30 flex shrink-0 items-center justify-around border-t border-zinc-100 bg-white/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        {NAV_ITEMS.map((item) =>
          item.id === "input" ? (
            <button
              key="input"
              onClick={() => setInputOpen(true)}
              className="flex h-12 w-12 -translate-y-1.5 items-center justify-center rounded-full bg-zinc-900 shadow-lg shadow-zinc-900/10 transition-transform active:scale-95"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          ) : (
            <button
              key={item.id}
              onClick={() => setTab(item.id as Tab)}
              className={`flex flex-col items-center gap-1 px-3.5 py-1.5 transition-colors ${
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
                <path d={item.d} />
              </svg>
              <span
                className={`text-[10px] ${tab === item.id ? "font-semibold" : "font-normal"}`}
              >
                {item.label}
              </span>
            </button>
          ),
        )}
      </div>

      {/* Input overlay — voice/call/chat/upload mode or new entry popup */}
      {inputOpen && (voiceMode || callMode || chatMode || uploadMode) && (
        <InputOverlay
          onClose={() => { setInputOpen(false); setVoiceMode(false); setCallMode(false); setChatMode(false); setUploadMode(false); }}
          startInVoiceMode={voiceMode}
          startInCallMode={callMode}
          startInChatMode={chatMode}
          startInUploadMode={uploadMode}
          onNavigate={(navTab, subTab) => {
            setTab(navTab as Tab);
            if (navTab === "log" && subTab) setLogSubTab(subTab as "log" | "files" | "reports");
          }}
        />
      )}
      {inputOpen && !voiceMode && !callMode && !chatMode && !uploadMode && (
        <NewEntryPopup
          onClose={() => setInputOpen(false)}
          onVoice={() => { setVoiceMode(true); setInputOpen(true); }}
          onCallMe={() => { setCallMode(true); setInputOpen(true); }}
          onChat={() => { setChatMode(true); setInputOpen(true); }}
          onUpload={() => { setUploadMode(true); setInputOpen(true); }}
        />
      )}
    </div>
  );
}

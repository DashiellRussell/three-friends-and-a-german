"use client";

import { useState, useEffect } from "react";
import { CHECKINS } from "@/lib/mock-data";
import { useUser } from "@/lib/user-context";
import { Pill, Sparkline } from "./shared";
import { ActivityGrid } from "./activity-grid";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Dashboard({ goTo, onStartVoice }: { goTo: (tab: string) => void; onStartVoice?: () => void }) {
  const { user } = useUser();
  const firstName = user?.display_name?.split(" ")[0] || "there";

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    console.log(BACKEND_URL);
    fetch(`${BACKEND_URL}/api/dashboard`, {
      headers: {
        "x-user-id": user.id
      }
    })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user?.id]);

  const last7 = data?.last7?.length ? data.last7 : CHECKINS.slice(0, 7).reverse();
  const streak = data?.streak ?? 4;
  const energy = data?.energy_avg ?? 6.5;
  const adherence = data?.adherence ?? 87;



  const latest = data?.latest_entry || {
    summary: "Error loading latest entry",
    timeLabel: "Error loading latest entry",
    symptom_count: 2
  };

  return (
    <div className="px-5 pt-8 pb-25">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {formatDate()}
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-zinc-900 leading-tight">
          {getGreeting()}, {firstName}
        </h1>
      </div>

      {/* Daily check-in CTA */}
      <button
        onClick={onStartVoice}
        className="mb-6 flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-left transition-all hover:bg-zinc-800 active:scale-[0.99]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-white">Start daily check-in</div>
          <div className="mt-0.5 text-xs text-white/50">~2 min voice conversation with Kira</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>



      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { l: "Streak", v: streak.toString(), u: "days" },
          { l: "Energy", v: energy.toString(), u: "avg" },
          { l: "Adherence", v: adherence.toString(), u: "%" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-2xl border border-zinc-100 bg-white p-3.5 transition-all hover:border-zinc-200 hover:shadow-sm"
          >
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              {s.l}
            </div>
            {isLoading ? (
              <div className="flex h-[28px] items-end pb-0.5">
                <div className="h-6 w-10 animate-pulse rounded bg-zinc-200/80" />
                <div className="ml-1.5 h-3 w-6 animate-pulse rounded bg-zinc-200/80" />
              </div>
            ) : (
              <div className="text-2xl font-semibold leading-none tracking-tight text-zinc-900">
                {s.v}
                <span className="ml-0.5 text-[11px] font-normal text-zinc-300">
                  {s.u}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Energy sparkline */}
      <div className="mb-4 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900">
            Energy
          </span>
          <button
            onClick={() => goTo("trends")}
            className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
          >
            See trends →
          </button>
        </div>
        {isLoading ? (
          <div className="h-[60px] w-full animate-pulse rounded-xl bg-zinc-200/60" />
        ) : (
          <Sparkline
            data={last7.map((c: any) => c.energy)}
            labels={last7.map((c: any) => c.date.includes(" ") ? c.date.split(" ").pop() : c.date)}
            color="#18181b"
            fill
            highlight={last7.length - 1}
          />
        )}
      </div>

      {/* Latest entry */}
      <button
        onClick={() => goTo("log")}
        className="w-full rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
      >
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Latest
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium text-zinc-900 capitalize">
              {latest.summary}
            </div>
            <div className="mt-1 text-[12px] text-zinc-400">
              {latest.timeLabel} {latest.mood ? `· Mood: ${latest.mood}` : ''}
            </div>
          </div>
          {latest.symptom_count > 0 && <Pill>{latest.symptom_count} symptoms</Pill>}
        </div>
      </button>

      {/* Activity Grid */}
      <ActivityGrid userId={user?.id || ""} />
    </div>
  );
}

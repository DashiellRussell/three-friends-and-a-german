"use client";

import { useState, useEffect } from "react";
import { CHECKINS } from "@/lib/mock-data";
import { useUser } from "@/lib/user-context";
import { Pill, Sparkline } from "./shared";
import { ActivityGrid } from "./activity-grid";

import { SymptomGraph } from "./symptom-graph";

interface CriticalAlert {
  id: string;
  name: string;
  severity: number;
  created_at: string;
  check_in_id: string | null;
}

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

export function Dashboard({
  goTo,
}: {
  goTo: (tab: string, checkinId?: string) => void;
}) {
  const { user } = useUser();
  const firstName = user?.display_name?.split(" ")[0] || "there";
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    if (!user) return;
    fetch(`${backendUrl}/api/symptoms/alerts`, {
      headers: { "x-user-id": user.id },
    })
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(console.error);
  }, [user, backendUrl]);

  function dismiss(id: string) {
    fetch(`${backendUrl}/api/symptoms/${id}/dismiss`, {
      method: "PATCH",
      headers: { "x-user-id": user!.id },
    })
      .then(() => setAlerts((prev) => prev.filter((a) => a.id !== id)))
      .catch(console.error);
  }

  function undismissAll() {
    fetch(`${backendUrl}/api/symptoms/undismiss-critical`, {
      method: "POST",
      headers: { "x-user-id": user!.id },
    })
      .then(() =>
        fetch(`${backendUrl}/api/symptoms/alerts`, {
          headers: { "x-user-id": user!.id },
        })
          .then((res) => res.json())
          .then((data) => setAlerts(data.alerts || [])),
      )
      .catch(console.error);
  }

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    console.log(BACKEND_URL);
    fetch(`${BACKEND_URL}/api/dashboard`, {
      headers: {
        "x-user-id": user.id,
      },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user?.id]);

  const last7 = data?.last7?.length
    ? data.last7
    : CHECKINS.slice(0, 7).reverse();
  const streak = data?.streak ?? 4;
  const energy = data?.energy_avg ?? 6.5;
  const adherence = data?.adherence ?? 87;

  const latest = data?.latest_entry || {
    summary: "Error loading latest entry",
    timeLabel: "Error loading latest entry",
    symptom_count: 2,
  };

  return (
    <div className="px-5 pt-8 pb-25">
      {/* Greeting */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {formatDate()}
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-zinc-900 leading-tight">
            {getGreeting()}, {firstName}
          </h1>
        </div>

        {/* Alert bell */}
        <button
          onClick={() => setPanelOpen(true)}
          className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="15" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Critical alerts panel */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setPanelOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-107.5 rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-xl"
            style={{ animation: "slideUp 0.25s" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-zinc-900">
                  Critical Alerts
                </h3>
                <p className="text-[12px] text-zinc-400">
                  {alerts.length} active
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400">
                No critical alerts
              </div>
            ) : (
              <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-3.5"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (alert.check_in_id) {
                          setPanelOpen(false);
                          goTo("log", alert.check_in_id);
                        }
                      }}
                      disabled={!alert.check_in_id}
                    >
                      <div className="text-[13px] font-medium text-zinc-900">
                        {alert.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        Severity {alert.severity}/10 ·{" "}
                        {new Date(alert.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                        {alert.check_in_id && (
                          <span className="ml-1 text-zinc-300">
                            · View check-in →
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="shrink-0 text-[11px] font-medium text-zinc-400 hover:text-zinc-600"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] text-zinc-300">
                Not medical advice. Always consult a healthcare professional.
              </p>
              <button
                onClick={undismissAll}
                className="shrink-0 text-[10px] font-medium text-zinc-400 underline hover:text-zinc-600"
              >
                Reset for testing
              </button>
            </div>
          </div>
        </>
      )}

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
            labels={last7.map((c: any) =>
              c.date.includes(" ") ? c.date.split(" ").pop() : c.date,
            )}
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
              {latest.timeLabel} {latest.mood ? `· Mood: ${latest.mood}` : ""}
            </div>
          </div>
          {latest.symptom_count > 0 && (
            <Pill>{latest.symptom_count} symptoms</Pill>
          )}
        </div>
      </button>

      {/* Activity Grid */}
      <ActivityGrid userId={user?.id || ""} />

      {/* Symptom graph */}
      <SymptomGraph />
    </div>
  );
}

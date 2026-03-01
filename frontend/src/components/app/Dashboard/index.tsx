"use client";

import { useState, useEffect } from "react";

import { useUser } from "@/lib/user-context";
import { apiFetch } from "@/lib/api";
import { ActivityGrid } from "../activity-grid";
import { SymptomGraph } from "../symptom-graph";

import { DashboardHeader } from "./DashboardHeader";
import { AlertsPanel } from "./AlertsPanel";
import { StatCards } from "./StatCards";
import { LatestEntry } from "./LatestEntry";
import { CriticalAlert, DashboardData } from "./types";

export function Dashboard({
  goTo,
}: {
  goTo: (tab: string, checkinId?: string) => void;
}) {
  const { user } = useUser();
  const firstName = user?.display_name?.split(" ")[0] || "there";

  // Alerts state
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  // Dashboard data state
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch critical alerts
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/symptoms/alerts")
      .then((res) => {
        if (!res.ok) throw new Error(`Alerts fetch failed (${res.status})`);
        return res.json();
      })
      .then((body) => setAlerts(body.alerts || []))
      .catch(console.error);
  }, [user]);

  // Fetch dashboard summary
  useEffect(() => {
    if (!user?.id) return;
    apiFetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Dashboard fetch failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user?.id]);

  function dismiss(id: string) {
    apiFetch(`/api/symptoms/${id}/dismiss`, {
      method: "PATCH",
    })
      .then(() => setAlerts((prev) => prev.filter((a) => a.id !== id)))
      .catch(console.error);
  }

  function undismissAll() {
    apiFetch("/api/symptoms/undismiss-critical", {
      method: "POST",
    })
      .then(() => apiFetch("/api/symptoms/alerts"))
      .then((res) => {
        if (!res.ok) throw new Error(`Alerts fetch failed (${res.status})`);
        return res.json();
      })
      .then((body) => setAlerts(body.alerts || []))
      .catch(console.error);
  }

  const last7 = data?.last7 ?? [];
  const streak = data?.streak ?? 0;
  const energy = data?.energy_avg ?? 0;
  const adherence = data?.adherence ?? 0;
  const latest = data?.latest_entry ?? null;

  return (
    <div className="px-5 pt-8 pb-25">
      <DashboardHeader
        firstName={firstName}
        alerts={alerts}
        onOpenAlerts={() => setPanelOpen(true)}
      />

      {panelOpen && (
        <AlertsPanel
          alerts={alerts}
          onClose={() => setPanelOpen(false)}
          onDismiss={dismiss}
          onUndismissAll={undismissAll}
          goTo={goTo}
        />
      )}

      <StatCards
        streak={streak}
        energy={energy}
        adherence={adherence}
        isLoading={isLoading}
      />

      <ActivityGrid userId={user?.id || ""} />

      {latest && <LatestEntry latest={latest} onClick={() => goTo("log")} />}

      <SymptomGraph />
    </div>
  );
}

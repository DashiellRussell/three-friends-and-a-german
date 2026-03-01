"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import { CheckIn, Report, Document } from "./types";
import {
  ReportConfig,
  GeneratingView,
  ReportSuccessView,
} from "./report-config";
import { LogTab } from "./log-tab";
import { FilesTab } from "./files-tab";
import { ReportsTab } from "./reports-tab";
import { CheckInDetail } from "./checkin-detail";

export function Log({
  targetCheckinId,
  onTargetConsumed,
  initialSubTab,
}: {
  targetCheckinId?: string | null;
  onTargetConsumed?: () => void;
  initialSubTab?: "log" | "files" | "reports";
}) {
  const { user } = useUser();
  const [tab, setTab] = useState<"log" | "files" | "reports">(
    initialSubTab || "log",
  );
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const [view, setView] = useState<
    "entries" | "report-config" | "generating" | "report"
  >("entries");
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

  // Sync subtab when navigated to from outside (e.g. after upload)
  useEffect(() => {
    if (initialSubTab) setTab(initialSubTab);
  }, [initialSubTab]);

  // Data states
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    if (!user) return;

    // Fetch user check-ins
    fetch(`${backendUrl}/api/checkin`, { headers: { "x-user-id": user.id } })
      .then((res) => res.json())
      .then((data) =>
        setCheckIns(Array.isArray(data) ? data : data.check_ins || []),
      )
      .catch(console.error);

    // Fetch user generated reports
    fetch(`${backendUrl}/api/reports`, { headers: { "x-user-id": user.id } })
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch(console.error);

    // Fetch user documents
    fetch(`${backendUrl}/api/documents`, { headers: { "x-user-id": user.id } })
      .then((res) => res.json())
      .then((data) =>
        setDocuments(Array.isArray(data) ? data : data.documents || []),
      )
      .catch(console.error);
  }, [user, view, backendUrl]);

  useEffect(() => {
    if (!targetCheckinId || checkIns.length === 0) return;
    const match = checkIns.find((c) => c.id === targetCheckinId);
    if (match) {
      setTab("log");
      setExpanded(match.id);
      onTargetConsumed?.();
      setTimeout(() => {
        document
          .getElementById(`checkin-${match.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [targetCheckinId, checkIns]);

  const toggle = (id: number | string) =>
    setExpanded(expanded === id ? null : id);

  const refetchDocuments = useCallback(() => {
    if (!user) return;
    fetch(`${backendUrl}/api/documents`, { headers: { "x-user-id": user.id } })
      .then((res) => res.json())
      .then((data) =>
        setDocuments(Array.isArray(data) ? data : data.documents || []),
      )
      .catch(console.error);
  }, [user, backendUrl]);

  // Detail view
  if (selectedCheckIn) {
    return (
      <CheckInDetail
        checkIn={selectedCheckIn}
        onBack={() => setSelectedCheckIn(null)}
      />
    );
  }

  if (view === "report-config") {
    return <ReportConfig setView={setView} userId={user?.id || ""} />;
  }

  if (view === "generating") {
    return <GeneratingView />;
  }

  if (view === "report") {
    return <ReportSuccessView setView={setView} />;
  }

  return (
    <div className="px-5 pt-8 pb-25">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            Health Data
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">Manage your history</p>
        </div>
        <button
          onClick={() => setView("report-config")}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-all hover:border-zinc-300 hover:shadow-sm"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Report
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-zinc-100">
        {(["log", "files", "reports"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 px-3 text-[13px] font-medium transition-colors border-b-2 ${
              tab === t
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "log" && (
        <LogTab
          checkIns={checkIns}
          expanded={expanded}
          toggle={toggle}
          onViewDetail={(c) => setSelectedCheckIn(c)}
        />
      )}
      {tab === "files" && (
        <FilesTab documents={documents} onDocumentsChanged={refetchDocuments} />
      )}
      {tab === "reports" && <ReportsTab reports={reports} />}
    </div>
  );
}

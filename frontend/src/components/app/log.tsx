"use client";

import { useState, useEffect } from "react";
import { CheckIn, Report, Document } from "./types";
import { ReportConfig, GeneratingView, ReportSuccessView } from "./report-config";
import { LogTab } from "./log-tab";
import { FilesTab } from "./files-tab";
import { ReportsTab } from "./reports-tab";

export function Log() {
  const [tab, setTab] = useState<"log" | "files" | "reports">("log");
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const [view, setView] = useState<"entries" | "report-config" | "generating" | "report">("entries");

  // Data states
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  // const [documents, setDocuments] = useState<Document[]>([]);

  const uuid = "51b5ade8-77df-4379-95f5-404685a44980";

  useEffect(() => {
    // Fetch user check-ins
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/checkins`, { headers: { uuid } })
      .then(res => res.json())
      .then(data => setCheckIns(data.check_ins || []))
      .catch(console.error);

    // Fetch user generated reports
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/reports`, { headers: { uuid } })
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(console.error);

    // Fetch user files / documents
    // fetch("http://localhost:3001/api/documents", { headers: { uuid } })
    //   .then(res => res.json())
    //   .then(data => setDocuments(data.documents || []))
    //   .catch(console.error);
  }, [view]);

  const toggle = (id: number | string) => setExpanded(expanded === id ? null : id);

  if (view === "report-config") {
    return <ReportConfig setView={setView} uuid={uuid} />;
  }

  if (view === "generating") {
    return <GeneratingView />;
  }

  if (view === "report") {
    return <ReportSuccessView setView={setView} />;
  }

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">Health Data</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Manage your history</p>
        </div>
        <button
          onClick={() => setView("report-config")}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-all hover:border-zinc-300 hover:shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          Report
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-zinc-100">
        {(["log", "files", "reports"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 px-3 text-[13px] font-medium transition-colors border-b-2 ${tab === t
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200"
              }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "log" && <LogTab checkIns={checkIns} expanded={expanded} toggle={toggle} />}
      {tab === "files" && <FilesTab />}
      {tab === "reports" && <ReportsTab reports={reports} />}
    </div>
  );
}

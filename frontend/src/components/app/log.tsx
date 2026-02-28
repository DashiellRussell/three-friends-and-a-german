"use client";

import { useState, useMemo, useEffect } from "react";
import { Pill, Chevron, Bar, Toggle, SegmentedControl } from "./shared";

// Types
interface CheckIn {
  id: string;
  created_at: string;
  mood: string;
  energy: number;
  sleep_hours: number;
  symptoms?: any[];
  notes: string;
  summary: string;
  flagged: boolean;
  flag_reason: string;
}

interface Report {
  id: string;
  created_at: string;
  date_from: string;
  date_to: string;
  detail_level: string;
  status: string;
  content_path: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  created_at: string;
}

export function Log() {
  const [tab, setTab] = useState<"log" | "files" | "reports">("log");
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const [view, setView] = useState<"entries" | "report-config" | "generating" | "report">("entries");

  const [reportRange, setReportRange] = useState("week");
  const [reportDetail, setReportDetail] = useState("summary");
  const [incCheckins, setIncCheckins] = useState(true);
  const [incDocs, setIncDocs] = useState(true);
  const [incMeds, setIncMeds] = useState(true);
  const [incSymptoms, setIncSymptoms] = useState(true);
  const [incTrends, setIncTrends] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  // const [documents, setDocuments] = useState<Document[]>([]);

  const uuid = "51b5ade8-77df-4379-95f5-404685a44980";

  useEffect(() => {
    // Fetch user check-ins
    fetch("http://localhost:3001/api/checkins", { headers: { uuid } })
      .then(res => res.json())
      .then(data => setCheckIns(data.check_ins || []))
      .catch(console.error);

    // Fetch user generated reports
    fetch("http://localhost:3001/api/reports", { headers: { uuid } })
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

  const handleGen = async () => {
    setView("generating");
    setError(null);
    try {
      const params = new URLSearchParams({
        timeRange: reportRange,
        detailLevel: reportDetail,
        checkins: String(incCheckins),
        docs: String(incDocs),
        meds: String(incMeds),
        symptoms: String(incSymptoms),
        trends: String(incTrends),
      });

      const response = await fetch(`http://localhost:3001/api/reports/generate?${params.toString()}`, {
        method: "GET",
        headers: { uuid },
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setView("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setView("report-config");
    }
  };

  const { rangeLabels, rangeDateLabels } = useMemo<{
    rangeLabels: Record<string, string>;
    rangeDateLabels: Record<string, string>;
  }>(() => {
    const today = new Date();

    const formatLabelStr = (past: Date) => {
      const sameMonth = past.getMonth() === today.getMonth() && past.getFullYear() === today.getFullYear();
      const startMonth = past.toLocaleDateString("en-US", { month: "short" });
      const startDay = past.getDate();
      const endMonth = today.toLocaleDateString("en-US", { month: "short" });
      const endDay = today.getDate();

      if (sameMonth) return `${startMonth} ${startDay}–${endDay}`;
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
    };

    const formatRangeDateStr = (past: Date) => {
      const sameMonth = past.getMonth() === today.getMonth() && past.getFullYear() === today.getFullYear();
      const startMonth = past.toLocaleDateString("en-US", { month: "short" });
      const startDay = past.getDate();
      const endMonth = today.toLocaleDateString("en-US", { month: "short" });
      const endDay = today.getDate();

      if (sameMonth) return `${startDay}–${endDay} ${endMonth}`;
      return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
    };

    const d3 = new Date(today); d3.setDate(d3.getDate() - 3);
    const dWeek = new Date(today); dWeek.setDate(dWeek.getDate() - 7);
    const dMonth = new Date(today); dMonth.setMonth(dMonth.getMonth() - 1);
    const d6Months = new Date(today); d6Months.setMonth(d6Months.getMonth() - 6);

    return {
      rangeLabels: {
        "3days": `${formatLabelStr(d3)} · 3 check-ins`,
        week: `${formatLabelStr(dWeek)} · 7 check-ins, 1 doc`,
        month: `${formatLabelStr(dMonth)} · 24 check-ins, 3 docs`,
        "6months": `${formatLabelStr(d6Months)} · 142 check-ins, 18 docs`,
      },
      rangeDateLabels: {
        "3days": formatRangeDateStr(d3),
        week: formatRangeDateStr(dWeek),
        month: formatRangeDateStr(dMonth),
        "6months": formatRangeDateStr(d6Months),
      },
    };
  }, []);

  const detailLabels: Record<string, string> = {
    brief: "Key findings only",
    summary: "Findings + discussion points",
    detailed: "Full daily breakdown",
  };

  if (view === "report-config") {
    return (
      <div className="px-5 pt-8 pb-[100px]">
        <div className="mb-8 flex items-center gap-3">
          <button onClick={() => setView("entries")} className="text-zinc-400 transition-colors hover:text-zinc-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">Generate Report</h2>
        </div>

        <div className="mb-6">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Time Range</div>
          <SegmentedControl
            value={reportRange}
            onChange={setReportRange}
            options={[
              { value: "3days", label: "3 Days" },
              { value: "week", label: "1 Week" },
              { value: "month", label: "1 Month" },
              { value: "6months", label: "6 Months" },
            ]}
          />
          <div className="mt-2 text-[11px] text-zinc-400">{rangeLabels[reportRange]}</div>
        </div>

        <div className="mb-6">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Detail Level</div>
          <SegmentedControl
            value={reportDetail}
            onChange={setReportDetail}
            options={[
              { value: "brief", label: "Brief" },
              { value: "summary", label: "Summary" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
          <div className="mt-2 text-[11px] text-zinc-400">{detailLabels[reportDetail]}</div>
        </div>

        <div className="mb-8">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Include</div>
          <div className="rounded-2xl border border-zinc-100 bg-white px-4">
            <Toggle on={incCheckins} onToggle={() => setIncCheckins(!incCheckins)} label="Check-in summaries" />
            <div className="h-px bg-zinc-50" />
            <Toggle on={incDocs} onToggle={() => setIncDocs(!incDocs)} label="Lab results & documents" />
            <div className="h-px bg-zinc-50" />
            <Toggle on={incMeds} onToggle={() => setIncMeds(!incMeds)} label="Medication adherence" />
            <div className="h-px bg-zinc-50" />
            <Toggle on={incSymptoms} onToggle={() => setIncSymptoms(!incSymptoms)} label="Symptom tracking" />
            <div className="h-px bg-zinc-50" />
            <Toggle on={incTrends} onToggle={() => setIncTrends(!incTrends)} label="Trend analysis" />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <button
          onClick={handleGen}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-zinc-900 py-4 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.99]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          Generate Report
        </button>
      </div>
    );
  }

  if (view === "generating") {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
        <span className="text-sm text-zinc-400">Generating report…</span>
      </div>
    );
  }

  if (view === "report") {
    return (
      <div className="px-5 pt-8 pb-[100px]" style={{ animation: "fadeUp 0.3s ease" }}>
        <div className="mb-1.5 flex items-center gap-3">
          <button onClick={() => setView("entries")} className="text-zinc-400 transition-colors hover:text-zinc-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-[22px] font-semibold text-zinc-900">Doctor Report</h2>
        </div>
        <p className="mb-6 pl-8 text-xs text-zinc-400">{rangeDateLabels[reportRange]} · {reportDetail}</p>

        <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white py-12 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-zinc-900">PDF exported successfully!</h3>
          <p className="px-6 text-sm leading-relaxed text-zinc-500">
            Your comprehensive health report for the selected period has been generated and saved.
          </p>
        </div>
        <button onClick={() => setView("report-config")} className="w-full rounded-2xl bg-zinc-100 py-3 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200">Regenerate</button>
        <p className="mt-4 text-[10px] leading-relaxed text-zinc-300">AI-generated. Does not constitute medical advice.</p>
      </div>
    );
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

      {tab === "log" && (
        <div className="flex flex-col gap-2.5">
          {checkIns.length === 0 && (
            <div className="text-center py-10 text-sm text-zinc-400">No entries recorded yet.</div>
          )}
          {checkIns.map((c) => {
            const date = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const time = new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`w-full rounded-2xl bg-white p-4 text-left transition-all hover:shadow-sm ${c.flagged ? "border border-amber-200/80 hover:border-amber-300" : "border border-zinc-100 hover:border-zinc-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${c.flagged ? "bg-amber-50" : "bg-zinc-50"}`}>
                      {c.mood === "Great" || c.mood === "Good" ? "😊" : "😐"}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-zinc-900">
                        {date} · {c.mood ? c.mood.charAt(0).toUpperCase() + c.mood.slice(1) : "Neutral"}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {time} · E {c.energy || 0} · {c.sleep_hours || 0}h
                      </div>
                    </div>
                  </div>
                  <Chevron open={expanded === c.id} />
                </div>

                {expanded === c.id && (
                  <div className="mt-4 border-t border-zinc-50 pt-3" style={{ animation: "fadeUp 0.2s" }}>
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-1.5 text-[10px] font-medium text-zinc-400">Energy</div>
                        <Bar value={c.energy || 0} />
                      </div>
                      <div>
                        <div className="mb-1.5 text-[10px] font-medium text-zinc-400">Symptoms</div>
                        <div className={`text-xs font-medium ${c.symptoms && c.symptoms.length ? "text-red-500" : "text-emerald-500"}`}>
                          {c.symptoms && c.symptoms.length ? c.symptoms.map(s => s.name).join(", ") : "None"}
                        </div>
                      </div>
                    </div>
                    {(c.summary || c.notes) && (
                      <p className="mt-2 text-xs italic leading-relaxed text-zinc-500">
                        &ldquo;{c.summary || c.notes}&rdquo;
                      </p>
                    )}
                    {c.flagged && c.flag_reason && (
                      <div className="mt-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 px-3 py-2 text-[11px] font-medium text-amber-700">
                        ⚠ {c.flag_reason}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "files" && (
        <div className="flex flex-col gap-2.5">
          {/*
          {documents.map(d => (
            <div key={d.id} className="w-full flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-zinc-900">{d.file_name}</div>
                  <div className="text-[11px] text-zinc-400">{new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {d.document_type}</div>
                </div>
              </div>
            </div>
          ))}
          */}
          <div className="text-center py-10 text-sm text-zinc-400">File storage bucket isn't mounted yet!</div>
        </div>
      )}

      {tab === "reports" && (
        <div className="flex flex-col gap-2.5">
          {reports.length === 0 && (
            <div className="text-center py-10 text-sm text-zinc-400">No reports generated yet.</div>
          )}
          {reports.map((r) => {
            const dateStr = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const rangeStr = `${new Date(r.date_from).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(r.date_to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
            const labelStr = r.detail_level.charAt(0).toUpperCase() + r.detail_level.slice(1);
            const downloadUrl = `https://vfrvrmolhvgwhxphnbgp.supabase.co/storage/v1/object/public/reports/${r.content_path}`;

            return (
              <div key={r.id} className="w-full rounded-2xl border border-zinc-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-zinc-900">Health Report · {labelStr}</div>
                      <div className="text-[11px] text-zinc-400">Generated {dateStr} ({rangeStr})</div>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(downloadUrl, "_blank")}
                    className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

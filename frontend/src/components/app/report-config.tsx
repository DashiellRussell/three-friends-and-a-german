"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Toggle, SegmentedControl } from "./shared";

interface ReportConfigProps {
  setView: (v: "entries" | "report-config" | "generating" | "report") => void;
}

export function ReportConfig({ setView }: ReportConfigProps) {
  const [reportRange, setReportRange] = useState("week");
  const [reportDetail, setReportDetail] = useState("summary");
  const [incCheckins, setIncCheckins] = useState(true);
  const [incDocs, setIncDocs] = useState(true);
  const [incMeds, setIncMeds] = useState(true);
  const [incSymptoms, setIncSymptoms] = useState(true);
  const [incTrends, setIncTrends] = useState(true);
  const [reportContext, setReportContext] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        ...(reportContext.trim() && { context: reportContext.trim() }),
      });

      const response = await apiFetch(
        `/api/reports/generate?${params.toString()}`,
      );

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

  const { rangeLabels } = useMemo<{
    rangeLabels: Record<string, string>;
  }>(() => {
    const today = new Date();

    const formatLabelStr = (past: Date) => {
      const sameMonth =
        past.getMonth() === today.getMonth() &&
        past.getFullYear() === today.getFullYear();
      const startMonth = past.toLocaleDateString("en-US", { month: "short" });
      const startDay = past.getDate();
      const endMonth = today.toLocaleDateString("en-US", { month: "short" });
      const endDay = today.getDate();

      if (sameMonth) return `${startMonth} ${startDay}–${endDay}`;
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
    };

    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 3);
    const dWeek = new Date(today);
    dWeek.setDate(dWeek.getDate() - 7);
    const dMonth = new Date(today);
    dMonth.setMonth(dMonth.getMonth() - 1);
    const d6Months = new Date(today);
    d6Months.setMonth(d6Months.getMonth() - 6);

    return {
      rangeLabels: {
        "3days": `${formatLabelStr(d3)} · 3 check-ins`,
        week: `${formatLabelStr(dWeek)} · 7 check-ins, 1 doc`,
        month: `${formatLabelStr(dMonth)} · 24 check-ins, 3 docs`,
        "6months": `${formatLabelStr(d6Months)} · 142 check-ins, 18 docs`,
      },
    };
  }, []);

  const detailLabels: Record<string, string> = {
    brief: "Key findings only",
    summary: "Findings + discussion points",
    detailed: "Full daily breakdown",
  };

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => setView("entries")}
          className="text-zinc-400 transition-colors hover:text-zinc-600"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          Generate Report
        </h2>
      </div>

      <div className="mb-6">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Time Range
        </div>
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
        <div className="mt-2 text-[11px] text-zinc-400">
          {rangeLabels[reportRange]}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Detail Level
        </div>
        <SegmentedControl
          value={reportDetail}
          onChange={setReportDetail}
          options={[
            { value: "brief", label: "Brief" },
            { value: "summary", label: "Summary" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
        <div className="mt-2 text-[11px] text-zinc-400">
          {detailLabels[reportDetail]}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Include
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white px-4">
          <Toggle
            on={incCheckins}
            onToggle={() => setIncCheckins(!incCheckins)}
            label="Check-in summaries"
          />
          <div className="h-px bg-zinc-50" />
          <Toggle
            on={incDocs}
            onToggle={() => setIncDocs(!incDocs)}
            label="Lab results & documents"
          />
          <div className="h-px bg-zinc-50" />
          <Toggle
            on={incMeds}
            onToggle={() => setIncMeds(!incMeds)}
            label="Medication adherence"
          />
          <div className="h-px bg-zinc-50" />
          <Toggle
            on={incSymptoms}
            onToggle={() => setIncSymptoms(!incSymptoms)}
            label="Symptom tracking"
          />
          <div className="h-px bg-zinc-50" />
          <Toggle
            on={incTrends}
            onToggle={() => setIncTrends(!incTrends)}
            label="Trend analysis"
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          For (optional)
        </div>
        <textarea
          value={reportContext}
          onChange={(e) => setReportContext(e.target.value)}
          placeholder="e.g. Annual GP check-up, cardiologist referral, specialist review…"
          rows={3}
          className="w-full resize-none rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-300 focus:outline-none transition-colors"
        />
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Generate Report
      </button>
    </div>
  );
}

export function GeneratingView() {
  return (
    <div className="flex h-[75vh] flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
      <span className="text-sm text-zinc-400">Generating report…</span>
    </div>
  );
}

export function ReportSuccessView({
  setView,
}: {
  setView: (v: "entries" | "report-config" | "generating" | "report") => void;
}) {
  return (
    <div
      className="px-5 pt-8 pb-[100px]"
      style={{ animation: "fadeUp 0.3s ease" }}
    >
      <div className="mb-1.5 flex items-center gap-3">
        <button
          onClick={() => setView("entries")}
          className="text-zinc-400 transition-colors hover:text-zinc-600"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-[22px] font-semibold text-zinc-900">
          Doctor Report
        </h2>
      </div>
      <p className="mb-6 pl-8 text-xs text-zinc-400">
        Report details are inside the generated PDF document.
      </p>

      <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white py-12 text-center shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-zinc-900">
          PDF exported successfully!
        </h3>
        <p className="px-6 text-sm leading-relaxed text-zinc-500">
          Your comprehensive health report for the selected period has been
          generated and saved.
        </p>
      </div>
      <button
        onClick={() => setView("report-config")}
        className="w-full rounded-2xl bg-zinc-100 py-3 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200"
      >
        Regenerate
      </button>
      <p className="mt-4 text-[10px] leading-relaxed text-zinc-300">
        AI-generated. Does not constitute medical advice.
      </p>
    </div>
  );
}

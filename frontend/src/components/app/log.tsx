"use client";

import { useState, useMemo } from "react";
import axios from "axios";
import {
  CHECKINS,
  LAB_RESULTS,
  REPORT_DATA,
  statusVariant,
} from "@/lib/mock-data";
import { Pill, Chevron, Bar, Toggle, SegmentedControl } from "./shared";

export function Log() {
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const [view, setView] = useState<
    "entries" | "report-config" | "generating" | "report"
  >("entries");
  const [reportRange, setReportRange] = useState("week");
  const [reportDetail, setReportDetail] = useState("summary");
  const [incCheckins, setIncCheckins] = useState(true);
  const [incDocs, setIncDocs] = useState(true);
  const [incMeds, setIncMeds] = useState(true);
  const [incSymptoms, setIncSymptoms] = useState(true);
  const [incTrends, setIncTrends] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number | string) =>
    setExpanded(expanded === id ? null : id);

  const handleGen = async () => {
    setView("generating");
    setError(null);
    try {
      await axios.post("/api/generate-report", {
        timeRange: reportRange,
        detailLevel: reportDetail,
        include: {
          checkins: incCheckins,
          docs: incDocs,
          meds: incMeds,
          symptoms: incSymptoms,
          trends: incTrends,
        },
      });

      setView("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setView("report-config"); // Or show an error state
    }
  };

  // Generate range labels and date labels based on the current date
  const { rangeLabels, rangeDateLabels } = useMemo<{
    rangeLabels: Record<string, string>;
    rangeDateLabels: Record<string, string>;
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

      if (sameMonth) {
        return `${startMonth} ${startDay}–${endDay}`;
      }
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
    };

    const formatRangeDateStr = (past: Date) => {
      const sameMonth =
        past.getMonth() === today.getMonth() &&
        past.getFullYear() === today.getFullYear();
      const startMonth = past.toLocaleDateString("en-US", { month: "short" });
      const startDay = past.getDate();
      const endMonth = today.toLocaleDateString("en-US", { month: "short" });
      const endDay = today.getDate();

      if (sameMonth) {
        return `${startDay}–${endDay} ${endMonth}`;
      }
      return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
    };

    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 2);
    const dWeek = new Date(today);
    dWeek.setDate(dWeek.getDate() - 6);
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

  // Report config
  if (view === "report-config") {
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

  // Generating
  if (view === "generating") {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
        <span className="text-sm text-zinc-400">Generating report…</span>
      </div>
    );
  }

  // Report
  if (view === "report") {
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
          {rangeDateLabels[reportRange]} · {reportDetail}
        </p>

        <div className="mb-5">
          <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Key Findings
          </div>
          {REPORT_DATA.findings.map((f, i) => (
            <div
              key={i}
              className={`mb-2 flex gap-3 rounded-2xl p-3.5 text-[13px] leading-relaxed ${
                i < 2
                  ? "border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 text-zinc-700"
                  : "border border-zinc-100 bg-white text-zinc-700"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 text-[10px] font-bold ${i < 2 ? "text-amber-600" : "text-zinc-300"}`}
              >
                {i + 1}
              </span>
              {f}
            </div>
          ))}
        </div>

        {reportDetail !== "brief" && (
          <div className="mb-5">
            <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              Discussion Points
            </div>
            {REPORT_DATA.actions.map((a, i) => (
              <div
                key={i}
                className="mb-2 flex gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-green-50/50 p-3.5 text-[13px] leading-relaxed text-emerald-800"
              >
                <span className="opacity-50">→</span>
                {a}
              </div>
            ))}
          </div>
        )}

        {reportDetail === "detailed" && (
          <div className="mb-5">
            <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              Daily Breakdown
            </div>
            {CHECKINS.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="mb-2 rounded-2xl border border-zinc-100 bg-white p-3.5 text-[13px] leading-relaxed text-zinc-700"
              >
                <div className="font-medium">
                  {c.date} · {c.time}
                </div>
                <div className="mt-0.5 text-zinc-500">
                  Mood: {c.mood} · Energy: {c.energy}/10 · Sleep: {c.sleep}h
                  {c.symptoms.length > 0 && ` · ${c.symptoms.join(", ")}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-2.5 flex gap-2.5">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-[13px] font-medium text-zinc-900 transition-all hover:border-zinc-300 hover:shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-[13px] font-medium text-zinc-900 transition-all hover:border-zinc-300 hover:shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
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

  // Entries list
  return (
    <div className="px-5 pt-8 pb-[100px]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            Log
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            7 check-ins · 1 document
          </p>
        </div>
        <button
          onClick={() => setView("report-config")}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-all hover:border-zinc-300 hover:shadow-sm"
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

      {/* Document */}
      <button
        onClick={() => toggle("doc")}
        className="mb-2.5 w-full rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-900">
                Blood test results
              </div>
              <div className="text-[11px] text-zinc-400">Feb 27 · 3:40 PM</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill variant="bad">flagged</Pill>
            <Chevron open={expanded === "doc"} />
          </div>
        </div>
        {expanded === "doc" && (
          <div
            className="mt-4 flex flex-col gap-1.5 border-t border-zinc-50 pt-3"
            style={{ animation: "fadeUp 0.2s" }}
          >
            {LAB_RESULTS.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-[13px] text-zinc-700">
                  <span className="font-medium">{r.metric}</span>{" "}
                  <span className="text-zinc-400">{r.value}</span>
                </span>
                <Pill variant={statusVariant(r.status)}>{r.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </button>

      {/* Check-ins */}
      {CHECKINS.slice(0, 4).map((c) => (
        <button
          key={c.id}
          onClick={() => toggle(c.id)}
          className={`mb-2.5 w-full rounded-2xl bg-white p-4 text-left transition-all hover:shadow-sm ${
            c.flagged
              ? "border border-amber-200/80 hover:border-amber-300"
              : "border border-zinc-100 hover:border-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${
                  c.flagged ? "bg-amber-50" : "bg-zinc-50"
                }`}
              >
                {c.mood === "Great" ? "😊" : c.mood === "Good" ? "🙂" : "😐"}
              </div>
              <div>
                <div className="text-[13px] font-medium text-zinc-900">
                  {c.date} · {c.mood}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {c.time} · E {c.energy} · {c.sleep}h
                </div>
              </div>
            </div>
            <Chevron open={expanded === c.id} />
          </div>

          {expanded === c.id && (
            <div
              className="mt-4 border-t border-zinc-50 pt-3"
              style={{ animation: "fadeUp 0.2s" }}
            >
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-[10px] font-medium text-zinc-400">
                    Energy
                  </div>
                  <Bar value={c.energy} />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-medium text-zinc-400">
                    Symptoms
                  </div>
                  <div
                    className={`text-xs font-medium ${c.symptoms.length ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {c.symptoms.length ? c.symptoms.join(", ") : "None"}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="mb-1.5 text-[10px] font-medium text-zinc-400">
                  Medications
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.meds.map((m, i) => (
                    <Pill key={i} variant={m.taken ? "good" : "bad"}>
                      {m.taken ? "✓" : "✗"} {m.name}
                    </Pill>
                  ))}
                </div>
              </div>
              {c.note && (
                <p className="text-xs italic leading-relaxed text-zinc-500">
                  &ldquo;{c.note}&rdquo;
                </p>
              )}
              {c.flagged && c.flag && (
                <div className="mt-2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 px-3 py-2 text-[11px] font-medium text-amber-700">
                  ⚠ {c.flag}
                </div>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Toggle, Pill } from "./shared";

interface Document {
  id: number;
  name: string;
  type: string;
  date: string;
  size: string;
  status: "processed" | "pending" | "failed";
}

const MOCK_DOCUMENTS: Document[] = [
  { id: 1, name: "Blood Work Results — Feb 2026", type: "Lab Report", date: "Feb 15, 2026", size: "1.2 MB", status: "processed" },
  { id: 2, name: "HbA1c Panel — Jan 2026", type: "Lab Report", date: "Jan 22, 2026", size: "0.8 MB", status: "processed" },
  { id: 3, name: "GP Visit Summary", type: "Clinical Note", date: "Jan 10, 2026", size: "0.4 MB", status: "processed" },
  { id: 4, name: "Prescription — Metformin", type: "Prescription", date: "Dec 5, 2025", size: "0.2 MB", status: "processed" },
  { id: 5, name: "Vitamin D Lab Panel", type: "Lab Report", date: "Nov 18, 2025", size: "0.6 MB", status: "pending" },
];

const DOC_ICONS: Record<string, string> = {
  "Lab Report": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  "Clinical Note": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  Prescription: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
};

export function Profile() {
  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(true);

  const healthInfo = [
    { l: "Date of birth", v: "15 Mar 1999" },
    { l: "Blood type", v: "O+" },
    { l: "Conditions", v: "Type 2 Diabetes" },
    { l: "Allergies", v: "None reported" },
    { l: "Emergency contact", v: "Mum — 0412 345 678" },
  ];

  const medications = [
    { n: "Metformin 500mg", s: "Once daily, with breakfast", active: true },
    { n: "Vitamin D 1000 IU", s: "Once daily", active: true },
  ];

  const preferences = [
    { l: "Check-in time", v: "8:00 AM" },
    { l: "Frequency", v: "Daily" },
    { l: "Voice", v: "Sarah (calm)" },
    { l: "Language", v: "English" },
  ];

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="mb-8 text-[22px] font-semibold tracking-tight text-zinc-900">
        Settings
      </h2>

      {/* User card */}
      <div className="mb-7 flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white">
          D
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-zinc-900">Dash</div>
          <div className="mt-0.5 text-[13px] text-zinc-400">dash@example.com</div>
        </div>
        <button className="shrink-0 rounded-xl border border-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:border-zinc-200 hover:text-zinc-700">
          Edit
        </button>
      </div>

      {/* Documents */}
      <div className="mb-7">
        <button
          onClick={() => setDocsExpanded(!docsExpanded)}
          className="mb-2.5 flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              Documents
            </span>
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
              {MOCK_DOCUMENTS.length}
            </span>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="2"
            strokeLinecap="round"
            className={`transition-transform duration-200 ${docsExpanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {docsExpanded && (
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
            {MOCK_DOCUMENTS.map((doc, i) => (
              <button
                key={doc.id}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                  i < MOCK_DOCUMENTS.length - 1 ? "border-b border-zinc-50" : ""
                }`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={DOC_ICONS[doc.type] || DOC_ICONS["Lab Report"]} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px] font-medium text-zinc-900">
                    {doc.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                    <span>{doc.type}</span>
                    <span className="text-zinc-200">·</span>
                    <span>{doc.date}</span>
                    <span className="text-zinc-200">·</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
                <div className="mt-1 shrink-0">
                  <Pill variant={doc.status === "processed" ? "good" : doc.status === "pending" ? "warn" : "bad"}>
                    {doc.status === "processed" ? "Analysed" : doc.status === "pending" ? "Pending" : "Failed"}
                  </Pill>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Health Profile */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Health Profile
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {healthInfo.map((item, i) => (
            <div
              key={item.l}
              className={`flex justify-between px-4 py-3 ${
                i < healthInfo.length - 1 ? "border-b border-zinc-50" : ""
              }`}
            >
              <span className="text-[13px] text-zinc-500">{item.l}</span>
              <span className="text-[13px] font-medium text-zinc-900">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Medications
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {medications.map((m, i) => (
            <div
              key={m.n}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < medications.length - 1 ? "border-b border-zinc-50" : ""
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-zinc-900">{m.n}</div>
                <div className="mt-0.5 text-[11px] text-zinc-400">{m.s}</div>
              </div>
              <Pill variant="good">Active</Pill>
            </div>
          ))}
        </div>
      </div>

      {/* Check-in Preferences */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Check-in Preferences
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {preferences.map((item, i) => (
            <div
              key={item.l}
              className={`flex justify-between px-4 py-3 ${
                i < preferences.length - 1 ? "border-b border-zinc-50" : ""
              }`}
            >
              <span className="text-[13px] text-zinc-500">{item.l}</span>
              <span className="text-[13px] font-medium text-zinc-900">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Notifications
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white px-4">
          <Toggle on={n1} onToggle={() => setN1(!n1)} label="Check-in reminders" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n2} onToggle={() => setN2(!n2)} label="Health alerts" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n3} onToggle={() => setN3(!n3)} label="Weekly summary" />
        </div>
      </div>

      {/* Account Actions */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Account
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          <button className="flex w-full items-center justify-between border-b border-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
            <span className="text-[13px] font-medium text-zinc-900">Export all data</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button className="flex w-full items-center justify-between border-b border-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
            <span className="text-[13px] font-medium text-zinc-900">Privacy & permissions</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-zinc-50">
            <span className="text-[13px] font-medium text-zinc-900">Help & support</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="overflow-hidden rounded-2xl border border-red-100 bg-white">
        <button className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-red-50/50">
          <span className="text-[13px] font-medium text-red-500">Delete all data</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Version */}
      <div className="mt-6 text-center text-[11px] text-zinc-300">
        Kira Health v0.1.0
      </div>
    </div>
  );
}

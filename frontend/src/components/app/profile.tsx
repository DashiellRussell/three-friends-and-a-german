"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import { Toggle, Pill, useToast } from "./shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  summary: string | null;
  flagged: boolean;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  lab_report: "Lab Report",
  prescription: "Prescription",
  imaging: "Imaging",
  discharge_summary: "Clinical Note",
  other: "Document",
};

const DOC_ICONS: Record<string, string> = {
  "Lab Report": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  "Clinical Note": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  Prescription: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
};

function formatEmergencyContact(ec: { name: string; phone: string; relationship: string } | null): string {
  if (!ec) return "Not set";
  return `${ec.name} — ${ec.phone}`;
}

export function Profile() {
  const { user, logout } = useUser();
  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const { show: showToast, ToastEl } = useToast();

  useEffect(() => {
    if (!user) return;
    setDocsLoading(true);
    fetch(`${BACKEND_URL}/api/documents`, {
      headers: { "x-user-id": user.id },
    })
      .then((res) => res.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : data.documents || []))
      .catch(console.error)
      .finally(() => setDocsLoading(false));
  }, [user]);

  const triggerCall = useCallback(async () => {
    if (!user) return;
    setCallStatus("calling");
    setCallError(null);
    try {
      if (!user.phone_number) {
        throw new Error("Add a phone number to your profile first.");
      }
      const res = await fetch(`${BACKEND_URL}/api/voice/outbound-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          phone_number: user.phone_number,
          dynamic_variables: {
            user_name: user.display_name || "there",
            conditions: user.conditions?.join(", ") || "none listed",
            allergies: user.allergies?.join(", ") || "none listed",
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Call failed (${res.status})`);
      }
      setCallStatus("done");
      showToast("Kira is calling you now", "success", "Pick up your phone to start the check-in");
      setTimeout(() => setCallStatus("idle"), 5000);
    } catch (err) {
      const msg = (err as Error).message;
      setCallError(msg);
      setCallStatus("error");
      showToast(msg, "error");
    }
  }, [user, showToast]);

  const displayName = user?.display_name || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const healthInfo = [
    { l: "Date of birth", v: user?.date_of_birth || "Not set" },
    { l: "Blood type", v: user?.blood_type || "Not set" },
    { l: "Conditions", v: user?.conditions?.length ? user.conditions.join(", ") : "None reported" },
    { l: "Allergies", v: user?.allergies?.length ? user.allergies.join(", ") : "None reported" },
    { l: "Emergency contact", v: formatEmergencyContact(user?.emergency_contact ?? null) },
  ];

  const preferences = [
    { l: "Check-in time", v: user?.checkin_time || "8:00 AM" },
    { l: "Frequency", v: "Daily" },
    { l: "Voice", v: user?.voice_pref || "Sarah (calm)" },
    { l: "Language", v: user?.language === "en" ? "English" : (user?.language || "English") },
  ];

  return (
    <div className="px-5 pt-8 pb-[100px]">
      {ToastEl}
      <h2 className="mb-8 text-[22px] font-semibold tracking-tight text-zinc-900">
        Settings
      </h2>

      {/* User card */}
      <div className="mb-7 flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-zinc-900">{displayName}</div>
          <div className="mt-0.5 text-[13px] text-zinc-400">{user?.email}</div>
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
            {!docsLoading && (
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
                {documents.length}
              </span>
            )}
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
            {docsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
              </div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-zinc-400">
                No documents uploaded yet
              </div>
            ) : (
              documents.map((doc, i) => {
                const typeLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
                const dateStr = new Date(doc.created_at).toLocaleDateString("en-AU", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const hasAnalysis = !!doc.summary;
                return (
                  <button
                    key={doc.id}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                      i < documents.length - 1 ? "border-b border-zinc-50" : ""
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
                        <path d={DOC_ICONS[typeLabel] || DOC_ICONS["Lab Report"]} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px] font-medium text-zinc-900">
                        {doc.file_name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>{typeLabel}</span>
                        <span className="text-zinc-200">·</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                    <div className="mt-1 shrink-0">
                      <Pill variant={hasAnalysis ? "good" : "warn"}>
                        {hasAnalysis ? "Analysed" : "Pending"}
                      </Pill>
                    </div>
                  </button>
                );
              })
            )}
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

        {/* Call me button */}
        <button
          onClick={triggerCall}
          disabled={callStatus === "calling"}
          className={`mt-3 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.99] ${
            callStatus === "done"
              ? "border border-emerald-200 bg-emerald-50"
              : callStatus === "error"
                ? "border border-red-200 bg-red-50"
                : "bg-zinc-900 hover:bg-zinc-800"
          }`}
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            callStatus === "done" ? "bg-emerald-100" : callStatus === "error" ? "bg-red-100" : "bg-white/10"
          }`}>
            {callStatus === "calling" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : callStatus === "done" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={callStatus === "error" ? "#dc2626" : "#fff"} strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className={`text-[15px] font-semibold ${
              callStatus === "done" ? "text-emerald-700" : callStatus === "error" ? "text-red-700" : "text-white"
            }`}>
              {callStatus === "calling" ? "Calling…" : callStatus === "done" ? "Call initiated!" : callStatus === "error" ? "Call failed" : "Call me now"}
            </div>
            <div className={`mt-0.5 text-xs ${
              callStatus === "done" ? "text-emerald-600/60" : callStatus === "error" ? "text-red-600/60" : "text-white/50"
            }`}>
              {callStatus === "done"
                ? "Kira is calling your phone"
                : callStatus === "error"
                  ? callError
                  : "Kira calls your phone for a hands-free check-in"}
            </div>
          </div>
        </button>
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

      {/* Sign out */}
      <div className="mb-7 overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <button
          onClick={logout}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
        >
          <span className="text-[13px] font-medium text-zinc-900">Sign out</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
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

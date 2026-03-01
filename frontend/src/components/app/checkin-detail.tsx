"use client";

import { useState } from "react";
import { CheckIn } from "./types";

const MOOD_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    great: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    good: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
    okay: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
    neutral: { bg: "bg-zinc-50", text: "text-zinc-600", ring: "ring-zinc-200" },
    bad: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200" },
    terrible: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
};

function moodStyle(mood: string | null) {
    const key = (mood || "neutral").toLowerCase();
    return MOOD_COLORS[key] || MOOD_COLORS.neutral;
}

function EnergyBar({ value }: { value: number }) {
    const pct = (value / 10) * 100;
    const color = value >= 7 ? "bg-emerald-400" : value >= 5 ? "bg-amber-400" : "bg-red-400";
    return (
        <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums text-zinc-700">{value}/10</span>
        </div>
    );
}

function SeverityDots({ severity }: { severity: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
                <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < severity ? (severity >= 7 ? "bg-red-400" : severity >= 4 ? "bg-amber-400" : "bg-zinc-300") : "bg-zinc-100"}`}
                />
            ))}
        </div>
    );
}

function parseTranscript(transcript: string): { role: "agent" | "user"; message: string }[] {
    const lines = transcript.split("\n").filter(l => l.trim());
    const messages: { role: "agent" | "user"; message: string }[] = [];

    for (const line of lines) {
        const agentMatch = line.match(/^Agent:\s*(.+)/i);
        const userMatch = line.match(/^User:\s*(.+)/i);
        if (agentMatch) {
            messages.push({ role: "agent", message: agentMatch[1].trim() });
        } else if (userMatch) {
            messages.push({ role: "user", message: userMatch[1].trim() });
        } else {
            // Continuation or unformatted — append to last or add as user
            if (messages.length > 0) {
                messages[messages.length - 1].message += " " + line.trim();
            } else {
                messages.push({ role: "user", message: line.trim() });
            }
        }
    }
    return messages;
}

function TranscriptSection({ transcript }: { transcript: string }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const COLLAPSED_HEIGHT = 160;

    const messages = parseTranscript(transcript);
    const isChatFormat = messages.length > 1 || messages.some(m => m.role === "agent");

    const handleCopy = async () => {
        await navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3 mb-3">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">Transcript</div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                    {copied ? (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <span className="text-emerald-600">Copied</span>
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>
            <div className="relative">
                <div
                    className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                    style={{ maxHeight: expanded ? "none" : `${COLLAPSED_HEIGHT}px` }}
                >
                    {isChatFormat ? (
                        <div className="flex flex-col gap-1.5">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                        m.role === "user"
                                            ? "bg-zinc-100 text-zinc-700"
                                            : "border border-dashed border-zinc-200 bg-[#fafafa] text-zinc-600"
                                    }`}>
                                        <p className="text-[12px] leading-[1.6]">{m.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {transcript.split(/\n\s*\n|\n/).filter(p => p.trim()).map((p, i) => (
                                <p key={i} className="text-[12px] leading-[1.7] text-zinc-600">{p.trim()}</p>
                            ))}
                        </div>
                    )}
                </div>
                {!expanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
            </div>
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            >
                {expanded ? "Show less" : "Show full transcript"}
            </button>
        </div>
    );
}

interface CheckInDetailProps {
    checkIn: CheckIn;
    onBack: () => void;
}

export function CheckInDetail({ checkIn, onBack }: CheckInDetailProps) {
    const c = checkIn;
    const mood = moodStyle(c.mood);
    const dateStr = new Date(c.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    return (
        <div className="px-5 pt-4 pb-[100px]">
            {/* Header */}
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors mb-4"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
            </button>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900">{dateStr}</h2>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{timeStr}{c.input_mode && ` · ${c.input_mode === "voice" ? "Voice" : "Text"} check-in`}</p>
                </div>
                {c.flagged && (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">Flagged</span>
                )}
            </div>

            {/* Mood */}
            <div className={`rounded-lg ${mood.bg} ring-1 ${mood.ring} px-4 py-3 mb-3`}>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Mood</div>
                <div className={`text-lg font-semibold ${mood.text}`}>
                    {c.mood ? c.mood.charAt(0).toUpperCase() + c.mood.slice(1) : "Not recorded"}
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Energy</div>
                    <EnergyBar value={c.energy || 0} />
                </div>
                <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Sleep</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold text-zinc-900 tabular-nums">{c.sleep_hours || 0}</span>
                        <span className="text-[12px] text-zinc-400">hours</span>
                    </div>
                </div>
            </div>

            {/* Summary */}
            {c.summary && (
                <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">AI Summary</div>
                    <p className="text-[13px] leading-relaxed text-zinc-700">{c.summary}</p>
                </div>
            )}

            {/* Notes */}
            {c.notes && c.notes !== c.summary && (
                <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Notes</div>
                    <p className="text-[13px] leading-relaxed text-zinc-700">{c.notes}</p>
                </div>
            )}

            {/* Symptoms */}
            {c.symptoms && c.symptoms.length > 0 && (
                <div className="rounded-lg bg-white border border-zinc-100 px-4 py-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2.5">
                        Symptoms <span className="text-zinc-300">({c.symptoms.length})</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {c.symptoms.map((s) => (
                            <div key={s.id} className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-zinc-800">{s.name}</span>
                                        {s.is_critical && (
                                            <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Critical</span>
                                        )}
                                        {s.alert_level && s.alert_level !== "critical" && (
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${s.alert_level === "warning" ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50"}`}>
                                                {s.alert_level}
                                            </span>
                                        )}
                                    </div>
                                    {s.body_area && (
                                        <span className="text-[11px] text-zinc-400">{s.body_area}</span>
                                    )}
                                    {s.alert_message && (
                                        <p className="text-[11px] text-zinc-500 mt-0.5">{s.alert_message}</p>
                                    )}
                                </div>
                                <div className="mt-1">
                                    <SeverityDots severity={s.severity || 0} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Flag reason */}
            {c.flagged && c.flag_reason && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-amber-600 mb-1.5">Flag Reason</div>
                    <p className="text-[13px] leading-relaxed text-amber-800">{c.flag_reason}</p>
                </div>
            )}

            {/* Transcript */}
            {c.transcript && <TranscriptSection transcript={c.transcript} />}
        </div>
    );
}

"use client";

import { Report } from "./types";
import { apiFetch } from "@/lib/api";

interface ReportsTabProps {
    reports: Report[];
}

export function ReportsTab({ reports }: ReportsTabProps) {
    const handleDownload = async (reportId: string) => {
        try {
            const res = await apiFetch(`/api/reports/${reportId}/download`);
            if (!res.ok) throw new Error("Failed to get download URL");
            const { url } = await res.json();
            window.open(url, "_blank");
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    return (
        <div className="flex flex-col gap-2.5">
            {reports.length === 0 && (
                <div className="text-center py-10 text-sm text-zinc-400">No reports generated yet.</div>
            )}
            {reports.map((r) => {
                const dateStr = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const rangeStr = `${new Date(r.date_from).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(r.date_to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                const labelStr = r.detail_level.charAt(0).toUpperCase() + r.detail_level.slice(1);
                const isAvailable = r.status === "completed" && !!r.content_path;

                return (
                    <div key={r.id} className="w-full rounded-2xl border border-zinc-100 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isAvailable ? "bg-purple-50 text-purple-600" : "bg-zinc-50 text-zinc-400"}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </div>
                                <div>
                                    <div className="text-[13px] font-medium text-zinc-900">Health Report · {labelStr}</div>
                                    <div className="text-[11px] text-zinc-400">Generated {dateStr} ({rangeStr})</div>
                                </div>
                            </div>
                            {isAvailable ? (
                                <button
                                    onClick={() => handleDownload(r.id)}
                                    className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                                >
                                    Download
                                </button>
                            ) : (
                                <span className="rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-400">
                                    {r.status === "failed" ? "Failed" : "Pending"}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

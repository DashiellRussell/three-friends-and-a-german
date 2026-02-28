"use client";

import { Document } from "./types";
import { useUser } from "@/lib/user-context";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const DOC_TYPE_LABELS: Record<string, string> = {
    lab_report: "Lab Report",
    prescription: "Prescription",
    imaging: "Imaging",
    discharge_summary: "Clinical Note",
    other: "Document",
};

interface FilesTabProps {
    documents?: Document[];
}

export function FilesTab({ documents = [] }: FilesTabProps) {
    const { user } = useUser();

    const handleDownload = async (docId: string) => {
        if (!user) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/documents/${docId}/download`, {
                headers: { "x-user-id": user.id },
            });
            if (!res.ok) throw new Error("Failed to get download URL");
            const { url } = await res.json();
            window.open(url, "_blank");
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    return (
        <div className="flex flex-col gap-2.5">
            {documents.length === 0 && (
                <div className="text-center py-10 text-sm text-zinc-400">No documents uploaded yet.</div>
            )}
            {documents.map((d) => {
                const typeLabel = DOC_TYPE_LABELS[d.document_type] || d.document_type;
                const dateStr = new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                return (
                    <div key={d.id} className="w-full rounded-2xl border border-zinc-100 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </div>
                                <div>
                                    <div className="text-[13px] font-medium text-zinc-900">{d.file_name}</div>
                                    <div className="text-[11px] text-zinc-400">{dateStr} · {typeLabel}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDownload(d.id)}
                                className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

"use client";

import { useState, useRef, useCallback } from "react";
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
    onDocumentsChanged?: () => void;
}

export function FilesTab({ documents = [], onDocumentsChanged }: FilesTabProps) {
    const { user } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleUpload = useCallback(async (file: File) => {
        if (!user) return;
        setUploadState("uploading");
        setUploadError(null);

        try {
            let documentText = "";
            if (file.type === "text/plain") {
                documentText = await file.text();
            } else {
                documentText = `Uploaded file: ${file.name}`;
            }

            setUploadState("processing");

            const formData = new FormData();
            formData.append("file", file);
            formData.append("document_text", documentText);
            formData.append("file_name", file.name);
            formData.append("document_type", "other");

            const res = await fetch(`${BACKEND_URL}/api/documents/upload`, {
                method: "POST",
                headers: { "x-user-id": user.id },
                body: formData,
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Upload failed (${res.status})`);
            }

            setUploadState("success");
            onDocumentsChanged?.();

            // Reset after brief success flash
            setTimeout(() => setUploadState("idle"), 2000);
        } catch (err) {
            setUploadError((err as Error).message);
            setUploadState("error");
        }
    }, [user, onDocumentsChanged]);

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

    const isUploading = uploadState === "uploading" || uploadState === "processing";

    return (
        <div className="flex flex-col gap-2.5">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.heic"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                }}
            />

            {/* Upload button / status */}
            <button
                onClick={() => !isUploading && fileInputRef.current?.click()}
                disabled={isUploading}
                className={`flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-4 text-[13px] font-medium transition-all active:scale-[0.99] ${
                    uploadState === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : uploadState === "error"
                        ? "border-red-200 bg-red-50 text-red-600"
                        : isUploading
                        ? "border-zinc-200 bg-zinc-50 text-zinc-400"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
            >
                {uploadState === "idle" && (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Upload document
                    </>
                )}
                {uploadState === "uploading" && (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                        Uploading...
                    </>
                )}
                {uploadState === "processing" && (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                        Analysing...
                    </>
                )}
                {uploadState === "success" && (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Uploaded
                    </>
                )}
                {uploadState === "error" && (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        {uploadError || "Upload failed"} — tap to retry
                    </>
                )}
            </button>

            {documents.length === 0 && uploadState === "idle" && (
                <div className="text-center py-6 text-sm text-zinc-400">No documents uploaded yet.</div>
            )}
            {documents.map((d) => {
                const typeLabel = DOC_TYPE_LABELS[d.document_type] || d.document_type;
                const dateStr = new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                return (
                    <div key={d.id} className="w-full rounded-2xl border border-zinc-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-medium text-zinc-900 truncate">{d.file_name}</div>
                                    <div className="text-[11px] text-zinc-400">{dateStr} · {typeLabel}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDownload(d.id)}
                                className="flex shrink-0 items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
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

"use client";

import { Document } from "./types";

interface FilesTabProps {
    documents?: Document[];
}

export function FilesTab({ documents = [] }: FilesTabProps) {
    return (
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
    );
}

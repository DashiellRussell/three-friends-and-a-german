"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useUser } from "@/lib/user-context";
type UploadStage = "idle" | "uploading" | "processing" | "done";

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}



export default function UploadCheckinPage() {
  const { user } = useUser();
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<
    { metric: string; value: string; status: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  //Axios stage

  

  const handleFileSelect = async (file: File): Promise<string> => {
    setFileName(file.name);
    setStage("uploading");
    setProgress(0);

    // Animate progress bar while extraction runs (caps at 90% until done)
    const iv = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 70);

    let text = "";
    if (file.type === "application/pdf") {
      text = await extractPdfText(file);
      console.log("PDF text:", text);
    }

    clearInterval(iv);
    setProgress(100);
    setTimeout(() => setStage("processing"), 150);
    return text;
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await handleFileSelect(file);

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/upload`,
        { document_text: text },
        { headers: { "x-user-id": user?.id || "" } },
      );
      setStatus("✅ success: " + JSON.stringify(data));
    } catch (e) {
      setStatus("❌ " + String(e));
    }
  };

  //Axios 
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick(text: string) {
    setStatus("loading...");
    
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Link
            href="/demo"
            className="text-zinc-400 transition-colors hover:text-zinc-600"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-[13px] font-medium text-zinc-400">
            Upload Document
          </span>
        </div>
        <Link
          href="/demo"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          Close
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-[5%] px-5">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={onFileChange}
          className="hidden"
        />

        {stage === "idle" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-14 transition-all hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#71717a"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-sm font-medium text-zinc-900">
              Tap to upload
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              Blood tests, prescriptions, scans
            </div>
          </button>
        )}

        {stage === "uploading" && (
          <div
            className="rounded-2xl border border-zinc-100 bg-white p-5"
            style={{ animation: "fadeUp 0.2s" }}
          >
            <div className="mb-3 text-[13px] font-medium text-zinc-900">
              {fileName}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">
              {Math.min(progress, 100)}%
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center py-14">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
            <div className="mt-4 text-xs text-zinc-400">
              Extracting findings…
            </div>
          </div>
        )}

        {stage === "done" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div className="mb-4 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[13px] font-medium text-zinc-900">
                Processed
              </span>
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                className="mb-2 flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3"
              >
                <span className="text-[13px] text-zinc-700">
                  <span className="font-medium">{r.metric}</span>{" "}
                  <span className="text-zinc-400">{r.value}</span>
                </span>
                <span
                  className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide ${
                    r.status === "normal"
                      ? "bg-emerald-50 text-emerald-600"
                      : r.status === "elevated"
                        ? "bg-red-50 text-red-600"
                        : r.status === "low"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

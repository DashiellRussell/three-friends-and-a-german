"use client";

import { useState, useEffect, useRef } from "react";
import { CONVERSATION, LAB_RESULTS, statusVariant } from "@/lib/mock-data";
import { generateTestReport } from "@/lib/generate-test-report";
import { Pill } from "./shared";

type Mode = null | "voice" | "chat" | "upload";

export function InputOverlay({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [msgs, setMsgs] = useState<typeof CONVERSATION>([]);
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: "Hi! Tell me how you're feeling, any symptoms, or ask me anything about your health." },
  ]);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [testReportStage, setTestReportStage] = useState<"idle" | "generating" | "done" | "fading" | "appearing">("idle");
  const chatRef = useRef<HTMLDivElement>(null);
  const textChatRef = useRef<HTMLDivElement>(null);

  // Voice playback
  useEffect(() => {
    if (mode !== "voice" || (!speaking && !listening) || idx >= CONVERSATION.length) {
      if (idx >= CONVERSATION.length && mode === "voice") setDone(true);
      return;
    }
    const msg = CONVERSATION[idx];
    const t = setTimeout(() => {
      setMsgs((p) => [...p, msg]);
      setSpeaking(false);
      setListening(false);
      setIdx((i) => i + 1);
    }, msg.role === "ai" ? 900 : 1100);
    return () => clearTimeout(t);
  }, [idx, speaking, listening, mode]);

  useEffect(() => {
    if (idx > 0 && idx < CONVERSATION.length && mode === "voice" && !speaking && !listening) {
      const msg = CONVERSATION[idx];
      if (msg.role === "ai") setSpeaking(true);
      else setListening(true);
    }
  }, [idx, mode, speaking, listening]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (textChatRef.current) textChatRef.current.scrollTop = textChatRef.current.scrollHeight;
  }, [chatMsgs]);

  // Generate test report
  useEffect(() => {
    if (testReportStage === "generating") {
      const t = setTimeout(() => setTestReportStage("done"), 2000);
      return () => clearTimeout(t);
    }
    if (testReportStage === "fading") {
      const t = setTimeout(() => setTestReportStage("appearing"), 320);
      return () => clearTimeout(t);
    }
  }, [testReportStage]);

  // Upload progress
  useEffect(() => {
    if (uploadStage === "uploading") {
      const iv = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(iv);
            setUploadStage("processing");
            return 100;
          }
          return p + 10;
        });
      }, 70);
      return () => clearInterval(iv);
    }
    if (uploadStage === "processing") {
      const t = setTimeout(() => setUploadStage("done"), 1600);
      return () => clearTimeout(t);
    }
  }, [uploadStage]);

  const startVoice = () => {
    setMode("voice");
    setSpeaking(true);
  };

  const sendChat = () => {
    if (!chatText.trim()) return;
    setChatMsgs((p) => [...p, { role: "user", text: chatText }]);
    setChatText("");
    setTimeout(() => {
      setChatMsgs((p) => [
        ...p,
        { role: "ai", text: "Got it — I've noted that. Anything else you'd like to log?" },
      ]);
    }, 1000);
  };

  // ── Picker ──
  if (!mode) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div onClick={onClose} className="flex-1 bg-black/30 backdrop-blur-sm" />
        <div className="rounded-t-3xl bg-white px-6 pb-10 pt-5" style={{ animation: "slideUp 0.3s ease" }}>
          <div className="mx-auto mb-6 h-1 w-8 rounded-full bg-zinc-200" />
          <div className="mb-1 text-[16px] font-semibold text-zinc-900">New Entry</div>
          <div className="mb-6 text-[13px] text-zinc-400">How would you like to log?</div>

          <div className="flex flex-col gap-2.5">
            {/* Voice - primary */}
            <button onClick={startVoice} className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-left transition-all hover:bg-zinc-800 active:scale-[0.99]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-white">Voice check-in</div>
                <div className="mt-0.5 text-xs text-white/50">~2 min conversation · recommended</div>
              </div>
            </button>

            <div className="flex gap-2.5">
              <button onClick={() => setMode("chat")} className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-zinc-900">Text</div>
                  <div className="text-[11px] text-zinc-400">Type or chat</div>
                </div>
              </button>

              <button onClick={() => setMode("upload")} className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-zinc-900">Upload</div>
                  <div className="text-[11px] text-zinc-400">PDF, image</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Voice mode ──
  if (mode === "voice") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[13px] font-medium tracking-wide text-zinc-400">Voice Check-in</span>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
            {done ? "Done ✓" : "Cancel"}
          </button>
        </div>

        <div className="flex flex-col items-center px-0 pt-6 pb-3">
          <div
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all duration-500 ${
              done
                ? "bg-emerald-50"
                : listening
                  ? "bg-zinc-900 shadow-[0_0_0_18px_rgba(0,0,0,0.03)]"
                  : speaking
                    ? "bg-violet-50 shadow-[0_0_0_18px_rgba(0,0,0,0.03)]"
                    : "bg-zinc-900"
            }`}
          >
            {done ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : listening || speaking ? (
              <div className="flex h-[22px] items-center gap-[3px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-[2.5px] rounded-sm"
                    style={{
                      height: 22,
                      background: listening ? "rgba(255,255,255,0.6)" : "#8b5cf6",
                      animation: `waveBar ${0.4 + i * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            )}
          </div>
          <div className="mt-2.5 min-h-[16px] text-xs font-medium text-zinc-400">
            {listening ? "Listening…" : speaking ? "Speaking…" : done ? "Complete" : "Starting…"}
          </div>
        </div>

        <div ref={chatRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeUp 0.25s ease" }}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-zinc-50"
                  : "rounded-bl-sm border border-zinc-100 bg-white text-zinc-700"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {(speaking || listening) && (
            <div className={`flex ${listening ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-1.5 rounded-2xl px-4 py-3 ${listening ? "bg-zinc-900" : "border border-zinc-100 bg-white"}`}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: listening ? "rgba(255,255,255,0.4)" : "#d4d4d8",
                      animation: `bounce 1.2s ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat mode ──
  if (mode === "chat") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMode(null)} className="text-zinc-400 transition-colors hover:text-zinc-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-[13px] font-medium text-zinc-400">Text Check-in</span>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">Done</button>
        </div>

        <div ref={textChatRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3">
          {chatMsgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeUp 0.2s ease" }}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-zinc-50"
                  : "rounded-bl-sm border border-zinc-100 bg-white text-zinc-700"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-zinc-100 bg-white/90 px-5 py-3 backdrop-blur-lg">
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Describe how you're feeling…"
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
          />
          <button
            onClick={sendChat}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              chatText.trim() ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-300"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Upload mode ──
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fafafa]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMode(null)} className="text-zinc-400 transition-colors hover:text-zinc-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="text-[13px] font-medium text-zinc-400">Upload Document</span>
        </div>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">Close</button>
      </div>

      <div className="flex flex-col gap-[5%] px-5">
        {uploadStage === "idle" && (
          <button
            onClick={() => setUploadStage("uploading")}
            className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-14 transition-all hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div className="text-sm font-medium text-zinc-900">Tap to upload</div>
            <div className="mt-1 text-xs text-zinc-400">Blood tests, prescriptions, scans</div>
          </button>
        )}

        {uploadStage === "uploading" && (
          <div className="rounded-2xl border border-zinc-100 bg-white p-5" style={{ animation: "fadeUp 0.2s" }}>
            <div className="mb-3 text-[13px] font-medium text-zinc-900">PathologyReport_Feb2026.pdf</div>
            <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-zinc-900 transition-all duration-75" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">{Math.min(progress, 100)}%</div>
          </div>
        )}

        {uploadStage === "processing" && (
          <div className="flex flex-col items-center py-14">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
            <div className="mt-4 text-xs text-zinc-400">Extracting findings…</div>
          </div>
        )}

        {uploadStage === "done" && (
          <div style={{ animation: "fadeUp 0.3s" }}>
            <div className="mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span className="text-[13px] font-medium text-zinc-900">Processed</span>
            </div>
            {LAB_RESULTS.map((r, i) => (
              <div key={i} className="mb-2 flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3">
                <span className="text-[13px] text-zinc-700">
                  <span className="font-medium">{r.metric}</span>{" "}
                  <span className="text-zinc-400">{r.value}</span>
                </span>
                <Pill variant={statusVariant(r.status)}>{r.status}</Pill>
              </div>
            ))}
            <div className="mt-2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 px-3.5 py-2.5 text-[11px] font-medium text-amber-700">
              ⚠ HbA1c trending upward
            </div>
          </div>
        )}

        {uploadStage === "idle" && (testReportStage === "idle" || testReportStage === "appearing") && (
          <button
            onClick={() => setTestReportStage("generating")}
            className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-14 transition-all hover:border-zinc-300 hover:shadow-sm"
            style={testReportStage === "appearing" ? { animation: "fadeUp 0.4s ease both" } : undefined}
          >
            <div className="text-sm font-medium text-zinc-900">Generate Test PDF</div>
            <div className="mt-1 text-xs text-zinc-400">Blood tests, prescriptions, scans</div>
          </button>
        )}

        {testReportStage === "generating" && (
          <div className="flex flex-col items-center py-14" style={{ animation: "fadeUp 0.2s" }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-100 border-t-zinc-900" />
            <div className="mt-4 text-xs text-zinc-400">Generating report…</div>
          </div>
        )}

        {(testReportStage === "done" || testReportStage === "fading") && (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-5 py-6"
            style={{ animation: testReportStage === "fading" ? "fadeDown 0.32s forwards" : "fadeUp 0.3s" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="text-[13px] font-medium text-zinc-900">Report generated</div>
            <div className="text-[11px] text-zinc-400">Your test PDF is ready</div>
            <div className="mt-1 flex w-full gap-2">
              <button
                onClick={() => generateTestReport()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download PDF
              </button>
              <button
                onClick={() => setTestReportStage("fading")}
                className="flex flex-1 items-center justify-center rounded-xl border border-zinc-200 py-2.5 text-[13px] font-medium text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function VoiceCheckinPage() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const [messages, setMessages] = useState<
    { role: "ai" | "user"; text: string }[]
  >([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // TODO: Integrate ElevenLabs WebRTC voice conversation here.
  // Use the useConversation hook from @elevenlabs/react to:
  // 1. Start a voice session via signed URL from the backend
  // 2. Stream AI speech and capture user audio
  // 3. Push transcribed messages into setMessages
  // 4. Set speaking/listening/done states based on conversation status

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-[13px] font-medium tracking-wide text-zinc-400">
          Voice Check-in
        </span>
        <Link
          href="/demo"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          {done ? "Done ✓" : "Cancel"}
        </Link>
      </div>

      {/* Status indicator */}
      <div className="flex flex-col items-center px-0 pt-6 pb-3">
        <div
          className={`flex h-18 w-18 items-center justify-center rounded-full transition-all duration-500 ${
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
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : listening || speaking ? (
            <div className="flex h-5.5 items-center gap-0.75">
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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </div>
        <div className="mt-2.5 min-h-4 text-xs font-medium text-zinc-400">
          {listening
            ? "Listening…"
            : speaking
              ? "Speaking…"
              : done
                ? "Complete"
                : "Starting…"}
        </div>
      </div>

      {/* Chat transcript */}
      <div
        ref={chatRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeUp 0.25s ease" }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-zinc-50"
                  : "rounded-bl-sm border border-zinc-100 bg-white text-zinc-700"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {(speaking || listening) && (
          <div
            className={`flex ${listening ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-1.5 rounded-2xl px-4 py-3 ${listening ? "bg-zinc-900" : "border border-zinc-100 bg-white"}`}
            >
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

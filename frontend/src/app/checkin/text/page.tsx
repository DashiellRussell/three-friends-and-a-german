"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import axios from "axios";

export default function TextCheckinPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "ai" | "user"; text: string }[]
  >([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    // TODO: Send text to backend check-in API and stream/display the AI response.
    // POST to ${NEXT_PUBLIC_BACKEND_URL}/api/checkin with { message: text }
    // Then push the AI response into setMessages.
  };

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
            Text Check-in
          </span>
        </div>
        <Link
          href="/demo"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          Done
        </Link>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeUp 0.2s ease" }}
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
      </div>

      {/* Input */}
      <div className="flex gap-2.5 border-t border-zinc-100 bg-white/90 px-5 py-3 backdrop-blur-lg">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Describe how you're feeling…"
          className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
        />
        <button
          onClick={sendMessage}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
            input.trim()
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-300"
          }`}
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
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

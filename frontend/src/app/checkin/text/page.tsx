"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useUser } from "@/lib/user-context";

function TypingIndicator() {
  return (
    <div
      className="flex justify-start"
      style={{ animation: "fadeUp 0.2s ease" }}
    >
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-zinc-100 bg-white px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-300"
            style={{
              animation: "bounce 1.2s infinite ease-in-out",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TextCheckinPage() {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "assistant" | "user"; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [systemContext, setSystemContext] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleDone = async () => {
    if (messages.length === 0) {
      router.push("/demo");
      return;
    }

    setIsSaving(true);

    const transcript = messages
      .map((m) => `${m.role === "assistant" ? "AI" : "User"}: ${m.text}`)
      .join("\n");

    await axios.post(`${backendUrl}/api/checkin`, {
      transcript,
    }, {
      headers: { "x-user-id": user?.id || "" },
    });

    setIsSaving(false);
    setIsDone(true);
    setTimeout(() => router.push("/demo"), 1500);
  };

  useEffect(() => {
    if (!user) return;
    const headers = { "x-user-id": user.id };
    const loadContext = async () => {
      const { data } = await axios.post(
        `${backendUrl}/api/checkin/summary`,
        {},
        { headers },
      );
      const context = data.context ?? null;
      setSystemContext(context);
      if (context) {
        const { data: opener } = await axios.post(
          `${backendUrl}/api/checkin/chat/start`,
          { systemPrompt: context },
          { headers },
        );
        setMessages([{ role: "assistant", text: opener.message }]);
        setIsLoading(false);
        setInitializing(false);
      }
    };

    loadContext();
  }, [user, backendUrl]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-focus input when loading finishes
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !systemContext || isLoading) return;

    const updatedMessages = [...messages, { role: "user" as const, text }];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const history = updatedMessages.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    const { data } = await axios.post(
      `${backendUrl}/api/checkin/chat/message`,
      { systemPrompt: systemContext, history },
      { headers: { "x-user-id": user?.id || "" } },
    );

    setMessages((prev) => [...prev, { role: "assistant", text: data.message }]);
    setIsLoading(false);
  };

  const canSend = input.trim() && !isLoading;

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
        <button
          onClick={handleDone}
          disabled={isSaving || isDone}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3"
      >
        {/* Initial loading state */}
        {initializing && (
          <div className="flex flex-1 items-center justify-center">
            <div
              className="flex flex-col items-center gap-3"
              style={{ animation: "fadeIn 0.3s ease" }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full bg-zinc-300"
                    style={{
                      animation: "bounce 1.2s infinite ease-in-out",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[13px] text-zinc-400">
                Preparing your check-in…
              </span>
            </div>
          </div>
        )}

        {!initializing &&
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              style={{
                animation: "fadeUp 0.25s ease both",
                animationDelay: i === messages.length - 1 ? "0.05s" : "0s",
              }}
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

        {/* Typing indicator when waiting for AI response */}
        {isLoading && !initializing && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="flex gap-2.5 border-t border-zinc-100 bg-white/90 px-5 py-3 backdrop-blur-lg">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={
            isLoading ? "Waiting for response…" : "Describe how you're feeling…"
          }
          disabled={isLoading}
          className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!canSend}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
            canSend
              ? "bg-zinc-900 text-white active:scale-95"
              : "bg-zinc-100 text-zinc-300"
          } disabled:cursor-not-allowed`}
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

      {isSaving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.2s ease" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-900"
              style={{ animation: "spin 0.7s linear infinite" }}
            />
            <span className="text-[13px] text-zinc-400">Saving check-in…</span>
          </div>
        </div>
      )}

      {isDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div
            style={{ animation: "fadeUp 0.3s ease" }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[15px] font-medium text-zinc-900">
              Check-in saved
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { SeedData } from "./seed-data";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m left`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function maskCode(code: string): string {
  return code.slice(0, 2) + "****";
}

function GenerateCodeCard({ onGenerate }: { onGenerate: (code: string) => void }) {
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<"primary" | "secondary">("secondary");
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [hidden, setHidden] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setHidden(false);
    setRevealed(true);
    setTimeout(() => {
      const code = Array.from({ length: 6 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
      ).join("");
      setGeneratedCode(code);
      setGenerating(false);
      onGenerate(code);
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setRevealed(false);
      }, 10000);
    }, 800);
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    setHidden(true);
  };

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5" style={{ animation: "fadeUp 0.4s ease-out both" }}>
      <h3 className="text-[15px] font-semibold text-zinc-900">Generate Invite Code</h3>
      <p className="mt-1 text-[12px] text-zinc-400">
        Create a 6-character code to link a caretaker to your dependent
      </p>

      {(!generatedCode || hidden) ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[12px] font-medium text-zinc-500">Restrict to email (optional)</label>
            <input
              type="email"
              placeholder="e.g. brother@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-300 outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-zinc-500">Caretaker level</label>
            <div className="mt-1.5 flex gap-2">
              {(["primary", "secondary"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-medium capitalize transition-all ${
                    level === l
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-[14px] font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-60 active:scale-[0.98]"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Generate Code
              </>
            )}
          </button>

          {/* Show last generated code masked */}
          {hidden && generatedCode && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5">
              <span className="font-mono text-[14px] font-semibold tracking-wider text-zinc-400">{maskCode(generatedCode)}</span>
              <span className="text-[11px] text-zinc-400">Code hidden</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5" style={{ animation: "fadeUp 0.3s ease-out both" }}>
          {/* Countdown warning */}
          {revealed && (
            <div className="mb-3 flex items-center justify-center gap-1.5 text-[11px] text-amber-600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Code will auto-hide — copy it now
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-50 py-6">
            {generatedCode.split("").map((char, i) => (
              <div
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-[20px] font-bold tracking-wider text-zinc-900 shadow-sm"
                style={{ animation: `fadeUp 0.3s ease-out ${i * 60}ms both` }}
              >
                {revealed ? char : "\u2022"}
              </div>
            ))}
          </div>

          {!revealed && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => setRevealed(true)}
                className="text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
              >
                Reveal code
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-medium transition-all ${
                copied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDone}
              className="flex flex-1 items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Done
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-zinc-400">
            Code expires in 24 hours &middot; Single use
          </p>
        </div>
      )}
    </div>
  );
}

function RedeemCodeCard() {
  const [chars, setChars] = useState<string[]>(Array(6).fill(""));
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");

  const handleCharChange = (index: number, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!upper) return;
    const newChars = [...chars];
    newChars[index] = upper.charAt(0);
    setChars(newChars);

    if (upper && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleRedeem = () => {
    if (chars.filter((c) => c).length < 6) return;
    setStatus("checking");
    setTimeout(() => setStatus("success"), 1200);
  };

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5" style={{ animation: "fadeUp 0.4s ease-out 0.1s both" }}>
      <h3 className="text-[15px] font-semibold text-zinc-900">Redeem Invite Code</h3>
      <p className="mt-1 text-[12px] text-zinc-400">Enter a code shared by a patient or caretaker</p>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {chars.map((char, i) => (
          <input
            key={i}
            id={`code-${i}`}
            type="text"
            maxLength={1}
            value={char}
            onChange={(e) => handleCharChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !chars[i] && i > 0) {
                const newChars = [...chars];
                newChars[i - 1] = "";
                setChars(newChars);
                document.getElementById(`code-${i - 1}`)?.focus();
              }
            }}
            className="h-12 w-10 rounded-xl border border-zinc-200 bg-zinc-50 text-center text-[18px] font-bold text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:shadow-sm"
          />
        ))}
      </div>

      <button
        onClick={handleRedeem}
        disabled={chars.filter((c) => c).length < 6 || status === "checking"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-[14px] font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-40 active:scale-[0.98]"
      >
        {status === "checking" ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Verifying...
          </>
        ) : status === "success" ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            Linked!
          </>
        ) : (
          "Redeem Code"
        )}
      </button>

      {status === "success" && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-center text-[12px] text-emerald-700" style={{ animation: "fadeUp 0.3s ease-out both" }}>
          Successfully linked as a caretaker. You can now view their health data.
        </div>
      )}
    </div>
  );
}

export function InviteFlow({ seed }: { seed: SeedData }) {
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-5 pt-6 pb-8">
      <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.3s ease-out both" }}>
        Invite Codes
      </h2>
      <p className="mt-1 mb-6 text-[14px] text-zinc-400" style={{ animation: "fadeUp 0.3s ease-out 0.05s both" }}>
        Link caretakers and patients with secure codes
      </p>

      <div className="space-y-5">
        <GenerateCodeCard onGenerate={() => {}} />
        <RedeemCodeCard />

        {/* Existing codes — masked by default */}
        <div style={{ animation: "fadeUp 0.4s ease-out 0.2s both" }}>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Your invite codes
          </span>
          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-100 bg-white">
            {seed.invites.map((inv, i) => {
              const isExpired = new Date(inv.expires_at) < new Date();
              const isUsed = inv.redeemed_at !== null;
              const isRevealed = revealedCodes.has(inv.id);
              const displayCode = isRevealed ? inv.code : maskCode(inv.code);

              return (
                <div
                  key={inv.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i < seed.invites.length - 1 ? "border-b border-zinc-50" : ""
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                    isUsed || isExpired ? "bg-zinc-100 text-zinc-400" : "bg-blue-50 text-blue-600"
                  }`}>
                    {inv.code.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold tracking-wider text-zinc-900">
                        {displayCode}
                      </span>
                      {/* Reveal/hide toggle */}
                      <button
                        onClick={() => toggleReveal(inv.id)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                        title={isRevealed ? "Hide" : "Reveal"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          {isRevealed ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                      </button>
                      {isUsed && (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">Used</span>
                      )}
                      {isExpired && !isUsed && (
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Expired</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {inv.target_email ? `For: ${inv.target_email}` : "Open invite"}
                      {" "}
                      &middot; {isExpired || isUsed ? timeAgo(inv.created_at) : timeUntil(inv.expires_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

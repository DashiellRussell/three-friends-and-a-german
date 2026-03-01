"use client";

import Link from "next/link";

export function NewEntryPopup({
  onClose,
  onCallMe,
}: {
  onClose: () => void;
  onCallMe?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex flex-col justify-end">
      <div onClick={onClose} className="flex-1 bg-black/30 backdrop-blur-sm" />
      <div
        className="rounded-t-3xl bg-white px-6 pb-10 pt-5"
        style={{ animation: "slideUp 0.3s ease" }}
      >
        <div className="mx-auto mb-6 h-1 w-8 rounded-full bg-zinc-200" />
        <div className="mb-1 text-[16px] font-semibold text-zinc-900">
          New Entry
        </div>
        <div className="mb-6 text-[13px] text-zinc-400">
          How would you like to log?
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Voice — primary */}
          <Link
            href="/checkin/voice"
            className="flex w-full items-center gap-4 rounded-2xl bg-zinc-900 p-4 text-left transition-all hover:bg-zinc-800 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
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
            </div>
            <div>
              <div className="text-[15px] font-semibold text-white">
                Voice check-in
              </div>
              <div className="mt-0.5 text-xs text-white/50">
                ~2 min conversation · recommended
              </div>
            </div>
          </Link>

          {/* Call me */}
          <button
            onClick={() => {
              onClose();
              onCallMe?.();
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-zinc-900">
                Call me
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">
                Tessera calls your phone
              </div>
            </div>
          </button>

          <div className="flex gap-2.5">
            {/* Text */}
            <Link
              href="/checkin/text"
              className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-zinc-900">
                  Text
                </div>
                <div className="text-[11px] text-zinc-400">Type or chat</div>
              </div>
            </Link>

            {/* Upload */}
            <Link
              href="/checkin/upload"
              className="flex flex-1 items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                <svg
                  width="18"
                  height="18"
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
              <div>
                <div className="text-[13px] font-semibold text-zinc-900">
                  Upload
                </div>
                <div className="text-[11px] text-zinc-400">PDF, image</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

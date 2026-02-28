"use client";

import { useState } from "react";
import axios from "axios";
import { useUser } from "@/lib/user-context";

export function SummaryButton() {
  const { user } = useUser();
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading...");
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkin/summary`,
        {},
        { headers: { "x-user-id": user?.id || "" } },
      );
      setStatus("✅ success: " + JSON.stringify(data));
    } catch (e) {
      setStatus("❌ " + String(e));
    }
  }

  

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <button
        onClick={handleClick}
        className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Generate Summary
      </button>
      {status && <p className="text-xs text-zinc-500">{status}</p>}
    </div>
  );
}

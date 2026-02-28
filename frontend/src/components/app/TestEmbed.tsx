"use client";

import { useState } from "react";
import axios from "axios";
import { useUser } from "@/lib/user-context";

export function TestEmbedButton() {
  const { user } = useUser();
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading...");
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkin`,
        {
          transcript: `AI: Morning Nick, how are you feeling today?
Nick: Pretty good actually, I think I'm mostly over it. Just a bit of residual congestion.
AI: Great recovery. How did you sleep?
Nick: Really well, like 8 hours. First proper sleep in days.
AI: Energy?
Nick: 7 out of 10. Went for a short walk outside, felt good to move.
AI: And food?
Nick: Back to normal. Had oats for breakfast, chicken and rice for dinner. Cooked properly for the first time this week.
AI: Glad to hear it. Anything else?
Nick: No I think I'm good. Just going to ease back into the gym tomorrow maybe.`,
        },
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
        Test Embed
      </button>
      {status && <p className="text-xs text-zinc-500">{status}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";

export function TestEmbedButton() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading...");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: `AI: Hey! How are you feeling today?

User: Honestly pretty tired, didn't sleep great. Maybe like 5 hours.

AI: Sorry to hear that. Any reason you couldn't sleep, or just one of those nights?

User: I think I was stressed about work stuff. Had a bit of a headache too when I woke up.

AI: Got it. How's your energy been today overall?

User: Like a 3 out of 10 honestly. I had coffee but it didn't really help much.

AI: And mood-wise, how would you describe today?

User: Anxious I guess. Just kind of on edge. Nothing specific really.

AI: That makes sense given the sleep. Have you eaten okay today at least?

User: Yeah I had breakfast and lunch, that was fine. No issues there.

AI: Okay, good. Anything else worth mentioning — any other symptoms or anything unusual?

User: Not really, just the headache this morning. It went away after a bit though.

AI: Alright, thanks for checking in. Hope you get some better rest tonight.`,
            user_id: "51b5ade8-77df-4379-95f5-404685a44980",
          }),
        },
      );
      const data = await res.json();
      setStatus(
        res.ok
          ? "✅ success: " + JSON.stringify(data)
          : "❌ " + JSON.stringify(data),
      );
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

"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [message, setMessage] = useState<string | null>(null);

  const testBackend = async () => {
    const { data } = await axios.get("http://localhost:3001/api/checkin");
    setMessage(data.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={testBackend}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-zinc-700"
        >
          Test Backend
        </button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

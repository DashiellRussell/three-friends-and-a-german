"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Mic } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);

    try {
      await login(email.trim());
      router.push("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[#fafafa] px-8">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
          <Mic className="h-6 w-6 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Tessera</h1>
        <p className="mt-1 text-[14px] text-zinc-400">Your AI health companion</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[320px]">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoFocus
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-[15px] text-zinc-900 placeholder:text-zinc-300 outline-none transition-colors focus:border-zinc-400"
        />
        {error && (
          <p className="mt-2.5 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600" style={{ animation: "fadeUp 0.2s ease" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="mt-3 w-full rounded-2xl bg-zinc-900 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] text-zinc-300">
        We&apos;ll create an account if you&apos;re new
      </p>
    </div>
  );
}

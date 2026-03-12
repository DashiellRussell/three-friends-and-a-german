"use client";

import { SignIn } from "@clerk/nextjs";
import { Mic } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[#fafafa] px-8">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
          <Mic className="h-6 w-6 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Tessera</h1>
        <p className="mt-1 text-[14px] text-zinc-400">Your AI health companion</p>
      </div>

      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: "w-full max-w-[380px]",
            cardBox: "shadow-none border-0",
            card: "shadow-none border-0 bg-transparent",
          },
        }}
      />
    </div>
  );
}

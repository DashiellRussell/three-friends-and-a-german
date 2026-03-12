"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-zinc-500 mb-6">
          {error.message === "Failed to fetch"
            ? "Tessera appears to be down. Please try again in a moment."
            : "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

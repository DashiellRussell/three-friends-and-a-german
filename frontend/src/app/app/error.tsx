"use client";

export default function AppError({
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
            ? "Unable to reach the server. Please check your connection and try again."
            : "An unexpected error occurred in the app. Please try again."}
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

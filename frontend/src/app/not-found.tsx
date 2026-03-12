import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-zinc-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">
          Page not found
        </h2>
        <p className="text-zinc-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

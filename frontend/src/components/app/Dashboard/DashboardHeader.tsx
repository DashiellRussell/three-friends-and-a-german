import { CriticalAlert } from "./types";
import { getGreeting, formatDate } from "./utils";

interface DashboardHeaderProps {
  firstName: string;
  alerts: CriticalAlert[];
  onOpenAlerts: () => void;
}

export function DashboardHeader({
  firstName,
  alerts,
  onOpenAlerts,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {formatDate()}
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-zinc-900 leading-tight">
          {getGreeting()}, {firstName}
        </h1>
      </div>

      <button
        onClick={onOpenAlerts}
        className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-sm"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="15" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {alerts.length}
          </span>
        )}
      </button>
    </div>
  );
}

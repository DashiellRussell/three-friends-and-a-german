import { Sparkline } from "../shared";
import { CheckInDay } from "./types";

interface EnergySparklineProps {
  last7: CheckInDay[];
  isLoading: boolean;
  onSeeAll: () => void;
}

export function EnergySparkline({
  last7,
  isLoading,
  onSeeAll,
}: EnergySparklineProps) {
  return (
    <div className="mb-4 rounded-2xl border border-zinc-100 bg-white p-5 transition-all hover:border-zinc-200 hover:shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-zinc-900">
          Energy (Past Week)
        </span>
        <button
          onClick={onSeeAll}
          className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
        >
          See trends →
        </button>
      </div>

      {isLoading ? (
        <div className="h-15 w-full animate-pulse rounded-xl bg-zinc-200/60" />
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-[9px] text-zinc-300">
            <span>10</span>
            <span>1</span>
          </div>
          <Sparkline
            data={last7.map((c) => c.energy)}
            labels={last7.map((c) =>
              c.date.includes(" ") ? c.date.split(" ").pop()! : c.date,
            )}
            color="#18181b"
            fill
            highlight={last7.length - 1}
          />
        </div>
      )}
    </div>
  );
}

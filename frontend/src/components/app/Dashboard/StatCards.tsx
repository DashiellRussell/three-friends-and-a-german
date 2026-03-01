interface StatCardsProps {
  streak: number;
  energy: number;
  adherence: number;
  isLoading: boolean;
}

const STATS = [
  { key: "Streak", unit: "days" },
  { key: "Energy", unit: "avg" },
  { key: "Adherence", unit: "%" },
] as const;

export function StatCards({
  streak,
  energy,
  adherence,
  isLoading,
}: StatCardsProps) {
  const values: Record<string, string> = {
    Streak: streak.toString(),
    Energy: energy.toString(),
    Adherence: adherence.toString(),
  };

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {STATS.map(({ key, unit }) => (
        <div
          key={key}
          className="rounded-2xl border border-zinc-100 bg-white p-3.5 transition-all hover:border-zinc-200 hover:shadow-sm"
        >
          <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            {key}
          </div>
          {isLoading ? (
            <div className="flex h-7 items-end pb-0.5">
              <div className="h-6 w-10 animate-pulse rounded bg-zinc-200/80" />
              <div className="ml-1.5 h-3 w-6 animate-pulse rounded bg-zinc-200/80" />
            </div>
          ) : (
            <div className="text-2xl font-semibold leading-none tracking-tight text-zinc-900">
              {values[key]}
              <span className="ml-0.5 text-[11px] font-normal text-zinc-300">
                {unit}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

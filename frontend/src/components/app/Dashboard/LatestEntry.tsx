import { useState } from "react";
import { Pill } from "../shared";
import { LatestEntry as LatestEntryData } from "./types";

interface LatestEntryProps {
  latest: LatestEntryData;
  onClick: () => void;
}

export function LatestEntry({ latest, onClick }: LatestEntryProps) {
  const isLong = latest.summary.length > 80;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={onClick}
      className="w-full cursor-pointer rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all hover:border-zinc-200 hover:shadow-sm"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Latest
        </div>
        {latest.symptom_count > 0 && (
          <Pill>{latest.symptom_count} symptoms</Pill>
        )}
      </div>

      <div className="relative mb-2">
        <div
          className={`${!expanded ? "line-clamp-2" : ""} text-[14px] font-medium leading-relaxed text-zinc-900`}
        >
          {latest.summary}
        </div>
        {isLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-white to-transparent" />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        {isLong ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            {expanded ? "See less ↑" : "See more →"}
          </button>
        ) : (
          <div />
        )}
        <div className="text-[12px] text-zinc-400">
          {latest.timeLabel}
          {latest.mood ? ` · Mood: ${latest.mood}` : ""}
        </div>
      </div>
    </div>
  );
}

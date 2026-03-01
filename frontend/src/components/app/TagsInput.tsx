"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagsInput({ value, onChange, placeholder = "Type and press Enter", suggestions = [] }: TagsInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s.toLowerCase())
  );

  return (
    <div className="relative">
      <div
        className="flex min-h-[48px] flex-wrap gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 transition-colors focus-within:border-zinc-400"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[13px] font-medium text-zinc-700"
          >
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="ml-0.5 text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent py-0.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && input && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[140px] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="flex w-full px-3 py-2 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

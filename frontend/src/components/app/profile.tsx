"use client";

import { useState } from "react";
import { Toggle } from "./shared";

export function Profile() {
  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(false);

  const sections = [
    {
      title: "Health Profile",
      items: [
        { l: "DOB", v: "15 Mar 1999" },
        { l: "Blood type", v: "O+" },
        { l: "Conditions", v: "Type 2 Diabetes" },
        { l: "Allergies", v: "None" },
      ],
    },
    {
      title: "Check-in Preferences",
      items: [
        { l: "Time", v: "8:00 AM" },
        { l: "Frequency", v: "Daily" },
        { l: "Voice", v: "Sarah (calm)" },
        { l: "Language", v: "English" },
      ],
    },
  ];

  const medications = [
    { n: "Metformin 500mg", s: "Once daily, with breakfast" },
    { n: "Vitamin D 1000 IU", s: "Once daily" },
  ];

  return (
    <div className="px-5 pt-8 pb-[100px]">
      <h2 className="mb-8 text-[22px] font-semibold tracking-tight text-zinc-900">Profile</h2>

      {/* User info */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold text-white">
          D
        </div>
        <div>
          <div className="text-[16px] font-semibold text-zinc-900">Dash</div>
          <div className="mt-0.5 text-[13px] text-zinc-400">dash@example.com</div>
        </div>
      </div>

      {/* Info sections */}
      {sections.map((section) => (
        <div key={section.title} className="mb-7">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            {section.title}
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
            {section.items.map((item, i) => (
              <div
                key={item.l}
                className={`flex justify-between px-4 py-3 ${i < section.items.length - 1 ? "border-b border-zinc-50" : ""}`}
              >
                <span className="text-[13px] text-zinc-500">{item.l}</span>
                <span className="text-[13px] font-medium text-zinc-900">
                  {item.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Medications */}
      <div className="mb-7">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Medications
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
          {medications.map((m, i) => (
            <div
              key={m.n}
              className={`px-4 py-3 ${i < medications.length - 1 ? "border-b border-zinc-50" : ""}`}
            >
              <div className="text-[13px] font-medium text-zinc-900">
                {m.n}
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-7">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Notifications
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white px-4">
          <Toggle on={n1} onToggle={() => setN1(!n1)} label="Check-in reminders" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n2} onToggle={() => setN2(!n2)} label="Health alerts" />
          <div className="h-px bg-zinc-50" />
          <Toggle on={n3} onToggle={() => setN3(!n3)} label="Weekly summary" />
        </div>
      </div>

      {/* Actions */}
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <button className="w-full border-b border-zinc-50 px-4 py-3.5 text-left text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-50">
          Export all data
        </button>
        <button className="w-full px-4 py-3.5 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50/50">
          Delete all data
        </button>
      </div>
    </div>
  );
}

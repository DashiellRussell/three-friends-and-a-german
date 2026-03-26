"use client";

import { useState } from "react";

const TOTAL_STEPS = 5;

const COMMON_CONDITIONS = [
  "diabetes", "hypertension", "asthma", "arthritis", "depression",
  "anxiety", "migraine", "hypothyroidism", "GERD", "PCOS",
];

const COMMON_ALLERGIES = [
  "penicillin", "sulfa", "aspirin", "ibuprofen", "latex",
  "peanuts", "shellfish", "dairy", "gluten", "eggs",
];

function TagInput({ value, onChange, placeholder, suggestions }: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  const add = (tag: string) => {
    if (!value.includes(tag)) onChange([...value, tag]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[12px] font-medium text-white capitalize">
            {tag}
            <button onClick={() => remove(tag)} className="ml-0.5 text-white/50 hover:text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { add(input.trim()); e.preventDefault(); } }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
            {filtered.slice(0, 5).map((s) => (
              <button key={s} onClick={() => add(s)} className="flex w-full px-4 py-2 text-left text-[13px] text-zinc-700 capitalize hover:bg-zinc-50">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function OnboardingPreview({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);

  // Form state
  const [displayName, setDisplayName] = useState("Margaret Chen");
  const [dateOfBirth, setDateOfBirth] = useState("1948-03-15");
  const [bloodType, setBloodType] = useState("A+");
  const [conditions, setConditions] = useState<string[]>(["diabetes", "hypertension"]);
  const [allergies, setAllergies] = useState<string[]>(["penicillin"]);
  const [phoneNumber, setPhoneNumber] = useState("+61 412 345 678");
  const [emergencyName, setEmergencyName] = useState("Sarah Chen");
  const [emergencyPhone, setEmergencyPhone] = useState("+61 423 456 789");
  const [emergencyRelationship, setEmergencyRelationship] = useState("Daughter");
  const [checkinTime, setCheckinTime] = useState("08:00");
  const [voicePref, setVoicePref] = useState("sarah");
  const [language, setLanguage] = useState("en");

  const handleNext = () => { if (step < TOTAL_STEPS - 1) setStep(step + 1); else onBack(); };
  const handleBack = () => { if (step === 0) onBack(); else setStep(step - 1); };

  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 py-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === step ? "w-6 bg-zinc-900" : i < step ? "w-2 bg-zinc-400" : "w-2 bg-zinc-200"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Back to playground button */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 shadow-sm backdrop-blur-md text-[11px] font-semibold text-amber-800"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to UI
        </button>
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-8" style={{ animation: "fadeUp 0.4s ease-out both" }}>
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-zinc-900">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Welcome to Tessera</h1>
          <p className="mt-2 max-w-[280px] text-center text-[14px] leading-relaxed text-zinc-400">
            Let&apos;s set up your health profile. This helps us personalize your check-ins and track what matters to you.
          </p>
          <button onClick={handleNext} className="mt-8 rounded-2xl bg-zinc-900 px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.99]">
            Get started
          </button>
          <button onClick={onBack} className="mt-3 text-[13px] text-zinc-400 hover:text-zinc-600">Skip for now</button>
        </div>
      )}

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <ProgressDots />
          <div className="flex-1 overflow-y-auto px-8 pb-8" style={{ animation: "fadeUp 0.3s ease-out both" }}>
            <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Personal info</h2>
            <p className="mb-6 text-[13px] text-zinc-400">All fields are optional</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Display name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should Tessera call you?" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Date of birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Blood type</label>
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-400">
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
            <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 hover:bg-zinc-50">Back</button>
            <button onClick={handleNext} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white hover:bg-zinc-800">Next</button>
          </div>
        </div>
      )}

      {/* Step 2: Health Profile */}
      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <ProgressDots />
          <div className="flex-1 overflow-y-auto px-8 pb-8" style={{ animation: "fadeUp 0.3s ease-out both" }}>
            <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Health profile</h2>
            <p className="mb-6 text-[13px] text-zinc-400">Helps Tessera understand your context</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Conditions</label>
                <TagInput value={conditions} onChange={setConditions} placeholder="e.g. diabetes, asthma" suggestions={COMMON_CONDITIONS} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Allergies</label>
                <TagInput value={allergies} onChange={setAllergies} placeholder="e.g. penicillin, peanuts" suggestions={COMMON_ALLERGIES} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Phone number</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+61 4XX XXX XXX" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400" />
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-4">
                <div className="mb-3 text-[12px] font-medium text-zinc-500">Emergency contact</div>
                <div className="space-y-2.5">
                  <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Name" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white" />
                  <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="Phone" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white" />
                  <input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} placeholder="Relationship" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
            <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 hover:bg-zinc-50">Back</button>
            <button onClick={handleNext} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white hover:bg-zinc-800">Next</button>
          </div>
        </div>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <ProgressDots />
          <div className="flex-1 overflow-y-auto px-8 pb-8" style={{ animation: "fadeUp 0.3s ease-out both" }}>
            <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Preferences</h2>
            <p className="mb-6 text-[13px] text-zinc-400">Customize your check-in experience</p>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Daily check-in time</label>
                <input type="time" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-400" />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-medium text-zinc-500">Voice preference</label>
                <div className="flex gap-0.5 rounded-xl bg-zinc-100 p-1">
                  {[{ v: "sarah", l: "Sarah (calm)" }, { v: "charlie", l: "Charlie (warm)" }, { v: "aria", l: "Aria (clear)" }].map((o) => (
                    <button key={o.v} onClick={() => setVoicePref(o.v)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${voicePref === o.v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-400">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
            <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 hover:bg-zinc-50">Back</button>
            <button onClick={handleNext} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white hover:bg-zinc-800">Finish</button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50" style={{ animation: "fadeUp 0.4s ease both" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
            You&apos;re all set
          </h1>
          <p className="mt-2 max-w-[280px] text-center text-[14px] text-zinc-400" style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
            Your health profile is ready. Start your first voice check-in whenever you&apos;re ready.
          </p>
          <button onClick={onBack} className="mt-8 rounded-2xl bg-zinc-900 px-8 py-3.5 text-[15px] font-medium text-white hover:bg-zinc-800 active:scale-[0.99]" style={{ animation: "fadeUp 0.4s ease 0.3s both" }}>
            Back to Playground
          </button>
        </div>
      )}
    </div>
  );
}

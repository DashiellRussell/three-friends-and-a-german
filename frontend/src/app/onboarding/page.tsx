"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { apiFetch } from "@/lib/api";
import { TagsInput } from "@/components/app/TagsInput";
import { VoiceSphere } from "@/components/app/VoiceSphere";
import { SegmentedControl } from "@/components/app/shared";

const TOTAL_STEPS = 5; // 0-4

const COMMON_CONDITIONS = [
  "diabetes", "hypertension", "asthma", "arthritis", "depression",
  "anxiety", "migraine", "hypothyroidism", "GERD", "PCOS",
];

const COMMON_ALLERGIES = [
  "penicillin", "sulfa", "aspirin", "ibuprofen", "latex",
  "peanuts", "shellfish", "dairy", "gluten", "eggs",
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh items-center justify-center bg-[#fafafa]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const { user, refreshProfile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [checkinTime, setCheckinTime] = useState("08:00");
  const [voicePref, setVoicePref] = useState("sarah");
  const [language, setLanguage] = useState("en");

  // Load existing profile data for edit mode or resuming
  useEffect(() => {
    if (!user) return;

    // Resume from last step
    if (user.onboarding_step && user.onboarding_step > 0 && !isEditMode) {
      setStep(user.onboarding_step);
    }
    if (isEditMode) {
      setStep(1); // Skip welcome in edit mode
    }

    // Pre-fill fields
    if (user.display_name) setDisplayName(user.display_name);
    if (user.date_of_birth) setDateOfBirth(user.date_of_birth);
    if (user.blood_type) setBloodType(user.blood_type);
    if (user.conditions?.length) setConditions(user.conditions);
    if (user.allergies?.length) setAllergies(user.allergies);
    if (user.phone_number) setPhoneNumber(user.phone_number);
    if (user.emergency_contact) {
      setEmergencyName(user.emergency_contact.name || "");
      setEmergencyPhone(user.emergency_contact.phone || "");
      setEmergencyRelationship(user.emergency_contact.relationship || "");
    }
    if (user.checkin_time) setCheckinTime(user.checkin_time);
    if (user.voice_pref) setVoicePref(user.voice_pref);
    if (user.language) setLanguage(user.language);
  }, [user, isEditMode]);

  const saveStep = async (nextStep: number) => {
    setSaving(true);
    try {
      // Build profile update payload based on current step
      const updates: Record<string, unknown> = {};

      if (step === 1) {
        if (displayName) updates.display_name = displayName;
        if (dateOfBirth) updates.date_of_birth = dateOfBirth;
        if (bloodType) updates.blood_type = bloodType;
      } else if (step === 2) {
        updates.conditions = conditions;
        updates.allergies = allergies;
        if (phoneNumber) updates.phone_number = phoneNumber;
        if (emergencyName || emergencyPhone) {
          updates.emergency_contact = {
            name: emergencyName,
            phone: emergencyPhone,
            relationship: emergencyRelationship,
          };
        }
      } else if (step === 3) {
        updates.checkin_time = checkinTime;
        updates.voice_pref = voicePref;
        updates.language = language;
      }

      // Save profile fields
      if (Object.keys(updates).length > 0) {
        await apiFetch("/api/profiles", {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }

      // Track onboarding progress
      await apiFetch("/api/profiles/onboarding", {
        method: "POST",
        body: JSON.stringify({
          step: nextStep,
          completed: nextStep >= TOTAL_STEPS - 1,
        }),
      });

      await refreshProfile();
      setStep(nextStep);
    } catch (err) {
      console.error("Failed to save onboarding step:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1); // Welcome screen doesn't save
      return;
    }
    if (step === TOTAL_STEPS - 1) {
      // Done — redirect to app
      router.push("/app");
      return;
    }
    saveStep(step + 1);
  };

  const handleBack = () => {
    if (step > (isEditMode ? 1 : 0)) {
      setStep(step - 1);
    }
  };

  // Progress dots
  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 py-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === step
              ? "w-6 bg-zinc-900"
              : i < step
                ? "w-2 bg-zinc-400"
                : "w-2 bg-zinc-200"
          }`}
        />
      ))}
    </div>
  );

  // ── Step 0: Welcome ──
  if (step === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-[#fafafa] px-8">
        <VoiceSphere autoLoop size={140} />
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-zinc-900">
          Welcome to Tessera
        </h1>
        <p className="mt-2 max-w-[280px] text-center text-[14px] leading-relaxed text-zinc-400">
          Let&apos;s set up your health profile. This helps us personalize your check-ins and track what matters to you.
        </p>
        <button
          onClick={handleNext}
          className="mt-8 rounded-2xl bg-zinc-900 px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.99]"
        >
          Get started
        </button>
        <button
          onClick={() => { router.push("/app"); }}
          className="mt-3 text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
        >
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 1: Personal Info ──
  if (step === 1) {
    return (
      <div className="flex h-dvh flex-col bg-[#fafafa]">
        <ProgressDots />
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Personal info</h2>
          <p className="mb-6 text-[13px] text-zinc-400">All fields are optional</p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should Tessera call you?"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Blood type</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors focus:border-zinc-400"
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
          <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 transition-all hover:bg-zinc-50">
            Back
          </button>
          <button onClick={handleNext} disabled={saving} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-40">
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Health Profile ──
  if (step === 2) {
    return (
      <div className="flex h-dvh flex-col bg-[#fafafa]">
        <ProgressDots />
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Health profile</h2>
          <p className="mb-6 text-[13px] text-zinc-400">Helps Tessera understand your context</p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Conditions</label>
              <TagsInput
                value={conditions}
                onChange={setConditions}
                placeholder="e.g. diabetes, asthma"
                suggestions={COMMON_CONDITIONS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Allergies</label>
              <TagsInput
                value={allergies}
                onChange={setAllergies}
                placeholder="e.g. penicillin, peanuts"
                suggestions={COMMON_ALLERGIES}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Phone number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+61 4XX XXX XXX"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-zinc-400"
              />
              <p className="mt-1 text-[11px] text-zinc-300">For proactive phone check-ins</p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="mb-3 text-[12px] font-medium text-zinc-500">Emergency contact (optional)</div>
              <div className="space-y-2.5">
                <input
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white"
                />
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white"
                />
                <input
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  placeholder="Relationship (e.g. partner, parent)"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-300 focus:border-zinc-400 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
          <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 transition-all hover:bg-zinc-50">
            Back
          </button>
          <button onClick={handleNext} disabled={saving} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-40">
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Preferences ──
  if (step === 3) {
    return (
      <div className="flex h-dvh flex-col bg-[#fafafa]">
        <ProgressDots />
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <h2 className="mb-1 text-[20px] font-semibold tracking-tight text-zinc-900">Preferences</h2>
          <p className="mb-6 text-[13px] text-zinc-400">Customize your check-in experience</p>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Daily check-in time</label>
              <input
                type="time"
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-medium text-zinc-500">Voice preference</label>
              <SegmentedControl
                value={voicePref}
                onChange={setVoicePref}
                options={[
                  { value: "sarah", label: "Sarah (calm)" },
                  { value: "charlie", label: "Charlie (warm)" },
                  { value: "aria", label: "Aria (clear)" },
                ]}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none transition-colors focus:border-zinc-400"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-white px-8 py-5">
          <button onClick={handleBack} className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-[14px] font-medium text-zinc-500 transition-all hover:bg-zinc-50">
            Back
          </button>
          <button onClick={handleNext} disabled={saving} className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-40">
            {saving ? "Saving..." : "Finish"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Done ──
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[#fafafa] px-8">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50" style={{ animation: "fadeUp 0.4s ease" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900" style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
        {isEditMode ? "Profile updated" : "You're all set"}
      </h1>
      <p className="mt-2 max-w-[280px] text-center text-[14px] text-zinc-400" style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
        {isEditMode
          ? "Your health profile has been saved."
          : "Your health profile is ready. Start your first voice check-in whenever you're ready."}
      </p>
      <button
        onClick={handleNext}
        className="mt-8 rounded-2xl bg-zinc-900 px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.99]"
        style={{ animation: "fadeUp 0.4s ease 0.3s both" }}
      >
        {isEditMode ? "Back to settings" : "Open Tessera"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  Phone,
  ArrowRight,
  Play,
  FileText,
  AlertTriangle,
  ClipboardList,
  Check,
  Sparkles,
  Shield,
  Heart,
  Clock,
  PhoneCall,
  MessageCircle,
  Printer,
  MessageSquareOff,
  Smartphone,
  UserX,
  ClipboardX,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import { VoiceSphere } from "@/components/app/VoiceSphere";
import { Sparkline } from "@/components/app/shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ─── How It Works Step ──────────────────────────────────────
function HowItWorksStep({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 sm:h-16 sm:w-16">
          {icon}
        </div>
        <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
          {number}
        </div>
      </div>
      <h3 className="mb-1.5 text-[15px] font-semibold text-zinc-900 sm:text-base">
        {title}
      </h3>
      <p className="max-w-[240px] text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
        {description}
      </p>
    </div>
  );
}

// ─── Feature Row (mobile) ───────────────────────────────────
function FeatureRow({
  icon,
  title,
  description,
  accent,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-4 transition-all hover:border-zinc-200 hover:shadow-sm">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-zinc-900">{title}</h3>
        <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Feature Card (desktop) ─────────────────────────────────
function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-100 bg-white p-6 transition-all hover:border-zinc-200 hover:shadow-lg hover:shadow-zinc-100">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-[15px] font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}

// ─── Waitlist Section ────────────────────────────────────────
function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().includes("@")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="overflow-hidden rounded-3xl bg-zinc-900 px-5 py-12 text-center sm:px-16 sm:py-16">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>
        <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Give them the care they deserve
        </h2>
        <p className="mx-auto mb-8 max-w-md text-sm text-zinc-400 sm:text-base">
          Tessera is live in early access. Sign up to get started or be notified
          when the full release is ready.
        </p>

        {submitted ? (
          <div
            className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4"
            style={{ animation: "fadeUp 0.3s ease" }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                You&apos;re on the list!
              </p>
              <p className="text-xs text-zinc-400">
                We&apos;ll be in touch soon.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white/25 focus:bg-white/10"
            />
            <button
              type="submit"
              disabled={!email.includes("@") || loading}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-40"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
              ) : (
                <>
                  Join
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <p className="mt-6 text-xs text-zinc-600">
          No spam. Unsubscribe anytime. Tessera does not replace medical advice.
        </p>
      </div>
    </section>
  );
}

// ─── Conversation Preview ───────────────────────────────────
function ConversationPreview() {
  const messages = [
    { from: "tessera", text: "Good morning, Margaret. How are you feeling today?" },
    { from: "user", text: "Oh, not too bad. My knee's been playing up again though." },
    { from: "tessera", text: "Sorry to hear that. Is it worse than last week, or about the same?" },
    { from: "user", text: "A bit worse I think. And I didn't sleep great — maybe five hours." },
    { from: "tessera", text: "I'll make a note of that. Have you been able to take your morning tablets today?" },
    { from: "user", text: "Yes, all taken with breakfast." },
  ];

  return (
    <div className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* Phone header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <Phone className="h-4 w-4 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-zinc-900">Tessera Health Check-in</div>
            <div className="text-[11px] text-zinc-400">Daily call · 2 min 14 sec</div>
          </div>
        </div>
        {/* Messages */}
        <div className="flex flex-col gap-2.5 px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                  m.from === "user"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        {/* Extracted data footer */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Automatically captured
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Knee pain ↑", "Sleep: 5h", "Mood: okay", "Meds: taken"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview stat cards ─────────────────────────────────────
function PreviewStatCards() {
  const stats = [
    { label: "Check-in Streak", value: "12", unit: "days", trend: "Active", highlight: true },
    { label: "Avg Energy", value: "7.2", unit: "/10", trend: "Stable", highlight: false },
    { label: "Med Adherence", value: "94", unit: "%", trend: "On track", highlight: false },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4">
          <div className="mb-1 text-[9px] font-medium uppercase tracking-widest text-zinc-500 sm:text-[10px]">{s.label}</div>
          <div className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-[22px]">
            {s.value}<span className="text-[10px] text-zinc-500 sm:text-[11px]">{s.unit}</span>
          </div>
          <div className={`mt-0.5 text-[9px] font-medium sm:text-[10px] ${s.highlight ? "text-emerald-500" : "text-zinc-500"}`}>{s.trend}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewLatestEntry() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">Latest Check-in</div>
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
        <div>
          <div className="text-[13px] font-medium text-zinc-200">
            Today <span className="text-zinc-600">·</span> <span className="text-zinc-400">Good</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            9:14 AM · Energy 7/10 · 7.5h sleep
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        Feeling well-rested. Mild knee stiffness this morning. Took all medications with breakfast.
      </p>
    </div>
  );
}

function PreviewEnergySparkline() {
  const data = [6, 7, 5, 7, 8, 6, 7, 8, 7, 9, 7, 8, 7, 8];
  const labels = ["", "", "", "", "", "", "", "", "", "", "", "", "", "Today"];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-[13px] font-semibold text-zinc-200">Energy Over Time</div>
      <Sparkline data={data} labels={labels} color="#a1a1aa" fill height={48} highlight={data.length - 1} />
    </div>
  );
}

function PreviewAlertCard() {
  return (
    <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" strokeWidth={2} />
        <span className="text-[12px] font-semibold text-amber-300">Alert</span>
      </div>
      <p className="text-[12px] leading-relaxed text-amber-200/70">
        Knee pain has increased over 3 consecutive check-ins. Sleep has dropped below 6 hours twice this week. Consider discussing with GP.
      </p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Home() {
  const features = [
    {
      icon: <Phone className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />,
      title: "Daily phone calls",
      description:
        "Tessera calls at a set time each day. They just answer and talk — no app, no screen, no fuss.",
      accent: "bg-emerald-50",
    },
    {
      icon: <MessageCircle className="h-5 w-5 text-violet-600" strokeWidth={1.8} />,
      title: "Natural conversation",
      description:
        "No questionnaires or rating scales. Just a friendly voice asking how they're doing today.",
      accent: "bg-violet-50",
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={1.8} />,
      title: "Symptom tracking",
      description:
        "Patterns are spotted automatically — worsening pain, declining sleep, recurring issues. Nothing slips through.",
      accent: "bg-amber-50",
    },
    {
      icon: <ClipboardList className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
      title: "Doctor-ready reports",
      description:
        "One-page health summaries they can print and bring to their next appointment. No tech required.",
      accent: "bg-sky-50",
    },
    {
      icon: <FileText className="h-5 w-5 text-indigo-600" strokeWidth={1.8} />,
      title: "Document tracking",
      description:
        "Upload blood tests or prescriptions. AI reads and summarises them, tracking changes over time.",
      accent: "bg-indigo-50",
    },
    {
      icon: <Bell className="h-5 w-5 text-rose-600" strokeWidth={1.8} />,
      title: "Emergency alerts",
      description:
        "Chest pain, breathing difficulty, or signs of a stroke? You and their emergency contact are notified straight away.",
      accent: "bg-rose-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
              <Mic className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
              Tessera
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app"
              className="hidden items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 sm:flex"
            >
              <Play className="h-3 w-3" />
              Try the demo
            </Link>
            <a
              href="#waitlist"
              className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:min-h-[90vh] sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/30 via-sky-100/20 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[320px] w-[320px] rounded-full bg-gradient-to-tl from-amber-100/30 to-transparent blur-3xl" />

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] text-zinc-500 sm:mb-6">
          <Phone className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          No app required — just a phone call
        </div>

        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-900 leading-[1.1] sm:text-5xl md:text-6xl">
          A daily check-in call
          <br />
          <span className="text-zinc-400">for the people you care about.</span>
        </h1>

        <p className="mt-5 max-w-xl text-[15px] text-zinc-500 leading-relaxed sm:mt-6 sm:text-lg">
          Tessera calls your loved one each day, has a friendly conversation about
          how they&apos;re feeling, and turns it into health data their doctor can
          actually use. They just answer the phone.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <a
            href="#waitlist"
            className="group flex items-center gap-2.5 rounded-full bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/10 active:scale-[0.98] sm:px-7 sm:py-3.5 sm:text-[15px]"
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-[14px] font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] sm:px-7 sm:py-3.5 sm:text-[15px]"
          >
            <Play className="h-3.5 w-3.5" />
            Try the demo
          </Link>
        </div>

        <div className="relative mt-10 sm:mt-14">
          <VoiceSphere autoLoop size={120} />
        </div>

        <div className="mt-4 flex items-center gap-3 sm:mt-6">
          <div className="flex -space-x-2">
            {[
              "bg-emerald-400",
              "bg-sky-400",
              "bg-amber-400",
              "bg-violet-400",
            ].map((bg, i) => (
              <div
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${bg} border-2 border-white text-[9px] font-semibold text-white sm:h-8 sm:w-8 sm:text-[10px]`}
              >
                {["M", "R", "J", "S"][i]}
              </div>
            ))}
          </div>
          <p className="text-[13px] text-zinc-400 sm:text-sm">
            Families already using Tessera
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* The Problem */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            The problem
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Doctors get 10 minutes every few months
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-zinc-500 sm:text-base">
            Between appointments, symptoms go untracked. Medication gets missed.
            Warning signs slip through the cracks. The patients who need monitoring
            most are the least likely to use a health app every day.
          </p>
          <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:mt-10 sm:grid-cols-2 sm:gap-4">
            {[
              { text: "Forgets to mention symptoms at appointments", icon: <MessageSquareOff className="h-4 w-4 text-zinc-400" strokeWidth={1.8} /> },
              { text: "Health apps are too confusing to use daily", icon: <Smartphone className="h-4 w-4 text-zinc-400" strokeWidth={1.8} /> },
              { text: "Downplays problems — \"I'm fine, dear\"", icon: <UserX className="h-4 w-4 text-zinc-400" strokeWidth={1.8} /> },
              { text: "No structured record between visits", icon: <ClipboardX className="h-4 w-4 text-zinc-400" strokeWidth={1.8} /> },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">{item.icon}</div>
                <p className="text-[13px] leading-snug text-zinc-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Simple for them. Powerful for you.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[13px] text-zinc-500 sm:mt-4 sm:text-base">
            They answer a phone call. You get a complete health picture.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          <HowItWorksStep
            number="1"
            icon={<PhoneCall className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />}
            title="Tessera calls them"
            description="A friendly AI calls at their preferred time each day. They just answer the phone and chat."
          />
          <HowItWorksStep
            number="2"
            icon={<Heart className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />}
            title="They have a conversation"
            description="Two minutes of natural chat about how they're feeling. No forms, no ratings, no screens."
          />
          <HowItWorksStep
            number="3"
            icon={<Printer className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />}
            title="You get the full picture"
            description="Health trends, symptom alerts, and printable doctor reports — all captured automatically."
          />
        </div>

        {/* First check-in callout */}
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:mt-14 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
              <PhoneCall className="h-6 w-6 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="mb-1 text-[15px] font-semibold text-zinc-900">
                Try it yourself first
              </h3>
              <p className="text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
                When you sign up, Tessera calls <span className="font-medium text-zinc-700">you</span> for
                a free test check-in — so you can hear exactly what your loved one will
                experience before setting it up for them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* Conversation Demo */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            The experience
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            A conversation, not a questionnaire
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[13px] text-zinc-500 sm:mt-4 sm:text-base">
            Tessera remembers their conditions, medications, and recent symptoms.
            Every call picks up where the last one left off.
          </p>
        </div>
        <ConversationPreview />
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Features
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Everything between appointments
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[13px] text-zinc-500 sm:mt-4 sm:text-base">
            Each daily check-in is a single tile in a mosaic. Together, they reveal
            the full picture of their health.
          </p>
        </div>

        {/* Mobile: compact rows */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {features.map((f) => (
            <FeatureRow key={f.title} {...f} />
          ))}
        </div>

        {/* Desktop: card grid */}
        <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* Dashboard Preview */}
      <section className="bg-zinc-950 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              For families &amp; caregivers
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              Stay in the loop without the daily phone call
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] text-zinc-500 sm:mt-4 sm:text-base">
              Track their health trends, get alerted when something&apos;s off, and
              download reports for the doctor.
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 sm:gap-4">
              <PreviewEnergySparkline />
              <PreviewStatCards />
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <PreviewAlertCard />
              <PreviewLatestEntry />
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Who it&apos;s for
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl md:text-4xl">
            Built for real people, not tech people
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Phone className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />
            </div>
            <h3 className="mb-2 text-[15px] font-semibold text-zinc-900">
              For your parent or grandparent
            </h3>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              They answer a phone call. That&apos;s it. No app to download, no
              passwords to remember, no screens to navigate. Just a friendly voice
              checking in each day.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Heart className="h-5 w-5 text-sky-600" strokeWidth={1.8} />
            </div>
            <h3 className="mb-2 text-[15px] font-semibold text-zinc-900">
              For you, the family
            </h3>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              See how they&apos;re really doing without the guilt of missing a call.
              Get emergency alerts if something serious comes up. Prepare for doctor
              appointments with real data, not guesswork.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <ClipboardList className="h-5 w-5 text-violet-600" strokeWidth={1.8} />
            </div>
            <h3 className="mb-2 text-[15px] font-semibold text-zinc-900">
              For their doctor
            </h3>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Instead of a 10-minute snapshot, get weeks of structured health data.
              Symptom trends, medication adherence, sleep patterns — all in a
              one-page printable report.
            </p>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <WaitlistSection />

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900">
              <Mic className="h-3 w-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Tessera</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <a href="#" className="transition-colors hover:text-zinc-600">Privacy</a>
            <a href="#" className="transition-colors hover:text-zinc-600">Terms</a>
          </div>
          <p className="text-xs text-zinc-400">
            Tessera does not provide medical diagnoses.
          </p>
        </div>
      </footer>
    </div>
  );
}

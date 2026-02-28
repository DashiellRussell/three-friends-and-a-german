"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  ArrowRight,
  Play,
  FileText,
  Phone,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  Check,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

// ─── Feature Card ────────────────────────────────────────────
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().includes("@")) return;
    setSubmitted(true);
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="overflow-hidden rounded-3xl bg-zinc-900 px-6 py-16 text-center sm:px-16">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>
        <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Be first in line
        </h2>
        <p className="mx-auto mb-8 max-w-md text-zinc-400">
          We&apos;re launching soon. Join the waitlist and get early access to
          Kira — your AI health companion.
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
                We&apos;ll reach out when it&apos;s your turn.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-sm gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white/25 focus:bg-white/10"
            />
            <button
              type="submit"
              disabled={!email.includes("@")}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-40"
            >
              Join
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-zinc-600">
          No spam. Unsubscribe anytime. This app does not provide medical
          diagnoses.
        </p>
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Home() {
  const features = [
    {
      icon: <Mic className="h-5 w-5 text-violet-600" strokeWidth={1.8} />,
      title: "Voice check-ins",
      description:
        "2-minute daily conversations that capture mood, symptoms, sleep, and medication — hands-free.",
      accent: "bg-violet-50",
    },
    {
      icon: <FileText className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
      title: "Document analysis",
      description:
        "Upload blood tests, prescriptions, or scans. AI extracts key findings and tracks changes.",
      accent: "bg-sky-50",
    },
    {
      icon: <Phone className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />,
      title: "Proactive calls",
      description:
        "The app calls you for check-ins. No screen needed — just answer the phone and talk.",
      accent: "bg-emerald-50",
    },
    {
      icon: (
        <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={1.8} />
      ),
      title: "Critical flagging",
      description:
        "Concerning symptom patterns trigger immediate alerts, biased toward caution.",
      accent: "bg-amber-50",
    },
    {
      icon: (
        <TrendingUp className="h-5 w-5 text-indigo-600" strokeWidth={1.8} />
      ),
      title: "Trend insights",
      description:
        "See patterns across weeks — energy dips, sleep correlations, symptom frequency.",
      accent: "bg-indigo-50",
    },
    {
      icon: (
        <ClipboardList className="h-5 w-5 text-rose-600" strokeWidth={1.8} />
      ),
      title: "Doctor reports",
      description:
        "One-page health briefs from your data. Print it or show it at your next appointment.",
      accent: "bg-rose-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
              <Mic className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
              Kira
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <Play className="h-3 w-3" />
              Demo
            </Link>
            <a
              href="#waitlist"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              Get early access
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-200/30 via-sky-100/20 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[320px] w-[320px] rounded-full bg-gradient-to-tl from-amber-100/30 to-transparent blur-3xl" />

        <div className="relative mb-8">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
            <div className="absolute inset-0 rounded-full bg-zinc-900/20 animate-[pulse-ring_2s_ease-out_infinite]" />
            <Mic className="h-8 w-8 text-white" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl leading-[1.1]">
          Your health story,
          <br />
          <span className="text-zinc-400">always ready.</span>
        </h1>

        <p className="mt-6 max-w-lg text-lg text-zinc-500 leading-relaxed">
          Voice-first daily check-ins, medical document analysis, and proactive
          care — so your doctor gets the full picture, not a 10-minute snapshot.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#waitlist"
            className="group flex items-center gap-2.5 rounded-full bg-zinc-900 px-7 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/10 active:scale-[0.98]"
          >
            Get early access
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-[15px] font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5" />
            Try the demo
          </Link>
        </div>

        <div className="mt-16 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["bg-violet-400", "bg-sky-400", "bg-amber-400", "bg-emerald-400"].map(
              (bg, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${bg} border-2 border-white text-[10px] font-semibold text-white`}
                >
                  {["S", "M", "A", "J"][i]}
                </div>
              )
            )}
          </div>
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-600">240+</span> people on
            the waitlist
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Features
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Everything between appointments
          </h2>
          <p className="mx-auto mt-4 max-w-md text-zinc-500">
            Your doctor gets 10 minutes. Kira captures the other 10,070.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

      {/* Waitlist */}
      <div id="waitlist">
        <WaitlistSection />
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900">
              <Mic className="h-3 w-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-zinc-400">Kira</span>
          </div>
          <p className="text-xs text-zinc-400">
            Built for the Mistral AI Worldwide Hackathon, Sydney. This app does
            not provide medical diagnoses.
          </p>
        </div>
      </footer>
    </div>
  );
}

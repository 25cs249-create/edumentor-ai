"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Cpu,
  RefreshCw,
  FileText,
  Languages,
  Compass,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const handleLaunchDemo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("edumentor_current_lesson");
        sessionStorage.removeItem("edumentor_current_assessment");
        sessionStorage.removeItem("edumentor_assessment_result");
        sessionStorage.removeItem("edumentor_current_material");
      } catch {
        // Safe fallback if storage access is restricted
      }
    }
    router.push("/learn?demo=newton");
  };
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60 selection:bg-indigo-500 selection:text-white">
      <AppHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
          {/* Subtle warm accent gradients */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-amber-500/10 blur-3xl" />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/70 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>AI PERSONALIZED LEARNING</span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
              An AI teacher that{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent">
                adapts to how you learn.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg sm:leading-relaxed">
              Learn from your material. Watch your AI teacher explain it. Answer questions. Get personalized reteaching when you get stuck.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link href="/learn" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 px-7 shadow-sm shadow-indigo-200">
                  <span>Start Learning</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/learn?demo=newton"
                onClick={handleLaunchDemo}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-7"
                >
                  Try the AI Teacher Demo
                </Button>
              </Link>
            </div>

            {/* HERO PREVIEW CARD: Interactive Learning Room */}
            <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-200/50 sm:p-4 text-left">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                {/* Header within preview */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">
                      Live AI Teaching Room: Newton&apos;s Laws of Motion
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    Adaptive Mode: Active
                  </div>
                </div>

                {/* 2-Column Teaching Preview */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Left: AI Teacher */}
                  <div className="rounded-xl bg-slate-900 p-4 text-white shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-400">AI Teacher</span>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Speaking
                      </span>
                    </div>
                    <div className="my-5 flex flex-col items-center">
                      <div className="h-16 w-16 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-xs shadow-inner">
                        EduMentor
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2.5 text-xs text-slate-200 leading-snug border border-white/10">
                      &ldquo;When a bus suddenly stops, your feet halt with the floor, but your upper body continues forward due to inertia...&rdquo;
                    </div>
                  </div>

                  {/* Right: Visual Explanation Preview */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Dynamic Force Vectors
                      </span>
                      <div className="mt-3 flex items-center justify-center h-28 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-16 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[10px] font-bold">
                            m = 50 kg
                          </div>
                          <ArrowRight className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-mono font-bold text-indigo-700">v = constant</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 italic mt-2">
                      Visual: Inertia of motion preserves momentum until an external force acts.
                    </span>
                  </div>
                </div>

                {/* Bottom: Question Preview */}
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Interactive Check
                  </span>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    &ldquo;If the bus driver slams the brakes on an icy road with zero friction, does your body still move forward?&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TEACHING LOOP FLOW SECTION */}
        <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                How It Works
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                The Adaptive Teaching Loop
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Education tailored to your exact comprehension level at every single step.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { step: "1", title: "Understand", desc: "Assesses goals, level, and uploaded materials." },
                { step: "2", title: "Plan", desc: "Generates a structured, time-budgeted blueprint." },
                { step: "3", title: "Explain", desc: "Builds first-principles intuition with visual models." },
                { step: "4", title: "Question", desc: "Checks true understanding, not rote memory." },
                { step: "5", title: "Evaluate", desc: "Semantic analysis identifies exact misconceptions." },
                { step: "6", title: "Adapt", desc: "Pivots analogies to reteach, reinforce, or advance." },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white mb-2.5">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Intelligent Features
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Built for deep mastery, not superficial skimming
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <BookOpen className="h-5 w-5 text-indigo-600" />,
                  title: "Personalized Lessons",
                  desc: "Custom blueprints structured around your topic, depth, and time budget from 5 to 30 minutes.",
                },
                {
                  icon: <Cpu className="h-5 w-5 text-indigo-600" />,
                  title: "AI Teacher",
                  desc: "Explains step-by-step with warm intuition, physical demonstrations, and subject-aware visuals.",
                },
                {
                  icon: <RefreshCw className="h-5 w-5 text-indigo-600" />,
                  title: "Adaptive Learning",
                  desc: "Deterministic pedagogical feedback that reteaches with fresh analogies when you get stuck.",
                },
                {
                  icon: <FileText className="h-5 w-5 text-indigo-600" />,
                  title: "Learn From Your Materials",
                  desc: "Upload PDFs, DOCX, and PPTX notes. Vector RAG anchors the AI Teacher strictly in your syllabus.",
                },
                {
                  icon: <Languages className="h-5 w-5 text-indigo-600" />,
                  title: "Multilingual",
                  desc: "Natural instruction in English, Hindi, and Indian classroom Hinglish with natural terminology.",
                },
                {
                  icon: <Compass className="h-5 w-5 text-indigo-600" />,
                  title: "Continuous Assessment",
                  desc: "End-of-lesson checks identify strong and weak concepts with targeted revision recommendations.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-16 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-8 sm:p-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Ready to experience 1-on-1 personalized tutoring?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
                Choose any topic, configure your preferred teaching style, and let your AI teacher guide you step by step.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/learn">
                  <Button size="lg" className="gap-2 px-8 shadow-sm">
                    <span>Create Your Lesson</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p>EduMentor AI &bull; Personalized Interactive Learning &bull; Hackathon 2026</p>
      </footer>
    </div>
  );
}

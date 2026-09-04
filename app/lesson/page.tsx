"use client";

import { useSyncExternalStore, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { LessonSectionCard, LessonSectionData } from "@/components/lesson-section-card";
import { Button } from "@/components/ui/button";
import { LessonPlan } from "@/lib/lesson-planner";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Target,
  Sparkles,
  CheckCircle2,
  FileText,
  Languages,
  ArrowRight,
  ShieldCheck,
  Volume2,
  Compass,
} from "lucide-react";

function emptySubscribe() {
  return () => {};
}

function getStoredLessonSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("edumentor_current_lesson");
  } catch {
    return null;
  }
}

function getStoredMaterialSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("edumentor_current_material");
  } catch {
    return null;
  }
}

function LessonContent() {
  const searchParams = useSearchParams();

  const queryTopic = searchParams.get("topic") || "";
  const queryLevel = searchParams.get("level") || "Beginner";
  const queryLanguage = searchParams.get("language") || "English";
  const queryTime = searchParams.get("time") || "10 min";
  const queryGoal = searchParams.get("goal") || "Understand";
  const queryStyle = searchParams.get("style") || "Conceptual";
  const queryMaterial = searchParams.get("material");

  const rawLessonJson = useSyncExternalStore(
    emptySubscribe,
    getStoredLessonSnapshot,
    () => null
  );
  const rawMaterial = useSyncExternalStore(
    emptySubscribe,
    getStoredMaterialSnapshot,
    () => null
  );

  const lessonPlan: LessonPlan | null = useMemo(() => {
    if (!rawLessonJson) return null;
    try {
      const parsed = JSON.parse(rawLessonJson) as LessonPlan;
      if (parsed && typeof parsed === "object" && parsed.title && Array.isArray(parsed.sections)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [rawLessonJson]);

  const materialName = rawMaterial || queryMaterial;

  // Section 8: Empty / Fallback State if no generated lesson exists
  if (!lessonPlan) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50/70">
        <AppHeader />
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="mx-auto max-w-md text-center rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Your lesson hasn&apos;t been created yet.
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Tell your AI teacher what topic you want to master, and we will build a personalized pedagogical lesson plan.
            </p>
            <div className="mt-6">
              <Link href="/learn">
                <Button size="lg" className="w-full gap-2 shadow-sm shadow-indigo-200">
                  <span>Create a Lesson</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Derived values from actual AI Lesson Plan
  const displayTopic = lessonPlan.topic || queryTopic || "Lesson";
  const displayTitle = lessonPlan.title || `${displayTopic} - Personalized Plan`;
  const displayLevel = queryLevel;
  const displayLanguage = lessonPlan.language || queryLanguage;
  const displayDuration = lessonPlan.estimatedMinutes ? `${lessonPlan.estimatedMinutes} min` : queryTime;
  const displayGoal = queryGoal;

  const objectives = Array.isArray(lessonPlan.objectives) && lessonPlan.objectives.length > 0
    ? lessonPlan.objectives
    : [`Grasp foundational principles and core concepts of ${displayTopic}.`];

  const concepts = Array.isArray(lessonPlan.concepts) ? lessonPlan.concepts : [];

  const lessonTimeline: LessonSectionData[] = (lessonPlan.sections || []).map((sec, idx) => ({
    step: idx + 1,
    title: sec.title,
    duration: `${sec.minutes} min`,
    purpose: sec.purpose,
    concepts: concepts.slice(idx * 2, (idx + 1) * 2),
  }));

  // Forward query parameters to /teach
  const teachParams = new URLSearchParams();
  teachParams.set("topic", displayTopic);
  teachParams.set("level", displayLevel);
  teachParams.set("language", displayLanguage);
  teachParams.set("time", displayDuration);
  teachParams.set("goal", displayGoal);
  if (queryStyle) teachParams.set("style", queryStyle);
  if (materialName) teachParams.set("material", materialName);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <AppHeader />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Navigation */}
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Adjust Setup
          </Link>

          {/* Main Lesson Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Your lesson is ready.
                </span>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {displayTitle}
                </h1>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Topic: <span className="font-semibold text-slate-800">{displayTopic}</span>
                </p>
              </div>

              <Link href={`/teach?${teachParams.toString()}`}>
                <Button size="lg" className="w-full sm:w-auto gap-2 shadow-sm shadow-indigo-200 px-6">
                  <span>Start Teaching</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Metadata Chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                Level: <strong className="text-slate-900">{displayLevel}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Languages className="h-3.5 w-3.5 text-slate-400" />
                Language: <strong className="text-slate-900">{displayLanguage}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Duration: <strong className="text-slate-900">{displayDuration}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Target className="h-3.5 w-3.5 text-slate-400" />
                Goal: <strong className="text-slate-900">{displayGoal}</strong>
              </span>

              {materialName && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                  <FileText className="h-3.5 w-3.5" />
                  Grounded: <strong className="text-indigo-900 truncate max-w-[140px]">{materialName}</strong>
                </span>
              )}
            </div>

            {/* AI Teacher Preview Card */}
            <div className="mt-7 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white p-4.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-indigo-400 shadow-sm">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                    AI Teacher Ready
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Prepared with interactive analogies, step-by-step visual diagrams, and adaptive comprehension checks.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200">
                  Adaptive Engine Active
                </span>
              </div>
            </div>

            {/* Concepts Covered Chips */}
            {concepts.length > 0 && (
              <div className="mt-8">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  <Compass className="h-4 w-4 text-indigo-600" />
                  Key Concepts Covered
                </h2>
                <div className="flex flex-wrap gap-2">
                  {concepts.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50/80 border border-indigo-200/70 px-3 py-1 text-xs font-medium text-indigo-800"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Objectives */}
            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                Learning Objectives
              </h2>
              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {objectives.map((obj, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 text-xs text-slate-700 leading-relaxed"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lesson Timeline & Ordered Structure */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Lesson Timeline &amp; Section Breakdown
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  {lessonTimeline.length} Interactive Steps
                </span>
              </div>

              <div className="space-y-3">
                {lessonTimeline.map((item, index) => (
                  <LessonSectionCard
                    key={item.step}
                    section={item}
                    isActive={index === 0} // highlight first section
                  />
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
              <Link href="/learn" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Adjust Setup
                </Button>
              </Link>
              <Link href={`/teach?${teachParams.toString()}`} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 shadow-sm shadow-indigo-200 px-8">
                  <span>Start Teaching</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50">
          <AppHeader />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xs font-medium text-slate-500">Loading personalized lesson...</p>
          </main>
        </div>
      }
    >
      <LessonContent />
    </Suspense>
  );
}

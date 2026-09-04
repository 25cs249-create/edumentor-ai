"use client";

import React, { useMemo, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { LessonPlan } from "@/lib/lesson-planner";
import { AssessmentResult, GeneratedAssessment } from "@/lib/assessment";
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Trophy,
  FileText,
  Lightbulb,
  Compass,
  Sparkles,
  HelpCircle,
  Layers,
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

function getStoredResultSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("edumentor_assessment_result");
  } catch {
    return null;
  }
}

function getStoredAssessmentSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("edumentor_current_assessment");
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

function ReportContent() {
  const rawLessonJson = useSyncExternalStore(
    emptySubscribe,
    getStoredLessonSnapshot,
    () => null
  );

  const rawResultJson = useSyncExternalStore(
    emptySubscribe,
    getStoredResultSnapshot,
    () => null
  );

  const rawAssessmentJson = useSyncExternalStore(
    emptySubscribe,
    getStoredAssessmentSnapshot,
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
      if (parsed && typeof parsed === "object" && parsed.title) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [rawLessonJson]);

  const assessmentResult: AssessmentResult | null = useMemo(() => {
    if (!rawResultJson) return null;
    try {
      const parsed = JSON.parse(rawResultJson) as AssessmentResult;
      if (parsed && typeof parsed === "object" && typeof parsed.score === "number") {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [rawResultJson]);

  const assessment: GeneratedAssessment | null = useMemo(() => {
    if (!rawAssessmentJson) return null;
    try {
      const parsed = JSON.parse(rawAssessmentJson) as GeneratedAssessment;
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [rawAssessmentJson]);

  const materialName =
    rawMaterial ||
    lessonPlan?.sourceMaterial?.documentName ||
    null;

  const displayTopic = lessonPlan?.topic || "Lesson Assessment";

  // 1. Fallback State: Assessment Result Missing
  if (!assessmentResult) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50/70">
        <AppHeader />
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="mx-auto max-w-md text-center rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Your learning report isn&apos;t ready yet.
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Complete your lesson&apos;s final assessment to generate your personalized conceptual mastery breakdown and revision recommendations.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link href="/assessment">
                <Button size="lg" className="w-full gap-2 shadow-sm shadow-indigo-200">
                  <span>Take Assessment</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/teach">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Return to Teaching Room
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Extract values from actual assessment API result
  const score = assessmentResult.score;
  const totalQuestions = assessmentResult.totalQuestions;
  const correctCount = assessmentResult.correctAnswers;
  const partialCount = assessmentResult.partialAnswers;
  const incorrectCount = assessmentResult.incorrectAnswers;

  const strongConcepts = assessmentResult.strongConcepts || [];
  const weakConcepts = assessmentResult.weakConcepts || [];
  const revisionRecommendation = assessmentResult.revisionRecommendation;
  const nextTopic = assessmentResult.nextTopicRecommendation;

  // Extract unique actual misconceptions returned by the evaluator
  const misconceptions = Array.from(
    new Set(
      assessmentResult.questionResults
        ?.map((qr) => qr.evaluation?.misconception)
        .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    )
  );

  // Score description badge
  let masteryLabel = "Foundational understanding";
  let masteryColor = "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 80) {
    masteryLabel = "Strong understanding";
    masteryColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (score >= 60) {
    masteryLabel = "Competent understanding";
    masteryColor = "text-indigo-700 bg-indigo-50 border-indigo-200";
  }

  // Continue Learning link URL
  const nextTopicUrl = nextTopic
    ? `/learn?topic=${encodeURIComponent(nextTopic)}`
    : "/learn";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <AppHeader
        progress={{
          current: score,
          total: 100,
          label: `Mastery: ${score}%`,
        }}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Top Bar: Navigation & Provenance */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Assessment
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-800">
                {displayTopic}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {materialName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/80">
                  <FileText className="h-3 w-3" />
                  Learning grounded in: <strong className="truncate max-w-[150px]">{materialName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Hero Mastery Overview Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="text-center md:text-left space-y-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Trophy className="h-3.5 w-3.5 text-indigo-600" />
                  Your Learning Report
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Learning Mastery
                </h1>
                <p className="text-xs text-slate-500">
                  Comprehensive performance synthesis for <span className="font-semibold text-slate-800">{displayTopic}</span>
                </p>
              </div>

              {/* Prominent Score Pill */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 shadow-2xs">
                  <span className="text-3xl font-extrabold text-indigo-600 leading-none">
                    {score}%
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                    Score
                  </span>
                </div>
                <div className="space-y-1 text-left">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${masteryColor}`}>
                    <Sparkles className="h-3 w-3" />
                    {masteryLabel}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Evaluated across {totalQuestions} conceptual checkpoints
                  </p>
                </div>
              </div>
            </div>

            {/* Assessment Metrics Row */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Questions</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{totalQuestions}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Correct</span>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{correctCount}</p>
              </div>
              <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/60 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-700">Partial</span>
                <p className="text-lg font-bold text-indigo-800 mt-0.5">{partialCount}</p>
              </div>
              <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-700">Incorrect</span>
                <p className="text-lg font-bold text-rose-800 mt-0.5">{incorrectCount}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Concept Mastery (What You Understand vs What to Strengthen) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strong Concepts */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    What You Understand
                  </h2>
                  <span className="text-[10px] text-slate-400">Demonstrated conceptual mastery</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {strongConcepts.length > 0 ? (
                  strongConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {concept}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-1">
                    Review foundational concepts with your AI teacher to achieve mastery badges.
                  </p>
                )}
              </div>
            </div>

            {/* Weak Concepts */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    What to Strengthen
                  </h2>
                  <span className="text-[10px] text-slate-400">Target areas for revision</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {weakConcepts.length > 0 ? (
                  weakConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      {concept}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-emerald-700 font-medium py-1">
                    No major conceptual weaknesses detected. All tested concepts were answered solidly!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Misconceptions to Revisit */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Misconceptions to Revisit
                </h2>
                <span className="text-[10px] text-slate-400">Grounded cognitive feedback</span>
              </div>
            </div>

            {misconceptions.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {misconceptions.map((misconception, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 leading-relaxed"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">Identified Misconception:</strong>
                      <span>{misconception}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  No major misconceptions detected. Your fundamental reasoning aligns accurately with physics principles!
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Question-by-Question Performance Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Question Performance
                  </h2>
                  <span className="text-[10px] text-slate-400">Individual evaluation summary</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {assessmentResult.questionResults?.length || 0} Questions
              </span>
            </div>

            <div className="space-y-3">
              {assessmentResult.questionResults?.map((qr, idx) => {
                const originalQ = assessment?.questions?.find((q) => q.id === qr.questionId);
                const isCorrect = qr.evaluation.result === "correct";
                const isPartial = qr.evaluation.result === "partially_correct";

                return (
                  <div
                    key={qr.questionId || idx}
                    className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 space-y-2 transition-all hover:bg-slate-50/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {qr.concept}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isPartial
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {isCorrect ? "Correct" : isPartial ? "Partially Correct" : "Incorrect"} • {qr.evaluation.score}%
                      </span>
                    </div>

                    {originalQ && (
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {originalQ.question}
                      </p>
                    )}

                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      <strong className="text-slate-800 font-semibold">Teacher Feedback:</strong> {qr.evaluation.feedback}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Revision & Next Topic Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revision Guidance Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Recommended Revision
                  </h2>
                  <span className="text-[10px] text-slate-400">Personalized study guidance</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pt-1">
                {revisionRecommendation}
              </p>
            </div>

            {/* Next Topic Card (Visually Prominent) */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-indigo-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Recommended Next Topic
                  </h2>
                  <span className="text-[10px] text-indigo-500">Your personalized learning path</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900 leading-relaxed pt-1">
                {nextTopic || "Advanced Mechanics & Dynamics"}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Continue your learning journey by building your next AI lesson around this natural progression.
              </p>
            </div>
          </div>

          {/* Section 6: Learning Path Context */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Current Learning Path
                </h2>
                <span className="text-[10px] text-slate-400">Step-by-step curriculum progression</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed Lesson</span>
                  <p className="text-xs font-bold text-slate-900">{displayTopic}</p>
                </div>
              </div>

              <div className="hidden sm:block text-slate-300">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Next Step</span>
                  <p className="text-xs font-bold text-slate-900">{nextTopic || "Next Topic"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Action Buttons Footer */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Link href="/teach">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Review Lesson</span>
                </Button>
              </Link>
              <Link href="/assessment">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Assessment</span>
                </Button>
              </Link>
            </div>

            <Link href={nextTopicUrl}>
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 px-6">
                <span>Continue Learning</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50">
          <AppHeader />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xs font-medium text-slate-500">Loading learning report...</p>
          </main>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}

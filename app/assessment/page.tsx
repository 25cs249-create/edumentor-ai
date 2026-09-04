"use client";

import React, { useState, useEffect, useMemo, useSyncExternalStore, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { LessonPlan } from "@/lib/lesson-planner";
import {
  GeneratedAssessment,
  AssessmentQuestion,
  AssessmentResult,
} from "@/lib/assessment";
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookOpen,
  Trophy,
  FileText,
  BarChart3,
  Lightbulb,
  Clock,
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

function AssessmentContent() {
  const searchParams = useSearchParams();

  const queryTopic = searchParams.get("topic") || "";
  const queryLevel = searchParams.get("level") || "Beginner";
  const queryLanguage = searchParams.get("language") || "English";
  const queryGoal = searchParams.get("goal") || "Understand";
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

  const materialName =
    rawMaterial ||
    queryMaterial ||
    lessonPlan?.sourceMaterial?.documentName ||
    null;

  const displayTopic = lessonPlan?.topic || queryTopic || "Lesson Assessment";
  const displayLanguage = lessonPlan?.language || queryLanguage;
  const normalizedLevel = (queryLevel.toLowerCase() === "intermediate" || queryLevel.toLowerCase() === "advanced")
    ? queryLevel.toLowerCase()
    : "beginner";

  // Assessment Generation States
  const [assessment, setAssessment] = useState<GeneratedAssessment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Question Interaction & Navigation States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Evaluation & Results States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  // Function to load cached assessment or generate once from API
  const loadOrGenerateAssessment = async (lesson: LessonPlan) => {
    if (typeof window !== "undefined") {
      try {
        const cachedStr = sessionStorage.getItem("edumentor_current_assessment");
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr) as GeneratedAssessment;
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            setAssessment(parsed);
            return;
          }
        }
      } catch {
        // Fall back to generate fresh
      }
    }

    setIsGenerating(true);
    setGenError(null);

    try {
      const conceptsList =
        Array.isArray(lesson.concepts) && lesson.concepts.length > 0
          ? lesson.concepts
          : lesson.sections.map((s) => s.title);

      const sourceContext =
        lesson.sourceMaterial?.chunks?.join("\n\n---\n\n") || undefined;

      const summaryText = lesson.sections
        .map((s) => `${s.title}: ${s.purpose || ""}`)
        .join("\n");

      const res = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: lesson.topic,
          concepts: conceptsList,
          language: displayLanguage,
          learnerLevel: normalizedLevel,
          goal: queryGoal,
          questionCount: 5,
          lessonSummary: summaryText,
          sourceContext,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.success || !data.assessment) {
        throw new Error(data?.error || "Failed to generate assessment questions.");
      }

      setAssessment(data.assessment);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("edumentor_current_assessment", JSON.stringify(data.assessment));
      }
    } catch {
      setGenError("The AI Teacher couldn't generate the assessment right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mount effect to initialize assessment
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined = undefined;
    if (lessonPlan && !assessment && !isGenerating && !genError) {
      timer = setTimeout(() => {
        loadOrGenerateAssessment(lessonPlan);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlan]);

  // Handle Option Selection for MCQ
  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Handle Text Answer Input
  const handleTextAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (!assessment) return;
    if (currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit Final Assessment
  const handleSubmitAssessment = async () => {
    if (!assessment || !lessonPlan) return;

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const formattedAnswers = assessment.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id]?.trim() || "No answer provided",
      }));

      const sourceContext =
        lessonPlan.sourceMaterial?.chunks?.join("\n\n---\n\n") || undefined;

      const res = await fetch("/api/assessment/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: assessment.questions,
          answers: formattedAnswers,
          language: displayLanguage,
          learnerLevel: normalizedLevel,
          sourceContext,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.success || !data.result) {
        throw new Error(data?.error || "Failed to evaluate assessment.");
      }

      setResult(data.result);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("edumentor_assessment_result", JSON.stringify(data.result));
      }
    } catch {
      setEvalError("We couldn't evaluate your assessment answers right now. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Retake Assessment handler
  const handleRetake = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    setEvalError(null);
  };

  // 1. Fallback State: No lesson plan in sessionStorage
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
              Your assessment hasn&apos;t been created yet.
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Complete a lesson first or create a personalized learning plan to take your final assessment.
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

  // 2. Loading State: Generating Assessment Questions
  if (isGenerating) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50/70">
        <AppHeader />
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="mx-auto max-w-md text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mx-auto">
              <Sparkles className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Preparing Your Final Assessment
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Synthesizing 5 comprehensive questions aligned with {displayTopic}...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 3. Error State: Generation Failure
  if (genError && !assessment) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50/70">
        <AppHeader />
        <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="mx-auto max-w-md text-center rounded-2xl border border-rose-200 bg-white p-8 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Assessment Generation Failed
            </h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {genError}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                size="lg"
                onClick={() => loadOrGenerateAssessment(lessonPlan)}
                className="w-full gap-2 shadow-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry Generation</span>
              </Button>
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

  const questions: AssessmentQuestion[] = assessment?.questions || [];
  const totalQuestions = questions.length;
  const currentQ: AssessmentQuestion | undefined = questions[currentQuestionIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] || "" : "";
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;

  // 4. Results View: After Final Submission
  if (result) {
    const isHighMastery = result.score >= 80;
    const isGoodMastery = result.score >= 60 && result.score < 80;

    return (
      <div className="flex min-h-screen flex-col bg-slate-50/70">
        <AppHeader
          progress={{
            current: result.score,
            total: 100,
            label: `Score: ${result.score}%`,
          }}
        />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
              <Link
                href="/teach"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Teaching Room
              </Link>
              {materialName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/80">
                  <FileText className="h-3 w-3" />
                  Grounded in: <strong className="truncate max-w-[150px]">{materialName}</strong>
                </span>
              )}
            </div>

            {/* Hero Results Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border ${
                  isHighMastery
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : isGoodMastery
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                <Trophy className="h-8 w-8" />
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Assessment Completed
              </span>

              <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                {result.score}% Mastery Score
              </h1>
              <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto">
                Topic: <span className="font-semibold text-slate-900">{displayTopic}</span>
              </p>

              {/* Quick Stat Pill Row */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-2 text-center min-w-[90px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                  <p className="text-sm font-bold text-slate-800">{result.totalQuestions}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-2 text-center min-w-[90px]">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Correct</span>
                  <p className="text-sm font-bold text-emerald-800">{result.correctAnswers}</p>
                </div>
                <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/60 px-4 py-2 text-center min-w-[90px]">
                  <span className="text-[10px] uppercase font-bold text-indigo-600">Partial</span>
                  <p className="text-sm font-bold text-indigo-800">{result.partialAnswers}</p>
                </div>
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-4 py-2 text-center min-w-[90px]">
                  <span className="text-[10px] uppercase font-bold text-rose-600">Incorrect</span>
                  <p className="text-sm font-bold text-rose-800">{result.incorrectAnswers}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/report">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 px-6">
                    <BarChart3 className="h-4 w-4" />
                    <span>View Learning Report</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/teach">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Review Lesson</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleRetake} className="text-xs text-slate-500 hover:text-slate-800">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Retake Assessment
                </Button>
              </div>
            </div>

            {/* Concepts Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strong Concepts */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Strong Concepts
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.strongConcepts && result.strongConcepts.length > 0 ? (
                    result.strongConcepts.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {c}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Keep practicing to build strong conceptual retention.</p>
                  )}
                </div>
              </div>

              {/* Weak / Focus Concepts */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Focus & Review Areas
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.weakConcepts && result.weakConcepts.length > 0 ? (
                    result.weakConcepts.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        {c}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">No major conceptual weaknesses detected!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revision Guidance */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Recommended Revision
                  </h2>
                </div>
                <p className="mt-4 text-xs text-slate-700 leading-relaxed">
                  {result.revisionRecommendation}
                </p>
              </div>

              {/* Next Topic Guidance */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                    <Compass className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Next Recommended Topic
                  </h2>
                </div>
                <p className="mt-4 text-xs text-slate-700 leading-relaxed font-medium">
                  {result.nextTopicRecommendation}
                </p>
              </div>
            </div>

            {/* Question by Question Evaluation Breakdown */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Detailed Question Breakdown
                </h2>
                <span className="text-[11px] text-slate-400">
                  {result.questionResults?.length || 0} Questions Evaluated
                </span>
              </div>

              <div className="space-y-4">
                {result.questionResults?.map((qr, idx) => {
                  const originalQ = questions.find((q) => q.id === qr.questionId);
                  const isCorrect = qr.evaluation.result === "correct";
                  const isPartial = qr.evaluation.result === "partially_correct";

                  return (
                    <div
                      key={qr.questionId}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Question {idx + 1} • {qr.concept}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isCorrect
                              ? "bg-emerald-100 text-emerald-800"
                              : isPartial
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isCorrect ? "Correct" : isPartial ? "Partially Correct" : "Incorrect"} ({qr.evaluation.score}%)
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800">
                        {originalQ?.question || "Question"}
                      </p>

                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60">
                        <strong className="text-slate-700">Your Answer:</strong>{" "}
                        {answers[qr.questionId] || "No answer provided"}
                      </div>

                      <div className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Feedback:</strong> {qr.evaluation.feedback}
                      </div>

                      {qr.evaluation.misconception && (
                        <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-md border border-rose-200">
                          <strong>Identified Misconception:</strong> {qr.evaluation.misconception}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 5. Active Question View
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <AppHeader
        progress={{
          current: currentQuestionIndex + 1,
          total: totalQuestions,
          label: `Question ${currentQuestionIndex + 1} of ${totalQuestions}`,
        }}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Top Bar: Back Link & Subject Info */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/teach"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Teaching Room
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
                  Assessment grounded in: <strong className="truncate max-w-[140px]">{materialName}</strong>
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>
          </div>

          {/* Assessment Title Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {assessment?.title || `${displayTopic} Final Assessment`}
                  </h1>
                  <span className="text-[10px] text-slate-400">
                    Comprehensive Conceptual Mastery Check
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Self-Paced
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Answer the following 5 questions to assess your understanding of the concepts covered in this lesson.
              You can navigate between questions and review your answers before final submission.
            </p>
          </div>

          {/* Error Banner if evaluation fails */}
          {evalError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{evalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setEvalError(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Current Question Card */}
          {currentQ && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question Metadata Header */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Type: <strong className="text-slate-700">{currentQ.type.replace("_", " ")}</strong>
                </span>
              </div>

              {/* Question Body */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Concept: {currentQ.concept}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {currentQ.question}
                </h2>
              </div>

              {/* Answer Input Section */}
              <div className="pt-2">
                {currentQ.options && currentQ.options.length > 0 ? (
                  // MCQ Options
                  <div className="space-y-2.5">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = currentAnswer === option;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.id, option)}
                          className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-2xs ring-1 ring-indigo-600"
                              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-relaxed flex-1">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Textual/Conceptual Input
                  <div className="space-y-2">
                    <label
                      htmlFor="text-answer"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Your Explanation / Answer
                    </label>
                    <textarea
                      id="text-answer"
                      rows={5}
                      value={currentAnswer}
                      onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
                      placeholder="Explain your conceptual reasoning clearly in your own words..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-4 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Express your first-principles understanding</span>
                      <span>{currentAnswer.length} characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Question Navigation Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0}
                  className="gap-1.5 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmitAssessment}
                    disabled={isEvaluating}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                  >
                    {isEvaluating ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>Evaluating Assessment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Submit Final Assessment</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Question Dots Navigator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]?.trim());
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-600/30"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                  title={`Question ${idx + 1}: ${isAnswered ? "Answered" : "Unanswered"}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50">
          <AppHeader />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xs font-medium text-slate-500">Loading assessment...</p>
          </main>
        </div>
      }
    >
      <AssessmentContent />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { LearningOption } from "@/components/learning-option";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  X,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  Languages,
  Zap,
  AlertCircle,
} from "lucide-react";

function LearnForm({ isDemoMode }: { isDemoMode: boolean }) {
  const router = useRouter();

  const [topic, setTopic] = useState(() => (isDemoMode ? "Newton's Laws of Motion" : ""));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState(() => (isDemoMode ? "Hinglish" : "English"));
  const [availableTime, setAvailableTime] = useState("10 min");
  const [goal, setGoal] = useState(() => (isDemoMode ? "Exam Prep" : "Understand"));
  const [teachingStyle, setTeachingStyle] = useState("Conceptual");
  const [depth, setDepth] = useState("Standard");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Building your personalized lesson...");
  const [error, setError] = useState<string | null>(null);

  // Document Upload & Ingestion State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadError(null);
    setUploadedDocName(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success || !data.filename) {
        throw new Error(data?.error || "Failed to process document.");
      }

      setUploadedDocName(data.filename);
    } catch {
      setUploadError("Could not ingest document. Please try again or use another file.");
      setUploadedDocName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedDocName(null);
    setUploadError(null);
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (selectedFile && uploadError) {
      setError("Document ingestion failed. Please remove or re-upload your document before proceeding.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingStage("Understanding your goal...");

    const chosenTopic = topic.trim() ? topic.trim() : "Newton's Laws of Motion";
    const minutes = parseInt(availableTime.replace(/[^0-9]/g, ""), 10) || 10;
    const normalizedLevel = level.toLowerCase();

    // Subtle progression of stages while awaiting the Gemini call
    const timer1 = setTimeout(() => {
      setLoadingStage("Planning the lesson structure...");
    }, 1500);

    const timer2 = setTimeout(() => {
      setLoadingStage("Personalizing the path & concepts...");
    }, 3200);

    try {
      // 1. Retrieve RAG chunks if uploaded document exists
      let retrievedSourceContext: string | undefined = undefined;
      let retrievedChunksForStorage: string[] = [];

      if (uploadedDocName) {
        setLoadingStage("Retrieving relevant source material...");
        try {
          const ragRes = await fetch("/api/rag/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: chosenTopic,
              matchCount: 4,
              documentName: uploadedDocName,
            }),
          });

          const ragData = await ragRes.json().catch(() => null);
          if (ragRes.ok && ragData && ragData.results && ragData.results.length > 0) {
            retrievedChunksForStorage = ragData.results.map((r: { content: string }) => r.content);
            retrievedSourceContext = retrievedChunksForStorage.join("\n\n---\n\n");
          }
        } catch {
          // Graceful fallback: continue with topic-only if vector search has edge error
        }
      }

      // 2. Request AI Lesson Plan
      const response = await fetch("/api/lesson/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: chosenTopic,
          level: normalizedLevel,
          goal: goal.trim(),
          availableMinutes: minutes,
          language: language.trim(),
          teachingStyle: teachingStyle,
          depth: depth,
          sourceContext: retrievedSourceContext,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success || !data.lessonPlan) {
        throw new Error(data?.error || "Failed to generate lesson plan.");
      }

      // Store generated plan and minimal source reference in browser sessionStorage
      if (typeof window !== "undefined") {
        const planToStore = {
          ...data.lessonPlan,
          sourceMaterial: uploadedDocName
            ? {
                documentName: uploadedDocName,
                chunks: retrievedChunksForStorage.slice(0, 4),
              }
            : undefined,
        };
        sessionStorage.setItem("edumentor_current_lesson", JSON.stringify(planToStore));

        if (uploadedDocName) {
          sessionStorage.setItem("edumentor_current_material", uploadedDocName);
        } else {
          sessionStorage.removeItem("edumentor_current_material");
        }
      }

      const params = new URLSearchParams();
      params.set("topic", chosenTopic);
      params.set("level", level);
      params.set("language", language);
      params.set("time", `${minutes} min`);
      params.set("goal", goal);
      if (uploadedDocName) params.set("material", uploadedDocName);

      router.push(`/lesson?${params.toString()}`);
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setError("We couldn't build the lesson right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <AppHeader />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Back Navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>

          {/* Hackathon Showcase Preset Banner (visible only when demo=newton) */}
          {isDemoMode && (
            <div className="mb-6 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-indigo-50/90 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                    ⚡
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-950">Hackathon Showcase</span>
                      <span className="inline-flex items-center rounded-full bg-indigo-100/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Preset Active
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      Newton&apos;s Laws • Beginner • Hinglish • 10 min • Exam Prep
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 sm:text-right font-medium">
                  One click to experience the complete adaptive AI Teacher flow.
                </p>
              </div>
            </div>
          )}

          {/* Page Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Let&apos;s build your lesson.
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Tell your AI teacher how you want to learn.
            </p>
          </div>

          {/* Friendly Error Banner */}
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main 2-Column Grid */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: Configuration Form (8 cols) */}
            <div className="space-y-6 lg:col-span-8">
              {/* Card 1: Topic */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
                <label
                  htmlFor="topic"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Topic or Subject
                </label>
                <div className="mt-2.5">
                  <input
                    type="text"
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion, Ohm's Law, Photosynthesis"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Tip: Leave blank to run the interactive showcase on <span className="font-semibold text-indigo-600">Newton&apos;s Laws of Motion</span>.
                </p>
              </div>

              {/* Card 2: Upload Material */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Upload Study Material (Optional)
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    PDF, DOCX, PPTX, TXT
                  </span>
                </div>

                {uploadError && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-medium text-rose-800 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {!selectedFile ? (
                  <label
                    htmlFor="material-upload"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300/90 bg-slate-50/50 p-6 text-center cursor-pointer transition-all hover:border-indigo-500 hover:bg-indigo-50/30 select-none"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-2xs mb-2">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Click or drag your course notes or lecture slides here
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Our RAG retrieval engine anchors the AI Teacher directly in your documents
                    </span>
                    <input
                      id="material-upload"
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                        {isUploading ? (
                          <Sparkles className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {selectedFile.name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {isUploading ? (
                            <span className="text-indigo-600 font-medium animate-pulse">
                              Ingesting & vector indexing...
                            </span>
                          ) : uploadedDocName ? (
                            <span className="text-emerald-700 font-medium">
                              Indexed & Grounding Ready
                            </span>
                          ) : (
                            `${(selectedFile.size / 1024).toFixed(1)} KB`
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card 3: Pedagogical Settings */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <LearningOption
                  label="Learner Level"
                  value={level}
                  onChange={setLevel}
                  options={[
                    { value: "Beginner", label: "Beginner", icon: <BookOpen className="h-3.5 w-3.5" /> },
                    { value: "Intermediate", label: "Intermediate", icon: <Zap className="h-3.5 w-3.5" /> },
                    { value: "Advanced", label: "Advanced", icon: <Target className="h-3.5 w-3.5" /> },
                  ]}
                />

                <LearningOption
                  label="Learning Goal"
                  value={goal}
                  onChange={setGoal}
                  options={[
                    { value: "Understand", label: "Understand" },
                    { value: "Exam Prep", label: "Exam Prep" },
                    { value: "Interview", label: "Interview Prep" },
                  ]}
                />

                <LearningOption
                  label="Explanation Language"
                  value={language}
                  onChange={setLanguage}
                  options={[
                    { value: "English", label: "English" },
                    { value: "Hindi", label: "Hindi" },
                    { value: "Hinglish", label: "Hinglish (Classroom)" },
                  ]}
                />

                <LearningOption
                  label="Time Budget"
                  value={availableTime}
                  onChange={setAvailableTime}
                  options={[
                    { value: "5 min", label: "5 min" },
                    { value: "10 min", label: "10 min" },
                    { value: "20 min", label: "20 min" },
                    { value: "30 min", label: "30 min" },
                  ]}
                />

                <LearningOption
                  label="Teaching Style"
                  value={teachingStyle}
                  onChange={setTeachingStyle}
                  options={[
                    { value: "Conceptual", label: "Conceptual" },
                    { value: "Practical", label: "Practical" },
                    { value: "Socratic", label: "Socratic" },
                    { value: "Visual", label: "Visual" },
                  ]}
                />

                <LearningOption
                  label="Pacing / Depth"
                  value={depth}
                  onChange={setDepth}
                  options={[
                    { value: "Quick", label: "Quick Overview" },
                    { value: "Standard", label: "Standard" },
                    { value: "Deep", label: "Deep Dive" },
                  ]}
                />
              </div>
            </div>

            {/* Right Column: Sticky Summary & CTA Card (4 cols) */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Lesson Personalization
                    </h2>
                    <span className="text-[10px] text-slate-400">
                      Real-time configuration summary
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
                  Your AI teacher will personalize this lesson based on your preferences:
                </p>

                {/* Summary Parameters List */}
                <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      Level
                    </span>
                    <span className="font-semibold text-slate-900">{level}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-slate-400" />
                      Goal
                    </span>
                    <span className="font-semibold text-slate-900">{goal}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-slate-400" />
                      Language
                    </span>
                    <span className="font-semibold text-slate-900">{language}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Time
                    </span>
                    <span className="font-semibold text-slate-900">{availableTime}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-slate-400" />
                      Teaching Style
                    </span>
                    <span className="font-semibold text-slate-900">{teachingStyle}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                      Depth
                    </span>
                    <span className="font-semibold text-slate-900">{depth}</span>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center justify-between text-indigo-700 font-semibold pt-1 border-t border-slate-200/60">
                      <span className="text-indigo-600 flex items-center gap-1.5 text-[11px]">
                        <FileText className="h-3.5 w-3.5" />
                        Grounded File
                      </span>
                      <span className="truncate max-w-[120px] text-[11px]">{selectedFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Primary CTA & Polished Loading State */}
                <div className="mt-5 space-y-3">
                  {isLoading && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-center shadow-xs">
                      <div className="flex items-center justify-center gap-2 text-indigo-700">
                        <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">{loadingStage}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Crafting personalized objectives &amp; interactive sections...
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full gap-2 shadow-sm shadow-indigo-200"
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>Building Lesson...</span>
                      </>
                    ) : (
                      <>
                        <span>Build My Lesson</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <p className="mt-2.5 text-center text-[11px] text-slate-400">
                  Instant lesson plan generation with Gemini
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function LearnContent() {
  const searchParams = useSearchParams();
  const demoParam = searchParams.get("demo");
  const isDemoMode = demoParam === "newton";

  return <LearnForm key={demoParam || "normal"} isDemoMode={isDemoMode} />;
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50/70">
          <AppHeader />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xs font-medium text-slate-500">Loading lesson setup...</p>
          </main>
        </div>
      }
    >
      <LearnContent />
    </Suspense>
  );
}

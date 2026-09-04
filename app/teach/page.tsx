"use client";

import { useState, useEffect, useMemo, useSyncExternalStore, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AiTeacherCard, AudioState, VideoState } from "@/components/ai-teacher-card";
import { VisualExplanation } from "@/components/visual-explanation";
import { QuestionCard } from "@/components/question-card";
import { AdaptiveState, TeachingUiState } from "@/components/adaptive-state";
import { Button } from "@/components/ui/button";
import { LessonPlan } from "@/lib/lesson-planner";
import { TeachingStep } from "@/lib/teacher";
import { AnswerEvaluation } from "@/lib/evaluator";
import { buildConciseVideoScript } from "@/lib/tavus";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Trophy,
  FileText,
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

function TeachingRoom() {
  const searchParams = useSearchParams();

  const queryTopic = searchParams.get("topic") || "";
  const queryLevel = searchParams.get("level") || "Beginner";
  const queryLanguage = searchParams.get("language") || "English";
  const queryStyle = searchParams.get("style") || "conceptual";
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

  // Section index (0-indexed)
  const [sectionIndex, setSectionIndex] = useState<number>(0);
  const [teachingStep, setTeachingStep] = useState<TeachingStep | null>(null);
  const [isGeneratingStep, setIsGeneratingStep] = useState<boolean>(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Evaluation & Adaptation States
  const [uiState, setUiState] = useState<TeachingUiState>("teaching");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluatorError, setEvaluatorError] = useState<string | null>(null);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState<string>("");
  const [misconception, setMisconception] = useState<string | null>(null);
  const [adaptiveActionData, setAdaptiveActionData] = useState<{
    action: "advance" | "reinforce" | "reteach";
    reason: string;
    instruction: string;
  } | null>(null);

  const [isLessonComplete, setIsLessonComplete] = useState<boolean>(false);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  // Normalized parameters
  const normalizedLevel = (queryLevel.toLowerCase() === "intermediate" || queryLevel.toLowerCase() === "advanced")
    ? queryLevel.toLowerCase()
    : "beginner";
  const displayLanguage = lessonPlan?.language || queryLanguage;
  const displayTopic = lessonPlan?.topic || queryTopic || "Lesson";

  // Azure TTS Audio Voice State & Controls
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [audioVoiceName, setAudioVoiceName] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const activeAudioUrlRef = useRef<string | null>(null);

  const loadAudioForStep = async (step: TeachingStep, lang: string) => {
    // 1. Stop and cleanup any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const spokenScript = step.example
      ? `${step.explanation} For example, ${step.example}`
      : step.explanation;

    const cacheKey = `${lang}::${spokenScript}`;

    // 2. Check client-side session cache to avoid redundant Azure calls
    if (audioCacheRef.current.has(cacheKey)) {
      const cachedUrl = audioCacheRef.current.get(cacheKey)!;
      activeAudioUrlRef.current = cachedUrl;
      if (audioRef.current) {
        audioRef.current.src = cachedUrl;
      }
      setAudioState("ready");
      return;
    }

    // 3. Fetch from POST /api/tts
    setAudioState("loading");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: spokenScript,
          language: lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis request returned status ${response.status}`);
      }

      const voice = response.headers.get("x-voice-name") || undefined;
      setAudioVoiceName(voice);

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      audioCacheRef.current.set(cacheKey, audioUrl);
      activeAudioUrlRef.current = audioUrl;

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }

      setAudioState("ready");
    } catch {
      // Non-blocking fallback: allow student to continue reading smoothly
      setAudioState("error");
    }
  };

  const handlePlayAudio = () => {
    // Prevent dual audio: pause video if playing
    const videoElem = document.querySelector("video");
    if (videoElem && !videoElem.paused) {
      videoElem.pause();
    }

    if (audioRef.current && activeAudioUrlRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setAudioState("playing");
        })
        .catch(() => {
          setAudioState("ready");
        });
    }
  };

  const handlePauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioState("paused");
    }
  };

  const handleReplayAudio = () => {
    // Prevent dual audio: pause video if playing
    const videoElem = document.querySelector("video");
    if (videoElem && !videoElem.paused) {
      videoElem.pause();
    }

    if (audioRef.current && activeAudioUrlRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => {
          setAudioState("playing");
        })
        .catch(() => {
          setAudioState("ready");
        });
    }
  };

  // Tavus AI Video State & Controls (Lesson/Session-level: generated AT MOST ONCE per lesson)
  const [videoState, setVideoState] = useState<VideoState>("idle");
  const transitionVideoState = (newState: VideoState) => {
    console.log(`[TAVUS] videoState transition: ${newState}`);
    setVideoState(newState);
  };
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoHostedUrl, setVideoHostedUrl] = useState<string | null>(null);
  const [isFallbackVideo, setIsFallbackVideo] = useState<boolean>(false);
  const videoCacheRef = useRef<Map<string, { videoUrl: string; hostedUrl?: string; isFallback?: boolean }>>(new Map());
  const videoPollTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Session/Lesson-level Tavus generation tracking (requested AT MOST ONCE per lesson)
  const currentLessonKey = lessonPlan ? `${lessonPlan.title}::${lessonPlan.topic}` : null;
  const [prevLessonKey, setPrevLessonKey] = useState<string | null>(currentLessonKey);
  const [hasRequestedTavusForLesson, setHasRequestedTavusForLesson] = useState<boolean>(false);

  // Reset lesson-level video state when navigating to a new lesson or topic
  if (currentLessonKey !== prevLessonKey) {
    setPrevLessonKey(currentLessonKey);
    setHasRequestedTavusForLesson(false);
    transitionVideoState("idle");
    setVideoUrl(null);
    setVideoHostedUrl(null);
    setIsFallbackVideo(false);
  }

  // Clean up polling timer on lesson change or unmount
  useEffect(() => {
    return () => {
      if (videoPollTimerRef.current) {
        clearInterval(videoPollTimerRef.current);
        videoPollTimerRef.current = null;
      }
    };
  }, [currentLessonKey]);

  const handleVideoPlay = () => {
    // Prevent dual audio: pause Azure audio when video starts playing
    handlePauseAudio();
  };

  const loadVideoForLesson = async (step: TeachingStep) => {
    // 1. Clear any active polling timer
    if (videoPollTimerRef.current) {
      clearInterval(videoPollTimerRef.current);
      videoPollTimerRef.current = null;
    }

    // Build concise interactive teaching video script (70-110 words) for the first lesson step
    const script = buildConciseVideoScript(step.explanation, step.example, false);

    const cacheKey = `${displayLanguage}::${displayTopic}::${step.sectionTitle}::${script}`;

    // 2. Check client-side session cache to avoid duplicate generation
    if (videoCacheRef.current.has(cacheKey)) {
      const cached = videoCacheRef.current.get(cacheKey)!;
      setVideoUrl(cached.videoUrl);
      setVideoHostedUrl(cached.hostedUrl || null);
      setIsFallbackVideo(Boolean(cached.isFallback));
      transitionVideoState("ready");
      return;
    }

    setVideoUrl(null);
    setVideoHostedUrl(null);
    setIsFallbackVideo(false);
    transitionVideoState("preparing");
    console.log("[TAVUS] generation started");

    try {
      const response = await fetch("/api/tavus/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          videoName: `EduMentor - ${displayTopic} - ${step.sectionTitle}`,
          language: displayLanguage,
        }),
      });

      console.log(`[TAVUS] POST response status: ${response.status}`);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success || !data.videoId) {
        throw new Error(data?.error || "Failed to initiate video generation");
      }

      const videoId = data.videoId;
      console.log(`[TAVUS] videoId: ${videoId}`);
      console.log(`[TAVUS] Tavus video status: ${data.status}`);
      console.log(`[TAVUS] hostedUrl: ${data.hostedUrl || "none"}`);
      console.log(`[TAVUS] downloadUrl: ${data.downloadUrl || "none"}`);
      console.log(`[TAVUS] streamUrl: ${data.streamUrl || "none"}`);
      setVideoHostedUrl(data.hostedUrl || null);

      // If already ready immediately with directly playable media URL (e.g. verified demo fallback or instant cache)
      if (data.status === "ready" && (data.downloadUrl || data.streamUrl)) {
        const directUrl = data.downloadUrl || data.streamUrl;
        console.log(`[TAVUS] final resolved media URL: ${directUrl}`);
        setVideoUrl(directUrl);
        setIsFallbackVideo(Boolean(data.isFallback));
        transitionVideoState("ready");
        videoCacheRef.current.set(cacheKey, { videoUrl: directUrl, hostedUrl: data.hostedUrl, isFallback: Boolean(data.isFallback) });
        return;
      }

      // Generation request successfully started! Keep videoState as "preparing" and poll for this ONE lesson video
      transitionVideoState("preparing");

      // 3. Poll video status every 5 seconds (up to 24 attempts = 120s)
      let pollAttempts = 0;
      const maxPollAttempts = 24;

      videoPollTimerRef.current = setInterval(async () => {
        pollAttempts++;
        console.log(`[TAVUS] polling attempt number: ${pollAttempts}`);
        try {
          const pollRes = await fetch(`/api/tavus/video?videoId=${encodeURIComponent(videoId)}`);
          console.log(`[TAVUS] poll response status: ${pollRes.status}`);
          const pollData = await pollRes.json().catch(() => null);

          if (pollRes.ok && pollData && pollData.success) {
            console.log(`[TAVUS] Tavus video status: ${pollData.status}`);
            console.log(`[TAVUS] hostedUrl: ${pollData.hostedUrl || "none"}`);
            console.log(`[TAVUS] downloadUrl: ${pollData.downloadUrl || "none"}`);
            console.log(`[TAVUS] streamUrl: ${pollData.streamUrl || "none"}`);

            if (pollData.status === "ready" && (pollData.downloadUrl || pollData.streamUrl)) {
              const directUrl = pollData.downloadUrl || pollData.streamUrl;
              console.log(`[TAVUS] final resolved media URL: ${directUrl}`);
              setVideoUrl(directUrl);
              setIsFallbackVideo(Boolean(pollData.isFallback));
              transitionVideoState("ready");
              videoCacheRef.current.set(cacheKey, { videoUrl: directUrl, hostedUrl: pollData.hostedUrl, isFallback: Boolean(pollData.isFallback) });

              if (videoPollTimerRef.current) {
                clearInterval(videoPollTimerRef.current);
                videoPollTimerRef.current = null;
              }
              return;
            } else if (pollData.status === "error") {
              transitionVideoState("error");
              if (videoPollTimerRef.current) {
                clearInterval(videoPollTimerRef.current);
                videoPollTimerRef.current = null;
              }
              return;
            }
            // Retain preparing state while queued, generating, or rendering in background
            transitionVideoState("preparing");
          }
        } catch {
          // Network blip, retry next tick
        }

        if (pollAttempts >= maxPollAttempts) {
          if (videoPollTimerRef.current) {
            clearInterval(videoPollTimerRef.current);
            videoPollTimerRef.current = null;
          }
          transitionVideoState("error");
        }
      }, 5000);
    } catch {
      transitionVideoState("error");
    }
  };

  // Cleanup polling timer on component unmount
  useEffect(() => {
    return () => {
      if (videoPollTimerRef.current) {
        clearInterval(videoPollTimerRef.current);
        videoPollTimerRef.current = null;
      }
    };
  }, []);

  // Function to load/generate real teaching step from API
  const loadTeachingStep = async (targetSectionIdx: number, adaptiveInstruction?: string) => {
    if (!lessonPlan || !lessonPlan.sections || lessonPlan.sections.length === 0) return;

    const targetSection = lessonPlan.sections[targetSectionIdx];
    if (!targetSection) return;

    const targetConcept =
      (lessonPlan.concepts && lessonPlan.concepts[targetSectionIdx]) ||
      targetSection.title;

    await Promise.resolve();
    setIsGeneratingStep(true);
    setTeacherError(null);
    setEvaluatorError(null);
    setFeedback("");
    setScore(undefined);
    setMisconception(null);
    setAdaptiveActionData(null);

    // UI state transition
    if (adaptiveInstruction) {
      setUiState(adaptiveActionData?.action === "reteach" ? "reteaching" : "teaching");
    } else {
      setUiState("teaching");
    }

    try {
      // 1. If grounded material exists, retrieve section-specific chunks or use stored context
      let stepSourceContext: string | undefined = undefined;
      if (materialName) {
        try {
          const ragRes = await fetch("/api/rag/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `${targetConcept} ${targetSection.title}`,
              matchCount: 3,
              documentName: materialName,
            }),
          });
          const ragData = await ragRes.json().catch(() => null);
          if (ragRes.ok && ragData && ragData.results && ragData.results.length > 0) {
            stepSourceContext = ragData.results
              .map((r: { content: string }) => r.content)
              .join("\n\n---\n\n");
          }
        } catch {
          // Graceful fallback to stored chunks
          const storedChunks = lessonPlan.sourceMaterial?.chunks;
          if (storedChunks && storedChunks.length > 0) {
            stepSourceContext = storedChunks.join("\n\n---\n\n");
          }
        }
      }

      // 2. Call Teacher API
      const response = await fetch("/api/teach/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlan: {
            title: lessonPlan.title,
            topic: lessonPlan.topic,
            sections: lessonPlan.sections,
            nextTopic: lessonPlan.nextTopic,
          },
          currentSection: targetSection,
          currentConcept: targetConcept,
          language: displayLanguage,
          learnerLevel: normalizedLevel,
          teachingStyle: queryStyle,
          sourceContext: stepSourceContext,
          adaptiveInstruction,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success || !data.teachingStep) {
        throw new Error(data?.error || "Failed to load teaching step.");
      }

      setTeachingStep(data.teachingStep);
      setUiState("question");
      loadAudioForStep(data.teachingStep, displayLanguage);

      // Trigger ONE Tavus AI Teacher video request per lesson session using the first meaningful teaching step
      if (!hasRequestedTavusForLesson && targetSectionIdx === 0 && !adaptiveInstruction) {
        setHasRequestedTavusForLesson(true);
        loadVideoForLesson(data.teachingStep);
      }
    } catch {
      setTeacherError("The AI Teacher couldn't prepare this step. Please try again.");
    } finally {
      setIsGeneratingStep(false);
    }
  };

  // Initial fetch on component mount when lesson plan is available
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined = undefined;
    if (lessonPlan && !teachingStep) {
      timer = setTimeout(() => {
        loadTeachingStep(0);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlan]);

  // Handle student answer submission
  const handleAnswerSubmit = async (studentAnswer: string) => {
    if (!teachingStep) return;

    setIsEvaluating(true);
    setUiState("thinking");
    setEvaluatorError(null);

    try {
      // 1. Call POST /api/evaluate
      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: teachingStep.question.question,
          questionType: teachingStep.question.type,
          expectedConcept: teachingStep.question.expectedConcept, // Backend-only: Never displayed to user
          studentAnswer,
          language: displayLanguage,
          learnerLevel: normalizedLevel,
        }),
      });

      const evalData = await evalRes.json().catch(() => null);

      if (!evalRes.ok || !evalData || !evalData.success || !evalData.evaluation) {
        throw new Error(evalData?.error || "Failed to evaluate answer.");
      }

      const currentEval: AnswerEvaluation = evalData.evaluation;
      setScore(currentEval.score);
      setFeedback(currentEval.feedback);
      setMisconception(currentEval.misconception);

      // 2. Call POST /api/adapt
      try {
        const adaptRes = await fetch("/api/adapt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluation: currentEval }),
        });

        const adaptData = await adaptRes.json().catch(() => null);

        if (adaptRes.ok && adaptData && adaptData.success) {
          const actionObj = adaptData.adaptation || adaptData;
          setAdaptiveActionData({
            action: actionObj.action,
            reason: actionObj.reason,
            instruction: actionObj.instruction,
          });
        } else {
          // Safe deterministic fallback
          fallbackAdaptiveAction(currentEval.result);
        }
      } catch {
        fallbackAdaptiveAction(currentEval.result);
      }

      // 3. Set UI state according to evaluation result
      if (currentEval.result === "correct") {
        setUiState("correct");
      } else if (currentEval.result === "partially_correct") {
        setUiState("partially_correct");
      } else {
        setUiState("incorrect");
      }
    } catch {
      setEvaluatorError("We couldn't evaluate that answer. Please try again.");
      setUiState("question");
    } finally {
      setIsEvaluating(false);
    }
  };

  const fallbackAdaptiveAction = (res: "correct" | "partially_correct" | "incorrect") => {
    if (res === "correct") {
      setAdaptiveActionData({
        action: "advance",
        reason: "Concept mastered.",
        instruction: "Proceed to next section.",
      });
    } else if (res === "partially_correct") {
      setAdaptiveActionData({
        action: "reinforce",
        reason: "Partial understanding.",
        instruction: "Reinforce key missing terminology and ask a follow-up question.",
      });
    } else {
      setAdaptiveActionData({
        action: "reteach",
        reason: "Concept misunderstanding or misconception detected.",
        instruction: "Reteach using a completely different analogy, simplify the mechanism, and ask a simpler question.",
      });
    }
  };

  // Section 13: Correct -> Advance
  const handleContinue = () => {
    if (!lessonPlan || !lessonPlan.sections) return;

    // Pause video if playing before continuing to next section
    const videoElem = document.querySelector("video");
    if (videoElem && !videoElem.paused) {
      videoElem.pause();
    }

    const nextIndex = sectionIndex + 1;
    if (nextIndex < lessonPlan.sections.length) {
      setTransitionMessage("Concept understood! Moving to the next section...");
      setTimeout(() => {
        setSectionIndex(nextIndex);
        loadTeachingStep(nextIndex);
        setTransitionMessage(null);
      }, 700);
    } else {
      setIsLessonComplete(true);
    }
  };

  // Section 14: Partial -> Reinforce
  const handleReinforce = () => {
    setUiState("adapting");
    loadTeachingStep(sectionIndex, adaptiveActionData?.instruction);
  };

  // Section 15: Incorrect -> Reteach
  const handleReteach = () => {
    setUiState("adapting");
    loadTeachingStep(sectionIndex, adaptiveActionData?.instruction);
  };

  // Section 18: Reset Demo back to section 1
  const handleResetDemo = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioState("idle");

    if (videoPollTimerRef.current) {
      clearInterval(videoPollTimerRef.current);
      videoPollTimerRef.current = null;
    }
    setHasRequestedTavusForLesson(false);
    transitionVideoState("idle");
    setVideoUrl(null);
    setVideoHostedUrl(null);
    setIsFallbackVideo(false);

    setSectionIndex(0);
    setIsLessonComplete(false);
    loadTeachingStep(0);
  };

  // Section 3: Fallback if no lesson plan exists in sessionStorage
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
              Configure your topic, level, and learning style to generate your personalized AI lesson plan.
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

  const currentSectionData = lessonPlan.sections[sectionIndex] || {
    title: "Lesson Section",
    minutes: 5,
    purpose: "Explore the core concept",
  };
  const totalSectionsCount = lessonPlan.sections.length;
  const currentConceptName =
    (lessonPlan.concepts && lessonPlan.concepts[sectionIndex]) || currentSectionData.title;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <AppHeader
        progress={{
          current: sectionIndex + 1,
          total: totalSectionsCount,
          label: `Section ${sectionIndex + 1} of ${totalSectionsCount}: ${currentSectionData.title}`,
        }}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Top Navigation & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/lesson"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Lesson Plan
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-800">
                {displayTopic}
              </span>
              {materialName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/80">
                    <FileText className="h-3 w-3" />
                    Grounded in: <strong className="truncate max-w-[150px]">{materialName}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDemo}
                className="gap-1 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restart Lesson</span>
              </Button>
              <Link href="/learn">
                <Button variant="ghost" size="sm" className="text-xs text-slate-600">
                  New Topic
                </Button>
              </Link>
            </div>
          </div>

          {/* Section Stepper & Progress Indicator (Requirement 3) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Section {sectionIndex + 1} of {totalSectionsCount}
                </span>
                <span className="text-sm font-bold text-slate-800 truncate max-w-sm">
                  {currentSectionData.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{Math.round(((sectionIndex + (uiState === "correct" ? 1 : 0.5)) / totalSectionsCount) * 100)}% Complete</span>
              </div>
            </div>

            {/* Stepper Pills Track */}
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
              {lessonPlan.sections.map((sec, idx) => {
                const isCompleted = idx < sectionIndex || (idx === sectionIndex && uiState === "correct");
                const isCurrent = idx === sectionIndex && uiState !== "correct";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all border",
                      isCompleted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isCurrent
                        ? "bg-indigo-50/90 text-indigo-950 border-indigo-300 ring-1 ring-indigo-300/40 shadow-xs"
                        : "bg-slate-50 text-slate-500 border-slate-200/70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-600"
                      )}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </span>
                    <span className="truncate max-w-[140px] text-[11px]">
                      {sec.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* End-of-Section Transition Notice (Requirement 12) */}
          {transitionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-center text-sm font-bold text-emerald-900 shadow-sm animate-pulse flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{transitionMessage}</span>
            </div>
          )}

          {/* Lesson Complete Celebration View */}
          {isLessonComplete ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
                <Trophy className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Lesson Complete!
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Outstanding work! You have successfully mastered all sections of{" "}
                <span className="font-semibold text-slate-900">{displayTopic}</span>.
              </p>

              {lessonPlan.concepts && lessonPlan.concepts.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  {lessonPlan.concepts.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/assessment">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    <span>Take Final Assessment</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={handleResetDemo}>
                  Review From Beginning
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banners if any API failed */}
              {teacherError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{teacherError}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadTeachingStep(sectionIndex)}
                    className="text-xs h-7 px-3 border-rose-300 text-rose-800 hover:bg-rose-100"
                  >
                    Retry Step
                  </Button>
                </div>
              )}

              {evaluatorError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{evaluatorError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvaluatorError(null)}
                    className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Adaptive State Banner (Requirement 7) */}
              <AdaptiveState
                state={uiState}
                concept={currentConceptName}
                customMessage={
                  isGeneratingStep
                    ? "Your AI Teacher is preparing the demonstration and explanation..."
                    : uiState === "adapting"
                    ? "Pivoting lesson... Preparing a fresh analogy and targeted follow-up."
                    : adaptiveActionData?.action === "reteach" && uiState === "reteaching"
                    ? "Let's try that another way: fresh analogy and simplified mechanism."
                    : undefined
                }
              />

              {/* Main Area: PRIMARY AI Teacher Studio (Left, 7 cols) + SUPPORTING Visual Aid (Right, 5 cols) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* LEFT / PRIMARY: Large AI Teacher Studio */}
                <div className="lg:col-span-7">
                  <AiTeacherCard
                    isSpeaking={audioState === "playing" || isGeneratingStep}
                    statusText={
                      isGeneratingStep
                        ? "Preparing explanation..."
                        : uiState === "thinking"
                        ? "Understanding your answer..."
                        : uiState === "adapting"
                        ? "Pivoting lesson approach..."
                        : videoState === "preparing"
                        ? "AI Teacher video preparing in background"
                        : audioState === "playing"
                        ? "Speaking now"
                        : videoState === "ready"
                        ? "AI Teacher video ready"
                        : audioState === "ready"
                        ? "Teacher voice ready"
                        : "Listening to student"
                    }
                    spokenScript={
                      teachingStep
                        ? teachingStep.example
                          ? `${teachingStep.explanation} For example, ${teachingStep.example}`
                          : teachingStep.explanation
                        : undefined
                    }
                    captions={
                      teachingStep?.explanation
                        ? teachingStep.explanation
                        : "Connecting to your lesson..."
                    }
                    teacherName="EduMentor AI Teacher"
                    audioState={audioState}
                    voiceName={audioVoiceName}
                    audioRef={audioRef}
                    onAudioPlay={() => setAudioState("playing")}
                    onAudioPause={() => {
                      setAudioState((prev) => (prev === "playing" ? "paused" : prev));
                    }}
                    onAudioEnded={() => setAudioState("ready")}
                    onAudioError={() => setAudioState("error")}
                    onPlay={handlePlayAudio}
                    onPause={handlePauseAudio}
                    onReplay={handleReplayAudio}
                    videoState={videoState}
                    videoUrl={videoUrl}
                    videoHostedUrl={videoHostedUrl}
                    isFallbackVideo={isFallbackVideo}
                    isLessonIntroductionSection={sectionIndex === 0}
                    onVideoPlay={handleVideoPlay}
                  />
                </div>

                {/* RIGHT / SUPPORTING: Concept Card & Subject-Aware Visual */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* Concept Overview Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        Active Concept
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        ~{currentSectionData.minutes} mins
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {currentConceptName}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {currentSectionData.purpose}
                    </p>
                  </div>

                  {/* Subject-Aware Visual Canvas */}
                  <VisualExplanation
                    type={teachingStep?.visualSuggestion.type || "diagram"}
                    title={teachingStep?.sectionTitle || currentSectionData.title}
                    description={
                      teachingStep?.visualSuggestion.description ||
                      "Visual model representing the core physical mechanism."
                    }
                  />
                </div>
              </div>

              {/* Below: Lesson Transcript Card (Requirement 5) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Lesson Transcript
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Section {sectionIndex + 1} of {totalSectionsCount}: {currentSectionData.title}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {displayLanguage}
                  </span>
                </div>

                <div className="mt-4 text-slate-700 text-sm leading-relaxed space-y-3">
                  {isGeneratingStep ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Sparkles className="h-5 w-5 animate-spin text-indigo-600" />
                      <p className="text-xs font-medium">Generating step-by-step transcript...</p>
                    </div>
                  ) : teachingStep ? (
                    <>
                      <p className="text-slate-800 font-medium leading-relaxed">{teachingStep.explanation}</p>
                      {teachingStep.example && (
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-800 leading-relaxed">
                          <strong className="text-indigo-700 font-bold block mb-1">
                            Demonstration &amp; Analogy:
                          </strong>
                          {teachingStep.example}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">Preparing explanation...</p>
                  )}
                </div>
              </div>

              {/* Below: Check Your Understanding Question (Requirement 6) */}
              {teachingStep && !isGeneratingStep && (
                <QuestionCard
                  key={`${teachingStep.question.question}-${sectionIndex}-${uiState}`}
                  questionText={teachingStep.question.question}
                  questionType={teachingStep.question.type}
                  options={teachingStep.question.options}
                  uiState={uiState}
                  onSubmit={handleAnswerSubmit}
                  onContinue={handleContinue}
                  onReinforce={handleReinforce}
                  onReteach={handleReteach}
                  evaluationFeedback={feedback}
                  misconception={misconception}
                  score={score}
                  isLoading={isEvaluating}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TeachPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-50">
          <AppHeader />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-xs font-medium text-slate-500">Loading teaching room...</p>
          </main>
        </div>
      }
    >
      <TeachingRoom />
    </Suspense>
  );
}

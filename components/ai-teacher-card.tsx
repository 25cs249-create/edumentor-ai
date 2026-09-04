import React, { useRef, useState, useMemo } from "react";
import {
  Sparkles,
  Volume2,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  VolumeX,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AudioState = "idle" | "loading" | "ready" | "playing" | "paused" | "error";
export type VideoState = "idle" | "preparing" | "ready" | "error";

/**
 * Splits spoken explanation text into natural, readable sentence or clause chunks.
 * Works across English, Hindi (using Devanagari purna viram । or punctuation), and Hinglish.
 */
export function splitIntoCaptionChunks(text: string): string[] {
  if (!text || !text.trim()) return [];

  const clean = text.trim();

  // Split by natural sentence boundaries: English/Hinglish (. ! ?), Hindi purna viram (।)
  const rawSentences = clean
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    // If chunk is compact (up to ~22 words), keep intact
    if (words.length <= 22) {
      chunks.push(sentence);
    } else {
      // For longer sentences, divide at natural clause punctuation: comma, semicolon, dash
      const clauses = sentence
        .split(/(?<=[,;:\u2014])\s+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (clauses.length > 1) {
        let buffer = "";
        for (const clause of clauses) {
          const bufferWords = buffer ? buffer.split(/\s+/).length : 0;
          const clauseWords = clause.split(/\s+/).length;
          if (!buffer) {
            buffer = clause;
          } else if (bufferWords + clauseWords <= 16) {
            buffer += " " + clause;
          } else {
            chunks.push(buffer);
            buffer = clause;
          }
        }
        if (buffer) chunks.push(buffer);
      } else {
        // Fallback for long run-on text without punctuation: chunk by 14 words
        for (let i = 0; i < words.length; i += 14) {
          chunks.push(words.slice(i, i + 14).join(" "));
        }
      }
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

interface AiTeacherCardProps {
  isSpeaking?: boolean;
  statusText?: string;
  captions?: string;
  spokenScript?: string;
  teacherName?: string;
  audioState?: AudioState;
  onPlay?: () => void;
  onPause?: () => void;
  onReplay?: () => void;
  voiceName?: string;
  // Tavus AI Video Props
  videoState?: VideoState;
  videoUrl?: string | null;
  videoHostedUrl?: string | null;
  isFallbackVideo?: boolean;
  isLessonIntroductionSection?: boolean;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoEnded?: () => void;
  // Audio Element / Synchronization Props
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  onAudioPlay?: () => void;
  onAudioPause?: () => void;
  onAudioEnded?: () => void;
  onAudioError?: () => void;
}

export function AiTeacherCard({
  isSpeaking = false,
  statusText = "Explaining concept",
  captions = "An object in motion continues in uniform motion unless acted upon by an external force.",
  spokenScript,
  teacherName = "EduMentor AI Teacher",
  audioState = "idle",
  onPlay,
  onPause,
  onReplay,
  voiceName,
  videoState = "idle",
  videoUrl = null,
  videoHostedUrl = null,
  isFallbackVideo = false,
  isLessonIntroductionSection = true,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
  audioRef,
  onAudioPlay,
  onAudioPause,
  onAudioEnded,
  onAudioError,
}: AiTeacherCardProps) {
  const isAudioPlaying = audioState === "playing";
  const isAudioLoading = audioState === "loading";
  const isAudioReady = audioState === "ready" || audioState === "paused";
  const isAudioError = audioState === "error";

  const isVideoReady = isLessonIntroductionSection && videoState === "ready" && Boolean(videoUrl);
  const isVideoPreparing = isLessonIntroductionSection && videoState === "preparing";
  const isVideoError = isLessonIntroductionSection && videoState === "error";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveAudioRef = audioRef || internalAudioRef;

  // Caption synchronization state
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlaybackFinished, setIsPlaybackFinished] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Exact text sent to TTS or current explanation
  const sourceText = spokenScript || captions || "";

  const captionChunks = useMemo(() => {
    return splitIntoCaptionChunks(sourceText);
  }, [sourceText]);

  // Compute word thresholds for proportional distribution across audio duration
  const chunkThresholds = useMemo(() => {
    if (captionChunks.length === 0) return [];
    const wordCounts = captionChunks.map((chunk) =>
      Math.max(1, chunk.trim().split(/\s+/).filter(Boolean).length)
    );
    const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

    let cumulative = 0;
    return wordCounts.map((count) => {
      cumulative += count;
      return cumulative / totalWords;
    });
  }, [captionChunks]);

  // Reset caption progress when the spoken explanation changes (e.g. adaptive reteach or new section)
  const [prevSourceText, setPrevSourceText] = useState(sourceText);
  if (sourceText !== prevSourceText) {
    setPrevSourceText(sourceText);
    setActiveChunkIndex(0);
    setIsPlaybackFinished(false);
  }

  // HTML5 Audio event handlers
  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const currentTime = audio.currentTime;
    const duration =
      audio.duration && isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : audioDuration;

    if (duration > 0 && chunkThresholds.length > 0) {
      const progressRatio = Math.min(1, Math.max(0, currentTime / duration));
      const targetIndex = chunkThresholds.findIndex((threshold) => progressRatio <= threshold);
      const newIndex = targetIndex === -1 ? chunkThresholds.length - 1 : targetIndex;
      setActiveChunkIndex(newIndex);
    } else if (captionChunks.length > 0) {
      // Fallback: word-count proportional assuming ~2.5 words per second
      const totalWords = captionChunks.reduce(
        (sum, chunk) => sum + chunk.split(/\s+/).length,
        0
      );
      const estimatedDuration = Math.max(1, totalWords / 2.5);
      const progressRatio = Math.min(1, Math.max(0, currentTime / estimatedDuration));
      const targetIndex = chunkThresholds.findIndex((threshold) => progressRatio <= threshold);
      const newIndex = targetIndex === -1 ? chunkThresholds.length - 1 : targetIndex;
      setActiveChunkIndex(newIndex);
    }
  };

  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
  };

  const handleAudioPlay = () => {
    setIsPlaybackFinished(false);
    onAudioPlay?.();
  };

  const handleAudioPause = () => {
    onAudioPause?.();
  };

  const handleAudioEnded = () => {
    setIsPlaybackFinished(true);
    if (captionChunks.length > 0) {
      setActiveChunkIndex(captionChunks.length - 1);
    }
    onAudioEnded?.();
  };

  const handleAudioError = () => {
    onAudioError?.();
  };

  const handleLocalReplay = () => {
    setActiveChunkIndex(0);
    setIsPlaybackFinished(false);
    onReplay?.();
  };

  // Compute displayed caption based on playback state
  let displayedCaption = "";
  if (captionChunks.length > 0) {
    if (isPlaybackFinished) {
      displayedCaption = captionChunks[captionChunks.length - 1];
    } else {
      displayedCaption = captionChunks[activeChunkIndex] || captionChunks[0];
    }
  } else {
    displayedCaption = sourceText;
  }

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-xl min-h-[380px]">
      {/* Ambient background studio lighting */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Top Header: Teacher Identity & Real-Time Status */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 shadow-inner">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              {isLessonIntroductionSection ? teacherName : "AI Teacher • Adaptive Teaching"}
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">
                {isLessonIntroductionSection
                  ? isVideoReady
                    ? "AI Teacher Video • Raj • Lesson Introduction"
                    : voiceName
                    ? `Azure Neural Voice • ${voiceName}`
                    : "Interactive Adaptive Teacher"
                  : voiceName
                  ? `Azure Neural Voice • ${voiceName}`
                  : "Gemini Adaptive Engine • Real-Time Voice"}
              </span>
              {isLessonIntroductionSection && isVideoReady && (
                <span className="inline-flex items-center rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 border border-indigo-400/20">
                  Human-like video introduction
                </span>
              )}
              {!isLessonIntroductionSection && (
                <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 border border-emerald-400/20">
                  Continuous Adaptive Teaching
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 rounded-full bg-black/50 border border-white/10 px-3 py-1 backdrop-blur-md">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isLessonIntroductionSection && isVideoReady
                ? "bg-emerald-400"
                : isLessonIntroductionSection && (isVideoPreparing || isAudioLoading)
                ? "bg-indigo-400 animate-ping"
                : isAudioPlaying || isSpeaking
                ? "bg-emerald-400 animate-pulse"
                : isAudioLoading
                ? "bg-indigo-400 animate-ping"
                : "bg-slate-500"
            )}
          />
          <span className="text-[11px] font-medium text-slate-300">
            {isAudioPlaying
              ? "Speaking now"
              : isLessonIntroductionSection && isVideoPreparing
              ? "AI Teacher video preparing in background"
              : isLessonIntroductionSection && isVideoReady
              ? "Raj • Lesson Introduction ready"
              : isAudioLoading
              ? "Preparing voice..."
              : isAudioReady
              ? "Teacher voice ready"
              : !isLessonIntroductionSection
              ? "Adaptive teaching active"
              : statusText}
          </span>

          {/* Animated waveform when audio is actively speaking */}
          {(isAudioPlaying || isSpeaking) && (
            <div className="flex items-center gap-0.5 ml-1 h-3.5">
              <span className="w-0.5 rounded-full bg-emerald-400 animate-wave-1" />
              <span className="w-0.5 rounded-full bg-emerald-400 animate-wave-2" />
              <span className="w-0.5 rounded-full bg-emerald-400 animate-wave-3" />
              <span className="w-0.5 rounded-full bg-emerald-400 animate-wave-4" />
              <span className="w-0.5 rounded-full bg-emerald-400 animate-wave-5" />
            </div>
          )}
        </div>
      </div>

      {/* Main Center Area: Video Player / Progressive Voice Teacher Studio */}
      <div className="relative z-10 my-4 flex flex-1 flex-col items-center justify-center">
        {isVideoReady && videoUrl ? (
          /* State 1: READY (Section 1 Only) — Prominent Playable Video Player */
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-black border border-white/10 shadow-2xl group">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              onPlay={() => {
                setIsVideoPlaying(true);
                onVideoPlay?.();
              }}
              onPause={() => {
                setIsVideoPlaying(false);
                onVideoPause?.();
              }}
              onEnded={() => {
                setIsVideoPlaying(false);
                onVideoEnded?.();
              }}
              className="w-full aspect-video object-cover rounded-xl"
            />
            {/* Required Disclosure Badge */}
            <div className="absolute top-2.5 right-2.5 pointer-events-none z-10">
              <span className="rounded-md bg-black/80 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-md border border-white/15 shadow-xs">
                {isFallbackVideo ? "AI Teacher Video • Raj • Lesson Introduction" : "AI Teacher Video • Raj"}
              </span>
            </div>
          </div>
        ) : (
          /* State 2: Progressive Voice Teacher Studio (active while video prepares in background or in Sections 2 & 3) */
          <div className="relative flex flex-col items-center justify-center py-3 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-xl shadow-indigo-950/60">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-900/95 backdrop-blur-sm">
                <div className="relative flex flex-col items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-400/30">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                    {isLessonIntroductionSection ? "AI Teacher" : "Adaptive Brain"}
                  </span>
                </div>
              </div>

              {/* Pulsing halo when speaking */}
              {isAudioPlaying && (
                <span className="absolute -inset-1 rounded-2xl border border-indigo-400/50 animate-ping opacity-40" />
              )}
            </div>

            {/* Non-blocking compact background video status while preparing or polling (Section 1 only) */}
            {isLessonIntroductionSection && isVideoPreparing && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 px-3 py-1 text-[11px] font-medium text-indigo-300 backdrop-blur-sm">
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span>AI Teacher video preparing in background</span>
              </div>
            )}

            {/* Subtle fallback notice ONLY in Section 1 when Tavus has actually failed */}
            {isLessonIntroductionSection && isVideoError && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-400 border border-white/10">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span>Voice lesson active</span>
              </div>
            )}
          </div>
        )}

        {/* Audio / Voice Playback Controls Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {isAudioLoading ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-4 py-1.5 text-xs font-medium text-indigo-300 border border-indigo-400/30">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Preparing teacher voice...</span>
            </div>
          ) : isAudioError ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-400 border border-white/10">
              <VolumeX className="h-3.5 w-3.5 text-slate-500" />
              <span>Voice unavailable — you can continue reading.</span>
            </div>
          ) : isAudioPlaying ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPause}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause Voice</span>
              </button>
              <button
                type="button"
                onClick={handleLocalReplay}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                title="Replay from start"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Replay</span>
              </button>
            </div>
          ) : isAudioReady ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPlay}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/30 transition-all cursor-pointer group"
              >
                <Play className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
                <span>{isVideoReady ? "Play Audio Voice" : "Play Teacher Voice"}</span>
              </button>
              {audioState === "paused" && (
                <button
                  type="button"
                  onClick={handleLocalReplay}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  title="Replay from start"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Replay</span>
                </button>
              )}
            </div>
          ) : null}

          {/* External Hosted Video Link */}
          {videoHostedUrl && (
            <a
              href={videoHostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
            >
              Watch in Studio ↗
            </a>
          )}
        </div>
      </div>

      {/* Managed HTML5 Audio element for natural voice playback & caption synchronization */}
      <audio
        ref={effectiveAudioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />

      {/* Bottom Synchronized Closed Captions Panel */}
      <div className="relative z-10 rounded-xl bg-black/50 border border-white/10 p-3 backdrop-blur-md transition-all">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
          <div className="flex items-center gap-2">
            <span>Live Closed Captions</span>
            {isAudioPlaying && captionChunks.length > 1 && (
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-medium normal-case font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                chunk {activeChunkIndex + 1}/{captionChunks.length}
              </span>
            )}
          </div>
          <span
            className="text-indigo-400 font-mono text-[10px]"
            title="Synchronized client-side captions based on teacher explanation"
          >
            {isVideoReady && isVideoPlaying
              ? "CC • AI TEACHER VIDEO"
              : isAudioPlaying
              ? "CC • SYNCHRONIZED"
              : isPlaybackFinished
              ? "CC • COMPLETED"
              : "CC • SYNCHRONIZED"}
          </span>
        </div>

        <p className="text-xs text-slate-200 font-medium leading-relaxed min-h-[2.5rem] flex items-center transition-all duration-150">
          {isVideoReady && isVideoPlaying ? (
            <span className="text-slate-300 italic flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI Teacher Video presenting lesson...
            </span>
          ) : displayedCaption ? (
            <span>&ldquo;{displayedCaption}&rdquo;</span>
          ) : (
            <span className="text-slate-400 italic">Captions will appear when teacher speaks...</span>
          )}
        </p>
      </div>
    </div>
  );
}

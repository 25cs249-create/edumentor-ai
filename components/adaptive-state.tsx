import React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  BookOpen,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TeachingUiState =
  | "teaching"
  | "thinking"
  | "question"
  | "correct"
  | "partially_correct"
  | "incorrect"
  | "adapting"
  | "reteaching";

interface AdaptiveStateProps {
  state: TeachingUiState;
  customMessage?: string;
  concept?: string;
}

export function AdaptiveState({
  state,
  customMessage,
  concept,
}: AdaptiveStateProps) {
  const configs = {
    teaching: {
      label: "Teaching in Progress",
      description: "Your AI Teacher is presenting the core concept and demonstration.",
      badgeColor: "bg-indigo-50/90 text-indigo-900 border-indigo-200/80",
      icon: <BookOpen className="h-4 w-4 text-indigo-600 animate-pulse" />,
    },
    thinking: {
      label: "Understanding Your Answer",
      description: "Analyzing your conceptual reasoning and identifying learning nuances...",
      badgeColor: "bg-amber-50/90 text-amber-900 border-amber-200/80",
      icon: <Brain className="h-4 w-4 text-amber-600 animate-spin" />,
    },
    question: {
      label: "Check Your Understanding",
      description: "Test your grasp of this section before moving forward.",
      badgeColor: "bg-slate-100/90 text-slate-800 border-slate-200",
      icon: <HelpCircle className="h-4 w-4 text-slate-600" />,
    },
    correct: {
      label: "Nice — You've Got It",
      description: "Clear conceptual grasp! Ready to advance to the next step.",
      badgeColor: "bg-emerald-50/90 text-emerald-900 border-emerald-200/80",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
    partially_correct: {
      label: "Let's Strengthen That Idea",
      description: "Good intuition! Let's reinforce the missing details to make it crystal clear.",
      badgeColor: "bg-amber-50/90 text-amber-900 border-amber-200/80",
      icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
    },
    incorrect: {
      label: "Let's Try That Another Way",
      description: "Not quite. The AI Teacher is preparing a fresh explanation with a new real-world analogy.",
      badgeColor: "bg-rose-50/90 text-rose-900 border-rose-200/80",
      icon: <RefreshCw className="h-4 w-4 text-rose-600" />,
    },
    adapting: {
      label: "Pivoting Lesson Approach",
      description: "Generating a fresh analogy, tailored visual model, and simplified check...",
      badgeColor: "bg-purple-50/90 text-purple-900 border-purple-200/80",
      icon: <Sparkles className="h-4 w-4 text-purple-600 animate-spin" />,
    },
    reteaching: {
      label: "Personalized Reteaching",
      description: "Exploring this concept through a different analogy and targeted follow-up.",
      badgeColor: "bg-indigo-50/90 text-indigo-900 border-indigo-200/80",
      icon: <RefreshCw className="h-4 w-4 text-indigo-600" />,
    },
  };

  const current = configs[state] || configs.teaching;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 shadow-xs",
        current.badgeColor
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-2xs border border-black/5">
          {current.icon}
        </div>
        <div>
          <span className="text-xs font-bold tracking-tight uppercase block">
            {current.label}
          </span>
          <p className="text-xs text-slate-700 font-medium leading-snug">
            {customMessage || current.description}
          </p>
        </div>
      </div>

      {concept && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-black/5 shadow-2xs">
          Concept: {concept}
        </span>
      )}
    </div>
  );
}

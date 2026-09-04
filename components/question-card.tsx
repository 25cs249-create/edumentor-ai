import React, { useState } from "react";
import { HelpCircle, Send, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TeachingUiState } from "./adaptive-state";

interface QuestionCardProps {
  questionText: string;
  questionType?: string;
  options?: string[];
  uiState: TeachingUiState;
  onSubmit: (answer: string) => void;
  onContinue: () => void;
  onReinforce: () => void;
  onReteach: () => void;
  evaluationFeedback?: string;
  misconception?: string | null;
  score?: number;
  isLoading?: boolean;
}

export function QuestionCard({
  questionText,
  questionType = "conceptual",
  options = [],
  uiState,
  onSubmit,
  onContinue,
  onReinforce,
  onReteach,
  evaluationFeedback,
  misconception,
  score,
  isLoading = false,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [customAnswer, setCustomAnswer] = useState<string>("");

  const hasOptions = options && options.length > 0;
  const isAnswered =
    uiState === "correct" ||
    uiState === "partially_correct" ||
    uiState === "incorrect";

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = hasOptions ? selectedOption : customAnswer;
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all">
      {/* Question Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Check Your Understanding
            </h3>
            <span className="text-[10px] font-medium text-slate-400 capitalize">
              Type: {questionType}
            </span>
          </div>
        </div>

        {score !== undefined && isAnswered && (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
              score >= 80
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : score >= 50
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            )}
          >
            Score: {score}/100
          </span>
        )}
      </div>

      {/* Main Question Text */}
      <div className="mt-4">
        <p className="text-base font-semibold text-slate-900 leading-relaxed">
          {questionText}
        </p>
      </div>

      {/* Answer Controls: MCQ or Free-form text */}
      {!isAnswered ? (
        <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
          {hasOptions ? (
            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const isChecked = selectedOption === opt;
                return (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3.5 text-sm cursor-pointer transition-all select-none",
                      isChecked
                        ? "border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-950 ring-1 ring-indigo-600/30 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="quiz-option"
                      checked={isChecked}
                      onChange={() => setSelectedOption(opt)}
                      className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-600 border-slate-300"
                    />
                    <span className="leading-snug">{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea
                rows={3}
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="Explain the reasoning in your own words..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="lg"
              disabled={
                isLoading || (hasOptions ? !selectedOption : !customAnswer.trim())
              }
              className="gap-2 w-full sm:w-auto"
            >
              {isLoading ? (
                <>Thinking...</>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* Answer Feedback & Post-Answer Action Buttons */
        <div className="mt-5 space-y-4">
          {/* Feedback Card */}
          <div
            className={cn(
              "rounded-xl border p-4",
              uiState === "correct"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                : uiState === "partially_correct"
                ? "border-amber-200 bg-amber-50/70 text-amber-950"
                : "border-rose-200 bg-rose-50/70 text-rose-950"
            )}
          >
            <div className="flex items-start gap-2.5">
              {uiState === "correct" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : uiState === "partially_correct" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              ) : (
                <RefreshCw className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {uiState === "correct"
                    ? "Feedback: Mastered"
                    : uiState === "partially_correct"
                    ? "Feedback: Almost There"
                    : "Feedback: Learning Opportunity"}
                </h4>
                <p className="text-sm leading-relaxed">
                  {evaluationFeedback || "Your response was evaluated."}
                </p>

                {misconception && (
                  <p className="pt-1.5 text-xs text-rose-700 font-semibold">
                    <span className="font-bold">Identified Misconception:</span>{" "}
                    {misconception}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {uiState === "correct" && (
              <Button onClick={onContinue} size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <span>Continue to Next Section</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {uiState === "partially_correct" && (
              <Button onClick={onReinforce} size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <span>Reinforce Concept</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {uiState === "incorrect" && (
              <Button onClick={onReteach} size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <span>Reteach with Different Analogy</span>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

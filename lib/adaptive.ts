import { AnswerEvaluation } from "./evaluator";

export interface AdaptiveDecision {
  action: "advance" | "reinforce" | "reteach";
  reason: string;
  instruction: string;
}

/**
 * Deterministic adaptive decision engine connecting student evaluation to the next teaching step.
 * Decides whether to advance, reinforce, or reteach based on conceptual understanding and misconceptions.
 */
export function getAdaptiveAction(
  evaluation: AnswerEvaluation
): AdaptiveDecision {
  const hasMisconception =
    typeof evaluation.misconception === "string" &&
    evaluation.misconception.trim().length > 0 &&
    evaluation.misconception.trim().toLowerCase() !== "null";

  // Rule 1: A clear misconception MUST always trigger "reteach", regardless of score or reported result.
  if (hasMisconception) {
    const misconceptionText = evaluation.misconception!.trim();
    const missingText = evaluation.missingConcept
      ? ` Address missing concept: "${evaluation.missingConcept}".`
      : "";
    return {
      action: "reteach",
      reason: `Identified misconception: ${misconceptionText}`,
      instruction: `Re-explain the underlying concept using a DIFFERENT analogy, example, representation, or visual than the previous explanation. Directly address the identified misconception: "${misconceptionText}".${missingText} Then ask a simpler question checking the same underlying concept.`,
    };
  }

  // Rule 2: Result is incorrect or recommended action is reteach
  if (
    evaluation.result === "incorrect" ||
    evaluation.recommendedAction === "reteach"
  ) {
    const missingText = evaluation.missingConcept
      ? ` Address missing concept: "${evaluation.missingConcept}".`
      : "";
    return {
      action: "reteach",
      reason: evaluation.missingConcept
        ? `Incorrect understanding; missing concept: ${evaluation.missingConcept}`
        : `Incorrect understanding (score: ${evaluation.score}/100)`,
      instruction: `Re-explain the underlying concept using a DIFFERENT analogy, example, representation, or visual than the previous explanation.${missingText} Break down the principle into simpler building blocks, and then ask a simpler question checking the same underlying concept.`,
    };
  }

  // Rule 3: Result is partially correct or recommended action is reinforce
  if (
    evaluation.result === "partially_correct" ||
    evaluation.recommendedAction === "reinforce"
  ) {
    const missingText = evaluation.missingConcept
      ? ` Clarify missing concept: "${evaluation.missingConcept}".`
      : "";
    return {
      action: "reinforce",
      reason: evaluation.missingConcept
        ? `Partial understanding; missing key concept or terminology: ${evaluation.missingConcept}`
        : `Partial understanding (score: ${evaluation.score}/100)`,
      instruction: `Briefly clarify the missing concept or terminology.${missingText} Use the student's existing understanding as the starting point. Then ask another question that checks the same concept.`,
    };
  }

  // Rule 4: Result is correct (and no misconception)
  return {
    action: "advance",
    reason: `Student demonstrated strong conceptual understanding (score: ${evaluation.score}/100)`,
    instruction: `Move to the next concept or section. Do not unnecessarily repeat the mastered concept.`,
  };
}

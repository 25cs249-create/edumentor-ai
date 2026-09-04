import { NextResponse } from "next/server";
import { getAdaptiveAction } from "@/lib/adaptive";
import { AnswerEvaluation } from "@/lib/evaluator";

export const runtime = "nodejs";

const VALID_RESULTS = ["correct", "partially_correct", "incorrect"] as const;
const VALID_ACTIONS = ["advance", "reinforce", "reteach"] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body provided.",
        },
        { status: 400 }
      );
    }

    const { evaluation } = body;
    if (!evaluation || typeof evaluation !== "object") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'evaluation' must be an object.",
        },
        { status: 400 }
      );
    }

    const {
      result,
      score,
      understanding,
      misconception,
      missingConcept,
      feedback,
      recommendedAction,
    } = evaluation;

    if (
      typeof result !== "string" ||
      !VALID_RESULTS.includes(result as (typeof VALID_RESULTS)[number])
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid field: 'evaluation.result' must be 'correct', 'partially_correct', or 'incorrect'.",
        },
        { status: 400 }
      );
    }

    if (typeof score !== "number" || isNaN(score)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid field: 'evaluation.score' must be a valid number.",
        },
        { status: 400 }
      );
    }

    if (
      typeof recommendedAction !== "string" ||
      !VALID_ACTIONS.includes(recommendedAction as (typeof VALID_ACTIONS)[number])
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid field: 'evaluation.recommendedAction' must be 'advance', 'reinforce', or 'reteach'.",
        },
        { status: 400 }
      );
    }

    const typedEvaluation: AnswerEvaluation = {
      result: result as (typeof VALID_RESULTS)[number],
      score,
      understanding: typeof understanding === "string" ? understanding : "",
      misconception:
        typeof misconception === "string" && misconception.trim() !== ""
          ? misconception
          : null,
      missingConcept:
        typeof missingConcept === "string" && missingConcept.trim() !== ""
          ? missingConcept
          : null,
      feedback: typeof feedback === "string" ? feedback : "",
      recommendedAction: recommendedAction as (typeof VALID_ACTIONS)[number],
    };

    const adaptation = getAdaptiveAction(typedEvaluation);

    return NextResponse.json({
      success: true,
      adaptation,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error while processing adaptation.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

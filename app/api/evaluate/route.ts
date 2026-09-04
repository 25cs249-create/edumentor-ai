import { NextResponse } from "next/server";
import { evaluateAnswer, EvaluatorInput } from "@/lib/evaluator";

export const runtime = "nodejs";

const VALID_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error: Missing GEMINI_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

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

    const {
      question,
      questionType,
      expectedConcept,
      studentAnswer,
      language,
      learnerLevel,
      sourceContext,
    } = body;

    // Validate required fields
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'question' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (typeof questionType !== "string" || !questionType.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'questionType' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (typeof expectedConcept !== "string" || !expectedConcept.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'expectedConcept' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (typeof studentAnswer !== "string") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'studentAnswer' must be a string.",
        },
        { status: 400 }
      );
    }

    if (typeof language !== "string" || !language.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'language' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    const normalizedLevel =
      typeof learnerLevel === "string" ? learnerLevel.trim().toLowerCase() : "";
    if (
      !normalizedLevel ||
      !VALID_LEVELS.includes(normalizedLevel as (typeof VALID_LEVELS)[number])
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'learnerLevel' must be 'beginner', 'intermediate', or 'advanced'.",
        },
        { status: 400 }
      );
    }

    const input: EvaluatorInput = {
      question: question.trim(),
      questionType: questionType.trim(),
      expectedConcept: expectedConcept.trim(),
      studentAnswer: studentAnswer.trim(),
      language: language.trim(),
      learnerLevel: normalizedLevel as (typeof VALID_LEVELS)[number],
      sourceContext:
        typeof sourceContext === "string" ? sourceContext.trim() : undefined,
    };

    const evaluation = await evaluateAnswer(input);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error while evaluating answer.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

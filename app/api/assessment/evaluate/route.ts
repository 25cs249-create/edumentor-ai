import { NextResponse } from "next/server";
import {
  evaluateAssessment,
  AssessmentEvaluationInput,
  AssessmentQuestion,
  AssessmentAnswerInput,
} from "@/lib/assessment";

export const runtime = "nodejs";

const VALID_LEVELS = ["beginner", "intermediate", "advanced"] as const;

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

    const { questions, answers, language, learnerLevel, sourceContext } = body;

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'questions' must be a non-empty array.",
        },
        { status: 400 }
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (
        !q ||
        typeof q !== "object" ||
        typeof q.id !== "string" ||
        !q.id.trim() ||
        typeof q.concept !== "string" ||
        !q.concept.trim() ||
        typeof q.type !== "string" ||
        !q.type.trim() ||
        typeof q.question !== "string" ||
        !q.question.trim() ||
        typeof q.expectedConcept !== "string" ||
        !q.expectedConcept.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Malformed question at index ${i}: required fields (id, concept, type, question, expectedConcept) are missing or invalid.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate answers
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'answers' must be an array.",
        },
        { status: 400 }
      );
    }

    for (let i = 0; i < answers.length; i++) {
      const a = answers[i];
      if (
        !a ||
        typeof a !== "object" ||
        typeof a.questionId !== "string" ||
        !a.questionId.trim() ||
        typeof a.answer !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Malformed answer at index ${i}: questionId must be a string and answer must be a string.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate language
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

    // Validate learnerLevel
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

    const input: AssessmentEvaluationInput = {
      questions: questions as AssessmentQuestion[],
      answers: answers as AssessmentAnswerInput[],
      language: language.trim(),
      learnerLevel: normalizedLevel as (typeof VALID_LEVELS)[number],
      sourceContext:
        typeof sourceContext === "string" ? sourceContext.trim() : undefined,
    };

    const result = await evaluateAssessment(input);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error while evaluating assessment.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { generateAssessment, AssessmentInput } from "@/lib/assessment";

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
      topic,
      concepts,
      language,
      learnerLevel,
      goal,
      questionCount,
      lessonSummary,
      sourceContext,
    } = body;

    // Validate topic
    if (typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'topic' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    // Validate concepts
    if (
      !Array.isArray(concepts) ||
      concepts.length === 0 ||
      !concepts.every((c) => typeof c === "string" && c.trim().length > 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'concepts' must be a non-empty array of strings.",
        },
        { status: 400 }
      );
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

    // Validate questionCount if provided
    let count: number | undefined = undefined;
    if (questionCount !== undefined) {
      if (
        typeof questionCount !== "number" ||
        isNaN(questionCount) ||
        questionCount < 3 ||
        questionCount > 5
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid field: 'questionCount' must be a number between 3 and 5.",
          },
          { status: 400 }
        );
      }
      count = questionCount;
    }

    const input: AssessmentInput = {
      topic: topic.trim(),
      concepts: concepts.map((c: string) => c.trim()),
      language: language.trim(),
      learnerLevel: normalizedLevel as (typeof VALID_LEVELS)[number],
      goal: typeof goal === "string" ? goal.trim() : undefined,
      questionCount: count,
      lessonSummary:
        typeof lessonSummary === "string" ? lessonSummary.trim() : undefined,
      sourceContext:
        typeof sourceContext === "string" ? sourceContext.trim() : undefined,
    };

    const assessment = await generateAssessment(input);

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error while generating assessment.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

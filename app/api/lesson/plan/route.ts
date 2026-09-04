import { NextResponse } from "next/server";
import {
  createLessonPlan,
  LessonPlannerInput,
} from "@/lib/lesson-planner";

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
      level,
      goal,
      availableMinutes,
      language,
      teachingStyle,
      depth,
      sourceContext,
    } = body;

    // Validate required fields
    if (typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: 'topic' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (
      typeof level !== "string" ||
      !VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'level' must be 'beginner', 'intermediate', or 'advanced'.",
        },
        { status: 400 }
      );
    }

    if (typeof goal !== "string" || !goal.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: 'goal' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (typeof availableMinutes !== "number" || availableMinutes <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'availableMinutes' must be a positive number.",
        },
        { status: 400 }
      );
    }

    if (typeof language !== "string" || !language.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: 'language' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    const input: LessonPlannerInput = {
      topic: topic.trim(),
      level: level as (typeof VALID_LEVELS)[number],
      goal: goal.trim(),
      availableMinutes: Math.round(availableMinutes),
      language: language.trim(),
      teachingStyle: typeof teachingStyle === "string" ? teachingStyle.trim() : undefined,
      depth: typeof depth === "string" ? depth.trim() : undefined,
      sourceContext: typeof sourceContext === "string" ? sourceContext.trim() : undefined,
    };

    const lessonPlan = await createLessonPlan(input);

    return NextResponse.json({
      success: true,
      lessonPlan,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error while generating lesson plan.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

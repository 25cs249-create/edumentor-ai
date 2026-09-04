import { NextResponse } from "next/server";
import {
  generateTeachingStep,
  TeacherInput,
} from "@/lib/teacher";

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
      lessonPlan,
      currentSection,
      currentConcept,
      language,
      learnerLevel,
      teachingStyle,
      sourceContext,
      adaptiveInstruction,
    } = body;

    // Validate required fields
    if (!lessonPlan || typeof lessonPlan !== "object" || !lessonPlan.title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'lessonPlan' must be an object with at least a title.",
        },
        { status: 400 }
      );
    }

    if (
      !currentSection ||
      typeof currentSection !== "object" ||
      !currentSection.title
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'currentSection' must be an object with at least a title.",
        },
        { status: 400 }
      );
    }

    if (typeof currentConcept !== "string" || !currentConcept.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid required field: 'currentConcept' must be a non-empty string.",
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

    const input: TeacherInput = {
      lessonPlan,
      currentSection,
      currentConcept: currentConcept.trim(),
      language: language.trim(),
      learnerLevel: normalizedLevel as (typeof VALID_LEVELS)[number],
      teachingStyle:
        typeof teachingStyle === "string" ? teachingStyle.trim() : undefined,
      sourceContext:
        typeof sourceContext === "string" ? sourceContext.trim() : undefined,
      adaptiveInstruction:
        typeof adaptiveInstruction === "string"
          ? adaptiveInstruction.trim()
          : undefined,
    };

    const teachingStep = await generateTeachingStep(input);

    return NextResponse.json({
      success: true,
      teachingStep,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error while generating teaching step.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

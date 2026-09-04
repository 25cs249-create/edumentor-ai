import { NextResponse } from "next/server";
import { createTavusVideo, getTavusVideoStatus } from "@/lib/tavus";

export const runtime = "nodejs";

const MAX_SCRIPT_LENGTH = 4000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: Expected JSON body.",
        },
        { status: 400 }
      );
    }

    const { script, videoName, language } = body;

    // Validate script
    if (typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: 'script' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    if (script.length > MAX_SCRIPT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Script exceeds maximum allowed length of ${MAX_SCRIPT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (!process.env.TAVUS_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: TAVUS_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const videoResult = await createTavusVideo({
      script: script.trim(),
      videoName: typeof videoName === "string" ? videoName.trim() : undefined,
      language: typeof language === "string" ? language.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      ...videoResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate video generation";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId || !videoId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query parameter: 'videoId'.",
        },
        { status: 400 }
      );
    }

    if (!process.env.TAVUS_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: TAVUS_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const statusResult = await getTavusVideoStatus(videoId.trim());

    return NextResponse.json({
      success: true,
      ...statusResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve video status";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

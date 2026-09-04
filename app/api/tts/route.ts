import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 5000;

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

    const { text, language } = body;

    // Validate text exists and is non-empty string
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid required field: 'text' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    // Validate maximum text length
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Text exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    // Validate language if provided
    if (language !== undefined && typeof language !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid field: 'language' must be a string if provided.",
        },
        { status: 400 }
      );
    }

    // Check server configuration
    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Azure Speech credentials are not configured.",
        },
        { status: 500 }
      );
    }

    // Synthesize speech using Azure AI Speech
    const result = await synthesizeSpeech(text.trim(), language || "English");

    return new Response(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": result.audioBuffer.byteLength.toString(),
        "X-Voice-Name": result.voice,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal TTS synthesis error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to synthesize speech: ${message}`,
      },
      { status: 500 }
    );
  }
}

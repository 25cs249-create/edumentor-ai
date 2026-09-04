import { NextResponse } from "next/server";
import { searchDocumentChunks } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.GEMINI_API_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error: Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY).",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request. 'query' must be a non-empty string.",
        },
        { status: 400 }
      );
    }

    const matchCount =
      typeof body.matchCount === "number" && body.matchCount > 0
        ? Math.floor(body.matchCount)
        : 5;

    const documentName =
      typeof body.documentName === "string" && body.documentName.trim()
        ? body.documentName.trim()
        : undefined;

    const rawResults = await searchDocumentChunks(body.query.trim(), matchCount, documentName);

    const results = rawResults.map((item) => ({
      document_name: item.document_name,
      content: item.content,
      metadata: item.metadata,
      similarity: item.similarity,
    }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to search document chunks.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

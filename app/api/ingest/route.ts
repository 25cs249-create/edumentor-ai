import { NextResponse } from "next/server";
import { parseDocument, getSupportedExtension } from "@/lib/document-parser";
import { storeDocumentChunks } from "@/lib/rag";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid content type. Expected multipart/form-data.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing file. Please provide a file under the 'file' field.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The provided file is empty.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        },
        { status: 413 }
      );
    }

    const fileType = getSupportedExtension(file.name);
    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported file format. Only .pdf, .docx, .pptx, and .txt are supported.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parseDocument(buffer, file.name);

    const storedChunkCount = await storeDocumentChunks(
      result.filename,
      result.chunks
    );

    return NextResponse.json({
      success: true,
      filename: result.filename,
      fileType: result.fileType,
      chunkCount: result.chunkCount,
      storedChunkCount,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process document.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

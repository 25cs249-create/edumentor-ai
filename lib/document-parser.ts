import { parseOffice } from "officeparser";

export type SupportedExtension = "pdf" | "docx" | "pptx" | "txt";

export interface ChunkMetadata {
  sourceType: SupportedExtension;
  pageNumber?: number;
  slideNumber?: number;
  closestHeading?: string;
}

export interface DocumentChunk {
  text: string;
  metadata: ChunkMetadata;
}

export interface ParseDocumentResult {
  success: boolean;
  filename: string;
  fileType: SupportedExtension;
  chunkCount: number;
  chunks: DocumentChunk[];
}

export function getSupportedExtension(filename: string): SupportedExtension | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

/**
 * Server-side document parser utility.
 * Accepts a Buffer and filename, extracts text, and generates RAG-ready chunks with metadata.
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParseDocumentResult> {
  const fileType = getSupportedExtension(filename);
  if (!fileType) {
    throw new Error(
      `Unsupported file format. Supported extensions are: .pdf, .docx, .pptx, .txt`
    );
  }

  // Handle plain text files directly
  if (fileType === "txt") {
    const content = buffer.toString("utf-8");
    const rawParagraphs = content
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks: DocumentChunk[] = rawParagraphs.map((text) => ({
      text,
      metadata: {
        sourceType: "txt",
      },
    }));

    return {
      success: true,
      filename,
      fileType: "txt",
      chunkCount: chunks.length,
      chunks,
    };
  }

  // Parse office documents (.pdf, .docx, .pptx) using officeparser
  const ast = await parseOffice(buffer, {
    fileType,
    extractAttachments: false,
    ocr: false,
  });

  const chunks: DocumentChunk[] = [];

  try {
    // Generate AST-aware RAG chunks
    const chunkResult = await ast.to("chunks");
    const officeChunks = chunkResult?.value || [];

    for (const oc of officeChunks) {
      const text = (oc.text || "").trim();
      if (!text) continue;

      const metadata: ChunkMetadata = {
        sourceType: fileType,
      };

      if (typeof oc.metadata?.pageNumber === "number") {
        metadata.pageNumber = oc.metadata.pageNumber;
      }
      if (typeof oc.metadata?.slideNumber === "number") {
        metadata.slideNumber = oc.metadata.slideNumber;
      }
      if (
        typeof oc.metadata?.closestHeading === "string" &&
        oc.metadata.closestHeading.trim()
      ) {
        metadata.closestHeading = oc.metadata.closestHeading.trim();
      }

      chunks.push({ text, metadata });
    }
  } catch {
    // Fallback if structured chunking encountered an issue
  }

  // Fallback: If no chunks were generated, extract plain text and partition by paragraphs
  if (chunks.length === 0) {
    const plainText = (ast.toText ? ast.toText() : "").trim();
    if (plainText) {
      const paragraphs = plainText
        .split(/\r?\n\s*\r?\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      for (const text of paragraphs) {
        chunks.push({
          text,
          metadata: {
            sourceType: fileType,
          },
        });
      }
    }
  }

  return {
    success: true,
    filename,
    fileType,
    chunkCount: chunks.length,
    chunks,
  };
}

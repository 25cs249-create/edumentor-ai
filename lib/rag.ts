import { getSupabaseClient } from "@/lib/supabase";
import { embedText } from "@/lib/embeddings";
import { DocumentChunk } from "@/lib/document-parser";

export interface SearchChunkResult {
  id?: number;
  document_name?: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Generates embeddings for parsed chunks and stores them into Supabase document_chunks table.
 * Returns the number of successfully inserted chunks.
 */
export async function storeDocumentChunks(
  documentName: string,
  chunks: DocumentChunk[]
): Promise<number> {
  if (!chunks || chunks.length === 0) {
    return 0;
  }

  const supabase = getSupabaseClient();

  const records = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);
    records.push({
      document_name: documentName,
      content: chunk.text,
      metadata: chunk.metadata || {},
      embedding,
    });
  }

  const { data, error } = await supabase
    .from("document_chunks")
    .insert(records)
    .select("id");

  if (error) {
    throw new Error(`Failed to store document chunks: ${error.message}`);
  }

  return data ? data.length : records.length;
}

/**
 * Generates an embedding for the user query and searches for relevant chunks via match_document_chunks RPC.
 */
export async function searchDocumentChunks(
  query: string,
  matchCount: number = 5,
  documentName?: string
): Promise<SearchChunkResult[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const queryEmbedding = await embedText(query);
  const supabase = getSupabaseClient();

  const requestCount = documentName && documentName.trim() ? Math.max(matchCount * 3, 15) : matchCount;

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_count: requestCount,
  });

  if (error) {
    throw new Error(`Vector similarity search failed: ${error.message}`);
  }

  let results = (data || []) as SearchChunkResult[];
  if (documentName && documentName.trim()) {
    const docFiltered = results.filter((item) => item.document_name === documentName.trim());
    if (docFiltered.length > 0) {
      results = docFiltered;
    }
  }

  return results.slice(0, matchCount);
}

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create minimal table for document chunks with 768-dimensional embeddings (text-embedding-004)
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_name TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW vector similarity index for cosine distance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Vector search function using cosine distance
CREATE OR REPLACE FUNCTION match_document_chunks (
    query_embedding VECTOR(768),
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    document_name TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_name,
        dc.content,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

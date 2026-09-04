import { GoogleGenAI } from "@google/genai";

/**
 * Generates a 768-dimensional embedding vector for the provided text using Gemini's gemini-embedding-001 model.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Failed to generate embedding: No values returned from Gemini API.");
  }

  return values;
}

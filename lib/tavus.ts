export const DEFAULT_TAVUS_REPLICA_ID = "r987f6e6f73c"; // Nathan - Bookshelf (Professional Academic setting)
const TAVUS_API_BASE = "https://tavusapi.com/v2";

/**
 * Verified fallback videos for Newton's Laws / Inertia demonstration:
 * English: Video ID 8eedacd381 (Raj - Business, ~34s)
 * Hinglish: Video ID 2d90ceaa94 (Raj - Business, ~68s)
 */
export interface DemoTavusFallback {
  videoId: string;
  replicaId: string;
  replicaName: string;
  language: "English" | "Hinglish";
  videoName: string;
  hostedUrl: string;
  downloadUrl: string;
  streamUrl: string;
  durationSeconds: number;
}

export const DEMO_TAVUS_FALLBACK_ENGLISH: DemoTavusFallback = {
  videoId: "8eedacd381",
  replicaId: "re6220ec0195",
  replicaName: "Raj - Business",
  language: "English",
  videoName: "EduMentor - Inertia: Objects are Lazy (First Law)",
  hostedUrl: "https://tavus.video/8eedacd381",
  downloadUrl:
    "https://stream.mux.com/wKh02yXD7PxM2Yw00JnyLcgUqTvLJHLynNFk4oj3iv83M/high.mp4?download=8eedacd381",
  streamUrl:
    "https://stream.mux.com/wKh02yXD7PxM2Yw00JnyLcgUqTvLJHLynNFk4oj3iv83M.m3u8",
  durationSeconds: 34,
};

export const DEMO_TAVUS_FALLBACK_HINGLISH: DemoTavusFallback = {
  videoId: "2d90ceaa94",
  replicaId: "re6220ec0195",
  replicaName: "Raj - Business",
  language: "Hinglish",
  videoName: "EduMentor - Introduction & First Law of Motion (Inertia)",
  hostedUrl: "https://tavus.video/2d90ceaa94",
  downloadUrl:
    "https://stream.mux.com/HSMbCaaqAX16dLUb4AHfPELkHuUXoFaI7mQPX4ab5lA/high.mp4?download=2d90ceaa94",
  streamUrl:
    "https://stream.mux.com/HSMbCaaqAX16dLUb4AHfPELkHuUXoFaI7mQPX4ab5lA.m3u8",
  durationSeconds: 68,
};

export function getDemoTavusFallbackForLanguage(language?: string): DemoTavusFallback | null {
  if (!language) return DEMO_TAVUS_FALLBACK_ENGLISH;
  const normalized = language.trim().toLowerCase();
  if (normalized === "hinglish") {
    return DEMO_TAVUS_FALLBACK_HINGLISH;
  }
  if (normalized === "english") {
    return DEMO_TAVUS_FALLBACK_ENGLISH;
  }
  // Hindi or other languages do NOT have a cached Raj video fallback.
  // Returns null -> continues with Azure voice + Gemini + visuals fallback.
  return null;
}

export interface CreateVideoInput {
  script: string;
  videoName?: string;
  replicaId?: string;
  language?: string;
}

export interface TavusVideoResponse {
  videoId: string;
  status: "queued" | "generating" | "ready" | "error" | string;
  hostedUrl?: string | null;
  downloadUrl?: string | null;
  streamUrl?: string | null;
  progress?: string | null;
  errorDetails?: string | null;
  isFallback?: boolean;
}

/**
 * Creates a new Tavus AI teacher video generation job.
 * If Tavus returns HTTP 402 Payment Required (exhausted credits),
 * seamlessly selects the verified demo video matching the lesson language (English or Hinglish).
 * For Hindi or unmatched languages, throws so Azure voice + visuals handles teaching.
 */
export async function createTavusVideo(input: CreateVideoInput): Promise<TavusVideoResponse> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    throw new Error("TAVUS_API_KEY is not configured on the server.");
  }

  if (!input.script || typeof input.script !== "string" || !input.script.trim()) {
    throw new Error("Script is required and must be a non-empty string.");
  }

  const replicaId = input.replicaId || process.env.TAVUS_REPLICA_ID || DEFAULT_TAVUS_REPLICA_ID;
  const videoName = input.videoName || "EduMentor AI Lesson";

  const response = await fetch(`${TAVUS_API_BASE}/videos`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replica_id: replicaId,
      script: input.script.trim(),
      video_name: videoName,
    }),
  });

  const data = await response.json().catch(() => null);

  console.log(`[TAVUS] Tavus upstream POST status: ${response.status}`);

  // Handle 402 Payment Required: fallback to language-matched demo video (Raj - Business)
  if (response.status === 402) {
    const fallback = getDemoTavusFallbackForLanguage(input.language);
    if (fallback) {
      console.log(`[TAVUS] 402 Payment Required - activating ${fallback.language} demo video fallback (${fallback.videoId})`);
      return {
        videoId: fallback.videoId,
        status: "ready",
        hostedUrl: fallback.hostedUrl,
        downloadUrl: fallback.downloadUrl,
        streamUrl: fallback.streamUrl,
        isFallback: true,
      };
    } else {
      console.log(`[TAVUS] 402 Payment Required - no cached fallback for language '${input.language || "unspecified"}'. Using Azure voice.`);
      throw new Error(`Tavus video generation unavailable (Payment Required). Continuing with Azure voice.`);
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Tavus API error: ${response.status} ${response.statusText}`;
    console.log(`[TAVUS] Tavus upstream POST error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return {
    videoId: data.video_id,
    status: data.status || "queued",
    hostedUrl: data.hosted_url || null,
    downloadUrl: data.download_url || null,
    streamUrl: data.stream_url || null,
    isFallback: false,
  };
}

/**
 * Retrieves status and playable URLs for an existing Tavus video.
 */
export async function getTavusVideoStatus(videoId: string): Promise<TavusVideoResponse> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    throw new Error("TAVUS_API_KEY is not configured on the server.");
  }

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    throw new Error("Valid videoId is required.");
  }

  const cleanVideoId = videoId.trim();

  // If checking a verified demo fallback video, provide resilient fallback if upstream fails
  try {
    const response = await fetch(`${TAVUS_API_BASE}/videos/${encodeURIComponent(cleanVideoId)}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data) {
      return {
        videoId: data.video_id || cleanVideoId,
        status: data.status || "ready",
        hostedUrl: data.hosted_url || null,
        downloadUrl: data.download_url || null,
        streamUrl: data.stream_url || null,
        progress: data.generation_progress || null,
        errorDetails: data.status_details || null,
        isFallback:
          cleanVideoId === DEMO_TAVUS_FALLBACK_ENGLISH.videoId ||
          cleanVideoId === DEMO_TAVUS_FALLBACK_HINGLISH.videoId,
      };
    }
  } catch {
    // Network or API blip
  }

  if (cleanVideoId === DEMO_TAVUS_FALLBACK_ENGLISH.videoId) {
    return {
      videoId: DEMO_TAVUS_FALLBACK_ENGLISH.videoId,
      status: "ready",
      hostedUrl: DEMO_TAVUS_FALLBACK_ENGLISH.hostedUrl,
      downloadUrl: DEMO_TAVUS_FALLBACK_ENGLISH.downloadUrl,
      streamUrl: DEMO_TAVUS_FALLBACK_ENGLISH.streamUrl,
      isFallback: true,
    };
  }

  if (cleanVideoId === DEMO_TAVUS_FALLBACK_HINGLISH.videoId) {
    return {
      videoId: DEMO_TAVUS_FALLBACK_HINGLISH.videoId,
      status: "ready",
      hostedUrl: DEMO_TAVUS_FALLBACK_HINGLISH.hostedUrl,
      downloadUrl: DEMO_TAVUS_FALLBACK_HINGLISH.downloadUrl,
      streamUrl: DEMO_TAVUS_FALLBACK_HINGLISH.streamUrl,
      isFallback: true,
    };
  }

  throw new Error(`Tavus API status check error for ${cleanVideoId}`);
}

/**
 * Formats a concise spoken script specifically for Tavus AI video teaching.
 * Target: ~20-40 seconds of spoken content (roughly 70-110 words, or 50-85 words for adaptive reteach).
 * Preserves the core explanation and key analogy/example without lecture bloat or repeating sentences.
 * Ensures the upcoming question or answer evaluation is not included in the video script.
 */
export function buildConciseVideoScript(
  explanation: string,
  example?: string | null,
  isAdaptive = false
): string {
  if (!explanation || !explanation.trim()) return "";

  // Clean and remove any trailing questions that prompt the student for an answer
  const cleanExplanation = explanation
    .trim()
    .replace(/(?:Now consider|Now tell me|Can you explain|What do you think|Question:).*$/i, "")
    .trim();

  const countWords = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const targetMinWords = isAdaptive ? 50 : 70;
  const targetMaxWords = isAdaptive ? 85 : 110;

  const explWords = countWords(cleanExplanation);

  // If the explanation is already within the concise target range
  if (explWords >= targetMinWords && explWords <= targetMaxWords) {
    return cleanExplanation;
  }

  const splitSentences = (text: string) =>
    text.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((s) => s.trim()) || [text.trim()];

  const explSentences = splitSentences(cleanExplanation);
  const selectedSentences: string[] = [];
  let currentWordCount = 0;

  for (const sentence of explSentences) {
    const sWords = countWords(sentence);
    if (currentWordCount + sWords <= targetMaxWords) {
      selectedSentences.push(sentence);
      currentWordCount += sWords;
    } else if (selectedSentences.length === 0) {
      selectedSentences.push(sentence);
      currentWordCount += sWords;
      break;
    } else {
      break;
    }
  }

  // If word count is still below target and an example is available, incorporate it
  if (example && example.trim()) {
    const cleanExample = example
      .replace(/^(?:For example,?\s*|For instance,?\s*)/i, "")
      .replace(/(?:What do you think|Can you tell|Now consider).*$/i, "")
      .trim();

    const exampleSentences = splitSentences(cleanExample);
    for (const exSentence of exampleSentences) {
      const exWords = countWords(exSentence);
      if (currentWordCount + exWords <= targetMaxWords) {
        const formatted =
          selectedSentences.length > 0 && !/^for\s+(?:example|instance)/i.test(exSentence)
            ? `For example, ${exSentence.charAt(0).toLowerCase()}${exSentence.slice(1)}`
            : exSentence;
        selectedSentences.push(formatted);
        currentWordCount += countWords(formatted);
      } else {
        break;
      }
    }
  }

  let finalScript = selectedSentences.join(" ").trim();
  if (finalScript && !/[.!?]$/.test(finalScript)) {
    finalScript += ".";
  }

  return finalScript;
}

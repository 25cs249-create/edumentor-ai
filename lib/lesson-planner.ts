import { GoogleGenAI, Type } from "@google/genai";

export interface LessonPlannerInput {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  availableMinutes: number;
  language: string;
  teachingStyle?: string;
  depth?: string;
  sourceContext?: string;
}

export interface LessonPlanSection {
  title: string;
  minutes: number;
  purpose: string;
}

export interface LessonPlanQuestion {
  type: string;
  concept: string;
}

export interface LessonPlan {
  title: string;
  topic: string;
  language: string;
  estimatedMinutes: number;
  objectives: string[];
  sections: LessonPlanSection[];
  concepts: string[];
  questionPlan: LessonPlanQuestion[];
  nextTopic: string;
  sourceMaterial?: {
    documentName: string;
    chunks?: string[];
  };
}

const lessonPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    topic: { type: Type.STRING },
    language: { type: Type.STRING },
    estimatedMinutes: { type: Type.INTEGER },
    objectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          minutes: { type: Type.INTEGER },
          purpose: { type: Type.STRING },
        },
        required: ["title", "minutes", "purpose"],
      },
    },
    concepts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    questionPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          concept: { type: Type.STRING },
        },
        required: ["type", "concept"],
      },
    },
    nextTopic: { type: Type.STRING },
  },
  required: [
    "title",
    "topic",
    "language",
    "estimatedMinutes",
    "objectives",
    "sections",
    "concepts",
    "questionPlan",
    "nextTopic",
  ],
};

export async function createLessonPlan(
  input: LessonPlannerInput
): Promise<LessonPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const isHinglish =
    input.language.toLowerCase().includes("hinglish");
  const isHindi =
    input.language.toLowerCase().includes("hindi") && !isHinglish;

  let languageInstruction = `Language: ${input.language}. Ensure the entire lesson plan is written in ${input.language}.`;
  if (isHinglish) {
    languageInstruction = `Language: Hinglish. Naturally blend Hindi conversational tone and phrases with English technical and physics terms (e.g., "Inertia ko samajhna", "Jab tak external force apply na ho...", "Real-world examples se concept clear karna"). Do NOT translate technical scientific terms unnaturally into formal Hindi; keep core concepts in English.`;
  } else if (isHindi) {
    languageInstruction = `Language: Hindi. Write the lesson plan in clear Hindi while keeping recognized scientific terms accessible.`;
  }

  let ragInstruction = "";
  if (input.sourceContext && input.sourceContext.trim().length > 0) {
    ragInstruction = `
PRIMARY SOURCE MATERIAL (STRICT RAG GROUNDING):
The user provided the following extracted reference documents:
"""
${input.sourceContext.trim()}
"""
Instructions for Grounded Teaching:
1. When source material is provided, ground lesson claims in it and do not invent facts that are not supported by the material. You may explain concepts more clearly, but do not contradict the source.
2. Build the lesson plan strictly around concepts and facts present in the source material.
3. Do not invent facts that conflict with the source material.
4. Do not introduce extraneous external theories not mentioned in the source material.
`;
  } else {
    ragInstruction = `No specific document context provided. You may draw upon general educational knowledge for this topic.`;
  }

  const prompt = `You are EduMentor AI's master Lesson Planner.
Create a structured, highly pedagogical lesson plan tailored to the learner's specific profile and constraints.

INPUT PARAMETERS:
- Topic: ${input.topic}
- Learner Level: ${input.level}
- Learning Goal: ${input.goal}
- Available Time: ${input.availableMinutes} minutes
- Language: ${input.language}
- Teaching Style: ${input.teachingStyle || "interactive and adaptive"}
- Depth: ${input.depth || "standard"}

${languageInstruction}

${ragInstruction}

PEDAGOGICAL & TIME BUDGET CONSTRAINTS:
1. Available Time Structure:
   - The total estimated minutes should be exactly ${input.availableMinutes}.
   - The sum of the section minutes MUST equal ${input.availableMinutes} minutes.
   - For short lessons (~5 minutes): Focus tightly on 1-2 core concepts, quick explanation, immediate check question, and crisp wrap-up (2-3 concise sections).
   - For medium lessons (~10 minutes): Prior knowledge activation, core explanation, intuitive demonstration/example, understanding check, and brief practice.
   - For long lessons (20-30 minutes): Comprehensive flow including prior knowledge activation, deep multi-part concept breakdown, multiple demonstrations/examples, guided problem-solving, structured practice, and synthesis/wrap-up.

2. Level Adaptation:
   - "beginner": Use intuitive analogies, everyday relatable examples, simple step-by-step breakdowns, and avoid overly dense mathematical formalism.
   - "intermediate": Balance formal definitions with clear physical intuition and guided numerical/conceptual application.
   - "advanced": Emphasize rigorous principles, precise mathematical expressions, boundary conditions, edge cases, and deeper conceptual derivations.

3. Goal Adaptation:
   - "exam preparation": Focus on syllabus-critical definitions, key formulas, common traps/misconceptions, memory hooks, and exam-style problem-solving questions.
   - "interview preparation": Focus on conceptual clarity, first-principles reasoning, explaining "why" rather than just "what", practical applications, and thought-provoking technical interview questions.
   - Other goals: Adapt the objectives, section purposes, and questions accordingly.

Generate a complete, coherent lesson plan JSON adhering strictly to the schema.`;

  const candidateModels = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const currentModel = candidateModels[attempt];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: lessonPlanResponseSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response for the lesson plan.");
      }

      const plan = JSON.parse(text) as LessonPlan;
      return plan;
    } catch (error: unknown) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransient =
        message.includes("503") ||
        message.includes("429") ||
        message.includes("UNAVAILABLE") ||
        message.includes("RESOURCE_EXHAUSTED");
      if (isTransient && attempt < candidateModels.length - 1) {
        continue;
      }
      break;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Failed to generate lesson plan.";
  throw new Error(`Lesson Planner failed: ${message}`);
}

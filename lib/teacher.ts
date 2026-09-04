import { GoogleGenAI, Type } from "@google/genai";
 
export interface LessonPlanSection {
  title: string;
  minutes?: number;
  purpose?: string;
  [key: string]: unknown;
}

export interface TeacherInput {
  lessonPlan: {
    title: string;
    topic?: string;
    sections?: LessonPlanSection[];
    nextTopic?: string;
    [key: string]: unknown;
  };
  currentSection: LessonPlanSection;
  currentConcept: string;
  language: string;
  learnerLevel: "beginner" | "intermediate" | "advanced";
  teachingStyle?: string;
  sourceContext?: string;
  adaptiveInstruction?: string;
}

export interface VisualSuggestion {
  type: string;
  description: string;
}

export interface TeachingQuestion {
  type: string;
  question: string;
  options?: string[];
  expectedConcept: string;
}

export interface TeachingStep {
  sectionTitle: string;
  explanation: string;
  example: string;
  visualSuggestion: VisualSuggestion;
  question: TeachingQuestion;
  nextSectionTitle: string;
}

const teachingStepResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sectionTitle: { type: Type.STRING },
    explanation: { type: Type.STRING },
    example: { type: Type.STRING },
    visualSuggestion: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        description: { type: Type.STRING },
      },
      required: ["type", "description"],
    },
    question: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: [
            "conceptual",
            "mcq",
            "short_answer",
            "problem_solving",
            "application",
            "explain_in_own_words",
          ],
        },
        question: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        expectedConcept: { type: Type.STRING },
      },
      required: ["type", "question", "expectedConcept"],
    },
    nextSectionTitle: { type: Type.STRING },
  },
  required: [
    "sectionTitle",
    "explanation",
    "example",
    "visualSuggestion",
    "question",
    "nextSectionTitle",
  ],
};

export async function generateTeachingStep(
  input: TeacherInput
): Promise<TeachingStep> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Determine next section from lesson plan if available
  const sections = Array.isArray(input.lessonPlan?.sections)
    ? input.lessonPlan.sections
    : [];
  const currentIndex = sections.findIndex(
    (s) =>
      s?.title?.toLowerCase()?.trim() ===
      input.currentSection?.title?.toLowerCase()?.trim()
  );
  const fallbackNext =
    currentIndex >= 0 && currentIndex < sections.length - 1
      ? sections[currentIndex + 1].title
      : input.lessonPlan?.nextTopic || "Lesson Conclusion";

  const isHinglish = input.language.toLowerCase().includes("hinglish");
  const isHindi =
    input.language.toLowerCase().includes("hindi") && !isHinglish;

  let languageInstruction = `Language: ${input.language}. Deliver the entire teaching explanation, example, and question in ${input.language}.`;
  if (isHinglish) {
    languageInstruction = `Language: Hinglish.
- Use a natural, conversational, warm Hindi-English blend as spoken by modern educators in India.
- Technical terms (e.g. force, acceleration, inertia, velocity, resistance, friction, momentum, mass, gravity) must remain in English where natural.
- The conversational and explanatory scaffolding should be in natural Hindi using the Latin script (e.g. "Maan lijiye aap ek moving bus mein baithe hain...", "Jab bus achanak rukti hai toh...", "Isko ek simple example se samajhte hain...").
- Ensure the question is also asked in natural Hinglish.`;
  } else if (isHindi) {
    languageInstruction = `Language: Hindi. Deliver the lesson in clear, engaging Hindi while keeping recognized scientific terms accessible.`;
  }

  let ragInstruction = "";
  if (input.sourceContext && input.sourceContext.trim().length > 0) {
    ragInstruction = `
PRIMARY FACTUAL BASIS (STRICT RAG GROUNDING):
The user provided the following reference source material:
"""
${input.sourceContext.trim()}
"""
Instructions for Grounded Teaching:
1. Stay strictly grounded in the facts, statements, and terminology provided in the source material.
2. Avoid contradicting the source material.
3. Avoid introducing unnecessary external facts or theories beyond what is in the source.
4. Teach concepts present in the source.
`;
  } else {
    ragInstruction = `No uploaded document provided. Teach using accurate general educational knowledge of the concept.`;
  }

  let teachingStyleInstruction = "";
  if (input.teachingStyle) {
    const styleLower = input.teachingStyle.toLowerCase();
    if (styleLower.includes("visual")) {
      teachingStyleInstruction = `Teaching Style: "visual" - Emphasize spatial intuition, mental models, visual descriptions, and clear diagrammatic suggestions.`;
    } else if (styleLower.includes("practical")) {
      teachingStyleInstruction = `Teaching Style: "practical" - Emphasize real-world mechanics, hands-on examples, everyday scenarios, and physical demonstrations.`;
    } else if (styleLower.includes("conceptual")) {
      teachingStyleInstruction = `Teaching Style: "conceptual" - Emphasize first-principles intuition, deep reasoning, and exploring the fundamental "why" and "how".`;
    } else {
      teachingStyleInstruction = `Teaching Style: "${input.teachingStyle}" - Incorporate this preferred teaching style seamlessly.`;
    }
  }

  let adaptiveInstructionText = "";
  if (input.adaptiveInstruction && input.adaptiveInstruction.trim().length > 0) {
    adaptiveInstructionText = `
ADAPTIVE TEACHING INSTRUCTION (HIGH PRIORITY ADAPTATION):
Following the student's previous answer evaluation, follow this specific adaptive instruction for this step:
"""
${input.adaptiveInstruction.trim()}
"""
- If reteaching: Use the identified misconception, current concept, and supplied source context. Re-explain the concept from a fresh angle without contradicting the source, generating a different analogy/example/visual and asking a simpler follow-up question.
- If reinforcing: Clarify the missing concept or terminology starting from the student's existing intuition and source context, then ask another targeted question checking the same concept.
- If advancing: Move smoothly into the next concept without unnecessary repetition.
`;
  }

  const prompt = `You are EduMentor AI's master interactive AI Teacher.
Deliver ONE interactive teaching step for the specified section of this lesson.
Act as an inspiring, empathetic mentor in a one-on-one session, NOT a dry textbook summarizer.

LESSON CONTEXT:
- Lesson Title: "${input.lessonPlan.title}"
- Topic: ${input.lessonPlan.topic || input.currentConcept}
- Current Section: "${input.currentSection.title}"
- Current Concept to Teach: "${input.currentConcept}"
- Learner Level: ${input.learnerLevel}
- Next Section: "${fallbackNext}"
${teachingStyleInstruction ? `- ${teachingStyleInstruction}` : ""}
${adaptiveInstructionText ? `${adaptiveInstructionText}` : ""}

${languageInstruction}

${ragInstruction}

TEACHING STEP FLOW & BEHAVIOR:
1. "sectionTitle": Must match or clearly reflect "${input.currentSection.title}".
2. "explanation":
   - Explain "${input.currentConcept}" clearly, engagingly, and step by step.
   - For "beginner": Use simple vocabulary, intuitive analogies, fewer assumptions, and everyday scenarios. Avoid unnecessary technical jargon.
   - For "intermediate": Balance physical intuition with moderate standard terminology and practical examples.
   - For "advanced": Use precise terminology, deeper reasoning from first principles, and edge cases only when relevant. Avoid generic textbook summaries.
3. "example":
   - Provide a concrete, vivid demonstration, thought experiment, or practical example illustrating the concept in action.
4. "visualSuggestion":
   - Suggest a subject-aware visual aid that directly enhances understanding of this specific subject:
     * Physics: force diagrams, motion diagrams, formula display, graphs (e.g., velocity-time).
     * Mathematics: equations, worked steps, graphs, geometric diagrams.
     * Biology: labeled diagrams, processes, structures.
     * History: timeline, map, event sequence.
     * Programming: code, output, flowchart, architecture diagram.
     * Other subjects: domain-accurate visual representation.
   - "type": Structured visual type (e.g., "force diagram", "motion diagram", "worked steps", "flowchart", etc.).
   - "description": Concrete description of what the visual would display (labels, vectors, elements, annotations). Do not generate raw images.
5. "question":
   - Check the learner's immediate understanding of "${input.currentConcept}".
   - "type": Choose the most pedagogically appropriate type among:
     * "conceptual"
     * "mcq"
     * "short_answer"
     * "problem_solving"
     * "application"
     * "explain_in_own_words"
     (Do NOT always use MCQs; select the type best suited for the concept).
   - "question": The actual question text asked to the student.
   - "options": Include ONLY if type is "mcq" (3-4 option strings without indicating which is correct). Otherwise provide an empty array [].
   - "expectedConcept": Brief summary of the core concept or principle that a correct student response should demonstrate. (This is strictly for backend evaluation later).
   - CRITICAL QUESTION RULE:
     * Do NOT provide the answer or solution to the question anywhere in your teaching step (explanation, example, question text, or options).
     * The student must actively think and answer it.
     * No hidden answer text, hints that spoil the answer, or marked options.
6. "nextSectionTitle": Should be "${fallbackNext}".

Generate a complete JSON response adhering strictly to the schema.`;

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
          responseSchema: teachingStepResponseSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response for the teaching step.");
      }

      const step = JSON.parse(text) as TeachingStep;
      return step;
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
    lastError instanceof Error ? lastError.message : "Failed to generate teaching step.";
  throw new Error(`AI Teacher failed: ${message}`);
}


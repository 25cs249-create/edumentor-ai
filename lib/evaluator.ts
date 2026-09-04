import { GoogleGenAI, Type } from "@google/genai";

export interface EvaluatorInput {
  question: string;
  questionType: string;
  expectedConcept: string;
  studentAnswer: string;
  language: string;
  learnerLevel: "beginner" | "intermediate" | "advanced";
  sourceContext?: string;
}

export interface AnswerEvaluation {
  result: "correct" | "partially_correct" | "incorrect";
  score: number;
  understanding: string;
  misconception: string | null;
  missingConcept: string | null;
  feedback: string;
  recommendedAction: "advance" | "reinforce" | "reteach";
}

const answerEvaluationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    result: {
      type: Type.STRING,
      enum: ["correct", "partially_correct", "incorrect"],
    },
    score: {
      type: Type.INTEGER,
    },
    understanding: {
      type: Type.STRING,
    },
    misconception: {
      type: Type.STRING,
      nullable: true,
    },
    missingConcept: {
      type: Type.STRING,
      nullable: true,
    },
    feedback: {
      type: Type.STRING,
    },
    recommendedAction: {
      type: Type.STRING,
      enum: ["advance", "reinforce", "reteach"],
    },
  },
  required: [
    "result",
    "score",
    "understanding",
    "misconception",
    "missingConcept",
    "feedback",
    "recommendedAction",
  ],
};

export async function evaluateAnswer(
  input: EvaluatorInput
): Promise<AnswerEvaluation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const isHinglish = input.language.toLowerCase().includes("hinglish");
  const isHindi =
    input.language.toLowerCase().includes("hindi") && !isHinglish;

  let languageInstruction = `Language: ${input.language}. Deliver the "feedback" and "understanding" text in ${input.language}.`;
  if (isHinglish) {
    languageInstruction = `Language: Hinglish.
- Deliver the teacher "feedback" and "understanding" in warm, natural Hinglish (conversational Hindi-English blend as spoken by modern educators in India).
- Keep core technical terms in English (e.g., force, acceleration, inertia, velocity, mass, friction).
- Accurately evaluate the student's answer even if they write in Hinglish, English, Hindi, or a mix. Do NOT penalize informal expression, grammar, or spelling when the conceptual physics meaning is clear.`;
  } else if (isHindi) {
    languageInstruction = `Language: Hindi. Deliver the "feedback" and "understanding" in clear, encouraging Hindi while maintaining standard scientific vocabulary.`;
  }

  let ragInstruction = "";
  if (input.sourceContext && input.sourceContext.trim().length > 0) {
    ragInstruction = `
PRIMARY FACTUAL BASIS (STRICT RAG GROUNDING):
The user provided the following reference source material:
"""
${input.sourceContext.trim()}
"""
Instructions for Grounded Evaluation:
1. Use this source material as your primary factual benchmark for truth.
2. Judge the student's answer against definitions, principles, and terms established in this source.
3. Do not penalize the student for conforming to the source material over external conventions.
`;
  } else {
    ragInstruction = `No specific document context provided. Evaluate using the target expectedConcept and accurate educational knowledge.`;
  }

  const prompt = `You are EduMentor AI's master educational evaluator.
Your mission is to evaluate a learner's response to a question with high conceptual acuity, empathy, and pedagogical precision.

INPUT DATA:
- Question Asked: "${input.question}"
- Question Type: "${input.questionType}"
- Target / Expected Concept: "${input.expectedConcept}"
- Learner Level: ${input.learnerLevel}
- Student's Answer: "${input.studentAnswer}"

${languageInstruction}

${ragInstruction}

EVALUATION CRITERIA & PEDAGOGICAL GUIDELINES:

1. ASSESS CONCEPTUAL UNDERSTANDING, NOT KEYWORD MATCHING:
   - Judge whether the learner grasps the underlying principle, mechanism, or cause-and-effect.
   - Do NOT penalize students for not reciting textbook keywords verbatim if the core concept is clearly understood.
   - Do NOT penalize grammar, spelling, or informal language if the conceptual meaning is sound.
   - Readily understand mixed language (Hinglish/Hindi/English) expressions (e.g. "Body aage move karti hai because inertia usko motion mein rakhta hai" is conceptually correct).

2. EVALUATION OUTCOME ("result") & SCORING ("score" from 0 to 100):
   - "correct" (Score ~80–100): The student accurately identified or explained the core concept/cause.
   - "partially_correct" (Score ~50–79): The student has the right intuition or stated a correct partial fact, but omitted the primary underlying principle or mechanism.
   - "incorrect" (Score ~0–49): The student stated a factually incorrect idea, reversed the physical relationship, or attributed the effect to an incorrect cause.

3. RECOMMENDED ACTION ("recommendedAction"):
   - "advance": Use when understanding is solid ("correct"). The student is ready to move to the next concept.
   - "reinforce": Use when the student is on the right track ("partially_correct") but needs clarification or stronger articulation. (Do NOT recommend "reteach" unless there is a genuine misunderstanding).
   - "reteach": Use when the student's answer is "incorrect" or contains a major conceptual misconception that needs to be unlearned and retaught.

4. MISCONCEPTION DETECTION ("misconception"):
   - If the answer is incorrect or reveals a flawed mental model, identify the specific misconception (e.g., "Student believes the forward motion is caused by a push from the stopping bus rather than inertia of motion").
   - CRITICAL ANTI-HALLUCINATION RULE:
     * Only infer misconceptions that are directly supported by what the student actually stated.
     * Do NOT invent or speculate about unstated misconceptions.
     * If the answer is correct, or if it is merely incomplete without an erroneous belief, set "misconception": null.

5. MISSING CONCEPT ("missingConcept"):
   - Identify the exact concept the student still needs to grasp (e.g., "Inertia / Newton's First Law", "Inverse relationship between mass and acceleration for constant force").
   - If the student demonstrated full understanding of the expected concept, set "missingConcept": null.

6. UNDERSTANDING SUMMARY ("understanding"):
   - A concise 1-2 sentence summary of what the student's answer reveals about their current mental model.

7. TEACHER FEEDBACK ("feedback"):
   - Provide concise, encouraging, teacher-oriented feedback addressed to the student in the requested language.
   - For correct: Affirm their understanding clearly.
   - For partial: Validate what they got right, then highlight the missing key mechanism.
   - For incorrect: Gently clarify the mistake and highlight the correct principle without giving an overwhelming lecture.

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
          responseSchema: answerEvaluationResponseSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response for the answer evaluation.");
      }

      const evaluation = JSON.parse(text) as AnswerEvaluation;
      return evaluation;
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
    lastError instanceof Error ? lastError.message : "Failed to evaluate answer.";
  throw new Error(`AI Evaluator failed: ${message}`);
}

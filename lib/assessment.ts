import { GoogleGenAI, Type } from "@google/genai";
import { evaluateAnswer, AnswerEvaluation } from "./evaluator";

export interface AssessmentInput {
  topic: string;
  concepts: string[];
  lessonSummary?: string;
  sourceContext?: string;
  language: string;
  learnerLevel: "beginner" | "intermediate" | "advanced";
  goal?: string;
  questionCount?: number;
}

export interface AssessmentQuestion {
  id: string;
  concept: string;
  type:
    | "conceptual"
    | "mcq"
    | "short_answer"
    | "problem_solving"
    | "application";
  question: string;
  options?: string[];
  expectedConcept: string;
}

export interface GeneratedAssessment {
  title: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentAnswerInput {
  questionId: string;
  answer: string;
}

export interface AssessmentEvaluationInput {
  questions: AssessmentQuestion[];
  answers: AssessmentAnswerInput[];
  language: string;
  learnerLevel: "beginner" | "intermediate" | "advanced";
  sourceContext?: string;
}

export interface QuestionResult {
  questionId: string;
  concept: string;
  evaluation: AnswerEvaluation;
}

export interface AssessmentResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  strongConcepts: string[];
  weakConcepts: string[];
  questionResults: QuestionResult[];
  revisionRecommendation: string;
  nextTopicRecommendation: string;
}

const assessmentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          concept: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: [
              "conceptual",
              "mcq",
              "short_answer",
              "problem_solving",
              "application",
            ],
          },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          expectedConcept: { type: Type.STRING },
        },
        required: ["id", "concept", "type", "question", "expectedConcept"],
      },
    },
  },
  required: ["title", "questions"],
};

/**
 * Generates a structured assessment using one Gemini API call.
 */
export async function generateAssessment(
  input: AssessmentInput
): Promise<GeneratedAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const rawCount = input.questionCount ?? 5;
  const count = Math.min(Math.max(rawCount, 3), 5);

  const isHinglish = input.language.toLowerCase().includes("hinglish");
  const isHindi =
    input.language.toLowerCase().includes("hindi") && !isHinglish;

  let languageInstruction = `Language: ${input.language}. Write all questions in ${input.language}.`;
  if (isHinglish) {
    languageInstruction = `Language: Hinglish.
- Write the questions in natural, conversational educational Hinglish (as used in Indian classrooms).
- Keep core technical terms in English (e.g., force, acceleration, inertia, mass, velocity, friction).
- Use natural Hindi phrasing in Latin script for questions and options.`;
  } else if (isHindi) {
    languageInstruction = `Language: Hindi. Write the questions in clear Hindi while keeping scientific terminology accessible.`;
  }

  let ragInstruction = "";
  if (input.sourceContext && input.sourceContext.trim().length > 0) {
    ragInstruction = `
PRIMARY FACTUAL BASIS (STRICT RAG GROUNDING):
Reference Material:
"""
${input.sourceContext.trim()}
"""
Instructions: Base the questions and expected concepts strictly on facts, laws, and definitions presented in this source.
`;
  } else {
    ragInstruction = `Draw upon the provided topic and concepts with educational precision.`;
  }

  const prompt = `You are EduMentor AI's master assessment designer.
Generate a cohesive, highly pedagogical end-of-lesson assessment of exactly ${count} questions.

ASSESSMENT METADATA:
- Topic: "${input.topic}"
- Concepts to Test: ${JSON.stringify(input.concepts)}
- Learner Level: ${input.learnerLevel}
- Total Questions Required: ${count}
${input.goal ? `- Learning Goal: ${input.goal}` : ""}
${input.lessonSummary ? `- Lesson Summary: ${input.lessonSummary}` : ""}

${languageInstruction}

${ragInstruction}

QUESTION DESIGN GUIDELINES:
1. Generate EXACTLY ${count} questions. Use sequential ids ("q1", "q2", ...).
2. Each question MUST target one of the listed concepts: ${JSON.stringify(input.concepts)}.
3. Ensure a diverse, balanced mixture of question types across:
   - "conceptual": test understanding of core principles and reasons ("why/how").
   - "mcq": multiple-choice with 3-4 distinct options (do NOT indicate which is correct).
   - "application": real-world situations or thought experiments.
   - "problem_solving": numerical or logical derivation suited for ${input.learnerLevel}.
   - "short_answer": explaining a concept concisely in own words.
   (Do NOT make every question an MCQ. Use at least 2 different types).
4. Difficulty Adaptation:
   - "beginner": straightforward scenarios, relatable everyday analogies, simple language.
   - "intermediate": standard problem scenarios, moderate terminology.
   - "advanced": deeper analytical reasoning, edge conditions, precise formulations.
5. CRITICAL QUESTION RULES:
   - Do NOT include the correct answer or solution anywhere in the question text or options!
   - "expectedConcept": concisely specify the underlying principle or criterion that an evaluator will check for in the student's response.

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
          responseSchema: assessmentResponseSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response for the assessment.");
      }

      const parsed = JSON.parse(text) as GeneratedAssessment;

      // Ensure question ids and array length bounds
      if (Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map((q, idx) => ({
          ...q,
          id: q.id || `q${idx + 1}`,
          options: q.type === "mcq" && Array.isArray(q.options) ? q.options : [],
        }));
      }

      return parsed;
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
    lastError instanceof Error ? lastError.message : "Failed to generate assessment.";
  throw new Error(`AI Assessment generator failed: ${message}`);
}

/**
 * Evaluates an entire assessment deterministically using the existing evaluateAnswer engine.
 * Unanswered questions are scored locally (0 points, incorrect) without wasting AI calls.
 */
export async function evaluateAssessment(
  input: AssessmentEvaluationInput
): Promise<AssessmentResult> {
  const { questions, answers, language, learnerLevel, sourceContext } = input;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Questions list must be a non-empty array.");
  }

  // Map answers by questionId for fast lookup
  const answerMap = new Map<string, string>();
  for (const a of answers || []) {
    if (a && typeof a.questionId === "string") {
      answerMap.set(a.questionId.trim(), typeof a.answer === "string" ? a.answer.trim() : "");
    }
  }

  const questionResults: QuestionResult[] = [];
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  let totalPoints = 0;

  // Track points per concept for deterministic strong/weak classification
  const conceptScores = new Map<string, { totalPoints: number; count: number }>();

  for (const question of questions) {
    const conceptKey = question.concept.trim();
    if (!conceptScores.has(conceptKey)) {
      conceptScores.set(conceptKey, { totalPoints: 0, count: 0 });
    }

    const studentAnswer = answerMap.get(question.id) ?? "";
    const isMissing = !studentAnswer || studentAnswer.trim().length === 0;

    let evaluation: AnswerEvaluation;

    if (isMissing) {
      // Local evaluation for missing answer: avoids wasting an AI call
      evaluation = {
        result: "incorrect",
        score: 0,
        understanding: "No answer provided.",
        misconception: null,
        missingConcept: question.expectedConcept,
        feedback: "This question was not answered.",
        recommendedAction: "reteach",
      };
    } else {
      // Use the existing evaluateAnswer function
      evaluation = await evaluateAnswer({
        question: question.question,
        questionType: question.type,
        expectedConcept: question.expectedConcept,
        studentAnswer,
        language,
        learnerLevel,
        sourceContext,
      });
    }

    // Deterministic points assignment
    // correct = 100 points, partially_correct = 60 points, incorrect = 0 points
    let points = 0;
    if (evaluation.result === "correct") {
      points = 100;
      correctCount++;
    } else if (evaluation.result === "partially_correct") {
      points = 60;
      partialCount++;
    } else {
      points = 0;
      incorrectCount++;
    }

    totalPoints += points;

    const currentConceptStat = conceptScores.get(conceptKey)!;
    currentConceptStat.totalPoints += points;
    currentConceptStat.count += 1;

    questionResults.push({
      questionId: question.id,
      concept: question.concept,
      evaluation,
    });
  }

  // Deterministic overall score calculation
  const totalQuestions = questions.length;
  const overallScore = Math.round(totalPoints / totalQuestions);

  // Deterministic strong and weak concepts determination
  // average score per concept: >= 80 -> strong, < 80 -> weak
  const strongConcepts: string[] = [];
  const weakConcepts: string[] = [];

  for (const [concept, stat] of conceptScores.entries()) {
    if (stat.count > 0) {
      const avg = stat.totalPoints / stat.count;
      if (avg >= 80) {
        strongConcepts.push(concept);
      } else {
        weakConcepts.push(concept);
      }
    }
  }

  // Deterministic revision recommendation
  let revisionRecommendation = "";
  if (weakConcepts.length === 0) {
    revisionRecommendation =
      "Great work! Review the key concepts briefly and continue to the next topic.";
  } else {
    revisionRecommendation = `Review: ${weakConcepts.join(", ")}. Focus especially on reinforcing these concepts before moving on.`;
  }

  // Deterministic next topic recommendation
  let nextTopicRecommendation = "";
  if (overallScore >= 80 && weakConcepts.length === 0) {
    nextTopicRecommendation = "Continue to the next topic.";
  } else if (overallScore >= 50) {
    const weakList = weakConcepts.length > 0 ? ` (${weakConcepts.join(", ")})` : "";
    nextTopicRecommendation = `Reinforce the weak concepts${weakList} before moving to the next topic.`;
  } else {
    const weakList = weakConcepts.length > 0 ? ` (${weakConcepts.join(", ")})` : "";
    nextTopicRecommendation = `Revisit the lesson and re-learn the weak concepts${weakList} before advancing.`;
  }

  return {
    score: overallScore,
    totalQuestions,
    correctAnswers: correctCount,
    partialAnswers: partialCount,
    incorrectAnswers: incorrectCount,
    strongConcepts,
    weakConcepts,
    questionResults,
    revisionRecommendation,
    nextTopicRecommendation,
  };
}

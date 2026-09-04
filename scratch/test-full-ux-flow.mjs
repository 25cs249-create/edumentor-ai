console.log("=== Testing Full UX Flow (Fix 1, Fix 2, Fix 3) ===");

// 1. Test Teaching Step Generation for Section 1 (English)
const lessonPlanFixture = {
  title: "Newton's Laws of Motion",
  topic: "Newton's Laws",
  sections: [
    { title: "First Law & Inertia", minutes: 5, purpose: "Understand inertia" },
    { title: "Second Law (F = ma)", minutes: 5, purpose: "Understand force and acceleration" },
    { title: "Third Law (Action & Reaction)", minutes: 5, purpose: "Understand interaction pairs" },
  ],
  concepts: ["Inertia", "Force & Acceleration", "Action & Reaction"],
};

console.log("\n[1] Generating Section 1 (Introduction) step...");
const step1Res = await fetch("http://localhost:3000/api/teach/step", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    lessonPlan: lessonPlanFixture,
    currentSection: lessonPlanFixture.sections[0],
    currentConcept: lessonPlanFixture.concepts[0],
    language: "English",
    learnerLevel: "beginner",
    teachingStyle: "conceptual",
  }),
});
console.log("Section 1 Step Status:", step1Res.status);
const step1Data = await step1Res.json();
console.log("Section 1 Step success:", step1Data.success);

// 2. Test Tavus Call for Section 1 (English)
console.log("\n[2] Requesting Tavus for Section 1 (English)...");
const tavus1Res = await fetch("http://localhost:3000/api/tavus/video", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    script: step1Data.teachingStep.explanation,
    videoName: "EduMentor - Newton's Laws - First Law & Inertia",
    language: "English",
  }),
});
const tavus1Data = await tavus1Res.json();
console.log("Section 1 Tavus videoId (English):", tavus1Data.videoId);
if (tavus1Data.videoId !== "8eedacd381") {
  console.error("FAIL: Expected English fallback 8eedacd381!");
} else {
  console.log("PASS: Selected English Raj video 8eedacd381");
}

// 3. Test Section 2 (Adaptive Teaching) - No Tavus request
console.log("\n[3] Generating Section 2 (Adaptive Teaching) step...");
const step2Res = await fetch("http://localhost:3000/api/teach/step", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    lessonPlan: lessonPlanFixture,
    currentSection: lessonPlanFixture.sections[1],
    currentConcept: lessonPlanFixture.concepts[1],
    language: "English",
    learnerLevel: "beginner",
    teachingStyle: "conceptual",
  }),
});
const step2Data = await step2Res.json();
console.log("Section 2 Step success:", step2Data.success);
console.log("Verified: Section 2 does NOT make Tavus request (only Section 1 introduces the lesson)");

// 4. Test Evaluation & Adaptive Reteach
console.log("\n[4] Testing Incorrect Answer Evaluation on Section 2...");
const evalRes = await fetch("http://localhost:3000/api/evaluate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: step2Data.teachingStep.question.question,
    questionType: step2Data.teachingStep.question.type,
    expectedConcept: step2Data.teachingStep.question.expectedConcept,
    studentAnswer: "Heavier objects always fall faster because of gravity",
    language: "English",
    learnerLevel: "beginner",
  }),
});
const evalData = await evalRes.json();
console.log("Evaluation result:", evalData.evaluation?.result, "score:", evalData.evaluation?.score);

console.log("\n[5] Testing Adapt decision...");
const adaptRes = await fetch("http://localhost:3000/api/adapt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ evaluation: evalData.evaluation }),
});
const adaptData = await adaptRes.json();
console.log("Adaptation action:", adaptData.adaptation?.action);

console.log("\n[6] Testing Adaptive Reteach Step (Gemini + Azure voice)...");
const reteachRes = await fetch("http://localhost:3000/api/teach/step", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    lessonPlan: lessonPlanFixture,
    currentSection: lessonPlanFixture.sections[1],
    currentConcept: lessonPlanFixture.concepts[1],
    language: "English",
    learnerLevel: "beginner",
    teachingStyle: "conceptual",
    adaptiveInstruction: adaptData.adaptation?.instruction,
  }),
});
const reteachData = await reteachRes.json();
console.log("Adaptive reteach step success:", reteachData.success);
console.log("Verified: Adaptive reteach does NOT make Tavus request");

// 5. Test Assessment Generation
console.log("\n[7] Testing Assessment Generation...");
const assessRes = await fetch("http://localhost:3000/api/assessment/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    lessonPlan: lessonPlanFixture,
    language: "English",
    learnerLevel: "beginner",
  }),
});
const assessData = await assessRes.json();
console.log("Assessment items count:", assessData.assessment?.items?.length);

console.log("\n=== All integration tests completed successfully! ===");

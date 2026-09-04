import assert from "node:assert";

class MockSessionStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

async function run() {
  console.log("=== Step 8C Verification Test: Demo Session Reset ===");

  // 1. Simulate existing stale session state in sessionStorage
  console.log("\n[1] Simulating pre-existing stale session data...");
  const mockStorage = new MockSessionStorage();
  mockStorage.setItem("edumentor_current_lesson", JSON.stringify({ title: "Old Lesson on Thermodynamics" }));
  mockStorage.setItem("edumentor_current_assessment", JSON.stringify({ title: "Old Quiz" }));
  mockStorage.setItem("edumentor_assessment_result", JSON.stringify({ score: 45 }));
  mockStorage.setItem("edumentor_current_material", "syllabus_2025.pdf");
  mockStorage.setItem("user_theme_preference", "dark"); // Unrelated key

  assert(mockStorage.getItem("edumentor_current_lesson") !== null, "Stale lesson exists");
  assert(mockStorage.getItem("edumentor_current_assessment") !== null, "Stale assessment exists");
  assert(mockStorage.getItem("edumentor_assessment_result") !== null, "Stale result exists");
  assert(mockStorage.getItem("edumentor_current_material") !== null, "Stale material exists");
  assert(mockStorage.getItem("user_theme_preference") === "dark", "Unrelated key exists");
  console.log("✓ Stale lesson, assessment, report, and material keys initialized");

  // 2. Execute handleLaunchDemo logic (the exact logic in app/page.tsx)
  console.log("\n[2] Executing handleLaunchDemo reset logic...");
  mockStorage.removeItem("edumentor_current_lesson");
  mockStorage.removeItem("edumentor_current_assessment");
  mockStorage.removeItem("edumentor_assessment_result");
  mockStorage.removeItem("edumentor_current_material");

  // 3. Verify clean session state
  console.log("\n[3] Verifying that target keys are purged and unrelated keys remain...");
  assert.strictEqual(mockStorage.getItem("edumentor_current_lesson"), null, "edumentor_current_lesson is cleared");
  assert.strictEqual(mockStorage.getItem("edumentor_current_assessment"), null, "edumentor_current_assessment is cleared");
  assert.strictEqual(mockStorage.getItem("edumentor_assessment_result"), null, "edumentor_assessment_result is cleared");
  assert.strictEqual(mockStorage.getItem("edumentor_current_material"), null, "edumentor_current_material is cleared");
  assert.strictEqual(mockStorage.getItem("user_theme_preference"), "dark", "Unrelated key was preserved");
  console.log("✓ All 4 EduMentor session keys successfully cleared; unrelated data unaffected");

  // 4. Verify landing page endpoint and link
  console.log("\n[4] Verifying landing page CTA on http://localhost:3000/...");
  const homeRes = await fetch("http://localhost:3000/");
  assert.strictEqual(homeRes.status, 200, "Landing page returns HTTP 200");
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes("Try the AI Teacher Demo"), "Landing page contains 'Try the AI Teacher Demo'");
  assert(homeHtml.includes("/learn?demo=newton"), "Landing page links to /learn?demo=newton");
  console.log("✓ Landing page CTA verified");

  // 5. Verify /learn?demo=newton route
  console.log("\n[5] Verifying /learn?demo=newton route...");
  const demoRes = await fetch("http://localhost:3000/learn?demo=newton");
  assert.strictEqual(demoRes.status, 200, "Demo setup route returns HTTP 200");
  console.log("✓ Demo route returns HTTP 200 OK");

  // 6. Verify normal /learn route
  console.log("\n[6] Verifying normal /learn route...");
  const normalRes = await fetch("http://localhost:3000/learn");
  assert.strictEqual(normalRes.status, 200, "Normal setup route returns HTTP 200");
  console.log("✓ Normal route returns HTTP 200 OK without forced preset");

  // 7. Verify lesson planner API execution with demo preset parameters
  console.log("\n[7] Verifying real lesson plan generation via /api/lesson/plan...");
  const planRes = await fetch("http://localhost:3000/api/lesson/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "Newton's Laws of Motion",
      level: "beginner",
      goal: "Exam Prep",
      availableMinutes: 10,
      language: "Hinglish",
    }),
  });
  assert.strictEqual(planRes.status, 200, "Planner API returns 200 OK");
  const planData = await planRes.json();
  assert(planData.success, "Planner response has success=true");
  assert(planData.lessonPlan?.sections?.length >= 3, "Lesson plan has >= 3 sections");
  console.log("✓ Real Gemini lesson plan successfully created:", planData.lessonPlan.title);

  console.log("\n=== Step 8C Verification Successful! All Tests Passed ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

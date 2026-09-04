import assert from "node:assert";

async function run() {
  console.log("=== Step 7C Verification Test ===");

  // Test A: Landing page has CTA linking to /learn?demo=newton with label "Try the AI Teacher Demo"
  console.log("\n[1] Testing Landing Page CTA (GET http://localhost:3000/)...");
  const homeRes = await fetch("http://localhost:3000/");
  assert.strictEqual(homeRes.status, 200, "Home page returned status 200");
  const homeHtml = await homeRes.text();
  assert(
    homeHtml.includes('href="/learn?demo=newton"') || homeHtml.includes('href="/learn?demo=newton'),
    "Home page contains link to /learn?demo=newton"
  );
  assert(
    homeHtml.includes("Try the AI Teacher Demo"),
    "Home page contains 'Try the AI Teacher Demo' button label"
  );
  console.log("✓ Landing page CTA verified: <Link href=\"/learn?demo=newton\"> -> 'Try the AI Teacher Demo'");

  // Test B: /learn?demo=newton returns 200 and loads successfully
  console.log("\n[2] Testing Demo Setup Page (GET http://localhost:3000/learn?demo=newton)...");
  const demoRes = await fetch("http://localhost:3000/learn?demo=newton");
  assert.strictEqual(demoRes.status, 200, "/learn?demo=newton returned status 200");
  console.log("✓ /learn?demo=newton loads with HTTP 200 OK");

  // Test C: Normal /learn returns 200
  console.log("\n[3] Testing Normal Setup Page (GET http://localhost:3000/learn)...");
  const normalRes = await fetch("http://localhost:3000/learn");
  assert.strictEqual(normalRes.status, 200, "/learn returned status 200");
  console.log("✓ Normal /learn loads with HTTP 200 OK");

  // Test D: Lesson planning from demo preset generates real Gemini output
  console.log("\n[4] Testing Demo Preset Payload with Gemini (/api/lesson/plan)...");
  const demoPayload = {
    topic: "Newton's Laws of Motion",
    level: "beginner",
    goal: "Exam Prep",
    availableMinutes: 10,
    language: "Hinglish",
    teachingStyle: "Conceptual",
    depth: "Standard"
  };

  const planRes = await fetch("http://localhost:3000/api/lesson/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(demoPayload)
  });

  assert.strictEqual(planRes.status, 200, "/api/lesson/plan returned status 200");
  const planData = await planRes.json();
  assert(planData.success, "API response has success = true");
  assert(planData.lessonPlan, "API response contains lessonPlan");
  assert(planData.lessonPlan.sections.length >= 3, "Lesson plan has at least 3 sections");
  console.log("✓ Generated Lesson Title:", planData.lessonPlan.title);
  console.log("✓ Sections Generated:");
  planData.lessonPlan.sections.forEach((s, idx) => {
    console.log(`   ${idx + 1}. ${s.title} (${s.minutes} min) - ${s.purpose}`);
  });

  console.log("\n=== All Verification Tests Passed Successfully! ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

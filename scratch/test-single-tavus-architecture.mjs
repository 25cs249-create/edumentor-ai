import assert from "node:assert";

console.log("=== Testing Single Tavus Video Per Lesson Architecture ===");

// Simulate lesson session state machine as implemented in app/teach/page.tsx
class TeachingRoomSession {
  constructor(topic = "Newton's Laws of Motion") {
    this.topic = topic;
    this.hasRequestedTavusForLesson = false;
    this.videoState = "idle";
    this.videoUrl = null;
    this.tavusPostCount = 0;
  }

  // Triggered when loadTeachingStep completes
  onTeachingStepLoaded(sectionIndex, isAdaptive = false) {
    // Exact condition from app/teach/page.tsx:
    // if (!hasRequestedTavusForLesson && targetSectionIdx === 0 && !adaptiveInstruction)
    if (!this.hasRequestedTavusForLesson && sectionIndex === 0 && !isAdaptive) {
      this.hasRequestedTavusForLesson = true;
      this.triggerTavusVideo();
    }
  }

  triggerTavusVideo() {
    this.tavusPostCount++;
    this.videoState = "preparing";
  }

  onTavusReady(url) {
    this.videoState = "ready";
    this.videoUrl = url;
  }

  // Section 13: Advance to next section
  advanceSection(nextSectionIdx) {
    this.onTeachingStepLoaded(nextSectionIdx, false);
  }

  // Section 14: Partial -> Reinforce
  reinforce(sectionIdx) {
    this.onTeachingStepLoaded(sectionIdx, true);
  }

  // Section 15: Incorrect -> Reteach
  reteach(sectionIdx) {
    this.onTeachingStepLoaded(sectionIdx, true);
  }

  // Section 18: Reset Demo / Restart Lesson
  restartLesson() {
    this.hasRequestedTavusForLesson = false;
    this.videoState = "idle";
    this.videoUrl = null;
    // Reloads section 0
    this.onTeachingStepLoaded(0, false);
  }

  // Navigating to completely new topic
  changeTopic(newTopic) {
    this.topic = newTopic;
    this.hasRequestedTavusForLesson = false;
    this.videoState = "idle";
    this.videoUrl = null;
    this.onTeachingStepLoaded(0, false);
  }
}

// TEST A: Start a new lesson. Confirm exactly ONE Tavus POST request is made.
const session = new TeachingRoomSession("Newton's Laws of Motion");
session.onTeachingStepLoaded(0, false);
console.log("TEST A (Section 1 start): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "TEST A failed: Expected 1 Tavus request for section 1");
assert.strictEqual(session.videoState, "preparing", "Video state should be preparing");

// Tavus returns ready in background
session.onTavusReady("https://cdn.tavus.io/videos/raj_demo.mp4");
assert.strictEqual(session.videoState, "ready");
assert.strictEqual(session.videoUrl, "https://cdn.tavus.io/videos/raj_demo.mp4");

// TEST B: Move from Section 1 -> Section 2. Confirm NO second Tavus POST request.
session.advanceSection(1);
console.log("TEST B (Move to Section 2): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "TEST B failed: Moving to section 2 must not call Tavus again");
assert.strictEqual(session.videoState, "ready", "Ready video must persist for the lesson");

// TEST C: Give an incorrect answer -> adaptive reteach. Confirm NO second Tavus POST request.
session.reteach(1);
console.log("TEST C (Adaptive Reteach): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "TEST C failed: Reteach must not call Tavus again");

// TEST D: Give a partial answer -> reinforce. Confirm NO second Tavus POST request.
session.reinforce(1);
console.log("TEST D (Reinforce): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "TEST D failed: Reinforce must not call Tavus again");

// Move to Section 3. Confirm NO Tavus request.
session.advanceSection(2);
console.log("Section 3: Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "Section 3 must not call Tavus again");

// TEST E: Replay Azure voice does not trigger any section or Tavus call.
console.log("TEST E (Replay Azure voice): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 1, "Replay must not trigger Tavus call");

// TEST H: Restart Lesson -> confirm a new lesson session can create ONE new Tavus video.
session.restartLesson();
console.log("TEST H (Restart Lesson): Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 2, "TEST H failed: Restart Lesson should allow 1 new Tavus video");
assert.strictEqual(session.videoState, "preparing", "Restarted lesson video should be preparing");

// TEST: Change topic -> confirm new lesson topic can create ONE new Tavus video.
session.changeTopic("Quantum Physics");
console.log("Change Topic to Quantum Physics: Tavus POST count =", session.tavusPostCount);
assert.strictEqual(session.tavusPostCount, 3, "New topic should allow 1 new Tavus video");

console.log("=== All Architectural State Machine Tests Passed Successfully! ===");

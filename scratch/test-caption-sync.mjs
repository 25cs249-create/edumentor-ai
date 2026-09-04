import assert from "node:assert";

function splitIntoCaptionChunks(text) {
  if (!text || !text.trim()) return [];

  const clean = text.trim();

  // Split by natural sentence boundaries: English/Hinglish (. ! ?), Hindi purna viram (।)
  const rawSentences = clean
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];

  for (const sentence of rawSentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    // If chunk is compact (up to ~22 words), keep intact
    if (words.length <= 22) {
      chunks.push(sentence);
    } else {
      // For longer sentences, divide at natural clause punctuation: comma, semicolon, dash
      const clauses = sentence
        .split(/(?<=[,;:\u2014])\s+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (clauses.length > 1) {
        let buffer = "";
        for (const clause of clauses) {
          const bufferWords = buffer ? buffer.split(/\s+/).length : 0;
          const clauseWords = clause.split(/\s+/).length;
          if (!buffer) {
            buffer = clause;
          } else if (bufferWords + clauseWords <= 18) {
            buffer += " " + clause;
          } else {
            chunks.push(buffer);
            buffer = clause;
          }
        }
        if (buffer) chunks.push(buffer);
      } else {
        // Fallback for long run-on text without punctuation: chunk by 14 words
        for (let i = 0; i < words.length; i += 14) {
          chunks.push(words.slice(i, i + 14).join(" "));
        }
      }
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

console.log("=== Testing Caption Segmentation and Logic ===");

// 1. English segmentation
const englishText = "Newton's first law states that an object at rest stays at rest. An object in motion stays in motion unless acted on by a net external force. This property is known as inertia.";
const englishChunks = splitIntoCaptionChunks(englishText);
console.log("English chunks count:", englishChunks.length);
assert.strictEqual(englishChunks.length, 3, "Should split into 3 English sentences");
console.log("✓ English chunks verified:", englishChunks);

// 2. Hindi segmentation with Devanagari purna viram (।)
const hindiText = "न्यूटन का पहला नियम कहता है कि कोई वस्तु तब तक विरामावस्था में रहती है जब तक उस पर बल न लगे। इसे जड़त्व का नियम भी कहते हैं। दैनिक जीवन में इसके कई उदाहरण हैं।";
const hindiChunks = splitIntoCaptionChunks(hindiText);
console.log("Hindi chunks count:", hindiChunks.length);
assert.strictEqual(hindiChunks.length, 3, "Should split Hindi at purna viram ।");
console.log("✓ Hindi chunks verified:", hindiChunks);

// 3. Hinglish segmentation
const hinglishText = "Jab aap car mein achanak break lagate ho, toh aap aage ki taraf jhukte ho. Ye inertia ki wajah se hota hai! Hum isse Newton ka first law bolte hain.";
const hinglishChunks = splitIntoCaptionChunks(hinglishText);
console.log("Hinglish chunks count:", hinglishChunks.length);
assert.strictEqual(hinglishChunks.length, 3, "Should split Hinglish at sentence terminators");
console.log("✓ Hinglish chunks verified:", hinglishChunks);

// 4. Threshold & duration distribution calculation test
const chunks = ["First chunk.", "Second much longer chunk with many more words in it.", "Third short chunk."];
const wordCounts = chunks.map(c => Math.max(1, c.trim().split(/\s+/).filter(Boolean).length));
const totalWords = wordCounts.reduce((a, b) => a + b, 0);
let cumulative = 0;
const thresholds = wordCounts.map(count => {
  cumulative += count;
  return cumulative / totalWords;
});
console.log("Threshold ratios:", thresholds);
assert.strictEqual(thresholds[thresholds.length - 1], 1, "Final threshold must be 1.0");

// Check progressive mapping at various playback progress ratios
const progressSamples = [0.0, 0.1, 0.5, 0.95];
for (const p of progressSamples) {
  const targetIndex = thresholds.findIndex(t => p <= t);
  const chunkIdx = targetIndex === -1 ? thresholds.length - 1 : targetIndex;
  console.log(`Progress ${p} -> chunk ${chunkIdx}: "${chunks[chunkIdx]}"`);
  assert(chunkIdx >= 0 && chunkIdx < chunks.length, "Chunk index should be valid");
}

console.log("=== All Tests Passed Successfully! ===");

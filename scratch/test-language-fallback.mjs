console.log("=== Testing Language-Aware Tavus Fallback ===");

async function testLanguage(lang) {
  console.log(`\nTesting language: ${lang}`);
  const res = await fetch("http://localhost:3000/api/tavus/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script: "Welcome to this physics lesson. Today we will understand inertia with a simple real-world example.",
      videoName: `EduMentor - Test - ${lang}`,
      language: lang,
    }),
  });

  console.log(`Status: ${res.status}`);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

await testLanguage("English");
await testLanguage("Hinglish");
await testLanguage("Hindi");

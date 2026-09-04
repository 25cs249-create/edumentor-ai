const apiKey = process.env.TAVUS_API_KEY;
const replicaId = process.env.TAVUS_REPLICA_ID;

console.log("=== Testing Direct POST to https://tavusapi.com/v2/videos ===");
console.log("Replica:", replicaId);

const payload = {
  replica_id: replicaId,
  script: "Welcome to this physics lesson. Today we will understand inertia with a simple real-world example.",
  video_name: "EduMentor Test Diagnostic",
};

try {
  const res = await fetch("https://tavusapi.com/v2/videos", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("HTTP status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log("Raw Response body:", text);
} catch (e) {
  console.error("Direct fetch error:", e);
}

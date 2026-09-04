console.log("=== Testing Direct POST /api/tavus/video ===");

const payload = {
  script: "Welcome to this physics lesson. Today we will understand inertia with a simple real-world example.",
  videoName: "EduMentor Diagnostics Test",
};

try {
  const res = await fetch("http://localhost:3000/api/tavus/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("[TAVUS] POST response status:", res.status);
  const text = await res.text();
  console.log("[TAVUS] Raw response text:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
  }

  if (data && data.videoId) {
    console.log("[TAVUS] videoId:", data.videoId);
    console.log("[TAVUS] initial status:", data.status);
    console.log("[TAVUS] hostedUrl:", data.hostedUrl);
    console.log("[TAVUS] downloadUrl:", data.downloadUrl);
    console.log("[TAVUS] streamUrl:", data.streamUrl);

    // Poll the status endpoint
    const videoId = data.videoId;
    console.log("=== Starting manual polling for videoId:", videoId);
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 4000));
      const pollRes = await fetch(`http://localhost:3000/api/tavus/video?videoId=${encodeURIComponent(videoId)}`);
      console.log(`[TAVUS] polling attempt ${attempts} status:`, pollRes.status);
      const pollText = await pollRes.text();
      console.log(`[TAVUS] poll response body:`, pollText);
      const pollData = JSON.parse(pollText);

      if (pollData.status === "ready" || pollData.status === "error") {
        console.log(`[TAVUS] Finished with status: ${pollData.status}`);
        break;
      }
    }
  } else {
    console.log("[TAVUS] No videoId returned. Error details:", data);
  }
} catch (err) {
  console.error("Test fetch error:", err);
}

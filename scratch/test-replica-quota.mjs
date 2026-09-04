const apiKey = process.env.TAVUS_API_KEY;

console.log("=== Testing other replicas for 402 ===");
for (const replica_id of ["r987f6e6f73c", "ra066ab28864", "r621a6013477"]) {
  try {
    const res = await fetch("https://tavusapi.com/v2/videos", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replica_id,
        script: "Testing replica quota check.",
        video_name: "Quota Check",
      }),
    });
    console.log(`Replica ${replica_id} status:`, res.status);
    const body = await res.text();
    console.log(`Response:`, body);
  } catch (e) {
    console.error(`Replica ${replica_id} error:`, e.message);
  }
}

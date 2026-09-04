const apiKey = process.env.TAVUS_API_KEY;
const replicaId = process.env.TAVUS_REPLICA_ID;

console.log("=== Tavus Diagnostics ===");
console.log("API Key configured:", Boolean(apiKey), "Length:", apiKey ? apiKey.length : 0);
console.log("Configured Replica ID:", replicaId);

// 1. Check replicas
try {
  const repRes = await fetch("https://tavusapi.com/v2/replicas", {
    headers: { "x-api-key": apiKey }
  });
  console.log("GET /v2/replicas status:", repRes.status);
  const repData = await repRes.json().catch(() => null);
  console.log("Replicas response summary:", repData ? (Array.isArray(repData.data) ? repData.data.length + " replicas" : JSON.stringify(repData).slice(0, 200)) : "null");
  if (repData && repData.data) {
    repData.data.forEach(r => console.log(` - ${r.replica_id}: ${r.replica_name} (status: ${r.status})`));
  }
} catch (e) {
  console.error("Replicas error:", e);
}

// 2. Check existing videos
try {
  const vidRes = await fetch("https://tavusapi.com/v2/videos", {
    headers: { "x-api-key": apiKey }
  });
  console.log("GET /v2/videos status:", vidRes.status);
  const vidData = await vidRes.json().catch(() => null);
  console.log("Videos response summary:", vidData ? (Array.isArray(vidData.data) ? vidData.data.length + " videos" : JSON.stringify(vidData).slice(0, 300)) : "null");
  if (vidData && vidData.data && vidData.data.length > 0) {
    vidData.data.slice(0, 5).forEach(v => {
      console.log(`Video ID: ${v.video_id}`);
      console.log(`  status: ${v.status}`);
      console.log(`  video_name: ${v.video_name}`);
      console.log(`  hosted_url: ${v.hosted_url}`);
      console.log(`  download_url: ${v.download_url}`);
      console.log(`  stream_url: ${v.stream_url}`);
    });
  }
} catch (e) {
  console.error("Videos error:", e);
}

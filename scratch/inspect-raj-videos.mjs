const apiKey = process.env.TAVUS_API_KEY;

if (!apiKey) {
  console.error("No TAVUS_API_KEY found.");
  process.exit(1);
}

// 1. Fetch replicas to map replica_id -> replica_name
let replicaMap = {};
try {
  const repRes = await fetch("https://tavusapi.com/v2/replicas", {
    headers: { "x-api-key": apiKey },
  });
  if (repRes.ok) {
    const repData = await repRes.json();
    if (repData && Array.isArray(repData.data)) {
      for (const r of repData.data) {
        replicaMap[r.replica_id] = r.replica_name;
      }
    }
  }
} catch (err) {
  console.error("Failed to fetch replicas:", err.message);
}

// 2. Fetch all videos list
try {
  const vidRes = await fetch("https://tavusapi.com/v2/videos", {
    headers: { "x-api-key": apiKey },
  });

  if (!vidRes.ok) {
    console.error("Failed to fetch videos list:", vidRes.status, vidRes.statusText);
    process.exit(1);
  }

  const vidData = await vidRes.json();
  const videos = vidData.data || [];

  const detailedVideos = [];

  for (const v of videos) {
    // Fetch individual video detail for complete payload (script, data, duration, etc.)
    const detailRes = await fetch(`https://tavusapi.com/v2/videos/${v.video_id}`, {
      headers: { "x-api-key": apiKey },
    });
    let detail = {};
    if (detailRes.ok) {
      detail = await detailRes.json();
    }

    const replicaId = detail.replica_id || v.replica_id || "unknown";
    const replicaName = replicaMap[replicaId] || "Unknown";
    const script = detail.data?.script || detail.script || null;

    detailedVideos.push({
      videoId: v.video_id,
      status: detail.status || v.status,
      replicaId,
      replicaName,
      videoName: detail.video_name || v.video_name,
      script,
      duration: detail.duration || detail.data?.duration || null,
      hostedUrl: detail.hosted_url || v.hosted_url,
      hasDirectMp4: Boolean(detail.download_url || v.download_url),
      downloadUrl: detail.download_url || v.download_url,
      streamUrl: detail.stream_url || v.stream_url,
      createdAt: detail.created_at || v.created_at,
    });
  }

  console.log(JSON.stringify(detailedVideos, null, 2));
} catch (err) {
  console.error("Error inspecting videos:", err.message);
}

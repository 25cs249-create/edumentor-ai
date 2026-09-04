const apiKey = process.env.TAVUS_API_KEY;

const res = await fetch("https://tavusapi.com/v2/videos/2d90ceaa94", {
  headers: { "x-api-key": apiKey }
});
console.log("Status:", res.status);
const data = await res.json();
console.log("Video details:", JSON.stringify(data, null, 2));

const https = require("https");
const fs = require("fs");

// Helper to get from URL
const get = (url, headers) => new Promise((resolve, reject) => {
  https.get(url, { headers }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => resolve(data));
  }).on("error", reject);
});

// Helper to put to URL
const put = (url, headers, body) => new Promise((resolve, reject) => {
  const req = https.request(url, { method: "PUT", headers }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => resolve(data));
  });
  req.on("error", reject);
  req.write(body);
  req.end();
});

// Main logic
(async () => {
  const env = fs.readFileSync(".env.local", "utf8");
  const apiKey = env.match(/N8N_API_KEY=(.+)/)[1].trim();
  const base = "https://workflow.robdev.website";
  const wfId = "UOqHxkuKLQmDspez";

  const raw = await get(`${base}/api/v1/workflows/${wfId}`, { "X-N8N-API-KEY": apiKey });
  const w = JSON.parse(raw);

  const http = w.nodes.find(n => n.name === "WA Send Media");
  if (http) {
    http.authentication = "none";
    http.parameters.options = http.parameters.options || {};
    http.parameters.headerParameters = {
      parameters: [
        { name: "Authorization", value: "=Bearer {{$json.ACCESS_TOKEN}}" },
        { name: "Content-Type", value: "application/json" }
      ]
    };
  }

  const payload = JSON.stringify({ name: w.name, nodes: w.nodes, connections: w.connections, settings: w.settings });
  const res = await put(`${base}/api/v1/workflows/${wfId}`, { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" }, payload);
  console.log(res.slice(0, 500));
})();

const https = require("https");
const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST" || req.url !== "/proxy") {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const {
        target_path,
        target_method,
        target_body,
        target_headers,
        client_cert_b64,
        client_key_b64,
      } = JSON.parse(body);

      const agentOptions = { rejectUnauthorized: false };

      if (client_cert_b64) {
        agentOptions.cert = Buffer.from(client_cert_b64, "base64");
      }
      if (client_key_b64) {
        agentOptions.key = Buffer.from(client_key_b64, "base64");
      }

      const agent = new https.Agent(agentOptions);

      const targetUrl = url.parse(
        "https://api-pix.infopago.com.br" + target_path
      );

      const headers = target_headers || {};
      if (target_body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      if (target_body) {
        headers["Content-Length"] = Buffer.byteLength(target_body);
      }

      const options = {
        hostname: targetUrl.hostname,
        port: 443,
        path: targetUrl.path,
        method: target_method || "GET",
        headers,
        agent,
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          res.writeHead(proxyRes.statusCode, {
            "Content-Type": "application/json",
          });
          res.end(data);
        });
      });

      proxyReq.on("error", (err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });

      if (target_body && target_method !== "GET") {
        proxyReq.write(target_body);
      }
      proxyReq.end();
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON: " + err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log("Proxy listening on port " + PORT);
});


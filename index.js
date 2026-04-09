const express = require("express");
const https = require("https");
const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.post("/proxy", async (req, res) => {
  const {
    target_path, target_method, target_body,
    target_headers, client_cert_b64, client_key_b64
  } = req.body;

  const cert = client_cert_b64 ? Buffer.from(client_cert_b64, "base64") : undefined;
  const key = client_key_b64 ? Buffer.from(client_key_b64, "base64") : undefined;

  const options = {
    hostname: "api.pix.infopago.com.br",
    path: target_path,
    method: target_method || "GET",
    headers: target_headers || { "Content-Type": "application/json" },
    cert, key,
    rejectUnauthorized: false,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (c) => (data += c));
    proxyRes.on("end", () => {
      res.status(proxyRes.statusCode).set("Content-Type", "application/json").send(data);
    });
  });

  proxyReq.on("error", (e) => res.status(500).json({ error: e.message }));
  if (target_body) proxyReq.write(target_body);
  proxyReq.end();
});

app.listen(process.env.PORT || 3000, () => console.log("Proxy rodando"));

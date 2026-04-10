const express = require("express");
const https = require("https");
const app = express();

app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.post("/proxy", async (req, res) => {
  const { target_path, target_method, target_body, target_headers } = req.body;

  const options = {
    hostname: "api.pix.infopago.com.br",
    path: target_path,
    method: target_method || "GET",
    headers: target_headers || { "Content-Type": "application/json" },
    rejectUnauthorized: false, // Isso ignora o erro de certificado da InfoPago
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (c) => (data += c));
    proxyRes.on("end", () => {
      res.status(proxyRes.statusCode).set("Content-Type", "application/json").send(data);
    });
  });

  proxyReq.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  if (target_body) {
    proxyReq.write(typeof target_body === 'string' ? target_body : JSON.stringify(target_body));
  }
  proxyReq.end();
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy rodando na porta ${port}`));

const express = require("express");
const https = require("https");
const app = express();

app.use(express.json());

// Rota de saúde para verificar se o proxy está online
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.post("/proxy", async (req, res) => {
  const {
    target_path,
    target_method,
    target_body,
    target_headers
  } = req.body;

  const options = {
    hostname: "api.pix.infopago.com.br",
    path: target_path,
    method: target_method || "GET",
    headers: target_headers || { "Content-Type": "application/json" },
    // Removemos as linhas de cert e key que causavam o erro PEM
    rejectUnauthorized: false, 
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (c) => (data += c));
    proxyRes.on("end", () => {
      res.status(proxyRes.statusCode)
         .set("Content-Type", "application/json")
         .send(data);
    });
  });

  proxyReq.on("error", (e) => {
    console.error("Erro no Proxy:", e.message);
    res.status(500).json({ error: e.message });
  });

  if (target_body) {
    // Garante que o corpo seja enviado como string se for um objeto
    const bodyData = typeof target_body === 'string' ? target_body : JSON.stringify(target_body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// O Railway injeta a porta automaticamente via process.env.PORT
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy rodando na porta ${port}`));

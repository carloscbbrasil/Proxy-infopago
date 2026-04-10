const express = require("express");
const https = require("https");
const app = express();

app.use(express.json());

// Rota de teste para ver se o proxy está vivo
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.post("/proxy", async (req, res) => {
  const {
    target_path,
    target_method,
    target_body,
    target_headers
  } = req.body;

  // Configuramos o acesso à InfoPago sem as linhas de cert/key que davam erro
  const options = {
    hostname: "api.pix.infopago.com.br",
    path: target_path,
    method: target_method || "GET",
    headers: target_headers || { "Content-Type": "application/json" },
    rejectUnauthorized: false, // Necessário para certificados auto-assinados
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
    const bodyData = typeof target_body === 'string' ? target_body : JSON.stringify(target_body);
    proxyReq.write(bodyData);
  }
  
  proxyReq.end();
});

// O Railway usa a porta da variável de ambiente PORT
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy rodando na porta ${port}`));

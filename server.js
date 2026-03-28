const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Recebe código de barras scaneado
app.post('/scan', (req, res) => {
  const { code, format, timestamp } = req.body;
  console.log('Código recebido:', code, '| Formato:', format, '| Data:', new Date().toISOString());
  res.json({ success: true, received: code });
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
});
const express = require('express');
const { exec } = require('child_process');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Função para digitar o código automaticamente no PC
function typeCodeOnPC(code) {
  // Usa PowerShell para simular digitação no campo focado
  const escapedCode = code.replace(/'/g, "''").replace(/"/g, '`"');
  const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedCode}')`;
  
  exec(`powershell -command "${psCommand}"`, (error) => {
    if (error) {
      console.error('Erro ao digitar código:', error);
    } else {
      console.log('Código digitado automaticamente:', code);
    }
  });
}

// Recebe código de barras scaneado
app.post('/scan', (req, res) => {
  const { code, format, timestamp } = req.body;
  console.log('Código recebido:', code, '| Formato:', format, '| Data:', new Date().toISOString());
  
  // Digita automaticamente no PC onde o servidor roda
  typeCodeOnPC(code);
  
  res.json({ success: true, received: code });
});

app.listen(3000, () => {
  console.log('Rodando em http://localhost:3000');
  console.log('Pronto para receber scans e digitar automaticamente!');
});
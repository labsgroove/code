const express = require('express');
const { exec, spawn } = require('child_process');
const app = express();

// Tenta importar qrcode-terminal (instale com: npm install qrcode-terminal)
let qrcode;
try {
  qrcode = require('qrcode-terminal');
} catch (e) {
  qrcode = null;
}

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

// Função para mostrar URL e QR Code
function mostrarUrl(url) {
  console.log('\n=================================');
  console.log('TUNEL CLOUDFLARE ATIVO!');
  console.log('URL Publica:', url);
  console.log('=================================\n');
  
  if (qrcode) {
    console.log('Escaneie o QR Code abaixo:');
    qrcode.generate(url, { small: true });
  } else {
    console.log('Para instalar o QR Code, execute: npm install qrcode-terminal');
  }
  
  console.log('\nPronto para receber scans!');
}

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
  console.log('Iniciando Cloudflare Tunnel...');
  
  // Verifica se cloudflared está disponível
  const checkCloudflared = exec('where cloudflared', (error) => {
    if (error) {
      console.log('\n⚠️  Cloudflared não encontrado no PATH!');
      console.log('Instale com: winget install --id Cloudflare.cloudflared');
      console.log('Ou baixe em: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
      console.log('\nServidor continua rodando localmente em http://localhost:3000');
      return;
    }
    
    // Inicia o cloudflared tunnel
    const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    
    let tunnelUrl = null;
    let timeoutId = setTimeout(() => {
      console.log('\n⚠️  Timeout: Não foi possível obter a URL do tunnel');
      console.log('Verifique se o cloudflared está funcionando corretamente');
    }, 30000);
    
    tunnel.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Procura pela URL do tunnel no stdout
      const match = output.match(/(https:\/\/\S+\.trycloudflare\.com)/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[1];
        clearTimeout(timeoutId);
        mostrarUrl(tunnelUrl);
      }
    });
    
    tunnel.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Cloudflared às vezes envia a URL no stderr também
      const match = output.match(/(https:\/\/\S+\.trycloudflare\.com)/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[1];
        clearTimeout(timeoutId);
        mostrarUrl(tunnelUrl);
      }
    });
    
    tunnel.on('error', (error) => {
      console.log('\n❌ Erro ao iniciar tunnel:', error.message);
      console.log('Verifique se o cloudflared está instalado corretamente');
    });
    
    tunnel.on('close', (code) => {
      if (code !== 0 && !tunnelUrl) {
        console.log('\n⚠️  Tunnel encerrado com codigo:', code);
        console.log('Servidor continua rodando localmente em http://localhost:3000');
      }
    });
    
    // Encerra o tunnel gracefulmente quando o servidor fecha
    process.on('SIGINT', () => {
      console.log('\nEncerrando tunnel...');
      tunnel.kill();
      process.exit(0);
    });
  });
});
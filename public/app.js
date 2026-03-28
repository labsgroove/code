const input = document.getElementById('barcode');
const statusText = document.getElementById('status-text');
const flash = document.getElementById('flash');

let quaggaConfig = null;
let lastCode = '';
let scanCount = 0;
let isProcessing = false;
let isScanning = true;
let scanAgainBtn = null;
let scanHistory = [];
const SCAN_HISTORY_SIZE = 3;
const CONFIDENCE_THRESHOLD = 0.25;

function validateCode(code) {
  if (!code || code.length < 4) return false;
  return /^[a-zA-Z0-9\-\.\s]+$/.test(code);
}

function getConsistentCode(code) {
  scanHistory.push(code);
  if (scanHistory.length > SCAN_HISTORY_SIZE) {
    scanHistory.shift();
  }
  
  const counts = {};
  for (const c of scanHistory) {
    counts[c] = (counts[c] || 0) + 1;
  }
  
  for (const [c, count] of Object.entries(counts)) {
    if (count >= 2) return c;
  }
  return null;
}

// AudioContext para beep
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 1200;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
}

function triggerFlash() {
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 100);
}

function onScanSuccess(code, format = 'unknown') {
  // Evita scans duplicados consecutivos imediatos
  if (code === lastCode) {
    return;
  }
  
  lastCode = code;
  scanCount++;
  
  input.value = code;
  input.style.color = '#00d4ff';
  setTimeout(() => input.style.color = '#fff', 500);
  
  statusText.textContent = 'Código: ' + code;
  statusText.style.color = '#22c55e';
  
  // Envia para o servidor
  fetch('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, format, timestamp: Date.now() })
  })
  .then(res => res.json())
  .then(data => console.log('Enviado ao servidor:', data))
  .catch(err => console.error('Erro ao enviar:', err));
  
  // Beep sonoro
  playBeep();
  
  // Flash visual
  triggerFlash();
  
  // Vibração
  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
  
  // Pausa a captura
  pauseScanning();
  
  // Mostra botão para escanear novamente
  showScanAgainButton();
}

function pauseScanning() {
  if (isScanning) {
    Quagga.stop();
    isScanning = false;
    statusText.textContent = 'Código detectado - Scan pausado';
    statusText.style.color = '#f59e0b';
  }
}

function resumeScanning() {
  console.log('Tentando retomar scanning... isScanning=', isScanning);
  if (!isScanning) {
    lastCode = '';
    scanHistory = [];
    try {
      // Tenta reiniciar o Quagga
      Quagga.start();
      isScanning = true;
      statusText.textContent = 'Camera ativa - Pronto para scan';
      statusText.style.color = '#888';
      hideScanAgainButton();
      console.log('Camera reiniciada com sucesso');
    } catch (e) {
      console.error('Erro ao retomar scanning:', e);
      // Se falhar, tenta re-inicializar completamente
      statusText.textContent = 'Reiniciando camera...';
      reinitQuagga();
    }
  } else {
    console.log('Scanning já está ativo');
  }
}

function reinitQuagga() {
  console.log('Re-inicializando Quagga...');
  try {
    Quagga.stop();
  } catch(e) { /* ignora erro ao parar */ }
  
  // Aguarda um pouco e reinicia
  setTimeout(() => {
    if (quaggaConfig) {
      Quagga.init(quaggaConfig, function(err) {
        if (err) {
          console.error('Erro ao re-inicializar:', err);
          statusText.textContent = 'Erro ao reiniciar: ' + (err.message || err);
          statusText.style.color = '#ef4444';
          return;
        }
        try {
          Quagga.start();
          isScanning = true;
          statusText.textContent = 'Camera ativa - Pronto para scan';
          statusText.style.color = '#888';
          hideScanAgainButton();
          console.log('Quagga re-inicializado com sucesso');
        } catch (e) {
          console.error('Erro ao iniciar após reinit:', e);
          statusText.textContent = 'Erro: ' + e.message;
          statusText.style.color = '#ef4444';
        }
      });
    }
  }, 500);
}

function showScanAgainButton() {
  if (!scanAgainBtn) {
    scanAgainBtn = document.createElement('button');
    scanAgainBtn.id = 'scan-again-btn';
    scanAgainBtn.textContent = 'Escanear Novamente';
    scanAgainBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Botão clicado!');
      resumeScanning();
    });
    document.querySelector('.result-section').appendChild(scanAgainBtn);
    console.log('Botão criado e adicionado');
  }
  scanAgainBtn.style.display = 'block';
}

function hideScanAgainButton() {
  if (scanAgainBtn) {
    scanAgainBtn.style.display = 'none';
  }
}

quaggaConfig = {
  inputStream: {
    type: "LiveStream",
    target: document.querySelector('#camera'),
    constraints: {
      facingMode: "environment",
      width: { min: 640, ideal: 1920, max: 2560 },
      height: { min: 480, ideal: 1080, max: 1440 }
    }
  },
  locator: {
    patchSize: "large",
    halfSample: false
  },
  numOfWorkers: navigator.hardwareConcurrency || 4,
  frequency: 5,
  decoder: {
    readers: [
      "code_128_reader",
      "ean_reader",
      "ean_8_reader",
      "code_39_reader",
      "code_39_vin_reader",
      "codabar_reader",
      "upc_reader",
      "upc_e_reader",
      "i2of5_reader"
    ],
    multiple: false
  },
  locate: true
};

Quagga.init(quaggaConfig, function(err) {
  if (err) {
    console.error('Erro ao inicializar Quagga:', err);
    statusText.textContent = 'Erro na camera: ' + (err.message || err);
    statusText.style.color = '#ef4444';
    return;
  }
  
  try {
    Quagga.start();
    statusText.textContent = 'Camera ativa - Pronto para scan';
    console.log('Quagga iniciado com sucesso');
  } catch (e) {
    console.error('Erro ao iniciar Quagga:', e);
    statusText.textContent = 'Erro ao iniciar: ' + e.message;
    statusText.style.color = '#ef4444';
  }
});

Quagga.onDetected(function(result) {
  const code = result.codeResult.code;
  const confidence = result.codeResult.confidence || 0;
  const format = result.codeResult.format;
  
  console.log('Detectado:', code, 'Confiança:', confidence.toFixed(2), 'Formato:', format);
  
  // Validação básica - aceita se tem tamanho mínimo
  if (!code || code.length < 4) {
    console.log('Código muito curto:', code);
    return;
  }
  
  // Aceita código detectado (evita duplicados apenas)
  if (code !== lastCode) {
    console.log('Scan confirmado:', code);
    onScanSuccess(code, format);
  } else {
    console.log('Código duplicado ignorado:', code);
  }
});
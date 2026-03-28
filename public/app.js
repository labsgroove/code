const input = document.getElementById('barcode');
const statusText = document.getElementById('status-text');
const flash = document.getElementById('flash');

let lastCode = '';
let scanCount = 0;
let isProcessing = false;

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

function onScanSuccess(code) {
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
  
  // Beep sonoro
  playBeep();
  
  // Flash visual
  triggerFlash();
  
  // Vibração
  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
  
  // Limpa após 3 segundos para permitir novo scan
  setTimeout(() => {
    lastCode = '';
    statusText.textContent = 'Camera ativa - Pronto para scan';
    statusText.style.color = '#888';
  }, 3000);
}

Quagga.init({
  inputStream: {
    type: "LiveStream",
    target: document.querySelector('#camera'),
    constraints: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    area: {
      top: "25%",
      right: "12%",
      left: "12%",
      bottom: "25%"
    }
  },
  locator: {
    patchSize: "large",
    halfSample: false
  },
  numOfWorkers: navigator.hardwareConcurrency || 4,
  frequency: 10,
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
}, function(err) {
  if (err) {
    console.error(err);
    statusText.textContent = 'Erro na camera: ' + err.message;
    statusText.style.color = '#ef4444';
    return;
  }
  Quagga.start();
  statusText.textContent = 'Camera ativa - Pronto para scan';
});

Quagga.onDetected(function(result) {
  const code = result.codeResult.code;
  const confidence = result.codeResult.confidence || 0;
  const format = result.codeResult.format;
  
  // Debug no console
  console.log('Detectado:', code, 'Confiança:', confidence.toFixed(2), 'Formato:', format);
  
  // Aceita códigos com confiança razoável (0.6 = 60%)
  if (confidence > 0.6) {
    onScanSuccess(code);
  } else {
    statusText.textContent = 'Tentando ler... (' + confidence.toFixed(2) + ')';
    statusText.style.color = '#f59e0b';
  }
});
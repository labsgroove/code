# Como Compilar o Executável

## Pré-requisitos

1. Node.js instalado (versão 16 ou superior)
2. `npm` configurado e funcionando

## Passos para Compilar

### 1. Permitir scripts no PowerShell (se necessário)

Execute o PowerShell como Administrador e rode:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Ou use o CMD/PowerShell 7 em vez do PowerShell padrão.

### 2. Instalar dependências

```bash
npm install
```

### 3. Compilar o executável

#### Opção A: Usando npx (não precisa instalar pkg globalmente)

```bash
npx pkg . --targets node18-win-x64 --output dist/barcode-server.exe
```

#### Opção B: Usando o script do package.json

```bash
npm run build
```

### 4. Executável gerado

O arquivo `barcode-server.exe` será criado na pasta `dist/`.

## Distribuição

Para distribuir o app:

1. Copie o arquivo `dist/barcode-server.exe`
2. O usuário final não precisa ter Node.js instalado
3. Basta executar o `.exe`

## Funcionamento

Ao rodar o executável:
1. O servidor inicia em `http://localhost:3000`
2. Gera um QR Code para acesso do celular
3. Aguarda códigos de barras scaneados
4. Digita automaticamente no campo focado do Windows

## Requisitos do usuário final

- Windows 10/11 (x64)
- `cloudflared` instalado (opcional, para túnel público)

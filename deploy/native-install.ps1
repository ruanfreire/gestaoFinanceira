# Build local + envio + instalação nativa na VM (sem Docker)
# Uso: .\deploy\native-install.ps1 -HostIP "147.15.15.150"

param(
  [Parameter(Mandatory = $true)]
  [string]$HostIP,
  [string]$User = "opc",
  [string]$KeyPath = "",
  [string]$RemoteDir = "/opt/gestao-financeira",
  [switch]$ForceBuild
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $KeyPath) {
  $KeyPath = Join-Path $Root "ssh\ssh-key-2026-07-01.key"
}

if (-not (Test-Path $KeyPath)) {
  throw "Chave SSH não encontrada: $KeyPath"
}

icacls $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null

$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=20")

Write-Host "==> Build local (backend + frontend)..."
Set-Location $Root
$hasDist = (Test-Path "$Root\backend\dist\main.js") -and (Test-Path "$Root\frontend\dist\index.html")
if ($hasDist -and -not $ForceBuild) {
  Write-Host "    Usando dist/ existente (use -ForceBuild para recompilar)"
} else {
  if (Test-Path "$Root\node_modules\.bin\tsc.cmd") {
    npm run build --workspace backend
    npm run build --workspace frontend
  } else {
    throw "node_modules incompleto. Pare 'npm run dev', rode 'npm ci' na raiz e tente de novo."
  }
}

if (-not (Test-Path "$Root\backend\dist\main.js")) {
  throw "Build do backend falhou"
}
if (-not (Test-Path "$Root\frontend\dist\index.html")) {
  throw "Build do frontend falhou"
}

Write-Host "==> Testando SSH..."
& ssh @ssh "${User}@${HostIP}" "echo OK"
if ($LASTEXITCODE -ne 0) { throw "Falha SSH" }

Write-Host "==> Preparando diretório remoto..."
& ssh @ssh "${User}@${HostIP}" "sudo mkdir -p $RemoteDir && sudo chown opc:opc $RemoteDir"

$archive = Join-Path $env:TEMP "gestao-financeira-native.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

Write-Host "==> Empacotando artefatos..."
& tar -czf $archive `
  --exclude=node_modules `
  --exclude=backend/.env `
  -C $Root `
  package.json package-lock.json `
  backend/package.json backend/dist `
  frontend/package.json frontend/dist `
  UI/package.json `
  deploy/install-native.sh `
  deploy/maintenance.sh `
  deploy/ssl/generate-selfsigned.sh `
  deploy/ssl/install-letsencrypt.sh `
  deploy/env.native.example `
  deploy/mongodb/mongod.conf `
  deploy/nginx/native.conf `
  deploy/nginx/maintenance.conf `
  deploy/nginx/maintenance.html `
  deploy/systemd/gestao-financeira-backend.service `
  deploy/systemd/mongod.service

Write-Host "==> Enviando para a VM..."
& scp @ssh $archive "${User}@${HostIP}:/tmp/gestao-financeira-native.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "Falha no scp" }

Write-Host "==> Instalando na VM (pode levar alguns minutos)..."
$remote = @"
set -e
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT
tar -xzf /tmp/gestao-financeira-native.tar.gz -C "$STAGING"
sudo rsync -a "$STAGING/" "$RemoteDir/"
sudo chown -R opc:opc $RemoteDir
cd $RemoteDir
chmod +x deploy/install-native.sh deploy/maintenance.sh deploy/ssl/*.sh 2>/dev/null || true
DEPLOY_OK=1
bash deploy/maintenance.sh on || true
if ! bash deploy/install-native.sh; then DEPLOY_OK=0; fi
if ! bash deploy/maintenance.sh off; then DEPLOY_OK=0; bash deploy/maintenance.sh force-off || true; fi
if [ "$DEPLOY_OK" -eq 0 ]; then exit 1; fi
"@

& ssh @ssh "${User}@${HostIP}" $remote
if ($LASTEXITCODE -ne 0) { throw "Falha na instalação nativa" }

Write-Host ""
Write-Host "Concluído: http://${HostIP}"

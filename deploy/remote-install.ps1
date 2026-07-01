# Envia o projeto para a VM Oracle e executa o bootstrap.
# Uso:
#   .\deploy\remote-install.ps1 -HostIP "203.0.113.10"

param(
  [Parameter(Mandatory = $true)]
  [string]$HostIP,
  [string]$User = "opc",
  [string]$KeyPath = "",
  [string]$RemoteDir = "/opt/gestao-financeira"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $KeyPath) {
  $KeyPath = Join-Path $Root "ssh\ssh-key-2026-07-01.key"
}

if (-not (Test-Path $KeyPath)) {
  throw "Chave SSH não encontrada: $KeyPath"
}

# Permissões da chave (OpenSSH no Windows)
icacls $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null

$ssh = @(
  "-i", $KeyPath,
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=15"
)

Write-Host "==> Testando SSH em ${User}@${HostIP}..."
& ssh @ssh "${User}@${HostIP}" "echo OK && uname -a"
if ($LASTEXITCODE -ne 0) { throw "Falha ao conectar via SSH" }

Write-Host "==> Criando diretório remoto..."
& ssh @ssh "${User}@${HostIP}" "sudo mkdir -p $RemoteDir && sudo chown opc:opc $RemoteDir"

$archive = Join-Path $env:TEMP "gestao-financeira-deploy.tar.gz"
Write-Host "==> Empacotando projeto..."
if (Test-Path $archive) { Remove-Item $archive -Force }

$tarArgs = @(
  "-czf", $archive,
  "--exclude=node_modules",
  "--exclude=dist",
  "--exclude=.git",
  "--exclude=ssh",
  "--exclude=backend/.env",
  "-C", $Root,
  "backend", "frontend", "UI", "docker", "deploy",
  "docker-compose.yml", "docker-compose.micro.yml",
  "package.json", "package-lock.json"
)

& tar @tarArgs
if ($LASTEXITCODE -ne 0) { throw "Falha ao criar arquivo tar" }

Write-Host "==> Enviando para a VM..."
& scp @ssh $archive "${User}@${HostIP}:/tmp/gestao-financeira-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "Falha no scp" }

Write-Host "==> Extraindo e executando bootstrap..."
$remoteScript = @"
set -e
cd $RemoteDir
tar -xzf /tmp/gestao-financeira-deploy.tar.gz
chmod +x deploy/bootstrap-oracle-linux.sh
bash deploy/bootstrap-oracle-linux.sh
"@

& ssh @ssh "${User}@${HostIP}" $remoteScript
if ($LASTEXITCODE -ne 0) { throw "Falha no bootstrap remoto" }

Write-Host ""
Write-Host "Deploy concluído. Acesse: http://${HostIP}"

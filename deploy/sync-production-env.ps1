# Sincroniza .env local → VM de produção (nunca commita o arquivo).
# Uso:
#   .\deploy\sync-production-env.ps1
#   .\deploy\sync-production-env.ps1 -EnvFile ".\deploy\.env.production"

param(
  [string]$HostIP = "147.15.15.150",
  [string]$User = "opc",
  [string]$KeyPath = "",
  [string]$RemoteDir = "/opt/gestao-financeira",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $KeyPath) {
  $KeyPath = Join-Path $Root "ssh\ssh-key-2026-07-01.key"
}
if (-not (Test-Path $KeyPath)) {
  throw "Chave SSH não encontrada: $KeyPath"
}

if (-not $EnvFile) {
  $candidates = @(
    (Join-Path $Root "deploy\.env.production"),
    (Join-Path $Root "backend\.env")
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $EnvFile = $c; break }
  }
}
if (-not $EnvFile -or -not (Test-Path $EnvFile)) {
  throw "Arquivo .env não encontrado. Use -EnvFile ou crie deploy\.env.production"
}

$content = Get-Content $EnvFile -Raw
if ($content -notmatch 'JWT_ACCESS_SECRET=' -or $content -notmatch 'MONGO_URI=') {
  throw "Arquivo inválido: JWT_ACCESS_SECRET e MONGO_URI são obrigatórios"
}

# Ajustes mínimos para produção se estiver usando backend/.env de dev
$content = $content -replace '(?m)^MONGO_URI=.*', 'MONGO_URI=mongodb://127.0.0.1:27017/finance'
if ($content -notmatch '(?m)^NODE_ENV=') { $content += "`nNODE_ENV=production`n" }
if ($content -notmatch '(?m)^APP_DOMAIN=') { $content += "`nAPP_DOMAIN=financeiro.seumovimento.com.br`n" }
if ($content -notmatch '(?m)^FRONTEND_URL=') { $content += "`nFRONTEND_URL=https://financeiro.seumovimento.com.br`n" }

icacls $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")
$applyLocal = Join-Path $PSScriptRoot "apply-production-env.sh"
$applyRemote = "/tmp/apply-production-env.sh"

Write-Host "==> Enviando script de aplicação..."
Get-Content $applyLocal -Raw | & ssh @ssh "${User}@${HostIP}" "cat > $applyRemote && chmod +x $applyRemote"

Write-Host "==> Enviando $EnvFile → ${User}@${HostIP}:${RemoteDir}/.env"
$content | & ssh @ssh "${User}@${HostIP}" "export APP_DIR='$RemoteDir'; bash $applyRemote"

if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar .env na VM" }
Write-Host "==> .env sincronizado com sucesso"

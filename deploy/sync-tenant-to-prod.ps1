# Exporta dados locais de um tenant e importa em produção (com backup prévio).
# Uso: .\deploy\sync-tenant-to-prod.ps1 -Email ruanomaker@gmail.com
param(
  [string]$Email = "ruanomaker@gmail.com",
  [string]$HostIP = "147.15.15.150",
  [string]$User = "opc",
  [string]$RemoteDir = "/opt/gestao-financeira",
  [string]$KeyPath = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
if (-not $KeyPath) {
  $KeyPath = Join-Path $Root "ssh\ssh-key-2026-07-01.key"
}

$Backend = Join-Path $Root "backend"
$BundleName = "tenant-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$BundleLocal = Join-Path $Backend $BundleName
$BundleRemote = "/tmp/$BundleName"

$ssh = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")

Write-Host "==> Export local ($Email)"
Push-Location $Backend
node scripts/sync-tenant-data.mjs export --email $Email --out $BundleName
Pop-Location

if (-not (Test-Path $BundleLocal)) {
  throw "Bundle não gerado: $BundleLocal"
}

Write-Host "==> Backup MongoDB em produção (se mongodump disponível)"
& ssh @ssh "${User}@${HostIP}" "bash $RemoteDir/deploy/backup-mongo.sh" 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Backup falhou (mongodump ausente?) — continuando com import."
}

Write-Host "==> Upload script + bundle"
$ScriptLocal = Join-Path $Backend "scripts\sync-tenant-data.mjs"
& scp @ssh $ScriptLocal "${User}@${HostIP}:$RemoteDir/backend/scripts/sync-tenant-data.mjs"
& scp @ssh $BundleLocal "${User}@${HostIP}:$BundleRemote"

Write-Host "==> Import em produção (substitui dados do tenant)"
$remoteImport = "cd $RemoteDir/backend && MONGO_URI=mongodb://127.0.0.1:27017/finance node scripts/sync-tenant-data.mjs import --email $Email --in $BundleRemote --yes"
& ssh @ssh "${User}@${HostIP}" $remoteImport

Write-Host "==> Diagnóstico pós-import"
& ssh @ssh "${User}@${HostIP}" "cd $RemoteDir/backend && node scripts/diagnose-db.mjs" 2>&1 | Select-Object -Last 40

Write-Host "==> Concluído. Bundle local: $BundleLocal"

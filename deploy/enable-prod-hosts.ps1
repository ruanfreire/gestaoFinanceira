# Adiciona financeiro.seumovimento.com.br → VM (só neste PC). Execute como Administrador.
#Remove-Item Function:\requires -ErrorAction SilentlyContinue
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$line = "147.15.15.150 financeiro.seumovimento.com.br"
$entry = "financeiro.seumovimento.com.br"

$content = Get-Content $hostsPath -Raw
if ($content -match [regex]::Escape($entry)) {
  Write-Host "Entrada já existe em hosts."
  exit 0
}

Add-Content -Path $hostsPath -Value "`n# Gestao Financeira PROD (temporário até DNS propagar)`n$line"
Write-Host "OK: $line adicionado."
Write-Host "Limpe cache do site no navegador e desregistre o Service Worker (DevTools → Application)."
Write-Host "Teste: https://financeiro.seumovimento.com.br/api/health"

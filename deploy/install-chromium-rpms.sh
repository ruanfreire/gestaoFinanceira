#!/bin/bash
# Instala libs do Chromium via curl + rpm (evita dnf lento em VM 1GB).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
RPM_DIR="/tmp/chromium-rpms"
BASE="https://mirror.stream.centos.org/9-stream/BaseOS/x86_64/os/Packages"

mkdir -p "$RPM_DIR"
cd "$RPM_DIR"

fetch_rpm() {
  local letter="$1"
  local pattern="$2"
  local url
  url=$(curl -fsSL "${BASE}/${letter}/" | grep -o "${pattern}" | sort -V | tail -1)
  if [[ -z "$url" ]]; then
    echo "ERRO: RPM não encontrado (${pattern})"
    return 1
  fi
  if [[ -f "$url" ]]; then
    echo "já existe: $url"
    return 0
  fi
  echo "baixando: $url"
  curl -fsSLO "${BASE}/${letter}/${url}"
}

echo "==> Baixando RPMs mínimos"
fetch_rpm a 'atk-2[^"]*x86_64\.rpm'
fetch_rpm a 'at-spi2-atk-2[^"]*x86_64\.rpm'
fetch_rpm a 'at-spi2-core-2[^"]*x86_64\.rpm'
fetch_rpm n 'nspr-[^"]*x86_64\.rpm'
fetch_rpm n 'nss-[0-9][^"]*x86_64\.rpm'
fetch_rpm n 'nss-util-[^"]*x86_64\.rpm'
fetch_rpm n 'nss-softokn-[^"]*x86_64\.rpm'
fetch_rpm n 'nss-sysinit-[^"]*x86_64\.rpm'
fetch_rpm l 'libX11-[^"]*x86_64\.rpm'
fetch_rpm l 'libXcomposite-[^"]*x86_64\.rpm'
fetch_rpm l 'libXdamage-[^"]*x86_64\.rpm'
fetch_rpm l 'libXext-[^"]*x86_64\.rpm'
fetch_rpm l 'libXfixes-[^"]*x86_64\.rpm'
fetch_rpm l 'libXi-[^"]*x86_64\.rpm'
fetch_rpm l 'libXrandr-[^"]*x86_64\.rpm'
fetch_rpm l 'libxcb-[^"]*x86_64\.rpm'
fetch_rpm l 'libxkbcommon-[^"]*x86_64\.rpm'
fetch_rpm m 'mesa-libgbm-[^"]*x86_64\.rpm'
fetch_rpm p 'pango-[^"]*x86_64\.rpm'
fetch_rpm c 'cairo-[^"]*x86_64\.rpm'
fetch_rpm a 'alsa-lib-[^"]*x86_64\.rpm'
fetch_rpm d 'dbus-libs-[^"]*x86_64\.rpm'
fetch_rpm c 'cups-libs-[^"]*x86_64\.rpm'
fetch_rpm l 'libdrm-[^"]*x86_64\.rpm'

echo "==> Instalando ($(ls -1 *.rpm 2>/dev/null | wc -l) pacotes)"
sudo rpm -Uvh --nodeps --force *.rpm 2>&1 | tail -20

echo "==> Playwright chromium"
if [[ -f "$APP_DIR/node_modules/playwright/cli.js" ]]; then
  node "$APP_DIR/node_modules/playwright/cli.js" install chromium
fi

echo "==> Teste"
cd "$APP_DIR/backend"
node scripts/test-chromium.mjs

echo "==> OK"

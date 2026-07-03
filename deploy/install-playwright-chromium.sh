#!/bin/bash
# Dependências mínimas do Chromium (Playwright) em Oracle Linux — sem metapacotes pesados.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gestao-financeira}"
PACKAGES=(
  atk at-spi2-atk at-spi2-core
  nss nspr
  cups-libs
  libdrm mesa-libgbm
  libX11 libXcomposite libXdamage libXext libXfixes libXi libXrandr libxcb libxkbcommon
  pango cairo gtk3
  alsa-lib dbus-libs
)

echo "==> Pacotes Chromium (mínimo)"
sudo dnf install -y "${PACKAGES[@]}"

echo "==> Binários Playwright"
if [[ -f "$APP_DIR/node_modules/playwright/cli.js" ]]; then
  node "$APP_DIR/node_modules/playwright/cli.js" install chromium
else
  echo "AVISO: playwright não encontrado em $APP_DIR/node_modules"
fi

echo "==> Teste rápido"
cd "$APP_DIR/backend"
if [[ -f scripts/test-chromium.mjs ]]; then
  node scripts/test-chromium.mjs
fi

echo "==> Chromium pronto"

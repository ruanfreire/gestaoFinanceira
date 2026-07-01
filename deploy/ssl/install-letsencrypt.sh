#!/bin/bash
# Let's Encrypt via acme.sh (leve, sem dnf) — renovação automática
set -euo pipefail

SSL_DOMAIN="${SSL_DOMAIN:-financeiro.seumovimento.com.br}"
SSL_DIR="${SSL_DIR:-/etc/nginx/ssl}"
WEBROOT="${ACME_WEBROOT:-/var/www/acme}"
ACME_HOME="${ACME_HOME:-$HOME/.acme.sh}"
CERT_FILE="${SSL_DIR}/gestao-financeira.crt"
KEY_FILE="${SSL_DIR}/gestao-financeira.key"
ACME_EMAIL="${ACME_EMAIL:-admin@${SSL_DOMAIN#*.}}"

if [[ -z "$SSL_DOMAIN" || "$SSL_DOMAIN" == "_" ]]; then
  echo "SSL_DOMAIN não definido; pulando Let's Encrypt."
  exit 1
fi

if [[ ! -d "$ACME_HOME" ]]; then
  echo "==> Instalando acme.sh"
  curl -fsSL https://get.acme.sh | sh -s "email=${ACME_EMAIL}"
fi

# shellcheck source=/dev/null
source "${ACME_HOME}/acme.sh.env"

sudo mkdir -p "$WEBROOT/.well-known/acme-challenge"
sudo chown -R opc:opc "$WEBROOT"
sudo chmod -R 755 "$WEBROOT"

if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" != "Disabled" ]]; then
  sudo chcon -R -t httpd_sys_content_t "$WEBROOT" 2>/dev/null || true
fi

echo "==> Emitindo certificado Let's Encrypt para ${SSL_DOMAIN}"
"${ACME_HOME}/acme.sh" --set-default-ca --server letsencrypt
"${ACME_HOME}/acme.sh" --issue \
  -d "$SSL_DOMAIN" \
  -w "$WEBROOT" \
  --keylength ec-256 \
  --force

echo "==> Instalando certificado no nginx"
sudo mkdir -p "$SSL_DIR"
TMP_SSL="${HOME}/.ssl-install"
mkdir -p "$TMP_SSL"
"${ACME_HOME}/acme.sh" --install-cert -d "$SSL_DOMAIN" \
  --key-file "${TMP_SSL}/gestao-financeira.key" \
  --fullchain-file "${TMP_SSL}/gestao-financeira.crt" \
  --reloadcmd "sudo cp ${TMP_SSL}/gestao-financeira.key ${KEY_FILE} && sudo cp ${TMP_SSL}/gestao-financeira.crt ${CERT_FILE} && sudo chmod 600 ${KEY_FILE} && sudo chmod 644 ${CERT_FILE} && sudo systemctl reload nginx"

sudo chmod 600 "$KEY_FILE"
sudo chmod 644 "$CERT_FILE"

echo "==> Certificado instalado:"
sudo openssl x509 -in "$CERT_FILE" -noout -subject -issuer -dates

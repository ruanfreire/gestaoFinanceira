#!/bin/bash
# Certificado autoassinado de longa duração (padrão: 100 anos)
set -euo pipefail

SSL_DIR="${SSL_DIR:-/etc/nginx/ssl}"
CERT_DAYS="${SSL_CERT_DAYS:-36500}"
KEY_FILE="${SSL_DIR}/gestao-financeira.key"
CERT_FILE="${SSL_DIR}/gestao-financeira.crt"
HOST_IP="${SSL_HOST_IP:-}"
SSL_DOMAIN="${SSL_DOMAIN:-financeiro.seumovimento.com.br}"
SSL_FORCE="${SSL_FORCE:-0}"

if [[ -z "$HOST_IP" ]]; then
  HOST_IP="$(curl -fsSL --max-time 5 ifconfig.me 2>/dev/null || true)"
fi
if [[ -z "$HOST_IP" ]]; then
  HOST_IP="$(hostname -I | awk '{print $1}')"
fi

if [[ -f "$CERT_FILE" && -f "$KEY_FILE" && "$SSL_FORCE" != "1" ]]; then
  if openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -q "DNS:${SSL_DOMAIN}"; then
    echo "==> Certificado SSL já existe para ${SSL_DOMAIN}"
    openssl x509 -in "$CERT_FILE" -noout -subject -dates
    exit 0
  fi
  echo "==> Certificado existente não cobre ${SSL_DOMAIN}; regenerando..."
fi

echo "==> Gerando certificado autoassinado (${CERT_DAYS} dias)"
echo "    Domínio: ${SSL_DOMAIN}"
echo "    IP: ${HOST_IP}"

sudo mkdir -p "$SSL_DIR"

TMP_CONF="$(mktemp)"
trap 'rm -f "$TMP_CONF"' EXIT

cat >"$TMP_CONF" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3

[dn]
CN = ${SSL_DOMAIN}
O = Gestao Financeira

[v3]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = ${SSL_DOMAIN}
DNS.2 = localhost
IP.1 = ${HOST_IP}
EOF

sudo openssl req -x509 -nodes -newkey rsa:2048 \
  -days "$CERT_DAYS" \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$TMP_CONF" \
  -extensions v3

sudo chmod 600 "$KEY_FILE"
sudo chmod 644 "$CERT_FILE"
sudo chown root:root "$KEY_FILE" "$CERT_FILE"

echo "==> Certificado criado:"
sudo openssl x509 -in "$CERT_FILE" -noout -subject -dates

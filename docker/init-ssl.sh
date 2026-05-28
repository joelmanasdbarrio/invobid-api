#!/bin/bash
# First-time SSL certificate setup for invobid.com
# Usage: ./init-ssl.sh <domain> <email> [alt-domain ...]
# Example: ./init-ssl.sh invobid.com invobid@invobid.com www.invobid.com
set -euo pipefail

export MSYS_NO_PATHCONV=1

# Allow overriding compose file and compose command from environment
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE="${COMPOSE:-docker compose -f ${COMPOSE_FILE}}"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <domain> <email> [alt-domain ...]"
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"
shift 2
ALT_DOMAINS=("$@")

# Build DNS args (-d) for certbot
DNS_ARGS="-d ${DOMAIN}"
for d in "${ALT_DOMAINS[@]:-}"; do
  DNS_ARGS="$DNS_ARGS -d ${d}"
done

# If you want to test with Let's Encrypt staging, set STAGING=1 in the environment
STAGING_FLAG=""
if [ "${STAGING:-0}" = "1" ]; then
  STAGING_FLAG="--staging"
fi

# Use the primary domain as the cert name by default
CERT_NAME="${CERT_NAME:-$DOMAIN}"

echo "==> [1/5] Creating placeholder certificate so nginx can start..."
$COMPOSE run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/${DOMAIN}
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out    /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj   '/CN=${DOMAIN}' 2>/dev/null
  cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
     /etc/letsencrypt/live/${DOMAIN}/chain.pem
"

echo "==> [2/5] Starting nginx with placeholder certificate..."
$COMPOSE up --no-deps -d web
sleep 2

echo "==> Removing any placeholder certs to avoid certbot creating -0001 names..."
$COMPOSE run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/${DOMAIN} || true
  rm -rf /etc/letsencrypt/archive/${DOMAIN} || true
  rm -f /etc/letsencrypt/renewal/${DOMAIN}.conf || true
  ls -la /etc/letsencrypt/live || true
"

echo "==> [3/5] Obtaining Let's Encrypt certificate for ${DOMAIN}..."
$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  ${DNS_ARGS} \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  --cert-name "${CERT_NAME}" \
  ${STAGING_FLAG}

echo "==> [4/5] Reloading nginx with real certificate..."
$COMPOSE exec web nginx -s reload || true

echo ""
echo "Done! https://${DOMAIN} should now be secured with Let's Encrypt."
echo ""
echo "Notes:"
echo " - To test against Let's Encrypt staging, run: STAGING=1 ./init-ssl.sh ${DOMAIN} ${EMAIL}"
echo " - To include extra names (www), pass them as extra args: ./init-ssl.sh ${DOMAIN} ${EMAIL} www.${DOMAIN}"
echo " - Start the full stack with:"
echo "     ${COMPOSE} up -d"

echo ""
echo "Next steps: consider adding a renewal cron or systemd timer that runs:"
echo "  ${COMPOSE} run --rm certbot renew --webroot -w /var/www/certbot && ${COMPOSE} exec web nginx -s reload"

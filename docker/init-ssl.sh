#!/bin/bash
# First-time SSL certificate setup for invobid.com
# Usage: ./init-ssl.sh <domain> <email>
# Example: ./init-ssl.sh invobid.com admin@invobid.com
set -e

DOMAIN="${1:-invobid.com}"
EMAIL="${2:?Usage: ./init-ssl.sh invobid.com admin@invobid.com}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> [1/4] Creating placeholder certificate so nginx can start..."
$COMPOSE run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj   '/CN=localhost' 2>/dev/null
  cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
     /etc/letsencrypt/live/$DOMAIN/chain.pem
"

echo "==> [2/4] Starting nginx with placeholder certificate..."
$COMPOSE up --no-deps -d web
sleep 2

echo "==> [3/4] Obtaining Let's Encrypt certificate for $DOMAIN..."
$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal

echo "==> [4/4] Reloading nginx with real certificate..."
$COMPOSE exec web nginx -s reload

echo ""
echo "Done! https://$DOMAIN is now secured with Let's Encrypt."
echo ""
echo "Start the full stack with:"
echo "  $COMPOSE up -d"

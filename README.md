## Local development guidelines

> **📋 Full API Specification**: See [test/e2e-spec.md](test/e2e-spec.md) for comprehensive endpoint documentation and expected behavior across all use cases.

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for infrastructure services)

### Setup

1. Install dependencies:

```sh
npm install
```

2. Copy the environment template and fill in the missing values:

```sh
cp .env.template .env
```

3. Start infrastructure services (PostgreSQL, MinIO, pgAdmin):

```sh
npm run init-local-dependencies
```

4. Start the development server with hot-reload:

```sh
npm run start:dev
```

Base API URL: `http://localhost:3000/api/v1`

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment (`local`, `development`, `production`) |
| `PORT` | No | `3000` | HTTP port |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin (HTTP and WebSocket) |
| `DB_HOST` | **Yes** | — | PostgreSQL host |
| `DB_PORT` | **Yes** | — | PostgreSQL port |
| `DB_NAME` | **Yes** | — | Database name |
| `DB_USR` | **Yes** | — | Database user |
| `DB_PWD` | **Yes** | — | Database password |
| `MINIO_ENDPOINT` | No | `localhost` | MinIO hostname (`invobid_minio` in production) |
| `MINIO_PORT` | No | `9000` | MinIO port |
| `MINIO_USR` | **Yes** | — | MinIO root user |
| `MINIO_PWD` | **Yes** | — | MinIO root password |
| `MINIO_ACCESS_KEY` | **Yes** | — | MinIO access key |
| `MINIO_SECRET_KEY` | **Yes** | — | MinIO secret key |
| `MINIO_DOCS_BUCKET_NAME` | No | — | MinIO bucket for documents |
| `MINIO_PUBLIC_BUCKET_NAME` | No | — | MinIO bucket for public files |
| `BUYER_TRANSFER_FEE_PERCENTAGE` | **Yes** | — | Fee percentage charged to buyers |
| `SELLER_TRANSFER_FEE_PERCENTAGE` | **Yes** | — | Fee percentage charged to sellers |
| `SMALLEST_BID_INCREMENT_PERCENTAGE` | **Yes** | — | Minimum bid increment percentage |

### Database

pgAdmin: [`http://localhost:8080`](http://localhost:8080)
- Email: `admin@mail.com`
- Password: `1234`

> On the VPS, pgAdmin is only accessible via SSH port forwarding:
> ```sh
> ssh -L 8080:localhost:8080 user@invobid.com
> ```
> Then open `http://localhost:8080` in your local browser.

---

## Production deployment

### Prerequisites on the VPS

- [Docker Engine](https://docs.docker.com/engine/install/) + Compose plugin
- Both repos cloned as siblings (required for the relative build context):

```
~/invobid/
  invobid-api/
  invobid-spa/
```

### First-time setup

1. Clone both repos:

```sh
mkdir ~/invobid && cd ~/invobid
git clone <invobid-api-repo-url> invobid-api
git clone <invobid-spa-repo-url> invobid-spa
```

2. Create the production `.env` from the template:

```sh
cp ~/invobid/invobid-api/.env.template ~/invobid/invobid-api/.env
```

Key values to set for production:

```sh
NODE_ENV=production
CORS_ORIGIN=https://invobid.com
MINIO_ENDPOINT=invobid_minio   # internal Docker hostname, NOT localhost
# ... fill in all other required variables
```

3. Point `invobid.com` A record to the VPS IP at your DNS provider, then obtain the SSL certificate:

```sh
cd ~/invobid/invobid-api/docker
chmod +x init-ssl.sh
./init-ssl.sh invobid.com admin@invobid.com
```

4. Start the full stack:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Deploying updates

```sh
cd ~/invobid/invobid-api/docker
git -C ~/invobid/invobid-api pull
git -C ~/invobid/invobid-spa pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Certificate renewal

Add a monthly cron job on the VPS (`crontab -e`):

```sh
0 0 1 * * cd ~/invobid/invobid-api/docker && docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web nginx -s reload
```
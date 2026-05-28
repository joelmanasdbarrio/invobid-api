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

Pre-built Docker images are published to [GitHub Container Registry](https://ghcr.io) automatically via CI when a version tag is pushed. The VPS only needs Docker and the `docker-compose.prod.yml` file — no source code or build tools required.

### Image publishing

Images are built and pushed by GitHub Actions (`.github/workflows/ci.yml`) on two events:

| Event | Image tag produced |
|---|---|
| Push to `release/vX.Y.Z` branch | `ghcr.io/joelmanasdbarrio/invobid-api:vX.Y.Z-rc.N` |
| Push of `vX.Y.Z` git tag | `ghcr.io/joelmanasdbarrio/invobid-api:vX.Y.Z` + `:latest` |

The publish job only runs after all test jobs pass.

### RC image cleanup

To avoid accumulating old release-candidate container versions in GHCR, a scheduled workflow runs from [.github/workflows/cleanup-old-images.yml](.github/workflows/cleanup-old-images.yml).

| Trigger | Behavior |
|---|---|
| Daily schedule (`0 6 * * *`) | Deletes `invobid-api` container versions tagged like `vX.Y.Z-rc.N` when older than `RC_RETENTION_DAYS` |
| Manual trigger (`workflow_dispatch`) | Allows on-demand cleanup run from the Actions tab |

Configure retention in repository settings as an Actions variable:

- Name: `RC_RETENTION_DAYS`
- Example value: `7`
- Fallback behavior: defaults to `7` if the variable is missing or invalid

Only RC-tagged versions are targeted. Stable release tags such as `vX.Y.Z` and `latest` are not affected.

### Prerequisites on the VPS

- [Docker Engine](https://docs.docker.com/engine/install/) + Compose plugin
- Authenticated to ghcr.io with a PAT (`read:packages` scope):

```sh
echo <YOUR_PAT> | docker login ghcr.io -u joelmanasdbarrio --password-stdin
```

### First-time setup

1. Copy the compose file and `.env` template to the server (no full repo clone required):

```sh
mkdir -p ~/invobid/docker
# Copy docker/docker-compose.prod.yml and docker/init-ssl.sh to ~/invobid/docker/
# Copy .env.template to ~/invobid/.env and fill in all values
```

2. Key values to set in `.env`:

```sh
NODE_ENV=production
CORS_ORIGIN=https://invobid.com
MINIO_ENDPOINT=invobid_minio   # internal Docker hostname, NOT localhost
# ... fill in all other required variables
```

3. Point `invobid.com` A record to the VPS IP at your DNS provider, then obtain the SSL certificate:

```sh
cd ~/invobid/docker
chmod +x init-ssl.sh
./init-ssl.sh invobid.com admin@invobid.com
```

4. Pull images and start the full stack:

```sh
cd ~/invobid/docker
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Deploying updates

After pushing a new tag in the repo, CI publishes the image automatically. To deploy it on the server:

```sh
cd ~/invobid/docker
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Certificate renewal

Add a monthly cron job on the VPS (`crontab -e`):

```sh
0 0 1 * * cd ~/invobid/docker && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec web nginx -s reload
```
## Local development guidelines

> **📋 Full API Specification**: See [test/definition/e2e-spec.md](test/definition/e2e-spec.md) for comprehensive endpoint documentation and expected behavior across all use cases.

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for infrastructure services)

### Setup

1. Install dependencies:

```sh
npm ci
```

2. Copy the environment template and fill in the missing values:

```sh
cp .env.template .env
```

3. Start infrastructure services (PostgreSQL, MinIO, pgAdmin):

```sh
npm run init-local-dependencies
```

Seed the database with test data (optional):

```sh
npm run seed
```

Clear the database (optional):

```sh
npm run seed:clear
```


4. Start the development server with hot-reload:

```sh
npm run start:dev
```

Open a JavaScript debug terminal in VSCode and run the process for debugging:

```sh
npm run start:debug
```

### Build and test

```sh
npm run build          # Compile Nest application
npm run lint           # ESLint with --fix
npm run test           # Unit tests (Jest)
npm run test:watch     # Unit tests in watch mode
npm run test:cov       # Unit tests with coverage
npm run test:e2e       # E2E tests against local profile
```

Base API URL: `http://localhost:3000/api/v1`

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment (`local`, `development`, `production`) |
| `PORT` | No | `3000` | HTTP port |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing |
| `CORS_ORIGIN` | No | `http://localhost:5173, http://192.168.0.10:5173` | Allowed CORS origins (HTTP and WebSocket), comma-separated for multiple values |
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
| `MINIO_BUCKET` | **Yes** | — | MinIO bucket name |
| `BUYER_TRANSFER_FEE_PERCENTAGE` | **Yes** | — | Fee percentage charged to buyers |
| `SELLER_TRANSFER_FEE_PERCENTAGE` | **Yes** | — | Fee percentage charged to sellers |
| `SMALLEST_BID_INCREMENT_PERCENTAGE` | **Yes** | — | Minimum bid increment percentage |
| `MINIMUM_INVOICE_DISCOUNT` | **Yes** | — | Minimum discount percentage allowed on invoices |
| `AUCTION_EXTENSION_MINUTES` | **Yes** | — | Minutes to extend an auction when a late bid arrives |

### Database

pgAdmin: [`http://localhost:8080`](http://localhost:8080)
- Email: [PGADMIN_DEFAULT_EMAIL](docker/docker-compose.yml#PGADMIN_DEFAULT_EMAIL)
- Password: [PGADMIN_DEFAULT_PASSWORD](docker/docker-compose.yml#PGADMIN_DEFAULT_PASSWORD)

> On the VPS, pgAdmin is only accessible via SSH port forwarding:
> ```sh
> ssh -L 8080:localhost:8080 user@invobid.com
> ```
> Then open `http://localhost:8080` in your local browser.

### Code structure

#### Folder directory layout

```
.github/
  ├─ ISSUE_TEMPLATE/                  # GitHub issue templates for bug reports and feature requests
  ├─ skills/                          # GitHub Copilot skills for AI-assisted code generation
  └─ workflows/                       # CI/CD pipelines for testing and publishing
docker/
  ├─ docker-compose.yml               # Local development compose file
  ├─ docker-compose.prod.yml          # Production compose file
  └─ init-ssl.sh                      # Script to generate SSL certs with Certbot
Dockerfile                            # API image build definition used by CI publish job (GHCR)
postman/
  ├─ env/                             # Postman environment variables
  └─ Invobid-REST.postman_collection.json    # Postman collection for manual API testing
src/
  ├─ app/                             # Feature modules grouped by domain
  │  ├─ auction/
  │  ├─ bank-account/
  │  ├─ bid/
  │  ├─ debtor/
  │  ├─ document/
  │  │  ├─ interfaces/                # Agnostic document upload/download service interfaces
  │  │  └─ services/                  # Concrete document upload/download service implementations (e.g., MinIO, AWS S3, Cloudflare R2, etc.)
  │  ├─ invoice/
  │  ├─ metric/
  │  └─ user/
  │     ├─ admin/
  │     ├─ auth/                      # Authentication module (decorators, guards, strategies)
  │     ├─ common/
  │     └─ investor/
  ├─ config/                          # Environment variables and configuration
  ├─ dto/                             # Global shared DTOs
  ├─ pipes/                           # Reusable validation/transformation pipes
  ├─ seed/                            # Database seeding module and service
  ├─ utils/                           # Utility functions and helpers
  ├─ validations/                     # Custom class-validator constraints/decorators
  ├─ app.module.ts                    # Root NestJS module
  ├─ main.ts                          # Application bootstrap entry point
  └─ seed.ts                          # Seed CLI entry point
test/                                 # End-to-end tests and supporting assets
  ├─ app/                             # Executable E2E suites grouped by feature/domain
  ├─ definition/                      # Living API contract in Markdown
  ├─ fixtures/                        # Factory helpers for valid test payloads
  ├─ helpers/                         # Test app bootstrap, auth, and DB helpers
  ├─ sample_files/                    # Uploaded file fixtures used by multipart tests
  ├─ app.e2e-spec.ts                  # Minimal smoke test for base API routing
  └─ setup-env.ts                     # Forces local env settings for E2E execution
```

1. `src/`: contains the main application source code.
    1. `app/`: contains all application actors divided into modules — this structure promotes DDD environment. Each module contains its own:
        - DTOs: Data Transfer Objects (request/response schemas). They are validated and transformed using `class-validator` and `class-transformer` so any malformed request is rejected with clear error messages before reaching the business logic.
        - Entities: Database models representing the application's data structure.
        - Enums: Enumerations used throughout the application like type and status discriminators.
        - Controllers: Handle incoming HTTP requests and return responses. Can be surrounded by decorators like:
          - [Auth](src/app/user/auth/decorators/auth.decorator.ts) guard, to enforce authentication and authorization. It accepts a list of allowed [user](src/app/user/common/enums/user-type.enum.ts) and/or [investor](src/app/user/investor/enums/investor-type.enum.ts) types as first parameter (e.g., `['admin']` or `['company', 'admin']`) and [investor status](src/app/user/investor/enums/investor-status.enum.ts) as second parameter (e.g., `InvestorStatus.VERIFIED`).
          - [GetUser](src/app/user/auth/decorators/get-user.decorator.ts) parameter, to extract the authenticated user from the request and inject it into the controller method.
        - Services: Contain the business logic of the application. Can inject other services, repositories, and external dependencies.
        - Spec files: contain unit tests for the module's services and controllers. They use Jest and Supertest to mock dependencies and test the module in isolation.
    2. `config/`: contains configuration files and environment variable validation schemas.
    3. `dto/`: contains global DTOs that are shared across modules:
        - [PaginationDto](src/dto/pagination.dto.ts): defines the structure for paginated responses.
    4. `pipes/`: contains reusable validation and transformation pipes:
        - [FileType](src/pipes/file-type.pipe.ts): validates the type of uploaded files based on `allowedExtensions` list.
        - [MetricType](src/pipes/metric-type.pipe.ts): validates the metric type against the `MetricType` enum.
    5. `seed/`: contains the database seeding module and service, which can be invoked via CLI to populate the database with initial data.
    6. `utils/`: contains utility functions and helpers that can be used across the application.
        - [ObjectExtension](src/utils/object.extensions.ts): provides methods to extend objects with additional properties or methods.
    7. `validations/`: contains custom `class-validator` constraints and decorators for advanced DTO validation scenarios:
        - [IsNifCifConstraint](src/validations/is-nif-cif.validator.ts): validates Spanish CIF/NIF numbers.
2. `test/`: contains end-to-end tests and supporting assets.
    1. `app/`: groups the executable specs by feature area (`auction`, `bid`, `debtor`, `invoice`, `user`) plus cross-cutting coverage such as [resilience.e2e-spec.ts](test/app/resilience.e2e-spec.ts).
    2. `definition/`: acts as the living API contract. Each Markdown file documents expected request/response behavior for a domain, with [e2e-spec.md](test/definition/e2e-spec.md) as the umbrella reference.
    3. `fixtures/`: provides factory functions that generate valid, unique DTO payloads for admins, investors, debtors, invoices, auctions, and bids. This keeps tests focused on behavior instead of hand-building request bodies.
    4. `helpers/`: centralizes E2E infrastructure:
        - [test-app.helper.ts](test/helpers/test-app.helper.ts): boots a Nest test application with the same global prefix, cookie parser, and `ValidationPipe` configuration used at runtime.
        - [auth.helper.ts](test/helpers/auth.helper.ts): wraps common registration, login, verification, and bearer-token setup flows.
        - [db.helper.ts](test/helpers/db.helper.ts): truncates every table with `CASCADE` when a spec needs a clean database state.
    5. `sample_files/`: stores reusable upload fixtures such as NIF/DNI images and invoice PDFs for multipart/form-data tests.
    6. `app.e2e-spec.ts`: is the smallest smoke test in the suite, validating that the base API route responds as expected for a non-existent endpoint.
    7. `setup-env.ts`: forces `NODE_ENV=local` before Jest boots the E2E app so the suite uses the local configuration profile.
3. `Dockerfile`: defines the multi-stage API image build used by the CI publish workflow to create `ghcr.io/joelmanasdbarrio/invobid-api` images, which are then consumed by the `api` service in `docker/docker-compose.prod.yml`.

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
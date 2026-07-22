# AI Agent Guidelines for Invobid API

NestJS + TypeScript backend for the Invobid invoice bidding platform.

## Quick Navigation

- **Setup and environment**: See [README.md](README.md)
- **Living API contract**: See [test/definition/e2e-spec.md](test/definition/e2e-spec.md)
- **Feature-specific endpoint specs**: See `test/definition/*.e2e-spec.md`

## Build and Test Commands

```bash
npm ci                         # Install dependencies
npm run start:dev             # Dev server with watch mode (NODE_ENV=local)
npm run start:debug           # Debuggable watch mode
npm run build                 # Compile Nest application
npm run test                  # Unit tests
npm run test:e2e              # E2E tests against local profile, run in-band
npm run lint                  # ESLint with --fix
npm run init-local-dependencies  # Start PostgreSQL, MinIO, pgAdmin
npm run stop-local-dependencies  # Stop local infrastructure
npm run seed                  # Recreate local infra and seed test data
npm run seed:clear            # Recreate local infra without seeding
```

Requires Node.js 22+, Docker, and `.env` copied from `.env.template`.

Important env vars for business logic: `JWT_SECRET`, `DB_*`, `MINIO_*`, `BUYER_TRANSFER_FEE_PERCENTAGE`, `SELLER_TRANSFER_FEE_PERCENTAGE`, `SMALLEST_BID_INCREMENT_PERCENTAGE`, `MINIMUM_INVOICE_DISCOUNT`, `AUCTION_EXTENSION_MINUTES`.

## Architecture

```text
src/
├── app/
│   ├── auction/        # Auction lifecycle, metrics, scheduler-driven transitions
│   ├── bank-account/   # Reserve/release/finalize money movements
│   ├── bid/            # Bid validation, reservations, outbid behavior
│   ├── debtor/         # Debtor CRUD, ownership-aware filtering, lookup counts
│   ├── document/       # Upload/download abstraction with swappable storage providers
│   ├── invoice/        # Invoice creation and fee capture
│   ├── metric/         # Aggregated reporting queries
│   └── user/           # Admin, investor, auth, guards, decorators
├── config/             # Env loading and Joi schema
├── dto/                # Shared DTOs like PaginationDto
├── pipes/              # Reusable request pipes
├── seed/               # Seed CLI module
└── validations/        # Custom class-validator constraints
```

Each domain module follows the Nest pattern: controller, service, DTOs, entities, enums, and tests. Prefer extending the existing module instead of creating parallel abstractions.

## Core Conventions

### HTTP and validation

- Global prefix is `api/v1`.
- Runtime and E2E app bootstrap both use `cookie-parser` plus a `ValidationPipe` with `whitelist: true`, `transform: true`, and `enableImplicitConversion: true`.
- DTO validation belongs in `class-validator` decorators. Reuse the patterns in [.github/skills/validation-patterns/SKILL.md](.github/skills/validation-patterns/SKILL.md) before inventing ad hoc checks.

### Auth and access control

- Use `@Auth(...)` on protected routes; it layers JWT auth with `UserRoleGuard`.
- Default `@Auth()` behavior is not public access: with no explicit args it still enforces JWT auth, allows admins, and requires verified status for investors.
- `@GetUser()` is the standard way to pass the authenticated user into controller methods.

### API response shape

- Success responses are wrapped as `{ status: 'success', data }`.
- Paginated list responses also return `_metadata` with `total`, `length`, `page`, and `limit`.
- Keep pagination defaults in the controller layer via `query.page || 1` and `query.limit || 10` before delegating to services.

### Data and money rules

- `invoice.transactionFee` stores buyer and seller percentages at invoice creation time. Those values are captured from env config and should be treated as immutable per invoice.
- Auction ending fields such as `price.end`, `discount.end`, and `profitability.end` stay null until the auction reaches `FINISHED`.
- Bid and settlement logic is fee-sensitive. Preserve the distinction between reserved totals, winning bid amounts, buyer fee, and seller fee when changing auction, bid, invoice, bank-account, or metric code.
- Bank account settlement must remain atomic. Follow the locking and transaction pattern already used in `bank-account.service.ts`.

## Testing Patterns

- Unit tests are Jest specs under `src/**`. The Jest root is `src`, and the `src/*` path alias is configured.
- E2E tests live under `test/app/**`; supporting helpers are under `test/helpers/**`, fixtures under `test/fixtures/**`, and file upload samples under `test/sample_files/**`.
- `test/helpers/test-app.helper.ts` mirrors the real app bootstrap. Reuse it instead of building ad hoc E2E setup.
- `test/definition/*.md` is the living contract. When behavior changes, update the relevant contract doc and the executable E2E coverage together.

## Common Pitfalls

- Do not treat auction ending metrics as live fields before `FINISHED`; for non-finished auctions, current display values may need to be inferred from bids rather than persisted state.
- Do not bypass the stored invoice fee percentages with fresh env reads when computing later bid, settlement, or metric behavior.
- Do not hand-roll file upload validation; reuse `FileTypePipe`.
- Be careful with quoted raw SQL identifiers in metric queries. Existing columns use camel-case names and TypeORM-generated quoting rules.
- Local infrastructure-dependent commands assume Docker services are running; `test:e2e` uses the local profile and can fail for environment reasons before code reasons.

## Existing Skills

- [.github/skills/create-endpoint/SKILL.md](.github/skills/create-endpoint/SKILL.md): add a REST endpoint following the repo's DTO → service → controller pattern.
- [.github/skills/testing-e2e/SKILL.md](.github/skills/testing-e2e/SKILL.md): add or extend backend E2E tests.
- [.github/skills/validation-patterns/SKILL.md](.github/skills/validation-patterns/SKILL.md): add DTO validators or custom `class-validator` constraints.

## Session History Note

The local session store currently has little or no invobid-api-specific activity, so these instructions are based on the codebase and existing docs rather than observed backend friction. Use `/chronicle improve` later to refine this file once more invobid-api work has been captured.
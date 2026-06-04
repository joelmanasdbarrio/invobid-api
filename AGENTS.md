# AI Agent Guidelines for Invobid API

This file helps AI coding agents understand the invobid-api codebase and be immediately productive.

## Quick Navigation

- **Setup & Environment**: See [README.md](README.md#local-development-guidelines)
- **Complete API Contract**: See [test/e2e-spec.md](test/e2e-spec.md) (essential reading)
- **Build/Test Commands**: See section below

## Essential Build & Test Commands

```bash
# Development
npm run start:dev              # Watch mode (NODE_ENV=local)
npm run start:debug           # Debug on port 9229

# Testing
npm run test                  # All unit tests
npm run test:e2e              # All E2E tests (requires Docker)
npm run test:watch            # Unit tests watch mode
npm run test:cov              # Coverage report

# Database
npm run init-local-dependencies    # Start Docker (Postgres, MinIO, pgAdmin)
npm run seed                       # Full reset + seed database
npm run test:e2e -- --detectOpenHandles  # Debug open handles in E2E

# Code quality
npm run lint                  # ESLint with auto-fix
npm run format                # Prettier format
npm run build                 # TypeScript compilation
```

**E2E Tests Critical**: Run with `--runInBand --forceExit` flags (configured in [jest-e2e.json](jest-e2e.json))

## Architecture Principles

**Module Organization**: Feature-based in `src/app/` → `user`, `auction`, `bid`, `invoice`, `debtor`, `document`, `bank-account`

**Pattern Examples**:
- Controllers use `@Auth()` decorator for role-based protection
- Services encapsulate business logic; inject repositories
- Use `forwardRef()` for circular imports (AuctionModule ↔ BidModule)
- All entities support soft deletes: query with `{ withDeleted: true }` when needed

**Response Format**:
```typescript
{ status: 'success', data: {...}, _metadata: { total, length, page, limit } }
```

## Core Development Patterns

### 1. Creating Endpoints

**File Structure**:
```
src/app/{module}/
├── dto/           # Create{Entity}Dto, Update{Entity}Dto
├── entities/      # TypeORM entities
├── controllers/   # Route handlers
├── services/      # Business logic
└── {module}.module.ts
```

**DTO Validation**: Use `class-validator` decorators. Global `ValidationPipe` enforces whitelist, transform, implicit conversion. Ref: [PaginationDto](src/dto/pagination.dto.ts)

**Authentication**: 
```typescript
@Auth(roles: UserType[], status?: InvestorStatus[])
// Applies: AuthGuard('jwt') + UserRoleGuard
// Empty roles = all authenticated users allowed
```

**File Uploads**: Use `FileTypePipe` (allows: pdf, jpeg, jpg, png)
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadDocument(@UploadedFile(FileTypePipe) file) { }
```

### 2. Custom Validators

Location: `src/validations/`

**Example**: `IsCifNifValidator` validates Spanish tax IDs (NIF, NIE, CIF)
```typescript
@IsCifNif() // Use decorator on DTO property
taxId: string;
```

### 3. Testing

**Unit Tests**: `*.spec.ts` files

**E2E Tests**: Use `test/helpers/test-app.helper.ts` factory
```typescript
const { app, server } = await createTestApp();
const { accessToken } = await registerAdmin(server, dto);

// Make authenticated requests
await server
  .post('/api/v1/auction')
  .set('Authorization', `Bearer ${accessToken}`)
  .send(payload);
```

**Auth Helpers**: [test/helpers/auth.helper.ts](test/helpers/auth.helper.ts) provides:
- `registerAdmin(server, dto)` → `{ accessToken, user }`
- `registerInvestor(server, dto, filePath)` → `{ accessToken, user }`
- `loginUser(server, email, password)` → `{ accessToken }`

### 4. Configuration & Environment

**Validation**: [src/config/env.schema.ts](src/config/env.schema.ts) (Joi schema)

**Required Variables**:
- `JWT_SECRET`, `DB_*` (5 vars), `MINIO_*` (7 vars)
- `BUYER_TRANSFER_FEE_PERCENTAGE`, `SELLER_TRANSFER_FEE_PERCENTAGE`, `SMALLEST_BID_INCREMENT_PERCENTAGE`

**Access in Services**:
```typescript
constructor(private configService: ConfigService) {}
const secret = this.configService.get<string>('JWT_SECRET')!;
```

## Special Business Logic

### Auction Ending Values

**Critical Pattern**: `endingDiscount` and `endingProfitability` are **only persisted when `Auction.status = FINISHED`**

- While TRANSITIONING/PUBLISHED: values remain NULL
- Frontend infers ending values from latest bid when NULL
- When transitioning to FINISHED: service sets ending values from winning bid

See: [src/app/auction/auction.service.ts](src/app/auction/auction.service.ts) (update method)

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| E2E test fails intermittently | Must use `--runInBand --forceExit` (sequential execution) |
| JWT auth returns 500 instead of 401 | JWT strategy throws `ServiceUnavailableException` for DB errors (by design) |
| Soft-deleted user can still authenticate | Always add `withDeleted: true` in JWT strategy user lookup |
| TypeORM circular import error | Add `forwardRef(() => Module)` in imports |
| Extra request fields not rejected | DTO validation has `forbidNonWhitelisted: false` (warns but allows) |
| File upload MIME type mismatch | FileTypePipe only allows: pdf, jpeg, jpg, png |
| MinIO not found | MinioStorageService only works in `NODE_ENV=local` |
| Role guard silently fails | Empty roles array = all authenticated users allowed (intentional) |

## Database

**ORM**: TypeORM with PostgreSQL

**Auto-sync**: Enabled in development/local (creates tables on startup), disabled in production (manual migrations required)

**Soft Deletes**: `@DeleteDateColumn()` on all entities. Query with:
```typescript
await repo.find({ withDeleted: true });  // Include deleted records
```

**Embedded Objects**: TypeORM creates prefixed columns
```typescript
@Column(() => AuctionPrice)
price: AuctionPrice;  // DB: price_start, price_end
```

## Key Files Reference

| File | Purpose |
|------|---------|
| [src/app.module.ts](src/app.module.ts) | Module configuration, imports, feature modules |
| [src/main.ts](src/main.ts) | Bootstrap, global ValidationPipe setup |
| [src/app/user/auth/strategies/jwt.strategy.ts](src/app/user/auth/strategies/jwt.strategy.ts) | JWT validation, user extraction |
| [src/app/user/auth/decorators/auth.decorator.ts](src/app/user/auth/decorators/auth.decorator.ts) | Role-based access control decorator |
| [test/definition/e2e-spec.md](test/definition/e2e-spec.md) | **Complete API contract (BDD format)** |
| [test/helpers/test-app.helper.ts](test/helpers/test-app.helper.ts) | Test app factory |
| [src/validations/is-nif-cif.validator.ts](src/validations/is-nif-cif.validator.ts) | Spanish tax ID validation |

## Code Reading Order for New Developers

1. [README.md](README.md) - Setup & environment
2. [src/app.module.ts](src/app.module.ts) - Module structure
3. [src/main.ts](src/main.ts) - Bootstrap & validation
4. [test/definition/e2e-spec.md](test/definition/e2e-spec.md) - **API contract (must read)**
5. Example module: [src/app/auction/auction.module.ts](src/app/auction/auction.module.ts)
6. JWT strategy: [src/app/user/auth/strategies/jwt.strategy.ts](src/app/user/auth/strategies/jwt.strategy.ts)

## Health Check

**Verify setup**:
```bash
# Terminal 1: Start services
npm run init-local-dependencies
npm run seed
npm run start:dev

# Terminal 2: Test login (admin credentials seeded)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@invobid.com","password":"Admin123!"}'
```

Expected response includes `access_token` and `user` data.

## When Modifying Code

| Task | Pattern |
|------|---------|
| **Add API endpoint** | Create DTO → Add controller method → Inject service → Implement service |
| **Add DTO validation** | Use `class-validator` decorators (run through global `ValidationPipe`) |
| **Add custom validation** | Create class in `src/validations/`, implement `ValidatorConstraintInterface` |
| **Require authentication** | Use `@Auth()` decorator on controller method |
| **Upload file** | Use `@UseInterceptors(FileInterceptor())` + `FileTypePipe` |
| **Soft delete entity** | Add `{ withDeleted: true }` when querying if needed |
| **Write test** | Use helpers from [test/helpers/](test/helpers/), follow E2E test structure in [test/app/](test/app/) |
| **Modify entity schema** | TypeORM auto-sync handles it in dev; migrations needed for production |

## Stack Summary

- **Framework**: NestJS 11.0+
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 14+ with TypeORM 0.3.27
- **Authentication**: JWT + Passport.js (reads from Authorization header OR cookies)
- **File Storage**: MinIO
- **Real-time**: Socket.io
- **Testing**: Jest + Supertest
- **Node.js**: 22+

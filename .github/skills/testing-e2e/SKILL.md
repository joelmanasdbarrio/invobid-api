---
name: testing-e2e
description: "Use when: Writing E2E tests for invobid-api endpoints. Covers test app setup, auth helpers, request patterns, assertions, fixtures, and database cleanup. Use for adding new e2e-spec files or extending existing ones."
argument-hint: "Name of the module/endpoint to test (e.g. 'debtor' or 'POST /auctions')"
---

# Writing E2E Tests for invobid-api

## File Location

```
test/app/{module}/{module}.e2e-spec.ts
```

Run with: `npm run test:e2e` (configured with `--runInBand --forceExit` — **must be sequential**)

## Standard Test File Structure

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeDebtorDto } from '../../fixtures/entities.fixture';
import { makeAdminDto, makeCompanyInvestorDto } from '../../fixtures/users.fixture';
import { authHeader, registerAdmin, registerInvestor, verifyInvestor } from '../../helpers/auth.helper';
import { cleanDatabase } from '../../helpers/db.helper';
import { createTestApp } from '../../helpers/test-app.helper';

const API = '/api/v1';

describe('FeatureName (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let companyToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const company = await registerInvestor(server, makeCompanyInvestorDto());
    companyToken = company.accessToken;
    await verifyInvestor(server, adminToken, company.user.id);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  describe('POST /resource', () => {
    it('should create resource and return 201', async () => {
      const dto = makeDebtorDto();
      const res = await request(server)
        .post(`${API}/resource`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.email).toBe(dto.email);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(server)
        .post(`${API}/resource`)
        .set(authHeader(companyToken))
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(server).post(`${API}/resource`).send(makeDebtorDto());
      expect(res.status).toBe(401);
    });

    it('should return 403 for wrong role', async () => {
      const res = await request(server)
        .post(`${API}/resource`)
        .set(authHeader(adminToken)) // Admin can't create debtors
        .send(makeDebtorDto());
      expect(res.status).toBe(403);
    });
  });
});
```

## Auth Helpers

From [test/helpers/auth.helper.ts](../../../test/helpers/auth.helper.ts):

```typescript
// Register and get token (admin)
const { accessToken, user } = await registerAdmin(server, makeAdminDto());

// Register and get token (investor — attaches NIF document automatically)
const { accessToken, user } = await registerInvestor(server, makeCompanyInvestorDto());

// Verify an investor (requires admin token)
await verifyInvestor(server, adminToken, investor.user.id);

// Login with existing credentials
const { accessToken } = await loginUser(server, email, password);

// Set auth header on request
request(server).get(`${API}/resource`).set(authHeader(token));
```

## Fixtures

From [test/fixtures/users.fixture.ts](../../../test/fixtures/users.fixture.ts) and [test/fixtures/entities.fixture.ts](../../../test/fixtures/entities.fixture.ts):

```typescript
makeAdminDto(overrides?)           // Unique email each call
makeCompanyInvestorDto(overrides?) // InvestorType.COMPANY
makeIndividualInvestorDto(overrides?) // InvestorType.INDIVIDUAL
makeDebtorDto(overrides?)          // Unique email + valid CIF
makeInvoiceDto(debtorId, overrides?)
makeAuctionDto(invoiceSvc, overrides?)
makeBidDto(auctionId, amount)
```

All fixture functions generate unique values on each call — safe to call multiple times within a test file.

## File Upload Requests

```typescript
const res = await request(server)
  .post(`${API}/resource`)
  .set(authHeader(token))
  .attach('file', path.join(__dirname, '../../sample_files/nif.jpg'));

// Multipart with fields + file
const res = await request(server)
  .post(`${API}/resource`)
  .set(authHeader(token))
  .field('name', 'Test')
  .field('email', 'test@example.com')
  .attach('document', path.join(__dirname, '../../sample_files/nif.jpg'));
```

Available sample files: `test/sample_files/` (check directory for current files)

## Paginated Endpoint Assertions

```typescript
const res = await request(server)
  .get(`${API}/resource`)
  .set(authHeader(token));

expect(res.status).toBe(200);
expect(Array.isArray(res.body.data)).toBe(true);
expect(res.body._metadata).toBeDefined();
expect(res.body._metadata.total).toBeGreaterThanOrEqual(0);
```

## Standard Test Coverage Checklist

For each endpoint, cover:
- [ ] Happy path (correct role, valid data) → expected 2xx
- [ ] Missing required fields → 400
- [ ] Invalid field values → 400
- [ ] Unauthenticated → 401
- [ ] Wrong role → 403
- [ ] Resource not found (for `:id` routes) → 404
- [ ] Business rule violations (duplicates, state transitions) → 400 or 409

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Tests run in parallel | E2E must use `--runInBand` (already configured in [jest-e2e.json](../../../test/jest-e2e.json)) |
| `app.close()` missing in `afterAll` | Causes open handle warnings; always close app |
| Token from one test used in another `describe` | Declare tokens in outer scope, assign in `beforeAll` |
| Assuming DB state from previous tests | Tests share DB state — order matters with `--runInBand` |
| Not calling `verifyInvestor` | Investors start as PENDING — many endpoints require VERIFIED status |

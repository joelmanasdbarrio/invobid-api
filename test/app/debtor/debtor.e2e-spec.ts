import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeDebtorDto } from '../../fixtures/entities.fixture';
import {
  makeAdminDto,
  makeCompanyInvestorDto,
  makeIndividualInvestorDto,
} from '../../fixtures/users.fixture';
import {
  authHeader,
  registerAdmin,
  registerInvestor,
  verifyInvestor,
} from '../../helpers/auth.helper';
import { cleanDatabase } from '../../helpers/db.helper';
import { createTestApp } from '../../helpers/test-app.helper';

const API = '/api/v1';

describe('Debtor (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let companyToken: string;
  let companyId: string;
  let individualToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const company = await registerInvestor(server, makeCompanyInvestorDto());
    companyToken = company.accessToken;
    companyId = company.user.id;
    await verifyInvestor(server, adminToken, companyId);

    const individual = await registerInvestor(
      server,
      makeIndividualInvestorDto(),
    );
    individualToken = individual.accessToken;
    await verifyInvestor(server, adminToken, individual.user.id);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // POST /debtors
  describe('POST /debtors', () => {
    it('should create a debtor and return 201', async () => {
      const dto = makeDebtorDto();
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.email).toBe(dto.email);
      expect(res.body.data.companyName).toBe(dto.companyName);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid field values', async () => {
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send({
          email: 'not-email',
          phoneNumber: '123',
          companyName: 'X',
          taxId: 'bad',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for duplicate debtor fields', async () => {
      const dto = makeDebtorDto();
      await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(400);
    });

    it('should return 403 for individual investor', async () => {
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(individualToken))
        .send(makeDebtorDto());

      expect(res.status).toBe(403);
    });

    it('should return 403 for admin', async () => {
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(adminToken))
        .send(makeDebtorDto());

      expect(res.status).toBe(403);
    });
  });

  // GET /debtors
  describe('GET /debtors', () => {
    it('should return 200 with debtor list for admin', async () => {
      const res = await request(server)
        .get(`${API}/debtors`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body._metadata).toBeDefined();
    });

    it('should return 200 with debtor list for verified company investor', async () => {
      const res = await request(server)
        .get(`${API}/debtors`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 with debtor list for verified individual investor', async () => {
      const res = await request(server)
        .get(`${API}/debtors`)
        .set(authHeader(individualToken));

      expect(res.status).toBe(200);
    });

    it('should filter debtors by query params', async () => {
      const res = await request(server)
        .get(`${API}/debtors?companyName=NonExistent`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 400 for wrong type filter values', async () => {
      const res = await request(server)
        .get(`${API}/debtors?status=INVALID_STATUS`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 200 with empty list for investor when no debtors match', async () => {
      const fresh = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, fresh.user.id);

      const res = await request(server)
        .get(`${API}/debtors?companyName=ZZZNonExistent999`)
        .set('Authorization', `Bearer ${fresh.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 200 with empty list for admin when no debtors match', async () => {
      const res = await request(server)
        .get(`${API}/debtors?email=zzznotexist@nowhere.com`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should ignore params not in GetDebtorsDto (admin)', async () => {
      const res = await request(server)
        .get(`${API}/debtors?nonExistentParam=foo`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include soft deleted debtors when admin uses includeDeleted=1', async () => {
      // Create and delete a debtor
      const dto = makeDebtorDto();
      const created = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);
      await request(server)
        .delete(`${API}/debtors/${created.body.data.id}`)
        .set(authHeader(companyToken));

      const res = await request(server)
        .get(`${API}/debtors?includeDeleted=1`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const deleted = res.body.data.find((d: any) => d.deletedAt !== null);
      expect(deleted).toBeDefined();
    });
  });

  // GET /debtors/:id
  describe('GET /debtors/:id', () => {
    let debtorId: string;

    beforeAll(async () => {
      const dto = makeDebtorDto();
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);
      debtorId = res.body.data.id;
    });

    it('should return 200 for admin', async () => {
      const res = await request(server)
        .get(`${API}/debtors/${debtorId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(debtorId);
    });

    it('should return 200 for owner investor', async () => {
      const res = await request(server)
        .get(`${API}/debtors/${debtorId}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(debtorId);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .get(`${API}/debtors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should return 500 for malformed ID (no ParseUUIDPipe)', async () => {
      const res = await request(server)
        .get(`${API}/debtors/not-a-uuid`)
        .set(authHeader(adminToken));

      // Debtor controller has no ParseUUIDPipe; DB rejects non-UUID → 500
      expect(res.status).toBe(500);
    });
  });

  // PATCH /debtors/:id
  describe('PATCH /debtors/:id', () => {
    let debtorId: string;

    beforeAll(async () => {
      const dto = makeDebtorDto();
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);
      debtorId = res.body.data.id;
    });

    it('should update debtor and return 200 for owner', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(companyToken))
        .send({
          email: `updated-debtor-${Date.now()}@test.com`,
          status: 'pending',
        });

      expect(res.status).toBe(200);
    });

    it('should allow admin to update debtor status', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ email: 'hack@test.com' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent debtor', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for duplicate email', async () => {
      const dto2 = makeDebtorDto();
      const res2 = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto2);
      const debtorId2 = res2.body.data.id;

      // Get first debtor's email
      const firstDebtor = await request(server)
        .get(`${API}/debtors/${debtorId}`)
        .set(authHeader(adminToken));

      const res = await request(server)
        .patch(`${API}/debtors/${debtorId2}`)
        .set(authHeader(companyToken))
        .send({ email: firstDebtor.body.data.email, status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for individual investor', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(individualToken))
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(403);
    });

    it('should return 500 for malformed ID (investor, no ParseUUIDPipe)', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/not-a-uuid`)
        .set(authHeader(companyToken))
        .send({ email: 'x@test.com' });

      expect(res.status).toBe(500);
    });

    it('should return 500 for malformed ID (admin, no ParseUUIDPipe)', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/not-a-uuid`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(500);
    });

    it('should return 400 for invalid field values (investor)', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(companyToken))
        .send({ phoneNumber: 12345, status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid field values (admin)', async () => {
      const res = await request(server)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(adminToken))
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });
  });

  // DELETE /debtors/:id
  describe('DELETE /debtors/:id', () => {
    it('should soft delete own debtor and return 200', async () => {
      const dto = makeDebtorDto();
      const created = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .delete(`${API}/debtors/${created.body.data.id}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner investor trying to delete', async () => {
      // Create debtor and verify it so other investors can see it
      const dto = makeDebtorDto();
      const created = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      // Admin verifies the debtor so it's visible to other investors
      await request(server)
        .patch(`${API}/debtors/${created.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .delete(`${API}/debtors/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent debtor', async () => {
      const res = await request(server)
        .delete(`${API}/debtors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(404);
    });

    it('should return 403 for individual investor', async () => {
      const dto = makeDebtorDto();
      const created = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .delete(`${API}/debtors/${created.body.data.id}`)
        .set(authHeader(individualToken));

      expect(res.status).toBe(403);
    });

    it('should return 500 for malformed ID (no ParseUUIDPipe)', async () => {
      const res = await request(server)
        .delete(`${API}/debtors/not-a-uuid`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(500);
    });
  });
});

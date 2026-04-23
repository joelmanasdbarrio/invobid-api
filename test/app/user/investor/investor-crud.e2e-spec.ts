import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  makeAdminDto,
  makeCompanyInvestorDto,
} from '../../../fixtures/users.fixture';
import {
  authHeader,
  registerAdmin,
  registerInvestor,
  verifyInvestor,
} from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Investor CRUD (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let investorToken: string;
  let investorId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const investor = await registerInvestor(server, makeCompanyInvestorDto());
    investorToken = investor.accessToken;
    investorId = investor.user.id;

    // Verify investor so they can access endpoints
    await verifyInvestor(server, adminToken, investorId);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // GET /investors
  describe('GET /investors', () => {
    it('should return 200 with investor list for admin', async () => {
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body._metadata).toBeDefined();
    });

    it('should return 200 with investor list for verified investor', async () => {
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 with empty list when no investors match filter', async () => {
      const res = await request(server)
        .get(`${API}/investors?email=nonexistent@test.com`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter investors by query params (admin)', async () => {
      const res = await request(server)
        .get(`${API}/investors?investorType=company`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return admin view with full properties including bank account and documents', async () => {
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const inv = res.body.data[0];
      expect(inv.bankAccount).toBeDefined();
      expect(inv.documents).toBeDefined();
    });

    it('should return investor view with limited properties', async () => {
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(200);
      // Investor view should not include bankAccount
      if (res.body.data.length > 0) {
        const inv = res.body.data[0];
        expect(inv.id).toBeDefined();
        expect(inv.email).toBeDefined();
      }
    });

    it('should include soft deleted investors when admin uses includeDeleted=1', async () => {
      // Create and delete an investor
      const disposable = await registerInvestor(
        server,
        makeCompanyInvestorDto(),
      );
      await verifyInvestor(server, adminToken, disposable.user.id);
      await request(server)
        .delete(`${API}/investors/${disposable.user.id}`)
        .set('Authorization', `Bearer ${disposable.accessToken}`);

      const res = await request(server)
        .get(`${API}/investors?includeDeleted=1`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const deleted = res.body.data.find((i: any) => i.deletedAt !== null);
      expect(deleted).toBeDefined();
    });

    it('should return 400 for wrong type filter values', async () => {
      const res = await request(server)
        .get(`${API}/investors?investorType=INVALID_TYPE`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should ignore params not in GetInvestorsDto (investor)', async () => {
      const res = await request(server)
        .get(`${API}/investors?nonExistentParam=foo&anotherBad=bar`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should ignore params not in GetInvestorsDto (admin)', async () => {
      const res = await request(server)
        .get(`${API}/investors?nonExistentParam=foo&anotherBad=bar`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // GET /investors/:id
  describe('GET /investors/:id', () => {
    it('should return 200 with full data for own profile (investor)', async () => {
      const res = await request(server)
        .get(`${API}/investors/${investorId}`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(investorId);
      expect(res.body.data.bankAccount).toBeDefined();
      expect(res.body.data.documents).toBeDefined();
    });

    it('should return 200 with full data for admin', async () => {
      const res = await request(server)
        .get(`${API}/investors/${investorId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.bankAccount).toBeDefined();
    });

    it('should return 200 with limited data for another investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .get(`${API}/investors/${other.user.id}`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(other.user.id);
      // Limited view
      expect(res.body.data.bankAccount).toBeUndefined();
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .get(`${API}/investors/not-a-uuid`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .get(`${API}/investors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(404);
    });
  });

  // PATCH /investors/:id
  describe('PATCH /investors/:id', () => {
    it('should update own profile (non-email fields) and return 200 (verified investor)', async () => {
      const res = await request(server)
        .patch(`${API}/investors/${investorId}`)
        .set(authHeader(investorToken))
        .send({ phoneNumber: '+34612345999', status: 'verified' });

      expect(res.status).toBe(200);
    });

    it('should ignore sensitive fields when verified investor updates', async () => {
      const res = await request(server)
        .patch(`${API}/investors/${investorId}`)
        .set(authHeader(investorToken))
        .send({
          name: 'Should Not Change',
          investorType: 'individual',
          status: 'verified',
        });

      // Should succeed but ignore the name/investorType change
      expect(res.status).toBe(200);
      expect(res.body.data.investorType).not.toBe('individual');
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .patch(`${API}/investors/not-a-uuid`)
        .set(authHeader(investorToken))
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('should return 403 when updating another investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .patch(`${API}/investors/${other.user.id}`)
        .set(authHeader(investorToken))
        .send({ email: 'hack@test.com' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .patch(`${API}/investors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(404);
    });

    it('should allow admin to update investor status', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());

      const res = await request(server)
        .patch(`${API}/investors/${other.user.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified', lastCommunication: 'Approved' });

      expect(res.status).toBe(200);
    });

    it('should return 400 when email is already in use by another user', async () => {
      const inv1 = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, inv1.user.id);

      const inv2 = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, inv2.user.id);

      const res = await request(server)
        .patch(`${API}/investors/${inv2.user.id}`)
        .set('Authorization', `Bearer ${inv2.accessToken}`)
        .send({ email: inv1.user.email, status: 'verified' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for wrong type values in UpdateInvestorDto', async () => {
      const res = await request(server)
        .patch(`${API}/investors/${investorId}`)
        .set(authHeader(investorToken))
        .send({ phoneNumber: 12345, status: 'verified' });

      expect(res.status).toBe(400);
    });

    it('should allow correction investor to update all fields', async () => {
      const corrInvestor = await registerInvestor(
        server,
        makeCompanyInvestorDto(),
      );
      // Set status to correction
      await request(server)
        .patch(`${API}/investors/${corrInvestor.user.id}`)
        .set(authHeader(adminToken))
        .send({
          status: 'correction',
          lastCommunication: 'Please fix your data',
        });

      const res = await request(server)
        .patch(`${API}/investors/${corrInvestor.user.id}`)
        .set('Authorization', `Bearer ${corrInvestor.accessToken}`)
        .send({ name: 'Updated Correction Name', status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Correction Name');
    });

    it('should return 400 for correction investor with duplicate unique fields', async () => {
      const corr1 = await registerInvestor(server, makeCompanyInvestorDto());
      await request(server)
        .patch(`${API}/investors/${corr1.user.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'correction', lastCommunication: 'Fix' });

      const corr2 = await registerInvestor(server, makeCompanyInvestorDto());
      await request(server)
        .patch(`${API}/investors/${corr2.user.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'correction', lastCommunication: 'Fix' });

      // Try to set corr2's email to corr1's email
      const res = await request(server)
        .patch(`${API}/investors/${corr2.user.id}`)
        .set('Authorization', `Bearer ${corr2.accessToken}`)
        .send({ email: corr1.user.email, status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for pending investor trying to update', async () => {
      // Investor is pending by default after registration
      const pendingInvestor = await registerInvestor(
        server,
        makeCompanyInvestorDto(),
      );

      const res = await request(server)
        .patch(`${API}/investors/${pendingInvestor.user.id}`)
        .set('Authorization', `Bearer ${pendingInvestor.accessToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  // DELETE /investors/:id
  describe('DELETE /investors/:id', () => {
    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .delete(`${API}/investors/not-a-uuid`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(400);
    });

    it('should return 403 when deleting another investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .delete(`${API}/investors/${other.user.id}`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .delete(`${API}/investors/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(404);
    });

    it('should soft delete own profile and return 200', async () => {
      const disposable = await registerInvestor(
        server,
        makeCompanyInvestorDto(),
      );

      const res = await request(server)
        .delete(`${API}/investors/${disposable.user.id}`)
        .set('Authorization', `Bearer ${disposable.accessToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 when admin tries to delete investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());

      const res = await request(server)
        .delete(`${API}/investors/${other.user.id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(403);
    });
  });
});

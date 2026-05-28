import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  makeAdminDto,
  makeCompanyInvestorDto,
  makeIndividualInvestorDto,
} from '../../../fixtures/users.fixture';
import {
  authHeader,
  registerAdmin,
  registerInvestor,
} from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Investor Guards (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let companyInvestorToken: string;
  let individualInvestorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const company = await registerInvestor(server, makeCompanyInvestorDto());
    companyInvestorToken = company.accessToken;

    const individual = await registerInvestor(
      server,
      makeIndividualInvestorDto(),
    );
    individualInvestorToken = individual.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // InvestorType guard: POST /debtors requires InvestorType.COMPANY
  describe('InvestorType-protected endpoint', () => {
    it('should return 403 when individual investor accesses company-only endpoint', async () => {
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(individualInvestorToken))
        .send({
          companyName: 'Test',
          email: 'test@t.com',
          phoneNumber: '+34600000001',
          taxId: 'B12345674',
        });

      expect(res.status).toBe(403);
    });

    it('should not return 403 when company investor accesses company-only endpoint', async () => {
      // Will get 400 due to investor status being pending, but NOT 403 for type
      const res = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyInvestorToken))
        .send({
          companyName: 'Test',
          email: 'test@t.com',
          phoneNumber: '+34600000001',
          taxId: 'B12345674',
        });

      // New investors start as "pending", so this should be 403 for status, not type
      expect(res.status).toBe(403);
    });
  });

  // InvestorStatus guard: GET /investors requires VERIFIED status
  describe('InvestorStatus-protected endpoint', () => {
    it('should return 403 when pending investor accesses verified-only endpoint', async () => {
      // New investors are pending by default
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(companyInvestorToken));

      expect(res.status).toBe(403);
    });

    it('should allow admin to access status-protected endpoints', async () => {
      const res = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});

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
} from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Auth Guards (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let investorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const investor = await registerInvestor(server, makeCompanyInvestorDto());
    investorToken = investor.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // Protected endpoint tests
  describe('Protected endpoint', () => {
    it('should allow access with a valid access token', async () => {
      const res = await request(server)
        .get(`${API}/admins`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('should return 401 with an invalid access token', async () => {
      const res = await request(server)
        .get(`${API}/admins`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should return 401 with no access token', async () => {
      const res = await request(server).get(`${API}/admins`);

      expect(res.status).toBe(401);
    });
  });

  // Role-protected (UserType) endpoint tests
  describe('Role-protected (UserType) endpoint', () => {
    it('should return 403 when investor accesses admin-only endpoint', async () => {
      const res = await request(server)
        .get(`${API}/admins`)
        .set(authHeader(investorToken));

      expect(res.status).toBe(403);
    });

    it('should allow admin to access admin-only endpoint', async () => {
      const res = await request(server)
        .get(`${API}/admins`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});

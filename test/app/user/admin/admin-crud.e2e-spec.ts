import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeAdminDto } from '../../../fixtures/users.fixture';
import { authHeader, registerAdmin } from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Admin CRUD (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;
    adminId = admin.user.id;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // GET /admins
  describe('GET /admins', () => {
    it('should return 200 with list of admins', async () => {
      const res = await request(server)
        .get(`${API}/admins`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /admins/:id
  describe('GET /admins/:id', () => {
    it('should return 200 with admin info for valid ID', async () => {
      const res = await request(server)
        .get(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(adminId);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .get(`${API}/admins/not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .get(`${API}/admins/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });
  });

  // PATCH /admins/:id
  describe('PATCH /admins/:id', () => {
    it('should update own profile and return 200', async () => {
      const res = await request(server)
        .patch(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Admin Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Admin Name');

      const getRes = await request(server)
        .get(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken));
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe('Updated Admin Name');
    });

    it('should return 400 when password and passwordRepeat do not match', async () => {
      const res = await request(server)
        .patch(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken))
        .send({ password: 'NewPass1!', passwordRepeat: 'Different1!' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when email is already in use by another user', async () => {
      const otherAdmin = await registerAdmin(server, makeAdminDto());
      const res = await request(server)
        .patch(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken))
        .send({ email: otherAdmin.user.email });

      expect(res.status).toBe(400);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .patch(`${API}/admins/not-a-uuid`)
        .set(authHeader(adminToken))
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid field types', async () => {
      const res = await request(server)
        .patch(`${API}/admins/${adminId}`)
        .set(authHeader(adminToken))
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should return 403 when updating another admin', async () => {
      const otherAdmin = await registerAdmin(server, makeAdminDto());
      const res = await request(server)
        .patch(`${API}/admins/${otherAdmin.user.id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent admin ID', async () => {
      const res = await request(server)
        .patch(`${API}/admins/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken))
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // DELETE /admins/:id
  describe('DELETE /admins/:id', () => {
    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .delete(`${API}/admins/not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 403 when deleting another admin', async () => {
      const otherAdmin = await registerAdmin(server, makeAdminDto());
      const res = await request(server)
        .delete(`${API}/admins/${otherAdmin.user.id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent admin ID', async () => {
      const res = await request(server)
        .delete(`${API}/admins/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should soft delete own profile and return 200', async () => {
      // Create a disposable admin to delete
      const disposable = await registerAdmin(server, makeAdminDto());
      const res = await request(server)
        .delete(`${API}/admins/${disposable.user.id}`)
        .set('Authorization', `Bearer ${disposable.accessToken}`);

      expect(res.status).toBe(200);
    });
  });
});

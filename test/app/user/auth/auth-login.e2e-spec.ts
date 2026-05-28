import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeAdminDto } from '../../../fixtures/users.fixture';
import { loginUser, registerAdmin } from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Auth Login (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;

  const adminDto = makeAdminDto();
  const password = adminDto.password;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    // Register an admin to test login against
    await registerAdmin(server, adminDto);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // INTEGRATION_TESTS.md: "Call POST `/auth/login` endpoint"

  it('should login with valid email and password and return 200 with access token (1d expiry)', async () => {
    const { response } = await loginUser(server, adminDto.email, password);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.access_token).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe(adminDto.email.toLowerCase());

    // Verify cookie is set
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('access_token');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('should login with rememberMe and return 200 with access token (30d expiry)', async () => {
    const { response } = await loginUser(server, adminDto.email, password, {
      rememberMe: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.access_token).toBeDefined();
    expect(response.body.data).toBeDefined();

    // Verify cookie has 30-day maxAge
    const cookies = response.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('access_token');
    // 30 days in seconds = 2592000
    expect(cookieStr).toContain('Max-Age=2592000');
  });

  it('should return 401 when login with incorrect email', async () => {
    const res = await request(server).post(`${API}/auth/login`).send({
      email: 'nonexistent@invobid.com',
      password,
    });

    expect(res.status).toBe(401);
  });

  it('should return 401 when login with incorrect password', async () => {
    const res = await request(server).post(`${API}/auth/login`).send({
      email: adminDto.email,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
  });

  it('should return 400 when login with missing email', async () => {
    const res = await request(server).post(`${API}/auth/login`).send({
      password,
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when login with missing password', async () => {
    const res = await request(server).post(`${API}/auth/login`).send({
      email: adminDto.email,
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when login with missing email and password', async () => {
    const res = await request(server).post(`${API}/auth/login`).send({});

    expect(res.status).toBe(400);
  });

  describe('soft-deleted account', () => {
    let deletedAdminDto: ReturnType<typeof makeAdminDto>;
    let deletedToken: string;

    beforeAll(async () => {
      // Register and then soft-delete an admin
      deletedAdminDto = makeAdminDto();
      const { accessToken, user } = await registerAdmin(
        server,
        deletedAdminDto,
      );
      deletedToken = accessToken;

      // Soft-delete via the DELETE endpoint
      await request(server)
        .delete(`${API}/admins/${user.id}`)
        .set('Authorization', `Bearer ${deletedToken}`);
    });

    it('should return 423 when login with soft-deleted account', async () => {
      const res = await request(server).post(`${API}/auth/login`).send({
        email: deletedAdminDto.email,
        password: deletedAdminDto.password,
      });

      expect(res.status).toBe(423);
    });

    it('should reactivate account with x-activate-account header and return 200', async () => {
      const { response } = await loginUser(
        server,
        deletedAdminDto.email,
        deletedAdminDto.password,
        { activateAccount: true },
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.access_token).toBeDefined();
      expect(response.body.data).toBeDefined();
    });
  });
});

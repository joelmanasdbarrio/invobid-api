import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeAdminDto } from '../../../fixtures/users.fixture';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';

describe('Admin Register (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  it('should register a new admin with valid data and return 201 with access token', async () => {
    const dto = makeAdminDto();
    const res = await request(server)
      .post(`${API}/auth/register/admin`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe(dto.email.toLowerCase());
    expect(res.body.data.name).toBe(dto.name.trim());
    // Should not return password
    expect(res.body.data.password).toBeUndefined();
  });

  it('should ignore extra fields not in CreateAdminDto', async () => {
    const dto = makeAdminDto();
    const res = await request(server)
      .post(`${API}/auth/register/admin`)
      .send({ ...dto, extraField: 'should-be-ignored', type: 'investor' });

    expect(res.status).toBe(201);
    expect(res.body.data.extraField).toBeUndefined();
  });

  it('should return 400 when registering with an email already in use', async () => {
    const dto = makeAdminDto();
    // Register first
    await request(server).post(`${API}/auth/register/admin`).send(dto);
    // Try again with same email
    const dto2 = makeAdminDto({ email: dto.email });
    const res = await request(server)
      .post(`${API}/auth/register/admin`)
      .send(dto2);

    expect(res.status).toBe(400);
  });

  it('should return 400 when password and passwordRepeat do not match', async () => {
    const dto = makeAdminDto({
      password: 'Password1!',
      passwordRepeat: 'Different1!',
    });
    const res = await request(server)
      .post(`${API}/auth/register/admin`)
      .send(dto);

    expect(res.status).toBe(400);
  });

  it('should return 400 when required fields have invalid values', async () => {
    const res = await request(server).post(`${API}/auth/register/admin`).send({
      email: 'not-an-email',
      password: '12', // too short
      passwordRepeat: '12',
      name: 'a', // too short
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(server)
      .post(`${API}/auth/register/admin`)
      .send({});

    expect(res.status).toBe(400);
  });
});

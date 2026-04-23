import { INestApplication } from '@nestjs/common';
import path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  makeCompanyInvestorDto,
  makeIndividualInvestorDto,
} from '../../../fixtures/users.fixture';
import { registerInvestor } from '../../../helpers/auth.helper';
import { cleanDatabase } from '../../../helpers/db.helper';
import { createTestApp } from '../../../helpers/test-app.helper';

const API = '/api/v1';
const SAMPLE_FILES = path.join(__dirname, '..', '..', '..', 'sample_files');

describe('Investor Register (e2e)', () => {
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

  it('should register a company investor with valid data and return 201', async () => {
    const dto = makeCompanyInvestorDto();
    const { response } = await registerInvestor(server, dto);

    expect(response.status).toBe(201);
    expect(response.body.access_token).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe(dto.email.toLowerCase());
    expect(response.body.data.password).toBeUndefined();
  });

  it('should register an individual investor with valid data and return 201', async () => {
    const dto = makeIndividualInvestorDto();
    const { response } = await registerInvestor(server, dto);

    expect(response.status).toBe(201);
    expect(response.body.access_token).toBeDefined();
    expect(response.body.data).toBeDefined();
  });

  it('should return 400 when missing required fields', async () => {
    const res = await request(server)
      .post(`${API}/auth/register/investor`)
      .field('name', 'Test')
      .attach('document', path.join(SAMPLE_FILES, 'nif.jpg'));

    expect(res.status).toBe(400);
  });

  it('should return 400 when email is already registered', async () => {
    const dto1 = makeCompanyInvestorDto();
    await registerInvestor(server, dto1);

    const dto2 = makeCompanyInvestorDto({ email: dto1.email });
    const { response } = await registerInvestor(server, dto2);

    expect(response.status).toBe(400);
  });

  it('should return 400 when password and passwordRepeat do not match', async () => {
    const dto = makeCompanyInvestorDto({
      password: 'Password1!',
      passwordRepeat: 'Different1!',
    });
    const { response } = await registerInvestor(server, dto);

    expect(response.status).toBe(400);
  });

  it('should return 400 when registration has invalid field values', async () => {
    const dto = makeCompanyInvestorDto({
      email: 'not-an-email',
      phoneNumber: '123', // invalid ES phone
      taxId: 'INVALID',
    });
    const { response } = await registerInvestor(server, dto);

    expect(response.status).toBe(400);
  });

  it('should return 400 when no document file is attached', async () => {
    const dto = makeCompanyInvestorDto();
    const req = request(server).post(`${API}/auth/register/investor`);
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) req.field(key, String(value));
    }
    const res = await req;

    expect(res.status).toBe(400);
  });

  it('should return 400 when document file has invalid type', async () => {
    const dto = makeCompanyInvestorDto();
    const req = request(server).post(`${API}/auth/register/investor`);
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) req.field(key, String(value));
    }
    // Use a non-image file - create a buffer with .exe extension
    req.attach('document', Buffer.from('fake'), {
      filename: 'malware.exe',
      contentType: 'application/octet-stream',
    });
    const res = await req;

    expect(res.status).toBe(400);
  });
});

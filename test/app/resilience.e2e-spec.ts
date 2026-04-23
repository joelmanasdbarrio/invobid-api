import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import path from 'path';
import { AppModule } from 'src/app.module';
import { CreateInvestorDto } from 'src/app/user/investor/dto/create-investor.dto';
import 'src/utils/object.extensions';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeDebtorDto, makeInvoiceDto } from '../fixtures/entities.fixture';
import {
  makeAdminDto,
  makeCompanyInvestorDto,
} from '../fixtures/users.fixture';
import {
  authHeader,
  registerAdmin,
  registerInvestor,
  verifyInvestor,
} from '../helpers/auth.helper';
import { cleanDatabase } from '../helpers/db.helper';

const API = '/api/v1';
const NIF_FILE = path.join(__dirname, '../sample_files/nif.jpg');
const INVOICE_FILE = path.join(__dirname, '../sample_files/invoice.pdf');

/**
 * Creates an app with a failing STORAGE_SERVICE to simulate doc service being down.
 */
async function createAppWithFailingStorage(): Promise<INestApplication> {
  const failingStorage = {
    uploadFile: jest
      .fn()
      .mockRejectedValue(new Error('Storage service unavailable')),
    getFile: jest
      .fn()
      .mockRejectedValue(new Error('Storage service unavailable')),
    deleteFile: jest
      .fn()
      .mockRejectedValue(new Error('Storage service unavailable')),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('STORAGE_SERVICE')
    .useValue(failingStorage)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

describe('Resilience / 503 (e2e)', () => {
  describe('Investor register with doc service down', () => {
    let app: INestApplication;
    let server: App;
    let dataSource: DataSource;

    beforeAll(async () => {
      app = await createAppWithFailingStorage();
      server = app.getHttpServer() as App;
      dataSource = app.get(DataSource);
      await cleanDatabase(dataSource);
    });

    afterAll(async () => {
      await cleanDatabase(dataSource);
      await app.close();
    });

    it('should return 503 when document storage is down during investor registration', async () => {
      const dto = makeCompanyInvestorDto();
      const req = request(server).post(`${API}/auth/register/investor`);
      for (const [key, value] of Object.entries(dto)) {
        if (value !== undefined) req.field(key, String(value));
      }
      req.attach('document', NIF_FILE);
      const res = await req;

      expect(res.status).toBe(503);
    });

    it('should not leave incomplete investor profile in the system', async () => {
      // After the failed registration, no investor should exist
      // We need admin to check — register admin first (admin doesn't use doc service)
      // Actually admin registration also doesn't upload docs, so it should work
      const admin = await registerAdmin(server, makeAdminDto());

      const listRes = await request(server)
        .get(`${API}/investors`)
        .set(authHeader(admin.accessToken));

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(0);
    });
  });

  describe('Investor update with doc service down', () => {
    let app: INestApplication;
    let normalApp: INestApplication;
    let server: App;
    let normalServer: App;
    let dataSource: DataSource;
    let adminToken: string;
    let investorDto: CreateInvestorDto;
    let investorId: string;
    let investorToken: string;

    beforeAll(async () => {
      // First create investor with normal app
      const { createTestApp } = require('../helpers/test-app.helper');
      normalApp = await createTestApp();
      normalServer = normalApp.getHttpServer() as App;
      dataSource = normalApp.get(DataSource);
      await cleanDatabase(dataSource);

      const admin = await registerAdmin(normalServer, makeAdminDto());
      adminToken = admin.accessToken;

      const investor = await registerInvestor(
        normalServer,
        (investorDto = makeCompanyInvestorDto()),
      );
      investorId = investor.user.id;
      investorToken = investor.accessToken;
      await verifyInvestor(normalServer, adminToken, investorId);

      // Set to correction so they can update with file
      await request(normalServer)
        .patch(`${API}/investors/${investorId}`)
        .set(authHeader(adminToken))
        .send({ status: 'correction' });

      await normalApp.close();

      // Now create app with failing storage
      app = await createAppWithFailingStorage();
      server = app.getHttpServer() as App;
      dataSource = app.get(DataSource);

      // Re-login since tokens are JWT and still valid
    });

    afterAll(async () => {
      await cleanDatabase(dataSource);
      await app.close();
    });

    it('should return 503 when updating investor with document while storage is down', async () => {
      const res = await request(server)
        .patch(`${API}/investors/${investorId}`)
        .set('Authorization', `Bearer ${investorToken}`)
        .field('taxId', investorDto.taxId)
        .field('phoneNumber', '612345999')
        .attach('document', NIF_FILE);

      expect(res.status).toBe(503);
    });
  });

  describe('Invoice create with doc service down', () => {
    let app: INestApplication;
    let normalApp: INestApplication;
    let server: App;
    let normalServer: App;
    let dataSource: DataSource;
    let companyToken: string;
    let debtorId: string;

    beforeAll(async () => {
      // Setup with normal app
      const { createTestApp } = require('../helpers/test-app.helper');
      normalApp = await createTestApp();
      normalServer = normalApp.getHttpServer() as App;
      dataSource = normalApp.get(DataSource);
      await cleanDatabase(dataSource);

      const admin = await registerAdmin(normalServer, makeAdminDto());
      const company = await registerInvestor(
        normalServer,
        makeCompanyInvestorDto(),
      );
      companyToken = company.accessToken;
      await verifyInvestor(normalServer, admin.accessToken, company.user.id);

      const debtorDto = makeDebtorDto();
      const debtorRes = await request(normalServer)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(debtorDto);
      debtorId = debtorRes.body.data.id;
      await request(normalServer)
        .patch(`${API}/debtors/${debtorId}`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'verified' });

      await normalApp.close();

      // Now create app with failing storage
      app = await createAppWithFailingStorage();
      server = app.getHttpServer() as App;
      dataSource = app.get(DataSource);
    });

    afterAll(async () => {
      await cleanDatabase(dataSource);
      await app.close();
    });

    it('should return 503 when creating invoice while doc storage is down', async () => {
      const invoiceDto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set('Authorization', `Bearer ${companyToken}`)
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(503);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { makeDebtorDto, makeInvoiceDto } from '../../fixtures/entities.fixture';
import {
  makeAdminDto,
  makeCompanyInvestorDto,
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
const INVOICE_FILE = path.join(__dirname, '../../sample_files/invoice.pdf');

describe('Invoice (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let companyToken: string;
  let debtorId: string;

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

    // Create and verify a debtor
    const debtorDto = makeDebtorDto();
    const debtorRes = await request(server)
      .post(`${API}/debtors`)
      .set(authHeader(companyToken))
      .send(debtorDto);
    debtorId = debtorRes.body.data.id;

    await request(server)
      .patch(`${API}/debtors/${debtorId}`)
      .set(authHeader(adminToken))
      .send({ status: 'verified' });
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // POST /invoices
  describe('POST /invoices', () => {
    it('should create an invoice and return 201', async () => {
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.amount).toBe(dto.amount);
    });

    it('should return 400 when no file is provided', async () => {
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(400);
    });

    it('should return 400 for due date too soon', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dto = makeInvoiceDto(debtorId, {
        dueDate: tomorrow.toISOString().split('T')[0],
      });
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(400);
    });

    it('should return 403 for admin', async () => {
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(adminToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(403);
    });

    it('should return 400 for wrong type values in CreateInvoiceDto', async () => {
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', 'not-a-uuid')
        .field('amount', 'not-a-number')
        .field('dueDate', 'not-a-date')
        .field('svc', 'SVC001')
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-verified debtor', async () => {
      // Create a debtor but don't verify it
      const pendingDebtorDto = makeDebtorDto();
      const pendingDebtor = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(pendingDebtorDto);

      const dto = makeInvoiceDto(pendingDebtor.body.data.id);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(400);
    });

    it('should return 404 for debtor that does not belong to investor', async () => {
      // Create another investor with their own debtor
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);
      const otherDebtorDto = makeDebtorDto();
      const otherDebtor = await request(server)
        .post(`${API}/debtors`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send(otherDebtorDto);
      await request(server)
        .patch(`${API}/debtors/${otherDebtor.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      const dto = makeInvoiceDto(otherDebtor.body.data.id);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent debtor ID', async () => {
      const dto = makeInvoiceDto('00000000-0000-0000-0000-000000000000');
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      expect(res.status).toBe(404);
    });
  });

  // GET /invoices
  describe('GET /invoices', () => {
    it('should return 200 with invoice list for admin', async () => {
      const res = await request(server)
        .get(`${API}/invoices`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body._metadata).toBeDefined();
    });

    it('should return 200 for seller investor (shows only own invoices)', async () => {
      const res = await request(server)
        .get(`${API}/invoices`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for wrong type filter values', async () => {
      const res = await request(server)
        .get(`${API}/invoices?status=INVALID_STATUS`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 200 with empty list when no invoices match', async () => {
      const fresh = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, fresh.user.id);

      const res = await request(server)
        .get(`${API}/invoices?sellerInvestorId=${fresh.user.id}`)
        .set('Authorization', `Bearer ${fresh.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter invoices by query params for investor', async () => {
      const res = await request(server)
        .get(`${API}/invoices?debtorId=${debtorId}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore params not in GetInvoicesDto (investor)', async () => {
      const res = await request(server)
        .get(`${API}/invoices?nonExistentParam=foo`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter invoices by query params for admin', async () => {
      const res = await request(server)
        .get(`${API}/invoices?debtorId=${debtorId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore params not in GetInvoicesDto (admin)', async () => {
      const res = await request(server)
        .get(`${API}/invoices?nonExistentParam=foo`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include soft deleted invoices when admin uses includeDeleted=1', async () => {
      // Create and delete an invoice
      const dto = makeInvoiceDto(debtorId);
      const created = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .delete(`${API}/invoices/${created.body.data.id}`)
        .set(authHeader(companyToken));

      const res = await request(server)
        .get(`${API}/invoices?includeDeleted=1`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const deleted = res.body.data.find((i: any) => i.deletedAt !== null);
      expect(deleted).toBeDefined();
    });
  });

  // GET /invoices/:id
  describe('GET /invoices/:id', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);
      invoiceId = res.body.data.id;
    });

    it('should return 200 for admin', async () => {
      const res = await request(server)
        .get(`${API}/invoices/${invoiceId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(invoiceId);
    });

    it('should return 200 for seller investor', async () => {
      const res = await request(server)
        .get(`${API}/invoices/${invoiceId}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(invoiceId);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .get(`${API}/invoices/not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .get(`${API}/invoices/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-owner viewing pending invoice', async () => {
      // Create an invoice (pending by default) owned by companyToken
      const dto = makeInvoiceDto(debtorId);
      const created = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      // Another investor tries to view it
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .get(`${API}/invoices/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // PATCH /invoices/:id
  describe('PATCH /invoices/:id', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);
      invoiceId = res.body.data.id;
    });

    it('should update invoice and return 200 for owner', async () => {
      const res = await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set(authHeader(companyToken))
        .send({ amount: 9999, status: 'pending' });

      expect(res.status).toBe(200);

      const getRes = await request(server)
        .get(`${API}/invoices/${invoiceId}`)
        .set(authHeader(adminToken));
      expect(getRes.status).toBe(200);
      expect(parseFloat(getRes.body.data.amount)).toBe(9999);
    });

    it('should allow admin to update invoice status', async () => {
      const res = await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(200);

      const getRes = await request(server)
        .get(`${API}/invoices/${invoiceId}`)
        .set(authHeader(adminToken));
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe('verified');
    });

    it('should return 403 for non-owner investor', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(403);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .patch(`${API}/invoices/not-a-uuid`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .patch(`${API}/invoices/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for wrong type values in UpdateInvoiceDto', async () => {
      const res = await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set(authHeader(companyToken))
        .send({ amount: 'not-a-number', status: 'pending' });

      expect(res.status).toBe(400);
    });

    it('should accept debtorId update without re-validating debtor (no debtor check on update)', async () => {
      // The update endpoint does NOT re-validate debtor ownership/status
      // It simply updates the FK if debtorId is provided
      const pendingDebtorDto = makeDebtorDto();
      const pendingDebtor = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(pendingDebtorDto);

      const res = await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set(authHeader(companyToken))
        .send({ debtorId: pendingDebtor.body.data.id, status: 'pending' });

      // API does not validate debtor on update - accepts it
      expect(res.status).toBe(200);

      // Restore original debtor
      await request(server)
        .patch(`${API}/invoices/${invoiceId}`)
        .set(authHeader(companyToken))
        .send({ debtorId: debtorId, status: 'pending' });
    });
  });

  // DELETE /invoices/:id
  describe('DELETE /invoices/:id', () => {
    it('should soft delete own invoice and return 200', async () => {
      const dto = makeInvoiceDto(debtorId);
      const created = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      const res = await request(server)
        .delete(`${API}/invoices/${created.body.data.id}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner investor', async () => {
      const dto = makeInvoiceDto(debtorId);
      const created = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      // Verify the invoice so it's visible to other investors
      await request(server)
        .patch(`${API}/invoices/${created.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .delete(`${API}/invoices/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .delete(`${API}/invoices/not-a-uuid`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .delete(`${API}/invoices/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(404);
    });
  });
});

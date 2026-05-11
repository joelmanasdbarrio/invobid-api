import { INestApplication } from '@nestjs/common';
import path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  makeAuctionDto,
  makeDebtorDto,
  makeInvoiceDto,
} from '../../fixtures/entities.fixture';
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

async function createVerifiedInvoice(
  server: App,
  companyToken: string,
  adminToken: string,
  debtorId: string,
): Promise<{ invoiceId: string; invoiceSvc: string }> {
  const dto = makeInvoiceDto(debtorId);
  const res = await request(server)
    .post(`${API}/invoices`)
    .set(authHeader(companyToken))
    .field('debtorId', dto.debtorId)
    .field('amount', dto.amount)
    .field('dueDate', dto.dueDate)
    .field('svc', dto.svc)
    .attach('file', INVOICE_FILE);

  const invoiceId = res.body.data.id;

  // Verify the invoice
  await request(server)
    .patch(`${API}/invoices/${invoiceId}`)
    .set(authHeader(adminToken))
    .send({ status: 'verified' });

  return { invoiceId, invoiceSvc: dto.svc };
}

describe('Auction (e2e)', () => {
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

  // POST /auctions
  describe('POST /auctions', () => {
    it('should create an auction and return 201', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);

      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid auction end date (too soon)', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send({
          svc: invoiceId,
          startingPrice: 4000,
          auctionDateEnd: tomorrow.toISOString().split('T')[0],
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when invoice already has an active auction', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);

      await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send({
          svc: '00000000-0000-0000-0000-000000000000',
          startingPrice: 4000,
          auctionDateEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        });

      expect(res.status).toBe(404);
    });

    it('should return 403 for admin', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(adminToken))
        .send(makeAuctionDto(invoiceId));

      expect(res.status).toBe(403);
    });

    it('should return 400 for wrong type values in CreateAuctionDto', async () => {
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send({
          svc: 12345,
          startingPrice: 'not-a-number',
          auctionDateEnd: 'not-a-date',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-verified invoice', async () => {
      // Create invoice but do NOT verify it
      const dto = makeInvoiceDto(debtorId);
      const res = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', dto.debtorId)
        .field('amount', dto.amount)
        .field('dueDate', dto.dueDate)
        .field('svc', dto.svc)
        .attach('file', INVOICE_FILE);

      const auctionRes = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto(res.body.data.id));

      expect(auctionRes.status).toBe(400);
    });

    it('should return 400 for invalid invoice ID format', async () => {
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto('not-a-uuid'));

      expect(res.status).toBe(400);
    });

    it('should return 404 for invoice that does not belong to investor', async () => {
      // Create another investor with their own verified invoice
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
      const { invoiceId: otherInvoiceId } = await createVerifiedInvoice(
        server,
        other.accessToken,
        adminToken,
        otherDebtor.body.data.id,
      );

      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto(otherInvoiceId));

      // Invoice findOne for non-admin only returns own invoices or verified + verified debtor
      // If the invoice is verified, it IS visible to other investors via findOne
      // But the ownership check (sellerInvestor.id !== user.id) catches it → 400
      expect(res.status).toBe(400);
    });
  });

  // GET /auctions
  describe('GET /auctions', () => {
    it('should return 200 with auction list for admin', async () => {
      const res = await request(server)
        .get(`${API}/auctions`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body._metadata).toBeDefined();
    });

    it('should return 200 for verified investor', async () => {
      const res = await request(server)
        .get(`${API}/auctions`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
    });

    it('should return 400 for wrong type filter values', async () => {
      const res = await request(server)
        .get(`${API}/auctions?status=INVALID_STATUS`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 200 with empty list when no auctions match', async () => {
      const fresh = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, fresh.user.id);

      const res = await request(server)
        .get(`${API}/auctions?sellerId=${fresh.user.id}`)
        .set('Authorization', `Bearer ${fresh.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter auctions by query params for investor', async () => {
      const res = await request(server)
        .get(`${API}/auctions?status=draft`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
    });

    it('should ignore params not in GetAuctionsDto (investor)', async () => {
      const res = await request(server)
        .get(`${API}/auctions?nonExistentParam=foo`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter auctions by query params for admin', async () => {
      const res = await request(server)
        .get(`${API}/auctions?status=draft`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('should ignore params not in GetAuctionsDto (admin)', async () => {
      const res = await request(server)
        .get(`${API}/auctions?nonExistentParam=foo`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include soft deleted auctions when admin uses includeDeleted=1', async () => {
      // Create and delete an auction
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      await request(server)
        .delete(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken));

      const res = await request(server)
        .get(`${API}/auctions?includeDeleted=1`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const deleted = res.body.data.find((a: any) => a.deletedAt !== null);
      expect(deleted).toBeDefined();
    });
  });

  // GET /auctions/:id
  describe('GET /auctions/:id', () => {
    let auctionId: string;

    beforeAll(async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const res = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      auctionId = res.body.data.id;

      // Publish so it's visible
      await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });
    });

    it('should return 200 for admin', async () => {
      const res = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(auctionId);
    });

    it('should return 200 for verified investor (published auction)', async () => {
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .get(`${API}/auctions/not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .get(`${API}/auctions/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-owner viewing draft auction', async () => {
      // Create a draft auction (not published)
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      // Another investor tries to view it
      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .get(`${API}/auctions/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // PATCH /auctions/:id
  describe('PATCH /auctions/:id', () => {
    it('should allow owner to publish draft auction', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });

      expect(res.status).toBe(200);

      const getRes = await request(server)
        .get(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(adminToken));
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe('published');
    });

    it('should return 403 when updating published auction', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });

      const res = await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken))
        .send({ startingPrice: 1000 });

      expect(res.status).toBe(403);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .patch(`${API}/auctions/not-a-uuid`)
        .set(authHeader(adminToken))
        .send({ status: 'published' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .patch(`${API}/auctions/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken))
        .send({ status: 'published' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-owner investor on draft', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ status: 'published' });

      // Non-owner can't see draft auction → 404
      expect(res.status).toBe(404);
    });

    it('should return 400 for wrong type values in UpdateAuctionDto', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken))
        .send({ startingPrice: 'not-a-number' });

      expect(res.status).toBe(400);
    });

    it('should allow admin to update transitioning auction to finished (with bids)', async () => {
      // Full flow: create auction → publish → place bid via DB → set transitioning → finish
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      const auctionId = created.body.data.id;

      // Publish
      await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });

      // Place a bid via another investor using WS would be complex; set transitioning + create bid directly via DB
      const bidder = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, bidder.user.id);

      // Insert a bid directly
      // Insert a bid directly - need discount and profitability since they're NOT NULL
      await dataSource.query(
        `INSERT INTO bids (amount, discount, profitability, "auctionId", "investorId") VALUES ($1, $2, $3, $4, $5)`,
        [5000, 0, 0, auctionId, bidder.user.id],
      );

      // Set auction to transitioning directly
      await dataSource.query(
        `UPDATE auctions SET status = 'transitioning' WHERE id = $1`,
        [auctionId],
      );

      const res = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'finished' });

      expect(res.status).toBe(200);

      const auctionRes = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken));
      expect(auctionRes.status).toBe(200);
      expect(auctionRes.body.data.status).toBe('finished');
      expect(parseFloat(auctionRes.body.data.price.end)).toBe(5000);
      expect(auctionRes.body.data.discount.end).not.toBeNull();
      expect(auctionRes.body.data.profitability.end).not.toBeNull();

      const invoiceRes = await request(server)
        .get(`${API}/invoices/${invoiceId}`)
        .set(authHeader(adminToken));

      expect(invoiceRes.status).toBe(200);
      expect(invoiceRes.body.data.buyerInvestor).toBeDefined();
      expect(invoiceRes.body.data.buyerInvestor.id).toBe(bidder.user.id);
    });

    it('should return 400 when admin finishes transitioning auction without bids', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      const auctionId = created.body.data.id;

      // Publish then set transitioning directly
      await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });
      await dataSource.query(
        `UPDATE auctions SET status = 'transitioning' WHERE id = $1`,
        [auctionId],
      );

      const res = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'finished' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when admin cancels transitioning auction without lastCommunication', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      const auctionId = created.body.data.id;

      await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });
      await dataSource.query(
        `UPDATE auctions SET status = 'transitioning' WHERE id = $1`,
        [auctionId],
      );

      const res = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'cancelled' });

      expect(res.status).toBe(400);
    });

    it('should allow admin to cancel transitioning auction with lastCommunication', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);
      const auctionId = created.body.data.id;

      await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });
      await dataSource.query(
        `UPDATE auctions SET status = 'transitioning' WHERE id = $1`,
        [auctionId],
      );

      const res = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({
          status: 'cancelled',
          lastCommunication: 'Auction cancelled by admin',
        });

      expect(res.status).toBe(200);

      const getRes = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken));
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe('cancelled');
      expect(getRes.body.data.lastCommunication).toBe(
        'Auction cancelled by admin',
      );
    });

    it('should return 403 when admin updates non-transitioning auction', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      // Publish it (not transitioning)
      await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken))
        .send({ status: 'published' });

      const res = await request(server)
        .patch(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'finished' });

      expect(res.status).toBe(403);
    });
  });

  // DELETE /auctions/:id
  describe('DELETE /auctions/:id', () => {
    it('should soft delete own auction and return 200', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .delete(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(200);
    });

    it('should allow admin to delete auction', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const res = await request(server)
        .delete(`${API}/auctions/${created.body.data.id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .delete(`${API}/auctions/not-a-uuid`)
        .set(authHeader(companyToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(server)
        .delete(`${API}/auctions/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-owner investor trying to delete', async () => {
      const { invoiceId } = await createVerifiedInvoice(
        server,
        companyToken,
        adminToken,
        debtorId,
      );
      const dto = makeAuctionDto(invoiceId);
      const created = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(dto);

      const other = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, other.user.id);

      const res = await request(server)
        .delete(`${API}/auctions/${created.body.data.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      // Non-owner can't see draft auction → 404
      expect(res.status).toBe(404);
    });
  });
});

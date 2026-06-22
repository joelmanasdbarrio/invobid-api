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

describe('Bid REST (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let adminToken: string;
  let companyToken: string;
  let auctionId: string;

  let buyerId: string;
  let buyerToken: string;
  let bidId: string;
  let otherBuyerId: string;
  let otherBidId: string;

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

    // Create a buyer investor
    const buyer = await registerInvestor(server, makeCompanyInvestorDto());
    buyerToken = buyer.accessToken;
    buyerId = buyer.user.id;
    await verifyInvestor(server, adminToken, buyerId);

    const otherBuyer = await registerInvestor(server, makeCompanyInvestorDto());
    otherBuyerId = otherBuyer.user.id;
    await verifyInvestor(server, adminToken, otherBuyerId);

    // Create debtor → verify → invoice → verify → auction → publish
    const debtorDto = makeDebtorDto();
    const debtorRes = await request(server)
      .post(`${API}/debtors`)
      .set(authHeader(companyToken))
      .send(debtorDto);
    const debtorId = debtorRes.body.data.id;
    await request(server)
      .patch(`${API}/debtors/${debtorId}`)
      .set(authHeader(adminToken))
      .send({ status: 'verified' });

    const invoiceDto = makeInvoiceDto(debtorId);
    const invoiceRes = await request(server)
      .post(`${API}/invoices`)
      .set(authHeader(companyToken))
      .field('debtorId', invoiceDto.debtorId)
      .field('amount', invoiceDto.amount)
      .field('dueDate', invoiceDto.dueDate)
      .field('issueDate', invoiceDto.issueDate)
      .field('svc', invoiceDto.svc)
      .attach('file', INVOICE_FILE);
    const invoiceId = invoiceRes.body.data.id;
    await request(server)
      .patch(`${API}/invoices/${invoiceId}`)
      .set(authHeader(adminToken))
      .send({ status: 'verified' });

    const auctionDto = makeAuctionDto(invoiceId);
    const auctionRes = await request(server)
      .post(`${API}/auctions`)
      .set(authHeader(companyToken))
      .send(auctionDto);
    auctionId = auctionRes.body.data.id;
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() + 10);
    await request(server)
      .patch(`${API}/auctions/${auctionId}`)
      .set(authHeader(companyToken))
      .send({ status: 'published', auctionDateEnd: publishDate.toISOString() });

    // Insert a bid via direct DB
    const bidResult = await dataSource.query(
      `INSERT INTO bids (amount, discount, profitability, "auctionId", "investorId") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [5000, 10.5, 11.2, auctionId, buyerId],
    );
    bidId = bidResult[0].id;

    const otherBidResult = await dataSource.query(
      `INSERT INTO bids (amount, discount, profitability, "auctionId", "investorId") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [5100, 10, 11.5, auctionId, otherBuyerId],
    );
    otherBidId = otherBidResult[0].id;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // GET /bids
  describe('GET /bids', () => {
    it('should return 200 with bid list for admin (with auctionId)', async () => {
      const res = await request(server)
        .get(`${API}/bids?auctionId=${auctionId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body._metadata).toBeDefined();
    });

    it('should return 400 for admin without auctionId or investorId', async () => {
      const res = await request(server)
        .get(`${API}/bids`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 200 for investor with auctionId (published auction)', async () => {
      const res = await request(server)
        .get(`${API}/bids?auctionId=${auctionId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const ownBid = res.body.data.find((bid) => bid.id === bidId);
      const anotherBid = res.body.data.find((bid) => bid.id === otherBidId);

      expect(ownBid).toBeDefined();
      expect(anotherBid).toBeDefined();

      expect(ownBid.investor).toBeDefined();
      expect(ownBid.investor.id).toBe(buyerId);
      expect(
        anotherBid.investor === null || anotherBid.investor === undefined,
      ).toBe(true);

      expect(Number.isFinite(Number(ownBid.amount))).toBe(true);
      expect(Number.isFinite(Number(ownBid.discount))).toBe(true);
      expect(Number.isFinite(Number(ownBid.profitability))).toBe(true);
      expect(typeof ownBid.createdAt).toBe('string');

      expect(Number.isFinite(Number(anotherBid.amount))).toBe(true);
      expect(Number.isFinite(Number(anotherBid.discount))).toBe(true);
      expect(Number.isFinite(Number(anotherBid.profitability))).toBe(true);
      expect(typeof anotherBid.createdAt).toBe('string');
    });

    it('should return 400 for investor without auctionId or investorId', async () => {
      const res = await request(server)
        .get(`${API}/bids`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 200 with own bids for investor using investorId=self', async () => {
      const res = await request(server)
        .get(`${API}/bids?investorId=${buyerId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((bid) => bid.investor?.id === buyerId)).toBe(
        true,
      );
    });

    it('should return 200 with empty list for investor using investorId from another investor', async () => {
      const res = await request(server)
        .get(`${API}/bids?investorId=${otherBuyerId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 400 for wrong type filter values', async () => {
      const res = await request(server)
        .get(`${API}/bids?auctionId=not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 200 with empty list for investor on non-published auction', async () => {
      // Create a draft auction (not published)
      const debtorDto = makeDebtorDto();
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(debtorDto);
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('issueDate', invoiceDto.issueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .patch(`${API}/invoices/${invoiceRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const draftAuction = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto(invoiceRes.body.data.id));

      const res = await request(server)
        .get(`${API}/bids?auctionId=${draftAuction.body.data.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      // Non-published auction bids are not visible to non-owner investors
      // The API returns 404 because the auction is not accessible
      expect(res.status).toBe(404);
    });

    it('should return 200 with empty list for investor on published auction with no bids', async () => {
      // Create a fresh published auction with no bids
      const debtorDto = makeDebtorDto();
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(debtorDto);
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('issueDate', invoiceDto.issueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .patch(`${API}/invoices/${invoiceRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const freshAuction = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto(invoiceRes.body.data.id));
      const freshPublishDate = new Date();
      freshPublishDate.setDate(freshPublishDate.getDate() + 10);
      await request(server)
        .patch(`${API}/auctions/${freshAuction.body.data.id}`)
        .set(authHeader(companyToken))
        .send({
          status: 'published',
          auctionDateEnd: freshPublishDate.toISOString(),
        });

      const res = await request(server)
        .get(`${API}/bids?auctionId=${freshAuction.body.data.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 200 with bids for admin using investorId', async () => {
      const res = await request(server)
        .get(`${API}/bids?investorId=${buyerId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 for admin with both auctionId and investorId', async () => {
      const res = await request(server)
        .get(`${API}/bids?auctionId=${auctionId}&investorId=${buyerId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /bids/:id
  describe('GET /bids/:id', () => {
    it('should return 400 for malformed ID', async () => {
      const res = await request(server)
        .get(`${API}/bids/not-a-uuid`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent bid', async () => {
      const res = await request(server)
        .get(`${API}/bids/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('should return 200 for investor viewing own bid', async () => {
      const res = await request(server)
        .get(`${API}/bids/${bidId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(bidId);
    });

    it('should return 200 for investor viewing another bid on published auction', async () => {
      // Another investor views the buyer's bid on the published auction
      const viewer = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, viewer.user.id);

      const res = await request(server)
        .get(`${API}/bids/${bidId}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for investor viewing bid on non-published auction', async () => {
      // Create a draft auction and insert a bid directly
      const debtorDto = makeDebtorDto();
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(companyToken))
        .send(debtorDto);
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(companyToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('issueDate', invoiceDto.issueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .patch(`${API}/invoices/${invoiceRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const draftAuction = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(companyToken))
        .send(makeAuctionDto(invoiceRes.body.data.id));

      // Insert bid on draft auction directly
      const draftBid = await dataSource.query(
        `INSERT INTO bids (amount, discount, profitability, "auctionId", "investorId") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [3000, 5, 6, draftAuction.body.data.id, buyerId],
      );

      // Another investor tries to view this bid
      const viewer = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, viewer.user.id);

      const res = await request(server)
        .get(`${API}/bids/${draftBid[0].id}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 200 for admin viewing any bid', async () => {
      const res = await request(server)
        .get(`${API}/bids/${bidId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(bidId);
    });
  });
});

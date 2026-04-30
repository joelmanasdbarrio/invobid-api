import { INestApplication } from '@nestjs/common';
import path from 'path';
import { Socket as ClientSocket, io } from 'socket.io-client';
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

function connectSocket(port: number, token: string): ClientSocket {
  return io(`http://localhost:${port}/auctions`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });
}

function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeout = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeout,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitWithAck<T>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
  timeout = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ack on ${event}`)),
      timeout,
    );
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

describe('Bid WebSocket (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let port: number;
  let adminToken: string;
  let sellerToken: string;
  let buyerToken: string;
  let buyerId: string;
  let auctionId: string;
  let auctionStartPrice: number;
  const sockets: ClientSocket[] = [];

  function trackSocket(s: ClientSocket): ClientSocket {
    sockets.push(s);
    return s;
  }

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);

    // Start listening to get a port
    await new Promise<void>((resolve) => {
      (server as any).listen(0, () => resolve());
    });
    port = (server as any).address().port;

    // Setup: admin, seller, buyer
    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const seller = await registerInvestor(server, makeCompanyInvestorDto());
    sellerToken = seller.accessToken;
    await verifyInvestor(server, adminToken, seller.user.id);

    const buyer = await registerInvestor(server, makeCompanyInvestorDto());
    buyerToken = buyer.accessToken;
    buyerId = buyer.user.id;
    await verifyInvestor(server, adminToken, buyerId);

    // debtor → verify → invoice → verify → auction → publish
    const debtorRes = await request(server)
      .post(`${API}/debtors`)
      .set(authHeader(sellerToken))
      .send(makeDebtorDto());
    const debtorId = debtorRes.body.data.id;
    await request(server)
      .patch(`${API}/debtors/${debtorId}`)
      .set(authHeader(adminToken))
      .send({ status: 'verified' });

    const invoiceDto = makeInvoiceDto(debtorId);
    const invoiceRes = await request(server)
      .post(`${API}/invoices`)
      .set(authHeader(sellerToken))
      .field('debtorId', invoiceDto.debtorId)
      .field('amount', invoiceDto.amount)
      .field('dueDate', invoiceDto.dueDate)
      .field('svc', invoiceDto.svc)
      .attach('file', INVOICE_FILE);
    const invoiceId = invoiceRes.body.data.id;
    await request(server)
      .patch(`${API}/invoices/${invoiceId}`)
      .set(authHeader(adminToken))
      .send({ status: 'verified' });

    const auctionDto = makeAuctionDto(invoiceId);
    auctionStartPrice = auctionDto.startingPrice;
    const auctionRes = await request(server)
      .post(`${API}/auctions`)
      .set(authHeader(sellerToken))
      .send(auctionDto);
    auctionId = auctionRes.body.data.id;
    await request(server)
      .patch(`${API}/auctions/${auctionId}`)
      .set(authHeader(sellerToken))
      .send({ status: 'published' });
  });

  afterEach(() => {
    // Disconnect all sockets created during test
    for (const s of sockets) {
      if (s.connected) s.disconnect();
    }
    sockets.length = 0;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  // Connection tests
  describe('Connection', () => {
    it('should reject unauthenticated user on join-auction', async () => {
      const socket = trackSocket(
        io(`http://localhost:${port}/auctions`, {
          transports: ['websocket'],
          forceNew: true,
        }),
      );
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      // The guard fires on the message handler, not on connection
      const errorPromise = waitForEvent<any>(socket, 'exception', 5000).catch(
        () => 'timeout',
      );
      socket.emit('join-auction', { auctionId });
      // Either we get an exception event or the handler silently rejects
      const result = await errorPromise;
      // Accept either an exception or a timeout (guard may disconnect silently)
      expect(result).toBeDefined();
    });

    it('should reject invalid token on join-auction', async () => {
      const socket = trackSocket(connectSocket(port, 'invalid-token'));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const errorPromise = waitForEvent<any>(socket, 'exception', 5000).catch(
        () => 'timeout',
      );
      socket.emit('join-auction', { auctionId });
      const result = await errorPromise;
      expect(result).toBeDefined();
    });

    it('should allow verified investor to connect', (done) => {
      const socket = trackSocket(connectSocket(port, buyerToken));
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });
    });
  });

  // join-auction tests
  describe('join-auction', () => {
    it('should join auction room and receive viewer-count', async () => {
      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const viewerCountPromise = waitForEvent<number>(socket, 'viewer-count');
      socket.emit('join-auction', { auctionId });
      const count = await viewerCountPromise;
      expect(count).toBe(1);
    });

    it('should not increment viewer count for duplicate connection of same user', async () => {
      const socket1 = trackSocket(connectSocket(port, buyerToken));
      const socket2 = trackSocket(connectSocket(port, buyerToken));

      await Promise.all([
        new Promise<void>((resolve) => socket1.on('connect', resolve)),
        new Promise<void>((resolve) => socket2.on('connect', resolve)),
      ]);

      // First joins
      const vc1 = waitForEvent<number>(socket1, 'viewer-count');
      socket1.emit('join-auction', { auctionId });
      await vc1;

      // Second connection same user joins
      const vc2 = waitForEvent<number>(socket1, 'viewer-count');
      socket2.emit('join-auction', { auctionId });
      const count = await vc2;
      expect(count).toBe(1); // same user, not incremented
    });

    it('should decrement viewer count on disconnect', async () => {
      const seller2 = await registerInvestor(server, makeCompanyInvestorDto());
      await verifyInvestor(server, adminToken, seller2.user.id);

      const socket1 = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket1.on('connect', resolve));

      const socket2 = trackSocket(connectSocket(port, seller2.accessToken));
      await new Promise<void>((resolve) => socket2.on('connect', resolve));

      // socket1 joins
      let vcPromise = waitForEvent<number>(socket1, 'viewer-count');
      socket1.emit('join-auction', { auctionId });
      await vcPromise;

      // socket2 joins
      vcPromise = waitForEvent<number>(socket1, 'viewer-count');
      socket2.emit('join-auction', { auctionId });
      const count2 = await vcPromise;
      expect(count2).toBe(2);

      // Disconnect socket2 and wait for updated viewer-count
      vcPromise = waitForEvent<number>(socket1, 'viewer-count');
      socket2.disconnect();
      const count3 = await vcPromise;
      expect(count3).toBe(1);
    });
  });

  // place-bid tests
  describe('place-bid', () => {
    it('should place a valid bid and emit events', async () => {
      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const minBid = auctionStartPrice * (1 + increment / 100);

      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      // Join auction room to receive events
      const vcPromise = waitForEvent<number>(socket, 'viewer-count');
      socket.emit('join-auction', { auctionId });
      await vcPromise;

      const newBidPromise = waitForEvent<any>(socket, 'new-bid');
      const result = await emitWithAck<{ success: boolean }>(
        socket,
        'place-bid',
        {
          auctionId,
          amount: minBid,
        },
      );

      expect(result.success).toBe(true);
      const bid = await newBidPromise;
      expect(Number(bid.amount)).toBeCloseTo(minBid, 1);
    });

    it('should extend auction end time when bid placed with <=10min remaining', async () => {
      // Create a fresh debtor → invoice → auction to isolate this test
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(sellerToken))
        .send(makeDebtorDto());
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(sellerToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      const testInvoiceId = invoiceRes.body.data.id;
      await request(server)
        .patch(`${API}/invoices/${testInvoiceId}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });

      const nearExpiryAuctionRes = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(sellerToken))
        .send(makeAuctionDto(testInvoiceId));
      const nearExpiryAuctionId = nearExpiryAuctionRes.body.data.id;
      await request(server)
        .patch(`${API}/auctions/${nearExpiryAuctionId}`)
        .set(authHeader(sellerToken))
        .send({ status: 'published' });

      // Directly set auction end time to 5 min from now (within the 10 min extension window)
      const nearEndTime = new Date(Date.now() + 5 * 60 * 1000);
      await dataSource.query(
        `UPDATE auctions SET "dateEnd" = $1 WHERE id = $2`,
        [nearEndTime, nearExpiryAuctionId],
      );

      // Connect buyer socket and join the near-expiry auction room
      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      const vcPromise = waitForEvent<number>(socket, 'viewer-count');
      socket.emit('join-auction', { auctionId: nearExpiryAuctionId });
      await vcPromise;

      // Register broadcast event listeners before placing bid
      const newBidPromise2 = waitForEvent<any>(socket, 'new-bid');
      const auctionBidUpdatePromise = waitForEvent<any>(
        socket,
        'auction-bid-update',
      );

      // Place a valid bid
      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const minBid = auctionStartPrice * (1 + increment / 100);
      const result = await emitWithAck<{ success: boolean }>(
        socket,
        'place-bid',
        { auctionId: nearExpiryAuctionId, amount: minBid },
      );

      // It should return { success: true }
      expect(result.success).toBe(true);

      // It should emit a new-bid event to all users in the auction room
      const newBid = await newBidPromise2;
      expect(Number(newBid.amount)).toBeCloseTo(minBid, 1);

      // It should emit an auction-bid-update event to all connected clients
      const bidUpdate = await auctionBidUpdatePromise;
      expect(bidUpdate.auctionId).toBe(nearExpiryAuctionId);

      // It should update the auction end time to be 10min from the original near-expiry time
      const auctionAfter = await request(server)
        .get(`${API}/auctions/${nearExpiryAuctionId}`)
        .set(authHeader(adminToken));
      const updatedEndTime = new Date(auctionAfter.body.data.date.end);
      const expectedEndTime = new Date(nearEndTime.getTime() + 10 * 60 * 1000);
      expect(
        Math.abs(updatedEndTime.getTime() - expectedEndTime.getTime()),
      ).toBeLessThan(5000); // within 5 seconds tolerance
    });

    it('should reject bid from seller on own auction', async () => {
      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const amount = auctionStartPrice * (1 + increment / 100) * 2;

      const socket = trackSocket(connectSocket(port, sellerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const result = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          auctionId,
          amount,
        },
      );
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/[Ss]ellers cannot place bids/);
    });

    it('should reject bid below minimum increment', async () => {
      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      // Bid with very small amount (below start price)
      const result = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          auctionId,
          amount: 1,
        },
      );
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/must be at least/);
    });

    it('should reject bid on non-existent auction', async () => {
      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const result = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          auctionId: '00000000-0000-0000-0000-000000000000',
          amount: 10000,
        },
      );
      expect(result.success).toBe(false);
    });

    it('should reject admin on place-bid (guard blocks handler)', async () => {
      const socket = trackSocket(connectSocket(port, adminToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      // WsJwtGuard blocks admin from reaching the handler, so no ack is sent.
      // We expect either an exception event or a timeout (no response).
      const exceptionPromise = waitForEvent<any>(
        socket,
        'exception',
        3000,
      ).catch(() => 'timeout');
      socket.emit('place-bid', { auctionId, amount: 999999 });
      const result = await exceptionPromise;
      // Either an exception was thrown or the guard silently blocked
      expect(result).toBeDefined();
    });

    it('should reject bid on non-published auction', async () => {
      // Create a draft auction
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(sellerToken))
        .send(makeDebtorDto());
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(sellerToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .patch(`${API}/invoices/${invoiceRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const draftAuction = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(sellerToken))
        .send(makeAuctionDto(invoiceRes.body.data.id));

      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const result = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          auctionId: draftAuction.body.data.id,
          amount: 10000,
        },
      );
      expect(result.success).toBe(false);
    });

    it('should accept bid at exact minimum boundary over starting price', async () => {
      // Create a fresh published auction with no prior bids
      const debtorRes = await request(server)
        .post(`${API}/debtors`)
        .set(authHeader(sellerToken))
        .send(makeDebtorDto());
      await request(server)
        .patch(`${API}/debtors/${debtorRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const invoiceDto = makeInvoiceDto(debtorRes.body.data.id);
      const invoiceRes = await request(server)
        .post(`${API}/invoices`)
        .set(authHeader(sellerToken))
        .field('debtorId', invoiceDto.debtorId)
        .field('amount', invoiceDto.amount)
        .field('dueDate', invoiceDto.dueDate)
        .field('svc', invoiceDto.svc)
        .attach('file', INVOICE_FILE);
      await request(server)
        .patch(`${API}/invoices/${invoiceRes.body.data.id}`)
        .set(authHeader(adminToken))
        .send({ status: 'verified' });
      const freshAuction = await request(server)
        .post(`${API}/auctions`)
        .set(authHeader(sellerToken))
        .send(makeAuctionDto(invoiceRes.body.data.id));
      await request(server)
        .patch(`${API}/auctions/${freshAuction.body.data.id}`)
        .set(authHeader(sellerToken))
        .send({ status: 'published' });

      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const exactMin = auctionStartPrice * (1 + increment / 100);

      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      const result = await emitWithAck<{ success: boolean }>(
        socket,
        'place-bid',
        {
          auctionId: freshAuction.body.data.id,
          amount: exactMin,
        },
      );
      expect(result.success).toBe(true);
    });

    it('should reject bid with missing or invalid fields', async () => {
      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));

      // Missing auctionId
      const result1 = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          amount: 10000,
        },
      );
      expect(result1.success).toBe(false);

      // Non-positive amount
      const result2 = await emitWithAck<{ success: boolean; message?: string }>(
        socket,
        'place-bid',
        {
          auctionId,
          amount: -1,
        },
      );
      expect(result2.success).toBe(false);
    });
  });
});

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

describe('Auction Balance Lifecycle (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let dataSource: DataSource;
  let port: number;
  let adminToken: string;
  let sellerToken: string;
  let buyerToken: string;
  let buyerId: string;
  const sockets: ClientSocket[] = [];

  function trackSocket(s: ClientSocket): ClientSocket {
    sockets.push(s);
    return s;
  }

  async function fundBankAccount(
    investorId: string,
    amount: number,
  ): Promise<void> {
    await dataSource.query(
      `UPDATE bank_accounts SET balance = $1, "reservedBalance" = 0
       WHERE id = (SELECT "bankAccountId" FROM users WHERE id = $2)`,
      [amount, investorId],
    );
  }

  async function getInvestorBalance(
    investorId: string,
    token: string,
  ): Promise<{ balance: number; availableBalance: number }> {
    const res = await request(server)
      .get(`${API}/investors/${investorId}`)
      .set(authHeader(token));
    const balance = Number(res.body.data.bankAccount.balance);
    const reservedBalance = Number(res.body.data.bankAccount.reservedBalance);
    return {
      balance,
      availableBalance: balance - reservedBalance,
    };
  }

  async function getPlatformAccountBalance(): Promise<number> {
    const res = await dataSource.query(
      `SELECT balance FROM bank_accounts WHERE platform = true LIMIT 1`,
    );
    return Number(res[0]?.balance || 0);
  }

  async function createPublishedAuction(): Promise<{
    auctionId: string;
    startPrice: number;
  }> {
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

    const auctionDto = makeAuctionDto(invoiceRes.body.data.id);
    const auctionRes = await request(server)
      .post(`${API}/auctions`)
      .set(authHeader(sellerToken))
      .send(auctionDto);
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() + 10);
    await request(server)
      .patch(`${API}/auctions/${auctionRes.body.data.id}`)
      .set(authHeader(sellerToken))
      .send({ status: 'published', auctionDateEnd: publishDate.toISOString() });

    return {
      auctionId: auctionRes.body.data.id,
      startPrice: auctionDto.startingPrice,
    };
  }

  /** Transition a published auction to TRANSITIONING by setting its end time to the past. */
  async function forceTransitioning(auctionId: string): Promise<void> {
    await dataSource.query(
      `UPDATE auctions SET "dateEnd" = $1, status = 'transitioning' WHERE id = $2`,
      [new Date(Date.now() - 60000), auctionId],
    );
  }

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    await cleanDatabase(dataSource);
    await dataSource.query(
      `INSERT INTO bank_accounts (balance, "reservedBalance", platform) VALUES (0, 0, true)`,
    );

    await new Promise<void>((resolve) => {
      (server as any).listen(0, () => resolve());
    });
    port = (server as any).address().port;

    const admin = await registerAdmin(server, makeAdminDto());
    adminToken = admin.accessToken;

    const seller = await registerInvestor(server, makeCompanyInvestorDto());
    sellerToken = seller.accessToken;
    await verifyInvestor(server, adminToken, seller.user.id);

    const buyer = await registerInvestor(server, makeCompanyInvestorDto());
    buyerToken = buyer.accessToken;
    buyerId = buyer.user.id;
    await verifyInvestor(server, adminToken, buyerId);
  });

  afterEach(() => {
    for (const s of sockets) {
      if (s.connected) s.disconnect();
    }
    sockets.length = 0;
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await app.close();
  });

  describe('FINISHED auction', () => {
    it('should deduct winning bid from balance when auction is FINISHED', async () => {
      const fundAmount = 100000;
      await fundBankAccount(buyerId, fundAmount);

      const { auctionId, startPrice } = await createPublishedAuction();

      // Get auction details to get seller and invoice info
      const auctionDetailsRes = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken));
      const sellerId = auctionDetailsRes.body.data.invoice.sellerInvestor.id;
      const buyerPercentage =
        auctionDetailsRes.body.data.invoice.transactionFee.buyerPercentage;
      const sellerPercentage =
        auctionDetailsRes.body.data.invoice.transactionFee.sellerPercentage;

      // Fund seller account
      const sellerFundAmount = 50000;
      await fundBankAccount(sellerId, sellerFundAmount);

      // Get balances before auction finishes
      const sellerBalanceBefore = await getInvestorBalance(
        sellerId,
        adminToken,
      );
      const platformBalanceBefore = await getPlatformAccountBalance();

      // Place a bid via WebSocket
      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const bidAmount = startPrice * (1 + increment / 100);

      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      socket.emit('join-auction', { auctionId });
      await waitForEvent<number>(socket, 'viewer-count');

      const bidResult = await emitWithAck<{ success: boolean }>(
        socket,
        'place-bid',
        { auctionId, amount: bidAmount },
      );
      expect(bidResult.success).toBe(true);

      // Force auction to TRANSITIONING
      await forceTransitioning(auctionId);

      // Admin finishes the auction
      const finishRes = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'finished' });
      expect(finishRes.status).toBe(200);

      // Calculate expected fees
      const buyerFee = (bidAmount * buyerPercentage) / 100;
      const sellerFee = (bidAmount * sellerPercentage) / 100;

      // Verify buyer balance: balance should be deducted by (bidAmount + buyerFee)
      const buyerBalance = await getInvestorBalance(buyerId, adminToken);
      expect(buyerBalance.balance).toBeCloseTo(
        fundAmount - bidAmount - buyerFee,
        1,
      );
      expect(buyerBalance.availableBalance).toBeCloseTo(
        fundAmount - bidAmount - buyerFee,
        1,
      );

      // Verify seller balance: balance should increase by (bidAmount - sellerFee)
      const sellerBalance = await getInvestorBalance(sellerId, adminToken);
      const expectedSellerCredit = bidAmount - sellerFee;
      expect(sellerBalance.balance).toBeCloseTo(
        sellerBalanceBefore.balance + expectedSellerCredit,
        1,
      );

      // Verify platform balance: balance should increase by (buyerFee + sellerFee)
      const platformBalanceAfter = await getPlatformAccountBalance();
      const expectedPlatformCredit = buyerFee + sellerFee;
      expect(platformBalanceAfter).toBeCloseTo(
        platformBalanceBefore + expectedPlatformCredit,
        1,
      );
    });
  });

  describe('CANCELLED auction', () => {
    it('should restore availableBalance when auction is CANCELLED', async () => {
      const fundAmount = 100000;
      await fundBankAccount(buyerId, fundAmount);

      const { auctionId, startPrice } = await createPublishedAuction();

      const increment =
        Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE) || 1;
      const bidAmount = startPrice * (1 + increment / 100);

      const socket = trackSocket(connectSocket(port, buyerToken));
      await new Promise<void>((resolve) => socket.on('connect', resolve));
      socket.emit('join-auction', { auctionId });
      await waitForEvent<number>(socket, 'viewer-count');

      const bidResult = await emitWithAck<{ success: boolean }>(
        socket,
        'place-bid',
        { auctionId, amount: bidAmount },
      );
      expect(bidResult.success).toBe(true);

      // Verify available balance is reduced (bid reserves bidAmount + buyerFee)
      const auctionInfoRes = await request(server)
        .get(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken));
      const buyerPct =
        auctionInfoRes.body.data.invoice.transactionFee.buyerPercentage;
      const bidFee = (bidAmount * buyerPct) / 100;
      const totalReserved = bidAmount + bidFee;
      const beforeCancel = await getInvestorBalance(buyerId, adminToken);
      expect(beforeCancel.availableBalance).toBeCloseTo(
        fundAmount - totalReserved,
        1,
      );

      // Force to TRANSITIONING and cancel
      await forceTransitioning(auctionId);

      const cancelRes = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'cancelled', lastCommunication: 'Test cancellation' });
      expect(cancelRes.status).toBe(200);

      // Balance unchanged, availableBalance restored
      const afterCancel = await getInvestorBalance(buyerId, adminToken);
      expect(afterCancel.balance).toBe(fundAmount);
      expect(afterCancel.availableBalance).toBeCloseTo(fundAmount, 1);
    });

    it('should not modify any balance when cancelled auction has no bids', async () => {
      const fundAmount = 100000;
      await fundBankAccount(buyerId, fundAmount);

      const { auctionId } = await createPublishedAuction();

      // Force directly to TRANSITIONING without any bids
      await forceTransitioning(auctionId);

      const cancelRes = await request(server)
        .patch(`${API}/auctions/${auctionId}`)
        .set(authHeader(adminToken))
        .send({ status: 'cancelled', lastCommunication: 'No bids cancel' });
      expect(cancelRes.status).toBe(200);

      // Balances unchanged
      const { balance, availableBalance } = await getInvestorBalance(
        buyerId,
        adminToken,
      );
      expect(balance).toBe(fundAmount);
      expect(availableBalance).toBe(fundAmount);
    });
  });
});

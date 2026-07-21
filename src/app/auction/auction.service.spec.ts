import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankAccountService } from '../bank-account/bank-account.service';
import { BidService } from '../bid/bid.service';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceStatus } from '../invoice/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorService } from '../user/investor/investor.service';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';

/** Returns an ISO date string that is `offsetDays` days from today (UTC). */
function utcDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Returns an ISO date string that is `offsetMonths` months from today (UTC). */
function utcMonthOffset(offsetMonths: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

const mockAuctionRepository = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(),
};

const mockInvoiceService = {
  findOne: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(10),
};

const sellerInvestor = {
  id: 'seller-id',
  type: UserType.INVESTOR,
} as unknown as Investor;

const makeInvoice = (dueDate: string) => ({
  id: 'invoice-id',
  status: InvoiceStatus.VERIFIED,
  sellerInvestor: { id: 'seller-id' },
  dueDate,
  amount: 10000,
  transactionFee: { buyerPercentage: 2.5, sellerPercentage: 1.5 },
});

const makeDto = (
  overrides: Partial<CreateAuctionDto> = {},
): CreateAuctionDto => ({
  svc: 'invoice-id',
  startingPrice: 1000,
  auctionDateEnd: utcDateOffset(4), // 4 days ahead — safely >= today+2
  ...overrides,
});

describe('AuctionService', () => {
  let service: AuctionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuctionRepository.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        {
          provide: getRepositoryToken(Auction),
          useValue: mockAuctionRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {},
        },
        { provide: BidService, useValue: {} },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InvestorService, useValue: {} },
        { provide: BankAccountService, useValue: {} },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create — date validation', () => {
    it('succeeds when end >= today+2 and end <= oneMonthBeforeDue', async () => {
      const dueDate = utcMonthOffset(2); // due in 2 months — gives plenty of room
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));
      const savedAuction = { id: 'auction-id' };
      mockAuctionRepository.create.mockReturnValue(savedAuction);
      mockAuctionRepository.save.mockResolvedValue(savedAuction);

      const dto = makeDto({ auctionDateEnd: utcDateOffset(3) });

      await expect(service.create(dto, sellerInvestor)).resolves.toBe(
        savedAuction,
      );
    });

    it('throws BadRequestException when endDate equals today (must be at least 2 days ahead)', async () => {
      const dueDate = utcMonthOffset(2);
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));

      const dto = makeDto({ auctionDateEnd: utcDateOffset(0) }); // today

      await expect(service.create(dto, sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when endDate is only 1 day ahead (must be at least 2)', async () => {
      const dueDate = utcMonthOffset(2);
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));

      const dto = makeDto({ auctionDateEnd: utcDateOffset(1) }); // only 1 day ahead

      await expect(service.create(dto, sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when endDate is after oneMonthBeforeDue', async () => {
      const dueDate = utcMonthOffset(1); // due in exactly 1 month — oneMonthBeforeDue = today
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));

      // endDate 2 days ahead — which is AFTER today (= oneMonthBeforeDue)
      const dto = makeDto({
        auctionDateEnd: utcDateOffset(2),
      });

      await expect(service.create(dto, sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts ISO datetime strings and preserves the exact timestamp', async () => {
      const dueDate = utcMonthOffset(2);
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));
      const savedAuction = { id: 'auction-id' };
      mockAuctionRepository.create.mockReturnValue(savedAuction);
      mockAuctionRepository.save.mockResolvedValue(savedAuction);

      const endDay = utcDateOffset(4);

      const expectedDateTime = endDay + 'T00:01:00.000Z';
      const dto = makeDto({ auctionDateEnd: expectedDateTime });

      await expect(service.create(dto, sellerInvestor)).resolves.toBe(
        savedAuction,
      );

      expect(mockAuctionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.objectContaining({
            end: new Date(expectedDateTime),
          }),
        }),
      );
    });

    it('throws BadRequestException when invoice is not verified or not owned by user', async () => {
      mockInvoiceService.findOne.mockResolvedValue({
        ...makeInvoice(utcMonthOffset(2)),
        status: InvoiceStatus.PENDING,
      });

      await expect(service.create(makeDto(), sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when there is already an active auction for the invoice', async () => {
      mockInvoiceService.findOne.mockResolvedValue(
        makeInvoice(utcMonthOffset(2)),
      );
      mockAuctionRepository.count.mockResolvedValue(1); // active auction exists

      await expect(service.create(makeDto(), sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Canonical cross-layer test dataset — must match frontend test/lib/calculate-max-price.test.ts
  // invoiceAmount=5000, buyerPct=1%, sellerPct=2%, minDiscount=10%
  // maxAllowedPrice = (5000 + 5000*3/100) * 0.9 = 5150 * 0.9 = 4635
  describe('create — price validation', () => {
    const priceTestInvoice = {
      id: 'invoice-id',
      status: InvoiceStatus.VERIFIED,
      sellerInvestor: { id: 'seller-id' },
      dueDate: utcMonthOffset(2),
      amount: 5000,
      transactionFee: { buyerPercentage: 1, sellerPercentage: 2 },
    };

    it('succeeds when startingPrice equals the maximum allowed price (4635)', async () => {
      mockInvoiceService.findOne.mockResolvedValue(priceTestInvoice);
      const savedAuction = { id: 'auction-id' };
      mockAuctionRepository.create.mockReturnValue(savedAuction);
      mockAuctionRepository.save.mockResolvedValue(savedAuction);

      const dto = makeDto({ startingPrice: 4635 });

      await expect(service.create(dto, sellerInvestor)).resolves.toBe(
        savedAuction,
      );
    });

    it('throws BadRequestException when startingPrice exceeds maximum allowed price (4636 > 4635)', async () => {
      mockInvoiceService.findOne.mockResolvedValue(priceTestInvoice);

      const dto = makeDto({ startingPrice: 4636 });

      await expect(service.create(dto, sellerInvestor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

describe('AuctionService — update balance lifecycle', () => {
  let service: AuctionService;

  const mockBidService = {
    findAll: jest.fn(),
  };
  const mockInvestorService = {
    findOne: jest.fn(),
  };
  const mockBankAccountService = {
    finalizeTransfer: jest.fn(),
    releaseBalance: jest.fn(),
    getPlatformAccount: jest.fn(),
    settleAuction: jest.fn(),
  };
  const mockInvoiceRepository = {
    save: jest.fn(),
  };

  const adminUser = {
    id: 'admin-1',
    type: UserType.ADMIN,
  } as unknown as Investor;

  const makeTransitioningAuction = () => ({
    id: 'auction-1',
    status: AuctionStatus.TRANSITIONING,
    price: { start: 100, end: null },
    discount: { start: 5, end: null },
    profitability: { start: 10, end: null },
    date: { start: new Date(), end: new Date() },
    invoice: {
      id: 'inv-1',
      amount: 10000,
      sellerInvestor: { id: 'seller-1' },
      buyerInvestor: null,
      transactionFee: { buyerPercentage: 2.5, sellerPercentage: 1.5 },
    },
    lastCommunication: 'test',
    bids: [],
    removeUndefined: undefined as unknown,
  });

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        {
          provide: getRepositoryToken(Auction),
          useValue: {
            ...mockAuctionRepository,
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            save: jest.fn((entity) => Promise.resolve(entity)),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        { provide: BidService, useValue: mockBidService },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InvestorService, useValue: mockInvestorService },
        { provide: BankAccountService, useValue: mockBankAccountService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
  });

  describe('update (FINISHED)', () => {
    it('should call settleAuction with correct parameters when auction finishes', async () => {
      const auction = makeTransitioningAuction();
      mockQueryBuilder.getOne.mockResolvedValue(auction);
      mockBidService.findAll.mockResolvedValue({
        data: [
          {
            amount: 5125,
            discount: 50,
            profitability: 15,
            investor: { id: 'buyer-1' },
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
      });
      mockInvestorService.findOne.mockImplementation((id) => {
        if (id === 'buyer-1') {
          return Promise.resolve({
            id: 'buyer-1',
            bankAccount: { id: 'ba-buyer' },
          });
        }
        if (id === 'seller-1') {
          return Promise.resolve({
            id: 'seller-1',
            bankAccount: { id: 'ba-seller' },
          });
        }
        return Promise.resolve(null);
      });
      mockBankAccountService.getPlatformAccount.mockResolvedValue({
        id: 'ba-platform',
      });
      mockBankAccountService.settleAuction.mockResolvedValue(undefined);
      mockInvoiceRepository.save.mockResolvedValue({});

      const dto = new UpdateAuctionDto();
      dto.status = AuctionStatus.FINISHED;
      dto.removeUndefined = (() => dto) as any;

      await service.update('auction-1', dto, adminUser);

      // Verify settleAuction was called with correct fee calculations
      // bidAmount = 5000
      // buyerFee = 5000 * 2.5 / 100 = 125
      // sellerFee = 5000 * 1.5 / 100 = 75
      expect(mockBankAccountService.settleAuction).toHaveBeenCalledWith({
        buyerAccountId: 'ba-buyer',
        sellerAccountId: 'ba-seller',
        platformAccountId: 'ba-platform',
        bidAmount: 5000,
        buyerFee: 125,
        sellerFee: 75,
      });
    });
  });

  describe('update (CANCELLED)', () => {
    it('should call releaseBalance for latest bidder when bids exist', async () => {
      const auction = makeTransitioningAuction();
      mockQueryBuilder.getOne.mockResolvedValue(auction);
      mockBidService.findAll.mockResolvedValue({
        data: [
          {
            amount: 3075,
            investor: { id: 'buyer-1' },
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
      });
      mockInvestorService.findOne.mockResolvedValue({
        id: 'buyer-1',
        bankAccount: { id: 'ba-buyer' },
      });
      mockBankAccountService.releaseBalance.mockResolvedValue({});

      const dto = new UpdateAuctionDto();
      dto.status = AuctionStatus.CANCELLED;
      dto.lastCommunication = 'Cancelled for testing';
      dto.removeUndefined = (() => dto) as any;

      await service.update('auction-1', dto, adminUser);

      expect(mockBankAccountService.releaseBalance).toHaveBeenCalledWith(
        'ba-buyer',
        3075,
      );
    });

    it('should not call releaseBalance when no bids exist', async () => {
      const auction = makeTransitioningAuction();
      mockQueryBuilder.getOne.mockResolvedValue(auction);
      mockBidService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1,
      });

      const dto = new UpdateAuctionDto();
      dto.status = AuctionStatus.CANCELLED;
      dto.lastCommunication = 'Cancelled for testing';
      dto.removeUndefined = (() => dto) as any;

      await service.update('auction-1', dto, adminUser);

      expect(mockBankAccountService.releaseBalance).not.toHaveBeenCalled();
    });
  });
});

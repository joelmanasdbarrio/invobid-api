import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BidService } from '../bid/bid.service';
import { InvoiceStatus } from '../invoice/enums/invoice-status.enum';
import { InvoiceService } from '../invoice/invoice.service';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorService } from '../user/investor/investor.service';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { Auction } from './entities/auction.entity';

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
};

const mockInvoiceService = {
  findOne: jest.fn(),
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
        { provide: BidService, useValue: {} },
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InvestorService, useValue: {} },
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

    it('strips the time component from ISO datetime strings (toUTCDate boundary)', async () => {
      // "2026-04-10T23:30:00.000Z" and "2026-04-10T00:00:00.000Z" must both
      // resolve to the same calendar day (April 10 UTC) after toUTCDate strips time.
      const dueDate = utcMonthOffset(2);
      mockInvoiceService.findOne.mockResolvedValue(makeInvoice(dueDate));
      const savedAuction = { id: 'auction-id' };
      mockAuctionRepository.create.mockReturnValue(savedAuction);
      mockAuctionRepository.save.mockResolvedValue(savedAuction);

      const endDay = utcDateOffset(4);

      // Pass a full ISO string with a time component — should still succeed
      const dto = makeDto({ auctionDateEnd: endDay + 'T00:01:00.000Z' });

      await expect(service.create(dto, sellerInvestor)).resolves.toBe(
        savedAuction,
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
});

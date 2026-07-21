import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuctionService } from '../auction/auction.service';
import { AuctionStatus } from '../auction/enums/auction-status.enum';
import { BankAccountService } from '../bank-account/bank-account.service';
import { Investor } from '../user/investor/entities/investor.entity';
import { BidService } from './bid.service';
import { Bid } from './entities/bid.entity';

const makeInvestor = (
  id: string,
  bankAccountId: string,
  availableBalance = 10000,
) =>
  ({
    id,
    bankAccount: { id: bankAccountId, balance: 10000, availableBalance },
  }) as unknown as Investor;

const makeAuction = () => ({
  id: 'auction-1',
  status: AuctionStatus.PUBLISHED,
  price: { start: 100 },
  invoice: {
    sellerInvestor: { id: 'seller-1' },
    amount: 10000,
    transactionFee: { buyerPercentage: 2.5 },
  },
});

describe('BidService', () => {
  let service: BidService;

  const mockBidQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const mockBidRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockBidQueryBuilder),
  };
  const mockAuctionService = {
    findOne: jest.fn(),
  };
  const mockBankAccountService = {
    reserveBalance: jest.fn(),
    releaseBalance: jest.fn(),
  };
  const mockManagerSave = jest.fn((entity) =>
    Promise.resolve({ ...entity, id: 'bid-1' }),
  );
  const mockManagerCreate = jest.fn((_Entity, data) => data);
  const mockManager = {
    save: mockManagerSave,
    create: mockManagerCreate,
  } as unknown as EntityManager;
  const mockDataSource = {
    transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
      cb(mockManager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.SMALLEST_BID_INCREMENT_PERCENTAGE = '1';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidService,
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        { provide: AuctionService, useValue: mockAuctionService },
        { provide: BankAccountService, useValue: mockBankAccountService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<BidService>(BidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const bidder = makeInvestor('buyer-1', 'ba-1');

    it('should call reserveBalance with bidder bankAccount id and bid amount', async () => {
      mockAuctionService.findOne.mockResolvedValue(makeAuction());
      mockBidQueryBuilder.getOne.mockResolvedValue(null); // no prior bids
      mockBankAccountService.reserveBalance.mockResolvedValue({
        id: 'ba-1',
        reservedBalance: 205,
      });

      await service.create({ auctionId: 'auction-1', amount: 200 }, bidder);

      // 200 + (200 * 2.5 / 100) = 200 + 5 = 205
      expect(mockBankAccountService.reserveBalance).toHaveBeenCalledWith(
        'ba-1',
        205,
        mockManager,
      );
    });

    it('should release previous bidder balance when outbid by different investor', async () => {
      const prevBidder = makeInvestor('buyer-prev', 'ba-prev');
      mockAuctionService.findOne.mockResolvedValue(makeAuction());
      mockBidQueryBuilder.getOne.mockResolvedValue({
        amount: 153.75,
        investor: prevBidder,
      });
      mockBankAccountService.releaseBalance.mockResolvedValue({
        id: 'ba-prev',
        reservedBalance: 0,
      });
      mockBankAccountService.reserveBalance.mockResolvedValue({
        id: 'ba-1',
        reservedBalance: 205,
      });

      const result = await service.create(
        { auctionId: 'auction-1', amount: 200 },
        bidder,
      );

      // Release previous: bid.amount already includes fee (150 + 3.75 = 153.75)
      expect(mockBankAccountService.releaseBalance).toHaveBeenCalledWith(
        'ba-prev',
        153.75,
        mockManager,
      );
      expect(result.balanceUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            investorId: 'buyer-prev',
            reservedBalance: 0,
          }),
        ]),
      );
    });

    it('should throw BadRequestException when availableBalance is insufficient', async () => {
      mockAuctionService.findOne.mockResolvedValue(makeAuction());
      mockBidQueryBuilder.getOne.mockResolvedValue(null);
      mockBankAccountService.reserveBalance.mockRejectedValue(
        new BadRequestException('Insufficient funds to place this bid'),
      );

      await expect(
        service.create({ auctionId: 'auction-1', amount: 200 }, bidder),
      ).rejects.toThrow(BadRequestException);

      expect(mockManagerSave).not.toHaveBeenCalled();
    });

    it('should save bid inside the transaction via manager', async () => {
      mockAuctionService.findOne.mockResolvedValue(makeAuction());
      mockBidQueryBuilder.getOne.mockResolvedValue(null);
      mockBankAccountService.reserveBalance.mockResolvedValue({
        id: 'ba-1',
        availableBalance: 9800,
      });

      await service.create({ auctionId: 'auction-1', amount: 200 }, bidder);

      expect(mockManagerCreate).toHaveBeenCalled();
      expect(mockManagerSave).toHaveBeenCalled();
    });
  });
});

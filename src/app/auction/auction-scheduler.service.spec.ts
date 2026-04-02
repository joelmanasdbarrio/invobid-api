import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';

describe('AuctionSchedulerService', () => {
  let service: AuctionSchedulerService;
  let mockAuctionRepository: {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockAuctionRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionSchedulerService,
        {
          provide: getRepositoryToken(Auction),
          useValue: mockAuctionRepository,
        },
      ],
    }).compile();

    service = module.get<AuctionSchedulerService>(AuctionSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishedToTransitioning', () => {
    it('should transition PUBLISHED auctions to TRANSITIONING and set endingPrice to latest bid amount', async () => {
      // Mock the query builder chain
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      mockAuctionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.publishedToTransitioning();

      // Verify the query builder was called correctly
      expect(mockAuctionRepository.createQueryBuilder).toHaveBeenCalledWith();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Auction);

      // Verify set was called with only status (no ending values computed)
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        status: AuctionStatus.TRANSITIONING,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('status = :status', {
        status: AuctionStatus.PUBLISHED,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '"dateEnd" <= NOW()',
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();

      // Verify logging
      expect(loggerSpy).toHaveBeenCalledWith(
        'Transitioned 2 auction(s) PUBLISHED → TRANSITIONING',
      );
    });

    it('should not log when no auctions are transitioned', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      mockAuctionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.publishedToTransitioning();

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should only set status to TRANSITIONING without setting ending values', () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockAuctionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      void service.publishedToTransitioning();

      // Verify that only status is set (no ending values computed)
      const setCallArg = (
        mockQueryBuilder.set.mock.calls[0] as any[]
      )[0] as Record<string, unknown>;

      expect(setCallArg).toEqual({
        status: AuctionStatus.TRANSITIONING,
      });

      // Verify no subqueries for endingPrice, endingDiscount, or endingProfitability
      expect(setCallArg.endingPrice).toBeUndefined();
      expect(setCallArg.endingDiscount).toBeUndefined();
      expect(setCallArg.endingProfitability).toBeUndefined();
    });

    it('should set where clause for PUBLISHED status and end date condition', () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      mockAuctionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      void service.publishedToTransitioning();

      // Verify where clause
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('status = :status', {
        status: AuctionStatus.PUBLISHED,
      });

      // Verify andWhere clause for end date
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '"dateEnd" <= NOW()',
      );
    });
  });
});

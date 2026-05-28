import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuctionService } from '../auction/auction.service';
import { BidService } from './bid.service';
import { Bid } from './entities/bid.entity';

describe('BidService', () => {
  let service: BidService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidService,
        { provide: getRepositoryToken(Bid), useValue: {} },
        { provide: AuctionService, useValue: {} },
      ],
    }).compile();

    service = module.get<BidService>(BidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

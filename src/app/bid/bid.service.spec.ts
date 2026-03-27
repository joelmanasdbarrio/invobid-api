import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auction } from '../auction/entities/auction.entity';
import { BidService } from './bid.service';
import { Bid } from './entities/bid.entity';

describe('BidService', () => {
  let service: BidService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidService,
        { provide: getRepositoryToken(Bid), useValue: {} },
        { provide: getRepositoryToken(Auction), useValue: {} },
      ],
    }).compile();

    service = module.get<BidService>(BidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

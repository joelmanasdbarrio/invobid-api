import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { MetricService } from './metric.service';

describe('MetricService', () => {
  let service: MetricService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricService,
        {
          provide: getRepositoryToken(BankAccount),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Bid),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Investor),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Debtor),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Auction),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetricService>(MetricService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankAccountService } from './bank-account.service';
import { BankAccount } from './entities/bank-account.entity';

describe('BankAccountService', () => {
  let service: BankAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountService,
        { provide: getRepositoryToken(BankAccount), useValue: {} },
      ],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

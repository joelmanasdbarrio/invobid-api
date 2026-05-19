import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BankAccountService } from './bank-account.service';
import { BankAccount } from './entities/bank-account.entity';

const makeAccount = (overrides: Partial<BankAccount> = {}): BankAccount =>
  ({
    id: 'ba-1',
    balance: 10000,
    reservedBalance: 0,
    ...overrides,
  }) as BankAccount;

describe('BankAccountService', () => {
  let service: BankAccountService;

  const mockSave = jest.fn((entity) => Promise.resolve(entity));
  const mockGetOneOrFail = jest.fn();
  const mockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOneOrFail: mockGetOneOrFail,
  };
  const mockRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    save: mockSave,
  };
  const mockManager = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
  };
  const mockDataSource = {
    manager: mockManager,
    transaction: jest.fn((cb: (m: typeof mockManager) => Promise<unknown>) =>
      cb(mockManager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountService,
        { provide: getRepositoryToken(BankAccount), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveBalance', () => {
    it('should increment reservedBalance by amount', async () => {
      const account = makeAccount({ reservedBalance: 0 });
      mockGetOneOrFail.mockResolvedValue(account);

      const result = await service.reserveBalance('ba-1', 2000);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ reservedBalance: 2000 }),
      );
      expect(result.reservedBalance).toBe(2000);
    });

    it('should throw BadRequestException when funds are insufficient', async () => {
      const account = makeAccount({ balance: 500, reservedBalance: 0 });
      mockGetOneOrFail.mockResolvedValue(account);

      await expect(service.reserveBalance('ba-1', 1000)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should use row-level locking (pessimistic_write)', async () => {
      const account = makeAccount();
      mockGetOneOrFail.mockResolvedValue(account);

      await service.reserveBalance('ba-1', 100);

      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
    });
  });

  describe('releaseBalance', () => {
    it('should decrement reservedBalance by amount', async () => {
      const account = makeAccount({ reservedBalance: 3000 });
      mockGetOneOrFail.mockResolvedValue(account);

      const result = await service.releaseBalance('ba-1', 2000);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ reservedBalance: 1000 }),
      );
      expect(result.reservedBalance).toBe(1000);
    });
  });
});

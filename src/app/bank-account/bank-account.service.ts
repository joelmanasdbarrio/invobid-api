import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import 'src/utils/object.extensions';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccount } from './entities/bank-account.entity';
import { User } from 'src/app/user/common/entities/user.entity';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createBankAccountDto: CreateBankAccountDto) {
    const bankAccount = this.bankAccountRepository.create(createBankAccountDto);
    return await this.bankAccountRepository.save(bankAccount);
  }

  async update(updateBankAccountDto: UpdateBankAccountDto, user: Investor) {
    const queryBuilder = this.bankAccountRepository
      .createQueryBuilder('bankAccount')
      .leftJoinAndSelect('bankAccount.investor', 'investor')
      .where('investor.id = :investorId', { investorId: user.id });

    const bankAccount = await queryBuilder.getOne();

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found for this user');
    }

    updateBankAccountDto.balance =
      Number(updateBankAccountDto.balance) + Number(bankAccount.balance);

    Object.assign(bankAccount, updateBankAccountDto.removeUndefined());
    return await this.bankAccountRepository.save(bankAccount);
  }

  remove(id: string) {
    return this.bankAccountRepository.delete(id);
  }

  /**
   * Atomically increments `reservedBalance` by `amount`.
   * Uses SELECT ... FOR UPDATE to prevent race conditions.
   * Throws BadRequestException if funds are insufficient (balance - reservedBalance < amount).
   */
  async reserveBalance(
    bankAccountId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<BankAccount> {
    const run = async (mgr: EntityManager) => {
      const repo = mgr.getRepository(BankAccount);

      const account = await repo
        .createQueryBuilder('ba')
        .setLock('pessimistic_write')
        .where('ba.id = :id', { id: bankAccountId })
        .getOneOrFail();

      const availableBalance =
        Number(account.balance) - Number(account.reservedBalance);
      if (availableBalance < amount) {
        throw new BadRequestException('Insufficient funds to place this bid');
      }

      account.reservedBalance = Number(account.reservedBalance) + amount;
      return await repo.save(account);
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((mgr) => run(mgr));
  }

  /**
   * Atomically decrements `reservedBalance` by `amount`.
   * Used when a bid is outbid or an auction is cancelled.
   */
  async releaseBalance(
    bankAccountId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<BankAccount> {
    const run = async (mgr: EntityManager) => {
      const repo = mgr.getRepository(BankAccount);

      const account = await repo
        .createQueryBuilder('ba')
        .setLock('pessimistic_write')
        .where('ba.id = :id', { id: bankAccountId })
        .getOneOrFail();

      account.reservedBalance = Number(account.reservedBalance) - amount;
      return await repo.save(account);
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((mgr) => run(mgr));
  }

  /**
   * Retrieve the platform bank account (where platform = true).
   * Throws if no platform account exists (data integrity error).
   */
  async getPlatformAccount(): Promise<BankAccount> {
    const account = await this.bankAccountRepository.findOne({
      where: { platform: true },
    });

    if (!account) {
      throw new Error(
        'Platform bank account not found — initialization failed or database constraint violated',
      );
    }

    return account;
  }

  /**
   * Atomically settle an auction by transferring funds between buyer, seller, and platform accounts.
   * All transfers happen in a single pessimistic-lock transaction for data integrity.
   *
   * Flow:
   * - Buyer: balance -= (bidAmount + buyerFee), reservedBalance -= (bidAmount + buyerFee)
   * - Seller: balance += (bidAmount - sellerFee)
   * - Platform: balance += (buyerFee + sellerFee)
   */
  async settleAuction(
    params: {
      buyerAccountId: string;
      sellerAccountId: string;
      platformAccountId: string;
      bidAmount: number;
      buyerFee: number;
      sellerFee: number;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (mgr: EntityManager) => {
      const repo = mgr.getRepository(BankAccount);

      // Lock and update buyer (debit both balance and reserved)
      const buyerAccount = await repo
        .createQueryBuilder('ba')
        .setLock('pessimistic_write')
        .where('ba.id = :id', { id: params.buyerAccountId })
        .getOneOrFail();

      const totalBuyerDebit = params.bidAmount + params.buyerFee;
      buyerAccount.balance = Number(buyerAccount.balance) - totalBuyerDebit;
      buyerAccount.reservedBalance =
        Number(buyerAccount.reservedBalance) - totalBuyerDebit;
      await repo.save(buyerAccount);

      // Lock and update seller (credit with bid amount minus their fee)
      const sellerAccount = await repo
        .createQueryBuilder('ba')
        .setLock('pessimistic_write')
        .where('ba.id = :id', { id: params.sellerAccountId })
        .getOneOrFail();

      const sellerCredit = params.bidAmount - params.sellerFee;
      sellerAccount.balance = Number(sellerAccount.balance) + sellerCredit;
      await repo.save(sellerAccount);

      // Lock and update platform (credit with both fees)
      const platformAccount = await repo
        .createQueryBuilder('ba')
        .setLock('pessimistic_write')
        .where('ba.id = :id', { id: params.platformAccountId })
        .getOneOrFail();

      const platformCredit = params.buyerFee + params.sellerFee;
      platformAccount.balance =
        Number(platformAccount.balance) + platformCredit;
      await repo.save(platformAccount);
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction((mgr) => run(mgr));
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';

/**
 * Ensures a single platform bank account exists on application startup.
 * Enforced by database unique partial index: platform_unique_idx
 *
 * The platform account:
 * - Has platform = true
 * - Has no associated investor (investor is null)
 * - Collects fees from auction transfers
 * - Is linked to all admins via N:1 relationship
 */
@Injectable()
export class PlatformAccountInitializer implements OnModuleInit {
  private readonly logger = new Logger(PlatformAccountInitializer.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
  ) {}

  async onModuleInit() {
    await this.initializePlatformAccount();
  }

  async initializePlatformAccount(): Promise<BankAccount> {
    // Check if platform account already exists
    const existing = await this.bankAccountRepository.findOne({
      where: { platform: true },
    });

    if (existing) {
      this.logger.log(`Platform bank account available`);
      return existing;
    }

    // Create platform account
    const platformAccount = this.bankAccountRepository.create({
      platform: true,
      balance: 0,
      reservedBalance: 0,
    } as Partial<BankAccount>);

    const saved = await this.bankAccountRepository.save(platformAccount);
    this.logger.log(`Platform bank account available`);
    return saved;
  }

  /**
   * Retrieve the platform account by its unique platform flag.
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
}

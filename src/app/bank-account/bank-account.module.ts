import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';
import { BankAccount } from './entities/bank-account.entity';
import { PlatformAccountInitializer } from './platform-account.initializer';

@Module({
  imports: [TypeOrmModule.forFeature([BankAccount])],
  controllers: [BankAccountController],
  providers: [BankAccountService, PlatformAccountInitializer],
  exports: [BankAccountService, PlatformAccountInitializer],
})
export class BankAccountModule {}

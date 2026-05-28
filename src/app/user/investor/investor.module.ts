import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountModule } from 'src/app/bank-account/bank-account.module';
import { DebtorModule } from 'src/app/debtor/debtor.module';
import { DocumentModule } from 'src/app/document/document.module';
import { InvestorLookupController } from 'src/app/user/investor/investor-lookup.controller';
import { InvestorLookupService } from 'src/app/user/investor/investor-lookup.service';
import { Investor } from './entities/investor.entity';
import { InvestorController } from './investor.controller';
import { InvestorService } from './investor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Investor]),
    BankAccountModule,
    DocumentModule,
    ConfigModule,
    DebtorModule,
  ],
  controllers: [InvestorController, InvestorLookupController],
  providers: [InvestorService, InvestorLookupService],
  exports: [InvestorService, InvestorLookupService],
})
export class InvestorModule {}

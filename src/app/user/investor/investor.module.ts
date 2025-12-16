import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountModule } from 'src/app/bank-account/bank-account.module';
import { DocumentModule } from 'src/app/document/document.module';
import { Investor } from './entities/investor.entity';
import { InvestorController } from './investor.controller';
import { InvestorService } from './investor.service';
import { InvestorLookupService } from 'src/app/user/investor/investor-lookup.service';
import { InvestorLookupController } from 'src/app/user/investor/investor-lookup.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Investor]),
    BankAccountModule,
    DocumentModule,
    ConfigModule,
  ],
  controllers: [InvestorController, InvestorLookupController],
  providers: [InvestorService, InvestorLookupService],
  exports: [InvestorService, InvestorLookupService],
})
export class InvestorModule {}

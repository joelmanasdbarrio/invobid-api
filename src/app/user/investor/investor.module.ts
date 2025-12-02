import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountModule } from 'src/app/bank-account/bank-account.module';
import { DocumentModule } from 'src/app/document/document.module';
import { Investor } from './entities/investor.entity';
import { InvestorController } from './investor.controller';
import { InvestorService } from './investor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Investor]),
    BankAccountModule,
    DocumentModule,
    ConfigModule,
  ],
  controllers: [InvestorController],
  providers: [InvestorService],
  exports: [InvestorService],
})
export class InvestorModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { MetricController } from './metric.controller';
import { MetricService } from './metric.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccount]),
    TypeOrmModule.forFeature([Invoice]),
    TypeOrmModule.forFeature([Bid]),
    TypeOrmModule.forFeature([Investor]),
    TypeOrmModule.forFeature([Debtor]),
    TypeOrmModule.forFeature([Auction]),
  ],
  controllers: [MetricController],
  providers: [MetricService],
})
export class MetricModule {}

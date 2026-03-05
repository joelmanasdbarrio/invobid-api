import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceModule } from '../invoice/invoice.module';
import { AuctionLookupController } from './auction-lookup.controller';
import { AuctionLookupService } from './auction-lookup.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction } from './entities/auction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction]), InvoiceModule],
  controllers: [AuctionController, AuctionLookupController],
  providers: [AuctionService, AuctionLookupService, AuctionSchedulerService],
})
export class AuctionModule {}

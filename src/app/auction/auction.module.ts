import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BidModule } from '../bid/bid.module';
import { Bid } from '../bid/entities/bid.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceModule } from '../invoice/invoice.module';
import { InvestorModule } from '../user/investor/investor.module';
import { AuctionLookupController } from './auction-lookup.controller';
import { AuctionLookupService } from './auction-lookup.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction } from './entities/auction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Bid, Invoice]),
    InvoiceModule,
    forwardRef(() => BidModule),
    InvestorModule,
  ],
  controllers: [AuctionController, AuctionLookupController],
  providers: [AuctionService, AuctionLookupService, AuctionSchedulerService],
  exports: [AuctionService],
})
export class AuctionModule {}

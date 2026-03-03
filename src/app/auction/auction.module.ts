import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceModule } from '../invoice/invoice.module';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction } from './entities/auction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction]), InvoiceModule],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction } from './entities/auction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction])],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}

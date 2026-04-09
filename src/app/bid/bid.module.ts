import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionModule } from '../auction/auction.module';
import { Auction } from '../auction/entities/auction.entity';
import { AuthModule } from '../user/auth/auth.module';
import { User } from '../user/common/entities/user.entity';
import { InvestorModule } from '../user/investor/investor.module';
import { BidWsGateway } from './bid-ws.gateway';
import { BidController } from './bid.controller';
import { BidService } from './bid.service';
import { Bid } from './entities/bid.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Bid, User, Auction]),
    AuthModule,
    InvestorModule,
    forwardRef(() => AuctionModule),
  ],
  controllers: [BidController],
  providers: [BidService, BidWsGateway],
  exports: [BidService],
})
export class BidModule {}

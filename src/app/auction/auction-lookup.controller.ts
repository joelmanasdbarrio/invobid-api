import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { AuctionLookupService } from './auction-lookup.service';
import { GetAuctionsDto } from './dto/get-auctions.dto';

@Controller('auctions/lookup')
export class AuctionLookupController {
  constructor(private readonly auctionLookupService: AuctionLookupService) {}

  @Get('count')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async countAuctions(@Query() query: GetAuctionsDto, @GetUser() user: User) {
    const data = await this.auctionLookupService.countAuctions(query, user);

    return {
      status: 'success',
      data,
    };
  }
}

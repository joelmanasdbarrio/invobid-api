import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from 'src/app/user/auth/decorators/auth.decorator';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { InvestorLookupService } from 'src/app/user/investor/investor-lookup.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../common/entities/user.entity';
import { GetInvestorsDto } from './dto/get-investors.dto';

@Controller('investors/lookup')
export class InvestorLookupController {
  constructor(private readonly investorLookupService: InvestorLookupService) {}

  @Get('count')
  @Auth([UserType.ADMIN])
  async countPendingUsers(
    @Query() query: GetInvestorsDto,
    @GetUser() user: User,
  ) {
    const data = await this.investorLookupService.countUsers(query, user);

    return {
      status: 'success',
      data,
    };
  }
}

import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/app/user/auth/decorators/auth.decorator';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { InvestorLookupService } from 'src/app/user/investor/investor-lookup.service';

@Controller('investors/lookup')
export class InvestorLookupController {
  constructor(private readonly investorLookupService: InvestorLookupService) {}

  @Get('countPending')
  @Auth([UserType.ADMIN])
  async countPendingUsers() {
    const data = await this.investorLookupService.countPendingUsers();

    return {
      status: 'success',
      data,
    };
  }
}

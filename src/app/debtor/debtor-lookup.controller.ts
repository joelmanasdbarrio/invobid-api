import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { DebtorLookupService } from './debtor-lookup.service';
import { GetDebtorsDto } from './dto/get-debtors.dto';

@Controller('debtors/lookup')
export class DebtorLookupController {
  constructor(private readonly debtorLookupService: DebtorLookupService) {}

  @Get('count')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async countPendingDebtors(
    @Query() query: GetDebtorsDto,
    @GetUser() user: User,
  ) {
    const data = await this.debtorLookupService.countDebtors(query, user);

    return {
      status: 'success',
      data,
    };
  }
}

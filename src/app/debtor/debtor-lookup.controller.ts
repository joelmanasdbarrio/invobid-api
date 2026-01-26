import { Controller, Get } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { UserType } from '../user/common/enums/user-type.enum';
import { DebtorLookupService } from './debtor-lookup.service';

@Controller('debtors/lookup')
export class DebtorLookupController {
  constructor(private readonly debtorLookupService: DebtorLookupService) {}

  @Get('countPending')
  @Auth([UserType.ADMIN])
  async countPendingDebtors() {
    const data = await this.debtorLookupService.countPendingDebtors();

    return {
      status: 'success',
      data,
    };
  }
}

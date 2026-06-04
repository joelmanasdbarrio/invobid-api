import { Body, Controller, Patch } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorStatus } from '../user/investor/enums/investor-status.enum';
import { BankAccountService } from './bank-account.service';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Patch()
  @Auth([UserType.INVESTOR], [InvestorStatus.VERIFIED])
  async update(
    @Body() updateBankAccountDto: UpdateBankAccountDto,
    @GetUser() user: Investor,
  ) {
    const bankAccount = await this.bankAccountService.update(
      updateBankAccountDto,
      user,
    );

    return {
      status: 'success',
      data: bankAccount,
    };
  }
}

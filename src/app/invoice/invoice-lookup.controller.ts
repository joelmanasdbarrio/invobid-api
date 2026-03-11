import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { InvoiceLookupService } from './invoice-lookup.service';

@Controller('invoices/lookup')
export class InvoiceLookupController {
  constructor(private readonly invoiceLookupService: InvoiceLookupService) {}

  @Get('count')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async countInvoices(@Query() query: GetInvoicesDto, @GetUser() user: User) {
    const data = await this.invoiceLookupService.countInvoices(query, user);

    return {
      status: 'success',
      data,
    };
  }
}

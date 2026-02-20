import { Controller, Get, Param } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvoiceLookupService } from './invoice-lookup.service';

@Controller('invoices/lookup')
export class InvoiceLookupController {
  constructor(private readonly invoiceLookupService: InvoiceLookupService) {}

  @Get('countPending')
  @Auth([UserType.ADMIN])
  async countPendingInvoices() {
    const data = await this.invoiceLookupService.countPendingInvoices();

    return {
      status: 'success',
      data,
    };
  }

  @Get('countCorrection/:investorId')
  @Auth([UserType.INVESTOR])
  async countCorrectionInvoices(@Param('investorId') investorId: string) {
    const data =
      await this.invoiceLookupService.countCorrectionInvoices(investorId);

    return {
      status: 'success',
      data,
    };
  }
}

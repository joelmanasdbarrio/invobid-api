import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Auth([InvestorType.COMPANY])
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  findAll(@GetUser() user: User) {
    return this.invoiceService.findAll(user);
  }

  @Get(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.invoiceService.findOne(id, user);
  }

  @Patch(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @GetUser() user: User,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto, user);
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.invoiceService.remove(id, user);
  }
}

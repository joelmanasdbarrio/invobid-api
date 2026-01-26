import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetInvoicesDto } from 'src/app/invoice/dto/get-invoices.dto';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
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
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    const invoice = await this.invoiceService.create(
      createInvoiceDto,
      file,
      user,
    );

    return {
      status: 'success',
      data: invoice,
    };
  }

  @Get()
  @Auth()
  findAll(@Query() query: GetInvoicesDto, @GetUser() user: User) {
    return this.invoiceService.findAll(query, user);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.invoiceService.findOne(id, user);
  }

  @Patch(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto, file, user);
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.invoiceService.remove(id, user);
  }
}

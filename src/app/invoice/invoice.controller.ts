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
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Auth([InvestorType.COMPANY])
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: Investor,
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
  async findAll(@Query() query: GetInvoicesDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.invoiceService.findAll(
      {
        ...query,
        page: query.page || 1,
        limit: query.limit || 10,
      },
      user,
    );

    return {
      status: 'success',
      data,
      _metadata: {
        total,
        length: data.length,
        page,
        limit,
      },
    };
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    const invoice = await this.invoiceService.findOne(id, user);
    return {
      status: 'success',
      data: invoice,
    };
  }

  @Patch(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    const invoice = await this.invoiceService.update(
      id,
      updateInvoiceDto,
      file,
      user,
    );
    return {
      status: 'success',
      data: invoice,
    };
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    await this.invoiceService.remove(id, user);
    return {
      status: 'success',
    };
  }
}

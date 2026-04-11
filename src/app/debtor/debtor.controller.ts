import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GetDebtorsDto } from 'src/app/debtor/dto/get-debtors.dto';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { Auth } from 'src/app/user/auth/decorators/auth.decorator';
import { GetUser } from 'src/app/user/auth/decorators/get-user.decorator';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { FilesTypePipe } from 'src/pipes/file-type.pipe';
import { DebtorService } from './debtor.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';

@Controller('debtors')
export class DebtorController {
  constructor(private readonly debtorService: DebtorService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: DocumentType.TAX_111_QUARTERLY, maxCount: 1 },
      { name: DocumentType.TAX_111_ANNUAL, maxCount: 1 },
      { name: DocumentType.TAX_303_QUARTERLY, maxCount: 1 },
      { name: DocumentType.TAX_303_ANNUAL, maxCount: 1 },
    ]),
  )
  @Auth([InvestorType.COMPANY])
  async create(
    @Body() createDebtorDto: CreateDebtorDto,
    @UploadedFiles(FilesTypePipe)
    files: { [key: string]: Express.Multer.File[] },
    @GetUser() investor: Investor,
  ) {
    const debtor = await this.debtorService.create(
      createDebtorDto,
      files,
      investor,
    );

    return {
      status: 'success',
      data: debtor,
    };
  }

  @Get()
  @Auth()
  async findAll(@Query() query: GetDebtorsDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.debtorService.findAll(
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
  async findOne(@Param('id') id: string, @GetUser() user: User) {
    const debtor = await this.debtorService.findOne(id, user);
    return {
      status: 'success',
      data: debtor,
    };
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: DocumentType.TAX_111_QUARTERLY, maxCount: 1 },
      { name: DocumentType.TAX_111_ANNUAL, maxCount: 1 },
      { name: DocumentType.TAX_303_QUARTERLY, maxCount: 1 },
      { name: DocumentType.TAX_303_ANNUAL, maxCount: 1 },
    ]),
  )
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async update(
    @Param('id') id: string,
    @Body() updateDebtorDto: UpdateDebtorDto,
    @UploadedFiles(FilesTypePipe)
    files: { [key: string]: [Express.Multer.File | undefined] | undefined },
    @GetUser() user: User,
  ) {
    const debtor = await this.debtorService.update(
      id,
      updateDebtorDto,
      files,
      user,
    );

    return {
      status: 'success',
      data: debtor,
    };
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  async remove(@Param('id') id: string, @GetUser() user: User) {
    await this.debtorService.remove(id, user);
    return {
      status: 'success',
    };
  }
}

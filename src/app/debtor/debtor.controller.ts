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
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { Auth } from 'src/app/user/auth/decorators/auth.decorator';
import { GetUser } from 'src/app/user/auth/decorators/get-user.decorator';
import { User } from 'src/app/user/common/entities/user.entity';
import { FilesTypePipe } from 'src/pipes/file-type.pipe';
import { DebtorService } from './debtor.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { GetDebtorsDto } from 'src/app/debtor/dto/get-debtors.dto';
import { Investor } from 'src/app/user/investor/entities/investor.entity';

@Controller('debtors')
export class DebtorController {
  constructor(private readonly debtorService: DebtorService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: DocumentType.MODELO_111, maxCount: 1 },
      { name: DocumentType.MODELO_303, maxCount: 1 },
    ]),
  )
  @Auth([UserType.INVESTOR])
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
      { name: DocumentType.MODELO_111, maxCount: 1 },
      { name: DocumentType.MODELO_303, maxCount: 1 },
    ]),
  )
  @Auth([UserType.INVESTOR])
  async update(
    @Param('id') id: string,
    @Body() updateDebtorDto: UpdateDebtorDto,
    @UploadedFiles(FilesTypePipe)
    files: { [key: string]: Express.Multer.File[] },
    @GetUser() investor: Investor,
  ) {
    const debtor = await this.debtorService.update(
      id,
      updateDebtorDto,
      files,
      investor,
    );

    return {
      status: 'success',
      data: debtor,
    };
  }

  @Delete(':id')
  @Auth()
  async remove(@Param('id') id: string) {
    await this.debtorService.remove(id);
    return {
      status: 'success',
    };
  }
}

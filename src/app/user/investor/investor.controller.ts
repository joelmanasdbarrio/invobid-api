import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetInvestorsDto } from 'src/app/user/investor/dto/get-investors.dto';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../common/entities/user.entity';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorService } from './investor.service';

@Controller('investors')
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @Get()
  @Auth()
  async findAll(@Query() query: GetInvestorsDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.investorService.findAll(
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
  @Auth([], [])
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    const investor = await this.investorService.findOne(id, user);
    return {
      status: 'success',
      data: investor,
    };
  }

  @Patch(':id')
  @Auth([], [InvestorStatus.CORRECTION, InvestorStatus.VERIFIED])
  @UseInterceptors(FileInterceptor('document'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorDto: UpdateInvestorDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    const investor = await this.investorService.update(
      id,
      updateInvestorDto,
      file,
      user,
    );

    delete investor.password;

    return {
      status: 'success',
      data: investor,
    };
  }

  @Delete(':id')
  @Auth(
    [],
    [
      InvestorStatus.CORRECTION,
      InvestorStatus.PENDING,
      InvestorStatus.VERIFIED,
    ],
  )
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    await this.investorService.remove(id, user);
    return {
      status: 'success',
    };
  }
}
